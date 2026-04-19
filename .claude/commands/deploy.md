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

3. **Executar migrations pendentes:**

```bash
docker compose exec app npx prisma migrate deploy
```

4. **Verificar logs:**

```bash
docker compose logs -f app
```

5. **Smoke test manual:**

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
