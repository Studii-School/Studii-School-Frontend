import { CustomisableDashboard } from "@/features/dashboard-customisation/customisable-dashboard";

import { SchoolSetup } from "@/features/school-settings/school-setup";

export default function Page() {
  return (
    <>
      <SchoolSetup compact />
      <CustomisableDashboard
        role="admin"
        title="Admin Dashboard"
        description="Live school records and operational summaries."
      />
    </>
  );
}
