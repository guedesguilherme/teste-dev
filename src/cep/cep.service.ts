import { Injectable, Logger } from '@nestjs/common';
import { CepResponseDto } from './dto/cep-response.dto.js';
import { ProviderSelector } from './providers/provider-selector.js';
import { CircuitBreaker } from './circuit-breaker/circuit-breaker.js';
import { CepCacheService } from './cache/cep-cache.service.js';
import {
  CepNotFoundError,
  AllProvidersFailedError,
  ProviderAttempt,
} from './errors/cep.errors.js';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);

  constructor(
    private readonly providerSelector: ProviderSelector,
    private readonly cache: CepCacheService,
    private readonly circuitBreaker: CircuitBreaker,
  ) {}

  async findByCep(cep: string, correlationId?: string): Promise<CepResponseDto> {
    const cached = this.cache.get(cep);
    if (cached && !cached.stale) {
      this.logger.log('Cache hit (fresh)', { cep, correlationId });
      return cached.data;
    }

    const providers = this.providerSelector.getOrdered();
    const attempts: ProviderAttempt[] = [];

    for (const provider of providers) {
      if (!this.circuitBreaker.canExecute(provider.name)) {
        attempts.push({ provider: provider.name, reason: 'circuit_open' });
        continue;
      }

      const start = Date.now();
      try {
        const result = await provider.fetch(cep);

        this.circuitBreaker.recordSuccess(provider.name);
        this.cache.set(cep, result);
        this.logger.log('Provider succeeded', {
          provider: provider.name,
          cep,
          latencyMs: Date.now() - start,
          correlationId,
        });
        return result;
      } catch (error) {
        const latencyMs = Date.now() - start;

        if (error instanceof CepNotFoundError) {
          this.circuitBreaker.recordSuccess(provider.name);
          throw error;
        }

        this.circuitBreaker.recordFailure(provider.name);
        const reason = this.classifyError(error);
        attempts.push({ provider: provider.name, reason, latencyMs });

        this.logger.warn('Provider failed', {
          provider: provider.name,
          cep,
          reason,
          latencyMs,
          error: error instanceof Error ? error.message : String(error),
          correlationId,
        });
      }
    }

    if (cached?.stale) {
      this.logger.warn('Returning stale cache', { cep, attempts, correlationId });
      return cached.data;
    }

    this.logger.error('All providers failed', { cep, attempts, correlationId });
    throw new AllProvidersFailedError(cep, attempts);
  }

  private classifyError(error: unknown): ProviderAttempt['reason'] {
    if (!(error instanceof Error)) return 'unknown';

    const { name, message } = error;
    if (name === 'TimeoutError' || message.includes('timeout')) return 'timeout';
    if ('response' in error) return 'http_error';
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) return 'network_error';
    return 'unknown';
  }
}
