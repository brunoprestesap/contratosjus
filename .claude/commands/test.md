---
description: "Cria testes unitários com Vitest para regras de negócio críticas"
argument-hint: "[nome-do-teste] ex: calculo-saldo, validacoes-pagamento, politica-senha"
---

## Tarefa

Criar testes para `$ARGUMENTS`.

## Regras

1. **Arquivo:** `tests/lib/$ARGUMENTS.test.ts`
2. **Framework:** Vitest (`describe`, `it`, `expect`)
3. **Foco:** Apenas regras de negócio críticas — NÃO testar UI
4. **Cobertura obrigatória:**
   - Caminho feliz (happy path)
   - Edge cases (zero, negativo, limite exato)
   - Casos de erro esperados

## O que DEVE ter testes

- Cálculo de saldo contratual (valor global − total pago)
- Cálculo de saldo de empenho (soma empenhos − soma liquidações)
- Status automático de pagamento (Pendente/Atestado/Liquidado/Pago)
- Validação de ordem cronológica (ateste < liquidação < pagamento)
- Bloqueio de pagamento em contrato expirado
- Alerta de estouro de valor global
- Política de senha (12+ chars, complexidade)
- Validação de CNPJ

## Executar

```bash
npx vitest run tests/lib/$ARGUMENTS.test.ts
```
