export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AttendanceRegisterStatus = "DRAFT" | "SUBMITTED" | "REOPENED";
export type AttendanceAuditAction="CREATED"|"DRAFT_SAVED"|"SUBMITTED"|"REOPENED"|"ENTRY_UPDATED";
export interface AttendanceAuditEntry{id:string;schoolId:string;registerId:string;action:AttendanceAuditAction;actorUserId:string;actorRole:"ADMIN"|"TEACHER";actorUser?:{id:string;name?:string|null;email?:string|null};reason?:string;previousValue?:string;newValue?:string;createdAt:string}
export interface StudentAttendanceEntry { id:string; schoolId:string; registerId:string; studentId:string; student?:{id?:string;firstName?:string;lastName?:string;admissionNumber?:string}; status:AttendanceStatus; note?:string; arrivalTime?:string; markedByUserId:string; createdAt:string; updatedAt:string; }
export interface AttendanceRegister { id:string; schoolId:string; classId:string; academicSessionId?:string; sessionId?:string; termId?:string; date:string; status:AttendanceRegisterStatus; teacherUserId:string; submittedAt?:string; submittedByUserId?:string; originallySubmittedAt?:string; entries:StudentAttendanceEntry[]; auditHistory:AttendanceAuditEntry[]; createdAt:string; updatedAt:string; }
export interface AttendanceEntryInput { studentId:string; status:AttendanceStatus; note?:string; arrivalTime?:string; }
export interface SaveAttendanceInput { teacherUserId:string; schoolId?:string; classId:string; academicSessionId?:string; sessionId?:string; termId?:string; date:string; entries:AttendanceEntryInput[]; isAdmin?:boolean; }
export interface AdminAttendanceEntryInput{registerId:string;studentId:string;status:AttendanceStatus;note?:string;arrivalTime?:string;reason:string;adminUserId:string}
export interface AttendanceSummary { present:number; absent:number; late:number; excused:number; unmarked:number; total:number; percentage:number; }
