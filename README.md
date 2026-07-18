# Athena AI — AI Fitness Coaching Platform

> Piattaforma fitness con coaching autonomo end-to-end: progressioni intelligenti, recupero, nutrizione e trend del peso adattati automaticamente ogni settimana.

**Status:** `v1.0.0-beta.1` · Build: ✅ · Tests: 76/76 ✅ · Security: ✅

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend | NestJS 10, PostgreSQL 16, Prisma ORM |
| AI | Anthropic Claude (claude-opus-4-8) |
| Auth | JWT + Refresh Token, Google OAuth |
| Payments | Stripe (scaffold) |
| Infra locale | Docker Compose (PostgreSQL + Redis + Qdrant) |

## Struttura monorepo

```
athena-ai/
├── apps/
│   ├── api/          # NestJS — porta 3001
│   └── web/          # Next.js — porta 3000
├── packages/
│   ├── shared/       # Tipi TypeScript condivisi
│   └── ui/           # Componenti UI condivisi
├── docs/             # Guide operative
├── docker-compose.yml
└── turbo.json
```

## Quick Start (locale)

```bash
git clone <repo-url> && cd athena-ai
docker-compose up -d
cd apps/api && cp .env.example .env   # compilare JWT_SECRET e ANTHROPIC_API_KEY
cd ../.. && pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

Per la guida completa → [docs/INSTALL.md](docs/INSTALL.md)  
Per il deploy in produzione → [docs/DEPLOY_FULLSTACK.md](docs/DEPLOY_FULLSTACK.md)

## Moduli AI implementati

| Modulo | Funzione |
|---|---|
| AI Workout Generator | Genera programmi periodizzati completi |
| Progression Engine | Auto-progressione settimanale con stagnation detection |
| Program Adjustment Engine | Applica le decisioni con audit trail e versioning |
| Recovery Engine | Score 0-100 composito; gate su progressioni e nutrizione |
| Nutrition Engine | Decisioni caloriche goal-aware con Recovery integration |
| Body Weight Trend Engine | MA7/MA14, velocità settimanale, previsioni 4/12 settimane |
| AI Coach | Chat con contesto dinamico (profilo, piano, recovery, sessioni) |

## Endpoint principali

```
POST /api/v1/auth/register|login|refresh|logout
GET  /api/v1/users/dashboard
POST /api/v1/ai-workout/generate
POST /api/v1/sessions/start  ·  PUT /api/v1/sessions/:id/complete
POST /api/v1/progression/run
POST /api/v1/nutrition-engine/run
POST /api/v1/body-weight/log
GET  /api/v1/health
```

## Script

```bash
pnpm dev                           # avvia web + api in watch mode
pnpm build                         # build produzione tutti i package
pnpm test                          # tutti i test
pnpm db:migrate                    # migrazione sviluppo
pnpm --filter @athena/api db:migrate:prod   # migrazione produzione
pnpm db:seed                       # seed esercizi + alimenti
pnpm db:studio                     # Prisma Studio
```

## Documentazione operativa

| Documento | Contenuto |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Installazione locale step-by-step |
| [docs/DEPLOY_FULLSTACK.md](docs/DEPLOY_FULLSTACK.md) | Deploy produzione completo |
| [docs/UPDATE.md](docs/UPDATE.md) | Aggiornamento versioni e migrazioni |
| [docs/BACKUP.md](docs/BACKUP.md) | Backup e restore database |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Diagnosi problemi comuni |
| [CHANGELOG.md](CHANGELOG.md) | Storico versioni |
