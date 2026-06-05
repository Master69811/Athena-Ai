import { RecoveryService } from './recovery.service';
import { FatigueLevel, RecoveryTrend, EngineAction, OverreachingRisk } from '@prisma/client';

function makeLogs(scores: number[]): { overallScore: number; date: Date }[] {
  return scores.map((s, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { overallScore: s, date: d };
  });
}

describe('RecoveryService', () => {
  let service: RecoveryService;

  beforeEach(() => {
    service = new RecoveryService({} as any);
  });

  // ─── calculateRecoveryScore ──────────────────────────────────────────────

  describe('calculateRecoveryScore', () => {
    it('returns FRESH for excellent recovery', () => {
      const result = service.calculateRecoveryScore({
        sleepHours: 8.5, sleepQuality: 9, stressLevel: 2, steps: 10000, hrv: 80, restingHR: 50, energyLevel: 9,
      });
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe(FatigueLevel.FRESH);
    });

    it('returns OVERTRAINED for severe under-recovery', () => {
      const result = service.calculateRecoveryScore({
        sleepHours: 4, sleepQuality: 2, stressLevel: 9, steps: 1000, hrv: 20, restingHR: 75, energyLevel: 2,
      });
      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe(FatigueLevel.OVERTRAINED);
    });

    it('returns a score between 0 and 100', () => {
      const result = service.calculateRecoveryScore({
        sleepHours: 6, sleepQuality: 5, stressLevel: 5, steps: 5000, energyLevel: 5,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.recommendation).toBeTruthy();
    });

    it('handles missing HRV gracefully', () => {
      const result = service.calculateRecoveryScore({
        sleepHours: 7.5, sleepQuality: 7, stressLevel: 4, steps: 8000, energyLevel: 7,
      });
      expect(result.score).toBeGreaterThan(0);
    });
  });

  // ─── computeRecoveryContext ──────────────────────────────────────────────

  describe('computeRecoveryContext', () => {
    it('returns hasEnoughData=false with fewer than 3 logs', () => {
      const ctx = service.computeRecoveryContext(makeLogs([80, 70]));
      expect(ctx.hasEnoughData).toBe(false);
      expect(ctx.engineAction).toBe(EngineAction.PROCEED);
      expect(ctx.trendDirection).toBe(RecoveryTrend.INSUFFICIENT_DATA);
    });

    it('returns PROCEED when avgScore >= 65', () => {
      const ctx = service.computeRecoveryContext(makeLogs([80, 75, 70, 72, 68, 71, 75]));
      expect(ctx.hasEnoughData).toBe(true);
      expect(ctx.engineAction).toBe(EngineAction.PROCEED);
      expect(ctx.overreachingRisk).toBe(OverreachingRisk.NONE);
    });

    it('returns CAUTION when avgScore is between 50 and 65', () => {
      const ctx = service.computeRecoveryContext(makeLogs([60, 55, 58, 62, 57, 60, 55]));
      expect(ctx.engineAction).toBe(EngineAction.CAUTION);
    });

    it('returns HOLD when avgScore < 50 (sparse low days)', () => {
      // Today=47 (low), yesterday=70 (ok) → consecutiveLowDays=1, avg≈48 < 50 → HOLD
      const ctx = service.computeRecoveryContext(makeLogs([47, 70, 42, 45, 40, 45, 48]));
      expect(ctx.engineAction).toBe(EngineAction.HOLD);
      expect(ctx.overreachingRisk).toBe(OverreachingRisk.MEDIUM);
    });

    it('returns DELOAD when avgScore < 35', () => {
      const ctx = service.computeRecoveryContext(makeLogs([30, 28, 32, 25, 30, 27, 31]));
      expect(ctx.engineAction).toBe(EngineAction.DELOAD);
      expect(ctx.overreachingRisk).toBe(OverreachingRisk.HIGH);
    });

    it('returns HOLD when exactly 3 consecutive days below 50', () => {
      // Days: [40, 42, 45, 75, 80, 70, 72] — newest first
      const ctx = service.computeRecoveryContext(makeLogs([40, 42, 45, 75, 80, 70, 72]));
      expect(ctx.consecutiveLowDays).toBe(3);
      expect(ctx.engineAction).toBe(EngineAction.HOLD);
    });

    it('returns DELOAD when 5 consecutive days below 50', () => {
      // Days: [40, 42, 45, 38, 44, 70, 72] — 5 consecutive low days
      const ctx = service.computeRecoveryContext(makeLogs([40, 42, 45, 38, 44, 70, 72]));
      expect(ctx.consecutiveLowDays).toBe(5);
      expect(ctx.engineAction).toBe(EngineAction.DELOAD);
    });

    it('detects IMPROVING trend when recent scores are higher', () => {
      // Index 0 = most recent (high), older scores are low
      const ctx = service.computeRecoveryContext(makeLogs([80, 75, 72, 60, 55, 50, 48]));
      expect(ctx.trendDirection).toBe(RecoveryTrend.IMPROVING);
    });

    it('detects DECLINING trend when recent scores are lower', () => {
      // Index 0 = most recent (low), older scores are high
      const ctx = service.computeRecoveryContext(makeLogs([48, 50, 55, 60, 72, 75, 80]));
      expect(ctx.trendDirection).toBe(RecoveryTrend.DECLINING);
    });

    it('includes a non-empty Italian summary', () => {
      const ctx = service.computeRecoveryContext(makeLogs([50, 45, 48, 52, 47, 46, 50]));
      expect(ctx.summary).toBeTruthy();
      expect(ctx.summary).toContain('/100');
    });

    it('avgScore7d matches computed average', () => {
      const scores = [70, 72, 68, 74, 71, 69, 73];
      const expected = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const ctx = service.computeRecoveryContext(makeLogs(scores));
      expect(ctx.avgScore7d).toBe(expected);
    });
  });
});
