export type DemoRole = "admin" | "teacher" | "student" | "parent";

export interface DemoClass { id: string; name: string; }
export interface DemoStudent { id: string; schoolId: string; name: string; admissionNumber: string; classId: string; guardianId: string; initials: string; }
export interface DemoGuardian { id: string; userId: string; name: string; childStudentIds: string[]; }
export interface DemoUserIdentity {
  userId: string;
  schoolId: string;
  role: DemoRole;
  staffId?: string;
  studentId?: string;
  guardianId?: string;
  assignedClassIds: string[];
  assignedSubjectIds: string[];
  childStudentIds: string[];
}

export const SCHOOL_ID = "school-001";

export const demoClasses: DemoClass[] = [
  { id: "class-jss1-gold", name: "JSS1 Gold" },
  { id: "class-jss1-blue", name: "JSS1 Blue" },
  { id: "class-jss2", name: "JSS2" },
  { id: "class-jss3", name: "JSS3" },
  { id: "class-ss1-science", name: "SS1 Science" },
  { id: "class-ss2-commercial", name: "SS2 Commercial" },
  { id: "class-ss3-arts", name: "SS3 Arts" },
];

export const demoStudents: DemoStudent[] = [
  { id: "student-yusuf", schoolId: SCHOOL_ID, name: "Yusuf Musa", admissionNumber: "GF/2025/137", classId: "class-jss1-gold", guardianId: "guardian-001", initials: "YM" },
  { id: "student-david", schoolId: SCHOOL_ID, name: "David Eze", admissionNumber: "GF/2025/141", classId: "class-jss1-gold", guardianId: "guardian-eze", initials: "DE" },
  { id: "student-favour", schoolId: SCHOOL_ID, name: "Favour Johnson", admissionNumber: "GF/2025/146", classId: "class-jss1-gold", guardianId: "guardian-johnson", initials: "FJ" },
  { id: "student-ifeoma", schoolId: SCHOOL_ID, name: "Ifeoma Obi", admissionNumber: "GF/2025/149", classId: "class-jss1-gold", guardianId: "guardian-obi", initials: "IO" },
  { id: "student-zainab", schoolId: SCHOOL_ID, name: "Zainab Musa", admissionNumber: "GF/2022/084", classId: "class-ss2-commercial", guardianId: "guardian-001", initials: "ZM" },
  { id: "student-tobi", schoolId: SCHOOL_ID, name: "Tobi Adeyemi", admissionNumber: "GF/2024/102", classId: "class-jss2", guardianId: "guardian-adeyemi", initials: "TA" },
  { id: "student-chidera", schoolId: SCHOOL_ID, name: "Chidera Okafor", admissionNumber: "GF/2023/031", classId: "class-jss3", guardianId: "guardian-okafor", initials: "CO" },
  { id: "student-amina", schoolId: SCHOOL_ID, name: "Amina Bello", admissionNumber: "GF/2022/072", classId: "class-ss3-arts", guardianId: "guardian-bello", initials: "AB" },
];

export const demoGuardians: DemoGuardian[] = [
  { id: "guardian-001", userId: "parent-user-001", name: "Aisha Musa", childStudentIds: ["student-yusuf", "student-zainab"] },
  { id: "guardian-eze", userId: "parent-eze", name: "Ada Eze", childStudentIds: ["student-david"] },
  { id: "guardian-johnson", userId: "parent-johnson", name: "Grace Johnson", childStudentIds: ["student-favour"] },
  { id: "guardian-obi", userId: "parent-obi", name: "Ngozi Obi", childStudentIds: ["student-ifeoma"] },
  { id: "guardian-adeyemi", userId: "parent-adeyemi", name: "Kemi Adeyemi", childStudentIds: ["student-tobi"] },
  { id: "guardian-okafor", userId: "parent-okafor", name: "Ifeanyi Okafor", childStudentIds: ["student-chidera"] },
  { id: "guardian-bello", userId: "parent-bello", name: "Hauwa Bello", childStudentIds: ["student-amina"] },
];

export const demoUsers: Record<DemoRole, DemoUserIdentity> = {
  admin: { userId: "admin-user-001", schoolId: SCHOOL_ID, role: "admin", assignedClassIds: [], assignedSubjectIds: [], childStudentIds: [] },
  teacher: { userId: "teacher-user-001", schoolId: SCHOOL_ID, role: "teacher", staffId: "staff-001", assignedClassIds: ["class-jss1-gold"], assignedSubjectIds: ["subject-mathematics"], childStudentIds: [] },
  student: { userId: "student-user-001", schoolId: SCHOOL_ID, role: "student", studentId: "student-yusuf", assignedClassIds: [], assignedSubjectIds: [], childStudentIds: [] },
  parent: { userId: "parent-user-001", schoolId: SCHOOL_ID, role: "parent", guardianId: "guardian-001", assignedClassIds: [], assignedSubjectIds: [], childStudentIds: ["student-yusuf", "student-zainab"] },
};

export const classNameFor = (classId: string) => demoClasses.find((item) => item.id === classId)?.name ?? classId;
export const classIdForName = (name: string) => demoClasses.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id;
export const studentsForClass = (classId: string) => demoStudents.filter((student) => student.classId === classId);
export const studentsForGuardian = (guardianId: string) => demoStudents.filter((student) => student.guardianId === guardianId);
