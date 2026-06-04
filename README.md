# Athena AI — Elite AI Fitness Platform

> The world's most advanced AI-powered fitness coaching platform, combining elite sports science with cutting-edge artificial intelligence.

## 🚀 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion |
| Backend | NestJS, PostgreSQL, Redis, Prisma ORM |
| AI | Anthropic Claude (claude-opus-4-8), OpenAI GPT-4o |
| Vector DB | Qdrant |
| Mobile | React Native (Expo) |
| Cloud | AWS (S3, CloudFront) |
| Payments | Stripe |
| Auth | JWT, Google OAuth |

## 🏗️ Monorepo Structure

```
athena-ai/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS backend
│   └── mobile/       # React Native (Expo)
├── packages/
│   ├── shared/       # Shared TypeScript types & constants
│   └── ui/           # Shared UI components
├── docker-compose.yml
└── turbo.json
```

## ⚡ Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 1. Clone and install
```bash
git clone <repo-url>
cd athena-ai
cp .env.example .env
# Fill in your API keys in .env
pnpm install
```

### 2. Start databases
```bash
docker-compose up -d
```

### 3. Setup database
```bash
cd apps/api
cp .env.example .env
# Edit .env with your credentials
pnpm db:migrate
pnpm db:seed
```

### 4. Start development
```bash
# From root
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs
- pgAdmin: http://localhost:5050

## 🤖 AI Features

### AI Coach (Athena)
- Full context awareness (workout history, nutrition, recovery, profile)
- Powered by Claude claude-opus-4-8 with extended thinking
- Persistent conversation memory
- Multilingual support (Italian/English)

### AI Workout Generator
- Generates complete periodized programs
- Supports 15+ training methodologies (RP, Project Invictus, 5/3/1, PPL, etc.)
- Real-time set recommendations during workouts
- Auto-progression with stagnation detection

### AI Nutrition Engine
- TDEE calculation (Mifflin-St Jeor formula)
- Goal-specific macro splits
- Weekly auto-adjustment based on actual weight changes
- Food database with 15,000+ items

### Recovery Score
- 0-100 composite score
- Inputs: sleep quality, HRV, stress, daily steps, energy
- Auto-modifies workout volume/intensity

## 📱 App Screens

- **Landing Page** — Hero, features, pricing
- **Auth** — Login, Register
- **Onboarding** — 7-step profile builder
- **Dashboard** — KPIs, charts, AI insight, next workout
- **Workout** — Plan view, AI generator
- **Live Session** — Real-time set logging, AI recommendations, rest timer
- **Nutrition** — Macro tracking, meal logging, weekly check-in
- **Progress** — Weight charts, body composition, photo comparison
- **AI Coach** — Chat interface with typing animation, suggestions
- **Achievements** — Gamification with rarity system
- **Settings** — Profile, subscription, preferences

## 💰 Subscription Plans

| Feature | Free | Pro €14.99 | Premium €29.99 | Coach €79.99 |
|---------|------|------------|-----------------|--------------|
| AI Plans/month | 3 | Unlimited | Unlimited | Unlimited |
| Exercise Library | 100 | 3000+ | 3000+ | 3000+ |
| AI Coach Chat | 10/month | Unlimited | Unlimited | Unlimited |
| Nutrition AI | ❌ | ✅ | ✅ | ✅ |
| Video Analysis | ❌ | ❌ | ✅ | ✅ |
| Client Management | ❌ | ❌ | ❌ | 50 clients |

## 🔧 Environment Variables

See `.env.example` for all required variables.

**Required for AI features:**
- `ANTHROPIC_API_KEY` — Claude API key
- `OPENAI_API_KEY` — OpenAI API key (optional fallback)

**Required for auth:**
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Required for payments:**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## 🏃 Development Scripts

```bash
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed database with exercises + food items
pnpm db:studio        # Open Prisma Studio
```

## 📊 Database Schema

22 tables covering:
- Users, profiles, measurements
- Exercises (3000+ seeded)
- Workout plans, days, exercises
- Live sessions, sets, 1RM records
- AI conversations and messages
- Nutrition plans, food items, meal logs
- Recovery logs
- Achievements and streaks
- Subscriptions (Stripe)
- Trainer/client relationships
- Progress photos and video analyses

## 🧠 Training Methodologies Supported

**Hypertrophy:** Project Invictus, Renaissance Periodization, Jeff Nippard Style, Hypertrophy Coach

**Strength:** 5/3/1 (Wendler), Juggernaut, RTS, Westside Barbell

**Bodybuilding:** Heavy Duty, Doggcrapp, PPL, Upper/Lower

**Performance:** Athletic Performance, Functional Strength, Hybrid Athlete

---

Built with ❤️ by the Athena AI team
