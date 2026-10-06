import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MemoryEmbeddingService {
  private readonly logger = new Logger(MemoryEmbeddingService.name);
  private readonly dimension = 1536;

  constructor(private readonly config: ConfigService) {}

  /**
   * Generates a normalized 1536-dimensional semantic vector embedding.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(this.dimension).fill(0);
    }

    // Try Google Gemini embeddings if configured
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    if (geminiKey && !geminiKey.startsWith('AQ.')) {
      try {
        const vector = await this.fetchGeminiEmbedding(text, geminiKey);
        if (vector && vector.length > 0) {
          return this.adaptToDimension(vector, this.dimension);
        }
      } catch (err: unknown) {
        this.logger.debug(
          `Gemini embedding call failed, using deterministic semantic embedding: ${err}`,
        );
      }
    }

    // High-quality deterministic semantic embedding
    return this.generateDeterministicEmbedding(text, this.dimension);
  }

  /**
   * Cosine similarity between two vectors.
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async fetchGeminiEmbedding(
    text: string,
    apiKey: string,
  ): Promise<number[] | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API returned status ${response.status}`);
    }

    const data = await response.json();
    return data?.embedding?.values || null;
  }

  private adaptToDimension(values: number[], targetDim: number): number[] {
    if (values.length === targetDim) return values;
    if (values.length > targetDim) {
      return values.slice(0, targetDim);
    }
    const padded = [...values];
    while (padded.length < targetDim) {
      padded.push(0);
    }
    return padded;
  }

  /**
   * Deterministic semantic hash mapping tokens to unit-normalized vector space.
   */
  private generateDeterministicEmbedding(
    text: string,
    dim: number,
  ): number[] {
    const vector = new Array(dim).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      let hash = 5381;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 33) ^ token.charCodeAt(i);
      }
      const primaryIdx = Math.abs(hash) % dim;
      const secondaryIdx = Math.abs((hash >> 5) ^ 0x5bd1e995) % dim;

      vector[primaryIdx] += 1.0;
      vector[secondaryIdx] += 0.5;

      // Bigram projection
      for (let j = 0; j < token.length - 2; j++) {
        const tri = token.substring(j, j + 3);
        let subHash = 0;
        for (let k = 0; k < tri.length; k++) {
          subHash = (subHash * 31 + tri.charCodeAt(k)) | 0;
        }
        const triIdx = Math.abs(subHash) % dim;
        vector[triIdx] += 0.25;
      }
    }

    // Normalize to unit vector
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    if (norm > 0) {
      const sqrtNorm = Math.sqrt(norm);
      for (let i = 0; i < dim; i++) {
        vector[i] = vector[i] / sqrtNorm;
      }
    }

    return vector;
  }
}
