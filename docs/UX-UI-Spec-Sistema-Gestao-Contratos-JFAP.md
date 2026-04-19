# 📐 Especificação de UX & UI

## Sistema de Gestão e Controle de Desembolso de Contratos — JFAP/NUTEC

| Campo                 | Valor                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **Versão**            | 1.0                                                                |
| **Data**              | 16 de abril de 2026                                                |
| **PRD de Referência** | PRD v1.0 — Sistema de Gestão e Controle de Desembolso de Contratos |
| **Stack Frontend**    | Next.js 16 + TypeScript + TailwindCSS + shadcn/ui                  |
| **Status**            | Rascunho para aprovação                                            |

---

## 1. Arquitetura da Informação

### 1.1 Mapa de Telas / Páginas

```
Login
│
├── Dashboard (landing para ambos os perfis)
│
├── Contratos
│   ├── Lista de Contratos (busca, filtros, paginação)
│   ├── Novo Contrato (formulário longo em página única)
│   ├── Ficha do Contrato (visualização detalhada — página única com rolagem)
│   │   ├── Seção: Dados Cadastrais (colapsável)
│   │   ├── Seção: Vigência (colapsável)
│   │   ├── Seção: Dotação Orçamentária (colapsável)
│   │   ├── Seção: Gestão (colapsável)
│   │   ├── Seção: Empenhos (colapsável)
│   │   ├── Seção: Pagamentos (colapsável)
│   │   ├── Seção: Aditivos (colapsável)
│   │   └── Seção: Histórico / Auditoria (colapsável)
│   └── Editar Contrato (mesmo layout do formulário de cadastro, preenchido)
│
├── Pagamentos (visão transversal — todos os contratos)
│   └── Tabela com filtros por contrato, período, status
│
├── Relatórios
│   ├── Extrato Completo de Contrato (seleção + geração PDF)
│   ├── Desembolso por Período (filtro de datas + geração PDF)
│   └── Contratos Vigentes com Saldos (geração PDF)
│
├── Usuários (somente perfil Fiscal — admin)
│   ├── Lista de Usuários
│   └── Novo Usuário / Editar Usuário (página dedicada)
│
├── Auditoria (somente perfil Fiscal — admin)
│   └── Log geral de alterações (tabela com filtros)
│
└── Alertas (dropdown no sininho — não é página)
    └── Lista de alertas com link direto ao contrato/pagamento
```

### 1.2 Navegação por Perfil

| Item do Menu | Fiscal (Admin) | Diretor (Leitura)  |
| ------------ | -------------- | ------------------ |
| Dashboard    | ✅             | ✅                 |
| Contratos    | ✅ CRUD        | ✅ Somente leitura |
| Pagamentos   | ✅             | ❌                 |
| Relatórios   | ✅             | ✅                 |
| Usuários     | ✅             | ❌                 |
| Auditoria    | ✅             | ❌                 |

### 1.3 Estrutura da Sidebar

```
┌─────────────────────────┐
│  [Logo NUTEC / JFAP]    │
│                         │
├─────────────────────────┤
│                         │
│  📊  Dashboard          │
│  📄  Contratos          │
│  💰  Pagamentos    *    │
│  📑  Relatórios         │
│                         │
│  ─────────────────────  │
│                         │
│  👥  Usuários       *   │
│  🕐  Auditoria      *   │
│                         │
├─────────────────────────┤
│  👤  Nome do Usuário    │
│      Perfil: Fiscal     │
│      [Sair]             │
└─────────────────────────┘

* Itens marcados: visíveis apenas para perfil Fiscal (admin).
```

**Componente de alertas:** Ícone de sininho (🔔) posicionado no **canto superior direito** do header da aplicação, com badge numérico quando houver alertas não lidos.

### 1.4 Princípios de Densidade Visual

| Contexto                                                        | Abordagem             | Características                                                                                     |
| --------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Telas operacionais (Contratos, Pagamentos, Auditoria, Usuários) | **Dense data**        | Tipografia compacta (14px base), tabelas densas, espaçamento reduzido, mais informação por viewport |
| Dashboard                                                       | **Spacious & guided** | Tipografia maior (16-18px), mais respiro entre cards, gráficos amplos, foco em leitura rápida       |

---

## 2. Fluxos de Usuário Principais

### 2.1 Fluxo 1 — Login

```
[Tela de Login]
    │
    ├── Campos: Email + Senha
    ├── Validações:
    │   ├── Campos obrigatórios
    │   ├── Formato de email
    │   └── Bloqueio após 5 tentativas (exibir mensagem de conta bloqueada)
    │
    ├── ✅ Sucesso → Redireciona para Dashboard
    └── ❌ Erro → Mensagem "Credenciais inválidas" (genérica por segurança)
```

**Estados da tela:**

- **Padrão:** formulário vazio com campos email e senha.
- **Carregando:** botão "Entrar" com spinner, campos desabilitados.
- **Erro de credenciais:** mensagem de erro abaixo do formulário, campos preservados.
- **Conta bloqueada:** mensagem informativa, campos desabilitados, orientação para contatar administrador.
- **Sessão expirada:** mensagem informativa "Sua sessão expirou. Faça login novamente."

### 2.2 Fluxo 2 — Cadastro de Contrato

