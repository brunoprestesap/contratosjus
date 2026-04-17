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
  availableYears: number[];
}

export function FiscalYearSelect({
  currentYear,
  availableYears,
}: FiscalYearSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("ano") ?? String(currentYear);

  const years =
    availableYears.length > 0 ? availableYears : [currentYear];

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
