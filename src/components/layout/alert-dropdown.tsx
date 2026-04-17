"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Clock,
  CreditCard,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAlerts } from "@/components/layout/alerts-provider";
import type { AlertSeverity, AlertType } from "@/lib/alerts";

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-blue-500",
};

const SEVERITY_BG: Record<AlertSeverity, string> = {
  critical: "bg-destructive/10",
  warning: "bg-amber-500/10",
  info: "bg-blue-500/10",
};

const TYPE_ICONS: Record<AlertType, typeof Bell> = {
  EXPIRING: Clock,
  LOW_BALANCE: CreditCard,
  MISSING_PAYMENT: AlertTriangle,
};

export function AlertDropdown() {
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const tooltipLabel =
    unreadCount > 0
      ? `${unreadCount} alerta${unreadCount !== 1 ? "s" : ""} não lido${unreadCount !== 1 ? "s" : ""}`
      : "Alertas";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title={tooltipLabel}
            className="relative rounded-full text-muted-foreground hover:text-foreground"
          >
            <Bell
              className={
                unreadCount > 0
                  ? "h-[18px] w-[18px] text-foreground"
                  : "h-[18px] w-[18px]"
              }
              strokeWidth={2}
            />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="sr-only">Alertas</span>
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Alertas</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? "Nenhum alerta novo"
                : `${unreadCount} não lido${unreadCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todos
            </Button>
          )}
        </div>
        <Separator />
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Nenhum alerta no momento</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {alerts.map((alert) => {
              const Icon = TYPE_ICONS[alert.type];
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    alert.read ? "opacity-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-80"
                    onClick={() => {
                      if (!alert.read) markAsRead(alert.id);
                      setOpen(false);
                      router.push(`/contratos/${alert.contractId}`);
                    }}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEVERITY_BG[alert.severity]}`}
                    >
                      <Icon
                        className={`h-4 w-4 ${SEVERITY_COLORS[alert.severity]}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                  </button>
                  {!alert.read && (
                    <button
                      type="button"
                      className="mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Marcar como lido"
                      onClick={() => markAsRead(alert.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