```
[Lista de Contratos] → Botão "+ Novo Contrato"
    │
    ▼
[Formulário — Página única com seções visuais]
    │
    ├── Seção 1: Identificação
    │   ├── Número do contrato (texto, obrigatório)
    │   ├── Número do processo administrativo (texto, obrigatório)
    │   ├── Objeto (textarea, obrigatório)
    │   ├── Fornecedor — Razão social (texto, obrigatório)
    │   ├── Fornecedor — CNPJ (texto com máscara, obrigatório, validação de CNPJ)
    │   ├── Regime legal (select: Lei 14.133/2021 | Lei 8.666/1993)
    │   └── Modalidade de contratação (select: Pregão | Dispensa | Inexigibilidade | etc.)
    │
    ├── Seção 2: Vigência
    │   ├── Data de assinatura (datepicker, obrigatório)
    │   ├── Data de início da vigência (datepicker, obrigatório)
    │   ├── Data de fim da vigência (datepicker, obrigatório)
    │   └── Possibilidade de prorrogação (toggle sim/não)
    │
    ├── Seção 3: Financeiro
    │   ├── Valor global do contrato (currency input, obrigatório)
    │   ├── Tipo de pagamento (select: Fixo mensal | Variável por consumo | Misto)
    │   ├── Valor mensal estimado (currency input, condicional — visível se tipo = Fixo ou Misto)
    │   └── Periodicidade de pagamento (select: Mensal | Bimestral | Por demanda)
    │
    ├── Seção 4: Dotação Orçamentária
    │   ├── Programa de trabalho (texto)
    │   └── Natureza da despesa (texto)
    │
    ├── Seção 5: Gestão
    │   ├── Fiscal titular (texto, obrigatório)
    │   ├── Fiscal substituto (texto)
    │   └── Gestor do contrato (texto)
    │
    ├── [Cancelar] → Volta para lista (com confirmação se houver dados preenchidos)
    └── [Salvar Contrato] → Validação → Sucesso → Redireciona para Ficha do Contrato
```

**Estados da tela:**

- **Padrão:** formulário vazio, seções visíveis com labels e placeholders.
- **Preenchimento parcial:** campos preenchidos preservados, validação inline em tempo real.
- **Erro de validação:** campos com erro destacados em vermelho, mensagem específica abaixo de cada campo, scroll automático para o primeiro erro.
- **Salvando:** botão com spinner, campos desabilitados.
- **Sucesso:** toast de confirmação "Contrato cadastrado com sucesso", redirecionamento automático.

### 2.3 Fluxo 3 — Registro de Pagamento Mensal

```
[Ficha do Contrato] → Seção Pagamentos → Botão "+ Registrar Pagamento"
    │
    ▼
[Modal ou seção expandida de registro]
    │
    ├── Mês de referência (month picker, obrigatório)
    ├── Valor da Nota Fiscal (currency input)
    │
    ├── ── Ateste ──
    │   ├── Data do ateste (datepicker)
    │   └── Observações (textarea)
    │
    ├── ── Liquidação ──
    │   ├── Data da liquidação (datepicker)
    │   └── Valor liquidado (currency input)
    │
    ├── ── Pagamento ──
    │   ├── Data do pagamento (datepicker)
    │   └── Valor pago (currency input)
    │
    ├── Validações:
    │   ├── Data de liquidação não pode ser anterior à data do ateste
    │   ├── Data de pagamento não pode ser anterior à data de liquidação
    │   ├── Alertar se total pago + empenhado ultrapassar valor global
    │   └── Bloquear se contrato estiver encerrado/expirado
    │
    ├── [Cancelar]
    └── [Salvar] → Atualiza tabela de pagamentos e saldo contratual
```

**Comportamento de preenchimento parcial:** O fiscal pode salvar com apenas o ateste preenchido (mínimo obrigatório para criar o registro). Liquidação e pagamento podem ser preenchidos depois, editando o registro existente. O **status** na tabela é calculado automaticamente:

| Campos preenchidos              | Status exibido |
| ------------------------------- | -------------- |
| Nenhum (mês sem registro)       | `Pendente`     |
| Ateste                          | `Atestado`     |
| Ateste + Liquidação             | `Liquidado`    |
| Ateste + Liquidação + Pagamento | `Pago`         |

### 2.4 Fluxo 4 — Registro de Empenho

```
[Ficha do Contrato] → Seção Empenhos → Botão "+ Registrar Empenho"
    │
    ▼
[Modal de registro]
    │
    ├── Número da Nota de Empenho (texto, obrigatório. Ex.: 2026NE000123)
    ├── Data do empenho (datepicker, obrigatório)
    ├── Valor empenhado (currency input, obrigatório)
    ├── Tipo (select: Empenho inicial | Reforço de empenho)
    ├── Observações (textarea)
    │
    ├── [Cancelar]
    └── [Salvar] → Atualiza tabela de empenhos e saldo disponível
```

### 2.5 Fluxo 5 — Registro de Aditivo

```
[Ficha do Contrato] → Seção Aditivos → Botão "+ Registrar Aditivo"
    │
    ▼
[Formulário de aditivo (na página ou modal)]
    │
    ├── Número do termo aditivo (texto, obrigatório. Ex.: 1º TA)
    ├── Tipo (select: Prazo | Valor | Misto | Reajuste/Repactuação | Apostilamento)
    ├── Data de assinatura (datepicker, obrigatório)
    ├── Novo valor global (currency, condicional — se tipo envolve valor)
    ├── Novo valor mensal (currency, condicional — se tipo envolve valor)
    ├── Nova data fim de vigência (datepicker, condicional — se tipo envolve prazo)
    ├── Justificativa / Observações (textarea, obrigatório)
    │
    ├── [Cancelar]
    └── [Salvar] → Abre Modal de Confirmação
         │
         ▼
    [Modal de Confirmação — antes/depois]
         │
         ├── Exibe comparativo:
         │   ├── Vigência: DD/MM/AAAA → DD/MM/AAAA
         │   ├── Valor Global: R$ XXX → R$ YYY
         │   └── Valor Mensal: R$ XXX → R$ YYY
         │
         ├── [Cancelar] → Volta ao formulário
         └── [Confirmar e Salvar] → Recalcula saldo e vigência automaticamente
              │
              └── Toast: "Aditivo registrado com sucesso"
```

