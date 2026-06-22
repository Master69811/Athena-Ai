import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import type { HealthKitPayload } from './api';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.StepCount,
    ],
    write: [],
  },
};

/** Ask the user for Health permissions. Resolves once the dialog is handled. */
export function initHealthKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err: string) => {
      if (err) reject(new Error(err));
      else resolve();
    });
  });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Window for "last night": from yesterday 18:00 to now. */
function lastNightWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// Sleep sample "value" strings that count as actually asleep.
const ASLEEP_STATES = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM']);

function getSleepHours(): Promise<number | undefined> {
  const { startDate, endDate } = lastNightWindow();
  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples({ startDate, endDate, limit: 200 } as any, (err: string, samples: any[]) => {
      if (err || !Array.isArray(samples) || samples.length === 0) return resolve(undefined);
      let ms = 0;
      for (const s of samples) {
        const v = String(s.value || '').toUpperCase();
        // Older iOS only reports INBED/ASLEEP; if no granular stages exist, fall back to ASLEEP/INBED.
        if (ASLEEP_STATES.has(v) || v === 'ASLEEP') {
          ms += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        }
      }
      if (ms === 0) {
        // Fallback: sum INBED if no asleep stages were recorded.
        for (const s of samples) {
          if (String(s.value || '').toUpperCase() === 'INBED') {
            ms += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
          }
        }
      }
      resolve(ms > 0 ? Math.round((ms / 3_600_000) * 10) / 10 : undefined);
    });
  });
}

function getHrvMs(): Promise<number | undefined> {
  const { startDate, endDate } = lastNightWindow();
  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateVariabilitySamples(
      { startDate, endDate, limit: 100 } as any,
      (err: string, samples: HealthValue[]) => {
        if (err || !Array.isArray(samples) || samples.length === 0) return resolve(undefined);
        const values = samples.map((s) => {
          // react-native-health returns SDNN in seconds; normalize to milliseconds.
          const v = s.value;
          return v < 1 ? v * 1000 : v;
        });
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        resolve(Math.round(avg));
      },
    );
  });
}

function getRestingHR(): Promise<number | undefined> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  return new Promise((resolve) => {
    // getRestingHeartRate returns the single most-recent value.
    AppleHealthKit.getRestingHeartRate(
      { startDate: startDate.toISOString(), endDate: new Date().toISOString() } as any,
      (err: string, result: HealthValue) => {
        if (err || !result || result.value == null) return resolve(undefined);
        resolve(Math.round(result.value));
      },
    );
  });
}

function getSteps(): Promise<number | undefined> {
  return new Promise((resolve) => {
    AppleHealthKit.getStepCount({ date: startOfToday().toISOString() } as any, (err: string, result: HealthValue) => {
      if (err || !result) return resolve(undefined);
      resolve(result.value != null ? Math.round(result.value) : undefined);
    });
  });
}

/** Read all relevant metrics and build the payload for the Athena API. */
export async function readTodayHealth(): Promise<HealthKitPayload> {
  const [sleepHours, hrv, restingHR, steps] = await Promise.all([
    getSleepHours(),
    getHrvMs(),
    getRestingHR(),
    getSteps(),
  ]);

  return {
    date: startOfToday().toISOString().slice(0, 10),
    sleepHours,
    hrv,
    restingHR,
    steps,
  };
}
