import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/session-provider";
import { AlertsProvider } from "@/components/layout/alerts-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { getAlerts } from "@/actions/alertas";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, alerts] = await Promise.all([auth(), getAlerts()]);

  return (
    <SessionProvider session={session}>
      <AlertsProvider alerts={alerts}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-auto">{children}</main>
        </div>
      </AlertsProvider>
    </SessionProvider>
  );
}
