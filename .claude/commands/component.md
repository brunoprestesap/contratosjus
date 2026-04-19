---
description: "Cria um componente React seguindo padrões do projeto (shadcn/ui + TailwindCSS)"
argument-hint: "[caminho/nome] ex: contratos/contrato-form, layout/sidebar"
---

## Tarefa

Criar o componente `$ARGUMENTS`.

## Regras

1. **Arquivo:** `src/components/$ARGUMENTS.tsx`
2. **Naming:** PascalCase para componente, kebab-case para arquivo
3. **Estilização:** TailwindCSS only, usar CSS variables do shadcn/ui para cores
4. **Componentes base:** Usar shadcn/ui sempre que possível (Button, Input, Card, Table, Dialog, etc.)
5. **TypeScript:** Props tipadas com interface, export default
6. **Idioma:** Variáveis em inglês, textos visíveis em pt-BR
7. **Server/Client:** Usar "use client" somente se o componente precisa de interatividade (useState, useEffect, event handlers)

## Padrão de Formulário

Se for um formulário:

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaZod } from "@/lib/validators/entidade";
// shadcn/ui Form components
```

## Padrão de Tabela

Se for uma listagem/tabela:

- Usar DataTable do shadcn/ui
- Implementar: sorting, pagination, busca (se aplicável)
- Loading: Skeleton rows
- Empty: Mensagem + botão de ação

## Densidade Visual

- Telas operacionais (contratos, pagamentos, usuários): **dense** — `text-sm`, `py-2` em rows
- Dashboard: **spacious** — `text-base`/`text-lg`, `p-6` em cards
