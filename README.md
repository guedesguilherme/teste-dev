# Teste Técnico - Desenvolvedor

## O problema

Você precisa criar uma API que consulta CEP. Simples, certo?

Só que: você não controla as APIs externas. Elas caem, demoram, retornam erro. Seu serviço precisa continuar funcionando.

## APIs disponíveis

- ViaCEP: `https://viacep.com.br/ws/{cep}/json/`
- BrasilAPI: `https://brasilapi.com.br/api/cep/v1/{cep}`

---

## Solução

### Como rodar

```bash
npm install
npm run start:dev    # http://localhost:3000
npm test             # testes unitários + integração (33)
npm run test:e2e     # testes E2E (9)
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/cep/:cep` | Consulta endereço (8 dígitos, hífen opcional) |
| `GET` | `/health/live` | Liveness — processo rodando |
| `GET` | `/health/ready` | Readiness — ao menos um provider disponível |
| `GET` | `/docs` | Swagger UI |

### Fluxo de uma requisição

```
Request HTTP
  → Correlation ID middleware (UUID único por request)
  → Rate limit guard (60 req/min por IP)
  → Validation pipe (400 se CEP inválido)
  → Service
    → Cache fresco? → retorna direto
    → Round-robin entre providers
      → Circuit breaker por provider
        → Fetch com timeout 5s
    → Todos falharam + cache stale? → retorna stale
    → Nada funcionou → 503 com detalhes
  → Exception filter (erro de domínio → status HTTP)
```

### Decisões de arquitetura

| Decisão | Escolha | Por quê |
|---------|---------|---------|
| Circuit breaker | Manual (~80 linhas) | Sem dependência externa, cada transição de estado é compreensível e testável |
| Cache | `Map` in-memory com TTL + stale | O requisito não pede persistência; Redis seria overengineering para um único processo |
| Balanceamento | Round-robin determinístico | Distribui carga igualmente e é testável (ao contrário de random) |
| Erros de domínio | Classes sem HTTP status | Separação entre lógica de negócio e transporte — o service não sabe que é uma API HTTP |
| 404 não faz fallback | Short-circuit | "CEP não existe" é resposta de negócio, não falha de infra — não adianta perguntar pro próximo provider |
| Rate limiting | `@nestjs/throttler` no controller | Protege os providers de abuso sem bloquear health checks |
| Logging | Winston JSON em prod | Structured logging permite filtragem por correlationId |

### Tratamento de erros

Erros são classificados por natureza, não por HTTP status:

| Erro de domínio | → HTTP | Quando |
|-----------------|--------|--------|
| `CepInvalidError` | 400 | Input com formato inválido |
| `CepNotFoundError` | 404 | CEP não existe (resposta legítima do provider) |
| `ThrottlerException` | 429 | Rate limit excedido |
| `AllProvidersFailedError` | 503 | Todos os providers falharam |
| Qualquer outro | 500 | Bug inesperado |

Resposta de 503 com detalhes de cada tentativa:

```json
{
  "statusCode": 503,
  "error": "all_providers_unavailable",
  "message": "Todos os providers falharam para o CEP 01310100: timeout",
  "attempts": [
    { "provider": "viacep", "reason": "timeout", "latencyMs": 5002 },
    { "provider": "brasilapi", "reason": "network_error", "latencyMs": 12 }
  ],
  "correlationId": "a1b2c3d4-5678-90ab-cdef-1234567890ab"
}
```

### Resiliência

| Cenário | Comportamento |
|---------|--------------|
| Provider A timeout | Fallback pro provider B |
| Ambos falham + tem cache | Retorna cache stale |
| Ambos falham + sem cache | 503 com detalhes de cada tentativa |
| Provider falha 5x | Circuit breaker abre → pula direto pro próximo |
| Circuit em cooldown (30s) | Half-open: permite uma tentativa de teste |

### Como adicionar um novo provider

1. Criar classe implementando `CepProvider` (interface com `name` e `fetch(cep)`)
2. Adicionar no `useFactory` do `cep.module.ts`

Zero alteração no service, controller, filter ou testes existentes.

### Testes

| Tipo | Qtd | Cobertura |
|------|-----|-----------|
| Unit | 33 | Validação, circuit breaker, round-robin, fallback, cache, 404 short-circuit |
| E2E | 9 | Happy path, 400, 404, 503, cache hit, health, correlationId |
| **Total** | **42** | |

### Estrutura

```
src/
├── main.ts                              # Bootstrap + Swagger
├── app.module.ts                        # Modules + Throttler + Middleware
├── cep/
│   ├── cep.controller.ts                # GET /cep/:cep
│   ├── cep.service.ts                   # Cache → providers → fallback
│   ├── cep.module.ts
│   ├── cache/cep-cache.service.ts       # TTL + stale
│   ├── circuit-breaker/circuit-breaker.ts
│   ├── dto/
│   │   ├── cep-param.dto.ts             # Validation pipe
│   │   ├── cep-response.dto.ts          # Response DTO
│   │   └── error-response.dto.ts        # Error DTOs (Swagger)
│   ├── errors/cep.errors.ts             # Domain exceptions
│   ├── filters/cep-exception.filter.ts  # Domínio → HTTP
│   └── providers/
│       ├── cep-provider.interface.ts    # Contrato
│       ├── viacep.provider.ts
│       ├── brasilapi.provider.ts
│       └── provider-selector.ts         # Round-robin
├── health/
│   ├── health.controller.ts             # /live + /ready
│   └── health.module.ts
└── common/
    ├── logger/logger.module.ts
    └── middleware/correlation-id.middleware.ts
```

### Trade-offs conscientes

- **Cache in-memory**: não compartilha entre processos — para escalar horizontalmente, migraria para Redis
- **Sem retry com backoff**: fallback pro próximo provider já cobre indisponibilidade pontual; retry poderia amplificar carga
- **Sem Docker**: fora do escopo, mas a estrutura está pronta para containerização
