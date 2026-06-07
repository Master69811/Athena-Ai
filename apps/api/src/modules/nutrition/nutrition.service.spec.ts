import { NutritionService } from './nutrition.service';

describe('NutritionService', () => {
  let service: NutritionService;

  beforeEach(() => {
    service = new NutritionService({} as any);
  });

  describe('calculateTDEE', () => {
    it('calculates TDEE for a male correctly (Mifflin-St Jeor)', () => {
      const tdee = service.calculateTDEE({
        weightKg: 80, heightCm: 180, age: 30, gender: 'MALE', workType: 'MODERATE' as any,
      });
      // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; *1.55 = 2759
      expect(tdee).toBe(2759);
    });

    it('calculates TDEE for a female correctly', () => {
      const tdee = service.calculateTDEE({
        weightKg: 60, heightCm: 165, age: 28, gender: 'FEMALE', workType: 'LIGHT' as any,
      });
      // BMR = 10*60 + 6.25*165 - 5*28 - 161 = 1330.25; *1.375 = 1829
      expect(tdee).toBe(1829);
    });

    it('applies sedentary multiplier', () => {
      const tdee = service.calculateTDEE({
        weightKg: 70, heightCm: 175, age: 25, gender: 'MALE', workType: 'SEDENTARY' as any,
      });
      // BMR = 10*70 + 6.25*175 - 5*25 + 5 = 1673.75; *1.2 = 2009
      expect(tdee).toBe(2009);
    });
  });

  describe('calculateMacros', () => {
    it('respects protein floor of 1.8g/kg bodyweight', () => {
      const macros = service.calculateMacros(2000, 'WEIGHT_LOSS' as any, 90);
      // floor = 90 * 1.8 = 162g
      expect(macros.proteinG).toBeGreaterThanOrEqual(162);
    });

    it('allocates higher carbs for hypertrophy', () => {
      const macros = service.calculateMacros(3000, 'HYPERTROPHY' as any, 80);
      expect(macros.carbsG).toBeGreaterThan(macros.proteinG);
      expect(macros.fatG).toBeGreaterThan(0);
    });
  });
});
