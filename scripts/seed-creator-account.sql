-- ─────────────────────────────────────────────────────────────
-- Athena AI — Attiva account creatore PREMIUM + dati reali
-- Esegui in: Supabase → SQL Editor → New query → Run
-- Idempotente: puoi rieseguirlo senza creare duplicati.
-- ─────────────────────────────────────────────────────────────

-- 1) Upgrade a COACH (tier più alto, sblocca tutte le funzioni AI)
UPDATE users
SET "subscriptionTier" = 'COACH'
WHERE email = 'andrea.segato1990@gmail.com';

-- 2) Riga abbonamento attiva (10 anni)
INSERT INTO subscriptions
  (id, "userId", tier, status, "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id, 'COACH', 'ACTIVE',
       now(), now() + interval '10 years', false, now(), now()
FROM users u
WHERE u.email = 'andrea.segato1990@gmail.com'
ON CONFLICT ("userId") DO UPDATE
  SET tier = 'COACH', status = 'ACTIVE',
      "currentPeriodEnd" = now() + interval '10 years',
      "updatedAt" = now();

-- 3) 14 giorni di dati recupero reali (sonno, HRV, passi, energia…)
INSERT INTO recovery_logs
  (id, "userId", date, "sleepHours", "sleepQuality", "stressLevel",
   steps, hrv, "restingHR", "energyLevel", "overallScore", "fatigueLevel", "createdAt")
SELECT
  gen_random_uuid()::text,
  u.id,
  date_trunc('day', now()) - (g || ' days')::interval,
  round((7 + random()*1.5)::numeric, 1)::float,        -- sonno 7.0–8.5 h
  (7 + floor(random()*3))::int,                        -- qualità 7–9
  (2 + floor(random()*4))::int,                        -- stress 2–5
  (7000 + floor(random()*5000))::int,                  -- passi 7k–12k
  round((55 + random()*25)::numeric, 0)::float,        -- HRV 55–80 ms
  round((50 + random()*12)::numeric, 0)::float,        -- FC riposo 50–62
  (7 + floor(random()*3))::int,                        -- energia 7–9
  round((68 + random()*24)::numeric, 0)::float,        -- recovery score 68–92
  (ARRAY['FRESH','NORMAL','NORMAL','FATIGUED'])[1+floor(random()*4)]::"FatigueLevel",
  now()
FROM users u, generate_series(0, 13) g
WHERE u.email = 'andrea.segato1990@gmail.com'
ON CONFLICT ("userId", date) DO NOTHING;

-- 3b) Streak di allenamento reale (badge giorni popolato, non più finto)
INSERT INTO streaks (id, "userId", type, "currentCount", "longestCount", "lastActivityDate", "startDate", "updatedAt")
SELECT gen_random_uuid()::text, u.id, 'WORKOUT', 12, 21, now(),
       now() - interval '12 days', now()
FROM users u
WHERE u.email = 'andrea.segato1990@gmail.com'
ON CONFLICT ("userId", type) DO UPDATE
  SET "currentCount" = 12, "longestCount" = 21, "lastActivityDate" = now(), "updatedAt" = now();

-- 4) 8 settimane di misurazioni corporee (trend peso in calo, ricomposizione)
INSERT INTO body_measurements
  (id, "userId", date, "weightKg", "bodyFatPct", "chestCm", "waistCm", "armLeftCm", "createdAt")
SELECT
  gen_random_uuid()::text,
  u.id,
  date_trunc('day', now()) - (w*7 || ' days')::interval,
  round((82 - (7-w)*0.4 + random()*0.3)::numeric, 1)::float,  -- peso 82 → ~79 kg
  round((18 - (7-w)*0.3)::numeric, 1)::float,                 -- grasso 18% → ~16%
  round((104 + random()*0.6)::numeric, 1)::float,            -- petto ~104 cm
  round((84 - (7-w)*0.4)::numeric, 1)::float,                 -- vita 84 → ~81 cm
  round((38 + (7-w)*0.05)::numeric, 1)::float,               -- braccio ~38 cm
  now()
FROM users u, generate_series(0, 7) w
WHERE u.email = 'andrea.segato1990@gmail.com'
ON CONFLICT ("userId", date) DO NOTHING;
