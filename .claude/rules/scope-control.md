# Controle de Escopo — Ondas de Entrega

IMPORTANTE: NÃO implementar funcionalidades de ondas futuras sem confirmação explícita.

## Onda 1 (MVP v0.1) — ESCOPO ATUAL

- ✅ Autenticação completa (login, senha forte, bloqueio, timeout)
- ✅ Gestão de usuários (CRUD, perfis Fiscal/Diretor)
- ✅ CRUD de contratos (todos os campos do PRD)
- ✅ Lista de contratos (busca, filtros, paginação)
- ✅ Ficha do contrato (accordion, cabeçalho resumo, saldo)
- ✅ Registro de empenhos (inicial + reforço, saldo disponível)
- ✅ Registro de pagamentos (preenchimento parcial, status automático)
- ✅ Cálculo automático de saldo + barra de progresso
- ✅ 4 regras de validação
- ✅ Testes unitários para regras críticas

## Onda 2 (v0.2) — NÃO IMPLEMENTAR AINDA

- ❌ Aditivos contratuais
- ❌ Alertas (sininho com badge)
- ❌ Log de auditoria

## Onda 3 (v0.3) — NÃO IMPLEMENTAR AINDA

- ❌ Dashboard gerencial (7 indicadores)
- ❌ Relatórios em PDF
- ❌ Visão transversal de pagamentos

## Fora de todas as ondas

- ❌ Integração SIAFI/Siscontratos
- ❌ Upload de documentos
- ❌ Responsividade mobile
- ❌ Acessibilidade (eMAG/WCAG)
- ❌ Multi-tenant

Se durante o desenvolvimento surgir a tentação de implementar algo fora do escopo da onda atual, PARE e pergunte ao usuário antes de prosseguir.
