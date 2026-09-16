import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'invalid_cep' })
  error: string;

  @ApiProperty({ example: 'CEP inválido: abc' })
  message: string;

  @ApiProperty({ example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' })
  correlationId: string;
}

export class ProviderAttemptDto {
  @ApiProperty({ example: 'viacep' })
  provider: string;

  @ApiProperty({ example: 'timeout', enum: ['timeout', 'http_error', 'network_error', 'circuit_open', 'unknown'] })
  reason: string;

  @ApiPropertyOptional({ example: 5002 })
  latencyMs?: number;
}

export class AllProvidersFailedResponseDto extends ErrorResponseDto {
  @ApiProperty({ type: [ProviderAttemptDto] })
  attempts: ProviderAttemptDto[];
}
