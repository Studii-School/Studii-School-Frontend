import { readStoredJson, writeStoredJson } from "@/lib/storage";
import type { FacilitiesState } from "./facilities.types";

export const FACILITIES_STORAGE_KEY = "schoolos.facilities.v1";

export const emptyFacilitiesState = (): FacilitiesState => ({
  books: [],
  loans: [],
  routes: [],
  transportAssignments: [],
  pickupUpdates: [],
  healthRecords: [],
  assets: [],
  maintenanceRequests: [],
});

export function getStoredFacilities() {
  return { ...emptyFacilitiesState(), ...readStoredJson<Partial<FacilitiesState>>(FACILITIES_STORAGE_KEY, {}) };
}

export function saveStoredFacilities(state: FacilitiesState) {
  writeStoredJson(FACILITIES_STORAGE_KEY, state);
  return state;
}
