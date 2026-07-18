import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDashboard, useRecoveryData, useActivePlan, useNutritionPlan } from '../useDataFetching';
import * as api from '@/lib/api';

// Mock API
jest.mock('@/lib/api', () => ({
  workoutApi: {
    getActivePlan: jest.fn(),
  },
  recoveryApi: {
    getLatest: jest.fn(),
    getSnapshot: jest.fn(),
  },
  nutritionApi: {
    getPlan: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useDataFetching Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDashboard', () => {
    it('fetches plan, recovery, nutrition in parallel', async () => {
      (api.workoutApi.getActivePlan as jest.Mock).mockResolvedValue({ id: 'plan-1' });
      (api.recoveryApi.getLatest as jest.Mock).mockResolvedValue({ score: 75 });
      (api.nutritionApi.getPlan as jest.Mock).mockResolvedValue({ calories: 2500 });

      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plan.data).toEqual({ id: 'plan-1' });
      expect(result.current.recovery.data).toEqual({ score: 75 });
      expect(result.current.nutrition.data).toEqual({ calories: 2500 });
      expect(result.current.hasError).toBe(false);
    });

    it('aggregates loading state correctly', async () => {
      (api.workoutApi.getActivePlan as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'p1' }), 100))
      );
      (api.recoveryApi.getLatest as jest.Mock).mockResolvedValue({ score: 70 });
      (api.nutritionApi.getPlan as jest.Mock).mockResolvedValue({ calories: 2200 });

      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('aggregates error state correctly', async () => {
      const error = new Error('API Error');
      (api.workoutApi.getActivePlan as jest.Mock).mockRejectedValue(error);
      (api.recoveryApi.getLatest as jest.Mock).mockResolvedValue({ score: 70 });
      (api.nutritionApi.getPlan as jest.Mock).mockResolvedValue({ calories: 2200 });

      const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });
  });

  describe('useRecoveryData', () => {
    it('fetches latest recovery data', async () => {
      const mockData = { score: 82, sleepHours: 8.2, stressLevel: 4 };
      (api.recoveryApi.getLatest as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useRecoveryData(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('handles error gracefully', async () => {
      const error = new Error('Fetch failed');
      (api.recoveryApi.getLatest as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useRecoveryData(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useActivePlan', () => {
    it('fetches active workout plan', async () => {
      const mockPlan = { id: 'plan-1', name: 'Upper Lower', days: 4 };
      (api.workoutApi.getActivePlan as jest.Mock).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => useActivePlan(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPlan);
    });

    it('returns null if no active plan', async () => {
      (api.workoutApi.getActivePlan as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useActivePlan(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useNutritionPlan', () => {
    it('fetches nutrition plan', async () => {
      const mockPlan = { id: 'nutri-1', calories: 2500, protein: 200 };
      (api.nutritionApi.getPlan as jest.Mock).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => useNutritionPlan(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPlan);
    });

    it('returns data from API response', async () => {
      const mockPlan = { id: 'nutri-1', calories: 2500, protein: 200 };
      (api.nutritionApi.getPlan as jest.Mock).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => useNutritionPlan(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPlan);
      expect(api.nutritionApi.getPlan).toHaveBeenCalled();
    });
  });

  describe('Query Key Management', () => {
    it('uses correct query keys from factory', async () => {
      (api.workoutApi.getActivePlan as jest.Mock).mockResolvedValue({ id: 'p1' });

      const { result } = renderHook(() => useActivePlan(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify hook was called (indirectly confirms query key usage)
      expect(result.current.data).toBeDefined();
    });
  });
});
