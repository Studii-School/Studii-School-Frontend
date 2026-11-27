"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, GraduationCap, Mail, Phone, ShieldCheck, UploadCloud } from "lucide-react";

type FormValues = {
  name: string; shortName: string; establishedYear: string; schoolLevel: string; schoolType: string; ownershipType: string;
  motto: string; slogan: string; description: string;
  email: string; primaryPhone: string; secondaryPhone: string; website: string;
  address: string; city: string; state: string; country: string;
  currentAcademicSession: string; currentTerm: string; resumptionDate: string; closingDate: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  legalName: string; registrationNumber: string; documentType: string; representativeName: string; representativeRole: string;
};

const initial: FormValues = {
  name: "", shortName: "", establishedYear: "", schoolLevel: "", schoolType: "", ownershipType: "",
  motto: "", slogan: "", description: "", email: "", primaryPhone: "", secondaryPhone: "", website: "",
  address: "", city: "", state: "", country: "Nigeria", currentAcademicSession: "", currentTerm: "",
  resumptionDate: "", closingDate: "", primaryColor: "#0B6B68", secondaryColor: "#102B3E", accentColor: "#F3C664",
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
  { title: "School images", description: "Add your logo and crest now, or come back to them later." },
  { title: "Confirm your contacts", description: "Try the email and phone verification steps." },
  { title: "School identity", description: "Use the legal details on your school registration document." },
  { title: "Supporting details", description: "Tell us who represents your school and attach a document." },
  { title: "Review your details", description: "Check each section before you finish this preview." },
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

function Field({ label, hint, children, wide = false }: { label: string; optional?: boolean; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`onboard-field${wide ? " onboard-wide" : ""}`}><span>{label}<em>Optional</em></span>{children}{hint && <small>{hint}</small>}</label>;
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
  const [values, setValues] = useState<FormValues>(initial);
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
  const [finished, setFinished] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);

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
      setFinished(true);
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
    [filled(values.primaryColor), filled(values.secondaryColor), filled(values.accentColor), Boolean(logo), Boolean(crest), Boolean(favicon)],
    [emailVerified, phoneVerified],
    [values.legalName, values.registrationNumber, values.documentType, values.representativeName, values.representativeRole].map(filled).concat(Boolean(document)),
  ];
  const allChecks = sectionChecks.flat();
  const progress = Math.round((allChecks.filter(Boolean).length / allChecks.length) * 100);
  const sectionProgress = [...sectionChecks.map((checks) => Math.round((checks.filter(Boolean).length / checks.length) * 100)), finished ? 100 : 0];
  const activeSection = sections.findIndex(({ first, last }) => step >= first && step <= last);

  return <div className="onboard-page">
    <header className="onboard-topbar onboard-shell">
      <div className="onboard-brand"><span className="onboard-brand-mark"><GraduationCap size={22} /></span><span>School<span>OS</span><small>BY TTECHNOLOGIES</small></span></div>
      <div className="onboard-progress"><div><span>Details added</span><strong>{progress}%</strong></div><div className="onboard-progress-track" role="progressbar" aria-label="Onboarding details added" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div>
    </header>
    <main className="onboard-main onboard-shell">
      {finished ? <section className="onboard-card onboard-done" aria-live="polite"><span className="onboard-done-icon"><CheckCircle2 size={38} /></span><p className="onboard-eyebrow">PREVIEW COMPLETE</p><h1>You’ve reached the end.</h1><p>You can revisit any section for {values.name || "your school"} and add details later. Nothing was submitted or saved in this preview.</p><button type="button" className="onboard-button onboard-button-primary" onClick={() => { setFinished(false); moveTo(steps.length - 1); }}>Review answers <ArrowRight size={17} /></button></section> : <div className="onboard-flow">
        <nav className="onboard-section-tabs" aria-label="Onboarding sections">
          {sections.map((section, index) => <button key={section.label} type="button" className={`onboard-section-tab${activeSection === index ? " active" : ""}`} aria-label={`${section.label} section, ${sectionProgress[index]}% of details added`} aria-current={activeSection === index ? "step" : undefined} onClick={() => { setReturnToReview(false); moveTo(section.first); }}><span>{String(index + 1).padStart(2, "0")}</span>{section.label}<span className="onboard-tab-fill" aria-hidden="true"><i style={{ width: `${sectionProgress[index]}%` }} /></span></button>)}
        </nav>
        <section className="onboard-card" aria-labelledby="onboard-title">
          <div className="onboard-card-heading"><span className="onboard-eyebrow">STEP {step + 1} OF {steps.length}</span><h1 id="onboard-title" ref={heading} tabIndex={-1}>{steps[step].title}</h1><p>{steps[step].description}</p></div>
          <div className="onboard-content" ref={content}>
            {step === 0 && <div className="onboard-grid">
              <Field label="School name" wide><input value={values.name} onChange={(e) => update("name", e.target.value)} autoComplete="organization" placeholder="e.g. Bright Future Academy" /></Field>
              <Field label="Short name" optional><input value={values.shortName} onChange={(e) => update("shortName", e.target.value)} placeholder="e.g. BFA" /></Field>
              <Field label="Year established" optional><input type="number" min="1800" max="2100" value={values.establishedYear} onChange={(e) => update("establishedYear", e.target.value)} placeholder="e.g. 2008" /></Field>
            </div>}
            {step === 1 && <div className="onboard-grid">
              <Field label="School level" wide><select value={values.schoolLevel} onChange={(e) => update("schoolLevel", e.target.value)}><option value="">Choose a level</option><option>Primary</option><option>Secondary</option><option>Primary and Secondary</option><option>Nursery, Primary and Secondary</option></select></Field>
              <Field label="Day or boarding"><select value={values.schoolType} onChange={(e) => update("schoolType", e.target.value)}><option value="">Choose a school type</option><option>Day School</option><option>Boarding School</option><option>Day and Boarding School</option></select></Field>
              <Field label="Ownership"><select value={values.ownershipType} onChange={(e) => update("ownershipType", e.target.value)}><option value="">Choose ownership</option><option>Private</option><option>Public</option><option>Faith-based</option><option>International</option></select></Field>
            </div>}
            {step === 2 && <div className="onboard-grid">
              <Field label="School motto" optional><input value={values.motto} onChange={(e) => update("motto", e.target.value)} placeholder="A few words you live by" /></Field>
              <Field label="School slogan" optional><input value={values.slogan} onChange={(e) => update("slogan", e.target.value)} placeholder="Your school tagline" /></Field>
              <Field label="About your school" optional wide><textarea value={values.description} onChange={(e) => update("description", e.target.value)} placeholder="A short introduction to your school" rows={3} /></Field>
            </div>}
            {step === 3 && <div className="onboard-grid">
              <Field label="Official school email"><input type="email" value={values.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="hello@yourschool.edu.ng" /></Field>
              <Field label="Primary phone number"><input type="tel" value={values.primaryPhone} onChange={(e) => update("primaryPhone", e.target.value)} autoComplete="tel" placeholder="e.g. 0803 123 4567" /></Field>
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
              <Field label="Current academic session" hint="For example, 2026/2027"><input value={values.currentAcademicSession} onChange={(e) => update("currentAcademicSession", e.target.value)} placeholder="2026/2027" /></Field>
              <Field label="Current term"><select value={values.currentTerm} onChange={(e) => update("currentTerm", e.target.value)}><option value="">Choose a term</option><option>First Term</option><option>Second Term</option><option>Third Term</option></select></Field>
              <Field label="Term start date"><input type="date" value={values.resumptionDate} onChange={(e) => update("resumptionDate", e.target.value)} /></Field>
              <Field label="Term end date"><input type="date" value={values.closingDate} onChange={(e) => update("closingDate", e.target.value)} /></Field>
            </div>}
            {step === 6 && <div className="onboard-grid onboard-colour-grid">
              <div className="onboard-brand-preview onboard-wide" style={{ borderColor: values.primaryColor }}><span style={{ backgroundColor: values.primaryColor }}><GraduationCap size={22} /></span><div><strong>{values.name || "Your school name"}</strong><small>{values.motto || "Your school motto"}</small></div><i style={{ backgroundColor: values.accentColor }} /></div>
              <Field label="Primary colour"><div className="onboard-colour-control"><input type="color" value={values.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} /><code>{values.primaryColor.toUpperCase()}</code></div></Field>
              <Field label="Secondary colour"><div className="onboard-colour-control"><input type="color" value={values.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} /><code>{values.secondaryColor.toUpperCase()}</code></div></Field>
              <Field label="Accent colour"><div className="onboard-colour-control"><input type="color" value={values.accentColor} onChange={(e) => update("accentColor", e.target.value)} /><code>{values.accentColor.toUpperCase()}</code></div></Field>
            </div>}
            {step === 7 && <div className="onboard-grid onboard-image-grid">
              <Field label="School logo" optional hint={logo?.name || "PNG, JPG or SVG · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => chooseFile(e, "logo")} /></Field>
              <Field label="School crest" optional hint={crest?.name || "PNG, JPG or SVG · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => chooseFile(e, "crest")} /></Field>
              <Field label="Browser icon" optional hint={favicon?.name || "PNG, JPG or ICO · up to 10 MB"}><input type="file" accept="image/png,image/jpeg,image/x-icon" onChange={(e) => chooseFile(e, "favicon")} /></Field>
            </div>}
            {step === 8 && <div className="onboard-verify">
              <p className="onboard-demo-note"><ShieldCheck size={16} /> Preview code: <strong>123456</strong>. No email or SMS is sent.</p>
              <div className="onboard-otp-grid">
                <OtpCard kind="email" value={values.email} sent={emailSent} verified={emailVerified} code={emailCode} onCode={setEmailCode} onSend={() => setEmailSent(true)} onConfirm={() => { if (emailCode === "123456") { setEmailVerified(true); setError(""); } else setError("Enter the email demo code 123456."); }} />
                <OtpCard kind="phone" value={values.primaryPhone} sent={phoneSent} verified={phoneVerified} code={phoneCode} onCode={setPhoneCode} onSend={() => setPhoneSent(true)} onConfirm={() => { if (phoneCode === "123456") { setPhoneVerified(true); setError(""); } else setError("Enter the phone demo code 123456."); }} />
              </div>
            </div>}
            {step === 9 && <div className="onboard-grid">
              <Field label="Registered organisation name" wide><input value={values.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Name on your registration document" /></Field>
              <Field label="Registration number"><input value={values.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} placeholder="e.g. RC or approval number" /></Field>
              <Field label="Document type"><select value={values.documentType} onChange={(e) => update("documentType", e.target.value)}><option value="">Choose a document</option><option>School approval certificate</option><option>CAC registration certificate</option><option>Government registration document</option></select></Field>
            </div>}
            {step === 10 && <div className="onboard-grid">
              <Field label="Authorised representative"><input value={values.representativeName} onChange={(e) => update("representativeName", e.target.value)} placeholder="Full name" /></Field>
              <Field label="Representative's role"><input value={values.representativeRole} onChange={(e) => update("representativeRole", e.target.value)} placeholder="e.g. Proprietor or principal" /></Field>
              <Field label="Supporting document" wide hint={document?.name || "PDF, PNG or JPG · up to 10 MB. No file is uploaded in this preview."}><span className="onboard-upload"><FileCheck2 size={20} /><strong>{document ? "Choose another file" : "Choose a file"}</strong><UploadCloud size={16} /><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => chooseFile(e, "document")} /></span></Field>
            </div>}
            {step === 11 && <div className="onboard-review">
              {[
                { label: "School", value: values.name || "Not added", target: 0 },
                { label: "School type", value: values.schoolLevel || "Not added", target: 1 },
                { label: "About school", value: values.motto || "Optional", target: 2 },
                { label: "Contact", value: values.email || "Not added", target: 3 },
                { label: "Location", value: [values.city, values.state].filter(Boolean).join(", ") || "Not added", target: 4 },
                { label: "Academics", value: [values.currentAcademicSession, values.currentTerm].filter(Boolean).join(" · ") || "Not added", target: 5 },
                { label: "Colours", value: values.primaryColor, target: 6 },
                { label: "Images", value: logo?.name || "Optional", target: 7 },
                { label: "Contact checks", value: emailVerified && phoneVerified ? "Confirmed in preview" : "Not added", target: 8 },
                { label: "School identity", value: values.legalName || "Not added", target: 9 },
                { label: "Representative", value: values.representativeName || "Not added", target: 10 },
              ].map((item) => <div className="onboard-review-row" key={item.label}><span><strong>{item.label}</strong><small>{item.value}</small></span><button type="button" onClick={() => edit(item.target)}>Edit</button></div>)}
            </div>}
          </div>
          <div className="onboard-card-footer"><p className="onboard-error" role={error ? "alert" : undefined}>{error || "All fields are optional. You can skip this step."}</p><div className="onboard-actions">{step > 0 && <button type="button" className="onboard-button onboard-button-back" onClick={() => { setReturnToReview(false); moveTo(step - 1); }}><ArrowLeft size={16} /> Back</button>}<button type="button" className="onboard-button onboard-button-primary" onClick={next}>{step === steps.length - 1 ? "Finish preview" : returnToReview ? "Back to review" : "Continue"}<ArrowRight size={16} /></button></div></div>
        </section></div>}
    </main>
  </div>;
}