### 2.6 Fluxo 6 — Alertas

```
[Qualquer tela] → Clique no sininho (🔔) no header
    │
    ▼
[Dropdown de alertas]
    │
    ├── Lista ordenada por prioridade/data:
    │   ├── 🔴 "Contrato 008/2024 — Vigência vence em 28 dias"
    │   ├── 🟡 "Contrato 012/2025 — Saldo abaixo de 20% (14%)"
    │   └── 🟠 "Contrato 007/2023 — Pagamento de Abr/2026 não registrado"
    │
    ├── Clique em alerta → Navega para ficha do contrato correspondente
    └── [Marcar todos como lidos]
```

**Tipos de alerta e prioridade visual:**

| Tipo                     | Ícone/Cor                                                    | Regra de disparo                                   |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------- |
| Vigência vencendo        | 🔴 Vermelho (< 30 dias), 🟡 Amarelo (30-60), 🔵 Azul (60-90) | Calculado diariamente                              |
| Saldo baixo (< 20%)      | 🟡 Amarelo                                                   | Recalculado a cada pagamento                       |
| Pagamento não registrado | 🟠 Laranja                                                   | Mês encerrado sem registro em contrato fixo mensal |

### 2.7 Fluxo 7 — Geração de Relatórios

```
Caminho 1: [Menu Relatórios]
    │
    ├── Selecionar tipo de relatório
    ├── Preencher parâmetros (contrato, período, etc.)
    └── [Gerar PDF] → Download do arquivo

Caminho 2: [Ficha do Contrato] → Botão [Exportar PDF]
    │
    └── Gera extrato completo do contrato diretamente → Download do arquivo
```

### 2.8 Fluxo 8 — Gestão de Usuários

```
[Menu Usuários] → Lista de Usuários
    │
    ├── Botão [+ Novo Usuário] → Página dedicada de cadastro
    │   ├── Nome completo (texto, obrigatório)
    │   ├── Email (email, obrigatório, único)
    │   ├── Senha temporária (password, obrigatório, com indicador de força)
    │   ├── Perfil (select: Fiscal | Diretor)
    │   ├── [Cancelar] → Volta para lista
    │   └── [Salvar] → Cria usuário → Volta para lista com toast de confirmação
    │
    ├── Botão [✏️ Editar] → Página de edição (mesmos campos, preenchidos)
    └── Botão [🗑️ Desativar] → Modal de confirmação → Desativa usuário
```

---

## 3. Especificações de Telas

### 3.1 Tela: Login

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│          ┌────────────────────┐              │
│          │  [Logo NUTEC/JFAP] │              │
│          │                    │              │
│          │  Sistema de Gestão │              │
│          │  de Contratos      │              │
│          │                    │              │
│          │  Email             │              │
│          │  [________________]│              │
│          │                    │              │
│          │  Senha             │              │
│          │  [________________]│              │
│          │                    │              │
│          │  [    Entrar     ] │              │
│          │                    │              │
│          └────────────────────┘              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

**Componentes shadcn/ui:** Card, Input, Button, Label, Form (com react-hook-form + zod).

**Estados:** Padrão | Carregando | Erro | Conta bloqueada | Sessão expirada.

### 3.2 Tela: Dashboard

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  Dashboard                                    🔔 3  👤    │
│ SIDEBAR │───────────────────────────────────────────────────────────│
│         │                                                           │
│  📊 *   │  Exercício: [2026 ▼]                                     │
│  📄     │                                                           │
│  💰     │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  📑     │  │ Contratos    │ │    Total     │ │    Total     │      │
│         │  │   Ativos     │ │  Contratado  │ │ Pago (exerc.)│      │
│  ─────  │  │     12       │ │  R$ 2.4 mi   │ │  R$ 890 mil  │      │
│         │  └──────────────┘ └──────────────┘ └──────────────┘      │
│  👥     │                                                           │
│  🕐     │  ┌───────────────────────┐ ┌─────────────────────────┐   │
│         │  │  Empenhado / Liquidado │ │  Evolução Desembolso    │   │
│  ─────  │  │  / Pago no exercício   │ │  Mensal (12 meses)      │   │
│  👤     │  │                       │ │                         │   │
│  Sair   │  │  [Barras empilhadas]  │ │  [Gráfico linha/barras] │   │
│         │  └───────────────────────┘ └─────────────────────────┘   │
│         │                                                           │
│         │  ┌───────────────────────┐ ┌─────────────────────────┐   │
│         │  │ ⚠️ Saldo Baixo (<20%) │ │ ⏳ Vigências Vencendo    │   │
│         │  │                       │ │                         │   │
│         │  │ Contrato 012/25 [14%] │ │ Contrato 008/24  28 dias│   │
│         │  │ Contrato 003/24 [ 8%] │ │ Contrato 015/25  45 dias│   │
│         │  └───────────────────────┘ └─────────────────────────┘   │
│         │                                                           │
│         │  ┌───────────────────────┐ ┌─────────────────────────┐   │
│         │  │ 📅 Pgtos Pendentes    │ │ 🏷️ Ranking por Volume    │   │
│         │  │                       │ │                         │   │
│         │  │ 012/25 - Abr/26      │ │ 1. 012/25    R$ 420k   │   │
│         │  │ 007/23 - Abr/26      │ │ 2. 003/24    R$ 380k   │   │
│         │  └───────────────────────┘ └─────────────────────────┘   │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

**Componentes shadcn/ui:** Card, Select (exercício), Badge, Table (para listas de alerta), Recharts (para gráficos).

