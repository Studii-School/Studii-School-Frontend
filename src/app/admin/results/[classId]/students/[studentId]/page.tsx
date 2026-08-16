import { ReportCardScreen } from "@/features/results/results-screens";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ sessionId?: string; termId?: string }>;
}) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  return <ReportCardScreen studentId={studentId} sessionId={query.sessionId} termId={query.termId} />;
}
