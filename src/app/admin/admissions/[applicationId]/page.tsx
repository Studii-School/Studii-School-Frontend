import { AdmissionDetailScreen } from "@/features/admissions/admissions-screens";
export default async function Page({ params }: { params: Promise<{ applicationId: string }> }) { const { applicationId } = await params; return <AdmissionDetailScreen applicationId={applicationId}/>; }
