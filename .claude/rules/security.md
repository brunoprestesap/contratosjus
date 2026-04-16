# Segurança — Regras Obrigatórias

Este é um sistema de órgão federal (Justiça Federal). Segurança é inegociável.

- NUNCA commitar `.env`, `.env.local`, `.env.production` — usar `.env.example`
- NUNCA logar senhas, tokens ou dados sensíveis no console
- NUNCA retornar stack traces ao cliente — capturar erros e retornar mensagem genérica
- NUNCA armazenar senhas em texto plano — sempre bcrypt com custo 12
- NUNCA confiar em validação apenas no frontend — validar SEMPRE no Server Action com Zod
- Middleware de autenticação em TODAS as rotas exceto `/login`
- Middleware de autorização: verificar perfil (Fiscal/Diretor) antes de permitir mutations
- Perfil Diretor não pode executar nenhuma mutation (criar, editar, excluir)
- Bloqueio de conta após 5 tentativas inválidas — campo `failedAttempts` e `lockedUntil`
- Timeout de sessão: 30 minutos de inatividade
- Senha forte: mínimo 12 caracteres, maiúsculas, minúsculas, números, caracteres especiais
- HTTPS obrigatório em produção
- Headers de segurança no Next.js config (X-Frame-Options, X-Content-Type-Options, etc.)
