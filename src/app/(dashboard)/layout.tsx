import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/session-provider";
import { AlertsProvider } from "@/components/layout/alerts-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
        <SidebarProvider>
          <Sidebar />
          <SidebarInset className="bg-muted/40">{children}</SidebarInset>
        </SidebarProvider>
      </AlertsProvider>
    </SessionProvider>
  );
}
