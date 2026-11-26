"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime, formatTime } from "@/lib/date-utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DemoRequestRecord = { id: string; schoolName: string; contactName: string; email: string; phone: string; preferredDate: string; preferredTime: string; schoolSize?: string | null; notes?: string | null; status: string; createdAt: string };

export function DemoRequestsScreen() {
  const [requests, setRequests] = useState<DemoRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setRequests(await apiRequest<DemoRequestRecord[]>("/auth/demo-requests")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load demo requests."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <><PageHeader title="Demo requests" description="Walkthrough requests submitted from the public website." action={<Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</Button>} />
    {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
    {loading ? <Card className="p-6 text-sm text-muted">Loading requests…</Card> : requests.length ? <div className="grid gap-4 xl:grid-cols-2">{requests.map((request) => <Card key={request.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{request.schoolName}</h2><p className="mt-1 text-sm text-muted">{request.contactName}</p></div><span className="text-xs font-semibold text-primary">{request.status}</span></div><p className="mt-4 flex items-center gap-2 text-sm"><CalendarDays size={16} className="text-primary" />{formatDate(request.preferredDate.slice(0, 10))} at {formatTime(request.preferredTime)} WAT</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><a className="font-medium text-primary" href={`mailto:${request.email}`}>{request.email}</a><a className="font-medium text-primary" href={`tel:${request.phone}`}>{request.phone}</a></div>{request.schoolSize && <p className="mt-3 text-xs text-muted">School size: {request.schoolSize.replaceAll("_", " ")}</p>}{request.notes && <p className="mt-3 border-t pt-3 text-sm text-muted">{request.notes}</p>}<p className="mt-4 text-xs text-muted">Requested {formatDateTime(request.createdAt)}</p></Card>)}</div> : <Card className="p-8 text-sm text-muted">No demo requests yet. Requests from the public booking form will appear here.</Card>}
  </>;
}
