---
description: "Seed de desenvolvimento com 10–20 contratos em estados variados"
---

## Ordem de execução: 7 de 7 (Grupo A — Onda 1)

Último do grupo porque **só afeta dev/teste**. Consome os passos 1–6 (índices, helpers, validações) para gerar dados realistas.

## Contexto

Seed atual (se existir) provavelmente tem 1–2 contratos básicos. Isso não exercita: filtros, paginação, barra de progresso em diferentes faixas, contratos expirados/encerrados, saldo negativo (alerta RF-09), mês sem registro.

## Passos

1. Editar `prisma/seed.ts`:
   - Gerar 2 usuários: Fiscal e Diretor com senhas `Senha@Forte123!`.
   - Gerar 15 contratos variados:
     - 3 vigentes com saldo > 50% (verde)
     - 3 vigentes com saldo 20–50% (amarelo)
     - 3 vigentes com saldo < 20% (vermelho)
     - 2 encerrados (para testar bloqueio de pagamento)
     - 2 expirados (vigência passada, sem encerramento)
     - 2 sem empenho (estado inicial)
   - Para cada contrato vigente: empenhos iniciais + 3–12 pagamentos em diferentes status (Pendente/Atestado/Liquidado/Pago).
   - 1 contrato com pagamento fixo mensal com "buraco" de 2 meses (dispara alerta RF-09).
2. Usar `@faker-js/faker` com locale `pt_BR` para CNPJ, razão social, endereço.
3. Wrapper `main()` deve `DELETE FROM` todas as tabelas antes de inserir (idempotente).
4. Documentar no `README.md` ou `CLAUDE.md`: `npx prisma migrate reset` recria tudo.

## Validação

- `npx prisma db seed` conclui sem erro.
- Lista de contratos mostra 15 linhas com filtros funcionando (status, vigência).
- Barra de progresso aparece em três cores diferentes na mesma tela.
- Alerta de "mês sem registro" aparece no contrato com buraco.
