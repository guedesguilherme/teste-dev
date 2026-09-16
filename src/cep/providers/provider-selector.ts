import { Injectable, Inject } from '@nestjs/common';
import { CepProvider, CEP_PROVIDERS } from './cep-provider.interface.js';

@Injectable()
export class ProviderSelector {
  private index = 0;

  constructor(
    @Inject(CEP_PROVIDERS) private readonly providers: CepProvider[],
  ) {}

  getOrdered(): CepProvider[] {
    const ordered = [
      ...this.providers.slice(this.index),
      ...this.providers.slice(0, this.index),
    ];
    this.index = (this.index + 1) % this.providers.length;
    return ordered;
  }
}
