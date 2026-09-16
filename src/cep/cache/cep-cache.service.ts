import { Injectable } from '@nestjs/common';
import { CepResponseDto } from '../dto/cep-response.dto.js';

interface CacheEntry {
  data: CepResponseDto;
  expiresAt: number;
}

@Injectable()
export class CepCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24h

  get(cep: string): { data: CepResponseDto; stale: boolean } | null {
    const entry = this.cache.get(cep);
    if (!entry) return null;

    const stale = Date.now() > entry.expiresAt;
    return {
      data: { ...entry.data, cached: true },
      stale,
    };
  }

  set(cep: string, data: CepResponseDto): void {
    this.cache.set(cep, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
