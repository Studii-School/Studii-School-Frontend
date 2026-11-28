"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, CalendarDays, CheckCircle2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date-utils";
import { getDemoRequests, getSchools } from "./super-admin.api";
import { schoolKey, schoolStatus, statusLabel, type DemoRequestRecord, type SchoolRecord } from "./super-admin.types";

type DashboardData = {
  schools: SchoolRecord[] | null;
  requests: DemoRequestRecord[] | null;
};

const sections = [
  { href: "/super-admin/schools", title: "Manage schools", description: "Open a school to manage its details, features and administrators.", icon: Building2 },
  { href: "/super-admin/trash", title: "Trash", description: "Review records that have been moved to Trash.", icon: Trash2 },
];

export function SuperAdminDashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    void Promise.allSettled([getSchools(), getDemoRequests()]).then(([schools, requests]) => {
      if (!current) return;
      setData({
        schools: schools.status === "fulfilled" ? schools.value : null,
        requests: requests.status === "fulfilled" ? requests.value : null,
      });
    });
    return () => { current = false; };
  }, [revision]);

  const activeSchools = data?.schools?.filter((school) => schoolStatus(school.status) === "active");
  const suspendedSchools = data?.schools?.filter((school) => schoolStatus(school.status) === "suspended");
  const pendingSchools = data?.schools?.filter((school) => schoolStatus(school.status) === "review");
  const reviewSchools = data?.schools?.filter((school) => schoolStatus(school.status) === "review" || schoolStatus(school.status) === "suspended")
    .sort((first, second) => Number(schoolStatus(second.status) === "review") - Number(schoolStatus(first.status) === "review"))
    .slice(0, 5);
  const recentRequests = data?.requests
    ? [...data.requests].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)).slice(0, 5)
    : null;

  return (
    <>
      <PageHeader
        title="Platform dashboard"
        description="Manage school workspaces and follow up with schools interested in SchoolOS."
        action={<Button type="button" variant="outline" disabled={!data} onClick={() => {
          setData(null);
          setRevision((current) => current + 1);
        }}><RefreshCw size={16} />Refresh</Button>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: "Total schools", value: data?.schools?.length, icon: Building2, href: "/super-admin/schools" },
          { label: "Active schools", value: activeSchools?.length, icon: CheckCircle2, href: "/super-admin/schools?status=active" },
          { label: "Profiles to review", value: pendingSchools?.length, icon: ShieldAlert, href: "/super-admin/schools?status=review" },
          { label: "Suspended or inactive", value: suspendedSchools?.length, icon: ShieldAlert, href: "/super-admin/schools?status=suspended" },
          { label: "Demo requests", value: data?.requests?.length, icon: CalendarDays, href: "/super-admin/demo-requests" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link href={href} key={label} className="rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
            <Card className="h-full p-4 transition-colors hover:border-primary/40 sm:p-5">
              <Icon className="mb-3 text-primary" size={21} />
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{data ? value ?? "—" : "…"}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="my-5 grid items-start gap-5 xl:grid-cols-2">
        <SectionCard title="Recent demo requests" action={<Link className={buttonStyles("outline")} href="/super-admin/demo-requests">View all</Link>}>
          {!data ? <p className="p-5 text-sm text-muted" role="status">Loading requests…</p>
            : !recentRequests ? <p className="p-5 text-sm text-danger" role="alert">Demo requests could not be loaded.</p>
            : !recentRequests.length ? <p className="p-5 text-sm text-muted">No schools have requested a demo yet.</p>
            : (
              <ul className="divide-y">
                {recentRequests.map((request) => (
                  <li key={request.id} className="flex items-start justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{request.schoolName}</p>
                      <p className="mt-1 break-words text-xs text-muted">{request.contactName} · {formatDateTime(request.createdAt)}</p>
                    </div>
                    <Badge tone="primary">{statusLabel(request.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
        <SectionCard title="Schools needing attention" action={<Link className={buttonStyles("outline")} href="/super-admin/schools?status=review">Review profiles</Link>}>
          {!data ? <p className="p-5 text-sm text-muted" role="status">Loading schools…</p>
            : !reviewSchools ? <p className="p-5 text-sm text-danger" role="alert">School statuses could not be loaded.</p>
            : !reviewSchools.length ? <p className="p-5 text-sm text-muted">No schools are awaiting review or suspended.</p>
            : (
              <ul className="divide-y">
                {reviewSchools.map((school) => (
                  <li key={schoolKey(school) || school.name} className="flex items-start justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{school.name ?? "Unnamed school"}</p>
                      {school.email && <p className="mt-1 break-all text-xs text-muted">{school.email}</p>}
                    </div>
                    <Badge tone="warning">{statusLabel(school.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-start gap-3 rounded-xl border bg-surface p-4 hover:border-primary/40">
            <Icon size={20} className="mt-0.5 shrink-0 text-primary" />
            <div className="grow">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </div>
            <ArrowRight size={16} className="mt-0.5 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </>
  );
}
