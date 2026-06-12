# Athena AI — Guida Deploy (Railway + Vercel)

## Architettura consigliata
- **Backend (API + DB)** → [Railway](https://railway.app) — gratuito fino a $5/mese di usage
- **Frontend (Next.js)** → [Vercel](https://vercel.com) — piano gratuito

---

## PARTE 1 — Backend su Railway

### Step 1: Account Railway
1. Vai su **railway.app** → **"Login with GitHub"**

### Step 2: Nuovo progetto
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Autorizza GitHub → seleziona `master69811/Athena-Ai`
3. Railway rileva il `Dockerfile` alla root → click **"Deploy"**

### Step 3: Aggiungi PostgreSQL
1. Nel progetto, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway crea il DB e aggiunge `DATABASE_URL` automaticamente

### Step 4: Variabili d'ambiente
Nel pannello **Variables** del servizio API, aggiungi queste variabili una per una:

```
NODE_ENV=production
PORT=3001

GEMINI_API_KEY=<la-tua-chiave-gemini-AIzaSy...>
GEMINI_MODEL=gemini-2.0-flash

JWT_SECRET=<genera con: openssl rand -base64 64>
JWT_REFRESH_SECRET=<genera con: openssl rand -base64 64  — valore diverso dal precedente>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=https://<tuo-progetto>.vercel.app
```

> `DATABASE_URL` viene aggiunto automaticamente da Railway quando aggiungi PostgreSQL.

### Step 5: Verifica backend
Attendi il build (~3-5 min), poi apri:
- `https://tuo-nome.railway.app/api/v1/health` → deve rispondere `{"status":"ok"}`
- `https://tuo-nome.railway.app/docs` → Swagger UI

Copia l'URL del tuo servizio Railway (es. `https://athena-api-production.railway.app`).

---

## PARTE 2 — Frontend su Vercel

### Step 1: Account Vercel
1. Vai su **vercel.com** → **"Continue with GitHub"**

### Step 2: Importa progetto
1. **"Add New Project"** → **"Import Git Repository"**
2. Seleziona `master69811/Athena-Ai`
3. Imposta **Root Directory**: `apps/web`
4. Framework rilevato automaticamente: **Next.js**

### Step 3: Variabile d'ambiente
Prima di cliccare Deploy, aggiungi:

```
NEXT_PUBLIC_API_URL=https://tuo-nome.railway.app
```

(usa l'URL copiato dal Step 5 di Railway, senza slash finale)

### Step 4: Deploy
Click **"Deploy"** → attendi ~2 minuti.

Vercel ti darà un URL tipo `https://athena-ai-xyz.vercel.app`.

### Step 5: Aggiorna FRONTEND_URL su Railway
1. Torna su Railway → **Variables**
2. Aggiorna `FRONTEND_URL` con l'URL Vercel esatto
3. Railway fa il redeploy automaticamente (~1 min)

---

## Verifica finale

| Check | URL |
|-------|-----|
| API health | `https://tuo.railway.app/api/v1/health` |
| Swagger | `https://tuo.railway.app/docs` |
| App web | `https://tuo.vercel.app` |

Testa: registra un account → completa onboarding → genera piano workout.

---

## Troubleshooting

| Errore | Soluzione |
|--------|-----------|
| `JWT_SECRET too short` | Copia i valori interi dalla tabella sopra |
| Build fallisce su Railway | Verifica che il branch sia `claude/ai-fitness-platform-Ovwzu` o `main` |
| Frontend non si connette | `NEXT_PUBLIC_API_URL` non deve avere `/` finale |
| CORS error | Aggiorna `FRONTEND_URL` su Railway con l'URL Vercel esatto |
| `GEMINI_API_KEY invalid` | Controlla che la chiave inizi con `AIzaSy` e non abbia spazi |

---

## Deploy su VPS (alternativa avanzata)

Per un VPS (Ubuntu 22.04):

```bash
# Installa dipendenze
curl -fsSL https://get.docker.com | sh
git clone https://github.com/master69811/Athena-Ai /opt/athena && cd /opt/athena

# Configura env
cp apps/api/.env.example apps/api/.env
# Edita .env con i valori reali

# Avvia con Docker Compose
docker compose up -d

# Migra DB e seed
docker compose exec api npx prisma migrate deploy
docker compose exec api npx ts-node prisma/seed.ts
```
