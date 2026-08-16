import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowRight, ClipboardCheck, FileUp, Megaphone, UserPlus, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
const actionIcons = { import: FileUp, staff: UserPlus, payment: WalletCards, announcement: Megaphone, attendance: ClipboardCheck, results: ClipboardCheck, timetable: ArrowRight };
export interface QuickAction { label: string; href: string; icon: keyof typeof actionIcons; }
export function QuickActions({ actions }: { actions: QuickAction[] }) { return <Card className="h-full overflow-auto p-4 sm:p-5"><h2 className="text-sm font-semibold">Quick actions</h2><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{actions.map((action) => { const Icon = actionIcons[action.icon]; return <Link className="flex min-h-11 items-center gap-3 rounded-[10px] border px-3 text-sm font-medium hover:border-primary/30 hover:bg-primary-light/40" href={action.href} key={action.label}><Icon className="text-primary" size={17} /><span className="flex-1">{action.label}</span><ArrowRight className="text-muted" size={15} /></Link>; })}</div></Card>; }
