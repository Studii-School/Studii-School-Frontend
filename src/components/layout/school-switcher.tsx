"use client";

import { useRef, useState } from "react";
import { CalendarRange, ChevronDown, X } from "lucide-react";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel, type AcademicTermName, type HistoricalSessionInput } from "@/features/academic-period/academic-period.types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { downloadCsvFile } from "@/lib/csv-download";
import { ACADEMIC_HISTORY_IMPORT_TEMPLATE, ACADEMIC_HISTORY_IMPORT_TEMPLATE_FILENAME } from "@/lib/import-templates";
import type { UserRole } from "@/types";

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const parseLine = (line: string) => {
    const cells: string[] = []; let current = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) { cells.push(current.trim()); current = ""; }
      else current += character;
    }
    cells.push(current.trim()); return cells;
  };
  const headers = parseLine(lines[0] ?? "");
  return lines.slice(1).map((line) => { const cells = parseLine(line); return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])); });
}

function historyFromRows(rows: Row[]): HistoricalSessionInput[] {
  const required = ["sessionName", "sessionStartDate", "sessionEndDate", "termName", "termStartDate", "termEndDate"];
  if (!rows.length) throw new Error("The CSV does not contain any academic periods.");
  const groups = new Map<string, HistoricalSessionInput>();
  rows.forEach((row, index) => {
    const missing = required.filter((field) => !row[field]?.trim());
    if (missing.length) throw new Error(`Row ${index + 2}: missing ${missing.join(", ")}.`);
    const termName = row.termName.trim().toUpperCase() as AcademicTermName;
    if (!["FIRST", "SECOND", "THIRD"].includes(termName)) throw new Error(`Row ${index + 2}: termName must be FIRST, SECOND, or THIRD.`);
    const key = row.sessionName.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing && (existing.startDate !== row.sessionStartDate || existing.endDate !== row.sessionEndDate)) throw new Error(`Row ${index + 2}: session dates do not match the other ${row.sessionName} rows.`);
    const session = existing ?? { name: row.sessionName.trim(), startDate: row.sessionStartDate, endDate: row.sessionEndDate, terms: [] };
    session.terms.push({ name: termName, startDate: row.termStartDate, endDate: row.termEndDate });
    groups.set(key, session);
  });
  return [...groups.values()];
}

export function SchoolSwitcher({ compact = false, role }: { compact?: boolean; role?: UserRole }) {
  const { settings } = useSchoolSettings();
  const periods = useAcademicPeriod();
  const { toast } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === "Administrator";
  const periodLabel = periods.selectedSession && periods.selectedTerm
    ? `${academicTermLabel(periods.selectedTerm.name)} · ${periods.selectedSession.name}`
    : settings.currentAcademicSession
      ? `${settings.currentTerm} · ${settings.currentAcademicSession}`
      : "No academic period available";
  if (compact) return null;

  const upload = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await periods.importHistory(historyFromRows(parseCsv(await file.text())));
      toast(`${result.importedSessions} historical session(s) and ${result.importedTerms} term(s) imported.`, "success");
      setImportOpen(false); setOpen(false);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Academic history could not be imported.", "error");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between rounded-[10px] border bg-surface-muted p-2.5 text-left" aria-label="Select academic session and term" aria-expanded={open}>
      <span className="min-w-0"><span className="block truncate text-xs font-semibold">{settings.name}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{periods.isLoading ? "Loading academic period..." : periodLabel}</span></span>
      <ChevronDown className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} size={15} />
    </button>
    {open && <div className="absolute left-0 z-[90] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-surface p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-3"><div><p className="font-semibold">View academic period</p><p className="mt-1 text-xs leading-5 text-muted">This selection controls period-aware results, reports, and insights.</p></div><button type="button" className="rounded-lg p-1.5 text-muted hover:bg-surface-muted" onClick={() => setOpen(false)} aria-label="Close academic period selector"><X size={16}/></button></div>
      {periods.error && <p role="alert" className="mb-3 rounded-lg bg-danger/10 p-3 text-xs text-danger">{periods.error}</p>}
      <div className="grid gap-3">
        <Select searchable label="Academic session" value={periods.sessionId} onChange={periods.setSessionId} placeholder="No sessions available" options={periods.sessions.map((item) => ({ value: item.id, label: item.name, description: item.status }))}/>
        <Select label="Academic term" value={periods.termId} onChange={periods.setTermId} disabled={!periods.sessionId} placeholder="No terms available" options={periods.terms.map((item) => ({ value: item.id, label: academicTermLabel(item.name), description: item.status }))}/>
      </div>
      {!periods.sessions.length && !periods.isLoading && <p className="mt-3 text-xs text-muted">Your school has not created any academic sessions yet.</p>}
      {isAdmin && <div className="mt-4 border-t pt-4"><Button type="button" variant="outline" className="w-full" onClick={() => setImportOpen(true)}><CalendarRange size={16}/>Import previous sessions</Button><p className="mt-2 text-xs leading-5 text-muted">Imports are saved as closed history and will not change the current active term.</p></div>}
    </div>}
    <input ref={fileRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void upload(event.target.files?.[0])}/>
    <CsvImportDialog open={importOpen} variant="drawer" title="Import previous academic sessions" description="Download the template, add only sessions your school completed before joining Studii, then upload the CSV. Duplicate or future sessions are rejected." onClose={() => !importing && setImportOpen(false)} onDownloadTemplate={() => downloadCsvFile(ACADEMIC_HISTORY_IMPORT_TEMPLATE_FILENAME, ACADEMIC_HISTORY_IMPORT_TEMPLATE)} onUpload={() => fileRef.current?.click()} uploadLabel={importing ? "Importing..." : "Upload completed CSV"}/>
  </div>;
}
