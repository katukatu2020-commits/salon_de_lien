import {
  CfnOutput,
  Duration,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps
} from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";

type SalonDeLienStackProps = StackProps & {
  environmentName: "staging" | "production";
  imageTag: string;
  desiredCount?: number;
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  costOptimized?: boolean;
};

const DATABASE_NAME = "salon_de_lien";

export class SalonDeLienStack extends Stack {
  constructor(scope: Construct, id: string, props: SalonDeLienStackProps) {
    super(scope, id, props);

    const isProduction = props.environmentName === "production";
    const costOptimized = Boolean(props.costOptimized && !isProduction);
    const prefix = `salon-de-lien-${props.environmentName}`;

    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${prefix}-vpc`,
      maxAzs: 2,
      natGateways: costOptimized ? 0 : 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        ...(costOptimized
          ? []
          : [{
              name: "application",
              subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
              cidrMask: 24
            }]),
        {
          name: "database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }
      ]
    });

    const repository = new ecr.Repository(this, "Repository", {
      repositoryName: `${prefix}-app`,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      lifecycleRules: [{ maxImageCount: 30 }],
      removalPolicy: RemovalPolicy.RETAIN
    });

    const privateAssets = new s3.Bucket(this, "PrivateAssets", {
      bucketName: undefined,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      lifecycleRules: [
        {
          id: "abort-incomplete-uploads",
          abortIncompleteMultipartUploadAfter: Duration.days(1)
        }
      ]
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc,
      description: "PostgreSQL access from Salon de Lien ECS tasks only",
      allowAllOutbound: false
    });

    const database = new rds.DatabaseInstance(this, "Database", {
      instanceIdentifier: `${prefix}-db`,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16
      }),
      credentials: rds.Credentials.fromGeneratedSecret("salon_app"),
      databaseName: DATABASE_NAME,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: Duration.days(isProduction ? 14 : 7),
      deletionProtection: isProduction,
      multiAz: isProduction,
      publiclyAccessible: false,
      autoMinorVersionUpgrade: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH
    });

    const appSecret = new secretsmanager.Secret(this, "ApplicationSecret", {
      secretName: `${prefix}/application`,
      description: "Salon de Lien application authentication values",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          ADMIN_EMAIL: "owner@example.invalid",
          ADMIN_PASSWORD_HASH: "SET_BEFORE_DEPLOY",
          APP_URL: "https://invalid.example"
        }),
        generateStringKey: "ADMIN_AUTH_SECRET",
        passwordLength: 64,
        excludePunctuation: true
      }
    });
    appSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const customerAuthSecret = new secretsmanager.Secret(this, "CustomerAuthSecret", {
      secretName: `${prefix}/customer-auth`,
      description: "Salon de Lien customer session signing secret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "CUSTOMER_AUTH_SECRET",
        passwordLength: 64,
        excludePunctuation: true
      }
    });
    customerAuthSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const smsVerificationSecret = new secretsmanager.Secret(this, "SmsVerificationSecret", {
      secretName: `${prefix}/sms-verification`,
      description: "Salon de Lien SMS challenge signing secret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "SMS_VERIFICATION_SECRET",
        passwordLength: 64,
        excludePunctuation: true
      }
    });
    smsVerificationSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);
    database.secret?.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: `${prefix}-cluster`,
      vpc,
      containerInsightsV2: costOptimized ? ecs.ContainerInsights.DISABLED : ecs.ContainerInsights.ENHANCED
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "WebTask", {
      family: `${prefix}-web`,
      cpu: 512,
      memoryLimitMiB: 1024
    });

    const logGroup = new logs.LogGroup(this, "ApplicationLogGroup", {
      logGroupName: `/ecs/${prefix}/web`,
      retention: isProduction ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const container = taskDefinition.addContainer("Web", {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "nextjs",
        mode: ecs.AwsLogDriverMode.NON_BLOCKING
      }),
      environment: {
        APP_ENV: props.environmentName,
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3000",
        STORAGE_PROVIDER: "s3",
        AWS_REGION: this.region,
        S3_PRIVATE_ASSETS_BUCKET: privateAssets.bucketName,
        S3_SIGNED_URL_TTL_SECONDS: "300",
        DEFAULT_ORGANIZATION_ID: "org_salon_de_lien",
        ALLOW_LEGACY_CUSTOMER_ID_PORTAL: "false",
        MANUFACTURER_MIN_SAMPLE_SIZE: "5",
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: database.instanceEndpoint.port.toString(),
        DB_NAME: DATABASE_NAME,
        DB_SCHEMA: "public",
        GMAIL_AUTO_SYNC_ENABLED: "true",
        GMAIL_SYNC_INTERVAL_SECONDS: "60",
        GMAIL_BROWSER_INGEST_ORGANIZATION_ID: "org_salon_de_lien",
        GMAIL_SYNC_ORGANIZATION_ID: "org_salon_de_lien",
        OPENAI_MODEL: "gpt-4.1-mini",
        PASSWORD_RESET_MAIL_FROM_NAME: "Salon de Lien",
        CUSTOMER_REGISTRATION_TOKEN_MINUTES: "60",
        ALLOW_DEMO_DATA: "false",
        SMS_PROVIDER: "aws-sns",
        SMS_SENDER_ID: "SalonLien",
        SMS_MAX_PRICE_USD: "0.20"
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(database.secret!, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, "password"),
        ADMIN_EMAIL: ecs.Secret.fromSecretsManager(appSecret, "ADMIN_EMAIL"),
        ADMIN_PASSWORD_HASH: ecs.Secret.fromSecretsManager(appSecret, "ADMIN_PASSWORD_HASH"),
        ADMIN_AUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, "ADMIN_AUTH_SECRET"),
        APP_URL: ecs.Secret.fromSecretsManager(appSecret, "APP_URL"),
        GMAIL_RESERVATION_EMAIL: ecs.Secret.fromSecretsManager(appSecret, "GMAIL_RESERVATION_EMAIL"),
        GMAIL_OAUTH_CLIENT_ID: ecs.Secret.fromSecretsManager(appSecret, "GMAIL_OAUTH_CLIENT_ID"),
        GMAIL_OAUTH_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecret, "GMAIL_OAUTH_CLIENT_SECRET"),
        GMAIL_OAUTH_REFRESH_TOKEN: ecs.Secret.fromSecretsManager(appSecret, "GMAIL_OAUTH_REFRESH_TOKEN"),
        GMAIL_SYNC_CRON_SECRET: ecs.Secret.fromSecretsManager(appSecret, "GMAIL_SYNC_CRON_SECRET"),
        OPENAI_API_KEY: ecs.Secret.fromSecretsManager(appSecret, "OPENAI_API_KEY"),
        CUSTOMER_AUTH_SECRET: ecs.Secret.fromSecretsManager(customerAuthSecret, "CUSTOMER_AUTH_SECRET"),
        SMS_VERIFICATION_SECRET: ecs.Secret.fromSecretsManager(smsVerificationSecret, "SMS_VERIFICATION_SECRET")
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\""
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(30)
      }
    });
    container.addPortMappings({ containerPort: 3000, protocol: ecs.Protocol.TCP });

    privateAssets.grantReadWrite(taskDefinition.taskRole, "private/*");
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"]
      })
    );
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: ["*"]
      })
    );

    const hostedZone =
      props.domainName && props.hostedZoneId && props.hostedZoneName
        ? route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.hostedZoneName
          })
        : undefined;
    const certificate =
      props.domainName && hostedZone
        ? new acm.Certificate(this, "Certificate", {
            domainName: props.domainName,
            validation: acm.CertificateValidation.fromDns(hostedZone)
          })
        : undefined;

    const desiredCount = props.desiredCount ?? (isProduction ? 2 : 1);

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "WebService", {
      serviceName: `${prefix}-web`,
      cluster,
      taskDefinition,
      // The L3 construct rejects zero even though ECS and CloudFormation support it.
      // Initial staging provisioning overrides the synthesized service below.
      desiredCount: Math.max(1, desiredCount),
      minHealthyPercent: 100,
      publicLoadBalancer: true,
      assignPublicIp: costOptimized,
      taskSubnets: {
        subnetType: costOptimized ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      healthCheckGracePeriod: Duration.seconds(60),
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      domainName: props.domainName,
      domainZone: hostedZone,
      certificate,
      redirectHTTP: Boolean(certificate),
      listenerPort: certificate ? 443 : 80
    });

    if (desiredCount === 0) {
      const cfnService = service.service.node.defaultChild as ecs.CfnService;
      cfnService.desiredCount = 0;
    }

    service.targetGroup.configureHealthCheck({
      path: "/api/health/live",
      healthyHttpCodes: "200",
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5)
    });
    database.connections.allowDefaultPortFrom(service.service.connections);

    const webAcl = costOptimized ? undefined : new wafv2.CfnWebACL(this, "WebAcl", {
      name: `${prefix}-waf`,
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${prefix}-waf`,
        sampledRequestsEnabled: true
      },
      rules: [
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 10,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet"
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${prefix}-common-rules`,
            sampledRequestsEnabled: true
          }
        },
        {
          name: "IpRateLimit",
          priority: 20,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: "IP",
              limit: 1_000
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${prefix}-rate-limit`,
            sampledRequestsEnabled: true
          }
        }
      ]
    });

    if (webAcl) {
      new wafv2.CfnWebACLAssociation(this, "WebAclAssociation", {
        resourceArn: service.loadBalancer.loadBalancerArn,
        webAclArn: webAcl.attrArn
      });
    }

    const cloudFrontDistribution =
      costOptimized && !certificate
        ? new cloudfront.Distribution(this, "HttpsDistribution", {
            comment: `${prefix} low-cost HTTPS entry point`,
            priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
            defaultBehavior: {
              origin: new origins.LoadBalancerV2Origin(service.loadBalancer, {
                protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
              }),
              viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
              cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
              originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022
            }
          })
        : undefined;

    const publicUrl = props.domainName
      ? `https://${props.domainName}`
      : cloudFrontDistribution
        ? `https://${cloudFrontDistribution.distributionDomainName}`
        : `http://${service.loadBalancer.loadBalancerDnsName}`;

    new CfnOutput(this, "LoadBalancerUrl", {
      value: publicUrl
    });
    if (cloudFrontDistribution) {
      new CfnOutput(this, "CloudFrontDistributionId", {
        value: cloudFrontDistribution.distributionId
      });
    }
    new CfnOutput(this, "RepositoryUri", { value: repository.repositoryUri });
    new CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new CfnOutput(this, "ServiceName", { value: service.service.serviceName });
    new CfnOutput(this, "DesiredCount", {
      value: String(desiredCount)
    });
    new CfnOutput(this, "TaskDefinitionArn", { value: taskDefinition.taskDefinitionArn });
    new CfnOutput(this, "ApplicationSubnetIds", {
      value: Fn.join(",", (costOptimized ? vpc.publicSubnets : vpc.privateSubnets).map((subnet) => subnet.subnetId))
    });
    new CfnOutput(this, "AssignPublicIp", { value: costOptimized ? "ENABLED" : "DISABLED" });
    new CfnOutput(this, "ApplicationSecurityGroupId", {
      value: service.service.connections.securityGroups[0].securityGroupId
    });
    new CfnOutput(this, "PrivateAssetsBucket", { value: privateAssets.bucketName });
    new CfnOutput(this, "DatabaseSecretArn", { value: database.secret!.secretArn });
    new CfnOutput(this, "ApplicationSecretArn", { value: appSecret.secretArn });
  }
}
