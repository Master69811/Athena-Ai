import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { workoutApi, recoveryApi, nutritionApi } from '@/lib/api';

// Pre-configured hooks to reduce boilerplate and ensure consistency
// Note: userId is derived from auth context in API calls (via header)
export function useDashboard() {
  const plan = useQuery({
    queryKey: queryKeys.workoutPlans.active('current'),
    queryFn: () => workoutApi.getActivePlan(),
  });

  const recovery = useQuery({
    queryKey: queryKeys.recovery.latest('current'),
    queryFn: () => recoveryApi.getLatest(),
  });

  const nutrition = useQuery({
    queryKey: queryKeys.nutrition.plan('current'),
    queryFn: () => nutritionApi.getPlan(),
  });

  const isLoading = plan.isLoading || recovery.isLoading || nutrition.isLoading;
  const hasError = plan.isError || recovery.isError || nutrition.isError;

  return { plan, recovery, nutrition, isLoading, hasError };
}

export function useRecoveryData() {
  return useQuery({
    queryKey: queryKeys.recovery.latest('current'),
    queryFn: () => recoveryApi.getLatest(),
  });
}

export function useRecoverySnapshot() {
  return useQuery({
    queryKey: queryKeys.recovery.snapshot('current'),
    queryFn: () => recoveryApi.getSnapshot(),
  });
}

export function useActivePlan() {
  return useQuery({
    queryKey: queryKeys.workoutPlans.active('current'),
    queryFn: () => workoutApi.getActivePlan(),
  });
}

export function useNutritionPlan() {
  return useQuery({
    queryKey: queryKeys.nutrition.plan('current'),
    queryFn: () => nutritionApi.getPlan(),
  });
}
