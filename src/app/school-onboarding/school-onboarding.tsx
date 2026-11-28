"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, GraduationCap, Mail, Phone, ShieldCheck, UploadCloud } from "lucide-react";
import { getProfile, readStoredToken } from "@/lib/api";
import { normaliseRole, readStoredUser } from "@/lib/auth";
import { getSchoolSettings } from "@/features/school-settings/school-settings.storage";
import { acceptSchoolInvitation } from "./school-onboarding.api";
import type { SchoolSettings } from "@/features/school-settings/school-settings.types";

type FormValues = {
  name: string; shortName: string; establishedYear: string; schoolLevel: string; schoolType: string; ownershipType: string;
  motto: string; slogan: string; description: string;
  email: string; primaryPhone: string; secondaryPhone: string; website: string;
  address: string; city: string; state: string; country: string;
  currentAcademicSession: string; currentTerm: string; resumptionDate: string; closingDate: string;
  primaryColor: string; secondaryColor: string; accentColor: string; logoUrl: string; crestUrl: string; faviconUrl: string;
  legalName: string; registrationNumber: string; documentType: string; representativeName: string; representativeRole: string;
};

const initial: FormValues = {
  name: "", shortName: "", establishedYear: "", schoolLevel: "", schoolType: "", ownershipType: "",
  motto: "", slogan: "", description: "", email: "", primaryPhone: "", secondaryPhone: "", website: "",
  address: "", city: "", state: "", country: "Nigeria", currentAcademicSession: "", currentTerm: "",
  resumptionDate: "", closingDate: "", primaryColor: "#0B6B68", secondaryColor: "#102B3E", accentColor: "#F3C664", logoUrl: "", crestUrl: "", faviconUrl: "",
  legalName: "", registrationNumber: "", documentType: "", representativeName: "", representativeRole: "",
};

const steps = [
  { title: "Your school", description: "Start with the name people will see in your school portal." },
  { title: "School type", description: "Tell us what kind of school you run." },
  { title: "A little more about you", description: "Add a motto, slogan or short introduction if you like." },
  { title: "Contact details", description: "How should families and staff reach your school?" },
  { title: "Where to find you", description: "Add the address for your main school location." },
  { title: "Academic period", description: "Set your current session and term. Classes can be added later." },
  { title: "School colours", description: "Choose the colours you want to see across your portal." },
  { title: "School images", description: "Try files here as a preview. Image upload is not connected to your school profile yet." },
  { title: "Confirm your contacts", description: "Try the demo email and phone checks. No messages are sent." },
  { title: "School identity", description: "Preview the legal details you may need for KYC. These details are not submitted." },
  { title: "Supporting details", description: "Preview representative details and a document. These details are not submitted." },
  { title: "Review your details", description: "Look over your preview, then open your dashboard." },
] as const;

const sections = [
  { label: "School", first: 0, last: 2 },
  { label: "Contact", first: 3, last: 4 },
  { label: "Academics", first: 5, last: 5 },
  { label: "Branding", first: 6, last: 7 },
  { label: "Verify", first: 8, last: 8 },
  { label: "KYC", first: 9, last: 10 },
  { label: "Review", first: 11, last: 11 },
] as const;

function Field({ label, hint, children, wide = false, required = false }: { label: string; optional?: boolean; required?: boolean; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`onboard-field${wide ? " onboard-wide" : ""}`}><span>{label}<em>{required ? "For live setup" : "Optional"}</em></span>{children}{hint && <small>{hint}</small>}</label>;
}

