"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Mail, Phone, RefreshCw } from "lucide-react";
import { formatDate, formatDateTime, formatTime } from "@/lib/date-utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { getDemoRequests } from "./super-admin.api";
import { statusLabel, type DemoRequestRecord } from "./super-admin.types";

const schoolSizes: Record<string, string> = {
  UNDER_100: "Under 100", "100_499": "100–499", "500_999": "500–999", "1000_PLUS": "1,000 or more",
};

export function DemoRequestsScreen() {
  const [requests, setRequests] = useState<DemoRequestRecord[] | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void getDemoRequests()
      .then((items) => {
        if (current) setRequests([...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
      })
      .catch((caught) => {
        if (current) setError(caught instanceof Error ? caught.message : "Could not load demo requests.");
      });
    return () => { current = false; };
  }, [revision]);

  const statuses = [...new Set(requests?.map((request) => request.status).filter(Boolean))].sort();
  const filtered = (requests ?? []).filter((request) => {
    const target = [request.schoolName, request.contactName, request.email, request.phone, request.notes].join(" ").toLowerCase();
    return (!status || request.status === status) && target.includes(query.trim().toLowerCase());
  });
  const pagination = usePaginatedRows(filtered, `${query}|${status}`);

  return (
    <>
      <PageHeader
        title="Demo requests"
        description="Review school enquiries and contact each school to confirm its walkthrough."
        action={
          <Button type="button" variant="outline" disabled={!requests && !error} onClick={() => {
            setRequests(null);
            setError("");
            setRevision((current) => current + 1);
          }}><RefreshCw size={16} />Refresh</Button>
        }
      />

      {error ? <Card className="p-5 text-sm text-danger" role="alert">{error}</Card>
        : !requests ? <Card className="p-5 text-sm text-muted" role="status">Loading requests…</Card>
        : (
          <>
            <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search by school or contact" /></div>
              <Select className="sm:w-48" label="Status" placeholder="All statuses" clearable value={status} onChange={setStatus}
                options={statuses.map((value) => ({ value, label: statusLabel(value) }))} />
            </Card>
            {filtered.length ? (
              <>
                <div className="grid gap-4 xl:grid-cols-2">
                  {pagination.rows.map((request) => <DemoRequestCard key={request.id} request={request} />)}
                </div>
                <TablePagination label="Requests" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount}
                  pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
              </>
            ) : (
              <Card className="p-6 text-sm text-muted">
                {requests.length ? "No requests match these filters." : "No schools have requested a demo yet."}
              </Card>
            )}
          </>
        )}
    </>
  );
}

function DemoRequestCard({ request }: { request: DemoRequestRecord }) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-semibold">{request.schoolName}</h2>
          <p className="mt-1 break-words text-sm text-muted">{request.contactName}</p>
        </div>
        <Badge tone="primary">{statusLabel(request.status)}</Badge>
      </div>
      <div className="mt-4 rounded-lg bg-surface-muted p-3 text-sm">
        <p className="flex items-start gap-2">
          <CalendarDays size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>Preferred time · {request.preferredDate && request.preferredTime ? `${formatDate(request.preferredDate.slice(0, 10))} at ${formatTime(request.preferredTime)} WAT` : "Not specified"}</span>
        </p>
        {request.schoolSize && <p className="mt-2 text-xs text-muted">Student count · {schoolSizes[request.schoolSize] ?? request.schoolSize}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className={buttonStyles("outline") + " max-w-full break-all"} href={`mailto:${request.email}`}><Mail size={15} className="shrink-0" />{request.email}</a>
        <a className={buttonStyles("outline")} href={`tel:${request.phone}`}><Phone size={15} />{request.phone}</a>
      </div>
      {request.notes && <p className="mt-4 whitespace-pre-wrap break-words border-t pt-3 text-sm text-muted">{request.notes}</p>}
      <p className="mt-4 text-xs text-muted">Requested {formatDateTime(request.createdAt)}</p>
    </Card>
  );
}
