# 🚀 Conceito de MVP — Sistema de Gestão e Controle de Desembolso de Contratos

## JFAP / NUTEC

| Campo | Valor |
|---|---|
| **Versão** | 1.0 |
| **Data** | 16 de abril de 2026 |
| **PRD de Referência** | PRD v1.0 — Sistema de Gestão e Controle de Desembolso de Contratos |
| **UX Spec de Referência** | UX/UI Spec v1.0 |
| **Abordagem** | Entrega incremental em 3 ondas |
| **Status** | Aprovado para desenvolvimento |

---

## 1. Hipótese / Objetivo do MVP

### 1.1 Hipótese Central

> **"Se o fiscal de contratos do NUTEC/JFAP tiver uma aplicação estruturada para registrar contratos, empenhos e pagamentos mensais (com validações de integridade), ele terá visibilidade do saldo contratual em tempo real, eliminando o risco de estouro de valor global e de vencimento de vigência por esquecimento."**

### 1.2 Origem no PRD

Esta hipótese deriva diretamente dos seguintes objetivos do PRD (Seção 2.2):

| Objetivo PRD | Relação com a Hipótese |
|---|---|
| **O1** — 100% dos contratos cadastrados em 30 dias | Fundação: sem cadastro, nada funciona |
| **O2** — 100% dos pagamentos registrados em 5 dias úteis | Núcleo operacional da hipótese |
| **O3** — Zero contratos vencidos por esquecimento | Consequência direta da visibilidade |
| **O4** — Zero estouros de valor global sem aditivo | Consequência direta das validações |

O objetivo **O5** (redução do tempo de resposta a consultas gerenciais — Dashboard) fica para a **onda 3**, pois depende de dados acumulados.

### 1.3 Aprendizado Esperado

Ao final de **30 dias de uso** do MVP v0.1, validaremos:

- O fiscal consegue manter os registros atualizados no dia a dia (adoção real)?
- A visibilidade de saldo em tempo real efetivamente previne problemas?
- O fluxo de registro (ateste → liquidação → pagamento) com campos opcionais é natural ou gera atrito?
- O registro de empenhos separados (por exercício) funciona na prática?

---

## 2. Público-Alvo (Subconjunto do MVP)

### 2.1 Early Adopter

| Atributo | Valor |
|---|---|
| **Persona** | Fiscal de Contratos (Persona 1 do PRD, Seção 3.1) |
| **Quantidade** | 1 usuário (o próprio solicitante) |
| **Organização** | NUTEC — Seção Judiciária do Amapá (JFAP) |
| **Perfil técnico** | Power-user, desenvolvedor, alta familiaridade com sistemas |
| **Motivação** | Dor direta: zero controle estruturado hoje |

### 2.2 Usuário Secundário (a partir da onda 3)

| Atributo | Valor |
|---|---|
| **Persona** | Diretor do NUTEC (Persona 2 do PRD, Seção 3.2) |
| **Papel no MVP v0.1** | Nenhum (não interage com o sistema) |
| **Entrada prevista** | Onda 3 (Dashboard + Relatórios) |

### 2.3 Justificativa do Recorte

O fiscal é simultaneamente o **usuário com maior dor**, o **operador diário** e o **desenvolvedor** do sistema. Isso cria um ciclo de feedback extremamente curto: ele constrói, usa, identifica problemas e ajusta — o cenário ideal para um MVP Lean. O diretor só precisa do sistema quando houver dados suficientes para um dashboard significativo.

---

## 3. Problema Resolvido (Foco do MVP)

### 3.1 Problema Central

O fiscal de contratos do NUTEC/JFAP **não possui nenhuma ferramenta** (nem planilhas) para acompanhar a execução financeira dos contratos de prestação de serviços sob sua fiscalização. Isso resulta em:

- **Invisibilidade total** do saldo contratual restante.
- **Risco de estouro** do valor global sem percepção prévia.
- **Risco de vencimento** de vigência sem providência de aditivo.
- **Incapacidade** de informar rapidamente a situação de qualquer contrato.
- **Ausência de registro histórico** de pagamentos realizados.

### 3.2 Problema Resolvido pelo MVP v0.1

O MVP v0.1 resolve o recorte mais urgente: **"eu preciso de um lugar estruturado para registrar o que está acontecendo com meus contratos e saber, a qualquer momento, quanto já gastei e quanto ainda tenho de saldo"**.

Não resolve (ainda): visibilidade gerencial para o diretor, relatórios formais em PDF, gestão de aditivos, alertas proativos, rastreabilidade de auditoria.

---

## 4. Funcionalidades Mínimas (Priorizadas)

