import type { Metadata } from "next";
import { SchoolOnboarding } from "./school-onboarding";
import "./school-onboarding.css";

export const metadata: Metadata = {
  title: "School onboarding | SchoolOS",
  description: "Complete your school's profile, academic details and verification in a few simple steps.",
};

export default function SchoolOnboardingPage() {
  return <SchoolOnboarding />;
}
