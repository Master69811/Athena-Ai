# Athena AI — Deploy completo (Backend + Frontend)

Guida passo-passo, adatta anche a chi non è tecnico.

**Architettura del deploy:**
- **Backend** (API NestJS + database PostgreSQL) → **Railway** (usa il `Dockerfile`)
- **Frontend** (Next.js) → **Vercel** (cartella `apps/web`)

> Niente Redis necessario: l'app non lo usa all'avvio.

---

## ⚠️ Ordine importante
Si fa **prima il backend** (così ottieni l'URL dell'API), **poi il frontend**,
e infine si torna sul backend per autorizzare l'URL del frontend (CORS).

---

## PARTE 1 — Backend su Railway

### 1.1 Crea il progetto
1. Vai su **https://railway.app** e accedi con GitHub.
2. **New Project → Deploy from GitHub repo → Athena-Ai**.
3. Railway rileva il `Dockerfile` nella root e lo usa per costruire l'API.

### 1.2 Aggiungi il database PostgreSQL
1. Nel progetto: **New → Database → Add PostgreSQL**.
2. Railway crea la variabile `DATABASE_URL` automaticamente.
3. Nel servizio dell'API, apri **Variables** e collega/incolla `DATABASE_URL`
   del database (su Railway puoi referenziarla con `${{Postgres.DATABASE_URL}}`).

### 1.3 Imposta le variabili d'ambiente (servizio API → Variables)
Incolla queste (i due secret JWT sotto sono già generati per te, sicuri):

```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=lgU+sybJJYoR8vXNRzp5nbYWJsIQHa8xJ19qwtVKlUAS2mGNTr67RwOZJd+0oAgW
JWT_REFRESH_SECRET=5+VTqR/P48eJk4nZZ1Xqi99ljRddVdyi/6GKM1B/Ts8Dbxz1MSqbwbKer5QZFOnk
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...   ← la tua chiave Anthropic
FRONTEND_URL=http://localhost:3000   ← temporanea, la aggiorni nella Parte 3
```

> `PORT` lo imposta Railway da solo: non aggiungerlo.
> `ANTHROPIC_API_KEY` serve per il Coach AI e la generazione piani. Senza, l'app
> parte lo stesso ma le funzioni AI daranno errore.

### 1.4 Deploy
1. Railway builda l'immagine ed esegue automaticamente, all'avvio:
   - `prisma migrate deploy` (crea le tabelle)
   - il seed (esercizi, achievement, alimenti — idempotente)
   - avvio dell'API
2. Quando è "Active", vai su **Settings → Networking → Generate Domain**.
3. Copia l'URL pubblico, es. `https://athena-api.up.railway.app`. **Questo è il tuo API URL.**

### 1.5 Verifica
Apri nel browser: `https://<il-tuo-api>.up.railway.app/api/v1/health`
→ deve rispondere con uno stato OK.

---

## PARTE 2 — Frontend su Vercel

### 2.1 Importa il progetto
1. Vai su **https://vercel.com** e accedi con GitHub.
2. **Add New → Project → Athena-Ai**.
3. **Root Directory**: clicca *Edit* e scegli **`apps/web`** ← fondamentale (è un monorepo).
4. Framework: **Next.js** (rilevato in automatico).

### 2.2 Variabile d'ambiente
Aggiungi:
```
NEXT_PUBLIC_API_URL=https://<il-tuo-api>.up.railway.app
```
(l'URL della Parte 1.4, **senza** `/` finale)

### 2.3 Deploy
1. Clicca **Deploy** e attendi ~2 minuti.
2. Vercel ti dà un URL, es. `https://athena-ai.vercel.app`. **Questo è il tuo Frontend URL.**

---

## PARTE 3 — Collega i due (CORS)

Il backend accetta richieste solo dal frontend autorizzato.

1. Torna su **Railway → servizio API → Variables**.
2. Modifica `FRONTEND_URL` con l'URL Vercel:
   ```
   FRONTEND_URL=https://athena-ai.vercel.app
   ```
3. Salva → Railway riavvia l'API automaticamente.

✅ **Fatto.** Apri l'URL Vercel: registrazione, login, onboarding e tutte le
funzioni ora comunicano col backend.

---

## PARTE 4 — Installa su iPhone (PWA)
1. Apri l'URL Vercel in **Safari** (deve essere Safari).
2. **Condividi** (□↑) → **Aggiungi a Home** → **Aggiungi**.
3. Apri dall'icona ⚡: parte a schermo intero come un'app.

(Dettagli in `docs/PWA.md`.)

---

## Risoluzione problemi

| Sintomo | Causa | Soluzione |
|--------|-------|-----------|
| Login/registrazione danno errore di rete | CORS o API URL errato | Verifica `NEXT_PUBLIC_API_URL` (Vercel) e `FRONTEND_URL` (Railway) — devono combaciare con gli URL reali, senza `/` finale |
| API non parte, log "JWT_SECRET ... placeholder" | Secret non impostati | Imposta i due `JWT_SECRET` (≥32 caratteri) come sopra |
| "relation does not exist" / tabelle mancanti | Migrazioni non applicate | Sono automatiche all'avvio; controlla i log del deploy per errori di `migrate deploy` |
| Ricerca alimenti vuota / nessun achievement | Seed non eseguito | Riavvia il servizio (il seed gira all'avvio) o lancia manualmente `pnpm --filter @athena/api db:seed` da una shell Railway |
| Funzioni AI in errore | `ANTHROPIC_API_KEY` mancante/non valida | Imposta la chiave Anthropic nelle Variables di Railway |

---

## Alternative al posto di Railway
Lo stesso `Dockerfile` funziona su **Render** (New → Web Service → Docker) e
**Fly.io** (`fly launch`). Serve sempre un database PostgreSQL gestito e le stesse
variabili d'ambiente della Parte 1.3.
