import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { CepProvider } from './cep-provider.interface.js';
import { CepResponseDto } from '../dto/cep-response.dto.js';
import { CepNotFoundError } from '../errors/cep.errors.js';

@Injectable()
export class ViaCepProvider implements CepProvider {
  readonly name = 'viacep';
  private readonly timeoutMs = 5000;

  constructor(private readonly http: HttpService) {}

  async fetch(cep: string): Promise<CepResponseDto> {
    const { data } = await firstValueFrom(
      this.http.get(`https://viacep.com.br/ws/${cep}/json/`).pipe(timeout(this.timeoutMs)),
    );

    if (data.erro) throw new CepNotFoundError(cep);

    return {
      cep: data.cep.replaceAll('-', ''),
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      provider: this.name,
      cached: false,
    };
  }
}
