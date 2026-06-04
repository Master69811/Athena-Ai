import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TrainerService } from './trainer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('trainer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainer')
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}
}
