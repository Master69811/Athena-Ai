# Athena AI — Modelli AI & Algoritmi

## 13. Modello AI e Logiche Decisionali

### Stack AI
- **Claude claude-opus-4-8** (Anthropic) — coaching conversazionale + generazione programmi (ragionamento complesso)
- **GPT-4o** (OpenAI) — fallback + task strutturati veloci
- **Qdrant** — vector DB per RAG su knowledge base scientifica + similarity esercizi
- **Embeddings** — per memoria semantica a lungo termine dell'utente

### AI Coach — Context Engineering
Il system prompt si costruisce dinamicamente ad ogni messaggio iniettando:
1. Identità di Athena (personalità, regole)
2. Profilo completo utente
3. Programma attivo + settimana corrente
4. Recovery score più recente
5. Ultime 5 sessioni
6. Storico conversazione (ultimi 20 messaggi)

Risultato: risposte che sembrano provenire da un coach che ti segue da anni.

## 14. Algoritmo di Progressione (Auto-Progression Engine)

```
PER OGNI esercizio nel programma attivo:
  recentSets = ultimi 21 giorni di serie (no warmup)
  SE len(recentSets) < 3: SKIP

  avgRpe   = media(rpe)
  avgReps  = media(reps)
  avgWeight= media(weight)

  # CASO 1: l'utente migliora → AUMENTA
  SE avgRpe < targetRpe - 0.5 E avgReps >= repsMax:
     → INCREASE_WEIGHT (+2.5kg upper / +5kg lower)
     reasoning: "RPE sotto target con reps al massimo: pronto a salire"

  # CASO 2: troppa fatica → RIDUCI
  SE avgRpe > targetRpe + 1:
     → DECREASE_WEIGHT (-2.5/-5kg)
     reasoning: "RPE oltre target: riduco per ristabilire la zona corretta"

  # CASO 3: stallo (3+ settimane senza progresso volume) → CAMBIA
  SE isStagnating(weeklyVolumes):  # varianza < 3%
     → CHANGE_EXERCISE
     reasoning: "Plateau rilevato: variazione esercizio per nuovo stimolo"

  # CASO 4: progresso regolare → MANTIENI
  ALTRIMENTI:
     → MAINTAIN

  Salva AIProgressionDecision con reasoning leggibile dall'utente
```

**Trigger:** cron settimanale (`@Cron(EVERY_WEEK)`) su tutti gli utenti attivi + endpoint manuale.

### Fatigue Management
Recovery Score modula volume/intensità:
- **FRESH** (≥80): allenamento pieno, ok testare PR
- **NORMAL** (60-79): come da programma
- **FATIGUED** (40-59): -20% volume, RPE al limite basso
- **OVERTRAINED** (<40): riposo / recupero attivo consigliato

## 15. Algoritmo Nutrizionale (Nutrition Engine)

### Step 1 — TDEE (Mifflin-St Jeor)
```
BMR (uomo)  = 10·peso + 6.25·altezza − 5·età + 5
BMR (donna) = 10·peso + 6.25·altezza − 5·età − 161
TDEE = BMR × activityMultiplier   # 1.2 → 1.9
```

### Step 2 — Target calorico per obiettivo
```
WEIGHT_LOSS:          TDEE − 500   (~0.5 kg/sett)
BODY_RECOMPOSITION:   TDEE − 200
HYPERTROPHY:          TDEE + 300
STRENGTH:             TDEE + 200
LONGEVITY/HEALTH:     TDEE (mantenimento)
```

### Step 3 — Macro split per obiettivo
```
HYPERTROPHY:   30% P / 50% C / 20% F
WEIGHT_LOSS:   35% P / 35% C / 30% F
...
proteinFloor = peso × 1.8 g   # garantito sempre
```

### Step 4 — Weekly Auto-Adjustment
```
Δpeso = pesoCorrente − pesoSettimanaScorsa

SE obiettivo = WEIGHT_LOSS:
   SE Δpeso > −0.2:  calorie −= 150   "Perso poco, riduco di 150 kcal"
   SE Δpeso < −0.8:  calorie += 100   "Troppo veloce, proteggo la massa"

SE obiettivo = HYPERTROPHY:
   SE Δpeso < 0.1:   calorie += 150   "Crescita sotto target, aggiungo 150 kcal"

Ricalcola macro e salva WeeklyNutritionCheck con note AI
```

## 16. Predictive AI (Previsioni)
Regressione lineare sui dati storici di peso → proiezione 4/12/24 settimane con livello di confidenza decrescente. In V2: modello ML (gradient boosting) su peso + volume + calorie + sonno per stimare composizione corporea.
