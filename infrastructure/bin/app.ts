#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { SalonDeLienStack } from "../lib/salon-de-lien-stack";

const app = new App();
const environmentName = app.node.tryGetContext("environment") ?? "staging";
const desiredCountContext = app.node.tryGetContext("desiredCount");
const deploymentRegion = app.node.tryGetContext("region") ?? "ap-northeast-1";
const costOptimizedContext = app.node.tryGetContext("costOptimized");
const domainName = app.node.tryGetContext("domainName");
const cloudFrontCertificateArn = app.node.tryGetContext("cloudFrontCertificateArn");

if (!new Set(["staging", "production"]).has(environmentName)) {
  throw new Error(`Unsupported environment: ${environmentName}`);
}

const desiredCount =
  desiredCountContext === undefined ? undefined : Number(desiredCountContext);

if (
  desiredCount !== undefined &&
  (!Number.isInteger(desiredCount) || desiredCount < 0)
) {
  throw new Error(`desiredCount must be a non-negative integer: ${desiredCountContext}`);
}

const costOptimized = costOptimizedContext === true || costOptimizedContext === "true";
if (costOptimized && domainName && !cloudFrontCertificateArn) {
  throw new Error(
    "cloudFrontCertificateArn is required for a custom CloudFront domain. The certificate must be in us-east-1."
  );
}

const stack = new SalonDeLienStack(app, `SalonDeLien-${environmentName}`, {
  environmentName,
  imageTag: app.node.tryGetContext("imageTag") ?? `${environmentName}-latest`,
  desiredCount,
  costOptimized,
  domainName,
  hostedZoneId: app.node.tryGetContext("hostedZoneId"),
  hostedZoneName: app.node.tryGetContext("hostedZoneName"),
  cloudFrontCertificateArn,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: deploymentRegion
  }
});

Tags.of(stack).add("Application", "SalonDeLien");
Tags.of(stack).add("Environment", environmentName);
