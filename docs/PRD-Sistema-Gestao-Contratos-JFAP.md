# 📄 Documento de Requisitos de Produto (PRD)

## Sistema de Gestão e Controle de Desembolso de Contratos — JFAP/NUTEC

| Campo | Valor |
|---|---|
| **Versão** | 1.0 |
| **Data** | 16 de abril de 2026 |
| **Unidade** | Núcleo de Tecnologia da Informação (NUTEC) — Seção Judiciária do Amapá (JFAP) |
| **Status** | Rascunho para aprovação |
| **Prazo de entrega do MVP** | Imediato |

---

## 1. Introdução / Visão Geral

O NUTEC da Seção Judiciária do Amapá (JFAP) atualmente não dispõe de nenhuma ferramenta estruturada (nem mesmo planilhas) para o acompanhamento financeiro dos contratos de prestação de serviços sob sua fiscalização. Essa ausência de controle gera risco de perda de prazos, estouro de valor global, falta de visibilidade gerencial e dificuldade em prestar contas a instâncias de controle interno e externo.

Este documento descreve os requisitos para o desenvolvimento de uma **aplicação web interna** destinada ao **fiscal de contratos** do NUTEC, cujo objetivo é permitir o **registro estruturado** e o **controle detalhado de desembolso** de contratos administrativos regidos pela **Lei 14.133/2021** (Nova Lei de Licitações) e pela **Lei 8.666/1993** (ainda vigente para contratos antigos), contemplando o ciclo orçamentário-financeiro de **empenho, liquidação e pagamento**, bem como os **aditivos contratuais**.

A aplicação será de **uso interno**, operada on-premise na infraestrutura da JFAP, e contemplará tanto o registro operacional (pelo fiscal) quanto a visibilidade gerencial (pelo diretor do NUTEC).

---

## 2. Objetivos / Metas

### 2.1 Objetivo Geral

Prover ao fiscal de contratos do NUTEC/JFAP uma ferramenta centralizada para registro manual e controle do ciclo financeiro de contratos de prestação de serviços, garantindo rastreabilidade, visibilidade gerencial e conformidade com as Leis 14.133/2021 e 8.666/1993.

### 2.2 Objetivos Específicos (SMART)

- **O1:** Centralizar, em uma única aplicação, o cadastro e acompanhamento de **100% dos contratos ativos** da unidade em até **30 dias** após o go-live.
- **O2:** Garantir o registro de **100% dos pagamentos mensais** em até **5 dias úteis** após o ateste do fiscal.
- **O3:** Eliminar a ocorrência de **contratos com vigência vencida sem aditivo** por esquecimento, mediante alertas automáticos de 90, 60 e 30 dias.
- **O4:** Eliminar a ocorrência de **estouro de valor global** sem aditivo prévio, por meio de validações e alertas em tempo real.
- **O5:** Reduzir o tempo de resposta a consultas gerenciais da direção do NUTEC, passando de horas para minutos, por meio de um dashboard consolidado.

---

## 3. Público-Alvo / Personas de Usuário

### 3.1 Persona 1 — Fiscal de Contratos (Usuário Principal)

- **Papel:** Responsável operacional pelo acompanhamento da execução dos contratos.
- **Quantidade inicial:** 1 usuário.
- **Permissões:** CRUD completo (contratos, pagamentos, aditivos, usuários).
- **Necessidades:**
  - Registrar contratos e seus metadados (identificação, vigência, financeiro, dotação).
  - Registrar eventos do ciclo financeiro (ateste, liquidação, pagamento) com datas distintas.
  - Registrar aditivos contratuais.
  - Visualizar saldos atualizados em tempo real.
  - Receber alertas sobre vigências e saldos.
  - Gerar relatórios em PDF para prestação de contas.

### 3.2 Persona 2 — Diretor do NUTEC (Usuário Gerencial)

- **Papel:** Supervisão gerencial dos contratos sob responsabilidade do NUTEC.
- **Quantidade inicial:** 1 usuário.
- **Permissões:** Somente leitura — acesso ao dashboard consolidado e aos relatórios.
- **Necessidades:**
  - Visão consolidada de todos os contratos.
  - Indicadores financeiros agregados.
  - Alertas de risco (saldos, vigências, pendências de registro).

---

## 4. Histórias de Usuário / Casos de Uso

### 4.1 Gestão de Contratos

