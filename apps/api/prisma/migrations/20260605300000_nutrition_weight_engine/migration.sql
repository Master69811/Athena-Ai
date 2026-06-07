-- CreateEnum: Weight & Nutrition Engine enums
CREATE TYPE "WeightTrend"           AS ENUM ('LOSING_FAST','LOSING_ON_TRACK','STABLE','GAINING_ON_TRACK','GAINING_FAST','INSUFFICIENT_DATA');
CREATE TYPE "NutritionDecisionType" AS ENUM ('CALORIE_DECREASE','CALORIE_INCREASE','MAINTAIN');

-- CreateTable: BodyWeightEntry
CREATE TABLE "body_weight_entries" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "weightKg"  DOUBLE PRECISION NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "body_weight_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "body_weight_entries_userId_date_key" ON "body_weight_entries"("userId", "date");
CREATE INDEX "body_weight_entries_userId_date_idx"       ON "body_weight_entries"("userId", "date");

ALTER TABLE "body_weight_entries"
  ADD CONSTRAINT "body_weight_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: BodyWeightSnapshot
CREATE TABLE "body_weight_snapshots" (
  "id"              TEXT             NOT NULL,
  "userId"          TEXT             NOT NULL,
  "ma7d"            DOUBLE PRECISION NOT NULL,
  "ma14d"           DOUBLE PRECISION NOT NULL,
  "weeklyRateKg"    DOUBLE PRECISION NOT NULL,
  "trendDirection"  "WeightTrend"    NOT NULL,
  "logCount"        INTEGER          NOT NULL,
  "pred4wKg"        DOUBLE PRECISION,
  "pred12wKg"       DOUBLE PRECISION,
  "confidenceScore" DOUBLE PRECISION,
  "computedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "body_weight_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "body_weight_snapshots_userId_computedAt_idx" ON "body_weight_snapshots"("userId", "computedAt");

ALTER TABLE "body_weight_snapshots"
  ADD CONSTRAINT "body_weight_snapshots_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: NutritionDecision
CREATE TABLE "nutrition_decisions" (
  "id"           TEXT                    NOT NULL,
  "userId"       TEXT                    NOT NULL,
  "planId"       TEXT,
  "type"         "NutritionDecisionType" NOT NULL,
  "deltaCalories" DOUBLE PRECISION       NOT NULL,
  "rationale"    TEXT                    NOT NULL,
  "evidenceData" JSONB                   NOT NULL,
  "isApplied"    BOOLEAN                 NOT NULL DEFAULT false,
  "appliedAt"    TIMESTAMP(3),
  "isRead"       BOOLEAN                 NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "nutrition_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nutrition_decisions_userId_isApplied_idx" ON "nutrition_decisions"("userId", "isApplied");
CREATE INDEX "nutrition_decisions_userId_createdAt_idx" ON "nutrition_decisions"("userId", "createdAt");

ALTER TABLE "nutrition_decisions"
  ADD CONSTRAINT "nutrition_decisions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutrition_decisions"
  ADD CONSTRAINT "nutrition_decisions_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "nutrition_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
