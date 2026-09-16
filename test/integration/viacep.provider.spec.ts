import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { ViaCepProvider } from '../../src/cep/providers/viacep.provider.js';
import { CepNotFoundError } from '../../src/cep/errors/cep.errors.js';

function axiosResponse(data: any): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;
  let httpService: HttpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ViaCepProvider],
    }).compile();

    provider = module.get(ViaCepProvider);
    httpService = module.get(HttpService);
  });

  it('should map ViaCEP response to CepResponseDto', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      of(
        axiosResponse({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      ),
    );

    const result = await provider.fetch('01310100');

    expect(result).toEqual({
      cep: '01310100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      provider: 'viacep',
      cached: false,
    });
  });

  it('should throw CepNotFoundError when ViaCEP returns erro:true', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      of(axiosResponse({ erro: true })),
    );

    await expect(provider.fetch('00000000')).rejects.toThrow(CepNotFoundError);
  });

  it('should propagate network errors', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    await expect(provider.fetch('01310100')).rejects.toThrow('ECONNREFUSED');
  });
});