**Grid layout:** 3 colunas para summary cards, 2 colunas para gráficos e listas de alerta.

**Comportamento:**

- Cards de resumo: número grande (text-3xl), label descritivo abaixo.
- Listas de alerta: itens clicáveis → navegam para ficha do contrato.
- Filtro de exercício: select no topo, recarrega todos os dados ao mudar.

### 3.3 Tela: Lista de Contratos

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  Contratos                            [+ Novo Contrato]   │
│ SIDEBAR │───────────────────────────────────────────────────────────│
│         │                                                           │
│         │  [Buscar por nº, fornecedor, objeto...  🔍]              │
│         │  Filtros: [Status ▼] [Regime Legal ▼] [Vigência ▼]       │
│         │                                                           │
│         │  ┌──────┬──────────────┬───────────┬──────────┬────────┐  │
│         │  │ Nº   │ Fornecedor   │ Objeto    │ Vigência │ Saldo  │  │
│         │  ├──────┼──────────────┼───────────┼──────────┼────────┤  │
│         │  │012/25│ Empresa XYZ  │ Suporte...│ 31/12/26 │ 45%    │  │
│         │  │003/24│ Telecom ABC  │ SMP...    │ 15/08/26 │  8% ⚠️ │  │
│         │  │015/25│ Empresa DEF  │ Link...   │ 01/03/27 │ 72%    │  │
│         │  └──────┴──────────────┴───────────┴──────────┴────────┘  │
│         │                                                           │
│         │  Mostrando 1-10 de 20 contratos     [< 1 2 >]            │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

**Componentes shadcn/ui:** Input (busca), Select (filtros), DataTable (com sorting, pagination), Button, Badge (status e alertas visuais).

**Comportamento:**

- Clique na linha → navega para ficha do contrato.
- Coluna "Saldo" com indicador visual: badge verde (> 50%), amarelo (20-50%), vermelho (< 20%).
- Coluna "Vigência" com badge de alerta se < 90 dias.
- Busca em tempo real (debounced, 300ms).
- Paginação: 10 itens por página, navegação anterior/próximo.

### 3.4 Tela: Ficha do Contrato (Visualização)

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  [← Voltar]  Contrato 012/2025                           │
│ SIDEBAR │                              [Editar] [Excluir] [📄 PDF] │
│         │───────────────────────────────────────────────────────────│
│         │                                                           │
│         │  ┌───────────────────────────────────────────────────┐    │
│         │  │  Empresa XYZ LTDA — CNPJ 12.345.678/0001-00      │    │
│         │  │  Objeto: Prestação de serviço de suporte técnico  │    │
│         │  │  Status: ● Ativo  |  Lei 14.133/2021  |  Pregão  │    │
│         │  │                                                   │    │
│         │  │  Valor Global: R$ 420.000,00                      │    │
│         │  │  Total Pago: R$ 175.000,00                        │    │
│         │  │  Saldo Restante: R$ 245.000,00 (58%)              │    │
│         │  │  [████████████░░░░░░░░░] 58%                      │    │
│         │  │                                                   │    │
│         │  │  Vigência: 01/01/2026 a 31/12/2026 (260 dias)    │    │
│         │  └───────────────────────────────────────────────────┘    │
│         │                                                           │
│         │  ▼ Dados Cadastrais                                      │
│         │  ┌───────────────────────────────────────────────────┐    │
│         │  │  Nº Contrato: 012/2025                            │    │
│         │  │  Processo: 0001234-56.2025.4.01.3100              │    │
│         │  │  Regime: Lei 14.133/2021                          │    │
│         │  │  Modalidade: Pregão Eletrônico                    │    │
│         │  └───────────────────────────────────────────────────┘    │
│         │                                                           │
│         │  ▶ Vigência (colapsado)                                  │
│         │                                                           │
│         │  ▶ Dotação Orçamentária (colapsado)                      │
│         │                                                           │
│         │  ▶ Gestão (colapsado)                                    │
│         │                                                           │
│         │  ▼ Empenhos                            [+ Novo Empenho]  │
│         │  ┌──────────────┬──────────┬──────────────┬────────────┐  │
│         │  │ Nota Empenho │ Data     │ Valor        │ Tipo       │  │
│         │  ├──────────────┼──────────┼──────────────┼────────────┤  │
│         │  │ 2026NE000123 │ 15/01/26 │ R$ 420.000   │ Inicial    │  │
│         │  │ 2026NE000456 │ 01/07/26 │ R$ 30.000    │ Reforço    │  │
│         │  ├──────────────┼──────────┼──────────────┼────────────┤  │
│         │  │              │          │ Saldo Disp.  │ R$ 275.000 │  │
│         │  └──────────────┴──────────┴──────────────┴────────────┘  │
│         │                                                           │
│         │  ▼ Pagamentos                       [+ Registrar Pgto]   │
│         │  ┌────────┬──────────┬────────┬────────┬────────┬───────┐ │
│         │  │Mês Ref.│Valor NF  │Ateste  │Liquid. │Pgto    │Status │ │
│         │  ├────────┼──────────┼────────┼────────┼────────┼───────┤ │
│         │  │Mar/2026│R$ 35.000 │✅ 05/04│✅ 18/04│✅ 25/04│ Pago  │ │
│         │  │Abr/2026│R$ 35.000 │✅ 03/05│⏳ ---  │--- --- │Atest. │ │
│         │  │Mai/2026│---       │⏳ ---  │--- --- │--- --- │Pend.  │ │
│         │  └────────┴──────────┴────────┴────────┴────────┴───────┘ │
│         │                                                           │
│         │  ▼ Aditivos                         [+ Registrar Aditivo]│
│         │  ┌──────────┬──────────────┬──────────┬─────────────────┐ │
│         │  │ Nº TA    │ Tipo         │ Data     │ Efeito          │ │
│         │  ├──────────┼──────────────┼──────────┼─────────────────┤ │
│         │  │ 1º TA    │ Misto        │ 15/06/26 │ +R$100k +6 meses│ │
│         │  └──────────┴──────────────┴──────────┴─────────────────┘ │
│         │                                                           │
│         │  ▼ Histórico / Auditoria                                 │
│         │  ┌──────────┬──────────┬──────────────────────────────┐   │
│         │  │ Data/Hora│ Usuário  │ Ação                         │   │
│         │  ├──────────┼──────────┼──────────────────────────────┤   │
│         │  │ 25/04 14h│ João     │ Registrou pgto Mar/2026      │   │
│         │  │ 12/04 09h│ João     │ Editou valor NF Abr (35k→34k)│  │
│         │  └──────────┴──────────┴──────────────────────────────┘   │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

