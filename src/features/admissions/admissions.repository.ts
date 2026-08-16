import { readStoredJson, writeStoredJson } from "@/lib/storage";
import type { AdmissionApplication, AdmissionDocument, AdmissionFormConfig, AdmissionInput, AdmissionStatus } from "./admissions.types";

export const ADMISSIONS_STORAGE_KEY = "schoolos.admissions.v1";
export const ADMISSIONS_FORM_STORAGE_KEY = "schoolos.admissions.form.v1";
const now = "2026-07-22T08:00:00.000Z";
const seed = (id: string, firstName: string, lastName: string, classId: string, status: AdmissionStatus, days: number): AdmissionApplication => ({
  id, applicationNumber: `APP/2026/${id.slice(-3).toUpperCase()}`, firstName, lastName, gender: id.endsWith("1") || id.endsWith("3") ? "Female" : "Male", dateOfBirth: "2013-04-18", nationality: "Nigerian", address: "12 School Road, Lagos", schoolLevel: "SECONDARY", classId, parentName: `${lastName} Parent`, relationship: "Parent", parentPhone: "0803 555 0182", parentEmail: `${lastName.toLowerCase()}@example.com`, previousSchool: "Community Junior School", previousClass: "Primary 6", reasonForLeaving: "Progression to secondary school", medicalNotes: "", documents: [{ id: `doc-${id}`, name: "Birth certificate.pdf", type: "Birth certificate", uploadedAt: now }], status, submittedAt: new Date(Date.parse(now) - days * 86400000).toISOString(), updatedAt: now, decisions: [{ id: `decision-${id}`, status, changedAt: now, changedBy: "Admissions officer" }],
});
const defaults: AdmissionApplication[] = [
  seed("application-001", "Amara", "Okeke", "class-jss1-gold", "NEW", 2),
  seed("application-002", "Samuel", "Adewale", "class-jss1-blue", "UNDER_REVIEW", 5),
  seed("application-003", "Maryam", "Ibrahim", "class-jss1-gold", "INTERVIEW", 8),
  seed("application-004", "Daniel", "Effiong", "class-jss2", "ACCEPTED", 12),
  seed("application-005", "Chisom", "Nwosu", "class-jss1-blue", "REJECTED", 15),
];

const getAll = () => Promise.resolve(readStoredJson(ADMISSIONS_STORAGE_KEY, defaults));
const save = (items: AdmissionApplication[]) => { writeStoredJson(ADMISSIONS_STORAGE_KEY, items); return items; };
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const defaultAdmissionFormConfig: AdmissionFormConfig = {
  title: "Admission Application",
  intro: "Complete the form below and our admissions team will review the application.",
  isPublished: true,
  fields: [
    { key: "photoUrl", label: "Student photo", enabled: true, required: false, type: "image", builtIn: true },
    { key: "firstName", label: "First name", enabled: true, required: true, type: "text", builtIn: true },
    { key: "middleName", label: "Middle name", enabled: true, required: false, type: "text", builtIn: true },
    { key: "lastName", label: "Last name", enabled: true, required: true, type: "text", builtIn: true },
    { key: "gender", label: "Gender", enabled: true, required: false, type: "text", builtIn: true },
    { key: "dateOfBirth", label: "Date of birth", enabled: true, required: false, type: "date", builtIn: true },
    { key: "nationality", label: "Nationality", enabled: true, required: false, type: "text", builtIn: true },
    { key: "address", label: "Address", enabled: true, required: false, type: "text", builtIn: true },
    { key: "classId", label: "Class applying for", enabled: true, required: true, type: "text", builtIn: true },
    { key: "parentName", label: "Parent or guardian name", enabled: true, required: true, type: "text", builtIn: true },
    { key: "relationship", label: "Relationship", enabled: true, required: true, type: "text", builtIn: true },
    { key: "parentPhone", label: "Parent phone", enabled: true, required: true, type: "phone", builtIn: true },
    { key: "parentEmail", label: "Parent email", enabled: true, required: false, type: "email", builtIn: true },
    { key: "previousSchool", label: "Previous school", enabled: true, required: false, type: "text", builtIn: true },
    { key: "previousClass", label: "Previous class", enabled: true, required: false, type: "text", builtIn: true },
    { key: "medicalNotes", label: "Medical notes", enabled: true, required: false, type: "textarea", builtIn: true },
  ],
};

const normalizeConfig = (config: AdmissionFormConfig): AdmissionFormConfig => {
  const configured = new Map(config.fields.map((field) => [field.key, field]));
  const builtinKeys = new Set(defaultAdmissionFormConfig.fields.map((field) => field.key));
  const customFields = config.fields.filter((field) => !builtinKeys.has(field.key));
  return {
    ...defaultAdmissionFormConfig,
    ...config,
    fields: [...defaultAdmissionFormConfig.fields.map((field) => ({ ...field, ...configured.get(field.key), builtIn: true })), ...customFields],
  };
};

export const admissionsRepository = {
  getAll,
  getFormConfig: () => Promise.resolve(normalizeConfig(readStoredJson(ADMISSIONS_FORM_STORAGE_KEY, defaultAdmissionFormConfig))),
  async saveFormConfig(config: AdmissionFormConfig) {
    const normalized = normalizeConfig(config);
    writeStoredJson(ADMISSIONS_FORM_STORAGE_KEY, normalized);
    return normalized;
  },
  async create(input: AdmissionInput) {
    const items = await getAll(); const timestamp = new Date().toISOString();
    const application: AdmissionApplication = { ...input, id: id("application"), applicationNumber: `APP/${new Date().getFullYear()}/${String(items.length + 1).padStart(4, "0")}`, documents: [], status: "NEW", submittedAt: timestamp, updatedAt: timestamp, decisions: [{ id: id("decision"), status: "NEW", changedAt: timestamp, changedBy: "Admissions officer" }] };
    save([application, ...items]); return application;
  },
  async updateStatus(applicationId: string, status: AdmissionStatus, note?: string, enrolledStudentId?: string) {
    const items = await getAll(); const timestamp = new Date().toISOString();
    const updated = items.map((item) => item.id === applicationId ? { ...item, status, enrolledStudentId: enrolledStudentId ?? item.enrolledStudentId, updatedAt: timestamp, decisions: [...item.decisions, { id: id("decision"), status, note, changedAt: timestamp, changedBy: "Admissions officer" }] } : item);
    save(updated); return updated.find((item) => item.id === applicationId)!;
  },
  async updateInterview(applicationId: string, interviewDate: string, interviewOutcome: string, interviewNotes: string) {
    const items = await getAll(); const timestamp = new Date().toISOString();
    const updated = items.map((item) => item.id === applicationId ? { ...item, interviewDate, interviewOutcome, interviewNotes, updatedAt: timestamp } : item); save(updated);
  },
  async addDocument(applicationId: string, input: Omit<AdmissionDocument, "id" | "uploadedAt">) {
    const items = await getAll(); const timestamp = new Date().toISOString();
    const updated = items.map((item) => item.id === applicationId ? { ...item, documents: [...item.documents, { ...input, id: id("document"), uploadedAt: timestamp }], updatedAt: timestamp } : item); save(updated);
  },
};
