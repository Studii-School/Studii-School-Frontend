import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "../marketing-shell";
import { SchoolRegistrationForm } from "./school-registration-form";
import "../marketing.css";

export const metadata: Metadata = { title: "Register your school | SchoolOS", description: "Create your school's SchoolOS workspace and first administrator account." };

export default function RegisterSchoolPage() {
  return <div className="marketing"><MarketingHeader /><main className="marketing-form-page"><div className="marketing-container marketing-form-grid"><div className="marketing-form-intro"><p className="marketing-section-label">GET STARTED</p><h1>Your school,<br />ready for a<br />clearer day.</h1><p>Create your SchoolOS workspace in a few minutes. You will sign in as the first school administrator and can set up classes, staff and pupils from there.</p><div className="marketing-form-aside"><strong>Prefer to see it first?</strong><p>Request a walkthrough of admissions, records, attendance, results and fees.</p><Link className="marketing-inline-link" href="/schedule-demo">Schedule a demo →</Link></div></div><div className="marketing-form-card"><h2>Register your school</h2><p>School details and your administrator account</p><SchoolRegistrationForm /></div></div></main><MarketingFooter /></div>;
}