### 4.1 Estratégia de Entrega: 3 Ondas

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ONDA 1 (MVP v0.1)          ONDA 2 (v0.2)         ONDA 3 (v0.3)  │
│  Deploy imediato             +2-3 semanas           +2-3 semanas   │
│                                                                     │
│  ┌───────────────────┐   ┌──────────────────┐   ┌────────────────┐ │
│  │ Autenticação      │   │ Aditivos         │   │ Dashboard      │ │
│  │ Gestão Usuários   │   │ Alertas (sininho)│   │ Relatórios PDF │ │
│  │ Cadastro Contratos│   │ Log de Auditoria │   │                │ │
│  │ Empenhos          │   │                  │   │                │ │
│  │ Pagamentos        │   │                  │   │                │ │
│  │ Validações        │   │                  │   │                │ │
│  └───────────────────┘   └──────────────────┘   └────────────────┘ │
│                                                                     │
│  ◄──── Fundação operacional ────►◄── Integridade ──►◄─ Gerencial ─►│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Onda 1 — MVP v0.1 (Deploy Imediato)

**Tema: Fundação operacional — "Registrar e visualizar saldos"**

| ID | Funcionalidade | Ref. PRD | Ref. UX Spec | Justificativa para o MVP |
|---|---|---|---|---|
| **MVP-01** | **Autenticação local completa** | RF-07 | Seção 3.1, Fluxo 2.1 | Infraestrutura obrigatória. Inclui: login email/senha, hash bcrypt/argon2, política de senha forte (12+ chars, maiúsculas, minúsculas, números, especiais), bloqueio após 5 tentativas, timeout 30 min, HTTPS. |
| **MVP-02** | **Gestão de usuários** | RF-07 | Seção 3.8, Fluxo 2.8 | Necessário para criar os 2 perfis iniciais (Fiscal + Diretor). Página dedicada de cadastro/edição. Perfis: Fiscal (admin/CRUD) e Diretor (somente leitura). |
| **MVP-03** | **Cadastro de contratos (CRUD)** | RF-01 | Seção 3.4, Fluxo 2.2 | Fundação de dados. Todos os campos definidos no PRD: identificação, vigência, financeiro, dotação orçamentária, gestão. Formulário longo em página única com seções visuais. |
| **MVP-04** | **Lista de contratos** | RF-01 | Seção 3.3 | Tela operacional principal. Busca, filtros (status, regime legal, vigência), paginação. Indicadores visuais de saldo (verde/amarelo/vermelho) e vigência. |
| **MVP-05** | **Ficha do contrato (visualização)** | RF-01 | Seção 3.4 | Página única com rolagem, seções colapsáveis (accordion). Cabeçalho com resumo: fornecedor, objeto, status, valor global, saldo restante, barra de progresso, vigência. |
| **MVP-06** | **Registro de empenhos** | RF-02 (expandido na UX) | Seção 3.4 (Empenhos) | Seção separada na ficha do contrato. Suporta múltiplos empenhos por exercício (inicial + reforço). Campos: nota de empenho, data, valor, tipo, observações. Saldo disponível calculado automaticamente. |
| **MVP-07** | **Registro de pagamentos mensais** | RF-02 | Seção 3.4 (Pagamentos), Fluxo 2.3 | Coração operacional do MVP. Registro com campos opcionais (preenchimento parcial). Eventos separados: ateste → liquidação → pagamento. Status calculado automaticamente. Tabela com checkmarks + datas por estágio. |
| **MVP-08** | **Cálculo automático de saldo** | RF-02 | Seção 3.4 (Cabeçalho) | Saldo contratual restante = valor global − total pago. Atualizado a cada registro de pagamento ou empenho. Exibido no cabeçalho da ficha e na lista de contratos. Barra de progresso visual (verde > 50%, amarelo 20-50%, vermelho < 20%). |
| **MVP-09** | **Regras de validação** | RF-09 | Fluxo 2.3 | Todas as 4 regras desde o dia 1: (1) Bloquear pagamento em contrato expirado. (2) Alertar se total pago + empenhado > valor global. (3) Bloquear quebra de ordem cronológica (ateste → liquidação → pagamento). (4) Alertar mês sem registro em contrato fixo mensal. |

**Telas da Onda 1 (Ref. UX Spec):**

| Tela | Seção UX Spec |
|---|---|
| Login | 3.1 |
| Lista de Contratos | 3.3 |
| Novo Contrato / Editar Contrato | 3.5 |
| Ficha do Contrato (com seções: Dados, Vigência, Dotação, Gestão, Empenhos, Pagamentos) | 3.4 |
| Lista de Usuários | 3.8 |
| Novo Usuário / Editar Usuário | 3.8 |

**Sidebar da Onda 1 (simplificada):**

