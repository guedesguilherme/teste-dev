import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { BrasilApiProvider } from '../../src/cep/providers/brasilapi.provider.js';
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

describe('BrasilApiProvider', () => {
  let provider: BrasilApiProvider;
  let httpService: HttpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [BrasilApiProvider],
    }).compile();

    provider = module.get(BrasilApiProvider);
    httpService = module.get(HttpService);
  });

  it('should map BrasilAPI response to CepResponseDto', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      of(
        axiosResponse({
          cep: '01310100',
          street: 'Avenida Paulista',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
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
      provider: 'brasilapi',
      cached: false,
    });
  });

  it('should throw CepNotFoundError on HTTP 404', async () => {
    const axiosError = new AxiosError('Not Found', '404', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

    vi.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => axiosError),
    );

    await expect(provider.fetch('00000000')).rejects.toThrow(CepNotFoundError);
  });

  it('should propagate non-404 HTTP errors', async () => {
    const axiosError = new AxiosError('Server Error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

    vi.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => axiosError),
    );

    await expect(provider.fetch('01310100')).rejects.toThrow(AxiosError);
  });

  it('should propagate network errors', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => new Error('ENOTFOUND')),
    );

    await expect(provider.fetch('01310100')).rejects.toThrow('ENOTFOUND');
  });
});
