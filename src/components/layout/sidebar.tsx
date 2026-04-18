"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ClipboardList,
  FileBarChart,
  Banknote,
  Scale,
  ChevronsUpDown,
  CircleUser,
  Sparkles,
} from "lucide-react";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { performLogout } from "@/lib/auth-client";
import { cn, getInitials } from "@/lib/utils";

type MenuItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    label: "Visão geral",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["FISCAL", "DIRETOR"],
      },
    ],
  },
  {
    label: "Operacional",
    items: [
      {
        label: "Contratos",
        href: "/contratos",
        icon: FileText,
        roles: ["FISCAL", "DIRETOR"],
      },
      {
        label: "Pagamentos",
        href: "/pagamentos",
        icon: Banknote,
        roles: ["FISCAL"],
      },
      {
        label: "Relatórios",
        href: "/relatorios",
        icon: FileBarChart,
        roles: ["FISCAL", "DIRETOR"],
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        label: "Usuários",
        href: "/usuarios",
        icon: Users,
        roles: ["FISCAL"],
      },
      {
        label: "Auditoria",
        href: "/auditoria",
        icon: ClipboardList,
        roles: ["FISCAL"],
      },
      {
        label: "Uso de IA",
        href: "/admin/ia-usage",
        icon: Sparkles,
        roles: ["FISCAL", "DIRETOR"],
      },
    ],
  },
];

function roleLabel(role: string | undefined) {
  if (role === "FISCAL") return "Fiscal de contratos";
  if (role === "DIRETOR") return "Diretor";
  return "";
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const initials = getInitials(userName);

  const visibleSections = userRole
    ? menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.roles.includes(userRole)),
        }))
        .filter((section) => section.items.length > 0)
    : [];

  return (
    <SidebarRoot collapsible="icon" className="border-r-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-1.5 py-1.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-[oklch(0.36_0.16_264)] text-sidebar-primary-foreground shadow-md ring-1 ring-sidebar-primary/25">
            <Scale className="size-[18px]" strokeWidth={2.25} />
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-semibold tracking-tight">
              ContratosJUS
            </span>
            <span className="truncate text-[11px] font-medium text-sidebar-foreground/60">
              JFAP · NUTEC
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="relative data-active:bg-sidebar-accent data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-5 data-active:before:w-[3px] data-active:before:-translate-y-1/2 data-active:before:rounded-r-full data-active:before:bg-sidebar-primary data-active:[&>svg]:text-sidebar-primary"
                        render={<Link href={item.href} />}
                      >
                        <Icon strokeWidth={2} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      sidebarMenuButtonVariants({ size: "lg" }),
                      "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                    )}
                  />
                }
              >
                <Avatar className="size-8 rounded-lg bg-gradient-to-br from-sidebar-primary to-[oklch(0.36_0.16_264)]">
                  <AvatarFallback className="rounded-lg bg-transparent text-[11px] font-semibold text-sidebar-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {userName || "\u00A0"}
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground/65">
                    {roleLabel(userRole) || userEmail || "\u00A0"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={12}
                className="w-60"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {userName || "Usuário"}
                      </span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {userEmail || roleLabel(userRole)}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <CircleUser />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={performLogout}>
                  <LogOut />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarRoot>
  );
}