- **HU-01:** Como **fiscal**, quero **cadastrar um novo contrato** informando identificação, fornecedor, regime legal, vigência, valor global, tipo de pagamento e dotação orçamentária, para iniciar o controle desde o ato da assinatura.
- **HU-02:** Como **fiscal**, quero **editar dados de um contrato** já cadastrado, para corrigir eventuais erros, mantendo o histórico preservado no log de auditoria.
- **HU-03:** Como **fiscal**, quero **listar e pesquisar contratos** por número, fornecedor, status (ativo/encerrado) e vigência, para localizar rapidamente registros específicos.
- **HU-04:** Como **fiscal**, quero **excluir um contrato**, com registro do evento no log de auditoria, para eliminar lançamentos indevidos.

### 4.2 Ciclo de Pagamento

- **HU-05:** Como **fiscal**, quero **registrar o ateste** do serviço prestado em um determinado mês de referência, para iniciar o ciclo de pagamento.
- **HU-06:** Como **fiscal**, quero **registrar o empenho** (nota de empenho e valor), para vincular o compromisso orçamentário ao contrato.
- **HU-07:** Como **fiscal**, quero **registrar a liquidação** (data e valor liquidado), para acompanhar o estágio da despesa.
- **HU-08:** Como **fiscal**, quero **registrar o pagamento** (data e valor pago), para fechar o ciclo financeiro daquele mês.
- **HU-09:** Como **fiscal**, quero **ver o saldo contratual atualizado automaticamente** (global, empenhado, liquidado, pago, restante) a cada lançamento, para manter controle em tempo real.

### 4.3 Aditivos Contratuais

- **HU-10:** Como **fiscal**, quero **registrar um aditivo** (prazo, valor, misto, reajuste/repactuação ou apostilamento) com número sequencial, data de assinatura, novos valores e justificativa, para manter o saldo e vigência sempre atualizados.

### 4.4 Dashboard e Alertas

- **HU-11:** Como **diretor do NUTEC**, quero **acessar um dashboard gerencial** com visão consolidada de todos os contratos, para tomar decisões informadas.
- **HU-12:** Como **fiscal**, quero **receber alertas** sobre vigências próximas do vencimento, saldo baixo e pagamentos não registrados, para agir preventivamente.

### 4.5 Relatórios

- **HU-13:** Como **fiscal/diretor**, quero **exportar relatórios em PDF** (extrato de contrato, desembolso por período, contratos vigentes), para prestação de contas e arquivamento.

### 4.6 Administração

- **HU-14:** Como **fiscal (administrador)**, quero **cadastrar, editar e desativar usuários** da aplicação, para gerenciar o acesso.
- **HU-15:** Como **qualquer usuário**, quero **autenticar com usuário e senha** de forma segura, para acessar a aplicação.

---

## 5. Requisitos Funcionais

### RF-01 — Gestão de Contratos

O sistema deve permitir o cadastro, edição, exclusão e consulta de contratos com os seguintes campos:

**Identificação:**
- Número do contrato (ex.: 012/2025)
- Número do processo administrativo (SEI ou similar)
- Objeto (descrição do serviço)
- Fornecedor (razão social + CNPJ)
- Regime legal (Lei 14.133/2021 ou Lei 8.666/1993)
- Modalidade de contratação (pregão, dispensa, inexigibilidade, etc.)

**Vigência:**
- Data de assinatura
- Data de início da vigência
- Data de fim da vigência
- Possibilidade de prorrogação (sim/não)

**Financeiro:**
- Valor global do contrato
- Tipo de pagamento (fixo mensal / variável por consumo / misto)
- Valor mensal estimado (quando fixo)
- Periodicidade de pagamento (mensal, bimestral, por demanda)

**Dotação Orçamentária:**
- Programa de trabalho
- Natureza da despesa

**Gestão:**
- Fiscal titular
- Fiscal substituto
- Gestor do contrato (campo informativo)

### RF-02 — Ciclo de Pagamento

O sistema deve permitir o registro do ciclo financeiro mensal com **eventos separados** e datas distintas:

1. **Ateste** — mês de referência, data do ateste, valor da nota fiscal, observações.
2. **Empenho** — número da nota de empenho, data, valor empenhado.
3. **Liquidação** — data da liquidação, valor liquidado.
4. **Pagamento** — data do pagamento, valor pago.

Para contratos com **pagamento variável** (ex.: consumo medido), o fiscal registra apenas o **valor final da fatura**, sem detalhamento de memória de cálculo.

### RF-03 — Aditivos Contratuais

