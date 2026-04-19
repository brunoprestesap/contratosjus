---
description: "Exportação CSV da lista de contratos com filtros aplicados"
---

## Ordem de execução: 1 de 4 (Grupo D — Backlog)

Primeiro do backlog porque é o **ganho mais rápido**: resolve 80% das necessidades de relatório ad-hoc sem a complexidade de PDFs da Onda 3.

## Contexto

Usuários de órgão federal frequentemente precisam exportar listas para Excel (prestação de contas interna, auditorias, apresentações). CSV cobre esse caso com código trivial.

## Passos

1. Criar `src/lib/csv.ts`:
   ```ts
   export function toCsv<T>(rows: T[], columns: { key: keyof T; label: string; format?: (v: any) => string }[]) {
     const header = columns.map(c => `"${c.label}"`).join(";");
     const body = rows.map(row =>
       columns.map(c => {
         const v = c.format ? c.format(row[c.key]) : row[c.key];
         return `"${String(v ?? "").replace(/"/g, '""')}"`;
       }).join(";")
     ).join("\n");
     return "\uFEFF" + header + "\n" + body; // BOM para Excel abrir em UTF-8
   }
   ```
2. Usar separador `;` (padrão Excel pt-BR, não `,`).
3. Criar route handler em `src/app/api/contratos/export/route.ts`:
   - Aceita mesmos query params da lista (`status`, `busca`).
   - Busca contratos, aplica `toCsv`, retorna com `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename=contratos-YYYY-MM-DD.csv`.
4. Adicionar botão "Exportar CSV" na toolbar da lista de contratos — `<a href="/api/contratos/export?...">`.
5. Testar abrindo no Excel em pt-BR — acentos e números devem aparecer corretos.

## Validação

- Arquivo abre no Excel com colunas separadas, acentos preservados.
- Filtros da lista são respeitados no export (mesma query).
- Valores monetários vêm como `"R$ 35.000,00"` (string), não número — evita auto-conversão do Excel.