**Componentes shadcn/ui:** Accordion (seções colapsáveis), Table/DataTable, Progress (barra de saldo), Badge (status), Button, Dialog (modais de confirmação), Tooltip.

**Comportamento das seções:**

- Seções colapsáveis via Accordion.
- Estado inicial sugerido: Dados Cadastrais expandido, demais colapsados (exceto Pagamentos, que tende a ser o mais acessado).
- Seções de Empenhos, Pagamentos e Aditivos possuem botões de ação no header da seção.

### 3.5 Tela: Formulário de Cadastro / Edição de Contrato

Mesmo layout do cadastro descrito no Fluxo 2 (seção 2.2), em **página dedicada** com formulário longo e seções visuais.

**Diferença entre cadastro e edição:**

- Cadastro: campos vazios, título "Novo Contrato".
- Edição: campos preenchidos, título "Editar Contrato 012/2025".
- Ambos compartilham o mesmo componente de formulário.

### 3.6 Tela: Pagamentos (Visão Transversal)

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  Pagamentos                                               │
│ SIDEBAR │───────────────────────────────────────────────────────────│
│         │                                                           │
│         │  Filtros:                                                 │
│         │  [Contrato ▼]  [Período: __/____ a __/____]  [Status ▼]  │
│         │                                                           │
│         │  ┌──────────┬────────┬──────────┬────────┬──────┬───────┐ │
│         │  │ Contrato │Mês Ref.│Valor NF  │Ateste  │Pgto  │Status │ │
│         │  ├──────────┼────────┼──────────┼────────┼──────┼───────┤ │
│         │  │ 012/2025 │Mar/2026│R$ 35.000 │✅ 05/04│✅25/04│ Pago │ │
│         │  │ 003/2024 │Mar/2026│R$ 2.241  │✅ 03/04│✅22/04│ Pago │ │
│         │  │ 012/2025 │Abr/2026│R$ 35.000 │✅ 03/05│--- --│Atest.│ │
│         │  │ 007/2023 │Abr/2026│---       │⏳ ---  │--- --│Pend. │ │
│         │  └──────────┴────────┴──────────┴────────┴──────┴───────┘ │
│         │                                                           │
│         │  Mostrando 1-20 de 48 registros     [< 1 2 3 >]          │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

**Comportamento:** Clique na linha → navega para ficha do contrato correspondente, na seção de Pagamentos.

### 3.7 Tela: Relatórios

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  Relatórios                                               │
│ SIDEBAR │───────────────────────────────────────────────────────────│
│         │                                                           │
│         │  ┌───────────────────────────────────────────────────┐    │
│         │  │  📄 Extrato Completo de Contrato                  │    │
│         │  │                                                   │    │
│         │  │  Selecione o contrato: [Dropdown ▼]               │    │
│         │  │                                   [Gerar PDF 📥]  │    │
│         │  └───────────────────────────────────────────────────┘    │
│         │                                                           │
│         │  ┌───────────────────────────────────────────────────┐    │
│         │  │  📄 Relatório de Desembolso por Período           │    │
│         │  │                                                   │    │
│         │  │  Data início: [__/__/____]                        │    │
│         │  │  Data fim:    [__/__/____]                        │    │
│         │  │                                   [Gerar PDF 📥]  │    │
│         │  └───────────────────────────────────────────────────┘    │
│         │                                                           │
│         │  ┌───────────────────────────────────────────────────┐    │
│         │  │  📄 Contratos Vigentes com Saldos                 │    │
│         │  │                                                   │    │
│         │  │  Data de referência: [Hoje ▼]                     │    │
│         │  │                                   [Gerar PDF 📥]  │    │
│         │  └───────────────────────────────────────────────────┘    │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

### 3.8 Tela: Gestão de Usuários

Layout conforme definido no Fluxo 8 (seção 2.8). Lista tabulada com ações, cadastro/edição em página dedicada.

### 3.9 Tela: Auditoria

