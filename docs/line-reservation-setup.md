# LINE公式アカウント予約（LIFF）運用手順

## 目的

LINE公式アカウントの「予約する」からSalon de Lien自身の予約画面を開き、予約を店舗の予約台帳へ直接登録します。

この方式は、かんざし結・`line.kanzashi.com`・予約メール取込に依存しません。移行後にかんざしを解約しても、LINE公式アカウント、LINE Messaging API、LINE Login、LIFFが有効であれば予約受付を継続できます。

## 全体構成

```text
お客様のLINE
  -> LINE公式アカウントの「予約する」
  -> LIFF URL（https://liff.line.me/{LIFF_ID}）
  -> Salon de Lien予約画面
  -> 既存のメニュー・スタッフ・営業時間・受付可能数を取得
  -> Appointmentへ予約確定として保存
  -> 店舗のお知らせ・予約カレンダー・日別シフト表へ反映
  -> LINEへ予約確定メッセージを送信

LINE Platform
  -> 署名付きWebhook
  -> 友だち追加・ブロック・予約案内メッセージを処理
```

## 重要な区別

- **Messaging APIチャネル**: LINE公式アカウントのWebhook、返信、予約確定メッセージに使用します。
- **LINE Loginチャネル**: LIFFを作成し、予約者のLINEアカウントをサーバー側で確認するために使用します。
- **LIFFアプリ**: お客様がメニュー、担当者、日付、空き時間を選ぶWeb予約画面です。
- Messaging APIチャネルとLINE Loginチャネルは、同じLINE DevelopersのProvider内に作成します。
- LINE公式アカウントごとにMessaging APIチャネルは1つです。既存ツールがチャネルアクセストークンを使っている場合、再発行前に影響を確認します。

## 店舗ごとの初期設定

### 1. LINE公式アカウントでMessaging APIを有効化

1. [LINE Official Account Manager](https://manager.line.biz/)を開きます。
2. 対象店舗を選び、**設定 -> Messaging API**を開きます。
3. Messaging APIが未作成なら、店舗が管理するProviderを選んで有効化します。
4. LINE Developersコンソールで次を控えます。
   - Messaging API チャネルID
   - チャネルシークレット
   - チャネルアクセストークン

チャネルアクセストークンは、可能ならチャネルアクセストークンv2.1を使用します。長期チャネルアクセストークンを使用する場合も、再発行により既存ツールが停止しないことを確認してください。

### 2. 同じProviderにLINE Loginチャネルを作成

1. [LINE Developersコンソール](https://developers.line.biz/console/)で、上記Messaging APIチャネルと同じProviderを開きます。
2. LINE Loginチャネルを新規作成します。
3. LINE Login チャネルIDを控えます。

### 3. LIFFアプリを作成

1. LINE Loginチャネルの**LIFF**タブを開きます。
2. LIFFアプリを追加します。
3. サイズは `Full` を推奨します。
4. Endpoint URLには、Salon de Lienの店舗運用設定に表示される **LIFF Endpoint URL** を入力します。
5. LIFF IDを控えます。

### 4. Salon de Lienへ接続情報を保存

1. 店舗オーナーでSalon de Lienへログインします。
2. **店舗運用設定 -> LINE公式アカウント予約**を開きます。
3. 次を入力して保存します。
   - Messaging API チャネルID
   - LINE Login チャネルID
   - LIFF ID
   - Messaging API チャネルシークレット
   - Messaging API チャネルアクセストークン
4. 「接続済み」とLINE公式アカウント名が表示されることを確認します。

シークレットとアクセストークンはAES-256-GCMで暗号化して保存します。保存後はAPI・画面のどちらにも平文を返しません。変更しない場合、入力欄は空のまま保存できます。

### 5. Webhookを設定

1. Salon de Lienの設定カードに表示された **Webhook URL** をコピーします。
2. LINE DevelopersのMessaging APIチャネルへ設定します。
3. **検証**を実行し、成功を確認します。
4. **Webhookの利用**をONにします。
5. **Webhookの再送**をONにすることを推奨します。

Salon de Lienは、LINEから届いた未変更のリクエスト本文と`x-line-signature`をHMAC-SHA256で検証します。イベント再送は`webhookEventId`で重複排除します。

### 6. LINEの予約ボタンを切り替える

1. Salon de Lien設定カードの **予約用LIFF URL** をコピーします。
2. LINE Official Account Managerのリッチメニューを開きます。
3. 「予約する」のリンク先を、現在の`https://line.kanzashi.com/...`から予約用LIFF URLへ変更します。
4. 公開前に、管理者のLINEで一度予約テストを行います。

この切替後、予約入力・空き判定・予約保存はSalon de Lien側で完結します。

## 予約のサーバー側検証

- 店舗、メニュー、スタッフを組織IDで分離します。
- 営業時間、定休日、スタッフ休暇、スタッフ受付時間を確認します。
- 担当者別の同時受付可能数を確認します。
- 店舗が指定した時間帯別受付可能数を確認します。
- 同じ担当者の予約開始時刻は30分以上離します。
- 指名なしは、その時間に受付可能なスタッフが1人以上いる場合だけ表示します。
- 予約確定処理はSerializable transactionと日付単位のDBロック内で再検証します。
- LIFF ID tokenをLINEの検証APIへ送り、店舗のLINE LoginチャネルIDと一致する場合だけ予約を受け付けます。
- 同じLINEアカウント・同じ送信識別子の再送は、1件の予約として扱います。

## 顧客カルテとの紐付け

1. 同じ店舗・同じLINE user IDが既に紐づいていれば、その顧客カルテを使用します。
2. 初回は氏名と電話番号を入力します。
3. 同じ店舗内で氏名と正規化済み電話番号が両方一致する顧客だけ、既存カルテへ紐づけます。
4. 一致しない場合はLINE予約由来の新規顧客カルテを作成します。

電話番号だけで既存顧客へ強制統合しないため、別人のカルテへ予約が入ることを防ぎます。

## かんざしからの移行確認

切替前に、現行のかんざし予約URLで次を記録します。

- 選べるメニュー
- 担当者
- 営業日・受付時間
- 予約時の注意事項
- キャンセル方法

Salon de LienのLIFF画面で同じ業務要件を確認後、LINEリッチメニューのリンクだけを切り替えます。かんざし側のURLを先に解約・停止しないでください。

## 障害時

- LINE設定カードの最終Webhook受信日時を確認します。
- LINE DevelopersでWebhookの検証を実行します。
- 予約は`Appointment.bookingProvider = "line"`、`source = "LINE公式アカウント（LIFF）"`で検索できます。
- Webhook再送は予約を増やしません。
- LIFFの予約送信を再試行しても、同一送信識別子なら予約を増やしません。
- LINEの予約確定メッセージ送信だけが失敗した場合、予約自体はロールバックしません。店舗台帳を正本とします。

## 公式資料

- [LIFFを始める](https://developers.line.biz/en/docs/liff/getting-started/)
- [Messaging APIのWebhookを受信する](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)
- [Webhook署名を検証する](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/)
- [Webhook URLを検証する](https://developers.line.biz/en/docs/messaging-api/verify-webhook-url/)
- [LINE Login ID token検証API](https://developers.line.biz/en/reference/line-login/#verify-id-token)
- [チャネルアクセストークン](https://developers.line.biz/en/docs/basics/channel-access-token/)
