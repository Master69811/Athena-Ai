# Athena AI — Deploy completo (Backend + Frontend)

Guida passo-passo, adatta anche a chi non è tecnico.

**Architettura del deploy:**
- **Backend** (API NestJS + PostgreSQL + Redis) → **Render** (blueprint `render.yaml`)
- **Vector DB** (RAG / protocollo Invictus) → **Qdrant Cloud** (free tier 1GB)
- **Frontend** (Next.js) → **Vercel** (cartella `apps/web`)

---

## ⚠️ Ordine importante
Prima **Qdrant Cloud** (facoltativo ma consigliato), poi il **backend** (così ottieni
l'URL dell'API), poi il **frontend**, e infine si torna sul backend per autorizzare
l'URL del frontend (CORS).

---

## PARTE 0 — Qdrant Cloud (per il RAG, 2 minuti)

1. Vai su **https://cloud.qdrant.io** e registrati (gratis).
2. **Create Cluster** → piano **Free** (1GB).
3. Copia due valori: l'**URL del cluster** (es. `https://xyz-abc.eu-central.aws.cloud.qdrant.io:6333`)
   e l'**API Key**.

> Se salti questo passaggio l'app funziona lo stesso: il RAG si disattiva
> automaticamente e Athena risponde senza knowledge base.

---

## PARTE 1 — Backend su Render

### 1.1 Deploy con Blueprint (tutto automatico)
1. Vai su **https://dashboard.render.com** e accedi con GitHub.
2. **New → Blueprint** → seleziona il repo **Athena-Ai**.
3. Render legge `render.yaml` e crea da solo: **API** (Docker) + **PostgreSQL** + **Redis**.
4. Ti verranno chiesti i valori delle variabili non sincronizzate:

```
GEMINI_API_KEY   = la tua chiave Google AI Studio (aistudio.google.com)
FRONTEND_URL     = http://localhost:3000   ← temporanea, la aggiorni nella Parte 3
QDRANT_URL       = URL del cluster Qdrant Cloud (Parte 0)
QDRANT_API_KEY   = API key Qdrant Cloud (Parte 0)
```

> `JWT_SECRET` e `JWT_REFRESH_SECRET` vengono **generati automaticamente** da Render.
> `PORT` lo imposta Render da solo: non aggiungerlo.
> `GEMINI_API_KEY` serve per il Coach AI, i piani e il RAG. Senza, l'app parte
> ma le funzioni AI daranno errore.

5. Clicca **Apply** e attendi il primo build (~5 minuti).

### 1.2 Cosa succede all'avvio (automatico)
- `prisma migrate deploy` (crea le tabelle)
- il seed (esercizi, achievement, alimenti — idempotente)
- avvio dell'API con health check su `/api/v1/health`

### 1.3 Ottieni l'URL
Nel servizio **athena-api** trovi l'URL pubblico, es.
`https://athena-api.onrender.com`. **Questo è il tuo API URL.**

### 1.4 Verifica
Apri nel browser: `https://athena-api.onrender.com/api/v1/health`
→ deve rispondere con uno stato OK.

> ⏱ **Nota piano free:** il servizio si "addormenta" dopo 15 minuti di inattività;
> la prima richiesta successiva impiega ~30–50 secondi (cold start). Per eliminarlo,
> passa al piano Starter.

---

## PARTE 2 — Frontend su Vercel

### 2.1 Importa il progetto
1. Vai su **https://vercel.com** e accedi con GitHub.
2. **Add New → Project → Athena-Ai**.
3. **Root Directory**: clicca *Edit* e scegli **`apps/web`** ← fondamentale (è un monorepo).
4. Framework: **Next.js** (rilevato in automatico).

### 2.2 Variabile d'ambiente
```
NEXT_PUBLIC_API_URL=https://athena-api.onrender.com
```
(l'URL della Parte 1.3, **senza** `/` finale)

### 2.3 Deploy
1. Clicca **Deploy** e attendi ~2 minuti.
2. Vercel ti dà un URL, es. `https://athena-ai.vercel.app`. **Questo è il tuo Frontend URL.**

---

## PARTE 3 — Collega i due (CORS)

1. Torna su **Render → athena-api → Environment**.
2. Modifica `FRONTEND_URL` con l'URL Vercel:
   ```
   FRONTEND_URL=https://athena-ai.vercel.app
   ```
3. Salva → Render riavvia l'API automaticamente.

✅ **Fatto.** Apri l'URL Vercel: registrazione, login, onboarding e tutte le
funzioni ora comunicano col backend.

---

## PARTE 4 — Carica il protocollo Invictus (RAG, opzionale)

Dopo il login, con il token JWT:

```bash
curl -X POST https://athena-api.onrender.com/api/v1/rag/ingest \
  -H "Authorization: Bearer IL_TUO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"<testo del capitolo>","source":"Project Invictus - Cap.1","category":"metodologia"}'
```

---

## PARTE 5 — Installa su iPhone (PWA)
1. Apri l'URL Vercel in **Safari** (deve essere Safari).
2. **Condividi** (□↑) → **Aggiungi a Home** → **Aggiungi**.
3. Apri dall'icona ⚡: parte a schermo intero come un'app.

(Dettagli in `docs/PWA.md`.)

---

## Risoluzione problemi

| Sintomo | Causa | Soluzione |
|--------|-------|-----------|
| Login/registrazione danno errore di rete | CORS o API URL errato | Verifica `NEXT_PUBLIC_API_URL` (Vercel) e `FRONTEND_URL` (Render) — devono combaciare con gli URL reali, senza `/` finale |
| Prima richiesta lentissima (~40s) | Cold start del piano free | Normale; riprova o passa al piano Starter |
| API non parte, log "JWT_SECRET ... placeholder" | Secret non impostati | Su Render sono auto-generati dal blueprint; verifica in Environment |
| "relation does not exist" / tabelle mancanti | Migrazioni non applicate | Sono automatiche all'avvio; controlla i log del deploy per errori di `migrate deploy` |
| Ricerca alimenti vuota / nessun achievement | Seed non eseguito | Riavvia il servizio (il seed gira all'avvio) |
| Funzioni AI in errore | `GEMINI_API_KEY` mancante/non valida | Imposta la chiave nelle Environment di Render |
| Athena non cita il protocollo Invictus | RAG non configurato o vuoto | Verifica `QDRANT_URL`/`QDRANT_API_KEY` e carica i documenti (Parte 4) |

---

## Alternative al posto di Render
Lo stesso `Dockerfile` funziona su **Railway** (Deploy from GitHub repo) e
**Fly.io** (`fly launch`). Serve sempre un database PostgreSQL gestito e le stesse
variabili d'ambiente della Parte 1.1.
