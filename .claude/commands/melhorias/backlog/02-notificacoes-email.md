---
description: "Notificação por e-mail de contratos vencendo (30/60/90 dias)"
---

## Ordem de execução: 2 de 4 (Grupo D — Backlog)

Segundo porque **precisa de infra nova** (SMTP + scheduler) — mais pesado que CSV, mas menos que 2FA.

## Contexto

O sininho da Onda 2 só alerta quando o fiscal abre o sistema. Notificação por e-mail atinge o fiscal mesmo offline — essencial para contratos cuja falha de renovação tem custo jurídico.

## Passos

1. Decidir transporte:
   - **SMTP JFAP**: usar servidor interno (pedir config ao NUTEC).
   - **Resend/SendGrid**: mais simples, mas exige saída internet.
   - **Recomendação**: SMTP interno (alinha com rede fechada de órgão federal).
2. Instalar `nodemailer` + `@react-email/components` (templates em React).
3. Criar `src/lib/email/` com:
   - `transporter.ts` (configura SMTP)
   - `templates/contrato-vencendo.tsx` (template React Email)
   - `send.ts` (`sendEmail({ to, subject, component, props })`)
4. Criar Server Action `notificarContratosVencendo()` que:
   - Busca contratos com `vigenciaFim` entre hoje+29 e hoje+31 (e idem 59–61, 89–91).
   - Envia e-mail para o fiscal responsável.
   - Grava em tabela `NotificationLog` para evitar duplicata.
5. Decidir scheduler:
   - **`node-cron`** no processo Next.js (simples, mas morre em restart).
   - **Cron do SO** (`crontab -e`) chamando endpoint protegido com token (robusto).
   - **Recomendação**: cron do SO, chamando `POST /api/cron/notificar` com header `X-Cron-Token`.
6. Criar route handler protegido que só aceita chamadas com token.

## Validação

- Contrato com `vigenciaFim = hoje + 30` dispara e-mail ao rodar o job.
- Mesmo contrato não recebe segundo e-mail no dia seguinte (tabela `NotificationLog`).
- Template renderiza corretamente em Outlook e Gmail.
