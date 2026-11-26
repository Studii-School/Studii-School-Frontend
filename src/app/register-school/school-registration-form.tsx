"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { registerSchool, type SchoolRegistration } from "@/lib/public-api";
import { MarketingSelect } from "../marketing-select";

const initial: SchoolRegistration = { schoolName: "", schoolLevel: "", adminName: "", email: "", phone: "", address: "", password: "" };

export function SchoolRegistrationForm() {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof SchoolRegistration>(key: K, value: SchoolRegistration[K]) { setValues((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.schoolLevel) { setError("Choose the school level you offer."); document.getElementById("school-level-select")?.focus(); return; }
    if (values.password !== confirmPassword) { setError("Passwords do not match."); return; }
    setError(""); setPending(true);
    try {
      await registerSchool({ ...values, schoolName: values.schoolName.trim(), adminName: values.adminName.trim(), email: values.email.trim().toLowerCase(), phone: values.phone.trim(), address: values.address?.trim() });
      router.replace("/admin/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Registration could not be completed."); }
    finally { setPending(false); }
  }

  return <><form className="marketing-form" onSubmit={submit}>
    <label>School name<input required minLength={2} maxLength={120} autoComplete="organization" placeholder="e.g. Bright Future Academy" value={values.schoolName} onChange={(event) => update("schoolName", event.target.value)} /></label>
    <MarketingSelect id="school-level-select" label="School level" name="schoolLevel" value={values.schoolLevel} required placeholder="Select the level your school offers" options={[{ value: "PRIMARY", label: "Primary", description: "Primary classes" }, { value: "SECONDARY", label: "Secondary", description: "Junior and senior secondary" }, { value: "BOTH", label: "Primary and secondary", description: "Both levels in one school" }]} onChange={(value) => update("schoolLevel", value as SchoolRegistration["schoolLevel"])} />
    <div className="marketing-form-row"><label>Your full name<input required minLength={2} maxLength={100} autoComplete="name" placeholder="School administrator" value={values.adminName} onChange={(event) => update("adminName", event.target.value)} /></label><label>Phone number<input required type="tel" autoComplete="tel" placeholder="e.g. 0803 123 4567" value={values.phone} onChange={(event) => update("phone", event.target.value)} /></label></div>
    <label>Work email<input required type="email" autoComplete="email" placeholder="you@yourschool.com" value={values.email} onChange={(event) => update("email", event.target.value)} /><small>Use this email to sign in to your school portal.</small></label>
    <label>School address <small>(optional)</small><input maxLength={240} autoComplete="street-address" placeholder="Street, city and state" value={values.address} onChange={(event) => update("address", event.target.value)} /></label>
    <div className="marketing-form-row"><label>Create password<input required type="password" minLength={8} autoComplete="new-password" value={values.password} onChange={(event) => update("password", event.target.value)} /><small>At least 8 characters.</small></label><label>Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label></div>
    {error && <p className="marketing-form-error" role="alert">{error}</p>}
    <button className="marketing-button marketing-button-dark marketing-form-submit" type="submit" disabled={pending}>{pending ? "Creating your school…" : "Create school account"}<ArrowRight size={17} /></button>
  </form><p className="marketing-form-bottom">Already have an account? <Link href="/login">Sign in</Link></p></>;
}
