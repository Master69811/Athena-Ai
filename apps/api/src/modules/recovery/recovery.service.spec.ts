import { RecoveryService } from './recovery.service';
import { FatigueLevel } from '@prisma/client';

describe('RecoveryService', () => {
  let service: RecoveryService;

  beforeEach(() => {
    service = new RecoveryService({} as any);
  });

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
});
