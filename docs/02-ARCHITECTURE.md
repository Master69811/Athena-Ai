# Athena AI — Architettura Software

## 5. Architettura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Next.js 14 (Web)  │  React Native (iOS/Android)             │
│  TanStack Query · Zustand · Framer Motion                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / REST
┌───────────────────────────▼─────────────────────────────────┐
│                      API GATEWAY (AWS ALB)                   │
│         Rate limiting · CORS · Helmet · Compression          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    NestJS API (versioned /v1)                │
│  ┌─────────┬──────────┬──────────┬──────────┬─────────────┐  │
│  │  Auth   │  Users   │ Workouts │ Sessions │  Nutrition  │  │
│  ├─────────┼──────────┼──────────┼──────────┼─────────────┤  │
│  │Recovery │ AI-Coach │AI-Workout│Progress  │ Gamification│  │
│  ├─────────┼──────────┼──────────┼──────────┼─────────────┤  │
│  │Progress.│Analytics │ Trainer  │  Subs    │  Exercises  │  │
│  └─────────┴──────────┴──────────┴──────────┴─────────────┘  │
└──────┬──────────────┬───────────────┬──────────────┬─────────┘
       │              │               │              │
┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ PostgreSQL │ │   Redis    │ │   Qdrant    │ │  AI APIs   │
│  (Prisma)  │ │ Cache/Bull │ │  (Vectors)  │ │Claude/GPT4 │
└────────────┘ └────────────┘ └─────────────┘ └────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│        AWS: S3 (media) · CloudFront (CDN) · SES (email)      │
└──────────────────────────────────────────────────────────────┘
```

### Pattern Architetturali
- **Modular Monolith** → facile da scalare a microservizi quando serve
- **Repository Pattern** via Prisma
- **CQRS-lite** per analytics (read models separati)
- **Background Jobs** via Bull/Redis (progressione settimanale, report, email)
- **Cron Jobs** (`@nestjs/schedule`) per auto-progressione e nutrition check
- **Event-driven** per achievement unlocking

### Scalabilità (milioni di utenti)
- API stateless → horizontal scaling su ECS/Fargate
- PostgreSQL con read replicas + connection pooling (PgBouncer)
- Redis per cache hot-path (dashboard, profili)
- CDN per media (video esercizi, animazioni 3D)
- Vector DB Qdrant per RAG e similarity search esercizi
- AI calls in coda asincrona per workout generation pesanti

## 12. API Architecture

REST versionata sotto `/api/v1`. Risposta uniforme via `TransformInterceptor`:
```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

### Endpoint principali
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/auth/register` | Registrazione |
| POST | `/auth/login` | Login JWT |
| POST | `/auth/refresh` | Refresh token |
| POST | `/users/onboarding` | Completa onboarding |
| GET | `/users/dashboard` | Stats dashboard |
| POST | `/ai-workout/generate` | Genera piano AI |
| POST | `/ai-workout/set-recommendation` | Raccomandazione real-time |
| POST | `/sessions/start` | Avvia sessione |
| POST | `/sessions/:id/sets` | Logga serie |
| PUT | `/sessions/:id/complete` | Completa sessione |
| POST | `/nutrition/plan/generate` | Genera piano nutrizionale |
| POST | `/nutrition/weekly-check` | Check settimanale |
| POST | `/recovery/log` | Logga recupero |
| POST | `/ai-coach/chat` | Chat con Athena |
| GET | `/progress/predictions` | Previsioni peso AI |
| GET | `/analytics/volume/muscle-groups` | Volume per muscolo |
| POST | `/subscriptions/checkout` | Checkout Stripe |
| GET | `/trainer/clients` | Clienti del PT |

Documentazione interattiva completa via **Swagger** su `/docs`.
