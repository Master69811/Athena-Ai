import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload sent by the native iOS app after reading Apple Health / Apple Watch data.
 * All metrics are OBJECTIVE (measured by the watch). The subjective fields that the
 * watch cannot measure (sleep quality, stress, energy) are estimated server-side from
 * these metrics when not provided — and can always be overridden manually by the user.
 */
export class SyncHealthKitDto {
  @ApiProperty({ example: '2026-06-22', description: 'ISO date (yyyy-mm-dd) the data refers to' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ example: 7.5, description: 'Total hours asleep last night (HealthKit SleepAnalysis)' })
  @IsNumber() @IsOptional() @Min(0) @Max(24)
  sleepHours?: number;

  @ApiPropertyOptional({ example: 62, description: 'Overnight HRV SDNN in milliseconds (HealthKit HeartRateVariability)' })
  @IsNumber() @IsOptional() @Min(0) @Max(400)
  hrv?: number;

  @ApiPropertyOptional({ example: 54, description: 'Resting heart rate in bpm (HealthKit RestingHeartRate)' })
  @IsNumber() @IsOptional() @Min(20) @Max(220)
  restingHR?: number;

  @ApiPropertyOptional({ example: 8200, description: 'Step count for the day (HealthKit StepCount)' })
  @IsNumber() @IsOptional() @Min(0)
  steps?: number;

  // Optional subjective overrides — if the user adjusts the sliders in the app.
  @ApiPropertyOptional({ example: 8, description: 'Subjective sleep quality 1-10 (optional override)' })
  @IsNumber() @IsOptional() @Min(1) @Max(10)
  sleepQuality?: number;

  @ApiPropertyOptional({ example: 4, description: 'Subjective stress level 1-10 (optional override)' })
  @IsNumber() @IsOptional() @Min(1) @Max(10)
  stressLevel?: number;

  @ApiPropertyOptional({ example: 7, description: 'Subjective energy level 1-10 (optional override)' })
  @IsNumber() @IsOptional() @Min(1) @Max(10)
  energyLevel?: number;

  @ApiPropertyOptional({ example: 'Synced from Apple Watch' })
  @IsString() @IsOptional()
  notes?: string;
}
