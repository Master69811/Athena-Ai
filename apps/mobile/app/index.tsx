import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../src/lib/api';
import { saveToken, getToken } from '../src/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Skip login if already authenticated.
  useEffect(() => {
    getToken().then((t) => {
      if (t) router.replace('/sync');
      else setChecking(false);
    });
  }, []);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res?.accessToken) throw new Error('no-token');
      await saveToken(res.accessToken);
      router.replace('/sync');
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 401 || status === 400 ? 'Email o password errati' : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Athena AI</Text>
        <Text style={styles.subtitle}>Collega il tuo Apple Watch</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accedi</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },
  center: { alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { color: '#fff', fontSize: 34, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#6b7280', fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 40 },
  input: {
    backgroundColor: '#111118',
    borderColor: '#1e1e2e',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 14,
  },
  error: { color: '#ef4444', marginBottom: 14, textAlign: 'center' },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
