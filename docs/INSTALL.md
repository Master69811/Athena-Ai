# Installazione locale

## Prerequisiti

| Strumento | Versione minima |
|---|---|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker | 24.x |
| Docker Compose | 2.x |
| PostgreSQL (via Docker) | 16 |

## 1. Clone e dipendenze

```bash
git clone <repo-url>
cd athena-ai
pnpm install
```

## 2. Variabili d'ambiente

```bash
cd apps/api
cp .env.example .env
```

Aprire `.env` e compilare i valori obbligatori:

```bash
# Generare JWT secrets
openssl rand -base64 64   # copiare come JWT_SECRET
openssl rand -base64 64   # copiare come JWT_REFRESH_SECRET

# API AI — obbligatoria per funzionalità AI
ANTHROPIC_API_KEY=sk-ant-...

# Database — già configurato per Docker locale
DATABASE_URL=postgresql://athena:athena_password@localhost:5432/athena_db
```

## 3. Avvio infrastruttura

```bash
# Dalla root del progetto
docker-compose up -d

# Verificare che i container siano healthy
docker-compose ps
```

Servizi avviati:
- PostgreSQL 16 → `localhost:5432`
- Redis 7 → `localhost:6379`
- Qdrant → `localhost:6333`
- pgAdmin → `localhost:5050` (admin@athena-ai.com / admin_password)

## 4. Database

```bash
# Dalla root
pnpm db:migrate    # applica tutte le migrazioni
pnpm db:seed       # seed: esercizi, alimenti, achievement
```

## 5. Avvio sviluppo

```bash
# Dalla root — avvia web + api in watch mode
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs
- pgAdmin: http://localhost:5050

## 6. Verifica installazione

```bash
curl http://localhost:3001/api/v1/health
# atteso: {"success":true,"data":{"status":"ok","services":{"database":"ok","api":"ok"}}}
```

## 7. Test

```bash
pnpm test                           # tutti i test
pnpm --filter @athena/api test      # solo API
```

## Troubleshooting installazione

**PostgreSQL non parte**
```bash
docker-compose logs postgres
# verificare che la porta 5432 non sia già in uso
```

**Prisma generate fallisce**
```bash
cd apps/api && npx prisma generate
```

**Port already in use**
```bash
lsof -ti:3000 | xargs kill   # web
lsof -ti:3001 | xargs kill   # api
```
