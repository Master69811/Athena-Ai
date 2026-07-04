-- Add composite indexes for dashboard and workout history queries
CREATE INDEX idx_workout_plans_user_created ON workout_plans(user_id, created_at DESC);
CREATE INDEX idx_workout_days_plan_index ON workout_days(plan_id, day_index);
CREATE INDEX idx_workout_exercises_day_exercise ON workout_exercises(day_id, exercise_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);
CREATE INDEX idx_recovery_logs_user_created ON recovery_logs(user_id, created_at DESC);
