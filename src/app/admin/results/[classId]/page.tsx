import { AdminClassResultsScreen } from "@/features/results/results-screens";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ sessionId?: string; termId?: string }>;
}) {
  const [{ classId }, query] = await Promise.all([params, searchParams]);
  return <AdminClassResultsScreen classId={classId} sessionId={query.sessionId} termId={query.termId} />;
}
