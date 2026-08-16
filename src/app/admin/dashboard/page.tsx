import { CustomisableDashboard } from "@/features/dashboard-customisation/customisable-dashboard";

export default function Page() {
  return (
    <CustomisableDashboard
      role="admin"
      title="Admin Dashboard"
      description="Live school records and operational summaries."
    />
  );
}
