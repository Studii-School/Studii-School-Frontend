"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audienceIsChecked, toggleAudience } from "@/lib/audience-selection";

export type AudienceOption<T extends string> = { value: T; label: string };

type AudiencePickerProps<T extends string> = {
  options: AudienceOption<T>[];
  everyone: T;
  classesValue: T;
  values: T[];
  onChange: (values: T[]) => void;
  classOptions: { value: string; label: string }[];
  selectedClasses: string[];
  onClassesChange: (ids: string[]) => void;
  disabled?: boolean;
};

function Choice({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${checked ? "border-primary bg-primary-light/40 text-primary" : "border-border bg-surface text-foreground hover:border-primary/50 hover:bg-surface-muted"}`}
    >
      <span aria-hidden="true" className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-[var(--school-primary-foreground)]" : "border-border bg-surface"}`}>
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export function AudiencePicker<T extends string>({ options, everyone, classesValue, values, onChange, classOptions, selectedClasses, onClassesChange, disabled }: AudiencePickerProps<T>) {
  const roleOptions = options.filter((item) => item.value !== everyone && item.value !== classesValue);
  const roleValues = roleOptions.map((item) => item.value);
  const change = (value: T) => onChange(toggleAudience(values, value, everyone, roleValues, classesValue));
  const everyoneOption = options.find((item) => item.value === everyone);
  const classesOption = options.find((item) => item.value === classesValue);
  const classesSelected = values.includes(classesValue);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {everyoneOption && <Choice label={everyoneOption.label} checked={values.includes(everyone)} onChange={() => change(everyone)} disabled={disabled} />}
        {roleOptions.map((item) => <Choice key={item.value} label={item.label} checked={audienceIsChecked(values, item.value, everyone, roleValues)} onChange={() => change(item.value)} disabled={disabled} />)}
      </div>
      {classesOption && (
        <div className="rounded-xl border bg-surface-muted/40 p-3">
          <Choice label={classesOption.label} checked={classesSelected} onChange={() => change(classesValue)} disabled={disabled} />
          {classesSelected && (
            <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {classOptions.length ? classOptions.map((item) => (
                <Choice
                  key={item.value}
                  label={item.label}
                  checked={selectedClasses.includes(item.value)}
                  disabled={disabled}
                  onChange={() => onClassesChange(selectedClasses.includes(item.value) ? selectedClasses.filter((id) => id !== item.value) : [...selectedClasses, item.value])}
                />
              )) : <p className="text-sm text-muted">No classes available.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type AudienceQuickEditProps<T extends string> = Omit<AudiencePickerProps<T>, "onChange" | "onClassesChange"> & {
  label: string;
  onSave: (values: T[], classIds: string[]) => Promise<void>;
};

export function AudienceQuickEdit<T extends string>({ label, values, selectedClasses, onSave, disabled, ...pickerProps }: AudienceQuickEditProps<T>) {
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState(values);
  const [draftClasses, setDraftClasses] = useState(selectedClasses);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setDraftValues(values);
      setDraftClasses(selectedClasses);
      setError("");
    }
    setOpen(!open);
  };
  const save = async () => {
    if (!draftValues.length) { setError("Select at least one audience."); return; }
    if (draftValues.includes(pickerProps.classesValue) && !draftClasses.length) { setError("Select at least one class."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(draftValues, draftValues.includes(pickerProps.classesValue) ? draftClasses : []);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audience could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <Button type="button" variant="outline" aria-expanded={open} aria-controls={panelId} disabled={disabled} onClick={toggle} className="px-3">
        Audience <ChevronDown size={15} className={open ? "rotate-180" : ""} />
      </Button>
      {open && (
        <div id={panelId} role="group" aria-label={label} className="absolute left-0 z-[80] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-surface p-4 shadow-xl sm:right-0 sm:left-auto">
          <p className="mb-3 text-sm font-semibold">Who can see this?</p>
          <AudiencePicker {...pickerProps} values={draftValues} selectedClasses={draftClasses} onChange={setDraftValues} onClassesChange={setDraftClasses} disabled={saving} />
          {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
          <div className="mt-4 flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save audience"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
