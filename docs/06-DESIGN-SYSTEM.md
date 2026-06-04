# Athena AI — Design System & User Flows

## 8. User Flow Completo

```
LANDING
  └─> Register / Login
        └─> ONBOARDING (7 step)
              1. Profilo (nome, età, sesso, altezza, peso, BF%)
              2. Obiettivi (8 opzioni con card animate)
              3. Livello (principiante/intermedio/avanzato)
              4. Disponibilità (giorni, durata, palestra/casa, attrezzatura)
              5. Stile di vita (sonno, stress, passi, lavoro)
              6. Metodologia (15 scuole)
              7. Completato → AI genera piano
        └─> DASHBOARD
              ├─> Workout → Live Session → logging set → AI recommendation → complete
              ├─> Nutrition → genera piano → log pasti → weekly check
              ├─> Progress → grafici → foto → previsioni AI
              ├─> AI Coach → chat contestuale
              ├─> Achievements → badge, streak, punti
              └─> Settings → profilo, abbonamento, preferenze
```

## 9. Wireframe (schermata per schermata)

### Dashboard
```
┌────────────────────────────────────────┐
│ [Brain] ATHENA INSIGHT DEL GIORNO       │ ← AI card gradient
├──────────┬──────────┬──────────┬────────┤
│Allenamenti│ Volume   │ Streak   │Recovery│ ← 4 KPI cards
│    4     │  12.5t   │  7 gg    │  82%   │
├──────────┴──────────┴──────────┼────────┤
│  Grafico Peso (AreaChart)       │Recovery│
│                                 │ Ring   │
├─────────────────────────────────┴────────┤
│  Nutrizione Oggi   │  Prossimo Allenamento│
│  (macro bars)      │  (lista + bottone)   │
└──────────────────────────────────────────┘
```

### Live Workout Mode (ispirato all'app di riferimento)
```
┌────────────────────────────────────────┐
│ [X]   ●━━●━●━○━○   3/7                  │ ← progress
├────────────────────────────────────────┤
│  ⏱ RECUPERO  2:30  [Salta]             │ ← rest timer
├────────────────────────────────────────┤
│  COMPOUND · CHEST          Serie 2/4    │
│  Panca Piana                            │
│  4 serie · 6-10 rip · RPE 8 · 3:00      │
│  ✓ Serie 1: 80kg × 8 @ RPE 7            │
├──────────────────┬─────────────────────┤
│  PESO (kg)       │  RIPETIZIONI         │
│  [-] 82.5 [+]    │  [-]  8  [+]         │
├──────────────────┴─────────────────────┤
│  RPE: 6  7  [8]  9  10                  │
│  2 reps in riserva                      │
├────────────────────────────────────────┤
│  [Brain] ATHENA: Ottimo! Aumenta 2.5kg │ ← AI recommendation
├────────────────────────────────────────┤
│  [<]  [✓ Completa Serie 2]  [>]         │
└────────────────────────────────────────┘
```

## 10. Design System

### Filosofia
Ispirazione: **Apple · Linear · Vercel · Whoop · Oura**. Dark-first, premium, minimalista, fluido.

### Tokens (CSS Variables)
```css
--background:       240 10% 3.9%   /* #0a0a0f deep slate */
--surface:          240 10% 7%
--surface-elevated: 240 10% 10%
--border:           240 8% 14%
--primary:          239 84% 67%    /* indigo #6366f1 */
--accent:           262 80% 65%    /* violet #8b5cf6 */
--success:          142 71% 45%    /* emerald */
--warning:          38 92% 50%     /* amber */
--destructive:      0 84% 60%      /* red */
```

### Tipografia
- **Inter** (variabile) — UI
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 32 / 48 / 72
- Pesi: 400, 500, 600, 700, 900 (hero)

### Componenti
- **Button** — 7 varianti (default, gradient, outline, ghost, destructive, success, glass) × 6 size, con Framer Motion tap/hover
- **Card** — glassmorphism, opzioni `glow` e `elevated`
- **MetricCard** — KPI con icona colorata
- Animazioni: `fade-in`, `slide-up`, `scale-in`, `shimmer`, `pulse-glow`

### Microinterazioni
- Tap scale 0.97 su tutti i bottoni
- Stagger reveal su liste e dashboard
- Glow border al hover su card interattive
- Typing indicator animato in AI Coach
- Ring animato per recovery score
- Progress bar animate per macro

## 11. Struttura Repository
```
athena-ai/
├── apps/
│   ├── web/          Next.js 14 (App Router)
│   │   └── src/
│   │       ├── app/          route groups: (auth) (onboarding) (dashboard)
│   │       ├── components/    ui · layout · onboarding · workout · ...
│   │       ├── lib/           api client · utils · hooks
│   │       └── store/         Zustand stores
│   ├── api/          NestJS (15 moduli)
│   │   ├── src/modules/       feature modules
│   │   ├── src/common/        filters · interceptors · decorators
│   │   └── prisma/            schema + seed
│   └── mobile/       React Native (Expo)
├── packages/
│   ├── shared/       tipi + costanti condivisi
│   └── ui/           componenti condivisi
├── docs/             documentazione strategica (questi file)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```
