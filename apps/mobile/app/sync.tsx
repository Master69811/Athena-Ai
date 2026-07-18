import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initHealthKit, readTodayHealth, getActivityRings, type ActivityRings } from '../src/lib/healthkit';
import { syncHealthKit, getReadiness, type HealthKitPayload, type Readiness } from '../src/lib/api';
import { registerBackgroundSync } from '../src/lib/background-sync';
import { requestNotificationPermission, notifyReadiness } from '../src/lib/notifications';
import { clearToken } from '../src/lib/auth';

type Status = 'init' | 'ready' | 'no-permission' | 'syncing';

const READINESS_COLORS: Record<Readiness['adaptation']['color'], string> = {
  green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444',
};

export default function SyncScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('init');
  const [reading, setReading] = useState<HealthKitPayload | null>(null);
  const [rings, setRings] = useState<ActivityRings | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initHealthKit();
        await registerBackgroundSync();
        await requestNotificationPermission();
        setStatus('ready');
        await refresh();
      } catch {
        setStatus('no-permission');
      }
    })();
  }, []);

  async function refresh() {
    const [data, r] = await Promise.all([readTodayHealth(), getActivityRings()]);
    setReading(data);
    if (r) setRings(r);
    try { setReadiness(await getReadiness()); } catch { /* ignore */ }
  }

  async function handleSync() {
    setStatus('syncing');
    try {
      const [data, r] = await Promise.all([readTodayHealth(), getActivityRings()]);
      setReading(data);
      if (r) setRings(r);
      await syncHealthKit(data);
      const fresh = await getReadiness();
      setReadiness(fresh);
      await notifyReadiness(fresh);
      setLastSync(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      Alert.alert('Sync fallito', e?.response?.data?.message ?? 'Riprova tra poco.');
    } finally {
      setStatus('ready');
    }
  }

  async function handleLogout() {
    await clearToken();
    router.replace('/');
  }

  if (status === 'init') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#6366f1" />
        <Text style={styles.muted}>Connessione a Salute…</Text>
      </View>
    );
  }

  if (status === 'no-permission') {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.title}>Permesso negato</Text>
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
          Apri Impostazioni → Salute → Accesso e dispositivi → Athena AI e attiva tutte le categorie.
        </Text>
      </SafeAreaView>
    );
  }

  const rColor = readiness?.hasData ? READINESS_COLORS[readiness.adaptation.color] : '#6366f1';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Oggi</Text>
          <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>Esci</Text></TouchableOpacity>
        </View>

        {/* Readiness verdict */}
        {readiness?.hasData && (
          <View style={[styles.readinessCard, { borderColor: rColor + '55' }]}>
            <View style={styles.readinessHeader}>
              <View style={[styles.scoreDot, { backgroundColor: rColor }]}>
                <Text style={styles.scoreDotText}>{readiness.score}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.readinessLabel}>PRONTEZZA DI OGGI</Text>
                <Text style={[styles.readinessTitle, { color: rColor }]}>{readiness.adaptation.titleIt}</Text>
              </View>
            </View>
            <Text style={styles.readinessDetail}>{readiness.adaptation.detailIt}</Text>
            {readiness.adaptation.intensity !== 'full' && (
              <View style={styles.chips}>
                <Text style={styles.chip}>Volume {Math.round(readiness.adaptation.setMultiplier * 100)}%</Text>
                {readiness.adaptation.rpeAdjustment !== 0 && (
                  <Text style={styles.chip}>RPE {readiness.adaptation.rpeAdjustment > 0 ? '+' : ''}{readiness.adaptation.rpeAdjustment}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Activity rings */}
        {rings && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Anelli attività</Text>
            <Ring label="Movimento" value={rings.move} goal={rings.moveGoal} unit="kcal" color="#fa114f" />
            <Ring label="Esercizio" value={rings.exercise} goal={rings.exerciseGoal} unit="min" color="#92e82a" />
            <Ring label="In piedi" value={rings.stand} goal={rings.standGoal} unit="h" color="#00d4ff" last />
          </View>
        )}

        {/* Raw metrics */}
        <View style={styles.card}>
          <Metric label="Sonno" value={reading?.sleepHours != null ? `${reading.sleepHours} h` : '—'} />
          <Metric label="HRV" value={reading?.hrv != null ? `${reading.hrv} ms` : '—'} />
          <Metric label="FC a riposo" value={reading?.restingHR != null ? `${reading.restingHR} bpm` : '—'} />
          <Metric label="Passi" value={reading?.steps != null ? `${reading.steps}` : '—'} last />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSync} disabled={status === 'syncing'} activeOpacity={0.85}>
          {status === 'syncing' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sincronizza ora</Text>}
        </TouchableOpacity>
        {lastSync && <Text style={[styles.muted, { textAlign: 'center' }]}>Ultimo sync: {lastSync}</Text>}

        <Text style={styles.note}>
          Athena sincronizza i dati del tuo Apple Watch in background e ti avvisa con il
          consiglio di allenamento del giorno. Qualità sonno, stress ed energia sono stimati dai dati dell'orologio.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Ring({ label, value, goal, unit, color, last }: { label: string; value: number; goal: number; unit: string; color: string; last?: boolean }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View style={[styles.ringRow, !last && styles.metricBorder]}>
      <View style={{ flex: 1 }}>
        <View style={styles.ringTop}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.metricValue}>{value}<Text style={styles.ringGoal}>/{goal} {unit}</Text></Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function Metric({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metricRow, !last && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  logout: { color: '#6b7280', fontSize: 15 },
  muted: { color: '#6b7280', fontSize: 13, marginTop: 8 },

  readinessCard: { backgroundColor: '#111118', borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16 },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreDot: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  scoreDotText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  readinessLabel: { color: '#6b7280', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  readinessTitle: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  readinessDetail: { color: '#9ca3af', fontSize: 13, lineHeight: 19, marginTop: 12 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { color: '#d1d5db', fontSize: 12, fontWeight: '600', backgroundColor: '#1e1e2e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },

  card: { backgroundColor: '#111118', borderColor: '#1e1e2e', borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, paddingTop: 6, marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', paddingTop: 14, paddingBottom: 4 },

  ringRow: { paddingVertical: 14 },
  ringTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ringGoal: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#1e1e2e', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  metricBorder: { borderBottomColor: '#1e1e2e', borderBottomWidth: 1 },
  metricLabel: { color: '#9ca3af', fontSize: 15 },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '700' },

  button: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { color: '#6b7280', fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
