"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type SelectOption = { value: string; label: string; description?: string };

type MarketingSelectProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange(value: string): void;
  optional?: boolean;
  required?: boolean;
};

export function MarketingSelect({ id, label, name, value, options, placeholder, onChange, optional = false, required = false }: MarketingSelectProps) {
  const listId = useId();
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = value ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  function show(index = value && selectedIndex >= 0 ? selectedIndex : 0) {
    setActiveIndex(index);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onOptionKeyDown(event: React.KeyboardEvent<HTMLLIElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(index);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return <div className="marketing-select-field" ref={rootRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="marketing-select-label" id={labelId}>{label} {optional && <small>(optional)</small>}</span>
    <input type="hidden" name={name} value={value} />
    <button
      className="marketing-select-trigger"
      id={id}
      type="button"
      ref={triggerRef}
      aria-labelledby={`${labelId} ${id}-value`}
      aria-haspopup="listbox"
      aria-controls={listId}
      aria-expanded={open}
      aria-required={required}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          show(event.key === "ArrowUp" ? options.length - 1 : 0);
        } else if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
        }
      }}
    ><span id={`${id}-value`} className={selected ? "marketing-select-value" : "marketing-select-placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown size={18} aria-hidden="true" /></button>
    {open && <ul className="marketing-select-menu" id={listId} role="listbox" aria-labelledby={labelId}>
      {options.map((option, index) => <li
        key={option.value}
        ref={(node) => { optionRefs.current[index] = node; }}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={option.value === value}
        tabIndex={index === activeIndex ? 0 : -1}
        className="marketing-select-option"
        onClick={() => choose(index)}
        onKeyDown={(event) => onOptionKeyDown(event, index)}
      ><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check size={17} aria-hidden="true" />}</li>)}
    </ul>}
  </div>;
}
