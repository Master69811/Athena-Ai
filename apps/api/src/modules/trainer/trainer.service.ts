import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainerService {
  constructor(private prisma: PrismaService) {}
}
