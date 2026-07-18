import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, MinLength } from 'class-validator';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class IngestDto {
  @IsString() @MinLength(10)
  text: string;

  @IsString()
  source: string;

  @IsEnum(['allenamento', 'nutrizione', 'recupero', 'metodologia', 'generale'])
  category: string;
}

@ApiTags('rag')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a knowledge document into Qdrant' })
  async ingest(@Body() body: IngestDto) {
    const chunks = await this.ragService.ingest(body.text, body.source, body.category);
    return { message: `Ingested ${chunks} chunks from "${body.source}"`, chunks };
  }

  @Get('sources')
  @ApiOperation({ summary: 'List all knowledge sources in the vector store' })
  async listSources() {
    const sources = await this.ragService.listSources();
    return { sources };
  }

  @Delete('sources/:source')
  @ApiOperation({ summary: 'Delete all chunks from a knowledge source' })
  async deleteSource(@Param('source') source: string) {
    await this.ragService.deleteSource(source);
    return { message: `Source "${source}" deleted from knowledge base` };
  }
}
