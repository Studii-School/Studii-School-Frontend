"use client";

import { useState } from "react";
import { Check, Plus, School, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { classTemplates } from "./academics.class-templates";
import { sortClasses } from "./academics.class-utils";
import { useAcademics } from "./academics-context";
import type {
  SchoolClass,
  SchoolLevel,
} from "./academics.types";

const schoolTypeOptions = [
  {
    value: "PRIMARY" as const,
    label: "Primary School",
    description: "For Creche, Nursery, KG and Primary classes",
  },
  {
    value: "SECONDARY" as const,
    label: "Secondary School",
    description: "For JSS and SS classes",
  },
];

export function SchoolTypeSettings() {
  const { settings, updateSettings } = useSchoolSettings();
  const { state } = useAcademics();
  const { confirm, toast } = useActionFeedback();

  const applyLevels = (levels: SchoolLevel[]) =>
    updateSettings((current) => ({ ...current, schoolLevels: levels }));

  const toggle = (level: SchoolLevel) => {
    if (!settings.schoolLevels.includes(level)) {
      applyLevels([...settings.schoolLevels, level]);
      return;
    }
    if (settings.schoolLevels.length === 1) {
      toast("Select at least one school type.", "warning");
      return;
    }

    const affected = state.classes.filter(
      (item) => item.level === level && item.status === "ACTIVE",
    );
    if (!affected.length) {
      applyLevels(settings.schoolLevels.filter((item) => item !== level));
      return;
    }

    confirm({
      title: `Remove ${level === "PRIMARY" ? "Primary School" : "Secondary School"}?`,
      description:
        "Its classes will be hidden from new selections, but old school records will remain.",
      confirmLabel: "Continue",
      destructive: true,
      onConfirm: () =>
        applyLevels(settings.schoolLevels.filter((item) => item !== level)),
    });
  };

  return (
    <div className="grid min-w-0 max-w-full gap-3 p-4 sm:grid-cols-2 sm:p-5">
      {schoolTypeOptions.map((option) => {
        const selected = settings.schoolLevels.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            className={`min-w-0 max-w-full rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--school-primary)] ${
              selected
                ? "border-[var(--school-primary)] bg-[color-mix(in_srgb,var(--school-primary)_8%,white)]"
                : "hover:bg-surface-muted"
            }`}
          >
            <span className="flex min-w-0 items-center justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                <School className="shrink-0" size={18} />
                <span className="break-words">{option.label}</span>
              </span>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                  selected
                    ? "border-[var(--school-primary)] bg-[var(--school-primary)] text-[var(--school-primary-foreground)]"
                    : ""
                }`}
              >
                {selected && <Check size={14} />}
              </span>
            </span>
            <span className="mt-1.5 block break-words text-sm text-muted">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EditableClassRow({
  schoolClass,
  onRemove,
}: {
  schoolClass: SchoolClass;
  onRemove: (schoolClass: SchoolClass) => void;
}) {
  const { updateClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [name, setName] = useState(schoolClass.displayName);
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setName(schoolClass.displayName);
      toast("Class name could not be updated.", "error");
      return;
    }
    if (trimmed === schoolClass.displayName) {
      if (name !== trimmed) setName(trimmed);
      return;
    }
    setSaving(true);
    try {
      await updateClass(schoolClass.id, {
        baseName: trimmed,
        suffix: "",
      });
      setName(trimmed);
      toast("Class name updated.", "success");
    } catch (caught) {
      setName(schoolClass.displayName);
      toast(
        caught instanceof Error && caught.message.includes("already exists")
          ? "This class name already exists."
          : "Class name could not be updated.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2 border-t py-3 first:border-t-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Input
          className="w-full min-w-0 max-w-full"
          aria-label={`Class name for ${schoolClass.displayName}`}
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setName(schoolClass.displayName);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        {name.replace(/\s+/g, " ").trim() !== schoolClass.displayName && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            aria-label={`Save ${schoolClass.displayName}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void saveName()}
          >
            <Check size={15} />
            Save
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onRemove(schoolClass)}
        >
          <Trash2 size={15} />
          Remove
        </Button>
      </div>
    </div>
  );
}

function InlineCustomClass({
  level,
  onClose,
}: {
  level: SchoolLevel;
  onClose: () => void;
}) {
  const { createCustomClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      toast("Class could not be added.", "error");
      return;
    }
    setSaving(true);
    try {
      await createCustomClass({
        level,
        source: "CUSTOM",
        baseName: trimmed,
        status: "ACTIVE",
      });
      toast("Custom class added.", "success");
      setName("");
      onClose();
    } catch (caught) {
      toast(
        caught instanceof Error && caught.message.includes("already exists")
          ? "This class name already exists."
          : "Class could not be added.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 min-w-0 max-w-full rounded-xl border bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <label className="min-w-0 flex-1 text-sm font-medium">
          Custom class name
          <Input
            autoFocus
            className="mt-2 w-full min-w-0 max-w-full"
            value={name}
            disabled={saving}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void add();
              }
            }}
            placeholder={
              level === "PRIMARY"
                ? "Primary 7 or Grade 6"
                : "Sixth Form or A-Level 1"
            }
          />
        </label>
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface"
          aria-label="Close custom class field"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" disabled={saving} onClick={() => void add()}>
          <Plus size={15} />
          {saving ? "Adding..." : "Add Custom Class"}
        </Button>
      </div>
    </div>
  );
}

