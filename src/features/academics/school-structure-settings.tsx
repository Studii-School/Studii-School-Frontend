"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Check, Plus, School, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { classTemplates } from "./academics.class-templates";
import { sortClasses } from "./academics.class-utils";
import { useAcademics } from "./academics-context";
import type {
  ClassTemplate,
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
  onToggle,
  onRemove,
}: {
  schoolClass: SchoolClass;
  onToggle: (schoolClass: SchoolClass) => void;
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
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <span className={`mr-1 text-xs font-semibold ${schoolClass.status === "ACTIVE" ? "text-success" : "text-muted"}`}>
          {schoolClass.status === "ACTIVE" ? "Active" : "Inactive"}
        </span>
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
          variant={schoolClass.status === "ACTIVE" ? "outline" : "primary"}
          onClick={() => onToggle(schoolClass)}
        >
          {schoolClass.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </Button>
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
}: {
  level: SchoolLevel;
  title: string;
  helper: string;
}) {
  const {
    state,
    createStandardClass,
    getClassUsage,
    removeClass,
    setClassStatus,
  } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [changingClass, setChangingClass] = useState<string>();
  const [changingAll, setChangingAll] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const templates = classTemplates.filter((item) => item.level === level);
  const levelClasses = sortClasses(
    state.classes.filter(
      (item) => item.level === level,
    ),
  );
  const standardClasses = templates.map((template) => ({
    template,
    schoolClass: levelClasses.find(
      (item) =>
        item.templateKey === template.key &&
        item.source === "STANDARD" &&
        !item.suffix,
    ),
  }));
  const customClasses = levelClasses.filter(
    (item) => item.source === "CUSTOM",
  );

  const setTemplateActive = async (
    template: ClassTemplate,
    schoolClass: SchoolClass | undefined,
    active: boolean,
    showToast = true,
  ) => {
    const actionKey = schoolClass?.id ?? template.key;
    setChangingClass(actionKey);
    try {
      if (active && !schoolClass) {
        await createStandardClass(template.key, { status: "ACTIVE" });
      } else if (schoolClass) {
        await setClassStatus(
          schoolClass.id,
          active ? "ACTIVE" : "ARCHIVED",
        );
      }
      if (showToast) {
        toast(
          `${template.defaultName} ${active ? "activated" : "deactivated"}.`,
          "success",
        );
      }
    } catch (caught) {
      if (showToast) {
        toast(
          caught instanceof Error
            ? caught.message
            : `Class could not be ${active ? "activated" : "deactivated"}.`,
          "error",
        );
      }
      if (!showToast) throw caught;
    } finally {
      setChangingClass(undefined);
    }
  };

  const toggleCustomClass = async (schoolClass: SchoolClass) => {
    const active = schoolClass.status !== "ACTIVE";
    setChangingClass(schoolClass.id);
    try {
      await setClassStatus(
        schoolClass.id,
        active ? "ACTIVE" : "ARCHIVED",
      );
      toast(
        `${schoolClass.displayName} ${active ? "activated" : "deactivated"}.`,
        "success",
      );
    } catch (caught) {
      toast(
        caught instanceof Error
          ? caught.message
          : `Class could not be ${active ? "activated" : "deactivated"}.`,
        "error",
      );
    } finally {
      setChangingClass(undefined);
    }
  };

  const setAllActive = async (active: boolean) => {
    setChangingAll(true);
    try {
      if (active) {
        for (const item of standardClasses) {
          if (item.schoolClass?.status !== "ACTIVE") {
            await setTemplateActive(
              item.template,
              item.schoolClass,
              true,
              false,
            );
          }
        }
        for (const schoolClass of customClasses) {
          if (schoolClass.status !== "ACTIVE") {
            await setClassStatus(schoolClass.id, "ACTIVE");
          }
        }
      } else {
        for (const schoolClass of levelClasses) {
          if (schoolClass.status === "ACTIVE") {
            await setClassStatus(schoolClass.id, "ARCHIVED");
          }
        }
      }
      toast(
        `All ${level === "PRIMARY" ? "primary" : "secondary"} classes ${active ? "activated" : "deactivated"}.`,
        "success",
      );
    } catch (caught) {
      toast(
        caught instanceof Error
          ? caught.message
          : `Classes could not be ${active ? "activated" : "deactivated"}.`,
        "error",
      );
    } finally {
      setChangingAll(false);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 break-words text-xs text-muted">{helper}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={changingAll}
              onClick={() => void setAllActive(true)}
            >
              Activate All
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={changingAll}
              onClick={() => void setAllActive(false)}
            >
              Deactivate All
            </Button>
          </div>
        </div>
      </header>
      <div className="min-w-0 max-w-full p-4 sm:p-5">
        <div className="min-w-0 max-w-full overflow-hidden rounded-xl border">
          {standardClasses.map(({ template, schoolClass }) => {
            const active = schoolClass?.status === "ACTIVE";
            const actionKey = schoolClass?.id ?? template.key;
            return (
              <div
                key={template.key}
                className="flex min-w-0 items-center justify-between gap-3 border-t px-3 py-3 first:border-t-0 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {schoolClass?.displayName ?? template.defaultName}
                  </p>
                  <p className={`mt-0.5 text-xs font-medium ${active ? "text-success" : "text-muted"}`}>
                    {active ? "Active" : "Inactive"}
                  </p>
                </div>
                <Button
                  type="button"
                  className="shrink-0"
                  variant={active ? "outline" : "primary"}
                  disabled={changingAll || changingClass === actionKey}
                  onClick={() =>
                    void setTemplateActive(template, schoolClass, !active)
                  }
                >
                  {changingClass === actionKey
                    ? "Saving..."
                    : active
                      ? "Deactivate"
                      : "Activate"}
                </Button>
              </div>
            );
          })}
        </div>

        {customClasses.length > 0 && (
          <div className="mt-5 min-w-0 max-w-full">
            <h3 className="text-sm font-semibold">Custom classes</h3>
            <div className="mt-2 min-w-0 max-w-full rounded-xl border px-3">
              {customClasses.map((schoolClass) => (
                <EditableClassRow
                  key={`${schoolClass.id}-${schoolClass.updatedAt}`}
                  schoolClass={schoolClass}
                  onToggle={(item) => void toggleCustomClass(item)}
                  onRemove={(item) => void remove(item)}
                />
              ))}
            </div>
          </div>
        )}

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

function LegacyClassesSettings() {
  const { settings } = useSchoolSettings();
  return (
    <div className="grid w-full min-w-0 max-w-full items-start gap-6">
      {settings.schoolLevels.includes("PRIMARY") && (
        <ClassesForLevel
          level="PRIMARY"
          title="Primary Classes"
          helper="Choose the primary classes available in your school."
        />
      )}
      {settings.schoolLevels.includes("SECONDARY") && (
        <ClassesForLevel
          level="SECONDARY"
          title="Secondary Classes"
          helper="Choose the secondary classes available in your school."
        />
      )}
    </div>
  );
}

type ClassDraft = {
  key: string;
  level: SchoolLevel;
  source: "STANDARD" | "CUSTOM";
  templateKey?: string;
  existingId?: string;
  name: string;
  capacity: string;
  active: boolean;
  removed: boolean;
  initialName: string;
  initialCapacity: number;
  initialActive: boolean;
};

export interface ClassesSettingsHandle {
  saveChanges(): Promise<void>;
  resetChanges(): void;
}

function buildClassDrafts(classes: SchoolClass[]) {
  const drafts: Record<string, ClassDraft> = {};
  const claimedIds = new Set<string>();

  for (const template of classTemplates) {
    const existing = classes.find(
      (item) =>
        item.templateKey === template.key &&
        item.source === "STANDARD" &&
        !item.suffix,
    );
    if (existing) claimedIds.add(existing.id);
    const capacity = existing?.capacity ?? 40;
    drafts[`template:${template.key}`] = {
      key: `template:${template.key}`,
      level: template.level,
      source: "STANDARD",
      templateKey: template.key,
      existingId: existing?.id,
      name: existing?.displayName ?? template.defaultName,
      capacity: String(capacity),
      active: existing?.status === "ACTIVE",
      removed: false,
      initialName: existing?.displayName ?? template.defaultName,
      initialCapacity: capacity,
      initialActive: existing?.status === "ACTIVE",
    };
  }

  for (const schoolClass of sortClasses(
    classes.filter((item) => !claimedIds.has(item.id)),
  )) {
    const capacity = schoolClass.capacity ?? 40;
    drafts[`class:${schoolClass.id}`] = {
      key: `class:${schoolClass.id}`,
      level: schoolClass.level,
      source: "CUSTOM",
      existingId: schoolClass.id,
      name: schoolClass.displayName,
      capacity: String(capacity),
      active: schoolClass.status === "ACTIVE",
      removed: false,
      initialName: schoolClass.displayName,
      initialCapacity: capacity,
      initialActive: schoolClass.status === "ACTIVE",
    };
  }

  return drafts;
}

function DraftClassRow({
  draft,
  editableName,
  saving,
  onChange,
  onRemove,
}: {
  draft: ClassDraft;
  editableName?: boolean;
  saving: boolean;
  onChange: (patch: Partial<ClassDraft>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t px-3 py-3 first:border-t-0 sm:flex-row sm:items-center sm:px-4">
      <div className="min-w-0 flex-1">
        {editableName ? (
          <Input
            value={draft.name}
            aria-label="Custom class name"
            disabled={saving}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        ) : (
          <p className="truncate text-sm font-semibold">{draft.name}</p>
        )}
        <p
          className={`mt-1 text-xs font-medium ${
            draft.active ? "text-success" : "text-muted"
          }`}
        >
          {draft.active ? "Active after saving" : "Inactive after saving"}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2 sm:justify-end">
        <label className="text-xs font-medium text-muted">
          Capacity
          <Input
            className="mt-1 w-24"
            type="number"
            min="1"
            step="1"
            value={draft.capacity}
            disabled={saving}
            aria-label={`${draft.name} capacity`}
            onChange={(event) => onChange({ capacity: event.target.value })}
          />
        </label>
        <Button
          type="button"
          variant={draft.active ? "outline" : "primary"}
          disabled={saving}
          onClick={() => onChange({ active: !draft.active })}
        >
          {draft.active ? "Deactivate" : "Activate"}
        </Button>
        {onRemove && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onRemove}
          >
            <Trash2 size={15} />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function DraftClassesForLevel({
  level,
  drafts,
  saving,
  onChange,
  onAddCustom,
}: {
  level: SchoolLevel;
  drafts: ClassDraft[];
  saving: boolean;
  onChange: (key: string, patch: Partial<ClassDraft>) => void;
  onAddCustom: (level: SchoolLevel, name: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const title = level === "PRIMARY" ? "Primary Classes" : "Secondary Classes";
  const standardDrafts = drafts.filter((item) => item.source === "STANDARD");
  const customDrafts = drafts.filter(
    (item) => item.source === "CUSTOM" && !item.removed,
  );
  const activeDrafts = drafts.filter((item) => !item.removed);

  const setAll = (active: boolean) => {
    for (const draft of activeDrafts) {
      onChange(draft.key, { active });
    }
  };

  const addCustom = () => {
    const name = customName.replace(/\s+/g, " ").trim();
    if (!name) return;
    onAddCustom(level, name);
    setCustomName("");
    setShowCustom(false);
  };

  return (
    <section className="w-full min-w-0 max-w-full self-start rounded-xl border bg-surface">
      <header className="border-b px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-muted">
              Set availability and capacity, then click Save Changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving}
              onClick={() => setAll(true)}
            >
              Activate All
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setAll(false)}
            >
              Deactivate All
            </Button>
          </div>
        </div>
      </header>
      <div className="p-4 sm:p-5">
        <div className="overflow-hidden rounded-xl border">
          {standardDrafts.map((draft) => (
            <DraftClassRow
              key={draft.key}
              draft={draft}
              saving={saving}
              onChange={(patch) => onChange(draft.key, patch)}
            />
          ))}
        </div>

        {customDrafts.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold">Custom classes</h3>
            <div className="mt-2 overflow-hidden rounded-xl border">
              {customDrafts.map((draft) => (
                <DraftClassRow
                  key={draft.key}
                  draft={draft}
                  editableName
                  saving={saving}
                  onChange={(patch) => onChange(draft.key, patch)}
                  onRemove={() => onChange(draft.key, { removed: true })}
                />
              ))}
            </div>
          </div>
        )}

        {showCustom ? (
          <div className="mt-4 rounded-xl border bg-surface-muted p-3">
            <div className="flex items-start gap-2">
              <label className="min-w-0 flex-1 text-sm font-medium">
                Custom class name
                <Input
                  autoFocus
                  className="mt-2"
                  value={customName}
                  disabled={saving}
                  placeholder={
                    level === "PRIMARY"
                      ? "Primary 7 or Grade 6"
                      : "Sixth Form or A-Level 1"
                  }
                  onChange={(event) => setCustomName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustom();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="mt-6 rounded-lg p-2 text-muted hover:bg-surface"
                aria-label="Close custom class field"
                onClick={() => setShowCustom(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={saving || !customName.trim()}
                onClick={addCustom}
              >
                <Plus size={15} />
                Add Custom Class
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            disabled={saving}
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

export const ClassesSettings = forwardRef<
  ClassesSettingsHandle,
  { onPendingChange?: (pending: boolean) => void }
>(function ClassesSettings({ onPendingChange }, ref) {
  const { settings } = useSchoolSettings();
  const {
    state,
    createStandardClass,
    createCustomClass,
    updateClass,
    setClassStatus,
    removeClass,
  } = useAcademics();
  const [drafts, setDrafts] = useState<Record<string, ClassDraft>>(() =>
    buildClassDrafts(state.classes),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setDrafts(buildClassDrafts(state.classes));
  }, [dirty, state.classes]);

  const markDirty = () => {
    setDirty(true);
    onPendingChange?.(true);
  };

  const updateDraft = (key: string, patch: Partial<ClassDraft>) => {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
    markDirty();
  };

  const addCustomDraft = (level: SchoolLevel, name: string) => {
    const key = `draft:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    setDrafts((current) => ({
      ...current,
      [key]: {
        key,
        level,
        source: "CUSTOM",
        name,
        capacity: "40",
        active: true,
        removed: false,
        initialName: name,
        initialCapacity: 40,
        initialActive: true,
      },
    }));
    markDirty();
  };

  const resetChanges = () => {
    setDrafts(buildClassDrafts(state.classes));
    setDirty(false);
    onPendingChange?.(false);
  };

  useImperativeHandle(
    ref,
    () => ({
      resetChanges,
      async saveChanges() {
        if (!dirty) return;
        const pending = Object.values(drafts);
        for (const draft of pending.filter((item) => !item.removed)) {
          const capacity = Number(draft.capacity);
          if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error(`${draft.name || "Class"} needs a positive whole-number capacity.`);
          }
          if (!draft.name.trim()) {
            throw new Error("Every custom class needs a name.");
          }
        }

        setSaving(true);
        try {
          for (const draft of pending) {
            const capacity = Number(draft.capacity);
            if (draft.existingId && draft.removed) {
              await removeClass(draft.existingId);
              continue;
            }
            if (draft.removed) continue;

            if (!draft.existingId) {
              if (!draft.active) continue;
              if (draft.source === "STANDARD" && draft.templateKey) {
                await createStandardClass(draft.templateKey, {
                  capacity,
                  status: "ACTIVE",
                });
              } else {
                await createCustomClass({
                  level: draft.level,
                  source: "CUSTOM",
                  baseName: draft.name.trim(),
                  capacity,
                  status: "ACTIVE",
                });
              }
              continue;
            }

            if (
              capacity !== draft.initialCapacity ||
              draft.name.trim() !== draft.initialName
            ) {
              await updateClass(draft.existingId, {
                baseName: draft.name.trim(),
                suffix: "",
                capacity,
              });
            }
            if (draft.active !== draft.initialActive) {
              await setClassStatus(
                draft.existingId,
                draft.active ? "ACTIVE" : "ARCHIVED",
              );
            }
          }
          setDirty(false);
          onPendingChange?.(false);
        } finally {
          setSaving(false);
        }
      },
    }),
    [
      createCustomClass,
      createStandardClass,
      dirty,
      drafts,
      onPendingChange,
      removeClass,
      setClassStatus,
      state.classes,
      updateClass,
    ],
  );

  const visibleDrafts = useMemo(() => Object.values(drafts), [drafts]);

  return (
    <div className="grid w-full min-w-0 max-w-full items-start gap-6">
      {settings.schoolLevels.includes("PRIMARY") && (
        <DraftClassesForLevel
          level="PRIMARY"
          drafts={visibleDrafts.filter((item) => item.level === "PRIMARY")}
          saving={saving}
          onChange={updateDraft}
          onAddCustom={addCustomDraft}
        />
      )}
      {settings.schoolLevels.includes("SECONDARY") && (
        <DraftClassesForLevel
          level="SECONDARY"
          drafts={visibleDrafts.filter((item) => item.level === "SECONDARY")}
          saving={saving}
          onChange={updateDraft}
          onAddCustom={addCustomDraft}
        />
      )}
    </div>
  );
});
