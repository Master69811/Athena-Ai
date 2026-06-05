# Aggiornamento versioni

## Procedura standard (zero-downtime su beta)

### 1. Prepara

```bash
# Sul server: backup database prima di ogni update
pg_dump $DATABASE_URL > backup_pre_update_$(date +%Y%m%d_%H%M).sql

# Pull nuova versione
git fetch origin main
git checkout main && git pull
pnpm install --frozen-lockfile
```

### 2. Build

```bash
pnpm --filter @athena/api db:generate
pnpm --filter @athena/api build
NEXT_PUBLIC_API_URL=https://api.yourdomain.com pnpm --filter @athena/web build
```

### 3. Migrazioni

```bash
cd apps/api
NODE_ENV=production npx prisma migrate deploy
```

Verificare output — se compaiono errori, **non procedere** con il restart.

### 4. Restart

```bash
pm2 restart athena-api
pm2 restart athena-web
```

### 5. Verifica

```bash
curl https://api.yourdomain.com/api/v1/health
pm2 logs athena-api --lines 50
```

---

## Rollback

Se qualcosa non funziona dopo il deploy:

```bash
# Torna al commit precedente
git checkout <previous-tag-or-commit>
pnpm install --frozen-lockfile
pnpm --filter @athena/api build
pnpm --filter @athena/web build
pm2 restart all
```

**Attenzione:** il rollback del codice non fa rollback delle migrazioni database.  
Se la migrazione è incompatibile con il vecchio codice, ripristinare il backup DB.

```bash
# Ripristino database (solo se necessario)
psql $DATABASE_URL < backup_pre_update_YYYYMMDD_HHMM.sql
```

---

## Aggiornamento dipendenze

```bash
# Audit vulnerabilità
pnpm audit

# Update patch/minor sicure
pnpm up --recursive --latest

# Dopo ogni update: build + test completo
pnpm build && pnpm test
```

Non aggiornare major version di NestJS, Prisma, o Next.js senza test approfonditi.
