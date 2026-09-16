import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { CepModule } from '../cep/cep.module.js';

@Module({
  imports: [CepModule],
  controllers: [HealthController],
})
export class HealthModule {}
