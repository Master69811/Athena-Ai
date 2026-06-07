import { ProgressionService } from './progression.service';

describe('ProgressionService', () => {
  let service: ProgressionService;

  beforeEach(() => {
    service = new ProgressionService({} as any);
  });

  describe('makeProgressionDecision', () => {
    const planExercise = { rpeTarget: 8, repsMin: 6, repsMax: 10 };

    it('increases weight when RPE is below target with max reps', () => {
      const sets = Array(5).fill({ rpe: 7, reps: 10, weightKg: 80, completedAt: new Date() });
      const decision = (service as any).makeProgressionDecision(sets, planExercise);
      expect(decision.action).toBe('INCREASE_WEIGHT');
      expect(decision.newWeight).toBeGreaterThan(decision.oldWeight);
    });

    it('decreases weight when RPE exceeds target significantly', () => {
      const sets = Array(5).fill({ rpe: 10, reps: 6, weightKg: 100, completedAt: new Date() });
      const decision = (service as any).makeProgressionDecision(sets, planExercise);
      expect(decision.action).toBe('DECREASE_WEIGHT');
      expect(decision.newWeight).toBeLessThan(decision.oldWeight);
    });

    it('maintains when progressing within target zone', () => {
      const sets = Array(5).fill({ rpe: 8, reps: 8, weightKg: 90, completedAt: new Date() });
      const decision = (service as any).makeProgressionDecision(sets, planExercise);
      expect(['MAINTAIN', 'CHANGE_EXERCISE']).toContain(decision.action);
    });
  });

  describe('isStagnating', () => {
    it('detects stagnation when volume variance is under 3%', () => {
      const result = (service as any).isStagnating([10000, 10100, 10050]);
      expect(result).toBe(true);
    });

    it('does not flag growing volume as stagnation', () => {
      const result = (service as any).isStagnating([10000, 11000, 12500]);
      expect(result).toBe(false);
    });
  });
});
