"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "./input";
import { formatNumberInput, parseFormattedNumber } from "@/lib/number-format";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value?: number | null;
  onValueChange: (value: number) => void;
};

export function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  return (
    <Input
      {...props}
      inputMode="decimal"
      value={formatNumberInput(value)}
      onChange={(event) => onValueChange(parseFormattedNumber(event.target.value))}
    />
  );
}

export function MoneyInput({ value, onValueChange, ...props }: NumberInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">&#8358;</span>
      <NumberInput {...props} className={`pl-8 ${props.className ?? ""}`} value={value} onValueChange={onValueChange} />
    </div>
  );
}
