import type { EventAudience } from "./events.types";

export const eventAudienceOptions: { value: EventAudience; label: string }[] = [
  { value: "Everyone", label: "Everyone" },
  { value: "Students", label: "Students" },
  { value: "Teachers", label: "Teachers" },
  { value: "Parents", label: "Parents" },
  { value: "Staff", label: "Staff" },
  { value: "Selected Classes", label: "Selected classes" },
];

export type BackendEventAudience = Exclude<EventAudience, "Selected Classes"> | "Selected_Classes";

export function toBackendEventAudience(audiences: EventAudience[]): BackendEventAudience[] {
  return audiences.map((audience) => audience === "Selected Classes" ? "Selected_Classes" : audience);
}

export function fromBackendEventAudience(audiences: BackendEventAudience[]): EventAudience[] {
  return audiences.map((audience) => audience === "Selected_Classes" ? "Selected Classes" : audience);
}
