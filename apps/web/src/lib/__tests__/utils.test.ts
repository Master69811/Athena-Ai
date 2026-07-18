import {
  cn,
  formatWeight,
  calculateBMI,
  estimate1RM,
  formatDuration,
  getGoalLabel,
  getMuscleGroupLabel,
  getRecoveryColor,
  getRecoveryLabel,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('dedupes conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('formatWeight', () => {
  it('defaults to kg', () => {
    expect(formatWeight(80)).toBe('80 kg');
  });
  it('converts to lbs with one decimal', () => {
    expect(formatWeight(100, 'lbs')).toBe('220.5 lbs');
  });
});

describe('calculateBMI', () => {
  it('computes BMI rounded to one decimal', () => {
    // 80kg / 1.80m^2 = 24.69 -> 24.7
    expect(calculateBMI(80, 180)).toBe(24.7);
  });
  it('handles a known round value', () => {
    // 64kg / 1.60m^2 = 25
    expect(calculateBMI(64, 160)).toBe(25);
  });
});

describe('estimate1RM (Epley)', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it('applies the Epley formula for multiple reps', () => {
    // 100 * (1 + 5/30) = 116.666 -> 116.7
    expect(estimate1RM(100, 5)).toBe(116.7);
  });
});

describe('formatDuration', () => {
  it('formats minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45m');
  });
  it('formats whole hours without minutes', () => {
    expect(formatDuration(120)).toBe('2h');
  });
  it('formats hours and minutes', () => {
    expect(formatDuration(95)).toBe('1h 35m');
  });
});

describe('label helpers', () => {
  it('maps known goal codes to Italian labels', () => {
    expect(getGoalLabel('HYPERTROPHY')).toBe('Ipertrofia');
  });
  it('falls back to the raw code for unknown goals', () => {
    expect(getGoalLabel('UNKNOWN')).toBe('UNKNOWN');
  });
  it('maps known muscle groups', () => {
    expect(getMuscleGroupLabel('CHEST')).toBe('Petto');
  });
  it('falls back to the raw muscle code', () => {
    expect(getMuscleGroupLabel('XYZ')).toBe('XYZ');
  });
});

describe('recovery score → color/label thresholds', () => {
  it.each([
    [95, '#10b981', 'Eccellente'],
    [80, '#10b981', 'Eccellente'],
    [70, '#6366f1', 'Buono'],
    [60, '#6366f1', 'Buono'],
    [50, '#f59e0b', 'Affaticato'],
    [40, '#f59e0b', 'Affaticato'],
    [30, '#ef4444', 'Sovrallenato'],
    [0, '#ef4444', 'Sovrallenato'],
  ])('score %i → %s / %s', (score, color, label) => {
    expect(getRecoveryColor(score)).toBe(color);
    expect(getRecoveryLabel(score)).toBe(label);
  });
});
