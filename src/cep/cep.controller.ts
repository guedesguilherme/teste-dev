import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { CepService } from './cep.service.js';
import { CepValidationPipe } from './dto/cep-param.dto.js';
import { CepResponseDto } from './dto/cep-response.dto.js';
import { ErrorResponseDto, AllProvidersFailedResponseDto } from './dto/error-response.dto.js';

@ApiTags('CEP')
@UseGuards(ThrottlerGuard)
@Controller('cep')

export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  @ApiOperation({ summary: 'Consulta endereço por CEP' })
  @ApiParam({ name: 'cep', example: '01310100', description: 'CEP com 8 dígitos (hífen opcional)' })
  @ApiResponse({ status: 200, type: CepResponseDto, description: 'Endereço encontrado' })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: 'CEP com formato inválido' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'CEP não encontrado' })
  @ApiResponse({ status: 429, type: ErrorResponseDto, description: 'Rate limit excedido' })
  @ApiResponse({ status: 503, type: AllProvidersFailedResponseDto, description: 'Todos os providers falharam' })
  
  findByCep(
    @Param('cep', CepValidationPipe) cep: string,
    @Req() req: Request & { correlationId: string },
  ): Promise<CepResponseDto> {
    return this.cepService.findByCep(cep, req.correlationId);
  }
}
