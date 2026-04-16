"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";

interface CnpjInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}

function applyMask(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function CnpjInput({
  value,
  onChange,
  onBlur,
  name,
  id,
  disabled,
}: CnpjInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
      onChange(raw);
    },
    [onChange]
  );

  return (
    <Input
      id={id}
      name={name}
      value={value ? applyMask(value) : ""}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder="00.000.000/0000-00"
      inputMode="numeric"
      maxLength={18}
    />
  );
}
