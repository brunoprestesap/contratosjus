---
description: "Checklist e comandos para deploy em produção no servidor da JFAP"
---

## Deploy para Produção

### Pré-requisitos

- Servidor Linux com Docker instalado
- Acesso SSH configurado
- Porta 443 liberada
- Let's Encrypt / Certbot instalado

### Passos

1. **No servidor:** Pull do código mais recente

```bash
cd /opt/contratos-jfap
git pull origin main
```

2. **Build e restart:**

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Migrations são aplicadas automaticamente pelo entrypoint do container (`prisma migrate deploy` idempotente antes de `node server.js`).

3. **Verificar logs:**

```bash
docker compose -f docker-compose.prod.yml logs app --tail=30
```

Esperado: `[entrypoint] Aplicando migrations...` → `No pending migrations to apply.` → `Ready in 0ms`.

4. **Smoke test manual:**

- [ ] Página de login acessível via HTTPS
- [ ] Login funcional
- [ ] Lista de contratos carrega
- [ ] Cadastro de contrato funciona
- [ ] Registro de pagamento funciona
- [ ] Sidebar correta por perfil

### Rollback

```bash
docker compose -f docker-compose.prod.yml down
git checkout HEAD~1
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Backup (executar ANTES do deploy)

```bash
docker compose exec db pg_dump -U postgres contratos > backup_$(date +%Y%m%d_%H%M%S).sql
```