function fromSettings(settings: SchoolSettings): FormValues {
  return {
    ...initial,
    name: settings.name,
    shortName: settings.shortName,
    establishedYear: settings.establishedYear?.toString() ?? "",
    schoolLevel: settings.schoolLevels.length > 1 ? "Primary and Secondary" : settings.schoolLevel,
    schoolType: settings.schoolType,
    ownershipType: settings.ownershipType,
    motto: settings.motto,
    slogan: settings.slogan,
    description: settings.description,
    email: settings.email,
    primaryPhone: settings.primaryPhone,
    secondaryPhone: settings.secondaryPhone ?? "",
    website: settings.website ?? "",
    address: settings.address,
    city: settings.city,
    state: settings.state,
    country: settings.country,
    currentAcademicSession: settings.currentAcademicSession,
    currentTerm: settings.currentTerm,
    resumptionDate: settings.resumptionDate ?? "",
    closingDate: settings.closingDate ?? "",
    primaryColor: settings.branding.primaryColor,
    secondaryColor: settings.branding.secondaryColor,
    accentColor: settings.branding.accentColor,
    logoUrl: settings.logoUrl ?? "",
    crestUrl: settings.crestUrl ?? "",
    faviconUrl: settings.faviconUrl ?? "",
  };
}

function OtpCard({ kind, value, sent, verified, code, onCode, onSend, onConfirm }: {
  kind: "email" | "phone"; value: string; sent: boolean; verified: boolean; code: string;
  onCode: (value: string) => void; onSend: () => void; onConfirm: () => void;
}) {
  const Icon = kind === "email" ? Mail : Phone;
  return <div className="onboard-otp-card">
    <span className="onboard-otp-icon"><Icon size={18} /></span>
    <div className="onboard-otp-info"><strong>{kind === "email" ? "School email" : "School phone"}</strong><span>{value || "Add this in Contact details"}</span></div>
    {verified ? <span className="onboard-verified"><CheckCircle2 size={15} /> Confirmed in preview</span> : <>
      <button type="button" className="onboard-text-button" disabled={!value} onClick={onSend}>{sent ? "Resend demo code" : "Send demo code"}</button>
      {sent && <div className="onboard-code-entry"><label htmlFor={`onboard-${kind}-code`}>6-digit code</label><div><input id={`onboard-${kind}-code`} inputMode="numeric" maxLength={6} value={code} onChange={(event) => onCode(event.target.value.replace(/\D/g, ""))} placeholder="123456" /><button type="button" onClick={onConfirm}>Confirm</button></div></div>}
    </>}
  </div>;
}

