import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { RequestWithCorrelation } from '../../common/middleware/correlation-id.middleware.js';
import {
  CepInvalidError,
  CepNotFoundError,
  AllProvidersFailedError,
} from '../errors/cep.errors.js';

@Catch()
export class CepExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CepExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithCorrelation>();
    const correlationId = req.correlationId ?? 'unknown';

    if (exception instanceof CepInvalidError) {
      return this.send(res, 400, 'invalid_cep', exception.message, correlationId);
    }

    if (exception instanceof CepNotFoundError) {
      return this.send(res, 404, 'cep_not_found', exception.message, correlationId);
    }

    if (exception instanceof AllProvidersFailedError) {
      this.logger.error('All providers failed', {
        cep: exception.cep,
        attempts: exception.attempts,
        correlationId,
      });
      return res.status(503).json({
        statusCode: 503,
        error: 'all_providers_unavailable',
        message: exception.message,
        attempts: exception.attempts,
        correlationId,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.send(res, status, status === 429 ? 'rate_limit_exceeded' : 'http_error', exception.message, correlationId);
    }

    this.logger.error('Unexpected error', {
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
      correlationId,
    });
    return this.send(res, 500, 'internal_error', 'Erro interno do servidor', correlationId);
  }

  private send(res: Response, status: number, error: string, message: string, correlationId: string) {
    res.status(status).json({ statusCode: status, error, message, correlationId });
  }
}
