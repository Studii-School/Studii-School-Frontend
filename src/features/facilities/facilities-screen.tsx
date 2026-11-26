"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowUpRight, BookOpen, BusFront, CalendarClock, Check, CircleAlert, ClipboardList, HeartPulse, MapPin, PackageCheck, Plus, RotateCcw, Search, ShieldCheck, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RowActionSelect } from "@/components/ui/row-action-select";
import { SidePanel } from "@/components/ui/side-panel";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { readStoredUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/date-utils";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { facilitiesRepository } from "./facilities.repository";
import type { FacilityInputMap, FacilityModule, FacilitiesState, HealthRecord, InventoryAsset, LibraryLoan, SchoolRoute } from "./facilities.types";

type PortalRole = "admin" | "teacher" | "parent" | "student";
type PanelAction = "book" | "loan" | "loanRequest" | "route" | "transportAssignment" | "pickupUpdate" | "healthRecord" | "asset" | "maintenanceRequest";
const moduleMeta = {
  library: { title: "Library", subtitle: "A welcoming place to find, borrow and return school reading.", icon: BookOpen, accent: "var(--school-primary)", accent2: "var(--school-secondary)" },
  transport: { title: "Transport", subtitle: "Keep routes, riders and pickup plans in sync throughout the school day.", icon: BusFront, accent: "var(--school-secondary)", accent2: "var(--school-primary)" },
  health: { title: "Health & Safety", subtitle: "Keep essential care information ready and incidents recorded clearly.", icon: HeartPulse, accent: "#0f9f86", accent2: "var(--school-primary)" },
  inventory: { title: "Inventory", subtitle: "Know what the school owns, where it is and what needs attention.", icon: PackageCheck, accent: "#c47b12", accent2: "var(--school-secondary)" },
} satisfies Record<FacilityModule, { title: string; subtitle: string; icon: typeof BookOpen; accent: string; accent2: string }>;
const blank = (): FacilitiesState => ({ books: [], loans: [], routes: [], transportAssignments: [], pickupUpdates: [], healthRecords: [], assets: [], maintenanceRequests: [] });
const openLoan = (loan: LibraryLoan) => loan.status === "REQUESTED" || loan.status === "ISSUED";
const isOverdue = (loan: LibraryLoan) => openLoan(loan) && loan.status === "ISSUED" && loan.dueDate < new Date().toISOString().slice(0, 10);
const dateLabel = (value?: string) => value ? formatDate(value.slice(0, 10)) : "Not set";
const fieldClass = "h-11 w-full rounded-[10px] border bg-surface px-3 text-sm outline-none focus:border-[var(--school-primary)] focus:ring-2 focus:ring-[var(--school-primary)]/15";

export function FacilitiesScreen({ module, portal }: { module: FacilityModule; portal: PortalRole }) {
  const [data, setData] = useState<FacilitiesState>(blank);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<PanelAction | null>(null);
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<ReturnType<typeof readStoredUser>>(null);
  const { state: academics } = useAcademics();
  const { toast } = useActionFeedback();
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await facilitiesRepository.getAll()); }
    catch (error) { toast(error instanceof Error ? error.message : "Facilities data could not be loaded.", "error"); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { setViewer(readStoredUser()); void refresh(); }, [refresh]);

  const allowedStudentIds = useMemo(() => {
    if (portal === "admin") return null;
    if (portal === "student") return new Set(academics.students.filter((student) => student.userId === viewer?.id || student.id === viewer?.studentId).map((student) => student.id));
    if (portal === "parent") return new Set(parentChildrenFromAcademics(academics).map((student) => student.id));
    const assignedClassIds = new Set(academics.classes.filter((item) => item.classTeacherUserId === viewer?.id || item.assignedTeacherUserIds.includes(viewer?.id ?? "") || academics.teacherAssignments.some((assignment) => assignment.teacherUserId === viewer?.id && assignment.classId === item.id)).map((item) => item.id));
    return new Set(academics.students.filter((student) => assignedClassIds.has(student.classId)).map((student) => student.id));
  }, [academics, portal, viewer]);

  const visibleLoans = data.loans.filter((loan) => !allowedStudentIds || allowedStudentIds.has(loan.studentId));
  const visibleAssignments = data.transportAssignments.filter((item) => !allowedStudentIds || allowedStudentIds.has(item.studentId));
  const visibleHealthRecords = data.healthRecords.filter((item) => (!allowedStudentIds || allowedStudentIds.has(item.studentId)) && (portal !== "teacher" || ["ALLERGY", "MEDICATION", "CONDITION", "EMERGENCY_CONTACT"].includes(item.category)));
  const visiblePickupUpdates = data.pickupUpdates.filter((item) => !allowedStudentIds || !item.studentId || allowedStudentIds.has(item.studentId));
  const displayStudents = academics.students.filter((student) => !allowedStudentIds || allowedStudentIds.has(student.id));
  const activeLoans = visibleLoans.filter(openLoan);
  const overdueLoans = activeLoans.filter(isOverdue);
  const dueToday = activeLoans.filter((loan) => loan.status === "ISSUED" && loan.dueDate === new Date().toISOString().slice(0, 10));
  const updateData = (next: FacilitiesState) => setData(next);

  const create = async <K extends PanelAction,>(action: K, input: FacilityInputMap[K]) => {
    try {
      const result = await facilitiesRepository.create(action, input);
      if (result && typeof result === "object" && "books" in result) updateData(result as FacilitiesState);
      else await refresh();
      setPanel(null);
      toast(action === "loanRequest" ? "Book request sent to the library." : action === "pickupUpdate" ? "Pickup update shared." : action === "maintenanceRequest" ? "Maintenance request logged." : "Saved successfully.", "success");
    } catch (error) { toast(error instanceof Error ? error.message : "Could not save this record.", "error"); }
  };

  const returnLoan = async (id: string) => {
    try { updateData(await facilitiesRepository.returnLoan(id)); toast("Book marked as returned.", "success"); }
    catch (error) { toast(error instanceof Error ? error.message : "The return could not be saved.", "error"); }
  };
  const resolveLoanRequest = async (id: string, issue: boolean) => {
    try { updateData(await facilitiesRepository.resolveLoanRequest(id, issue)); toast(issue ? "Book request approved and issued." : "Book request declined.", issue ? "success" : "info"); }
    catch (error) { toast(error instanceof Error ? error.message : "Request could not be updated.", "error"); }
  };
  const assetCondition = async (asset: InventoryAsset, condition: InventoryAsset["condition"]) => {
    try { updateData(await facilitiesRepository.updateAssetCondition(asset.id, condition)); toast(`${asset.name} updated.`, "success"); }
    catch (error) { toast(error instanceof Error ? error.message : "Asset could not be updated.", "error"); }
  };
  const maintenanceStatus = async (id: string, status: "IN_PROGRESS" | "RESOLVED") => {
    try { updateData(await facilitiesRepository.updateMaintenanceStatus(id, status)); toast("Maintenance request updated.", "success"); }
    catch (error) { toast(error instanceof Error ? error.message : "Request could not be updated.", "error"); }
  };

  const meta = moduleMeta[module];
  const Icon = meta.icon;
  const canManage = portal === "admin";
  const canReport = portal === "teacher" || portal === "parent" || portal === "student";
  const titleActions = module === "library" && canManage ? <Button onClick={() => setPanel("book")}><Plus size={16}/>Add a book</Button>
    : module === "transport" && canManage ? <Button onClick={() => setPanel("route")}><Plus size={16}/>Create route</Button>
    : module === "health" && (canManage || portal === "teacher") ? <Button variant="secondary" onClick={() => setPanel("healthRecord")}><Plus size={16}/>Record health update</Button>
    : module === "inventory" && canManage ? <Button variant="secondary" onClick={() => setPanel("asset")}><Plus size={16}/>Add asset</Button>
    : module === "transport" && canReport && visibleAssignments.length > 0 ? <Button variant="secondary" onClick={() => setPanel("pickupUpdate")}><ArrowUpRight size={16}/>Share pickup update</Button>
    : module === "inventory" && canReport ? <Button variant="secondary" onClick={() => setPanel("maintenanceRequest")}><Wrench size={16}/>Report an issue</Button>
    : null;

  return <div className="min-w-0 space-y-6">
    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8" style={{ background: `linear-gradient(115deg, ${meta.accent}, ${meta.accent2})` }}>
      <div className="pointer-events-none absolute -right-8 -top-12 size-56 rounded-full border-[28px] border-white/10"/><div className="pointer-events-none absolute -bottom-24 right-36 size-44 rounded-full bg-white/10"/>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-white/15"><Icon size={25}/></div><h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/85">{meta.subtitle}</p></div><div className="flex flex-wrap gap-2">{titleActions}</div></div>
    </div>
    <PageHeader title={module === "health" ? "Care desk" : `${meta.title} workspace`} description={portal === "admin" ? "Manage school records and keep everyday operations moving." : portal === "teacher" ? "Your school tools, with the information you need for your assigned classes." : "The latest information for you and your family."}/>
    {module === "library" && <LibraryWorkspace data={data} loans={visibleLoans} overdue={overdueLoans} dueToday={dueToday} portal={portal} onAction={setPanel} onReturn={returnLoan} onResolveRequest={resolveLoanRequest} query={query} setQuery={setQuery} loading={loading}/>}
    {module === "transport" && <TransportWorkspace data={data} assignments={visibleAssignments} updates={visiblePickupUpdates} portal={portal} onAction={setPanel} query={query} setQuery={setQuery} loading={loading} />}
    {module === "health" && <HealthWorkspace records={visibleHealthRecords} students={displayStudents} portal={portal} onAction={setPanel} query={query} setQuery={setQuery} loading={loading} />}
    {module === "inventory" && <InventoryWorkspace data={data} portal={portal} onAction={setPanel} onCondition={assetCondition} onMaintenanceStatus={maintenanceStatus} query={query} setQuery={setQuery} loading={loading} />}
    <FacilityActionPanel action={panel} module={module} books={data.books} routes={data.routes} students={displayStudents.map((student) => ({ id: student.id, label: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "), className: academics.classes.find((item) => item.id === student.classId)?.displayName }))} assets={data.assets} userName={viewer?.name ?? "School team"} userId={viewer?.id ?? ""} onClose={() => setPanel(null)} onSave={create}/>
  </div>;
}

function StatTile({ icon: Icon, label, value, note, tone = "primary" }: { icon: typeof BookOpen; label: string; value: string | number; note: string; tone?: "primary" | "secondary" | "warning" | "success" }) {
  const styles = { primary: "bg-primary-light text-[var(--school-primary)]", secondary: "bg-secondary-light text-[var(--school-secondary)]", warning: "bg-amber-100 text-amber-700", success: "bg-emerald-100 text-emerald-700" };
  return <Card className="flex min-w-0 items-start gap-3 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}><Icon size={19}/></span><div className="min-w-0"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-0.5 text-xl font-bold">{value}</p><p className="mt-0.5 truncate text-xs text-muted">{note}</p></div></Card>;
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <Card className="min-w-0 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5"><div><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-muted">{description}</p>}</div>{action}</div>{children}</Card>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange(value: string): void; placeholder: string }) {
  return <label className="relative block min-w-0"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input className={`${fieldClass} pl-9`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder}/></label>;
}

function LibraryWorkspace({ data, loans, overdue, dueToday, portal, onAction, onReturn, onResolveRequest, query, setQuery, loading }: { data: FacilitiesState; loans: LibraryLoan[]; overdue: LibraryLoan[]; dueToday: LibraryLoan[]; portal: PortalRole; onAction(action: PanelAction): void; onReturn(id: string): void; onResolveRequest(id: string, issue: boolean): void; query: string; setQuery(value: string): void; loading: boolean }) {
  const canManage = portal === "admin";
  const canIssue = portal === "admin" || portal === "teacher";
  const books = data.books.filter((book) => `${book.title} ${book.author} ${book.category} ${book.isbn ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={BookOpen} label="Catalogue" value={data.books.length} note="Titles ready to discover"/><StatTile icon={ArrowDownToLine} label="Copies available" value={data.books.reduce((sum, book) => sum + book.availableCopies, 0)} note="Across the whole catalogue" tone="secondary"/><StatTile icon={CalendarClock} label="Due today" value={dueToday.length} note="Help readers stay on time" tone="warning"/><StatTile icon={CircleAlert} label="Overdue" value={overdue.length} note="Loans needing a reminder" tone="success"/></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <Section title="Browse the shelves" description="Search by title, author, category or ISBN." action={<div className="w-full sm:w-72"><SearchBox value={query} onChange={setQuery} placeholder="Find a book"/></div>}>
        {loading ? <p className="p-6 text-sm text-muted">Loading catalogue…</p> : books.length ? <div className="grid gap-3 p-4 sm:grid-cols-2">{books.map((book) => <article key={book.id} className="flex min-w-0 flex-col rounded-xl border p-4 transition hover:border-[var(--school-primary)]/40 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-primary-light p-2 text-[var(--school-primary)]"><BookOpen size={18}/></span><Badge tone={book.availableCopies ? "success" : "warning"}>{book.availableCopies ? `${book.availableCopies} available` : "All borrowed"}</Badge></div><h3 className="mt-4 font-semibold">{book.title}</h3><p className="mt-1 text-sm text-muted">{book.author} · {book.category}</p><p className="mt-1 text-xs text-muted">{book.shelf ? `Shelf ${book.shelf}` : "Shelf not assigned"}{book.isbn ? ` · ISBN ${book.isbn}` : ""}</p>{book.availableCopies > 0 && !canManage && <Button className="mt-4 w-full" variant={canIssue ? "outline" : "secondary"} onClick={() => onAction(canIssue ? "loan" : "loanRequest")}>{canIssue ? "Issue a copy" : "Request this book"}</Button>}</article>)}</div> : <EmptyState title="No books in the catalogue yet" description={canManage ? "Add the first book to start tracking copies and loans." : "Your librarian will add books as they become available."}/>}
      </Section>
      <Section title={portal === "parent" || portal === "student" ? "My family’s loans" : "Loan desk"} description="Open loans and requests, with due dates at a glance." action={canIssue ? <Button className="min-h-9 px-3" variant="secondary" onClick={() => onAction("loan")}><Plus size={15}/>Issue book</Button> : undefined}>
        {loans.length ? <div className="divide-y">{loans.slice(0, 8).map((loan) => <div key={loan.id} className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate font-semibold">{loan.bookTitle}</p><p className="mt-1 text-xs text-muted">{loan.studentName} · Due {dateLabel(loan.dueDate)}</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={loan.status === "RETURNED" || loan.status === "DECLINED" ? "neutral" : loan.status === "REQUESTED" ? "warning" : isOverdue(loan) ? "danger" : "success"}>{loan.status === "ISSUED" && isOverdue(loan) ? "OVERDUE" : loan.status}</Badge>{loan.status === "ISSUED" && <Badge tone="neutral">{isOverdue(loan) ? `${Math.ceil((Date.now() - new Date(`${loan.dueDate}T00:00:00`).getTime()) / 86400000)} days late` : "On loan"}</Badge>}</div></div>{canIssue && loan.status === "ISSUED" && <Button variant="outline" className="shrink-0 px-3" onClick={() => onReturn(loan.id)}><RotateCcw size={14}/>Return</Button>}{portal === "admin" && loan.status === "REQUESTED" && <div className="flex shrink-0 gap-1"><Button className="min-h-9 px-2" onClick={() => onResolveRequest(loan.id, true)} aria-label={`Approve ${loan.studentName}'s request`}><Check size={15}/></Button><Button className="min-h-9 px-2" variant="outline" onClick={() => onResolveRequest(loan.id, false)} aria-label={`Decline ${loan.studentName}'s request`}>Decline</Button></div>}</div>)}</div> : <EmptyState title="No loans to show" description="New issues, requests and returns will appear here."/>}
        {canManage && <div className="border-t bg-surface-muted/50 p-4"><p className="text-xs leading-5 text-muted">{data.loans.filter((loan) => loan.status === "REQUESTED").length} request(s) waiting for librarian review.</p></div>}
      </Section>
    </div>
    {portal === "parent" || portal === "student" ? <p className="flex items-start gap-2 rounded-xl border border-[var(--school-secondary)]/25 bg-secondary-light/30 p-4 text-sm"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--school-secondary)]"/>Overdue reminders and new requests will be shared with your school account.</p> : null}
  </>;
}

function TransportWorkspace({ data, assignments, updates, portal, onAction, query, setQuery, loading }: { data: FacilitiesState; assignments: FacilitiesState["transportAssignments"]; updates: FacilitiesState["pickupUpdates"]; portal: PortalRole; onAction(action: PanelAction): void; query: string; setQuery(value: string): void; loading: boolean }) {
  const canManage = portal === "admin";
  const activeRoutes = data.routes.filter((route) => route.status === "ACTIVE");
  const filteredRoutes = activeRoutes.filter((route) => `${route.name} ${route.vehicleNumber} ${route.driver} ${route.stops.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={BusFront} label="Active routes" value={activeRoutes.length} note="Vehicles ready for service"/><StatTile icon={Users} label="Assigned riders" value={assignments.filter((item) => item.status === "ACTIVE").length} note="Students with a route" tone="secondary"/><StatTile icon={MapPin} label="Stops" value={activeRoutes.reduce((sum, route) => sum + route.stops.length, 0)} note="Across active routes" tone="success"/><StatTile icon={Activity} label="Recent updates" value={updates.length} note="Pickup changes and notices" tone="warning"/></div>
    {portal === "admin" && <Section title="Rider assignments" description="Assign each student to one route and save the pickup contact and stop."><AssignmentList items={assignments} routes={data.routes} onAssign={() => onAction("transportAssignment")}/></Section>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]"><Section title={canManage ? "Routes & vehicles" : "Your routes"} description="Driver, departure time and the stops on each route." action={<div className="w-full sm:w-64"><SearchBox value={query} onChange={setQuery} placeholder="Search routes"/></div>}>
      {loading ? <p className="p-6 text-sm text-muted">Loading routes…</p> : filteredRoutes.length ? <div className="grid gap-3 p-4 sm:grid-cols-2">{filteredRoutes.map((route) => <RouteCard key={route.id} route={route} riders={data.transportAssignments.filter((item) => item.routeId === route.id).length}/>)}</div> : <EmptyState title="No routes configured" description={canManage ? "Create the first route and add the vehicle, driver and stops." : "The school’s active routes will appear here."}/>}</Section>
      <Section title="Pickup updates" description="Share changes early so everyone knows the plan.">{updates.length ? <div className="divide-y">{updates.slice(0, 8).map((item) => <div key={item.id} className="flex gap-3 p-4"><span className="mt-0.5 rounded-lg bg-secondary-light p-2 text-[var(--school-secondary)]"><ArrowUpRight size={16}/></span><div className="min-w-0"><p className="text-sm font-medium">{item.message}</p><p className="mt-1 text-xs text-muted">{item.studentName ? `${item.studentName} · ` : "School update · "}{dateLabel(item.createdAt)}</p></div></div>)}</div> : <EmptyState title="No pickup updates" description="New pickup instructions and route notices will show here."/>}</Section>
    </div>
    {portal !== "admin" && assignments.length > 0 && <Section title="My transport plan" description="Your saved route and authorized pickup details."><div className="grid gap-3 p-4 sm:grid-cols-2">{assignments.map((item) => <div key={item.id} className="rounded-xl border bg-surface-muted/40 p-4"><p className="font-semibold">{data.routes.find((route) => route.id === item.routeId)?.name ?? "Assigned route"}</p><p className="mt-2 text-sm">Pickup: {item.pickupStop}</p><p className="text-sm">Drop-off: {item.dropoffStop}</p><p className="mt-2 text-xs text-muted">Authorized contact: {item.pickupContact} · {item.pickupPhone}</p></div>)}</div></Section>}
  </>;
}

function RouteCard({ route, riders }: { route: SchoolRoute; riders: number }) {
  return <article className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-secondary-light p-2 text-[var(--school-secondary)]"><BusFront size={19}/></span><Badge tone={route.status === "ACTIVE" ? "success" : "neutral"}>{route.status}</Badge></div><h3 className="mt-3 font-semibold">{route.name}</h3><p className="mt-1 text-sm text-muted">{route.vehicle} · {route.vehicleNumber}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p><span className="block text-muted">Driver</span><b>{route.driver}</b></p><p><span className="block text-muted">Leaves at</span><b>{formatTime(route.departureTime)}</b></p><p><span className="block text-muted">Riders</span><b>{riders}</b></p><p><span className="block text-muted">Contact</span><b>{route.driverPhone}</b></p></div><div className="mt-3 border-t pt-3"><p className="mb-2 text-xs font-semibold text-muted">STOPS</p><div className="flex flex-wrap gap-1.5">{route.stops.map((stop, index) => <span key={`${stop}-${index}`} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{index + 1}. {stop}</span>)}</div></div></article>;
}

function AssignmentList({ items, routes, onAssign }: { items: FacilitiesState["transportAssignments"]; routes: SchoolRoute[]; onAssign(): void }) {
  return <div><div className="flex justify-end p-3"><Button variant="outline" onClick={onAssign}><Plus size={15}/>Assign a student</Button></div>{items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Student", "Route", "Pickup", "Drop-off", "Contact", "Status"].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="whitespace-nowrap px-4 py-3 font-medium">{item.studentName}</td><td className="whitespace-nowrap px-4 py-3">{routes.find((route) => route.id === item.routeId)?.name ?? "Route removed"}</td><td className="px-4 py-3">{item.pickupStop}</td><td className="px-4 py-3">{item.dropoffStop}</td><td className="whitespace-nowrap px-4 py-3">{item.pickupContact} · {item.pickupPhone}</td><td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</Badge></td></tr>)}</tbody></table></div> : <EmptyState title="No rider assignments" description="Add students after creating at least one route."/>}</div>;
}

function HealthWorkspace({ records, students, portal, onAction, query, setQuery, loading }: { records: HealthRecord[]; students: Array<{ firstName: string; middleName?: string; lastName: string; id: string; medicalNotes?: string; emergencyContactName?: string; emergencyContactPhone?: string; updatedAt: string }>; portal: PortalRole; onAction(action: PanelAction): void; query: string; setQuery(value: string): void; loading: boolean }) {
  const profileRecords: HealthRecord[] = students.flatMap((student) => {
    const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
    const existing = records.filter((record) => record.studentId === student.id);
    return [
      ...(!existing.some((record) => record.category === "CONDITION") && student.medicalNotes ? [{ id: `profile-health-${student.id}`, schoolId: "", studentId: student.id, studentName: name, category: "CONDITION" as const, title: "Medical notes", details: student.medicalNotes, recordedBy: "Student profile", createdAt: student.updatedAt }] : []),
      ...(!existing.some((record) => record.category === "EMERGENCY_CONTACT") && (student.emergencyContactName || student.emergencyContactPhone) ? [{ id: `profile-emergency-${student.id}`, schoolId: "", studentId: student.id, studentName: name, category: "EMERGENCY_CONTACT" as const, title: "Emergency contact", details: "Primary contact saved on the student profile.", contactName: student.emergencyContactName, contactPhone: student.emergencyContactPhone, recordedBy: "Student profile", createdAt: student.updatedAt }] : []),
    ];
  });
  const allRecords = [...records, ...profileRecords];
  const incidents = allRecords.filter((record) => record.category === "INCIDENT");
  const carePlans = allRecords.filter((record) => ["ALLERGY", "MEDICATION", "CONDITION"].includes(record.category));
  const contacts = allRecords.filter((record) => record.category === "EMERGENCY_CONTACT");
  const filtered = allRecords.filter((record) => `${record.studentName} ${record.title} ${record.category} ${record.details}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={ShieldCheck} label={portal === "parent" || portal === "student" ? "Care information" : "Active care notes"} value={carePlans.length} note="Allergies, medication and conditions" tone="success"/><StatTile icon={CircleAlert} label="Incidents" value={incidents.length} note="Recorded safety events" tone="warning"/><StatTile icon={Users} label="Emergency contacts" value={contacts.length} note="Contacts available to the school" tone="secondary"/><StatTile icon={HeartPulse} label="Student profiles" value={new Set(records.map((record) => record.studentId)).size || students.length} note="Profiles with a health record"/></div>
    {(portal === "parent" || portal === "student") && <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18}/><p><b>Private and protected.</b> This view only shows health and emergency information linked to your account. Contact the school office to correct a record.</p></div>}
    {portal === "teacher" && <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18}/><p><b>Need help now?</b> Contact the school office or the emergency contact listed on the student profile. Use the incident form to document an event after the student is safe.</p></div>}
    <Section title={portal === "teacher" ? "Class care notes" : "Student health records"} description={portal === "admin" ? "Review care plans, emergency contacts and incident reports." : portal === "teacher" ? "Only essential care alerts and emergency contacts for your assigned classes are shown." : "Health details connected to your child’s profile."} action={<div className="w-full sm:w-64"><SearchBox value={query} onChange={setQuery} placeholder="Search care records"/></div>}>
      {loading ? <p className="p-6 text-sm text-muted">Loading health records…</p> : filtered.length ? <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((record) => <HealthRecordCard key={record.id} record={record} restricted={portal === "teacher"}/>)}</div> : <EmptyState title="No health records to show" description={portal === "admin" ? "Record emergency contacts and care plans so staff can respond with confidence." : "The school will share essential health information here when a record is available."}/>}
    </Section>
  </>;
}

function HealthRecordCard({ record, restricted }: { record: HealthRecord; restricted: boolean }) {
  const tone = record.severity === "CRITICAL" || record.severity === "HIGH" ? "danger" : record.severity === "MODERATE" ? "warning" : "neutral";
  return <article className={`rounded-xl border p-4 ${record.severity === "CRITICAL" ? "border-rose-300 bg-rose-50/60" : "bg-surface"}`}><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700"><HeartPulse size={18}/></span><Badge tone={tone}>{record.severity ?? record.category}</Badge></div><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{record.category.replaceAll("_", " ")}</p><h3 className="mt-1 font-semibold">{record.title}</h3><p className="mt-1 text-xs text-muted">{record.studentName} · {dateLabel(record.createdAt)}</p><p className="mt-3 text-sm leading-5">{record.details}</p>{(record.contactName || record.contactPhone) && <div className="mt-3 rounded-lg bg-surface-muted p-3 text-xs"><p className="font-semibold">Emergency contact</p><p className="mt-1">{record.contactName} · {record.contactPhone}</p></div>}{restricted && <p className="mt-3 text-[11px] text-muted">Shared for student safety. Recorded by {record.recordedBy}.</p>}</article>;
}

function InventoryWorkspace({ data, portal, onAction, onCondition, onMaintenanceStatus, query, setQuery, loading }: { data: FacilitiesState; portal: PortalRole; onAction(action: PanelAction): void; onCondition(asset: InventoryAsset, condition: InventoryAsset["condition"]): void; onMaintenanceStatus(id: string, status: "IN_PROGRESS" | "RESOLVED"): void; query: string; setQuery(value: string): void; loading: boolean }) {
  const assets = data.assets.filter((asset) => `${asset.name} ${asset.assetTag} ${asset.category} ${asset.location}`.toLowerCase().includes(query.toLowerCase()));
  const attention = data.assets.filter((item) => item.condition !== "GOOD");
  const openRequests = data.maintenanceRequests.filter((item) => item.status !== "RESOLVED");
  const canManage = portal === "admin";
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={PackageCheck} label="Tracked assets" value={data.assets.reduce((sum, item) => sum + item.quantity, 0)} note={`${data.assets.length} asset records`} tone="secondary"/><StatTile icon={Check} label="In good condition" value={data.assets.filter((item) => item.condition === "GOOD").length} note="Ready for everyday use" tone="success"/><StatTile icon={Wrench} label="Needs attention" value={attention.length} note="Repair or service flagged" tone="warning"/><StatTile icon={ClipboardList} label="Open requests" value={openRequests.length} note="Maintenance reports to review"/></div>
    <Section title="Asset register" description="Equipment, supplies and their current location." action={<div className="w-full sm:w-64"><SearchBox value={query} onChange={setQuery} placeholder="Search assets"/></div>}>
      {loading ? <p className="p-6 text-sm text-muted">Loading inventory…</p> : assets.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Asset", "Tag", "Category", "Location", "Qty", "Condition", "Next service", ...(canManage ? ["Update"] : [])].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{assets.map((asset) => <tr key={asset.id}><td className="whitespace-nowrap px-4 py-3 font-semibold">{asset.name}</td><td className="whitespace-nowrap px-4 py-3 text-muted">{asset.assetTag}</td><td className="px-4 py-3">{asset.category}</td><td className="px-4 py-3">{asset.location}</td><td className="px-4 py-3">{asset.quantity}</td><td className="px-4 py-3"><Badge tone={asset.condition === "GOOD" ? "success" : asset.condition === "NEEDS_REPAIR" ? "warning" : "danger"}>{asset.condition.replaceAll("_", " ")}</Badge></td><td className="whitespace-nowrap px-4 py-3">{dateLabel(asset.nextMaintenance)}</td>{canManage && <td className="whitespace-nowrap px-4 py-3"><RowActionSelect label={`Update ${asset.name} condition`} actions={[{ label: "Good", onSelect: () => onCondition(asset, "GOOD") }, { label: "Needs repair", onSelect: () => onCondition(asset, "NEEDS_REPAIR") }, { label: "Out of service", onSelect: () => onCondition(asset, "OUT_OF_SERVICE") }]}/></td>}</tr>)}</tbody></table></div> : <EmptyState title="No assets in the register" description={canManage ? "Add school equipment and supplies to start tracking their condition." : "The school asset register will appear here."}/>}
    </Section>
    <Section title="Maintenance board" description="Staff can report an issue; administrators can move requests through to completion." action={!canManage ? <Button variant="secondary" onClick={() => onAction("maintenanceRequest")}><Wrench size={15}/>Report an issue</Button> : undefined}>
      {data.maintenanceRequests.length ? <div className="grid gap-3 p-4 lg:grid-cols-2">{data.maintenanceRequests.map((request) => <article key={request.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{request.assetName}</h3><p className="mt-1 text-xs text-muted">{request.location} · Reported {dateLabel(request.createdAt)}</p></div><Badge tone={request.priority === "URGENT" ? "danger" : request.status === "RESOLVED" ? "success" : "warning"}>{request.status.replaceAll("_", " ")}</Badge></div><p className="mt-3 text-sm leading-5">{request.description}</p><p className="mt-2 text-xs text-muted">Reported by {request.reportedBy}</p>{canManage && request.status !== "RESOLVED" && <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => onMaintenanceStatus(request.id, "IN_PROGRESS")}>In progress</Button><Button variant="secondary" onClick={() => onMaintenanceStatus(request.id, "RESOLVED")}><Check size={15}/>Resolve</Button></div>}</article>)}</div> : <EmptyState title="No maintenance requests" description="Reports from teachers and staff will appear here for review."/>}
    </Section>
  </>;
}

function FacilityActionPanel({ action, module, books, routes, students, assets, userName, userId, onClose, onSave }: { action: PanelAction | null; module: FacilityModule; books: FacilitiesState["books"]; routes: SchoolRoute[]; students: Array<{ id: string; label: string; className?: string }>; assets: InventoryAsset[]; userName: string; userId: string; onClose(): void; onSave<K extends PanelAction>(action: K, input: FacilityInputMap[K]): Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectError, setSelectError] = useState("");
  useEffect(() => { setValues({ dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), departureTime: "07:00", copies: "1", quantity: "1", kind: "GENERAL", severity: "MODERATE", category: module === "health" ? "INCIDENT" : "", status: "ACTIVE", condition: "GOOD", priority: "NORMAL" }); }, [action, module]);
  if (!action) return null;
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const title: Record<PanelAction, string> = { book: "Add a book", loan: "Issue a book", loanRequest: "Request a book", route: "Create a route", transportAssignment: "Assign a student", pickupUpdate: "Share a pickup update", healthRecord: "Record health information", asset: "Add an asset", maintenanceRequest: "Report a maintenance issue" };
  const studentOptions = students.map((item) => ({ value: item.id, label: item.className ? `${item.label} · ${item.className}` : item.label }));
  const bookOptions = books.map((item) => ({ value: item.id, label: `${item.title} (${item.availableCopies} available)` }));
  const routeOptions = routes.filter((route) => route.status === "ACTIVE").map((route) => ({ value: route.id, label: route.name }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const requiredSelections: Partial<Record<PanelAction, string[]>> = { loan: ["bookId", "studentId"], loanRequest: ["bookId", "studentId"], transportAssignment: ["studentId", "routeId"], pickupUpdate: ["studentId", "routeId"], healthRecord: ["studentId"] };
    if ((requiredSelections[action] ?? []).some((key) => !values[key])) {
      setSelectError("Choose the required options before saving.");
      return;
    }
    setSelectError("");
    switch (action) {
      case "book": return void onSave(action, { title: values.title ?? "", author: values.author ?? "", isbn: values.isbn, category: values.category ?? "General", copies: Number(values.copies), shelf: values.shelf });
      case "loan":
      case "loanRequest": { const student = students.find((item) => item.id === values.studentId); return void onSave(action, { bookId: values.bookId ?? "", studentId: values.studentId ?? "", studentName: student?.label ?? "", className: student?.className, dueDate: values.dueDate ?? "" }); }
      case "route": return void onSave(action, { name: values.name ?? "", vehicle: values.vehicle ?? "Bus", vehicleNumber: values.vehicleNumber ?? "", driver: values.driver ?? "", driverPhone: values.driverPhone ?? "", departureTime: values.departureTime ?? "07:00", stops: (values.stops ?? "").split(",").map((item) => item.trim()).filter(Boolean), status: "ACTIVE" });
      case "transportAssignment": { const student = students.find((item) => item.id === values.studentId); return void onSave(action, { routeId: values.routeId ?? "", studentId: values.studentId ?? "", studentName: student?.label ?? "", pickupStop: values.pickupStop ?? "", dropoffStop: values.dropoffStop ?? "", pickupContact: values.pickupContact ?? "", pickupPhone: values.pickupPhone ?? "", status: "ACTIVE" }); }
      case "pickupUpdate": { const student = students.find((item) => item.id === values.studentId); return void onSave(action, { studentId: values.studentId, studentName: student?.label, routeId: values.routeId, message: values.message ?? "", kind: values.kind as FacilityInputMap["pickupUpdate"]["kind"], createdBy: userName }); }
      case "healthRecord": { const student = students.find((item) => item.id === values.studentId); return void onSave(action, { studentId: values.studentId ?? "", studentName: student?.label ?? "", category: values.category as FacilityInputMap["healthRecord"]["category"], title: values.title ?? "", details: values.details ?? "", severity: values.severity as FacilityInputMap["healthRecord"]["severity"], contactName: values.contactName, contactPhone: values.contactPhone, recordedBy: userName }); }
      case "asset": return void onSave(action, { name: values.name ?? "", assetTag: values.assetTag ?? "", category: values.category ?? "Equipment", location: values.location ?? "", quantity: Number(values.quantity), condition: values.condition as FacilityInputMap["asset"]["condition"], nextMaintenance: values.nextMaintenance || undefined, notes: values.notes });
      case "maintenanceRequest": { const asset = assets.find((item) => item.id === values.assetId); return void onSave(action, { assetId: asset?.id, assetName: asset?.name ?? values.assetName ?? "", location: asset?.location ?? values.location ?? "", description: values.description ?? "", priority: values.priority as FacilityInputMap["maintenanceRequest"]["priority"], reportedBy: userName }); }
    }
  };
  const select = (key: string, label: string, options: Array<{ value: string; label: string }>, placeholder: string, required = true) => <div className="block text-sm font-medium">{label}<Select className="mt-2" label={label} placeholder={placeholder} value={values[key] ?? ""} onChange={(value) => { set(key, value); setSelectError(""); }} options={options}/>{required && !values[key] && <span className="sr-only">{label} is required</span>}</div>;
  const text = (key: string, label: string, placeholder = "", type = "text", required = true) => <label className="block text-sm font-medium">{label}<Input className="mt-2" required={required} type={type} value={values[key] ?? ""} placeholder={placeholder} onChange={(event) => set(key, event.target.value)}/></label>;
  const area = (key: string, label: string, placeholder = "") => <label className="block text-sm font-medium">{label}<textarea className="mt-2 min-h-24 w-full rounded-[10px] border bg-surface p-3 text-sm outline-none focus:border-[var(--school-primary)] focus:ring-2 focus:ring-[var(--school-primary)]/15" required value={values[key] ?? ""} placeholder={placeholder} onChange={(event) => set(key, event.target.value)}/></label>;
  return <SidePanel open title={title[action]} description={moduleMeta[module].subtitle} onClose={onClose} maxWidth="md"><form className="space-y-4" onSubmit={submit}>{selectError && <p role="alert" className="text-sm text-danger">{selectError}</p>}
    {action === "book" && <>{text("title", "Book title", "e.g. The River Between")}{text("author", "Author", "Ngũgĩ wa Thiong’o") }<div className="grid gap-4 sm:grid-cols-2">{text("category", "Category", "Fiction / Science")}{text("copies", "Number of copies", "1", "number")}{text("isbn", "ISBN", "", "text", false)}{text("shelf", "Shelf location", "B-04", "text", false)}</div></>}
    {(action === "loan" || action === "loanRequest") && <>{select("bookId", "Book", bookOptions, "Choose a book")}{select("studentId", "Student", studentOptions, "Choose a student")}{text("dueDate", "Due date", "", "date")}{action === "loanRequest" && <p className="rounded-lg bg-secondary-light/40 p-3 text-xs leading-5">The library team will review the request. It will not reduce the available copy count until it is issued.</p>}</>}
    {action === "route" && <>{text("name", "Route name", "North route") }<div className="grid gap-4 sm:grid-cols-2">{text("vehicle", "Vehicle", "School bus")}{text("vehicleNumber", "Vehicle number", "ABC 123 XY")}{text("driver", "Driver name")}{text("driverPhone", "Driver phone", "080…", "tel")}{text("departureTime", "Departure time", "07:00", "time")}</div>{text("stops", "Route stops", "Enter stops separated by commas")}</>}
    {action === "transportAssignment" && <>{select("studentId", "Student", studentOptions, "Choose a student")}{select("routeId", "Route", routeOptions, "Choose a route")}{text("pickupStop", "Pickup stop")}{text("dropoffStop", "Drop-off stop")}{text("pickupContact", "Authorized pickup contact")}{text("pickupPhone", "Pickup contact phone", "080…", "tel")}</>}
    {action === "pickupUpdate" && <>{select("studentId", "Student", studentOptions, "Choose a student")}{select("routeId", "Route", routeOptions, "Choose a route")}{select("kind", "Update type", [{ value: "GENERAL", label: "General note" }, { value: "DELAY", label: "Running late" }, { value: "PICKUP_CHANGE", label: "Pickup change" }, { value: "ABSENT", label: "Not travelling today" }], "Choose update type")}{area("message", "Message", "Add the change and the time it takes effect.")}</>}
    {action === "healthRecord" && <>{select("studentId", "Student", studentOptions, "Choose a student")}{select("category", "Record type", [{ value: "INCIDENT", label: "Incident" }, { value: "ALLERGY", label: "Allergy" }, { value: "MEDICATION", label: "Medication" }, { value: "CONDITION", label: "Health condition" }, { value: "EMERGENCY_CONTACT", label: "Emergency contact" }], "Choose a record type")}{text("title", "Short title", "e.g. Peanut allergy")}{area("details", "Details", "Record the facts staff need to know.")}<div className="grid gap-4 sm:grid-cols-2">{select("severity", "Severity", [{ value: "LOW", label: "Low" }, { value: "MODERATE", label: "Moderate" }, { value: "HIGH", label: "High" }, { value: "CRITICAL", label: "Critical" }], "Choose severity")}{text("contactName", "Emergency contact", "", "text", false)}{text("contactPhone", "Emergency phone", "", "tel", false)}</div><p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5">Only record information needed for student safety and care. Access is limited by role.</p></>}
    {action === "asset" && <>{text("name", "Asset or supply name", "Projector") }<div className="grid gap-4 sm:grid-cols-2">{text("assetTag", "Asset tag", "EQ-001")}{text("category", "Category", "IT equipment")}{text("location", "Location", "Science lab")}{text("quantity", "Quantity", "1", "number")}{select("condition", "Condition", [{ value: "GOOD", label: "Good" }, { value: "NEEDS_REPAIR", label: "Needs repair" }, { value: "OUT_OF_SERVICE", label: "Out of service" }], "Choose condition")}{text("nextMaintenance", "Next service date", "", "date", false)}</div>{area("notes", "Notes", "Optional details such as make or model.")}</>}
    {action === "maintenanceRequest" && <>{select("assetId", "Tracked asset (optional)", assets.map((asset) => ({ value: asset.id, label: `${asset.name} · ${asset.location}` })), "Not in asset register — describe it below", false)}{!values.assetId && <>{text("assetName", "Item name", "e.g. Classroom fan")}{text("location", "Location", "Room or area")}</>}{select("priority", "Priority", [{ value: "LOW", label: "Low" }, { value: "NORMAL", label: "Normal" }, { value: "URGENT", label: "Urgent" }], "Choose priority")}{area("description", "What needs attention?", "Describe the fault or supply needed.")}</>}
    <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant={module === "health" || module === "inventory" ? "secondary" : "primary"}><Check size={16}/>Save</Button></div>
  </form></SidePanel>;
}
