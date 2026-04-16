"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: string | number | undefined;
  onChange: (value: number) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}

function formatToCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseFromCurrency(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function CurrencyInput({
  value,
  onChange,
  onBlur,
  name,
  id,
  disabled,
}: CurrencyInputProps) {
  const numValue =
    value !== undefined && value !== ""
      ? typeof value === "number"
        ? value
        : parseFromCurrency(String(value))
      : 0;

  const displayValue =
    value !== undefined && value !== ""
      ? `R$ ${formatToCurrency(numValue)}`
      : "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFromCurrency(e.target.value);
      onChange(parsed);
    },
    [onChange]
  );

  return (
    <Input
      id={id}
      name={name}
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder="R$ 0,00"
      inputMode="numeric"
    />
  );
}
