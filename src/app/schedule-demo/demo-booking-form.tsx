"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { requestDemo, type DemoRequest } from "@/lib/public-api";
import { MarketingSelect } from "../marketing-select";

const initial: DemoRequest = {
  schoolName: "", contactName: "", email: "", phone: "",
  preferredDate: "", preferredTime: "", schoolSize: "", notes: "",
};

const sizes = [
  { value: "", label: "Prefer not to say" },
  { value: "UNDER_100", label: "Under 100" },
  { value: "100_499", label: "100–499" },
  { value: "500_999", label: "500–999" },
  { value: "1000_PLUS", label: "1,000 or more" },
];

const bookingDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", dateStyle: "short" });

export function DemoBookingForm() {
  const [values, setValues] = useState(initial);
  const [contactRole, setContactRole] = useState("");
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");

  function update<K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // The existing API stores additional school and contact details in notes.
  const contextNotes = [
    contactRole.trim() && `Role at school: ${contactRole.trim()}`,
    location.trim() && `School location: ${location.trim()}`,
  ].filter(Boolean).join("\n");
  const notesLimit = 1000 - (contextNotes ? contextNotes.length + 1 : 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const schoolName = values.schoolName.trim();
    const contactName = values.contactName.trim();
    const email = values.email.trim().toLowerCase();
    const phone = values.phone.trim();
    if (schoolName.length < 2 || contactName.length < 2 || !phone) {
      setError("Enter the school name, your name and a contact number.");
      return;
    }
    const message = values.notes?.trim();
    if (message && message.length > notesLimit) {
      setError(`Keep your message under ${notesLimit + 1} characters.`);
      return;
    }
    const notes = [contextNotes, message].filter(Boolean).join("\n");

    setPending(true);
    try {
      await requestDemo({ ...values, schoolName, contactName, email, phone, notes });
      setConfirmedEmail(email);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your request could not be sent.");
    } finally {
      setPending(false);
    }
  }

  if (confirmedEmail) {
    return (
      <div className="marketing-form-success" role="status">
        <strong>Demo request received.</strong>
        <p>We’ll email {confirmedEmail} to confirm a time with you.</p>
      </div>
    );
  }

  return (
    <form className="marketing-form" onSubmit={submit}>
      <fieldset>
        <legend>About your school</legend>
        <div className="marketing-form-fields">
          <label>School name
            <input required minLength={2} maxLength={120} autoComplete="organization"
              placeholder="e.g. Bright Future Academy" value={values.schoolName}
              onChange={(event) => update("schoolName", event.target.value)} />
          </label>
          <div className="marketing-form-row">
            <label>School location <small>(optional)</small>
              <input maxLength={120} placeholder="Town or city, state" value={location}
                onChange={(event) => setLocation(event.target.value)} />
            </label>
            <MarketingSelect id="school-size-select" label="Student count" name="schoolSize"
              value={values.schoolSize ?? ""} optional placeholder="Select a range" options={sizes}
              onChange={(value) => update("schoolSize", value)} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Your contact details</legend>
        <div className="marketing-form-fields">
          <div className="marketing-form-row">
            <label>Full name
              <input required minLength={2} maxLength={100} autoComplete="name"
                value={values.contactName} onChange={(event) => update("contactName", event.target.value)} />
            </label>
            <label>Role at the school <small>(optional)</small>
              <input maxLength={80} autoComplete="organization-title" placeholder="e.g. Principal"
                value={contactRole} onChange={(event) => setContactRole(event.target.value)} />
            </label>
          </div>
          <div className="marketing-form-row">
            <label>Work email
              <input required type="email" autoComplete="email" placeholder="you@yourschool.com"
                value={values.email} onChange={(event) => update("email", event.target.value)} />
            </label>
            <label>Phone or WhatsApp
              <input required type="tel" autoComplete="tel" placeholder="e.g. 0803 123 4567"
                value={values.phone} onChange={(event) => update("phone", event.target.value)} />
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Preferred demo time</legend>
        <div className="marketing-form-fields">
          <div className="marketing-form-row">
            <label>Date
              <input required type="date" min={bookingDate.format(new Date())} value={values.preferredDate}
                onChange={(event) => update("preferredDate", event.target.value)} />
            </label>
            <label>Time <small>(West Africa Time)</small>
              <input required type="time" value={values.preferredTime}
                onChange={(event) => update("preferredTime", event.target.value)} />
            </label>
          </div>
          <label>What would you like to see? <small>(optional)</small>
            <textarea maxLength={notesLimit} placeholder="e.g. How parents pay fees and view results"
              value={values.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </div>
      </fieldset>

      {error && <p className="marketing-form-error" role="alert">{error}</p>}
      <button className="marketing-button marketing-button-dark marketing-form-submit" type="submit" disabled={pending}>
        {pending ? "Sending your request…" : "Request a demo"}<ArrowRight size={17} />
      </button>
    </form>
  );
}
