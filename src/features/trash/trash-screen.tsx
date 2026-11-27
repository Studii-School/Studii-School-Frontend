"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { getTrash, restoreTrashRecord, type TrashRecord, type TrashResponse } from "./trash.repository";

const labels: Record<string, string> = {
  teachers: "Teachers",
  students: "Students",
  parents: "Parents",
  staff: "Staff",
  classes: "Classes",
  subjects: "Subjects",
  communications: "Communications",
  events: "Events",
  reports: "Reports",
  schools: "Schools",
  other: "Other",
};

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetaValue(key: string, value: string | number | boolean | Array<string | number | boolean>) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (key.toLowerCase().endsWith("at") || key.toLowerCase().endsWith("date")) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.valueOf())) return key.toLowerCase().endsWith("at") ? formatDateTime(date) : formatDate(date);
  }
  if (typeof value === "string" && /^[A-Z0-9_ -]+$/.test(value)) return formatLabel(value.toLowerCase());
  return String(value);
}

const hiddenMetaKeys = new Set(["id", "schoolId", "entityId", "userId", "actorUserId", "createdAt", "updatedAt", "deletedAt", "expiresAt"]);
const preferredMetaKeys = ["status", "email", "phone", "phoneNumber", "className", "displayName", "name", "code", "audience", "audiences", "publishAt", "date"];

function sampleMeta(item: TrashRecord) {
  const displayable = Object.entries(item.snapshot ?? {}).filter(([key, value]) => {
    if (hiddenMetaKeys.has(key) || key.toLowerCase().endsWith("id")) return false;
    if (key === "title" && value === item.title) return false;
    if (Array.isArray(value)) return value.every((entry) => ["string", "number", "boolean"].includes(typeof entry));
    return ["string", "number", "boolean"].includes(typeof value);
  }) as Array<[string, string | number | boolean | Array<string | number | boolean>]>;

  const ordered = [
    ...preferredMetaKeys.flatMap((key) => displayable.filter(([itemKey]) => itemKey === key)),
    ...displayable.filter(([key]) => !preferredMetaKeys.includes(key)),
  ];

  return ordered
    .slice(0, 3)
    .map(([key, value]) => `${formatLabel(key)}: ${formatMetaValue(key, value)}`)
    .join(" - ");
}

export function TrashScreen({ platform = false }: { platform?: boolean } = {}) {
  const { selectedTerm } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const [data, setData] = useState<TrashResponse>({ records: [], groups: [] });
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState("");
  const { confirm, toast } = useActionFeedback();

  const load = async (category = selected) => {
    setLoading(true);
    try {
      setData(await getTrash(category || undefined));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Trash could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startDate = selectedTerm?.startDate || settings.resumptionDate;
  const endDate = selectedTerm?.endDate || settings.closingDate;
  const requireStartDate = Boolean(selectedTerm);
  const periodRecords = useMemo(
    () =>
      platform ? data.records : data.records.filter((item) => {
        const snapshot = item.snapshot ?? {};
        const dateValue =
          typeof snapshot.publishAt === "string" ? snapshot.publishAt :
          typeof snapshot.startDate === "string" ? snapshot.startDate :
          typeof snapshot.date === "string" ? snapshot.date :
          typeof snapshot.createdAt === "string" ? snapshot.createdAt :
          item.deletedAt;
        return dateBelongsToPeriod(dateValue, { startDate, endDate, requireStartDate });
      }),
    [data.records, endDate, platform, requireStartDate, startDate],
  );

  const groups = useMemo(
    () =>
      data.groups.length
        ? data.groups.map((group) => ({
            ...group,
            count: periodRecords.filter((record) => record.category === group.key).length,
          })).filter((group) => group.count > 0)
        : periodRecords.reduce<Array<{ key: string; count: number }>>((items, record) => {
            const existing = items.find((item) => item.key === record.category);
            if (existing) existing.count += 1;
            else items.push({ key: record.category, count: 1 });
            return items;
          }, []),
    [data.groups, periodRecords],
  );

  const openGroup = async (key: string) => {
    setSelected(key);
    await load(key);
  };

  const restore = (item: TrashRecord) => confirm({
    title: `Restore ${item.title}?`,
    description: "This will move the deleted record out of Trash and back into its original area.",
    confirmLabel: "Restore",
    onConfirm: async () => {
      setBusyId(item.id);
      try {
        await restoreTrashRecord(item.id);
        await load(selected);
        toast(`${item.title} restored successfully.`, "success");
      } finally {
        setBusyId("");
      }
    },
  });

  return (
    <>
      <PageHeader
        title="Trash"
        description={platform ? "Supported deleted records are kept for 3 months. Deleting an empty school is permanent." : "Deleted records are kept for 3 months, then removed automatically."}
        showBack={Boolean(selected)}
        onBack={() => { setSelected(""); void load(""); }}
        action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />Refresh</Button>}
      />
      {error && <p role="alert" className="mb-4 rounded-[8px] border border-danger/20 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {!selected ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => (
            <button
              type="button"
              key={group.key}
              onClick={() => void openGroup(group.key)}
              className="min-h-36 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm"
            >
              <Trash2 className="text-[var(--school-primary)]" size={21} />
              <p className="mt-3 font-semibold">{labels[group.key] ?? group.key}</p>
              <p className="mt-1 text-xs text-muted">Deleted records in this group</p>
              <p className="mt-4 text-2xl font-bold">{group.count}</p>
            </button>
          ))}
          {!groups.length && !loading && <div className="sm:col-span-2 xl:col-span-4"><EmptyState title="Trash is empty" description="Deleted records will appear here until their 3-month cleanup date." /></div>}
          {loading && <Card className="p-8 text-center text-sm text-muted">Loading trash...</Card>}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {periodRecords.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{item.title}</h2>
                      <Badge>{item.entityType}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{sampleMeta(item) || labels[item.category] || item.category}</p>
                    <p className="mt-3 text-xs text-muted">Deleted {formatDate(item.deletedAt)} - Auto empties {formatDate(item.expiresAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" disabled={busyId === item.id} onClick={() => restore(item)}>
                      <RotateCcw size={14} />{busyId === item.id ? "Restoring..." : "Restore"}
                    </Button>
                    <Inbox className="text-muted" size={18} />
                  </div>
                </div>
              </Card>
            ))}
            {!periodRecords.length && !loading && <EmptyState title={`No deleted ${labels[selected]?.toLowerCase() ?? selected}`} description="This trash group is empty for the selected term." />}
          </div>
        </>
      )}
    </>
  );
}
