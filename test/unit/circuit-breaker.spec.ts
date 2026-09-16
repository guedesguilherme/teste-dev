import { CircuitBreaker } from '../../src/cep/circuit-breaker/circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker(3, 1000);
    expect(cb.getState('provider-a')).toBe('CLOSED');
    expect(cb.canExecute('provider-a')).toBe(true);
  });

  it('should open after reaching failure threshold', () => {
    const cb = new CircuitBreaker(3, 1000);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');
    expect(cb.getState('provider-a')).toBe('CLOSED');

    cb.recordFailure('provider-a');
    expect(cb.getState('provider-a')).toBe('OPEN');
    expect(cb.canExecute('provider-a')).toBe(false);
  });

  it('should transition to HALF_OPEN after cooldown', () => {
    const cb = new CircuitBreaker(2, 100);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');
    expect(cb.getState('provider-a')).toBe('OPEN');

    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    expect(cb.getState('provider-a')).toBe('HALF_OPEN');
    expect(cb.canExecute('provider-a')).toBe(true);

    vi.useRealTimers();
  });

  it('should close on success after HALF_OPEN', () => {
    const cb = new CircuitBreaker(2, 100);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');

    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    cb.canExecute('provider-a'); // triggers HALF_OPEN transition
    cb.recordSuccess('provider-a');
    expect(cb.getState('provider-a')).toBe('CLOSED');

    vi.useRealTimers();
  });

  it('should re-open on failure in HALF_OPEN', () => {
    const cb = new CircuitBreaker(2, 100);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');

    vi.useFakeTimers();
    vi.advanceTimersByTime(150);

    cb.canExecute('provider-a'); // triggers HALF_OPEN
    cb.recordFailure('provider-a');
    expect(cb.getState('provider-a')).toBe('OPEN');

    vi.useRealTimers();
  });

  it('should isolate state per provider', () => {
    const cb = new CircuitBreaker(2, 1000);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');
    expect(cb.getState('provider-a')).toBe('OPEN');
    expect(cb.getState('provider-b')).toBe('CLOSED');
  });

  it('should reset failure count on success', () => {
    const cb = new CircuitBreaker(3, 1000);

    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');
    cb.recordSuccess('provider-a');
    cb.recordFailure('provider-a');
    cb.recordFailure('provider-a');

    // Should still be closed — success reset the counter
    expect(cb.getState('provider-a')).toBe('CLOSED');
  });
});
