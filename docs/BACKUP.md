# Backup e Restore

## PostgreSQL — Backup manuale

```bash
# Full dump (consigliato prima di ogni deploy)
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file=athena_backup_$(date +%Y%m%d_%H%M%S).dump

# Verifica integrità dump
pg_restore --list athena_backup_*.dump | head -20
```

## PostgreSQL — Backup automatico (cron)

Aggiungere a crontab (`crontab -e`):

```bash
# Backup giornaliero alle 03:00, conserva 30 giorni
0 3 * * * pg_dump $DATABASE_URL --format=custom --compress=9 \
  --file=/var/backups/athena/athena_$(date +\%Y\%m\%d).dump \
  && find /var/backups/athena -name "*.dump" -mtime +30 -delete
```

Creare la directory prima:

```bash
mkdir -p /var/backups/athena
```

## PostgreSQL — Restore

```bash
# Restore completo (sovrascrive DB esistente)
pg_restore \
  --dbname=$DATABASE_URL \
  --clean \
  --if-exists \
  --no-owner \
  athena_backup_YYYYMMDD_HHMMSS.dump
```

**Attenzione:** il restore interrompe tutte le connessioni attive.  
Eseguire in manutenzione o su DB separato e poi fare swap.

## Backup su S3 (raccomandato per produzione)

```bash
# Upload su S3 dopo il dump
aws s3 cp athena_backup_$(date +%Y%m%d_%H%M%S).dump \
  s3://your-backup-bucket/athena/

# Lifecycle policy S3 consigliata: retention 90 giorni
```

## Verifica backup

Testare il restore su un database di test almeno una volta al mese:

```bash
createdb athena_restore_test
pg_restore --dbname=athena_restore_test athena_backup_YYYYMMDD.dump
psql athena_restore_test -c "SELECT COUNT(*) FROM users;"
dropdb athena_restore_test
```

## Checklist backup

| Frequenza | Azione |
|---|---|
| Prima di ogni deploy | `pg_dump` manuale |
| Giornaliera | Cron automatico + upload S3 |
| Settimanale | Verifica integrità backup |
| Mensile | Test restore su DB separato |