```
┌─────────────────────────┐
│  [Logo NUTEC / JFAP]    │
├─────────────────────────┤
│  📄  Contratos          │
│                         │
│  ─────────────────────  │
│                         │
│  👥  Usuários       *   │
│                         │
├─────────────────────────┤
│  👤  Nome do Usuário    │
│      [Sair]             │
└─────────────────────────┘

* Somente perfil Fiscal
```

> **Nota:** Dashboard, Pagamentos (visão transversal), Relatórios e Auditoria não aparecem na sidebar da Onda 1. Serão adicionados progressivamente nas ondas 2 e 3.

### 4.3 Onda 2 — v0.2 (+2-3 semanas)

**Tema: Integridade e rastreabilidade — "Aditivos, alertas e auditoria"**

| ID | Funcionalidade | Ref. PRD | Ref. UX Spec |
|---|---|---|---|
| **V02-01** | **Aditivos contratuais** | RF-03 | Seção 3.4 (Aditivos), Fluxo 2.5 |
| | Todos os 5 tipos (prazo, valor, misto, reajuste/repactuação, apostilamento). Modal de confirmação com comparativo antes/depois. Recálculo automático de valor global e vigência. | | |
| **V02-02** | **Alertas (sininho)** | RF-05 | Seção 2.6 |
| | Badge com contador no header. Dropdown com lista de alertas clicáveis. 3 tipos: vigência vencendo (90/60/30 dias), saldo baixo (< 20%), pagamento não registrado. | | |
| **V02-03** | **Log de auditoria** | RF-08 | Seção 3.9 |
| | Registro completo: usuário, timestamp, operação (criação/edição/exclusão), valor anterior/novo. Tela dedicada com filtros. | | |

**Adições à sidebar na Onda 2:**

```
  🔔  (sininho no header com badge)
  🕐  Auditoria  *
```

### 4.4 Onda 3 — v0.3 (+2-3 semanas após v0.2)

**Tema: Visibilidade gerencial — "Dashboard e relatórios"**

| ID | Funcionalidade | Ref. PRD | Ref. UX Spec |
|---|---|---|---|
| **V03-01** | **Dashboard gerencial** | RF-04 | Seção 3.2 |
| | 7 indicadores: contratos ativos, total contratado, total pago, empenhado/liquidado/pago no exercício, saldo baixo, vigências vencendo, pagamentos pendentes, evolução de desembolso 12 meses, ranking por volume. Filtro por exercício financeiro. Layout spacious. | | |
| **V03-02** | **Relatórios em PDF** | RF-06 | Seção 3.7 |
| | 3 relatórios: extrato completo do contrato, desembolso por período, contratos vigentes com saldos. Tela dedicada + atalho "Exportar PDF" na ficha do contrato. | | |
| **V03-03** | **Visão transversal de pagamentos** | RF-02 (complemento) | Seção 3.6 |
| | Tela com todos os pagamentos de todos os contratos, filtráveis por contrato, período e status. | | |

**Adições à sidebar na Onda 3:**

```
  📊  Dashboard   (torna-se a landing page)
  💰  Pagamentos  *
  📑  Relatórios
```

**A partir da Onda 3:** a landing page muda de "Contratos" para "Dashboard" para ambos os perfis, conforme definido na UX Spec.

### 4.5 Explicitamente FORA de todas as ondas (Considerações Futuras do PRD, Seção 9)

| Funcionalidade | Motivo da exclusão |
|---|---|
| Integração SIAFI / Siscontratos | Complexidade de integração desproporcional ao MVP |
| Upload de documentos (PDF, NF) | Adiciona infra de storage; dados estruturados são suficientes |
| Responsividade mobile / tablet | Desktop-only definido no PRD |
| Acessibilidade completa (eMAG/WCAG) | PRD define como versão futura |
| Controle granular por itens do contrato | PRD define controle por valor global apenas |
| Memória de cálculo (contratos variáveis) | Fiscal registra apenas valor final da fatura |
| Perfil de Gestor do Contrato | Apenas Fiscal e Diretor no MVP |
| Multi-tenant | Single-tenant (NUTEC/JFAP) |

---

## 5. Restrições Principais

| Restrição | Detalhamento |
|---|---|
| **Equipe** | 1 desenvolvedor (o próprio fiscal). Desenvolvimento solo. |
| **Prazo** | Imediato. Onda 1 deve ser deployada o mais rápido possível. |
| **Infraestrutura** | On-premise na JFAP. Docker (aplicação + PostgreSQL). |
| **Stack obrigatório** | Next.js 16 + TypeScript + TailwindCSS + shadcn/ui + PostgreSQL + NextAuth + Docker. |
| **Segurança** | Autenticação completa desde o dia 1 (órgão federal). LGPD. HTTPS. Criptografia em repouso. |
| **Navegadores** | Desktop apenas: Chrome, Firefox, Edge (versões atuais). |
| **Volume** | ~20 contratos ativos. Baixa concorrência (2 usuários máx.). |
| **Disponibilidade** | Sem SLA. Horário comercial. |

