import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION = 'athena_knowledge';
const VECTOR_SIZE = 768; // text-embedding-004 dimensions
const TOP_K = 5;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000;
const RETRY_DELAYS = [100, 300, 900];

export interface KnowledgeChunk {
  id: string;
  text: string;
  source: string;
  category: string;
  score?: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private qdrant: QdrantClient;
  private genAI: GoogleGenerativeAI;
  private initialized = false;
  private circuitBreaker = { failures: 0, open: false, nextResetAt: 0 };

  constructor(private config: ConfigService) {
    this.qdrant = new QdrantClient({
      url: config.get('QDRANT_URL', 'http://localhost:6333'),
      apiKey: config.get('QDRANT_API_KEY') || undefined,
    });
    this.genAI = new GoogleGenerativeAI(config.get('GEMINI_API_KEY', ''));
  }

  private async ensureCollection() {
    if (this.initialized) return;
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);
      if (!exists) {
        await this.qdrant.createCollection(COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Qdrant collection "${COLLECTION}" created`);
      }
      this.initialized = true;
      this.resetCircuitBreaker();
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordFailure() {
    this.circuitBreaker.failures++;
    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.open = true;
      this.circuitBreaker.nextResetAt = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      this.logger.warn(
        `RAG circuit breaker OPEN after ${this.circuitBreaker.failures} failures. ` +
        `Skipping RAG queries for 60s.`
      );
    }
  }

  private resetCircuitBreaker() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.open = false;
  }

  private checkCircuitBreaker() {
    if (!this.circuitBreaker.open) return false;
    if (Date.now() >= this.circuitBreaker.nextResetAt) {
      this.logger.log('RAG circuit breaker CLOSED. Attempting re-connection.');
      this.circuitBreaker.open = false;
      this.circuitBreaker.failures = 0;
      return false;
    }
    return true;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          this.logger.debug(`${context} failed (attempt ${attempt + 1}), retrying in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
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
    if (this.checkCircuitBreaker()) {
      throw new Error('RAG circuit breaker is open. Cannot ingest at this time.');
    }
    try {
      await this.retryWithBackoff(() => this.ensureCollection(), 'RAG init for ingest');
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

      await this.retryWithBackoff(
        () =>
          this.qdrant.upsert(COLLECTION, {
            wait: true,
            points: points.map((p) => ({ ...p, id: Math.abs(this.hashStr(p.id)) })),
          }),
        'RAG ingest'
      );

      this.logger.log(`Ingested ${chunks.length} chunks from "${source}"`);
      return chunks.length;
    } catch (err) {
      this.recordFailure();
      this.logger.error(`RAG ingest failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /** Retrieve top-k most relevant chunks for a query. */
  async retrieve(query: string): Promise<KnowledgeChunk[]> {
    if (this.checkCircuitBreaker()) {
      this.logger.debug('RAG circuit breaker is open, skipping query');
      return [];
    }
    try {
      await this.retryWithBackoff(() => this.ensureCollection(), 'RAG init');
      const vector = await this.embed(query);
      const results = await this.retryWithBackoff(
        () =>
          this.qdrant.search(COLLECTION, {
            vector,
            limit: TOP_K,
            with_payload: true,
            score_threshold: 0.4,
          }),
        'RAG search'
      );
      return results.map((r) => ({
        id: String(r.id),
        text: r.payload?.text as string,
        source: r.payload?.source as string,
        category: r.payload?.category as string,
        score: r.score,
      }));
    } catch (err) {
      this.recordFailure();
      this.logger.error(`RAG retrieve failed: ${(err as Error).message}`);
      return [];
    }
  }

  /** List all distinct sources in the knowledge base. */
  async listSources(): Promise<string[]> {
    if (this.checkCircuitBreaker()) {
      return [];
    }
    try {
      await this.retryWithBackoff(() => this.ensureCollection(), 'RAG init for listSources');
      const result = await this.retryWithBackoff(
        () =>
          this.qdrant.scroll(COLLECTION, {
            limit: 1000,
            with_payload: ['source'],
          }),
        'RAG listSources'
      );
      const sources = new Set(result.points.map((p) => p.payload?.source as string).filter(Boolean));
      return [...sources];
    } catch (err) {
      this.recordFailure();
      this.logger.error(`RAG listSources failed: ${(err as Error).message}`);
      return [];
    }
  }

  /** Delete all chunks from a specific source. */
  async deleteSource(source: string): Promise<void> {
    if (this.checkCircuitBreaker()) {
      throw new Error('RAG circuit breaker is open. Cannot delete at this time.');
    }
    try {
      await this.retryWithBackoff(() => this.ensureCollection(), 'RAG init for deleteSource');
      await this.retryWithBackoff(
        () =>
          this.qdrant.delete(COLLECTION, {
            filter: { must: [{ key: 'source', match: { value: source } }] },
          }),
        'RAG deleteSource'
      );
    } catch (err) {
      this.recordFailure();
      this.logger.error(`RAG deleteSource failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
  }
}
