import axios from 'axios';
import Constants from 'expo-constants';
import { getToken } from './auth';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post('/auth/login', { email, password });
  // The web API wraps responses in { success, data }. Unwrap defensively.
  return (res.data?.data ?? res.data) as LoginResponse;
}

export interface HealthKitPayload {
  date: string;
  sleepHours?: number;
  hrv?: number;
  restingHR?: number;
  steps?: number;
}

export async function syncHealthKit(payload: HealthKitPayload) {
  const res = await api.post('/recovery/sync/healthkit', payload);
  return res.data?.data ?? res.data;
}