export function SchoolOnboarding() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initial);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "auth" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [crest, setCrest] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const invitationAccepted = useRef(false);

  const load = useCallback(async () => {
    let user = readStoredUser();
    const inviteToken = new URLSearchParams(window.location.search).get("invite");
    if (inviteToken && !invitationAccepted.current) {
      setLoadState("loading");
      try {
        user = await acceptSchoolInvitation(inviteToken);
        invitationAccepted.current = true;
        window.history.replaceState(window.history.state, "", "/school-onboarding");
      } catch (caught) {
        setLoadError(caught instanceof Error ? caught.message : "This invitation could not be accepted.");
        setLoadState("error");
        return;
      }
    }
    if (!readStoredToken()) {
      setLoadState("auth");
      return;
    }
    if (!user?.role || !(user.schoolId ?? user.school?.id)) {
      setLoadState("loading");
      try {
        user = await getProfile();
        localStorage.setItem("user", JSON.stringify(user));
      } catch (caught) {
        if (!readStoredToken()) {
          setLoadState("auth");
        } else {
          setLoadError(caught instanceof Error ? caught.message : "Your account could not be checked.");
          setLoadState("error");
        }
        return;
      }
    }
    if (!user?.role || normaliseRole(user.role) !== "Administrator") {
      setLoadError("This account is not a school administrator. Sign in with your school's administrator account.");
      setLoadState("error");
      return;
    }
    if (!(user.schoolId ?? user.school?.id)) {
      setLoadError("Your administrator account is not linked to a school workspace yet. Ask SchoolOS to link your account to the school.");
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    setLoadError("");
    try {
      const profile = await getSchoolSettings(undefined, user);
      setValues(fromSettings(profile));
      setLoadState("ready");
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "School details could not be loaded.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (loadState !== "auth") return;
    const refreshOnFocus = () => { void load(); };
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === "user" || event.key === null) void load();
    };
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, [load, loadState]);

  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
    if (key === "email") { setEmailVerified(false); setEmailSent(false); setEmailCode(""); }
    if (key === "primaryPhone") { setPhoneVerified(false); setPhoneSent(false); setPhoneCode(""); }
  }

  function moveTo(next: number) {
    setStep(next);
    setError("");
    if (content.current) content.current.scrollTop = 0;
    requestAnimationFrame(() => heading.current?.focus());
  }

  function edit(index: number) {
    setReturnToReview(true);
    moveTo(index);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>, kind: "document" | "logo" | "crest" | "favicon") {
    const file = event.target.files?.[0] ?? null;
    const allowedTypes = kind === "document"
      ? ["application/pdf", "image/png", "image/jpeg"]
      : kind === "favicon"
        ? ["image/png", "image/jpeg", "image/x-icon", "image/vnd.microsoft.icon"]
        : ["image/png", "image/jpeg", "image/svg+xml"];
    if (file && (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError("Choose a supported file smaller than 10 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    if (kind === "document") setDocument(file);
    if (kind === "logo") setLogo(file);
    if (kind === "crest") setCrest(file);
    if (kind === "favicon") setFavicon(file);
  }

  function next() {
    if (step === steps.length - 1) {
      router.replace("/admin/dashboard");
      return;
    }
    if (returnToReview) { setReturnToReview(false); moveTo(steps.length - 1); return; }
    moveTo(step + 1);
  }

  const filled = (value: string) => Boolean(value.trim());
  const sectionChecks = [
    [values.name, values.shortName, values.establishedYear, values.schoolLevel, values.schoolType, values.ownershipType, values.motto, values.slogan, values.description].map(filled),
    [values.email, values.primaryPhone, values.secondaryPhone, values.website, values.address, values.city, values.state, values.country].map(filled),
    [values.currentAcademicSession, values.currentTerm, values.resumptionDate, values.closingDate].map(filled),
    [filled(values.primaryColor), filled(values.secondaryColor), filled(values.accentColor), filled(values.logoUrl), filled(values.crestUrl), filled(values.faviconUrl)],
    [emailVerified, phoneVerified],
    [values.legalName, values.registrationNumber, values.documentType, values.representativeName, values.representativeRole].map(filled).concat(Boolean(document)),
  ];
  const allChecks = sectionChecks.slice(0, 4).flat();
  const progress = Math.round((allChecks.filter(Boolean).length / allChecks.length) * 100);
  const sectionProgress = [...sectionChecks.map((checks) => Math.round((checks.filter(Boolean).length / checks.length) * 100)), 0];
  const activeSection = sections.findIndex(({ first, last }) => step >= first && step <= last);

  return <div className="onboard-page">
    <header className="onboard-topbar onboard-shell">
      <div className="onboard-brand"><span className="onboard-brand-mark"><GraduationCap size={22} /></span><span>School<span>OS</span><small>BY TTECHNOLOGIES</small></span></div>
      <div className="onboard-progress"><div><span>Details added</span><strong>{progress}%</strong></div><div className="onboard-progress-track" role="progressbar" aria-label="Onboarding details added" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div>
    </header>
    <main className="onboard-main onboard-shell">
      {loadState !== "ready" ? <section className="onboard-card onboard-done" aria-live="polite"><span className="onboard-done-icon"><GraduationCap size={34} /></span><h1>{loadState === "loading" ? "Loading your school…" : loadState === "auth" ? "Sign in to set up your school" : "School details could not be loaded"}</h1><p>{loadState === "auth" ? "Use your school administrator account to open this preview." : loadState === "error" ? loadError : "We’re loading the details already saved for your school."}</p>{loadState === "auth" ? <div className="onboard-entry-actions"><Link className="onboard-button onboard-button-primary" href="/login?next=%2Fschool-onboarding">Sign in <ArrowRight size={17} /></Link><Link className="onboard-button onboard-button-back" href="/first-time-login?next=%2Fschool-onboarding">Set your first password</Link></div> : loadState === "error" ? <div className="onboard-entry-actions"><button type="button" className="onboard-button onboard-button-primary" onClick={() => void load()}>Retry loading <ArrowRight size={17} /></button><Link className="onboard-button onboard-button-back" href="/login?next=%2Fschool-onboarding">Sign in again</Link></div> : null}</section> : <div className="onboard-flow">
        <nav className="onboard-section-tabs" aria-label="Onboarding sections">
          {sections.map((section, index) => <button key={section.label} type="button" className={`onboard-section-tab${activeSection === index ? " active" : ""}`} aria-label={`${section.label} section, ${sectionProgress[index]}% of details added`} aria-current={activeSection === index ? "step" : undefined} onClick={() => { setReturnToReview(false); moveTo(section.first); }}><span>{String(index + 1).padStart(2, "0")}</span>{section.label}<span className="onboard-tab-fill" aria-hidden="true"><i style={{ width: `${sectionProgress[index]}%` }} /></span></button>)}
        </nav>
        <section className="onboard-card" aria-labelledby="onboard-title">
          <div className="onboard-card-heading"><span className="onboard-eyebrow">STEP {step + 1} OF {steps.length}</span><h1 id="onboard-title" ref={heading} tabIndex={-1}>{steps[step].title}</h1><p>{steps[step].description}</p></div>
          <div className="onboard-content" ref={content}>
            {step === 0 && <div className="onboard-grid">
              <Field label="School name" required wide><input value={values.name} onChange={(e) => update("name", e.target.value)} autoComplete="organization" placeholder="e.g. Bright Future Academy" /></Field>
              <Field label="Short name" optional><input value={values.shortName} onChange={(e) => update("shortName", e.target.value)} placeholder="e.g. BFA" /></Field>
              <Field label="Year established" optional><input type="number" min="1800" max="2100" value={values.establishedYear} onChange={(e) => update("establishedYear", e.target.value)} placeholder="e.g. 2008" /></Field>
            </div>}
            {step === 1 && <div className="onboard-grid">
              <Field label="School level" required wide><select value={values.schoolLevel} onChange={(e) => update("schoolLevel", e.target.value)}><option value="">Choose a level</option><option>Primary</option><option>Secondary</option><option>Primary and Secondary</option><option>Nursery, Primary and Secondary</option></select></Field>
              <Field label="Day or boarding"><select value={values.schoolType} onChange={(e) => update("schoolType", e.target.value)}><option value="">Choose a school type</option><option>Day School</option><option>Boarding School</option><option>Day and Boarding School</option></select></Field>
              <Field label="Ownership"><select value={values.ownershipType} onChange={(e) => update("ownershipType", e.target.value)}><option value="">Choose ownership</option><option>Private</option><option>Public</option><option>Faith-based</option><option>International</option></select></Field>
            </div>}
            {step === 2 && <div className="onboard-grid">
              <Field label="School motto" optional><input value={values.motto} onChange={(e) => update("motto", e.target.value)} placeholder="A few words you live by" /></Field>
              <Field label="School slogan" optional><input value={values.slogan} onChange={(e) => update("slogan", e.target.value)} placeholder="Your school tagline" /></Field>
              <Field label="About your school" optional wide><textarea value={values.description} onChange={(e) => update("description", e.target.value)} placeholder="A short introduction to your school" rows={3} /></Field>
            </div>}
            {step === 3 && <div className="onboard-grid">
              <Field label="Official school email" required><input type="email" value={values.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="hello@yourschool.edu.ng" /></Field>
              <Field label="Primary phone number" required><input type="tel" value={values.primaryPhone} onChange={(e) => update("primaryPhone", e.target.value)} autoComplete="tel" placeholder="e.g. 0803 123 4567" /></Field>
              <Field label="Secondary phone" optional><input type="tel" value={values.secondaryPhone} onChange={(e) => update("secondaryPhone", e.target.value)} placeholder="Another number, if you have one" /></Field>
              <Field label="Website" optional><input type="url" value={values.website} onChange={(e) => update("website", e.target.value)} placeholder="https://yourschool.edu.ng" /></Field>
            </div>}
            {step === 4 && <div className="onboard-grid">
              <Field label="School address" wide><input value={values.address} onChange={(e) => update("address", e.target.value)} autoComplete="street-address" placeholder="Street address" /></Field>
              <Field label="City"><input value={values.city} onChange={(e) => update("city", e.target.value)} autoComplete="address-level2" placeholder="e.g. Ikeja" /></Field>
              <Field label="State"><input value={values.state} onChange={(e) => update("state", e.target.value)} autoComplete="address-level1" placeholder="e.g. Lagos" /></Field>
              <Field label="Country" wide><input value={values.country} onChange={(e) => update("country", e.target.value)} autoComplete="country-name" /></Field>
            </div>}
            {step === 5 && <div className="onboard-grid">
              <Field label="Current academic session" required hint="For example, 2026/2027"><input value={values.currentAcademicSession} onChange={(e) => update("currentAcademicSession", e.target.value)} placeholder="2026/2027" /></Field>
              <Field label="Current term" required><select value={values.currentTerm} onChange={(e) => update("currentTerm", e.target.value)}><option value="">Choose a term</option><option>First Term</option><option>Second Term</option><option>Third Term</option></select></Field>
              <Field label="Term start date" required><input type="date" value={values.resumptionDate} onChange={(e) => update("resumptionDate", e.target.value)} /></Field>
              <Field label="Term end date" required><input type="date" value={values.closingDate} onChange={(e) => update("closingDate", e.target.value)} /></Field>
            </div>}
            {step === 6 && <div className="onboard-grid onboard-colour-grid">
              <div className="onboard-brand-preview onboard-wide" style={{ borderColor: values.primaryColor }}><span style={{ backgroundColor: values.primaryColor }}><GraduationCap size={22} /></span><div><strong>{values.name || "Your school name"}</strong><small>{values.motto || "Your school motto"}</small></div><i style={{ backgroundColor: values.accentColor }} /></div>
              <Field label="Primary colour"><div className="onboard-colour-control"><input type="color" value={values.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} /><code>{values.primaryColor.toUpperCase()}</code></div></Field>
              <Field label="Secondary colour"><div className="onboard-colour-control"><input type="color" value={values.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} /><code>{values.secondaryColor.toUpperCase()}</code></div></Field>
              <Field label="Accent colour"><div className="onboard-colour-control"><input type="color" value={values.accentColor} onChange={(e) => update("accentColor", e.target.value)} /><code>{values.accentColor.toUpperCase()}</code></div></Field>
            </div>}
            {step === 7 && <div className="onboard-grid onboard-image-grid">
              <p className="onboard-demo-note onboard-wide"><ShieldCheck size={16} /> Hosted image URLs and selected files are previews only. Nothing is saved or uploaded here.</p>
              <Field label="School logo URL" optional><input type="url" value={values.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://example.com/logo.png" /></Field>
              <Field label="School crest URL" optional><input type="url" value={values.crestUrl} onChange={(e) => update("crestUrl", e.target.value)} placeholder="https://example.com/crest.png" /></Field>
              <Field label="Browser icon URL" optional><input type="url" value={values.faviconUrl} onChange={(e) => update("faviconUrl", e.target.value)} placeholder="https://example.com/icon.png" /></Field>
              <Field label="Logo file preview" optional hint={logo?.name || "Preview only · PNG, JPG or SVG · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => chooseFile(e, "logo")} /></Field>
              <Field label="Crest file preview" optional hint={crest?.name || "Preview only · PNG, JPG or SVG · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => chooseFile(e, "crest")} /></Field>
              <Field label="Icon file preview" optional hint={favicon?.name || "Preview only · PNG, JPG or ICO · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/x-icon" onChange={(e) => chooseFile(e, "favicon")} /></Field>
            </div>}
            {step === 8 && <div className="onboard-verify">
              <p className="onboard-demo-note"><ShieldCheck size={16} /> Preview code: <strong>123456</strong>. No email or SMS is sent.</p>
              <div className="onboard-otp-grid">
                <OtpCard kind="email" value={values.email} sent={emailSent} verified={emailVerified} code={emailCode} onCode={setEmailCode} onSend={() => setEmailSent(true)} onConfirm={() => { if (emailCode === "123456") { setEmailVerified(true); setError(""); } else setError("Enter the email demo code 123456."); }} />
                <OtpCard kind="phone" value={values.primaryPhone} sent={phoneSent} verified={phoneVerified} code={phoneCode} onCode={setPhoneCode} onSend={() => setPhoneSent(true)} onConfirm={() => { if (phoneCode === "123456") { setPhoneVerified(true); setError(""); } else setError("Enter the phone demo code 123456."); }} />
              </div>
            </div>}
            {step === 9 && <div className="onboard-grid">
              <p className="onboard-demo-note onboard-wide"><ShieldCheck size={16} /> KYC preview only: these identity details are not submitted or saved.</p>
              <Field label="Registered organisation name" wide><input value={values.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Name on your registration document" /></Field>
              <Field label="Registration number"><input value={values.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} placeholder="e.g. RC or approval number" /></Field>
              <Field label="Document type"><select value={values.documentType} onChange={(e) => update("documentType", e.target.value)}><option value="">Choose a document</option><option>School approval certificate</option><option>CAC registration certificate</option><option>Government registration document</option></select></Field>
            </div>}
            {step === 10 && <div className="onboard-grid">
              <p className="onboard-demo-note onboard-wide"><ShieldCheck size={16} /> KYC preview only: representative details and documents are not submitted or uploaded.</p>
              <Field label="Authorised representative"><input value={values.representativeName} onChange={(e) => update("representativeName", e.target.value)} placeholder="Full name" /></Field>
              <Field label="Representative's role"><input value={values.representativeRole} onChange={(e) => update("representativeRole", e.target.value)} placeholder="e.g. Proprietor or principal" /></Field>
              <Field label="Supporting document" wide hint={document?.name || "PDF, PNG or JPG · up to 10 MB. No file is uploaded in this preview."}><span className="onboard-upload"><FileCheck2 size={20} /><strong>{document ? "Choose another file" : "Choose a file"}</strong><UploadCloud size={16} /><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => chooseFile(e, "document")} /></span></Field>
            </div>}
            {step === 11 && <div className="onboard-review">
              <p className="onboard-demo-note onboard-wide">This is a preview. Opening the dashboard will not save or submit these details.</p>
              {[
                { label: "School", value: values.name || "Not added", target: 0 },
                { label: "School type", value: values.schoolLevel || "Not added", target: 1 },
                { label: "About school", value: values.motto || "Optional", target: 2 },
                { label: "Contact", value: values.email || "Not added", target: 3 },
                { label: "Location", value: [values.city, values.state].filter(Boolean).join(", ") || "Not added", target: 4 },
                { label: "Academics", value: [values.currentAcademicSession, values.currentTerm].filter(Boolean).join(" · ") || "Not added", target: 5 },
                { label: "Colours", value: values.primaryColor, target: 6 },
                { label: "Images", value: values.logoUrl ? "Hosted image URL added" : logo?.name ? "File preview only" : "Not added", target: 7 },
                { label: "Contact checks · demo only", value: emailVerified && phoneVerified ? "Demo checks completed" : "Not completed", target: 8 },
                { label: "School identity · preview only", value: values.legalName || "Not added", target: 9 },
                { label: "Representative · preview only", value: values.representativeName || "Not added", target: 10 },
              ].map((item) => <div className="onboard-review-row" key={item.label}><span><strong>{item.label}</strong><small>{item.value}</small></span><button type="button" onClick={() => edit(item.target)}>Edit</button></div>)}
            </div>}
          </div>
          <div className="onboard-card-footer"><p className="onboard-error" role={error ? "alert" : undefined}>{error || "This preview is not saved. You can move between sections before opening the dashboard."}</p><div className="onboard-actions">{step > 0 && <button type="button" className="onboard-button onboard-button-back" onClick={() => { setReturnToReview(false); moveTo(step - 1); }}><ArrowLeft size={16} /> Back</button>}<button type="button" className="onboard-button onboard-button-primary" onClick={next}>{step === steps.length - 1 ? "Open dashboard" : returnToReview ? "Back to review" : "Continue"}<ArrowRight size={16} /></button></div></div>
        </section></div>}
    </main>
  </div>;
}
