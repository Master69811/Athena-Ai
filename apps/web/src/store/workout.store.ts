import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkoutSet {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
  isWarmup: boolean;
  notes?: string;
}

interface WorkoutStore {
  activeSessionId: string | null;
  currentExerciseIndex: number;
  sets: WorkoutSet[];
  startTime: Date | null;
  isResting: boolean;
  restSeconds: number;

  startSession: (sessionId: string) => void;
  addSet: (set: WorkoutSet) => void;
  nextExercise: () => void;
  setResting: (isResting: boolean, seconds?: number) => void;
  endSession: () => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      activeSessionId: null,
      currentExerciseIndex: 0,
      sets: [],
      startTime: null,
      isResting: false,
      restSeconds: 0,

      startSession: (sessionId) =>
        set({ activeSessionId: sessionId, startTime: new Date(), currentExerciseIndex: 0, sets: [] }),

      addSet: (newSet) => set((state) => ({ sets: [...state.sets, newSet] })),

      nextExercise: () =>
        set((state) => ({ currentExerciseIndex: state.currentExerciseIndex + 1 })),

      setResting: (isResting, seconds = 90) => set({ isResting, restSeconds: seconds }),

      endSession: () =>
        set({ activeSessionId: null, currentExerciseIndex: 0, sets: [], startTime: null, isResting: false }),
    }),
    {
      name: 'athena-workout',
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        currentExerciseIndex: state.currentExerciseIndex,
        sets: state.sets,
        startTime: state.startTime,
      }),
    },
  ),
);
