---
description: "2FA TOTP para perfil Fiscal (Google Authenticator / Authy)"
---

## Ordem de execução: 4 de 4 (Grupo D — Backlog)

Último por ser **a mudança mais invasiva**: altera fluxo de login, exige UI nova (setup + validação), toca todos os usuários. Fazer apenas depois que todo o resto estiver estável.

## Contexto

Senha forte + bloqueio por tentativas mitigam ataques básicos. 2FA bloqueia ataques com senha vazada (phishing, reuso). Para órgão federal com Fiscais que têm poder de criar/editar dados financeiros, o custo-benefício é alto.

## Passos

1. Instalar `otpauth` (TOTP RFC 6238).
2. Adicionar em `User` no schema: `totpSecret String?`, `totpEnabled Boolean @default(false)`, `backupCodes String[]`.
3. Criar tela `src/app/(dashboard)/perfil/2fa/page.tsx`:
   - Gerar secret, exibir QR code (`qrcode` package) com `otpauth://totp/Contratos-JFAP:email?secret=X&issuer=JFAP`.
   - Pedir que o usuário digite o código atual; se bater, marcar `totpEnabled = true`.
   - Gerar 10 códigos de backup de 8 caracteres, exibir uma vez, armazenar hash.
4. Alterar fluxo de login (`src/lib/auth.ts`):
   - Após senha correta, se `totpEnabled`, redirecionar para tela `/login/2fa` em vez de criar sessão.
   - Tela pede código TOTP (ou backup). Só aí cria sessão.
5. Política: tornar 2FA **obrigatório para Fiscal**, **opcional para Diretor** (leitura).
6. Recuperação: código de backup usado é invalidado. Se esgotar, Fiscal deve contatar outro Fiscal para reset (sem self-service — risco).
7. Testar: habilitar → logout → login com código correto / incorreto / backup.

## Validação

- Fiscal sem 2FA configurado é forçado à tela de setup no primeiro login pós-deploy.
- Login com código TOTP errado 5 vezes aciona bloqueio de conta (integra com `failedAttempts`).
- Secret nunca aparece no log (integra com redaction do logger, passo B3).
