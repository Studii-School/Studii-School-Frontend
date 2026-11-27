import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "../marketing-shell";
import { DemoBookingForm } from "./demo-booking-form";
import "../marketing.css";

export const metadata: Metadata = { title: "Schedule a demo | SchoolOS", description: "Request a SchoolOS walkthrough using your school's needs and preferred time." };

export default function ScheduleDemoPage() {
  return <div className="marketing"><MarketingHeader /><main className="marketing-form-page"><div className="marketing-container marketing-form-grid"><div className="marketing-form-intro"><p className="marketing-section-label">SEE IT IN ACTION</p><h1>Let&apos;s walk<br />through your<br />school day.</h1><p>Tell us what your school needs and when you are available. We will follow up to confirm a walkthrough focused on your workflow.</p><div className="marketing-form-aside"><strong>How school setup works</strong><p>The SchoolOS team creates your workspace and administrator account. Your school then receives a link to complete its details.</p></div></div><div className="marketing-form-card"><h2>Request a walkthrough</h2><p>Share a preferred time. We will confirm the appointment with you.</p><DemoBookingForm /></div></div></main><MarketingFooter /></div>;
}