```
┌─────────┬───────────────────────────────────────────────────────────┐
│         │  Log de Auditoria                                         │
│ SIDEBAR │───────────────────────────────────────────────────────────│
│         │                                                           │
│         │  Filtros:                                                 │
│         │  [Usuário ▼]  [Entidade ▼]  [Período: __ a __]  [Ação ▼]│
│         │                                                           │
│         │  ┌──────────────┬────────┬──────────┬────────────────────┐│
│         │  │ Data/Hora    │Usuário │ Entidade │ Descrição          ││
│         │  ├──────────────┼────────┼──────────┼────────────────────┤│
│         │  │25/04/26 14:32│ João   │Pgto 012  │Registrou pgto Mar  ││
│         │  │25/04/26 14:30│ João   │Pgto 012  │Editou valor NF     ││
│         │  │              │        │          │35.000 → 34.500     ││
│         │  │12/04/26 09:15│ João   │Contrato  │Cadastrou 012/2025  ││
│         │  └──────────────┴────────┴──────────┴────────────────────┘│
│         │                                                           │
│         │  Mostrando 1-50 de 312 registros     [< 1 2 3 4 5 6 >]  │
│         │                                                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

---

## 4. Padrões de Interação

### 4.1 Formulários

| Padrão                  | Especificação                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Validação**           | Inline em tempo real (onChange + onBlur). Mensagem de erro abaixo do campo. Campo com borda vermelha (destructive). |
| **Campos obrigatórios** | Marcados com asterisco (\*) vermelho.                                                                               |
| **Máscaras**            | CNPJ: XX.XXX.XXX/XXXX-XX. Moeda: R$ 999.999,99 (formato pt-BR). Datas: DD/MM/AAAA.                                  |
| **Submit**              | Botão primário com spinner durante processamento. Campos desabilitados durante submit.                              |
| **Cancelamento**        | Se houver dados preenchidos, exibe Dialog de confirmação "Deseja descartar as alterações?".                         |
| **Sucesso**             | Toast (shadcn/ui Sonner) no canto superior direito, duração 4 segundos.                                             |

### 4.2 Tabelas (DataTable)

| Padrão             | Especificação                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Sorting**        | Clique no header da coluna alterna ASC/DESC. Ícone de seta indica direção.                                                  |
| **Paginação**      | 10 itens por página (listas operacionais), 50 itens por página (auditoria). Navegação anterior/próximo + número de páginas. |
| **Linha clicável** | Cursor pointer ao hover. Background sutil no hover (muted). Clique navega para o detalhe.                                   |
| **Empty state**    | Ilustração simples + texto "Nenhum registro encontrado" + botão de ação (se aplicável).                                     |
| **Loading**        | Skeleton rows (shadcn/ui Skeleton) enquanto carrega.                                                                        |

### 4.3 Modais e Dialogs

| Padrão                      | Especificação                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Confirmação destrutiva**  | Dialog com título, descrição, botão "Cancelar" (outline) + botão "Confirmar" (destructive/vermelho). |
| **Confirmação informativa** | Dialog com comparativo antes/depois (usado em aditivos).                                             |
| **Tamanho**                 | Modais de formulário: largura máxima 600px. Modais de confirmação: largura máxima 480px.             |
| **Fechamento**              | Clique fora fecha (exceto modais destrutivos). Tecla ESC fecha.                                      |

### 4.4 Alertas e Notificações

| Tipo                    | Componente          | Comportamento                                                                                      |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| **Toast de sucesso**    | Sonner (shadcn/ui)  | Verde, canto superior direito, 4s, auto-dismiss                                                    |
| **Toast de erro**       | Sonner (shadcn/ui)  | Vermelho, canto superior direito, persistente até fechar                                           |
| **Alerta inline**       | Alert (shadcn/ui)   | Amarelo (warning) dentro de formulários para avisos não bloqueantes (ex.: estouro de valor global) |
| **Dropdown de alertas** | Popover (shadcn/ui) | Acionado pelo sininho, lista de até 20 alertas, scroll interno                                     |

### 4.5 Navegação e Transições

| Padrão                   | Especificação                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| **Sidebar ativa**        | Item ativo destacado com background (accent) e indicador lateral.                                 |
| **Breadcrumb**           | Não necessário — a sidebar já orienta. Botão "← Voltar" nas fichas de detalhe.                    |
| **Transições de página** | Sem animação complexa. Transição simples via Next.js router (instantâneo).                        |
| **Scroll**               | Scroll suave (smooth) ao navegar entre seções da ficha do contrato via âncoras (se implementado). |

---

## 5. Integração com Design System

### 5.1 Componentes shadcn/ui Utilizados

| Componente               | Uso no sistema                                                           |
| ------------------------ | ------------------------------------------------------------------------ |
| **Sidebar**              | Navegação principal lateral                                              |
| **Card**                 | Dashboard cards, cards de relatórios                                     |
| **DataTable**            | Listas de contratos, pagamentos, empenhos, aditivos, auditoria, usuários |
| **Form + Input + Label** | Todos os formulários                                                     |
| **Select**               | Filtros, selects de tipo, regime legal, modalidade, perfil               |
| **DatePicker**           | Campos de data (vigência, ateste, liquidação, pagamento)                 |
| **Dialog**               | Modais de confirmação (exclusão, aditivo)                                |
| **Accordion**            | Seções colapsáveis na ficha do contrato                                  |
| **Badge**                | Status de pagamento, alertas de saldo, alertas de vigência               |
| **Progress**             | Barra de consumo de saldo contratual                                     |
| **Popover**              | Dropdown de alertas (sininho)                                            |
| **Sonner (Toast)**       | Mensagens de sucesso e erro                                              |
| **Skeleton**             | Loading states em tabelas e cards                                        |
| **Alert**                | Avisos inline (estouro de valor, regras de validação)                    |
| **Button**               | Ações primárias, secundárias, destrutivas                                |
| **Separator**            | Divisores visuais na sidebar e seções                                    |
| **Tooltip**              | Informações contextuais em ícones e badges                               |

### 5.2 Grid e Layout

| Propriedade           | Valor                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Sidebar**           | Largura fixa: 256px (w-64). Colapsável em ícones: 64px (w-16).                                                   |
| **Área de conteúdo**  | Flex-1, padding 24px (p-6). Max-width: 1280px (max-w-7xl) centralizado.                                          |
| **Grid do dashboard** | Grid 3 colunas para cards (grid-cols-3). Grid 2 colunas para gráficos e listas (grid-cols-2). Gap: 24px (gap-6). |
| **Formulários**       | Máximo 2 colunas para campos curtos (grid-cols-2). Campos longos (objeto, justificativa) ocupam largura total.   |
| **Tabelas**           | Largura total do container. Scroll horizontal se necessário.                                                     |

### 5.3 Espaçamento

| Contexto                       | Espaçamento             |
| ------------------------------ | ----------------------- |
| **Entre seções**               | 32px (space-y-8)        |
| **Entre cards**                | 24px (gap-6)            |
| **Dentro de cards**            | 16px (p-4)              |
| **Entre campos de formulário** | 16px (space-y-4)        |
| **Dense tables (operacional)** | Row padding: 8px (py-2) |
| **Spacious cards (dashboard)** | Padding: 24px (p-6)     |

### 5.4 Tipografia

| Elemento                        | Classe TailwindCSS                       |
| ------------------------------- | ---------------------------------------- |
| **Título de página**            | text-2xl font-bold (dashboard: text-3xl) |
| **Título de seção**             | text-lg font-semibold                    |
| **Texto de tabela (dense)**     | text-sm                                  |
| **Números grandes (dashboard)** | text-3xl font-bold                       |
| **Labels**                      | text-sm font-medium                      |
| **Texto auxiliar**              | text-xs text-muted-foreground            |

### 5.5 Cores Semânticas

| Uso                            | Variável shadcn/ui            | Aplicação                         |
| ------------------------------ | ----------------------------- | --------------------------------- |
| **Status: Pago**               | `--chart-2` (verde)           | Badge em tabela de pagamentos     |
| **Status: Atestado/Liquidado** | `--chart-4` (amarelo)         | Badge em tabela de pagamentos     |
| **Status: Pendente**           | `--muted` (cinza)             | Badge em tabela de pagamentos     |
| **Alerta: Crítico**            | `--destructive` (vermelho)    | Vigência < 30 dias, saldo < 10%   |
| **Alerta: Atenção**            | `--chart-5` (laranja/amarelo) | Vigência 30-90 dias, saldo 10-20% |
| **Saldo saudável**             | `--chart-2` (verde)           | Progress bar > 50%                |
| **Saldo médio**                | `--chart-4` (amarelo)         | Progress bar 20-50%               |
| **Saldo crítico**              | `--destructive` (vermelho)    | Progress bar < 20%                |

---

## 6. Considerações de Acessibilidade

> **Nota:** Acessibilidade completa (eMAG/WCAG 2.1) está fora do escopo do MVP. No entanto, as práticas abaixo devem ser seguidas como fundação mínima, pois são de baixo esforço e facilitam a conformidade futura.

### 6.1 Práticas Mínimas no MVP

| Prática                   | Detalhamento                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **HTML semântico**        | Usar tags adequadas: `<nav>`, `<main>`, `<section>`, `<table>`, `<form>`, `<button>`.           |
| **Labels em formulários** | Todo input deve ter `<label>` associado via `htmlFor`.                                          |
| **Alt text**              | Imagens e ícones decorativos com `aria-hidden`. Ícones funcionais com `aria-label`.             |
| **Contraste mínimo**      | Seguir o tema padrão do shadcn/ui, que já atende contraste 4.5:1 para texto.                    |
| **Foco visível**          | Manter o outline padrão do shadcn/ui nos elementos focáveis. Não remover `outline` via CSS.     |
| **Navegação por teclado** | Componentes shadcn/ui já suportam navegação por teclado nativamente. Manter esse comportamento. |

### 6.2 Itens para Versão Futura

- Auditoria completa de contraste (WCAG 2.1 AA).
- Testes com leitor de tela (NVDA/JAWS).
- Skip links.
- Conformidade com eMAG.

---

## 7. Notas de Implementação Técnica

### 7.1 Mapeamento de Componentes e Páginas (Next.js App Router)

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx                    → Tela de Login
│
├── (dashboard)/
│   ├── layout.tsx                      → Layout com Sidebar + Header (sininho)
│   │
│   ├── page.tsx                        → Dashboard
│   │
│   ├── contratos/
│   │   ├── page.tsx                    → Lista de Contratos
│   │   ├── novo/
│   │   │   └── page.tsx               → Formulário: Novo Contrato
│   │   └── [id]/
│   │       ├── page.tsx               → Ficha do Contrato (visualização)
│   │       └── editar/
│   │           └── page.tsx           → Formulário: Editar Contrato
│   │
│   ├── pagamentos/
│   │   └── page.tsx                    → Visão Transversal de Pagamentos
│   │
│   ├── relatorios/
│   │   └── page.tsx                    → Tela de Relatórios
│   │
│   ├── usuarios/
│   │   ├── page.tsx                    → Lista de Usuários
│   │   ├── novo/
│   │   │   └── page.tsx               → Cadastro de Usuário
│   │   └── [id]/
│   │       └── editar/
│   │           └── page.tsx           → Edição de Usuário
│   │
│   └── auditoria/
│       └── page.tsx                    → Log de Auditoria
│
components/
├── layout/
│   ├── sidebar.tsx                     → Sidebar com menu filtrado por perfil
│   ├── header.tsx                      → Header com sininho de alertas
│   └── alert-dropdown.tsx              → Dropdown de alertas (Popover)
│
├── contratos/
│   ├── contrato-form.tsx               → Formulário reutilizável (cadastro/edição)
│   ├── contrato-card-resumo.tsx        → Cabeçalho resumo da ficha
│   ├── contrato-dados-cadastrais.tsx   → Seção accordion
│   ├── contrato-vigencia.tsx           → Seção accordion
│   ├── contrato-dotacao.tsx            → Seção accordion
│   ├── contrato-gestao.tsx             → Seção accordion
│   ├── empenhos-section.tsx            → Seção accordion + tabela + modal
│   ├── pagamentos-section.tsx          → Seção accordion + tabela + modal
│   ├── aditivos-section.tsx            → Seção accordion + tabela + modal confirmação
│   └── historico-section.tsx           → Seção accordion + timeline
│
├── dashboard/
│   ├── summary-cards.tsx               → Cards de resumo (3 colunas)
│   ├── chart-empenho-liquidado.tsx     → Gráfico barras empilhadas
│   ├── chart-evolucao-desembolso.tsx   → Gráfico linha/barras 12 meses
│   ├── alert-list-saldo.tsx            → Lista contratos saldo baixo
│   ├── alert-list-vigencia.tsx         → Lista vigências vencendo
│   ├── alert-list-pendentes.tsx        → Lista pagamentos pendentes
│   └── ranking-contratos.tsx           → Ranking por volume financeiro
│
├── pagamentos/
│   └── pagamento-form-modal.tsx        → Modal/formulário de registro
│
├── relatorios/
│   └── relatorio-card.tsx              → Card de seleção + geração de PDF
│
└── usuarios/
    └── usuario-form.tsx                → Formulário reutilizável (cadastro/edição)
```

