"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { dismissAlert, dismissAllAlerts } from "@/actions/alertas";
import type { Alert } from "@/lib/alerts";

interface AlertsContextValue {
  alerts: Alert[];
  unreadCount: number;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
}

const AlertsContext = createContext<AlertsContextValue>({
  alerts: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export function AlertsProvider({
  alerts: serverAlerts,
  children,
}: {
  alerts: Alert[];
  children: React.ReactNode;
}) {
  const [optimisticAlerts, setOptimisticAlerts] = useOptimistic(
    serverAlerts,
    (current: Alert[], alertId: string | null) => {
      if (alertId === null) {
        return current.map((a) => ({ ...a, read: true }));
      }
      return current.map((a) => (a.id === alertId ? { ...a, read: true } : a));
    },
  );

  const [, startTransition] = useTransition();

  function markAsRead(alertId: string) {
    startTransition(async () => {
      setOptimisticAlerts(alertId);
      await dismissAlert(alertId);
    });
  }

  function markAllAsRead() {
    const unreadIds = optimisticAlerts.filter((a) => !a.read).map((a) => a.id);
    if (unreadIds.length === 0) return;

    startTransition(async () => {
      setOptimisticAlerts(null);
      await dismissAllAlerts(unreadIds);
    });
  }

  const unreadCount = optimisticAlerts.filter((a) => !a.read).length;

  return (
    <AlertsContext.Provider
      value={{
        alerts: optimisticAlerts,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertsContext);
}
