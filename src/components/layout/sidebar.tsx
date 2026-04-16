"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/actions/auth";

const menuItems = [
  {
    label: "Contratos",
    href: "/contratos",
    icon: FileText,
    roles: ["FISCAL", "DIRETOR"],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: Users,
    roles: ["FISCAL"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Não exibir itens enquanto session carrega para evitar flash de conteúdo
  const filteredItems = userRole
    ? menuItems.filter((item) => item.roles.includes(userRole))
    : [];

  async function handleLogout() {
    await logoutAction();
    // Hard navigation para limpar estado client-side por completo
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/contratos" className="flex items-center gap-2">
          <span className="text-base font-semibold">NUTEC</span>
          <span className="text-xs text-muted-foreground">/ JFAP</span>
        </Link>
      </div>

      <Separator />

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Rodapé */}
      <div className="p-4">
        <div className="mb-2">
          <p className="truncate text-sm font-medium">
            {session?.user?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {userRole === "FISCAL" ? "Fiscal" : "Diretor"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