### 7.2 Gerenciamento de Estado

| Tipo de Estado                                                    | Abordagem                                                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Estado do servidor** (contratos, pagamentos, etc.)              | React Server Components (RSC) para carga inicial. Server Actions para mutações. Revalidação via `revalidatePath` / `revalidateTag`. |
| **Estado de formulários**                                         | `react-hook-form` + `zod` para validação. Componentes controlados via shadcn/ui Form.                                               |
| **Estado de UI** (accordion aberto, filtros ativos, modal aberto) | `useState` local no componente. URL search params para filtros (persistência na URL).                                               |
| **Estado de autenticação**                                        | NextAuth session. Middleware para proteção de rotas. Server-side session check para renderização condicional (sidebar).             |

### 7.3 Considerações de Renderização

| Página             | Estratégia                    | Justificativa                                                                                    |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Dashboard          | **SSR (Server Component)**    | Dados sempre atualizados. Volume baixo (~20 contratos), sem necessidade de cache complexo.       |
| Lista de Contratos | **SSR + Search Params**       | Filtros e busca via URL search params. Renderização no servidor com paginação.                   |
| Ficha do Contrato  | **SSR + Client Islands**      | Página principal server-rendered. Seções interativas (accordion, modais) como Client Components. |
| Formulários        | **Client Component**          | Interatividade total (validação, máscaras, submit).                                              |
| Relatórios (PDF)   | **Server Action / API Route** | Geração de PDF no servidor (via lib como `@react-pdf/renderer` ou `puppeteer`).                  |

