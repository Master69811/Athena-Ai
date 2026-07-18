import * as Notifications from 'expo-notifications';
import type { Readiness } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === 'granted';
}

const EMOJI: Record<Readiness['adaptation']['color'], string> = {
  green: '🟢',
  yellow: '🟡',
  orange: '🟠',
  red: '🔴',
};

/** Fire a local notification summarising today's training readiness. */
export async function notifyReadiness(readiness: Readiness): Promise<void> {
  if (!readiness?.hasData) return;
  const a = readiness.adaptation;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${EMOJI[a.color]} Recupero ${readiness.score}/100 — ${a.titleIt}`,
      body: a.detailIt,
    },
    trigger: null, // immediately
  });
}
