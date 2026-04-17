"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiscalYearSelectProps {
  currentYear: number;
}

export function FiscalYearSelect({ currentYear }: FiscalYearSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("ano") ?? String(currentYear);

  // Show current year and 4 previous years
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function handleChange(value: string | null) {
    if (value) router.push(`/dashboard?ano=${value}`);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">
        Exercício:
      </span>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