function ClassesForLevel({
  level,
  title,
  helper,
  placeholder,
}: {
  level: SchoolLevel;
  title: string;
  helper: string;
  placeholder: string;
}) {
  const {
    state,
    createStandardClass,
    getClassUsage,
    removeClass,
    setClassStatus,
  } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const templates = classTemplates.filter((item) => item.level === level);
  const addedClasses = sortClasses(
    state.classes.filter(
      (item) => item.level === level && item.status === "ACTIVE",
    ),
  );
  const availableTemplates = templates.filter(
    (template) =>
      !state.classes.some(
        (item) =>
          item.templateKey === template.key &&
          item.source === "STANDARD" &&
          !item.suffix &&
          (item.status === "ACTIVE" || item.status === "ARCHIVED"),
      ),
  );

  const addSelected = async () => {
    if (!selectedTemplate) return;
    setAdding(true);
    try {
      const existing = state.classes.find(
        (item) =>
          item.templateKey === selectedTemplate &&
          item.source === "STANDARD" &&
          !item.suffix &&
          item.status !== "ARCHIVED",
      );
      if (existing) {
        await setClassStatus(existing.id, "ACTIVE");
      } else {
        await createStandardClass(selectedTemplate, { status: "ACTIVE" });
      }
      setSelectedTemplate("");
      toast("Class added.", "success");
    } catch (caught) {
      toast(
        caught instanceof Error && caught.message.includes("already exists")
          ? "This class name already exists."
          : "Class could not be added.",
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const remove = async (schoolClass: SchoolClass) => {
    try {
      const usage = await getClassUsage(schoolClass.id);
      confirm({
        title: `Remove ${schoolClass.displayName}?`,
        description:
          usage.total > 0
            ? "This class is already in use. It will be hidden from new selections, but its old records will remain."
            : "This class has no linked school records and will be removed.",
        confirmLabel: "Remove",
        destructive: true,
        onConfirm: async () => {
          const result = await removeClass(schoolClass.id);
          toast(
            result === "ARCHIVED"
              ? "This class is already in use and has been archived."
              : "Class removed.",
            result === "ARCHIVED" ? "warning" : "success",
          );
        },
      });
    } catch {
      toast("Class could not be removed.", "error");
    }
  };

  return (
    <section className="w-full min-w-0 max-w-full self-start rounded-xl border bg-surface">
      <header className="border-b px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 break-words text-xs text-muted">{helper}</p>
      </header>
      <div className="min-w-0 max-w-full p-4 sm:p-5">
        <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium">
            Add a class
            <Select
              className="mt-2 w-full min-w-0 max-w-full"
              label={placeholder}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              placeholder={placeholder}
              emptyMessage={`All available ${level === "PRIMARY" ? "primary" : "secondary"} classes have been added.`}
              options={availableTemplates.map((template) => ({
                value: template.key,
                label: template.defaultName,
              }))}
            />
          </label>
          <Button
            type="button"
            className="w-full shrink-0 sm:w-auto"
            disabled={!selectedTemplate || adding}
            onClick={() => void addSelected()}
          >
            <Plus size={15} />
            {adding ? "Adding..." : "Add Class"}
          </Button>
        </div>

        <div className="mt-5 min-w-0 max-w-full">
          <h3 className="text-sm font-semibold">{title} Added</h3>
          {addedClasses.length ? (
            <div className="mt-2 min-w-0 max-w-full rounded-xl border px-3">
              {addedClasses.map((schoolClass) => (
                <EditableClassRow
                  key={`${schoolClass.id}-${schoolClass.updatedAt}`}
                  schoolClass={schoolClass}
                  onRemove={(item) => void remove(item)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-dashed p-4 text-sm text-muted">
              No {level === "PRIMARY" ? "primary" : "secondary"} classes added
              yet.
            </p>
          )}
        </div>

        {showCustom ? (
          <InlineCustomClass
            level={level}
            onClose={() => setShowCustom(false)}
          />
        ) : (
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            onClick={() => setShowCustom(true)}
          >
            <Plus size={15} />
            Add custom class
          </Button>
        )}
      </div>
    </section>
  );
}

export function ClassesSettings() {
  const { settings } = useSchoolSettings();
  return (
    <div className="grid w-full min-w-0 max-w-full items-start gap-6">
      {settings.schoolLevels.includes("PRIMARY") && (
        <ClassesForLevel
          level="PRIMARY"
          title="Primary Classes"
          helper="Choose the primary classes available in your school."
          placeholder="Select a primary class"
        />
      )}
      {settings.schoolLevels.includes("SECONDARY") && (
        <ClassesForLevel
          level="SECONDARY"
          title="Secondary Classes"
          helper="Choose the secondary classes available in your school."
          placeholder="Select a secondary class"
        />
      )}
    </div>
  );
}