O sistema deve permitir o registro dos seguintes tipos de aditivo:

- Aditivo de **prazo** (prorroga vigência)
- Aditivo de **valor** (acréscimo ou supressão)
- Aditivo **misto** (prazo + valor)
- **Reajuste / Repactuação** (recomposição por índice ou variação de custos)
- **Apostilamento** (alteração formal, ex.: troca de dotação orçamentária)

**Campos do aditivo:**
- Número do termo aditivo (1º TA, 2º TA, etc.)
- Tipo
- Data de assinatura
- Novo valor global (quando aplicável)
- Novo valor mensal (quando aplicável)
- Nova data fim de vigência (quando aplicável)
- Justificativa / observações

O saldo contratual e a vigência devem ser **recalculados automaticamente** após o registro de qualquer aditivo.

### RF-04 — Dashboard Gerencial

O sistema deve apresentar ao **Diretor do NUTEC** (e ao fiscal) um dashboard com os seguintes indicadores:

1. **Total de contratos ativos** e valor total contratado.
2. **Total empenhado / liquidado / pago** no exercício corrente.
3. **Contratos com saldo baixo** (abaixo de 20% do valor global).
4. **Contratos próximos ao fim da vigência** (90, 60, 30 dias).
5. **Pagamentos pendentes de registro** (gap entre ateste e pagamento, ou meses sem registro em contratos fixos).
6. **Evolução de desembolso mensal** (gráfico dos últimos 12 meses).
7. **Ranking de contratos por volume financeiro**.

### RF-05 — Alertas e Notificações

O sistema deve gerar alertas automáticos para:

- Vigência próxima do vencimento (90, 60 e 30 dias).
- Saldo contratual abaixo de 20%.
- Pagamento não registrado em contrato com pagamento fixo mensal, quando já transcorrido o mês de referência.

### RF-06 — Relatórios em PDF

O sistema deve permitir a exportação, em formato **PDF**, dos seguintes relatórios:

- **Extrato completo de um contrato**: ficha do contrato com histórico de pagamentos e aditivos.
- **Relatório consolidado de desembolso por período**: filtrável por intervalo de datas.
- **Relação de contratos vigentes**: com saldos atualizados (global, empenhado, liquidado, pago, restante).

### RF-07 — Autenticação e Gestão de Usuários

- Autenticação **local** (usuário e senha), sem integração com SSO/LDAP no MVP.
- Tela administrativa para **cadastro, edição e desativação** de usuários.
- Perfis: **Fiscal** (CRUD completo) e **Diretor** (somente leitura).

### RF-08 — Log de Auditoria

O sistema deve manter **log completo de alterações** em todas as entidades (contratos, pagamentos, aditivos, usuários), registrando:

- Usuário responsável pela ação.
- Data e hora (timestamp).
- Tipo de operação (criação, edição, exclusão).
- Valor anterior e valor novo (nos casos de edição).

### RF-09 — Regras de Validação

O sistema deve aplicar as seguintes regras de negócio:

- **Bloquear** registro de pagamento em contrato **encerrado/expirado**.
- **Alertar (sem bloquear)** quando o total pago + empenhado ultrapassar o valor global do contrato.
- **Bloquear** data de liquidação anterior ao ateste, ou pagamento anterior à liquidação (ordem cronológica).
- **Alertar** quando houver mês sem registro de pagamento em contrato com pagamento fixo mensal.

---

## 6. Requisitos Não Funcionais

### 6.1 Infraestrutura e Deploy

- **Hospedagem:** on-premise, em servidor interno da JFAP.
- **Containerização:** aplicação containerizada com **Docker** (aplicação + banco PostgreSQL).
- **Ambiente:** Linux (Ubuntu ou equivalente).

### 6.2 Segurança

- **Conformidade com LGPD** para tratamento de dados pessoais de prepostos/contatos.
- **Criptografia em repouso** no banco de dados PostgreSQL.
- **Política de senhas forte:**
  - Mínimo de 12 caracteres.
  - Obrigatório uso de letras maiúsculas, minúsculas, números e caracteres especiais.
  - Expiração periódica (ex.: 90 dias).
- **Bloqueio de conta** após 5 tentativas consecutivas de login inválido.
- **Timeout de sessão** após 30 minutos de inatividade.
- **Hash seguro** de senhas (bcrypt ou argon2).
- **HTTPS obrigatório** para todo o tráfego.

### 6.3 Performance e Volume

