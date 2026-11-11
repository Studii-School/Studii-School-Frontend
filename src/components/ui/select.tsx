"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: string;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Select an option",
  emptyMessage = "No options found.",
  disabled,
  error,
  searchable,
  clearable,
  className,
  triggerClassName,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const filtered = useMemo(
    () =>
      options.filter((item) =>
        `${item.label} ${item.description ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [options, query],
  );
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={root}
      className={cn("relative min-w-0 max-w-full", className)}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        className={cn(
          "flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-[10px] border bg-surface px-3 text-left text-sm focus:border-[var(--school-primary)] disabled:opacity-50",
          error && "border-danger",
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) =>
              Math.min(current + 1, filtered.length - 1),
            );
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.max(current - 1, 0));
          }
          if (event.key === "Enter" && open && filtered[active]) {
            event.preventDefault();
            choose(filtered[active]);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-muted",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Clear ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
            >
              <X size={15} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {open && (
        <div className="absolute inset-x-0 z-[80] mt-1 max-h-[min(20rem,60vh)] min-w-0 max-w-full overflow-hidden rounded-xl border bg-surface shadow-xl">
          {searchable && (
            <label className="relative block border-b p-2">
              <span className="sr-only">Search {label}</span>
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                size={15}
              />
              <Input
                autoFocus
                className="h-9 min-w-0 max-w-full pl-8"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
            </label>
          )}
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1"
          >
            {filtered.length ? (
              filtered.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <button
                    type="button"
                    disabled={option.disabled}
                    className={cn(
                      "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-surface-muted focus:bg-surface-muted",
                      index === active && "bg-surface-muted",
                      option.value === value &&
                        "font-semibold text-[var(--school-primary)]",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                  >
                    <span className="min-w-0 break-words">
                      {option.label}
                      {option.description && (
                        <span className="block text-xs font-normal text-muted">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {option.value === value && (
                      <Check className="shrink-0" size={16} />
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-sm text-muted">
                {emptyMessage}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MultiSelect({
  values,
  onChange,
  options,
  label,
  placeholder = "Select options",
  emptyMessage = "No options found.",
  error,
  searchable,
}: Omit<SelectProps, "value" | "onChange"> & {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      options.filter((item) =>
        `${item.label} ${item.description ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [options, query],
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={root} className="relative min-w-0 max-w-full">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-[10px] border bg-surface px-3 text-left text-sm",
          error && "border-danger",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !values.length && "text-muted",
          )}
        >
          {values.length
            ? options
                .filter((item) => values.includes(item.value))
                .map((item) => item.label)
                .join(", ")
            : placeholder}
        </span>
        <ChevronDown className="shrink-0" size={16} />
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {open && (
        <div
          role="listbox"
        aria-multiselectable="true"
          className="absolute inset-x-0 z-[80] mt-1 max-h-[min(20rem,60vh)] min-w-0 max-w-full overflow-hidden rounded-xl border bg-surface shadow-xl"
        >
          {searchable && (
            <label className="relative block border-b p-2">
              <span className="sr-only">Search {label}</span>
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                size={15}
              />
              <Input
                autoFocus
                className="h-9 min-w-0 max-w-full pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length ? (
            filtered.map((option) => {
              const selected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  className={cn(
                    "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-surface-muted",
                    option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                    selected &&
                      "font-semibold text-[var(--school-primary)]",
                  )}
                  onClick={() =>
                    onChange(
                      selected
                        ? values.filter((item) => item !== option.value)
                        : [...values, option.value],
                      )
                  }
                >
                  <span className="min-w-0 break-words">
                    {option.label}
                    {option.description && (
                      <span className="block text-xs font-normal text-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="shrink-0" size={16} />}
                </button>
              );
            })
          ) : (
            <p className="p-4 text-center text-sm text-muted">{emptyMessage}</p>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
