import { PersonProfileScreen } from "@/features/people/person-profile-screen";

export default async function Page({ params }: { params: Promise<{ kind: "student" | "staff" | "guardian"; id: string }> }) {
  const { kind, id } = await params;
  return <PersonProfileScreen kind={kind} id={id} role="student" />;
}
