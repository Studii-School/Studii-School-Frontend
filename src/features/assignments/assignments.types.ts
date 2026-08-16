export type AssignmentStatus="DRAFT"|"PUBLISHED"|"CLOSED";
export type SubmissionStatus="NOT_SUBMITTED"|"SUBMITTED"|"LATE"|"GRADED";
export interface AssignmentAsset{id:string;name:string;type:string;size:number;dataUrl:string}
export interface Assignment{id:string;schoolId:string;teacherUserId:string;classId:string;subjectId:string;sessionId?:string;termId?:string;title:string;instructions:string;dueAt:string;status:AssignmentStatus;maxScore?:number;attachment?:AssignmentAsset;createdAt:string;updatedAt:string;publishedAt?:string}
export interface AssignmentSubmission{id:string;assignmentId:string;studentId:string;status:SubmissionStatus;text:string;attachment?:AssignmentAsset;submittedAt?:string;score?:number;feedback?:string;updatedAt:string}
export interface AssignmentsState{assignments:Assignment[];submissions:AssignmentSubmission[]}
export interface AssignmentInput{classId:string;subjectId:string;title:string;instructions:string;dueAt:string;attachment?:AssignmentAsset}
