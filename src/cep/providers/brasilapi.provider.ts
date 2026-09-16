import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { AxiosError } from 'axios';
import { CepProvider } from './cep-provider.interface.js';
import { CepResponseDto } from '../dto/cep-response.dto.js';
import { CepNotFoundError } from '../errors/cep.errors.js';

@Injectable()
export class BrasilApiProvider implements CepProvider {
  readonly name = 'brasilapi';
  private readonly timeoutMs = 5000;

  constructor(private readonly http: HttpService) {}

  async fetch(cep: string): Promise<CepResponseDto> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`https://brasilapi.com.br/api/cep/v1/${cep}`).pipe(timeout(this.timeoutMs)),
      );

      return {
        cep: data.cep.replaceAll('-', ''),
        street: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
        provider: this.name,
        cached: false,
      };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new CepNotFoundError(cep);
      }
      throw error;
    }
  }
}
