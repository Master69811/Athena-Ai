import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { readTodayHealth } from './healthkit';
import { syncHealthKit } from './api';
import { getToken } from './auth';

export const HEALTH_SYNC_TASK = 'athena-health-sync';

// Define the background task once at module load.
TaskManager.defineTask(HEALTH_SYNC_TASK, async () => {
  try {
    const token = await getToken();
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const payload = await readTodayHealth();
    await syncHealthKit(payload);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/** Register the daily background sync. iOS decides the exact timing. */
export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    return;
  }
  const already = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
  if (already) return;

  await BackgroundFetch.registerTaskAsync(HEALTH_SYNC_TASK, {
    minimumInterval: 60 * 60 * 6, // ~ every 6 hours (iOS throttles to once/day in practice)
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
