import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/session-provider";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-auto">{children}</main>
      </div>
    </SessionProvider>
  );
}
