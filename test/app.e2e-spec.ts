import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { AppModule } from '../src/app.module.js';
import { CepExceptionFilter } from '../src/cep/filters/cep-exception.filter.js';

function axiosOk(data: any): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

const VIACEP_RESPONSE = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let httpService: HttpService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new CepExceptionFilter());
    await app.init();

    httpService = moduleFixture.get(HttpService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /cep/01310100 — 200 com endereço', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(of(axiosOk(VIACEP_RESPONSE)));

    const res = await request(app.getHttpServer()).get('/cep/01310100');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      cep: '01310100',
      city: 'São Paulo',
      state: 'SP',
      cached: false,
    });
    expect(res.body.provider).toBeDefined();
  });

  it('GET /cep/abc — 400 CEP inválido', async () => {
    const res = await request(app.getHttpServer()).get('/cep/abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_cep');
    expect(res.body.correlationId).toBeDefined();
  });

  it('GET /cep/01310-100 — aceita hífen e normaliza', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(of(axiosOk(VIACEP_RESPONSE)));

    const res = await request(app.getHttpServer()).get('/cep/01310-100');

    expect(res.status).toBe(200);
    expect(res.body.cep).toBe('01310100');
  });

  it('GET /cep/00000000 — 404 CEP não encontrado', async () => {
    vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
      if (url.includes('viacep')) {
        return of(axiosOk({ erro: true }));
      }
      const err = new AxiosError('Not Found', '404', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      return throwError(() => err);
    });

    const res = await request(app.getHttpServer()).get('/cep/00000000');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('cep_not_found');
  });

  it('GET /cep/01310100 — 503 quando todos os providers falham', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    const res = await request(app.getHttpServer()).get('/cep/01310100');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('all_providers_unavailable');
    expect(res.body.attempts).toHaveLength(2);
    expect(res.body.correlationId).toBeDefined();
  });

  it('GET /cep/01310100 — retorna cache na segunda chamada', async () => {
    vi.spyOn(httpService, 'get').mockReturnValue(of(axiosOk(VIACEP_RESPONSE)));

    await request(app.getHttpServer()).get('/cep/01310100').expect(200);

    const res = await request(app.getHttpServer()).get('/cep/01310100');

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
  });

  it('GET /health/live — 200', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready — 200 quando circuits fechados', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('correlationId presente em todas as respostas de erro', async () => {
    const res = await request(app.getHttpServer()).get('/cep/invalido!');

    expect(res.status).toBe(400);
    expect(res.body.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