---

## 6. Métricas de Sucesso do MVP

### 6.1 Métricas da Onda 1 (v0.1) — Validação em 30 dias

| Métrica | Alvo | Como medir |
|---|---|---|
| **Adoção** | 100% dos contratos ativos cadastrados em 30 dias | Contagem no banco: contratos cadastrados vs. contratos reais da unidade |
| **Uso contínuo** | 100% dos pagamentos do mês registrados em até 5 dias após o ateste | Verificar datas de registro vs. datas de ateste |
| **Integridade** | Zero pagamentos registrados com quebra de ordem cronológica | Validação automática (RF-09) — deve bloquear 100% |
| **Utilidade percebida** | Fiscal consegue responder "qual o saldo do contrato X?" em menos de 30 segundos | Teste qualitativo (autoavaliação) |

### 6.2 Métricas da Onda 2 (v0.2)

| Métrica | Alvo |
|---|---|
| **Aditivos** | 100% dos aditivos existentes registrados retroativamente em 15 dias |
| **Alertas** | Zero contratos com vigência vencida sem ciência prévia (alerta disparado com ≥ 30 dias de antecedência) |
| **Auditoria** | Log cobrindo 100% das operações realizadas |

### 6.3 Métricas da Onda 3 (v0.3)

| Métrica | Alvo |
|---|---|
| **Visibilidade gerencial** | Diretor do NUTEC capaz de consultar situação geral sem perguntar ao fiscal |
| **Relatórios** | Tempo para gerar relatório de prestação de contas: < 2 minutos |
| **Satisfação** | Avaliação qualitativa positiva do Diretor do NUTEC |

---

## 7. Roadmap Visual Resumido

```
SEMANA    1    2    3    4    5    6    7    8    9
          ├─────────────────┤
          │   ONDA 1 (v0.1) │
          │   Autenticação   │
          │   Contratos      │
          │   Empenhos       │
          │   Pagamentos     │
          │   Validações     │
          │   Usuários       │
          ├─────────────────┤
                             ├──────────────┤
                             │  ONDA 2 (v0.2)│
                             │  Aditivos     │
                             │  Alertas      │
                             │  Auditoria    │
                             ├──────────────┤
                                             ├──────────────┤
                                             │  ONDA 3 (v0.3)│
                                             │  Dashboard    │
                                             │  Relatórios   │
                                             │  Pgtos Transv.│
                                             ├──────────────┤

          ◄── 30 dias validação Onda 1 ──►
```

---

## 8. Critérios de "Pronto para Deploy" por Onda

### Onda 1 — Go/No-Go Checklist

- [ ] Login funcional com todas as regras de segurança (senha forte, bloqueio, timeout).
- [ ] CRUD completo de contratos com todos os campos do PRD.
- [ ] Registro de empenhos (inicial + reforço) com cálculo de saldo disponível.
- [ ] Registro de pagamentos com preenchimento parcial (ateste → liquidação → pagamento).
- [ ] Cálculo automático de saldo contratual (valor global − total pago).
- [ ] Barra de progresso visual de consumo (verde/amarelo/vermelho).
- [ ] 4 regras de validação implementadas e testadas.
- [ ] Gestão de usuários (cadastro de Fiscal e Diretor).
- [ ] Docker Compose funcional (app + PostgreSQL).
- [ ] HTTPS configurado.
- [ ] Deploy no servidor da JFAP.

### Onda 2 — Go/No-Go Checklist

- [ ] 5 tipos de aditivo com modal de confirmação antes/depois.
- [ ] Recálculo automático de valor global e vigência após aditivo.
- [ ] Sininho com badge no header.
- [ ] Dropdown com 3 tipos de alerta (vigência, saldo, pagamento pendente).
- [ ] Clique no alerta navega para o contrato.
- [ ] Log de auditoria registrando todas as operações.
- [ ] Tela de auditoria com filtros.

### Onda 3 — Go/No-Go Checklist

- [ ] Dashboard com 7 indicadores + filtro de exercício.
- [ ] 3 relatórios em PDF gerados corretamente.
- [ ] 2 caminhos para extrato (tela de relatórios + botão na ficha).
- [ ] Visão transversal de pagamentos com filtros.
- [ ] Landing page alterada para Dashboard.
- [ ] Perfil Diretor com acesso adequado (somente leitura).

---

*Documento elaborado em processo iterativo de definição de MVP Lean. Versão 1.0 — 16/04/2026.*