- Volume esperado: **~20 contratos ativos** simultâneos.
- Histórico acumulado ao longo dos anos (sem limite definido, porém de baixo volume).
- Tempo de resposta esperado: páginas devem carregar em menos de 2 segundos em condições normais.

### 6.4 Disponibilidade

- Sem SLA formal.
- Expectativa informal: aplicação disponível em horário comercial (08h–18h), dias úteis.

### 6.5 Compatibilidade

- **Navegadores suportados:** Google Chrome, Mozilla Firefox, Microsoft Edge (versões atuais, última major release).
- **Dispositivos:** apenas desktop. **Não será responsivo** para mobile/tablet no MVP.

### 6.6 Usabilidade

- Interface em **Português (Brasil)**.
- Valores monetários formatados em Real Brasileiro (R$), padrão pt-BR.
- Datas no formato DD/MM/AAAA.

### 6.7 Acessibilidade

- **Fora do escopo do MVP.** Considerado para versões futuras (eMAG / WCAG 2.1).

---

## 7. Considerações de Design / Stack Técnica

### 7.1 Stack Tecnológica

- **Frontend/Backend:** Next.js 16 + TypeScript
- **Estilização:** TailwindCSS + shadcn/ui
- **Banco de Dados:** PostgreSQL
- **Autenticação:** NextAuth (credentials provider)
- **Containerização:** Docker + Docker Compose

### 7.2 Diretrizes de Design

- Interface administrativa clean, desktop-first, com foco em **densidade de informação** (tabelas, dashboards).
- Utilização de componentes shadcn/ui padronizados (Data Tables, Forms, Dialogs, Charts).
- Mockups não foram produzidos nesta fase — design será validado iterativamente durante o desenvolvimento.

---

## 8. Métricas de Sucesso

### 8.1 Adoção e Uso

- **M1:** 100% dos contratos da unidade cadastrados em até 30 dias após o go-live.
- **M2:** 100% dos pagamentos mensais registrados em até 5 dias úteis após o ateste.

### 8.2 Eficiência Operacional

- **M3:** Redução do tempo gasto para responder a consultas gerenciais ou de auditoria sobre situação de contratos (de horas para minutos).
- **M4:** Zero contratos com vigência vencida sem aditivo por esquecimento.

### 8.3 Qualidade da Gestão

- **M5:** Zero contratos com valor global estourado sem aditivo prévio.
- **M6:** 100% dos alertas de vencimento de vigência acionados com, no mínimo, 90 dias de antecedência.

### 8.4 Satisfação

- **M7:** Avaliação qualitativa positiva do Diretor do NUTEC quanto à visibilidade proporcionada pelo dashboard (feedback direto).

---

## 9. Questões em Aberto / Considerações Futuras

Os seguintes itens **não fazem parte do MVP**, porém podem ser contemplados em versões futuras:

1. **Integração com SIAFI / Siscontratos** para eliminar registro manual e sincronizar empenhos/liquidações/pagamentos automaticamente.
2. **Upload de documentos digitais** (PDF de contrato assinado, termos aditivos, notas fiscais escaneadas, atestes).
3. **Responsividade mobile / tablet**.
4. **Acessibilidade completa** em conformidade com eMAG / WCAG 2.1.
5. **Controle granular por itens do contrato** (hoje o controle é apenas no valor global).
6. **Memória de cálculo detalhada** para contratos variáveis (registro de unidades consumidas × valor unitário).
7. **Perfil de Gestor do Contrato** com permissões próprias e distintas do fiscal.
8. **Arquitetura multi-tenant** para atender outras Seções Judiciárias da Justiça Federal.

---

## 10. Premissas e Restrições

### 10.1 Premissas

- O fiscal tem acesso facilitado às informações de empenho, liquidação e pagamento, repassadas pelo setor financeiro.
- O volume de contratos permanecerá em ordem de grandeza similar à atual (~20 contratos ativos) no curto e médio prazo.
- A infraestrutura on-premise da JFAP é suficiente para hospedar a aplicação containerizada.

### 10.2 Restrições

- Desenvolvimento e operação restritos à realidade e ao orçamento do NUTEC/JFAP.
- Aplicação estritamente de uso interno, sem exposição pública na internet.
- Prazo de entrega do MVP: **imediato** (priorização máxima).

---

## 11. Aprovações

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| Fiscal de Contratos (Product Owner) | | | |
| Diretor do NUTEC | | | |

---

*Documento elaborado em processo iterativo de elicitação de requisitos. Versão 1.0 — 16/04/2026.*
