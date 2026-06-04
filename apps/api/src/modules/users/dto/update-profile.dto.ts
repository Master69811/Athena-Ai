import { IsString, IsNumber, IsEnum, IsBoolean, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, GoalType, ExperienceLevel, TrainingMethodology, Equipment, WorkType } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(13) @Max(100) age?: number;
  @ApiPropertyOptional({ enum: Gender }) @IsEnum(Gender) @IsOptional() gender?: Gender;
  @ApiPropertyOptional() @IsNumber() @IsOptional() heightCm?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weightKg?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() bodyFatPercentage?: number;
  @ApiPropertyOptional({ enum: GoalType }) @IsEnum(GoalType) @IsOptional() goalType?: GoalType;
  @ApiPropertyOptional({ enum: ExperienceLevel }) @IsEnum(ExperienceLevel) @IsOptional() experienceLevel?: ExperienceLevel;
  @ApiPropertyOptional({ enum: TrainingMethodology }) @IsEnum(TrainingMethodology) @IsOptional() methodology?: TrainingMethodology;
  @ApiPropertyOptional() @IsNumber() @IsOptional() trainingDaysPerWeek?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sessionDurationMinutes?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasGym?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() equipment?: Equipment[];
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() injuries?: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(1) @Max(10) stressLevel?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sleepHoursAvg?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() dailyStepsAvg?: number;
  @ApiPropertyOptional({ enum: WorkType }) @IsEnum(WorkType) @IsOptional() workType?: WorkType;
  @ApiPropertyOptional() @IsString() @IsOptional() bio?: string;
}

export class CompleteOnboardingDto {
  @IsString() name: string;
  @IsNumber() age: number;
  @IsEnum(Gender) gender: Gender;
  @IsNumber() heightCm: number;
  @IsNumber() weightKg: number;
  @IsEnum(GoalType) goalType: GoalType;
  @IsEnum(ExperienceLevel) experienceLevel: ExperienceLevel;
  @IsEnum(TrainingMethodology) methodology: TrainingMethodology;
  @IsNumber() trainingDaysPerWeek: number;
  @IsNumber() sessionDurationMinutes: number;
  @IsBoolean() hasGym: boolean;
  @IsArray() equipment: Equipment[];
  @IsArray() injuries: string[];
  @IsNumber() stressLevel: number;
  @IsNumber() sleepHoursAvg: number;
  @IsNumber() dailyStepsAvg: number;
  @IsEnum(WorkType) workType: WorkType;
  @IsNumber() @IsOptional() bodyFatPercentage?: number;
}
