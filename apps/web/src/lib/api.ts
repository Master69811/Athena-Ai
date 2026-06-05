import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const userId = localStorage.getItem('userId');
        const refreshToken = localStorage.getItem('refreshToken');
        if (userId && refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { userId, refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

// Auth
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  getDashboard: () => api.get('/users/dashboard'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  completeOnboarding: (data: any) => api.post('/users/onboarding', data),
  addMeasurement: (data: any) => api.post('/users/measurements', data),
  getMeasurements: (limit?: number) => api.get('/users/measurements', { params: { limit } }),
};

// Workout Plans
export const workoutApi = {
  getActivePlan: () => api.get('/workout-plans/active'),
  getAllPlans: () => api.get('/workout-plans'),
  getPlan: (id: string) => api.get(`/workout-plans/${id}`),
  activatePlan: (id: string) => api.put(`/workout-plans/${id}/activate`),
  deletePlan: (id: string) => api.delete(`/workout-plans/${id}`),
  generateAI: () => api.post('/ai-workout/generate'),
};

// Sessions
export const sessionsApi = {
  start: (data: any) => api.post('/sessions/start', data),
  logSet: (sessionId: string, data: any) => api.post(`/sessions/${sessionId}/sets`, data),
  complete: (sessionId: string, data: any) => api.put(`/sessions/${sessionId}/complete`, data),
  getActive: () => api.get('/sessions/active'),
  getAll: (params?: any) => api.get('/sessions', { params }),
  getOne: (id: string) => api.get(`/sessions/${id}`),
  getSetRecommendation: (data: any) => api.post('/ai-workout/set-recommendation', data),
};

// Nutrition
export const nutritionApi = {
  getPlan: () => api.get('/nutrition/plan'),
  generatePlan: () => api.post('/nutrition/plan/generate'),
  logMeal: (data: any) => api.post('/nutrition/log', data),
  getDailyLog: (date: string) => api.get('/nutrition/log/daily', { params: { date } }),
  weeklyCheck: () => api.post('/nutrition/weekly-check'),
  searchFood: (q: string) => api.get('/nutrition/food/search', { params: { q } }),
};

// Recovery
export const recoveryApi = {
  log: (data: any) => api.post('/recovery/log', data),
  getLatest: () => api.get('/recovery/latest'),
  getHistory: (days?: number) => api.get('/recovery/history', { params: { days } }),
  getSnapshot: () => api.get('/recovery/snapshot'),
};

// AI Coach
export const coachApi = {
  chat: (data: any) => api.post('/ai-coach/chat', data),
  getConversations: () => api.get('/ai-coach/conversations'),
  getConversation: (id: string) => api.get(`/ai-coach/conversations/${id}`),
  getSuggestions: () => api.get('/ai-coach/suggestions'),
};

// Exercises
export const exercisesApi = {
  getAll: (params?: any) => api.get('/exercises', { params }),
  getOne: (id: string) => api.get(`/exercises/${id}`),
  getHistory: (id: string) => api.get(`/exercises/${id}/history`),
};

// Body Weight Engine
export const bodyWeightApi = {
  log: (data: { date: string; weightKg: number; notes?: string }) => api.post('/body-weight/log', data),
  getHistory: (days?: number) => api.get('/body-weight/history', { params: { days } }),
  getSnapshot: () => api.get('/body-weight/snapshot'),
};

// Nutrition Engine
export const nutritionEngineApi = {
  getDecisions: (params?: { limit?: number; unreadOnly?: boolean }) =>
    api.get('/nutrition-engine/decisions', { params }),
  getUnreadCount: () => api.get('/nutrition-engine/decisions/unread-count'),
  applyDecision: (id: string) => api.put(`/nutrition-engine/decisions/${id}/apply`),
  markRead: (id: string) => api.put(`/nutrition-engine/decisions/${id}/read`),
  markAllRead: () => api.put('/nutrition-engine/decisions/read-all'),
  run: () => api.post('/nutrition-engine/run'),
  getCompliance: () => api.get('/nutrition-engine/compliance'),
};

// Progression
export const progressionApi = {
  getHistory: (limit?: number) => api.get('/progression/history', { params: { limit } }),
  run: () => api.post('/progression/run'),
  getInsights: (params?: { limit?: number; unreadOnly?: boolean }) =>
    api.get('/progression/insights', { params }),
  getUnreadCount: () => api.get('/progression/insights/unread-count'),
  markRead: (id: string) => api.put(`/progression/insights/${id}/read`),
  markAllRead: () => api.put('/progression/insights/read-all'),
};
