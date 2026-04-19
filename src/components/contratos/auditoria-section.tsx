import Link from "next/link";
import { getContractAuditLogs } from "@/actions/auditoria";
import { formatAuditDescription } from "@/lib/audit-formatter";
import { formatDateTime } from "@/lib/format";
import { ArrowRight, ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";

const ACTION_DOT: Record<string, { icon: typeof Plus; bg: string; ring: string }> = {
  CREATE: {
    icon: Plus,
    bg: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  UPDATE: {
    icon: Pencil,
    bg: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  DELETE: {
    icon: Trash2,
    bg: "bg-red-500",
    ring: "ring-red-500/20",
  },
};

export async function AuditoriaSection({ contractId }: { contractId: string }) {
  const logs = await getContractAuditLogs(contractId);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Nenhum registro de auditoria</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Operações neste contrato aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-0">
          {logs.map((log) => {
            const dot = ACTION_DOT[log.action] ?? ACTION_DOT.UPDATE;
            const DotIcon = dot.icon;

            return (
              <div key={log.id} className="relative flex gap-3 py-2.5 first:pt-0">
                {/* Dot */}
                <div
                  className={`relative z-10 mt-0.5 flex size-[27px] shrink-0 items-center justify-center rounded-full ring-4 ${dot.bg} ${dot.ring}`}
                >
                  <DotIcon className="size-3 text-white" strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{log.userName}</span>
                    <span className="text-muted-foreground"> {formatAuditDescription(log)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70 tabular-nums">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t">
        <Link
          href={`/auditoria?entity=Contract&entityId=${contractId}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Ver histórico completo
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
