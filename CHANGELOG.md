# Changelog

Tutte le modifiche rilevanti sono documentate in questo file.
Formato: [Semantic Versioning](https://semver.org/). Convenzione: [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0-beta.1] — 2026-06-05

### Release name: *Prometheus*

Prima release beta pubblica. Il sistema è operativo end-to-end: onboarding, generazione piano, logging sessioni, progressione automatica, recupero, nutrizione e trend peso.

### Added

**Core Platform**
- Autenticazione JWT con refresh token rotation
- Onboarding 7-step con generazione automatica piano allenamento e piano nutrizionale
- Libreria esercizi con seed (15 esercizi base, estendibile)
- Dashboard con KPI aggregati, grafici peso, ring recupero, widget decisioni nutrizionali

**Progression Engine**
- Analisi performance post-sessione: RPE medio, completamento serie, superamento target
- Decisioni auto-generate: `INCREASE_WEIGHT`, `INCREASE_REPS`, `INCREASE_SETS`, `DELOAD`, `MAINTAIN`, `CHANGE_EXERCISE`
- Stagnation detection su finestra 14 giorni
- Insight record con `evidenceData` JSON per audit completo

**Program Adjustment Engine**
- Applicazione decisioni con versioning del piano (`ProgramVersion`)
- `ProgramAdjustment` con rationale, evidence e tipo aggiustamento
- Gate recovery: HOLD blocca incrementi, DELOAD attiva scarico, CAUTION aggiunge nota
- `PROGRESSION_HELD` audit record quando recovery blocca progressione

**Recovery Engine**
- Score composito 0-100 (sonno 40%, stress 20%, energia 20%, passi 10%, HRV 10%)
- Moving average 7 giorni, trend direction, overreaching risk
- `EngineAction`: PROCEED / CAUTION / HOLD / DELOAD
- Snapshot giornaliero via cron 05:00
- Integrazione con Program Adjustment Engine e Nutrition Engine

**Nutrition Engine**
- Decisioni caloriche goal-aware: WEIGHT_LOSS, HYPERTROPHY, STRENGTH, BODY_RECOMPOSITION, LONGEVITY
- Recovery gate: HOLD/DELOAD blocca riduzioni caloriche
- Debounce 7 giorni tra decisioni; guard `isFollowingPlan` (≥5 log/settimana)
- Analisi settimanale via cron lunedì 07:00
- Endpoint manuale `/nutrition-engine/run`

**Body Weight Trend Engine**
- Log giornaliero con upsert
- Moving average 7 e 14 giorni
- Regressione lineare → velocità settimanale (kg/week) + R² confidence score
- Previsioni 4 e 12 settimane
- Snapshot giornaliero via cron 06:00

**AI Features**
- AI Workout Generator: programmi periodizzati con 15+ metodologie
- Real-time set recommendation durante le sessioni
- AI Coach: chat con contesto dinamico (profilo, piano attivo, recovery, sessioni recenti)

**Sessions**
- Start / log set / complete con RPE per serie
- Calcolo 1RM automatico post-sessione

### Security
- Helmet, CORS, compression attivi
- `forbidNonWhitelisted: true` su ValidationPipe globale
- Startup validation: rifiuta avvio in produzione con JWT placeholder
- JWT access token 15m + refresh token 7 giorni

### Infrastructure
- TurboRepo monorepo (pnpm workspaces)
- Docker Compose: PostgreSQL 16, Redis 7, Qdrant, pgAdmin
- GitHub Actions CI: build + test su push/PR
- 4 migrazioni Prisma versionate
- Swagger disponibile su `/docs`

### Tests
- 76 test unitari, 6 suite, 0 fallimenti
- Copertura algoritmi core: progression, program-engine, recovery, nutrition, body-weight-engine, nutrition-engine

---

## Versioni future pianificate

- `1.0.0-beta.2` — Fix feedback beta, miglioramenti UX, rate limiting granulare su auth
- `1.1.0` — Coach Memory Engine (memoria persistente AI Coach)
- `1.2.0` — Goal Prediction Engine avanzato (multi-signal)
- `2.0.0` — Conversational AI Coach, analisi foto/video (post-beta feedback)
