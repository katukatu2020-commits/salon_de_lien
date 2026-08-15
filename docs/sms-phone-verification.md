# SMS電話番号認証

Salon de Lienのお客様新規登録では、日本の携帯番号（070・080・090）へ6桁の認証コードを送信します。

## 実送信

本番・実送信環境ではAmazon SNSを使います。

```env
SMS_PROVIDER="aws-sns"
AWS_REGION="ap-northeast-1"
SMS_SENDER_ID="SalonLien"
SMS_MAX_PRICE_USD="0.20"
SMS_DEV_SHOW_CODE="false"
```

ECSでは固定アクセスキーを置かず、Task Roleの`sns:Publish`権限を使います。ローカルPCから実送信する場合は、AWS SSOまたは最小権限のAWSプロファイルを設定します。アクセスキーはリポジトリや`.env`へ保存しません。

AWSのSMSサンドボックス中は、AWSコンソールで認証済みにした送信先へだけ送信できます。不特定のお客様へ送信する前に、AWS End User Messaging SMSの本番アクセス申請、送信者ID、利用上限、請求アラームを設定してください。

## 実送信テスト

送信先はコマンド実行時だけ環境変数で渡します。電話番号をソースコードやGitへ保存しません。

```powershell
$env:SMS_TEST_PHONE="09012345678"
npm.cmd run test:sms-delivery
Remove-Item Env:SMS_TEST_PHONE
```

## 開発環境

AWSへ接続しない開発時だけ`SMS_PROVIDER=console`を使用できます。本番環境ではconsole providerを拒否します。
