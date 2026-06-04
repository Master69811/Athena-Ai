import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [measurements, firstMeasurement] = await Promise.all([
      this.prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 }),
      this.prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: 'asc' } }),
    ]);

    const latest = measurements[0];
    const weightChange = latest && firstMeasurement ? latest.weightKg - firstMeasurement.weightKg : 0;

    return {
      latest,
      weightChange: Math.round(weightChange * 10) / 10,
      measurements: measurements.reverse(),
    };
  }

  // Predictive AI: projects weight using linear regression on historical data
  async getPredictions(userId: string) {
    const measurements = await this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 60,
    });

    if (measurements.length < 3) {
      return { message: 'Not enough data for predictions. Log weight for at least 2 weeks.' };
    }

    // Linear regression on weight over time (days)
    const baseTime = measurements[0].date.getTime();
    const points = measurements.map((m) => ({
      x: (m.date.getTime() - baseTime) / (1000 * 60 * 60 * 24), // days
      y: m.weightKg,
    }));

    const n = points.length;
    const sumX = points.reduce((a, p) => a + p.x, 0);
    const sumY = points.reduce((a, p) => a + p.y, 0);
    const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
    const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const currentDay = points[points.length - 1].x;
    const project = (daysAhead: number) => Math.round((intercept + slope * (currentDay + daysAhead)) * 10) / 10;

    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const weeklyRate = Math.round(slope * 7 * 100) / 100;

    return {
      currentWeight: measurements[measurements.length - 1].weightKg,
      weeklyRate,
      predictions: [
        { timeframe: '4_WEEKS', predictedWeightKg: project(28), confidence: 0.85, assumptions: [`Trend attuale: ${weeklyRate}kg/settimana`] },
        { timeframe: '12_WEEKS', predictedWeightKg: project(84), confidence: 0.65, assumptions: ['Assume aderenza costante a dieta e allenamento'] },
        { timeframe: '24_WEEKS', predictedWeightKg: project(168), confidence: 0.45, assumptions: ['Proiezione a lungo termine, soggetta ad adattamenti metabolici'] },
      ],
      goal: profile?.goalType,
    };
  }

  async addProgressPhoto(userId: string, data: { url: string; type: string }) {
    return this.prisma.progressPhoto.create({ data: { userId, ...data } });
  }

  async getProgressPhotos(userId: string) {
    return this.prisma.progressPhoto.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }
}
