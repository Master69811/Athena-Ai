import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initHealthKit, readTodayHealth } from '../src/lib/healthkit';
import { syncHealthKit, type HealthKitPayload } from '../src/lib/api';
import { registerBackgroundSync } from '../src/lib/background-sync';
import { clearToken } from '../src/lib/auth';

type Status = 'init' | 'ready' | 'no-permission' | 'syncing';

export default function SyncScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('init');
  const [reading, setReading] = useState<HealthKitPayload | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initHealthKit();
        await registerBackgroundSync();
        setStatus('ready');
        await refresh();
      } catch {
        setStatus('no-permission');
      }
    })();
  }, []);

  async function refresh() {
    const data = await readTodayHealth();
    setReading(data);
  }

  async function handleSync() {
    setStatus('syncing');
    try {
      const data = await readTodayHealth();
      setReading(data);
      const res = await syncHealthKit(data);
      setScore(res?.score ?? null);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Recupero</Text>
          <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>Esci</Text></TouchableOpacity>
        </View>

        {score != null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>RECOVERY SCORE</Text>
            <Text style={styles.scoreValue}>{score}<Text style={styles.scoreMax}>/100</Text></Text>
            {lastSync && <Text style={styles.muted}>Ultimo sync: {lastSync}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Metric label="Sonno" value={reading?.sleepHours != null ? `${reading.sleepHours} h` : '—'} />
          <Metric label="HRV" value={reading?.hrv != null ? `${reading.hrv} ms` : '—'} />
          <Metric label="FC a riposo" value={reading?.restingHR != null ? `${reading.restingHR} bpm` : '—'} />
          <Metric label="Passi" value={reading?.steps != null ? `${reading.steps}` : '—'} last />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSync} disabled={status === 'syncing'} activeOpacity={0.85}>
          {status === 'syncing' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sincronizza ora</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>
          Athena sincronizza automaticamente i dati del tuo Apple Watch una volta al giorno in background.
          I valori di qualità sonno, stress ed energia vengono stimati dai dati dell'orologio.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
  scoreCard: {
    backgroundColor: '#111118', borderColor: '#1e1e2e', borderWidth: 1, borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  scoreLabel: { color: '#6b7280', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  scoreValue: { color: '#6366f1', fontSize: 56, fontWeight: '800', marginTop: 4 },
  scoreMax: { color: '#6b7280', fontSize: 24, fontWeight: '600' },
  card: {
    backgroundColor: '#111118', borderColor: '#1e1e2e', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 18, marginBottom: 16,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  metricBorder: { borderBottomColor: '#1e1e2e', borderBottomWidth: 1 },
  metricLabel: { color: '#9ca3af', fontSize: 15 },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  button: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { color: '#6b7280', fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
