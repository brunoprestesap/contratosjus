---
description: "Verifica o progresso da onda atual: o que está feito e o que falta"
argument-hint: "[numero-da-onda] ex: 1, 2, 3"
---

## Verificar Progresso da Onda $ARGUMENTS

Analise o código fonte do projeto e compare com os checklists abaixo. Para cada item, verifique se a implementação existe e está funcional.

### Onda 1 — Go/No-Go Checklist
- [ ] Login funcional com todas as regras de segurança (senha forte, bloqueio, timeout)
- [ ] CRUD completo de contratos com todos os campos do PRD
- [ ] Registro de empenhos (inicial + reforço) com cálculo de saldo disponível
- [ ] Registro de pagamentos com preenchimento parcial (ateste → liquidação → pagamento)
- [ ] Cálculo automático de saldo contratual (valor global − total pago)
- [ ] Barra de progresso visual de consumo (verde/amarelo/vermelho)
- [ ] 4 regras de validação implementadas e testadas
- [ ] Gestão de usuários (cadastro de Fiscal e Diretor)
- [ ] Docker Compose funcional (app + PostgreSQL)
- [ ] Testes unitários passando para regras críticas

### Onda 2 — Go/No-Go Checklist
- [ ] 5 tipos de aditivo com modal de confirmação antes/depois
- [ ] Recálculo automático de valor global e vigência após aditivo
- [ ] Sininho com badge no header
- [ ] Dropdown com 3 tipos de alerta (vigência, saldo, pagamento pendente)
- [ ] Clique no alerta navega para o contrato
- [ ] Log de auditoria registrando todas as operações
- [ ] Tela de auditoria com filtros

### Onda 3 — Go/No-Go Checklist
- [ ] Dashboard com 7 indicadores + filtro de exercício
- [ ] 3 relatórios em PDF gerados corretamente
- [ ] 2 caminhos para extrato (tela de relatórios + botão na ficha)
- [ ] Visão transversal de pagamentos com filtros
- [ ] Landing page alterada para Dashboard
- [ ] Perfil Diretor com acesso adequado (somente leitura)

## Output

Liste cada item como ✅ (implementado) ou ❌ (pendente), com breve justificativa. Sugira a próxima tarefa a ser implementada.
