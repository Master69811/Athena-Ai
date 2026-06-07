# Troubleshooting

## API non si avvia

**Sintomo:** `Error: [STARTUP] JWT_SECRET is missing...`  
**Causa:** `.env` mancante o JWT_SECRET con valore placeholder  
**Fix:**
```bash
cd apps/api
cp .env.example .env
# Compilare JWT_SECRET con: openssl rand -base64 64
```

---

**Sintomo:** `PrismaClientInitializationError` al boot  
**Causa:** Database non raggiungibile  
**Fix:**
```bash
docker-compose up -d postgres
docker-compose ps   # verificare status healthy
```

---

**Sintomo:** `Error: P3009 migrate found failed migration`  
**Causa:** Migrazione precedente fallita a metà  
**Fix (solo sviluppo):**
```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate dev
```
In produzione: ripristinare il backup e ri-eseguire `migrate deploy`.

---

## Login/Auth fallisce

**Sintomo:** `401 Unauthorized` su endpoint autenticati  
**Causa 1:** Token scaduto (access token dura 15 min)  
**Fix:** Il client deve usare il refresh token per ottenere un nuovo access token via `POST /api/v1/auth/refresh`

**Causa 2:** JWT_SECRET diverso tra restart  
**Fix:** Verificare che `.env` non venga rigenerato tra i deploy.

---

## AI Coach non risponde / errore 500

**Sintomo:** `AnthropicError` o timeout sul `/ai-coach/chat`  
**Causa:** `ANTHROPIC_API_KEY` mancante o non valida  
**Fix:**
```bash
grep ANTHROPIC_API_KEY apps/api/.env
# se vuoto o placeholder: aggiornare con chiave reale
pm2 restart athena-api
```

---

## Test falliscono

**Sintomo:** Test falliscono dopo pull  
**Fix:**
```bash
cd apps/api
npx prisma generate   # rigenera Prisma client dopo modifiche schema
pnpm test
```

---

## Build web fallisce

**Sintomo:** `Error: Configuring Next.js via 'next.config.ts' is not supported`  
**Fix:** Già risolto in v1.0.0-beta.1 con migrazione a `next.config.mjs`.  
Verificare di essere sull'ultima versione.

---

## Dashboard non mostra dati

**Sintomo:** Dashboard vuota dopo login  
**Causa:** L'utente non ha completato l'onboarding o non ha ancora un piano attivo  
**Fix normale:** Completare il flusso onboarding → il piano viene generato automaticamente

**Causa alternativa:** API non raggiungibile dal frontend  
**Fix:**
```bash
curl http://localhost:3001/api/v1/health
# se fallisce: pm2 restart athena-api
```

---

## Cron jobs non si eseguono

**Sintomo:** Progressioni/snapshot non si aggiornano  
**Causa 1:** API non in esecuzione  
**Causa 2:** `NODE_ENV` non impostato — lo scheduler NestJS richiede che il modulo sia caricato  
**Fix:** Verificare `pm2 status` e i log: `pm2 logs athena-api | grep Cron`

**Test manuale dei cron:**
```bash
# Esegui manualmente senza aspettare il cron
curl -X POST http://localhost:3001/api/v1/progression/run \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:3001/api/v1/nutrition-engine/run \
  -H "Authorization: Bearer <token>"
```

---

## Log e diagnostica

```bash
# Log in tempo reale
pm2 logs athena-api

# Log ultimi 200 righe
pm2 logs athena-api --lines 200

# Health check completo
curl https://api.yourdomain.com/api/v1/health | python3 -m json.tool

# Connessioni database attive
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Verifica migrazioni applicate
cd apps/api && npx prisma migrate status
```
