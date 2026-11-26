"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { requestDemo, type DemoRequest } from "@/lib/public-api";
import { MarketingSelect } from "../marketing-select";

const initial: DemoRequest = { schoolName: "", contactName: "", email: "", phone: "", preferredDate: "", preferredTime: "", schoolSize: "", notes: "" };

export function DemoBookingForm() {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function update<K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try { await requestDemo({ ...values, schoolName: values.schoolName.trim(), contactName: values.contactName.trim(), email: values.email.trim().toLowerCase(), phone: values.phone.trim(), notes: values.notes?.trim() }); setSubmitted(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Your request could not be sent."); }
    finally { setPending(false); }
  }
  if (submitted) return <div className="marketing-form-success" role="status"><strong>Demo request received.</strong><br />We will contact you at {values.email} to confirm your preferred time. You can close this page now.</div>;
  return <form className="marketing-form" onSubmit={submit}>
    <label>School name<input required minLength={2} maxLength={120} autoComplete="organization" placeholder="Your school" value={values.schoolName} onChange={(event) => update("schoolName", event.target.value)} /></label>
    <div className="marketing-form-row"><label>Your name<input required minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name" value={values.contactName} onChange={(event) => update("contactName", event.target.value)} /></label><label>Phone number<input required type="tel" autoComplete="tel" placeholder="Best number to reach you" value={values.phone} onChange={(event) => update("phone", event.target.value)} /></label></div>
    <label>Work email<input required type="email" autoComplete="email" placeholder="you@yourschool.com" value={values.email} onChange={(event) => update("email", event.target.value)} /></label>
    <div className="marketing-form-row"><label>Preferred date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={values.preferredDate} onChange={(event) => update("preferredDate", event.target.value)} /></label><label>Preferred time <small>(West Africa Time)</small><input required type="time" value={values.preferredTime} onChange={(event) => update("preferredTime", event.target.value)} /></label></div>
    <MarketingSelect id="school-size-select" label="About how many pupils?" name="schoolSize" value={values.schoolSize ?? ""} optional placeholder="Select a range" options={[{ value: "UNDER_100", label: "Under 100" }, { value: "100_499", label: "100–499" }, { value: "500_999", label: "500–999" }, { value: "1000_PLUS", label: "1,000 or more" }, { value: "", label: "No preference" }]} onChange={(value) => update("schoolSize", value)} />
    <label>What would you like to see? <small>(optional)</small><textarea maxLength={1000} placeholder="Tell us about your school and what takes the most time today." value={values.notes} onChange={(event) => update("notes", event.target.value)} /></label>
    {error && <p className="marketing-form-error" role="alert">{error}</p>}
    <button className="marketing-button marketing-button-dark marketing-form-submit" type="submit" disabled={pending}>{pending ? "Sending your request…" : "Request demo"}<ArrowRight size={17} /></button>
  </form>;
}
