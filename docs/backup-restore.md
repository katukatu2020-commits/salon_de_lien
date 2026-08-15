# Backup and Restore

## Backup policy

- staging RDS automated backup: 7日
- production RDS automated backup: 14日
- production deletion protection: 有効
- deploy前: 手動snapshot
- private S3: versioning有効、bucket/objectはstack削除時もretain

## Point-in-Time Restore rehearsal

1. staging RDSの時刻を記録し、復元対象時刻を選ぶ。
2. 既存instanceを上書きせず、新しいRDS instanceへPITRする。
3. 新DB secretを作り、one-off taskで`prisma migrate deploy`を確認する。
4. staging ECS task definitionだけを新DBへ向ける。
5. `/api/health/ready`、顧客件数、ポイント台帳合計、写真表示を確認する。
6. 問題なければ復元試験記録を残し、試験用DBを承認後に削除する。

## Production incident

1. 書き込みを止め、障害発生時刻を確定する。
2. 現行DBの手動snapshotを取得する。
3. PITRで別instanceを作る。
4. 読み取り検証後、Secrets Managerの接続先を新instanceへ切り替える。
5. ECS serviceを新revisionでrolling deployする。
6. 旧DBは即削除せず、差分確認期間中retainする。

S3誤削除はversion IDを確認して復元する。DBのobject referenceとS3 objectの対応を先に照合し、同名上書きを行わない。
