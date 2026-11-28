"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Mail, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import { getSchools, inviteSchool } from "./super-admin.api";
import { schoolKey, schoolStatus, statusLabel, type SchoolRecord } from "./super-admin.types";

function statusTone(status?: string) {
  const value = schoolStatus(status);
  return value === "active" ? "success" : value === "suspended" || value === "review" ? "warning" : "neutral";
}

export function SchoolManagementScreen({ initialStatus = "" }: { initialStatus?: string }) {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [pending, setPending] = useState(false);
  const preview = isSuperAdminPreview();

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSchools(await getSchools());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Schools could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadSchools); }, [loadSchools]);

  const filtered = schools.filter((school) => {
    const text = [school.name, school.code, school.email, school.phone, school.status].join(" ").toLowerCase();
    return (!status || schoolStatus(school.status) === status) && text.includes(query.trim().toLowerCase());
  });
  const activeCount = schools.filter((school) => schoolStatus(school.status) === "active").length;
  const reviewCount = schools.filter((school) => schoolStatus(school.status) === "review").length;
  const suspendedCount = schools.filter((school) => schoolStatus(school.status) === "suspended").length;
  const peopleCount = schools.reduce((total, school) => total + (school._count?.users ?? school.totalUsers ?? 0), 0);
  const pagination = usePaginatedRows(filtered, `${query}|${status}|${schools.length}`);

  const closeInvite = useCallback(() => setInviteOpen(false), []);

  async function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || pending) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setInviteError("Enter a valid school email address.");
      return;
    }
    setPending(true);
    setInviteError("");
    setMessage("");
    try {
      await inviteSchool(email);
      setInviteOpen(false);
      setInviteEmail("");
      setMessage(`Invitation requested for ${email}. The school can open its email link to complete onboarding.`);
    } catch (caught) {
      setInviteError(caught instanceof Error ? caught.message : "The invitation could not be sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader title="Schools" description="Invite schools, review their profiles, and manage existing workspaces."
        action={<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={loading || pending} onClick={() => void loadSchools()}><RefreshCw size={16} />Refresh</Button><Button type="button" onClick={() => { setInviteError(""); setInviteOpen(true); }}><Mail size={16} />Invite school</Button></div>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total schools", value: schools.length, icon: Building2, tone: "text-primary" },
          { label: "Active", value: activeCount, icon: ShieldCheck, tone: "text-success" },
          { label: "Under review", value: reviewCount, icon: ShieldCheck, tone: "text-warning" },
          { label: "Suspended or inactive", value: suspendedCount, icon: Users, tone: "text-warning" },
          { label: "People across schools", value: peopleCount, icon: Users, tone: "text-muted" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-start justify-between gap-3 p-4 sm:p-5">
            <div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "…" : value}</p></div>
            <span className={`rounded-lg bg-surface-muted p-2 ${tone}`}><Icon size={19} /></span>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b p-4 sm:p-5">
          <div><h2 className="text-lg font-semibold">School directory</h2><p className="mt-1 text-sm text-muted">Select a school to manage its workspace.</p></div>
          <Badge tone="primary">{filtered.length} shown</Badge>
        </div>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search by school, code or contact" /></div>
          <Select className="sm:w-52" label="Status" placeholder="All statuses" clearable value={status} onChange={setStatus}
            options={[{ value: "active", label: "Active" }, { value: "review", label: "Under review" }, { value: "suspended", label: "Suspended or inactive" }, { value: "other", label: "Other" }]} />
        </div>
        {error && <p role="alert" className="border-b bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        {message && <p role="status" className="border-b bg-success/10 px-4 py-3 text-sm text-success">{message}</p>}
        {loading ? <p role="status" className="p-8 text-center text-sm text-muted">Loading schools…</p> : !filtered.length ? (
          <div className="p-10 text-center"><Building2 className="mx-auto text-muted" size={28} /><p className="mt-3 font-medium">{schools.length ? "No schools match your filters" : "No schools yet"}</p><p className="mt-1 text-sm text-muted">{schools.length ? "Try another search or status." : "Invite a school to begin onboarding."}</p></div>
        ) : (
          <>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="px-4 py-3 font-medium">School</th><th scope="col" className="px-4 py-3 font-medium">Contact</th><th scope="col" className="px-4 py-3 font-medium">People</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Open</span></th></tr></thead>
              <tbody className="divide-y">
                {pagination.rows.map((school) => (
                  <tr key={schoolKey(school) || school.name} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-4 py-4"><Link href={`/super-admin/schools/${encodeURIComponent(schoolKey(school))}`} className="text-left font-semibold text-foreground hover:text-primary hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary">{school.name || "Unnamed school"}</Link><p className="mt-1 text-xs text-muted">{school.code || "No code"}</p></td>
                    <td className="px-4 py-4"><p className="break-all">{school.email || "No email"}</p><p className="mt-1 text-xs text-muted">{school.phone || "No phone"}</p></td>
                    <td className="px-4 py-4 tabular-nums">{school._count?.users ?? school.totalUsers ?? "—"}</td>
                    <td className="px-4 py-4"><Badge tone={statusTone(school.status)}>{statusLabel(school.status)}</Badge></td>
                    <td className="px-4 py-4 text-right"><Link className={`${buttonStyles("outline")} min-h-9 px-3`} href={`/super-admin/schools/${encodeURIComponent(schoolKey(school))}`}>View school <ChevronRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <TablePagination label="Schools" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount}
              pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
          </>
        )}
      </Card>

      <SidePanel open={inviteOpen} title="Invite a school" description="Send a secure link so the school can set up its own profile." onClose={closeInvite} maxWidth="lg">
        <form className="space-y-5" onSubmit={submitInvitation}>
          {inviteError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{inviteError}</p>}
          <fieldset disabled={preview || pending} className="space-y-4">
            <Field label="School email" type="email" required value={inviteEmail} onChange={setInviteEmail} />
            <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</Button>
          </fieldset>
        </form>
      </SidePanel>

    </>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
