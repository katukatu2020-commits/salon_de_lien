# Salon de Lien remote access and backup

## Access URL

Use this URL from devices that are connected to the same Tailscale tailnet or that have been granted access to this device:

```text
http://desktop-a9147u4.tail0aabd0.ts.net:3000/admin/customers
```

Short hostname also works on this PC:

```text
http://desktop-a9147u4:3000/admin/customers
```

Avoid using `http://100.82.182.81:3000/...` for shared access. Tailscale Serve is configured on the DNS hostname, and the IP URL can return 404.

## Let another person's PC access the app

1. Install Tailscale on the other PC.
2. Sign in with an account that is allowed in the same tailnet, or share this Windows device from the Tailscale admin console.
3. Open:

```text
http://desktop-a9147u4.tail0aabd0.ts.net:3000/admin/customers
```

The app is exposed through Tailscale Serve only within the tailnet. It is not intended to be opened to the public internet.

## Current runtime setup

- Next.js runs in production mode with `next start`.
- The app listens on local port `3000`.
- Tailscale Serve proxies tailnet HTTP port `3000` to `http://127.0.0.1:3000`.
- PostgreSQL runs in Docker container `salon_de_lien_postgres`.
- PostgreSQL data is stored in the Docker volume configured by `docker-compose.yml`.

Check server status:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
tailscale serve status
docker ps --filter "name=salon_de_lien_postgres"
```

Start the app manually:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-tailscale-production.ps1
```

Stop the app:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-salon-server.ps1
```

## Auto start

A current-user Startup shortcut has been installed:

```text
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Salon de Lien Production Server.lnk
```

When this Windows user logs in, the production server starts hidden.

If startup ever fails, run the manual start command above.

## Backups

Manual backup:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
```

Backups are written to:

```text
backups\db\
```

Daily backup is registered with Task Scheduler:

```text
SalonDeLienDailyDbBackup
```

Default schedule:

```text
Every day at 03:00
```

Restore from a backup:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -BackupPath .\backups\db\salon_de_lien-YYYYMMDD-HHmmss.dump
```

Restoring replaces the current database contents. Create a fresh backup before restoring.

## Do not delete

To avoid data loss:

- Do not run `docker compose down -v`.
- Do not delete the Docker volume used by PostgreSQL.
- Do not delete `backups\db`.
- Do not delete `.env`.
- Do not expose PostgreSQL port `5432` outside trusted local/Tailscale environments.

