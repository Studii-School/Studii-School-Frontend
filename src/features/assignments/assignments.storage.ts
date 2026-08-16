import { readStoredJson,writeStoredJson } from "@/lib/storage";
import type { AssignmentsState } from "./assignments.types";
export const ASSIGNMENTS_STORAGE_KEY="schoolos.assignments.v1";
export const emptyAssignmentsState: AssignmentsState = { assignments: [], submissions: [] };
export async function getAssignmentsState(){return readStoredJson<AssignmentsState>(ASSIGNMENTS_STORAGE_KEY,structuredClone(emptyAssignmentsState))}
export async function saveAssignmentsState(state:AssignmentsState){writeStoredJson(ASSIGNMENTS_STORAGE_KEY,state);return state}
