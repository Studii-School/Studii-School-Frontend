"use client";
import { createContext,useContext } from "react";
import type { AdminAttendanceEntryInput,AttendanceRegister,SaveAttendanceInput } from "./attendance.types";
export interface AttendanceContextValue{registers:AttendanceRegister[];isLoading:boolean;error?:string;saveDraft(input:SaveAttendanceInput):Promise<void>;submit(input:SaveAttendanceInput):Promise<void>;reopen(id:string,reason:string):Promise<void>;correctEntry(input:AdminAttendanceEntryInput):Promise<void>;refresh():Promise<void>}
export const AttendanceContext=createContext<AttendanceContextValue|null>(null);
export function useAttendance(){const value=useContext(AttendanceContext);if(!value)throw new Error("useAttendance must be used within AttendanceProvider");return value}
