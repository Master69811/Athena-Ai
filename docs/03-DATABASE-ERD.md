# Athena AI — Database Schema & ERD

## 6 & 7. Database Schema + Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐
│     User     │1─────1│   UserProfile    │
│──────────────│       │──────────────────│
│ id           │       │ goalType         │
│ email        │       │ methodology      │
│ role         │       │ experienceLevel  │
│ subTier      │       │ equipment[]      │
└──────┬───────┘       │ injuries[]       │
       │               └──────────────────┘
       │1
       ├──────────* BodyMeasurement (weight, BF%, circonferenze, foto)
       │
       ├──────────* WorkoutPlan ──1:N─ WorkoutDay ──1:N─ WorkoutExercise ─N:1─ Exercise
       │
       ├──────────* WorkoutSession ──1:N─ WorkoutSet ─N:1─ Exercise
       │
       ├──────────* Exercise1RM
       ├──────────* AIProgressionDecision
       │
       ├──────────* NutritionPlan ──1:N─ WeeklyNutritionCheck
       ├──────────* MealLog ─N:1─ FoodItem
       │
       ├──────────* RecoveryLog
       │
       ├──────────* AIConversation ──1:N─ AIMessage
       │
       ├──────────* UserAchievement ─N:1─ Achievement
       ├──────────* Streak
       │
       ├──────────1 Subscription (Stripe)
       │
       ├──────────* ProgressPhoto
       ├──────────* VideoAnalysis
       │
       └──────────* TrainerClient (self-relation: trainer ↔ client)
```

### 22 Tabelle
1. **users** — account, auth, ruolo, subscription tier
2. **user_profiles** — dati fisici, obiettivi, metodologia, disponibilità, stile vita
3. **body_measurements** — peso, BF%, circonferenze, foto front/side/back
4. **exercises** — DB esercizi (muscoli, attrezzatura, video, errori, varianti)
5. **workout_plans** — programmi (metodologia, split, durata, AI reasoning)
6. **workout_days** — giorni del programma
7. **workout_exercises** — esercizi nel giorno (set, rep, RPE, recupero)
8. **workout_sessions** — sessioni live (durata, RPE, volume totale)
9. **workout_sets** — singole serie (peso, reps, RPE, RIR)
10. **exercise_1rms** — record 1RM stimati
11. **ai_progression_decisions** — decisioni auto-progressione
12. **nutrition_plans** — calorie, macro, reasoning
13. **food_items** — database alimenti
14. **meal_logs** — pasti registrati
15. **weekly_nutrition_checks** — check settimanali con aggiustamenti
16. **recovery_logs** — sonno, stress, HRV, recovery score
17. **ai_conversations** — conversazioni con Athena
18. **ai_messages** — messaggi
19. **achievements** — definizioni achievement
20. **user_achievements** — achievement sbloccati
21. **streaks** — serie di costanza
22. **subscriptions** — abbonamenti Stripe
+ **trainer_clients**, **progress_photos**, **video_analyses**

Schema completo e tipizzato in `apps/api/prisma/schema.prisma`.
