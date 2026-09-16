export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerEntry {
  state: CircuitState;
  failures: number;
  openUntil: number;
}

export class CircuitBreaker {
  private readonly breakers = new Map<string, BreakerEntry>();

  constructor(
    private readonly threshold: number = 5,
    private readonly cooldownMs: number = 30000,
  ) {}

  canExecute(key: string): boolean {
    const entry = this.breakers.get(key);
    if (!entry || entry.state === 'CLOSED') return true;

    if (entry.state === 'OPEN' && Date.now() >= entry.openUntil) {
      entry.state = 'HALF_OPEN';
      return true;
    }

    return entry.state === 'HALF_OPEN';
  }

  recordSuccess(key: string): void {
    this.breakers.set(key, { state: 'CLOSED', failures: 0, openUntil: 0 });
  }

  recordFailure(key: string): void {
    const entry = this.breakers.get(key) || {
      state: 'CLOSED' as CircuitState,
      failures: 0,
      openUntil: 0,
    };

    entry.failures++;

    if (entry.state === 'HALF_OPEN' || entry.failures >= this.threshold) {
      entry.state = 'OPEN';
      entry.openUntil = Date.now() + this.cooldownMs;
    }

    this.breakers.set(key, entry);
  }

  getState(key: string): CircuitState {
    const entry = this.breakers.get(key);
    if (!entry) return 'CLOSED';

    if (entry.state === 'OPEN' && Date.now() >= entry.openUntil) {
      entry.state = 'HALF_OPEN';
    }

    return entry.state;
  }

  getAllStates(): Record<string, CircuitState> {
    const result: Record<string, CircuitState> = {};
    for (const key of this.breakers.keys()) {
      result[key] = this.getState(key);
    }
    return result;
  }
}
