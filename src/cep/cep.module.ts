import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CepController } from './cep.controller.js';
import { CepService } from './cep.service.js';
import { CepCacheService } from './cache/cep-cache.service.js';
import { CircuitBreaker } from './circuit-breaker/circuit-breaker.js';
import { ProviderSelector } from './providers/provider-selector.js';
import { ViaCepProvider } from './providers/viacep.provider.js';
import { BrasilApiProvider } from './providers/brasilapi.provider.js';
import { CEP_PROVIDERS } from './providers/cep-provider.interface.js';

@Module({
  imports: [HttpModule],
  controllers: [CepController],
  providers: [
    CepService,
    CepCacheService,
    {
      provide: CircuitBreaker,
      useValue: new CircuitBreaker(5, 30000),
    },
    ProviderSelector,
    ViaCepProvider,
    BrasilApiProvider,
    {
      provide: CEP_PROVIDERS,
      useFactory: (viacep: ViaCepProvider, brasilapi: BrasilApiProvider) => [
        viacep,
        brasilapi,
      ],
      inject: [ViaCepProvider, BrasilApiProvider],
    },
  ],
  exports: [CircuitBreaker],
})
export class CepModule {}
