# Deploy — Sistema de Gestão de Contratos JFAP/NUTEC

Documentação operacional para deploy em produção no servidor da JFAP e para manutenção contínua.

## Variáveis de ambiente obrigatórias

Copie `.env.example` para `.env` e preencha:

| Variável                                 | Descrição                                                   |
| ---------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                           | PostgreSQL (ex: `postgresql://user:pass@db:5432/contratos`) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET`        | `openssl rand -base64 32`                                   |
| `AUTH_URL` / `NEXTAUTH_URL`              | URL pública (ex: `https://contratos.jfap.jus.br`)           |
| `SEED_PASSWORD`                          | Senha do usuário-admin inicial                              |
| `NEXT_PUBLIC_JFAP_UG_CODE`               | UASG da JFAP (`090037`)                                     |
| `MARITACA_API_KEY`                       | Chave em https://plataforma.maritaca.ai/                    |
| `MARITACA_BASE_URL`                      | `https://chat.maritaca.ai/api`                              |
| `MARITACA_MODEL`                         | `sabia-3.1`                                                 |
| `MARITACA_MODEL_FILTER`                  | `sabiazinho-3`                                              |
| `MARITACA_MODEL_WRITER`                  | `sabia-3.1`                                                 |
| `COMPRAS_DADOSABERTOS_BASE_URL`          | `https://dadosabertos.compras.gov.br`                       |
| `COMPRAS_DADOSABERTOS_CIRCUIT_THRESHOLD` | `3`                                                         |
| `PNCP_BASE_URL`                          | `https://pncp.gov.br/api/consulta`                          |
| `PNCP_CIRCUIT_THRESHOLD`                 | `3`                                                         |
| `DOCUMENTS_STORAGE_PATH`                 | Diretório persistente (ex: `/var/jfap-contratos/documents`) |

## Infraestrutura

- 1 container Next.js (`app`)
- 1 container PostgreSQL 16 (`db`) com volume `pgdata`
- 1 volume para PDFs gerados (`documents`) — montado em `DOCUMENTS_STORAGE_PATH`
- Reverse proxy HTTPS (nginx/Caddy) com certificado TLS

## Subir

```bash
docker compose -f docker-compose.prod.yml up -d              # app + db com volumes persistentes
docker compose -f docker-compose.prod.yml exec app npx prisma db seed   # primeiro deploy apenas
```

Migrations são aplicadas automaticamente pelo entrypoint do container (`prisma migrate deploy` idempotente antes de iniciar o servidor).

## Migrations

- Desenvolvimento: `npx prisma migrate dev --name <descrição>`
- Produção: `npx prisma migrate deploy`
- Verificar: `npx prisma migrate status`

## Storage de PDFs

- Caminho único: `DOCUMENTS_STORAGE_PATH/<contractId>/<templateId>-v<n>.pdf`
- Assinados: mesmo diretório com sufixo `-signed.pdf`
- Checksum SHA-256 gravado em `GeneratedDocument.pdfChecksum` e `signedChecksum`
- **Backup**: incluir o volume `documents` no plano de backup (não recriável)

### Limpeza de órfãos

```bash
# Dry-run (apenas lista)
npx tsx scripts/cleanup-orphan-pdfs.ts

# Apply (deleta arquivos órfãos)
npx tsx scripts/cleanup-orphan-pdfs.ts --apply
```

Rodar mensalmente ou após exclusões em lote. Arquivos considerados órfãos
quando não existe `GeneratedDocument` referenciando via `pdfPath` ou `signedPdfPath`.

## Rate limit e resiliência

- **Rate limit IA**: 30 chamadas Maritaca por usuário a cada 5 minutos
  (`src/lib/rate-limiter.ts` → `aiRateLimiter`). Backend pluggable — default
  é in-memory (single-instance). Para escalar horizontalmente, instalar
  `ioredis` e trocar o backend para `RedisRateLimiterBackend` (stub
  documentado no arquivo). A interface `RateLimiterBackend` já é pronta
  para Redis — ver comentário no arquivo para implementação de referência.
- **Retry automático**: APIs externas (PNCP, compras.gov.br, Maritaca) têm 3
  tentativas com backoff exponencial (500ms → 4s) em erros 5xx e timeouts.
  Erros 4xx não são retriados.
- **Circuit breaker**: 3 falhas consecutivas em 60s abre o circuito por 2min.

## Observabilidade

- Tabela `audit_logs` — todas as mutações (incluindo chamadas IA com tokens).
- Tabela `document_generations` — rastreabilidade de chamadas IA vinculadas a
  documentos finalizados.
- `console.error` em rotas API críticas — colete via logs do container.
- **Dashboard de consumo de IA** em `/admin/ia-usage` — agrega chamadas por
  usuário, por propósito e por modelo, com seletor de mês. Alimentada por
  `audit_logs`. Acessível a perfis FISCAL e DIRETOR.

## Smoke tests periódicos

```bash
# Valida chave Maritaca + um código CATMAT real
npx tsx scripts/smoke-apis.ts

# Valida estratégia hierárquica CATMAT/CATSER
npx tsx scripts/smoke-hierarchy.ts

# Valida fillFreeField + coherenceCheck
npx tsx scripts/smoke-fase4.ts
```

## Testes automatizados

```bash
npx vitest run             # ~107 testes unitários (inclui render de PDFs)
npx vitest --watch         # modo watch
```

Os testes cobrem cálculos de saldo, validações de pagamento, política de
senha, circuit breaker, retries com backoff, rate limiter, CSV, estatísticas
descritivas, storage de documentos, pré-filtro textual e **renderização dos
8 templates de PDF** (valida magic bytes e todos os modos — Ateste NF,
Notificação 3-variações, Registro de Ocorrência, Relatório Fiscal, Pesquisa
de Preços, Justificativa 2-regimes, Termo Aditivo 5-tipos × 2-regimes,
Solicitação de Parecer).

## Checklist de deploy

- [ ] `.env` preenchido com valores de produção (nunca comitar)
- [ ] HTTPS configurado no proxy
- [ ] Backup automatizado do volume `pgdata` e `documents`
- [ ] Volume de documentos montado e com permissão de escrita pelo container
- [ ] Migration status limpo (`npx prisma migrate status`)
- [ ] Usuário administrador criado (via seed ou manual)
- [ ] Chave Maritaca válida e com saldo
- [ ] Smoke tests bem-sucedidos após deploy
- [ ] Monitoramento de uso de disco no volume `documents`
- [ ] Cron mensal para limpeza de PDFs órfãos
