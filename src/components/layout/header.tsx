import { Separator } from "@/components/ui/separator";
import { AlertDropdown } from "@/components/layout/alert-dropdown";

interface HeaderProps {
  title: string;
  userName?: string;
}

export function Header({ title, userName }: HeaderProps) {
  return (
    <header>
      <div className="flex h-14 items-center justify-between px-6">
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="flex items-center gap-4">
          <AlertDropdown />
          {userName && (
            <span className="text-sm text-muted-foreground">{userName}</span>
          )}
        </div>
      </div>
      <Separator />
    </header>
  );
}
