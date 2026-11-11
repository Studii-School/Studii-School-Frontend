import { FinanceOverview } from "@/features/finance/finance-overview";
import { FinanceLandingScreen } from "@/features/finance/finance-landing-screen";

export default async function Page({ searchParams }: { searchParams: Promise<{ classId?: string | string[] }> }) {
  const params = await searchParams;
  return params.classId ? <FinanceOverview /> : <FinanceLandingScreen />;
}
