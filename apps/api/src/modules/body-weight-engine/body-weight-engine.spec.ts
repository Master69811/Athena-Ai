import { BodyWeightEngineService } from './body-weight-engine.service';
import { WeightTrend } from '@prisma/client';

function makeEntries(weights: number[]): { weightKg: number; date: Date }[] {
  return weights.map((w, i) => {
    const d = new Date('2026-01-01');
    d.setDate(d.getDate() + i);
    return { weightKg: w, date: d };
  });
}

describe('BodyWeightEngineService', () => {
  let service: BodyWeightEngineService;

  beforeEach(() => {
    service = new BodyWeightEngineService({} as any);
  });

  // ─── computeMovingAverage ────────────────────────────────────────────────

  describe('computeMovingAverage', () => {
    it('returns null when fewer entries than window', () => {
      expect(service.computeMovingAverage([70, 71], 7)).toBeNull();
    });

    it('computes correct 7-day average', () => {
      const weights = [70, 71, 72, 70, 71, 72, 70];
      const expected = weights.reduce((a, b) => a + b, 0) / 7;
      expect(service.computeMovingAverage(weights, 7)).toBeCloseTo(expected);
    });

    it('uses only the last N entries when array is longer', () => {
      const weights = [80, 80, 80, 70, 71, 72, 70, 71, 72, 70];
      const last7 = weights.slice(-7);
      const expected = last7.reduce((a, b) => a + b, 0) / 7;
      expect(service.computeMovingAverage(weights, 7)).toBeCloseTo(expected);
    });
  });

  // ─── linearRegression ────────────────────────────────────────────────────

  describe('linearRegression', () => {
    it('returns null for fewer than 2 points', () => {
      expect(service.linearRegression([{ x: 0, y: 70 }])).toBeNull();
    });

    it('computes slope of -0.1 kg/day for perfectly linear declining data', () => {
      const points = Array.from({ length: 7 }, (_, i) => ({ x: i, y: 70 - i * 0.1 }));
      const result = service.linearRegression(points);
      expect(result).not.toBeNull();
      expect(result!.slope).toBeCloseTo(-0.1, 5);
    });

    it('returns R² close to 1 for perfect linear data', () => {
      const points = Array.from({ length: 7 }, (_, i) => ({ x: i, y: 70 - i * 0.1 }));
      const result = service.linearRegression(points);
      expect(result!.r2).toBeGreaterThan(0.99);
    });

    it('returns R² close to 0 for flat noisy data', () => {
      const points = [
        { x: 0, y: 70 }, { x: 1, y: 72 }, { x: 2, y: 68 },
        { x: 3, y: 73 }, { x: 4, y: 67 }, { x: 5, y: 74 }, { x: 6, y: 66 },
      ];
      const result = service.linearRegression(points);
      expect(result!.r2).toBeLessThan(0.5);
    });
  });

  // ─── detectTrend ─────────────────────────────────────────────────────────

  describe('detectTrend', () => {
    it.each([
      [-1.0, WeightTrend.LOSING_FAST],
      [-0.5, WeightTrend.LOSING_ON_TRACK],
      [-0.1, WeightTrend.STABLE],
      [0.0, WeightTrend.STABLE],
      [0.2, WeightTrend.GAINING_ON_TRACK],
      [0.6, WeightTrend.GAINING_FAST],
    ])('rate %dkg/week → %s', (rate, expected) => {
      expect(service.detectTrend(rate)).toBe(expected);
    });
  });

  // ─── computeWeightContext ─────────────────────────────────────────────────

  describe('computeWeightContext', () => {
    it('returns hasEnoughData=false with fewer than 3 entries', () => {
      const ctx = service.computeWeightContext(makeEntries([70, 71]));
      expect(ctx.hasEnoughData).toBe(false);
      expect(ctx.trendDirection).toBe(WeightTrend.INSUFFICIENT_DATA);
    });

    it('computes correct MA and weekly rate for declining data', () => {
      // 14 entries, losing exactly 0.1 kg/day = 0.7 kg/week
      const entries = Array.from({ length: 14 }, (_, i) => {
        const d = new Date('2026-01-01');
        d.setDate(d.getDate() + i);
        return { weightKg: 80 - i * 0.1, date: d };
      });
      const ctx = service.computeWeightContext(entries);
      expect(ctx.hasEnoughData).toBe(true);
      expect(ctx.weeklyRateKg).toBeCloseTo(-0.7, 1);
      expect(ctx.trendDirection).toBe(WeightTrend.LOSING_ON_TRACK);
    });

    it('computes predictions when R² is high', () => {
      const entries = Array.from({ length: 14 }, (_, i) => {
        const d = new Date('2026-01-01');
        d.setDate(d.getDate() + i);
        return { weightKg: 80 - i * 0.1, date: d };
      });
      const ctx = service.computeWeightContext(entries);
      expect(ctx.pred4wKg).not.toBeNull();
      expect(ctx.pred12wKg).not.toBeNull();
      // After 28 more days at -0.1/day: 80 - 13*0.1 - 28*0.1 = 80 - 4.1 ≈ 75.9
      expect(ctx.pred4wKg!).toBeCloseTo(80 - 13 * 0.1 - 28 * 0.1, 0);
    });

    it('detects STABLE trend for flat weight', () => {
      const entries = Array.from({ length: 14 }, (_, i) => {
        const d = new Date('2026-01-01');
        d.setDate(d.getDate() + i);
        return { weightKg: 75, date: d };
      });
      const ctx = service.computeWeightContext(entries);
      expect(ctx.weeklyRateKg).toBeCloseTo(0, 2);
      expect(ctx.trendDirection).toBe(WeightTrend.STABLE);
    });
  });
});
