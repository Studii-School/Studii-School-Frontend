"use client";

import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import type { SchoolLevel, StudentStatus } from "@/features/academics/academics.types";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";

const fields = [
  "admissionNumber",
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "dateOfBirth",
  "schoolType",
  "className",
  "admissionDate",
  "guardianName",
  "guardianRelationship",
  "guardianPhone",
  "guardianEmail",
  "address",
  "studentStatus",
] as const;
type Field = (typeof fields)[number];
type RawRow = Record<string, string>;
type Mapping = Record<Field, string>;
type ImportRow = {
  rowNumber: number;
  raw: RawRow;
  excluded: boolean;
};

const labels: Record<Field, string> = {
  admissionNumber: "Admission number",
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  gender: "Gender",
  dateOfBirth: "Date of birth",
  schoolType: "School type",
  className: "Class name",
  admissionDate: "Admission date",
  guardianName: "Guardian name",
  guardianRelationship: "Guardian relationship",
  guardianPhone: "Guardian phone",
  guardianEmail: "Guardian email",
  address: "Address",
  studentStatus: "Student status",
};

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = parseLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
  });
  return { headers, rows };
}

function download(name: string, content: string) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function importStudentEmail(admissionNumber: string, rowNumber: number) {
  const slug = (admissionNumber || `row-${rowNumber}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${slug || `row-${rowNumber}`}@students.schoolos.test`;
}

const normaliseKey = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const normalisePhone = (value?: string) => value?.replace(/\D/g, "") ?? "";

export function StudentImportPage() {
  const { state, createGuardian, createStudent } = useAcademics();
  const { toast } = useActionFeedback();
  const { settings } = useSchoolSettings();
  const [step, setStep] = useState<"UPLOAD" | "MAP" | "PREVIEW" | "SUMMARY">("UPLOAD");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>(
    Object.fromEntries(fields.map((field) => [field, ""])) as Mapping,
  );
  const [filter, setFilter] = useState("ALL");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    newGuardians: 0,
    existingGuardians: 0,
  });

  const value = (row: RawRow, field: Field) =>
    row[mapping[field]]?.trim() ?? "";

  const validate = (row: ImportRow, allRows: ImportRow[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const admission = value(row.raw, "admissionNumber");
    const firstName = value(row.raw, "firstName");
    const lastName = value(row.raw, "lastName");
    const birthDate = value(row.raw, "dateOfBirth");
    const studentIdentity = [firstName, lastName, birthDate].map(normaliseKey).join("|");
    const className = value(row.raw, "className");
    const levelText = value(row.raw, "schoolType").toUpperCase();
    const level: SchoolLevel | undefined = levelText.includes("PRIMARY")
      ? "PRIMARY"
      : levelText.includes("SECONDARY")
        ? "SECONDARY"
        : undefined;
    const schoolClass = state.classes.find(
      (item) =>
        item.status === "ACTIVE" &&
        item.displayName.toLowerCase() === className.toLowerCase(),
    );
    if (!firstName) errors.push("First name is missing");
    if (!lastName) errors.push("Last name is missing");
    if (
      admission &&
      state.students.some(
        (item) =>
          item.admissionNumber.toLowerCase() === admission.toLowerCase(),
      )
    )
      errors.push("Admission number already exists");
    if (
      firstName &&
      lastName &&
      birthDate &&
      state.students.some(
        (item) =>
          [item.firstName, item.lastName, item.dateOfBirth ?? ""]
            .map(normaliseKey)
            .join("|") === studentIdentity,
      )
    )
      errors.push("Student already exists");
    if (
      admission &&
      allRows.some(
        (item) =>
          item.rowNumber < row.rowNumber &&
          value(item.raw, "admissionNumber").toLowerCase() ===
            admission.toLowerCase(),
      )
    )
      errors.push("Duplicate admission number in file");
    if (
      firstName &&
      lastName &&
      birthDate &&
      allRows.some(
        (item) =>
          item.rowNumber < row.rowNumber &&
          [
            value(item.raw, "firstName"),
            value(item.raw, "lastName"),
            value(item.raw, "dateOfBirth"),
          ]
            .map(normaliseKey)
            .join("|") === studentIdentity,
      )
    )
      errors.push("Duplicate student in file");
    if (!schoolClass) errors.push(`Class “${className || "blank"}” does not exist`);
    if (!level) errors.push("School type must be Primary or Secondary");
    if (level && !settings.schoolLevels.includes(level))
      errors.push(`${level === "SECONDARY" ? "Secondary" : "Primary"} is not enabled in school settings`);
    if (schoolClass && level && schoolClass.level !== level)
      errors.push(`${level === "SECONDARY" ? "Secondary" : "Primary"} student cannot be assigned to ${schoolClass.displayName}`);
    if (birthDate && Number.isNaN(Date.parse(birthDate)))
      errors.push("Invalid date of birth");
    const email = value(row.raw, "guardianEmail");
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      errors.push("Invalid guardian email");
    const phone = value(row.raw, "guardianPhone");
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone))
      errors.push("Invalid guardian phone");
    const studentStatus = value(row.raw, "studentStatus").toUpperCase();
    if (
      studentStatus &&
      !["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"].includes(
        studentStatus,
      )
    ) {
      errors.push("Student status must be ACTIVE, SUSPENDED, GRADUATED or WITHDRAWN");
    }
    if (!value(row.raw, "guardianName"))
      warnings.push("Guardian name is missing");
    return { errors, warnings, level, schoolClass };
  };

  const assessed = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        validation: validate(row, rows),
      })),
    // Mapping and shared data intentionally drive full import revalidation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping, rows, settings.schoolLevels, state.classes, state.students],
  );
  const visible = assessed.filter((row) => {
    const status = row.validation.errors.length
      ? "ERROR"
      : row.validation.warnings.length
        ? "WARNING"
        : "VALID";
    return filter === "ALL" || status === filter;
  });

  const upload = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv") {
      toast(
        "Excel parsing is unavailable in this workspace. Save the file as CSV and upload it again.",
        "error",
      );
      return;
    }
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.length || !parsed.rows.length) {
      toast("The uploaded file has no student rows.", "error");
      return;
    }
    const normalized = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9]/g, "");
    setHeaders(parsed.headers);
    setRows(
      parsed.rows.map((raw, index) => ({
        rowNumber: index + 2,
        raw,
        excluded: false,
      })),
    );
    setMapping(
      Object.fromEntries(
        fields.map((field) => [
          field,
          parsed.headers.find(
            (header) => normalized(header) === normalized(field),
          ) ?? "",
        ]),
      ) as Mapping,
    );
    setStep("MAP");
  };

  const importValid = async () => {
    const validRows = assessed.filter(
      (item) => !item.excluded && !item.validation.errors.length,
    );
    if (!validRows.length) {
      setImportError("There are no valid student rows to import.");
      toast("There are no valid student rows to import.", "warning");
      return;
    }
    setImporting(true);
    setImportError("");
    setRowErrors([]);
    let imported = 0;
    let newGuardians = 0;
    let existingGuardians = 0;
    const failedRows: string[] = [];
    const importedAdmissions = new Set(state.students.map((student) => normaliseKey(student.admissionNumber)));
    const importedStudents = new Set(
      state.students
        .filter((student) => student.firstName && student.lastName && student.dateOfBirth)
        .map((student) => [student.firstName, student.lastName, student.dateOfBirth ?? ""].map(normaliseKey).join("|")),
    );
    for (const row of validRows) {
      try {
        const admissionNumber = value(row.raw, "admissionNumber");
        const studentKey = [
          value(row.raw, "firstName"),
          value(row.raw, "lastName"),
          value(row.raw, "dateOfBirth"),
        ]
          .map(normaliseKey)
          .join("|");
        if (
          (admissionNumber && importedAdmissions.has(normaliseKey(admissionNumber))) ||
          (value(row.raw, "dateOfBirth") && importedStudents.has(studentKey))
        ) {
          failedRows.push(`Row ${row.rowNumber}: Student already exists and was skipped.`);
          continue;
        }
        const phone = value(row.raw, "guardianPhone");
        const email = value(row.raw, "guardianEmail");
        let guardian = state.guardians.find(
          (item) =>
            (phone &&
              normalisePhone(item.phone) === normalisePhone(phone)) ||
            (email && item.email?.toLowerCase() === email.toLowerCase()),
        );
        if (guardian) {
          existingGuardians += 1;
        } else {
          try {
            guardian = await createGuardian({
              fullName: value(row.raw, "guardianName") || "Guardian",
              relationship:
                value(row.raw, "guardianRelationship") || "Guardian",
              phone: phone || "Not provided",
              email: email || undefined,
              address: undefined,
              isPrimaryContact: true,
              isEmergencyContact: true,
            });
            newGuardians += 1;
          } catch (caught) {
            if (!(caught instanceof Error) || !caught.message.toLowerCase().includes("parent email")) throw caught;
          }
        }
        const schoolClass = row.validation.schoolClass;
        const level = row.validation.level;
        if (!schoolClass || !level) continue;
        const statusValue = value(
          row.raw,
          "studentStatus",
        ).toUpperCase();
        await createStudent({
          admissionNumber: value(row.raw, "admissionNumber"),
          firstName: value(row.raw, "firstName"),
          middleName: value(row.raw, "middleName") || undefined,
          lastName: value(row.raw, "lastName"),
          gender:
            value(row.raw, "gender").toLowerCase() === "female"
              ? "Female"
              : value(row.raw, "gender")
                ? "Male"
                : undefined,
          email: importStudentEmail(value(row.raw, "admissionNumber"), row.rowNumber),
          dateOfBirth: value(row.raw, "dateOfBirth") || undefined,
          admissionDate: value(row.raw, "admissionDate") || undefined,
          address: value(row.raw, "address") || undefined,
          schoolLevel: level,
          classId: schoolClass.id,
          guardianIds: guardian?.id ? [guardian.id] : [],
          guardianName: guardian?.fullName ?? value(row.raw, "guardianName") ?? "Guardian",
          guardianPhone: guardian?.phone ?? phone,
          guardianEmail: guardian?.email ?? email ?? undefined,
          status: ([
            "ACTIVE",
            "GRADUATED",
            "WITHDRAWN",
            "SUSPENDED",
          ].includes(statusValue)
            ? statusValue
            : "ACTIVE") as StudentStatus,
        });
        if (admissionNumber) importedAdmissions.add(normaliseKey(admissionNumber));
        if (value(row.raw, "dateOfBirth")) importedStudents.add(studentKey);
        imported += 1;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Student import failed.";
        failedRows.push(`Row ${row.rowNumber}: ${message}`);
      }
    }
    const errorCount = assessed.filter(
      (item) => item.validation.errors.length,
    ).length;
    const warningCount = assessed.filter(
      (item) => item.validation.warnings.length,
    ).length;
    setSummary({
      total: rows.length,
      imported,
      skipped: rows.length - imported,
      errors: errorCount + failedRows.length,
      warnings: warningCount,
      newGuardians,
      existingGuardians,
    });
    setRowErrors(failedRows);
    if (imported > 0) {
      setStep("SUMMARY");
      toast(failedRows.length ? `${imported} student(s) imported. ${failedRows.length} row(s) failed.` : `${imported} students imported successfully.`, failedRows.length ? "warning" : "success");
    } else {
      const detail = failedRows.join("\n") || "No students were imported.";
      setImportError(detail);
      toast(detail, "error");
    }
    setImporting(false);
  };

  const template = `${fields.join(",")}\n,Chidera,,Okafor,Male,2013-05-14,Secondary,JSS1,2026-09-01,Ifeanyi Okafor,Father,08061102044,parent@example.com,12 School Road,ACTIVE`;

  return (
    <div className="w-full min-w-0 max-w-full">
      <PageHeader
        title="Import Students"
        description="Upload, map, review and validate student records before importing."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => download("schoolos-student-import-template.csv", template)}
          >
            <Download size={16} />
            Download Import Template
          </Button>
        }
      />
      <div className="mb-5 flex max-w-full gap-2 overflow-x-auto">
        {["UPLOAD", "MAP", "PREVIEW", "SUMMARY"].map((item, index) => (
          <div
            key={item}
            className={`min-w-max rounded-full px-3 py-2 text-sm ${
              item === step
                ? "bg-[var(--school-primary)] text-[var(--school-primary-foreground)]"
                : "bg-surface-muted text-muted"
            }`}
          >
            {index + 1}. {item[0] + item.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      {step === "UPLOAD" && (
        <section className="rounded-xl border bg-surface p-6 text-center">
          <Upload className="mx-auto text-muted" size={32} />
          <h2 className="mt-3 font-semibold">Upload student file</h2>
          <p className="mt-1 text-sm text-muted">
            CSV, XLSX or XLS · Files are reviewed before import.
          </p>
          <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]">
            Choose File
            <input
              className="sr-only"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
        </section>
      )}

      {step === "MAP" && (
        <section className="rounded-xl border bg-surface p-4 sm:p-5">
          <h2 className="font-semibold">Map Columns</h2>
          <p className="mt-1 text-sm text-muted">
            Match each SchoolOS field to a column in the uploaded file.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <label key={field} className="min-w-0 text-sm font-medium">
                {labels[field]}
                <Select
                  className="mt-2"
                  clearable
                  label={labels[field]}
                  value={mapping[field]}
                  onChange={(value) =>
                    setMapping((current) => ({ ...current, [field]: value }))
                  }
                  placeholder="Choose uploaded column"
                  options={headers.map((header) => ({
                    value: header,
                    label: header,
                  }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => setStep("PREVIEW")}>
              Preview Records
            </Button>
          </div>
        </section>
      )}

      {step === "PREVIEW" && (
        <div className="space-y-4">
          {importError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">{importError}</p>}
          <div className="flex flex-wrap gap-2">
            {[
              ["ALL", assessed.length],
              ["VALID", assessed.filter((item) => !item.validation.errors.length && !item.validation.warnings.length).length],
              ["WARNING", assessed.filter((item) => item.validation.warnings.length && !item.validation.errors.length).length],
              ["ERROR", assessed.filter((item) => item.validation.errors.length).length],
            ].map(([value, count]) => (
              <Button key={String(value)} type="button" variant={filter === value ? "primary" : "outline"} onClick={() => setFilter(String(value))}>
                {String(value)} ({String(count)})
              </Button>
            ))}
          </div>
          <section className="overflow-hidden rounded-xl border bg-surface">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-surface-muted">
                  <tr>{["Include", "Row", "Student", "Admission", "Class", "Guardian", "Status", "Validation"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((row) => {
                    const invalid = row.validation.errors.length > 0;
                    const warning = row.validation.warnings.length > 0;
                    return (
                      <tr key={row.rowNumber}>
                        <td className="px-4 py-3"><input type="checkbox" checked={!row.excluded} onChange={(event) => setRows((current) => current.map((item) => item.rowNumber === row.rowNumber ? { ...item, excluded: !event.target.checked } : item))} /></td>
                        <td className="px-4 py-3">{row.rowNumber}</td>
                        <td className="px-4 py-3">{value(row.raw, "firstName")} {value(row.raw, "lastName")}</td>
                        <td className="px-4 py-3"><Input value={value(row.raw, "admissionNumber")} onChange={(event) => setRows((current) => current.map((item) => item.rowNumber === row.rowNumber ? { ...item, raw: { ...item.raw, [mapping.admissionNumber]: event.target.value } } : item))} /></td>
                        <td className="px-4 py-3"><Input value={value(row.raw, "className")} onChange={(event) => setRows((current) => current.map((item) => item.rowNumber === row.rowNumber ? { ...item, raw: { ...item.raw, [mapping.className]: event.target.value } } : item))} /></td>
                        <td className="px-4 py-3">{value(row.raw, "guardianName") || "—"}</td>
                        <td className="px-4 py-3"><Badge tone={invalid ? "danger" : warning ? "warning" : "success"}>{invalid ? "Error" : warning ? "Warning" : "Valid"}</Badge></td>
                        <td className="max-w-sm px-4 py-3 text-xs">{[...row.validation.errors, ...row.validation.warnings].join("; ") || "Ready to import"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => setStep("MAP")}>Back to Mapping</Button>
            <div className="flex flex-wrap gap-2">
              {assessed.some((item) => item.validation.errors.length) && (
                <Button type="button" variant="outline" onClick={() => download("schoolos-student-import-errors.csv", `row,errors\n${assessed.filter((item) => item.validation.errors.length).map((item) => `${item.rowNumber},"${item.validation.errors.join("; ")}"`).join("\n")}`)}>
                  Download Error Report
                </Button>
              )}
              <Button type="button" disabled={importing || !assessed.some((item) => !item.excluded && !item.validation.errors.length)} onClick={() => void importValid()}>
                {importing ? "Importing students..." : "Import Valid Students"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "SUMMARY" && (
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="text-lg font-bold">Import Complete</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(summary).map(([label, count]) => (
              <div key={label} className="rounded-xl bg-surface-muted p-4">
                <p className="text-xs capitalize text-muted">{label.replace(/([A-Z])/g, " $1")}</p>
                <p className="mt-1 text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
          {rowErrors.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-warning">
              <h3 className="font-semibold">Rows needing attention</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {rowErrors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin/students" className="inline-flex min-h-10 items-center rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]">View Imported Students</Link>
            <Button type="button" variant="outline" onClick={() => { setRows([]); setHeaders([]); setStep("UPLOAD"); }}>Import Another File</Button>
          </div>
        </section>
      )}
    </div>
  );
}
