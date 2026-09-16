import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CircuitBreaker } from '../cep/circuit-breaker/circuit-breaker.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly circuitBreaker: CircuitBreaker) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness — processo está rodando' })
  @ApiResponse({ status: 200 })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — ao menos um provider disponível' })
  @ApiResponse({ status: 200, description: 'Pelo menos um provider disponível' })
  @ApiResponse({ status: 503, description: 'Todos os circuits abertos' })
  ready() {
    const circuits = this.circuitBreaker.getAllStates();
    const allOpen =
      Object.keys(circuits).length > 0 &&
      Object.values(circuits).every((s) => s === 'OPEN');

    if (allOpen) throw new ServiceUnavailableException({ status: 'unavailable', circuits });

    return { status: 'ok', circuits };
  }
}