### 7.4 Performance

| Otimização                 | Detalhamento                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Paginação server-side**  | Todas as listagens paginadas no banco (LIMIT/OFFSET). Nunca carregar todos os registros.     |
| **Debounce na busca**      | 300ms de debounce no input de busca antes de disparar query.                                 |
| **Lazy loading de seções** | Seções colapsadas na ficha do contrato podem usar lazy loading (carregar dados ao expandir). |
| **Gráficos do dashboard**  | Recharts com dados pré-processados no servidor. Sem cálculos pesados no client.              |
| **PDF assíncrono**         | Geração de PDF como processo assíncrono. Loading state enquanto processa.                    |

---

## Apêndice A — Estados de Tela (Referência Rápida)

### A.1 Estados Globais

| Estado                      | Comportamento visual                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Carregando (página)**     | Skeleton layout (shadcn/ui Skeleton) que replica a estrutura da página.                                               |
| **Carregando (tabela)**     | Skeleton rows (5-10 linhas placeholder).                                                                              |
| **Carregando (botão/ação)** | Spinner no botão + campos desabilitados.                                                                              |
| **Vazio (lista sem dados)** | Ilustração simples + texto descritivo + botão de ação primária. Ex.: "Nenhum contrato cadastrado. [+ Novo Contrato]". |
| **Erro de servidor**        | Alert component (destructive) com mensagem genérica + botão "Tentar novamente".                                       |
| **Erro de validação**       | Campos com borda vermelha + mensagem abaixo. Scroll automático para primeiro erro.                                    |
| **Sucesso**                 | Toast (Sonner) verde, 4 segundos, auto-dismiss.                                                                       |

### A.2 Badge de Status de Pagamento

| Status    | Cor               | Texto       |
| --------- | ----------------- | ----------- |
| Pago      | Verde (default)   | `Pago`      |
| Liquidado | Azul (secondary)  | `Liquidado` |
| Atestado  | Amarelo (outline) | `Atestado`  |
| Pendente  | Cinza (muted)     | `Pendente`  |

### A.3 Badge de Saldo Contratual

| Faixa     | Cor      | Indicador                        |
| --------- | -------- | -------------------------------- |
| > 50%     | Verde    | Progress bar verde               |
| 20% — 50% | Amarelo  | Progress bar amarela             |
| < 20%     | Vermelho | Progress bar vermelha + ícone ⚠️ |

### A.4 Badge de Vigência

| Faixa        | Cor       | Indicador         |
| ------------ | --------- | ----------------- |
| > 90 dias    | Sem badge | Texto normal      |
| 60 — 90 dias | Azul      | Badge informativo |
| 30 — 60 dias | Amarelo   | Badge de atenção  |
| < 30 dias    | Vermelho  | Badge crítico     |

---

_Documento elaborado em processo iterativo de especificação de UX/UI. Versão 1.0 — 16/04/2026._
