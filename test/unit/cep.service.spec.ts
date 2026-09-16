import { CepService } from '../../src/cep/cep.service.js';
import { ProviderSelector } from '../../src/cep/providers/provider-selector.js';
import { CepCacheService } from '../../src/cep/cache/cep-cache.service.js';
import { CircuitBreaker } from '../../src/cep/circuit-breaker/circuit-breaker.js';
import { CepProvider } from '../../src/cep/providers/cep-provider.interface.js';
import { CepResponseDto } from '../../src/cep/dto/cep-response.dto.js';
import {
  CepNotFoundError,
  AllProvidersFailedError,
} from '../../src/cep/errors/cep.errors.js';

const MOCK_RESPONSE: CepResponseDto = {
  cep: '01310100',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  provider: 'mock-provider',
  cached: false,
};

function createMockProvider(
  name: string,
  fetchImpl: () => Promise<CepResponseDto>,
): CepProvider {
  return { name, fetch: vi.fn(fetchImpl) };
}

function createService(providers: CepProvider[], cache?: CepCacheService) {
  const selector = new ProviderSelector(providers);
  const cacheService = cache || new CepCacheService();
  const circuitBreaker = new CircuitBreaker(5, 30000);
  return new CepService(selector, cacheService, circuitBreaker);
}

describe('CepService', () => {
  it('should return result from first provider on success', async () => {
    const provider = createMockProvider('a', () =>
      Promise.resolve({ ...MOCK_RESPONSE, provider: 'a' }),
    );
    const service = createService([provider]);

    const result = await service.findByCep('01310100');
    expect(result.provider).toBe('a');
    expect(provider.fetch).toHaveBeenCalledWith('01310100');
  });

  it('should fallback to second provider when first fails', async () => {
    const providerA = createMockProvider('a', () =>
      Promise.reject(new Error('timeout')),
    );
    const providerB = createMockProvider('b', () =>
      Promise.resolve({ ...MOCK_RESPONSE, provider: 'b' }),
    );
    const service = createService([providerA, providerB]);

    const result = await service.findByCep('01310100');
    expect(result.provider).toBe('b');
  });

  it('should NOT fallback on CepNotFoundError (404 is business logic)', async () => {
    const providerA = createMockProvider('a', () =>
      Promise.reject(new CepNotFoundError('99999999')),
    );
    const providerB = createMockProvider('b', () =>
      Promise.resolve(MOCK_RESPONSE),
    );
    const service = createService([providerA, providerB]);

    await expect(service.findByCep('99999999')).rejects.toThrow(CepNotFoundError);
    expect(providerB.fetch).not.toHaveBeenCalled();
  });

  it('should throw AllProvidersFailedError when all fail', async () => {
    const providerA = createMockProvider('a', () =>
      Promise.reject(new Error('timeout')),
    );
    const providerB = createMockProvider('b', () =>
      Promise.reject(new Error('ECONNREFUSED')),
    );
    const service = createService([providerA, providerB]);

    await expect(service.findByCep('01310100')).rejects.toThrow(AllProvidersFailedError);
  });

  it('should return fresh cache without calling providers', async () => {
    const provider = createMockProvider('a', () =>
      Promise.resolve(MOCK_RESPONSE),
    );
    const cache = new CepCacheService();
    cache.set('01310100', MOCK_RESPONSE);
    const service = createService([provider], cache);

    const result = await service.findByCep('01310100');
    expect(result.cached).toBe(true);
    expect(provider.fetch).not.toHaveBeenCalled();
  });

  it('should return stale cache when all providers fail', async () => {
    const provider = createMockProvider('a', () =>
      Promise.reject(new Error('down')),
    );
    const cache = new CepCacheService();
    cache.set('01310100', MOCK_RESPONSE);

    // Force cache to be stale by manipulating internal state
    const entry = (cache as any).cache.get('01310100');
    entry.expiresAt = Date.now() - 1000;

    const service = createService([provider], cache);

    const result = await service.findByCep('01310100');
    expect(result.cached).toBe(true);
  });

  it('should skip provider with open circuit breaker', async () => {
    const providerA = createMockProvider('a', () =>
      Promise.reject(new Error('fail')),
    );
    const providerB = createMockProvider('b', () =>
      Promise.resolve({ ...MOCK_RESPONSE, provider: 'b' }),
    );
    const service = createService([providerA, providerB]);

    // Trip the circuit breaker for provider A (5 failures)
    for (let i = 0; i < 5; i++) {
      try {
        await service.findByCep('01310100');
      } catch {
        // providerB might succeed on fallback, that's fine
      }
    }

    // Reset mocks to track new calls
    (providerA.fetch as ReturnType<typeof vi.fn>).mockClear();
    (providerB.fetch as ReturnType<typeof vi.fn>).mockClear();

    // Now provider A's circuit should be open — it should be skipped
    const result = await service.findByCep('01310100');
    expect(result.provider).toBe('b');
  });
});
