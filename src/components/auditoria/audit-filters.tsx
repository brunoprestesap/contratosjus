"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

interface AuditFiltersProps {
  users: { id: string; name: string }[];
}

export function AuditFilters({ users }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUserId = searchParams.get("userId") ?? "";
  const currentEntity = searchParams.get("entity") ?? "";
  const currentAction = searchParams.get("action") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";

  const activeFilterCount = [
    currentUserId,
    currentEntity,
    currentAction,
    currentDateFrom,
    currentDateTo,
  ].filter((v) => v && v !== "ALL").length;

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    const userId = formData.get("userId") as string;
    const entity = formData.get("entity") as string;
    const action = formData.get("action") as string;
    const dateFrom = formData.get("dateFrom") as string;
    const dateTo = formData.get("dateTo") as string;

    if (userId && userId !== "ALL") params.set("userId", userId);
    if (entity && entity !== "ALL") params.set("entity", entity);
    if (action && action !== "ALL") params.set("action", action);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", "1");

    router.push(`/auditoria?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/auditoria");
  }

  return (
    <form action={applyFilters}>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="filter-user" className="text-xs text-muted-foreground">
            Usuário
          </Label>
          <Select
            name="userId"
            defaultValue={currentUserId || "ALL"}
            items={[
              { value: "ALL", label: "Todos os usuários" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          >
            <SelectTrigger id="filter-user" className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os usuários</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-entity" className="text-xs text-muted-foreground">
            Entidade
          </Label>
          <Select
            name="entity"
            defaultValue={currentEntity || "ALL"}
            items={{
              ALL: "Todas as entidades",
              Contract: "Contrato",
              Payment: "Pagamento",
              Commitment: "Empenho",
              Additive: "Aditivo",
              User: "Usuário",
            }}
          >
            <SelectTrigger id="filter-entity" className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as entidades</SelectItem>
              <SelectItem value="Contract">Contrato</SelectItem>
              <SelectItem value="Payment">Pagamento</SelectItem>
              <SelectItem value="Commitment">Empenho</SelectItem>
              <SelectItem value="Additive">Aditivo</SelectItem>
              <SelectItem value="User">Usuário</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-action" className="text-xs text-muted-foreground">
            Ação
          </Label>
          <Select
            name="action"
            defaultValue={currentAction || "ALL"}
            items={{
              ALL: "Todas as ações",
              CREATE: "Criação",
              UPDATE: "Edição",
              DELETE: "Exclusão",
            }}
          >
            <SelectTrigger id="filter-action" className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as ações</SelectItem>
              <SelectItem value="CREATE">Criação</SelectItem>
              <SelectItem value="UPDATE">Edição</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
            De
          </Label>
          <Input
            id="filter-from"
            type="date"
            name="dateFrom"
            defaultValue={currentDateFrom}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
            Até
          </Label>
          <Input
            id="filter-to"
            type="date"
            name="dateTo"
            defaultValue={currentDateTo}
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" className="h-8">
          Aplicar filtros
        </Button>
        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="mr-1 size-3.5" />
            Limpar
          </Button>
        )}
      </div>
    </form>
  );
}
