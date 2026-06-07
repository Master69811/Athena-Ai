-- Add isRead and evidenceData to AIProgressionDecision
ALTER TABLE "ai_progression_decisions" ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_progression_decisions" ADD COLUMN "evidenceData" JSONB;

-- Add FK constraint for exerciseId (was a plain string before)
ALTER TABLE "ai_progression_decisions"
  ADD CONSTRAINT "ai_progression_decisions_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for efficient unread-count queries
CREATE INDEX "ai_progression_decisions_userId_isRead_idx"
  ON "ai_progression_decisions"("userId", "isRead");
