# Deploy in produzione

## Architettura consigliata (beta)

```
Internet → Reverse Proxy (nginx/Caddy) → [Web :3000] [API :3001]
                                        → PostgreSQL (managed)
                                        → Redis (managed)
```

Per una beta con < 500 utenti: un singolo VPS (4 vCPU, 8 GB RAM) è sufficiente.  
Raccomandato: Hetzner CX31, DigitalOcean Droplet, o Render.com.

---

## Prerequisiti server

- Ubuntu 22.04 LTS
- Node.js 20 (`nvm install 20`)
- pnpm 9 (`npm i -g pnpm`)
- PostgreSQL 16 (managed o self-hosted)
- Redis 7 (managed o self-hosted)
- Reverse proxy con SSL (Caddy è il più semplice)

---

## 1. Variabili d'ambiente produzione

Creare `/home/deploy/athena-api/.env` sul server:

```bash
NODE_ENV=production
PORT=3001

# Database — URL del managed PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/athena_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT — OBBLIGATORIO: valori generati con openssl rand -base64 64
JWT_SECRET=<64+ chars random>
JWT_REFRESH_SECRET=<64+ chars random, diverso dal precedente>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8

# Frontend
FRONTEND_URL=https://yourdomain.com
```

**Importante:** Il server rifiuta l'avvio se `JWT_SECRET` è assente, troppo corto, o contiene `CHANGE_ME`.

---

## 2. Build

```bash
# Clone sul server o tramite CI/CD
git clone <repo-url> /home/deploy/athena
cd /home/deploy/athena
pnpm install --frozen-lockfile

# Build API
pnpm --filter @athena/api db:generate
pnpm --filter @athena/api build

# Build Web
NEXT_PUBLIC_API_URL=https://api.yourdomain.com pnpm --filter @athena/web build
```

---

## 3. Migrazioni database

```bash
cd apps/api
NODE_ENV=production npx prisma migrate deploy
```

Eseguire **prima** di avviare il nuovo processo applicativo.  
Il comando è idempotente — può essere rieseguito in sicurezza.

---

## 4. Avvio con PM2

```bash
npm i -g pm2

# API
pm2 start apps/api/dist/main.js --name athena-api \
  --env production \
  --max-memory-restart 512M

# Web
pm2 start "pnpm --filter @athena/web start" --name athena-web

# Salva configurazione per riavvio automatico
pm2 save
pm2 startup
```

---

## 5. Reverse proxy (Caddy — esempio)

Creare `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

```bash
systemctl reload caddy
```

Caddy gestisce SSL automaticamente via Let's Encrypt.

---

## 6. Variabili web (Next.js)

Creare `apps/web/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 7. Health check post-deploy

```bash
curl https://api.yourdomain.com/api/v1/health
# atteso: {"success":true,"data":{"status":"ok","services":{"database":"ok","api":"ok"}}}
```

---

## 8. Seed produzione (solo primo deploy)

```bash
cd apps/api && NODE_ENV=production npx ts-node prisma/seed.ts
```

---

## Checklist deploy

- [ ] `.env` con JWT secrets reali (≥64 chars)
- [ ] `NODE_ENV=production`
- [ ] `prisma migrate deploy` eseguito
- [ ] Seed eseguito (primo deploy)
- [ ] PM2 avviato e `pm2 save` eseguito
- [ ] Reverse proxy con SSL attivo
- [ ] `GET /api/v1/health` risponde `200 OK`
- [ ] Test login e onboarding manuale
