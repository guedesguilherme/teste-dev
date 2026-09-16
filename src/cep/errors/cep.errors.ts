export class CepInvalidError extends Error {
  constructor(public readonly cep: string) {
    super(`CEP inválido: ${cep}`);
    this.name = 'CepInvalidError';
  }
}

export class CepNotFoundError extends Error {
  constructor(public readonly cep: string) {
    super(`CEP não encontrado: ${cep}`);
    this.name = 'CepNotFoundError';
  }
}

export interface ProviderAttempt {
  provider: string;
  reason: 'timeout' | 'http_error' | 'network_error' | 'circuit_open' | 'unknown';
  latencyMs?: number;
}

export class AllProvidersFailedError extends Error {
  constructor(
    public readonly cep: string,
    public readonly attempts: ProviderAttempt[],
  ) {
    const allTimeout = attempts.length > 0 && attempts.every((a) => a.reason === 'timeout');
    const detail = allTimeout ? 'timeout' : 'unavailable';
    super(`Todos os providers falharam para o CEP ${cep}: ${detail}`);
    this.name = 'AllProvidersFailedError';
  }
}
