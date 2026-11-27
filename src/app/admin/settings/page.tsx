import { SchoolSettingsForm } from "@/features/school-settings/school-settings-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string | string[] }> }) {
  const { section } = await searchParams;
  const initialTab = section === "academics" ? "Academics" : section === "classes" ? "Classes" : "Profile";
  return <SchoolSettingsForm key={initialTab} initialTab={initialTab} />;
}
