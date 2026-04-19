import { CheckCircle2, XCircle } from "lucide-react";

/**
 * Item de checklist binário usado no step "Finalizar" para exibir
 * os pré-requisitos da pesquisa (amostras suficientes, stats, justificativa).
 */
export function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
