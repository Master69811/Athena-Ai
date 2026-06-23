import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION = 'athena_knowledge';
const VECTOR_SIZE = 768; // text-embedding-004 dimensions
const TOP_K = 5;

export interface KnowledgeChunk {
  id: string;
  text: string;
  source: string;
  category: string;
  score?: number;
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private qdrant: QdrantClient;
  private genAI: GoogleGenerativeAI;

  constructor(private config: ConfigService) {
    this.qdrant = new QdrantClient({
      url: config.get('QDRANT_URL', 'http://localhost:6333'),
    });
    this.genAI = new GoogleGenerativeAI(config.get('GEMINI_API_KEY', ''));
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);
      if (!exists) {
        await this.qdrant.createCollection(COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Qdrant collection "${COLLECTION}" created`);
      }
    } catch (err) {
      this.logger.warn(`Qdrant not reachable at startup — RAG disabled: ${(err as Error).message}`);
    }
  }

  private async embed(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /** Split text into overlapping chunks for ingestion. */
  private chunkText(text: string, size = 500, overlap = 80): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let i = 0;
    while (i < words.length) {
      chunks.push(words.slice(i, i + size).join(' '));
      i += size - overlap;
    }
    return chunks;
  }

  /** Ingest a document (text) into Qdrant with metadata. */
  async ingest(text: string, source: string, category: string): Promise<number> {
    const chunks = this.chunkText(text);
    const points = await Promise.all(
      chunks.map(async (chunk, i) => {
        const vector = await this.embed(chunk);
        return {
          id: `${Date.now()}-${i}`,
          vector,
          payload: { text: chunk, source, category, chunk_index: i },
        };
      }),
    );

    await this.qdrant.upsert(COLLECTION, {
      wait: true,
      points: points.map((p) => ({ ...p, id: Math.abs(this.hashStr(p.id)) })),
    });

    this.logger.log(`Ingested ${chunks.length} chunks from "${source}"`);
    return chunks.length;
  }

  /** Retrieve top-k most relevant chunks for a query. */
  async retrieve(query: string): Promise<KnowledgeChunk[]> {
    try {
      const vector = await this.embed(query);
      const results = await this.qdrant.search(COLLECTION, {
        vector,
        limit: TOP_K,
        with_payload: true,
        score_threshold: 0.4,
      });
      return results.map((r) => ({
        id: String(r.id),
        text: r.payload?.text as string,
        source: r.payload?.source as string,
        category: r.payload?.category as string,
        score: r.score,
      }));
    } catch {
      return [];
    }
  }

  /** List all distinct sources in the knowledge base. */
  async listSources(): Promise<string[]> {
    try {
      const result = await this.qdrant.scroll(COLLECTION, {
        limit: 1000,
        with_payload: ['source'],
      });
      const sources = new Set(result.points.map((p) => p.payload?.source as string).filter(Boolean));
      return [...sources];
    } catch {
      return [];
    }
  }

  /** Delete all chunks from a specific source. */
  async deleteSource(source: string): Promise<void> {
    await this.qdrant.delete(COLLECTION, {
      filter: { must: [{ key: 'source', match: { value: source } }] },
    });
  }

  private hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
  }
}
