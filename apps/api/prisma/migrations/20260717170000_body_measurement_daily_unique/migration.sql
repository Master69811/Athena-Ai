-- DropIndex
DROP INDEX "body_measurements_userId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "body_measurements_userId_date_key" ON "body_measurements"("userId", "date");

