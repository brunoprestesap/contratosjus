"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CircleUser, LogOut } from "lucide-react";
import { AlertDropdown } from "@/components/layout/alert-dropdown";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { performLogout } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, breadcrumbs, actions }: HeaderProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const userRole = session?.user?.role;
  const userEmail = session?.user?.email ?? "";
  const initials = getInitials(userName);

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-0 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-5" />

        <div className="min-w-0 flex-1">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumb>
              <BreadcrumbList className="mb-0.5 text-[11px]">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <BreadcrumbItem key={`${crumb.label}-${idx}`}>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage className="text-muted-foreground">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <>
                          <BreadcrumbLink render={<Link href={crumb.href} />}>
                            {crumb.label}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      )}
                    </BreadcrumbItem>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          ) : null}
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {actions}
          {actions && (
            <Separator orientation="vertical" className="mx-1 h-6" />
          )}
          <AlertDropdown />
          <Separator orientation="vertical" className="mx-1 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-auto gap-2.5 rounded-full px-1 py-1 hover:bg-accent"
                />
              }
            >
              <Avatar className="size-8 bg-gradient-to-br from-brand to-[oklch(0.36_0.16_264)]">
                <AvatarFallback className="bg-transparent text-[11px] font-semibold text-brand-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left leading-tight sm:flex">
                <span className="max-w-[160px] truncate text-sm font-medium">
                  {userName || "\u00A0"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {userRole === "FISCAL"
                    ? "Fiscal"
                    : userRole === "DIRETOR"
                      ? "Diretor"
                      : "\u00A0"}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {userName || "Usuário"}
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {userEmail ||
                      (userRole === "FISCAL" ? "Fiscal" : "Diretor")}
                  </span>
                </div>
              </DropdownMenuLabel>
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
        </div>
      </div>
    </header>
  );
}
