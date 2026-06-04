# Athena AI — Roadmap, Costi & Monetizzazione

## 17. Piano Sviluppo MVP — 90 Giorni

### Sprint 1-2 (Settimane 1-4) — Fondamenta
- ✅ Monorepo, CI/CD, Docker
- ✅ Auth (JWT + Google OAuth)
- ✅ Database schema + migrazioni
- ✅ Onboarding avanzato
- ✅ Design system

### Sprint 3-4 (Settimane 5-8) — Core Training
- ✅ Database esercizi + seed
- ✅ AI Workout Generator
- ✅ Live Workout Mode
- ✅ Auto-progression engine
- ✅ Dashboard

### Sprint 5-6 (Settimane 9-12) — AI & Monetizzazione
- ✅ AI Coach chat
- ✅ Nutrition engine
- ✅ Recovery score
- ✅ Stripe subscriptions
- ✅ Gamification
- 🚀 Beta launch (TestFlight + web)

## 16. Piano Sviluppo 12 Mesi

| Trimestre | Focus | Deliverable |
|-----------|-------|-------------|
| **Q1** | MVP + Launch | Web + iOS beta, 1k utenti |
| **Q2** | Mobile + Wearables | App Store/Play, Apple Watch, Whoop/Oura HRV |
| **Q3** | AI Avanzata | Analisi foto, biomeccanica video, RAG scientifico |
| **Q4** | Scale + B2B | Modalità Coach completa, white-label, 100k utenti |

## 18. Stima Costi Realistica

### Sviluppo (MVP, 3 mesi)
| Voce | Costo |
|------|-------|
| 2 Full-stack senior | €60.000 |
| 1 AI/ML engineer | €30.000 |
| 1 UI/UX designer | €18.000 |
| **Totale sviluppo** | **€108.000** |

### Infrastruttura mensile (scala iniziale, ~10k utenti)
| Servizio | Costo/mese |
|----------|-----------|
| AWS (ECS, RDS, S3, CloudFront) | €800 |
| Anthropic Claude API | €1.500 |
| OpenAI API | €400 |
| Qdrant Cloud | €200 |
| Stripe (2.9% + €0.25/tx) | variabile |
| Email (SES) | €50 |
| **Totale** | **~€2.950/mese** |

### Costo AI per utente attivo
- ~€0.15-0.30/utente/mese (con prompt caching + tiering modelli)
- Free tier limitato per controllare i costi

## 19. Strategia di Monetizzazione

### Modello Freemium SaaS
| Tier | Prezzo | Target |
|------|--------|--------|
| **Free** | €0 | Acquisizione, viralità |
| **Pro** | €14.99/mese | Atleta serio (core revenue) |
| **Premium** | €29.99/mese | Power user, analisi avanzata |
| **Coach** | €79.99/mese | Professionisti (B2B2C) |

### Leve di crescita
- **Annual plans** con 2 mesi gratis (riduce churn)
- **Free trial 7 giorni** su Pro
- **Referral program** (1 mese gratis per invito)
- **Coach marketplace** (revenue share sui clienti dei PT)

### Proiezione (12 mesi)
```
100k utenti registrati
 → 8% conversione paid = 8.000 paganti
 → ARPU medio €18/mese
 → MRR ≈ €144.000  →  ARR ≈ €1.7M
```

### Unit Economics
- **CAC** target: €15-25 (organico + paid)
- **LTV** (churn 5%/mese): ~€360
- **LTV:CAC** ≈ 15:1 (eccellente)
