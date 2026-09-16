import { ProviderSelector } from '../../src/cep/providers/provider-selector.js';
import { CepProvider } from '../../src/cep/providers/cep-provider.interface.js';

function mockProvider(name: string): CepProvider {
  return { name, fetch: vi.fn() };
}

describe('ProviderSelector', () => {
  it('should return all providers in order', () => {
    const providers = [mockProvider('a'), mockProvider('b')];
    const selector = new ProviderSelector(providers);

    const ordered = selector.getOrdered();
    expect(ordered.map((p) => p.name)).toEqual(['a', 'b']);
  });

  it('should alternate starting provider (round-robin)', () => {
    const providers = [mockProvider('a'), mockProvider('b')];
    const selector = new ProviderSelector(providers);

    const first = selector.getOrdered();
    const second = selector.getOrdered();

    expect(first.map((p) => p.name)).toEqual(['a', 'b']);
    expect(second.map((p) => p.name)).toEqual(['b', 'a']);
  });

  it('should wrap around after cycling all providers', () => {
    const providers = [mockProvider('a'), mockProvider('b')];
    const selector = new ProviderSelector(providers);

    selector.getOrdered(); // starts at 0
    selector.getOrdered(); // starts at 1
    const third = selector.getOrdered(); // wraps to 0

    expect(third.map((p) => p.name)).toEqual(['a', 'b']);
  });
});
