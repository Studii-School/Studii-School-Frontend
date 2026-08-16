import type { Announcement, EventItem, Stat, TableRow, User } from "@/types";

export const users: Record<"superAdmin" | "admin" | "teacher" | "student" | "parent", User> = {
  superAdmin: { name: "Studii Super Admin", role: "Super Administrator", email: "admin@studii.test", initials: "SA", schoolId: "platform" },
  admin: { name: "Amaka Okafor", role: "Administrator", email: "amaka@greenfield.edu.ng", initials: "AO", schoolId: "school-001" },
  teacher: { name: "Chinedu Balogun", role: "Teacher", email: "c.balogun@greenfield.edu.ng", initials: "CB", schoolId: "school-001" },
  student: { name: "Yusuf Musa", role: "Student", email: "yusuf.musa@greenfield.edu.ng", initials: "YM", schoolId: "school-001" },
  parent: { name: "Aisha Musa", role: "Parent", email: "aisha.musa@example.com", initials: "AM", schoolId: "school-001" },
};

export const announcements: Announcement[] = [
  { title: "First term resumption information", date: "18 Sep 2026", audience: "All families" },
  { title: "Inter-house sports registration", date: "15 Sep 2026", audience: "Students" },
  { title: "Mid-term assessment timetable", date: "12 Sep 2026", audience: "JSS & SS" },
];
export const events: EventItem[] = [
  { title: "Parents' forum", date: "24 Sep", time: "10:00 AM" }, { title: "Career day", date: "02 Oct", time: "9:00 AM" },
  { title: "Mid-term break", date: "16 Oct", time: "All day" },
];

export const adminStats: Stat[] = [
  { label: "Total students", value: "1,284", note: "+42 this term", icon: "students", tone: "primary" },
  { label: "Total staff", value: "96", note: "74 teaching staff", icon: "staff" },
  { label: "Fees collected", value: "₦42.8m", note: "78% of target", icon: "finance", tone: "success" },
  { label: "Outstanding fees", value: "₦12.1m", note: "214 accounts", icon: "reports", tone: "warning" },
];
export const teacherStats: Stat[] = [
  { label: "Today's classes", value: "4", note: "Next: JSS2A · 10:20", icon: "classes", tone: "primary" },
  { label: "Attendance pending", value: "2", note: "JSS2A and JSS2B", icon: "attendance", tone: "warning" },
  { label: "Results to enter", value: "38", note: "Due Friday", icon: "results" },
  { label: "Assigned classes", value: "5", note: "142 students", icon: "students" },
];
export const studentStats: Stat[] = [
  { label: "Current class", value: "SS2 Science", note: "Emerald House", icon: "classes", tone: "primary" },
  { label: "Attendance", value: "94%", note: "This term", icon: "attendance", tone: "success" },
  { label: "Latest average", value: "82%", note: "Mid-term assessment", icon: "results" },
  { label: "Fee status", value: "Paid", note: "First term", icon: "finance", tone: "success" },
];
export const parentStats: Stat[] = [
  { label: "Current class", value: "SS2 Science", note: "Zainab Musa", icon: "classes", tone: "primary" },
  { label: "Attendance", value: "94%", note: "This term", icon: "attendance", tone: "success" },
  { label: "Latest average", value: "82%", note: "Mid-term assessment", icon: "results" },
  { label: "Outstanding", value: "₦35,000", note: "Transport levy", icon: "finance", tone: "warning" },
];

export const recentPayments: TableRow[] = [
  { student: "David Eze", class: "JSS 1A", amount: "₦185,000", status: "Paid" },
  { student: "Temilade Adeyemi", class: "SS 2B", amount: "₦220,000", status: "Paid" },
  { student: "Sadiq Ibrahim", class: "JSS 3C", amount: "₦75,000", status: "Part paid" },
];
export const admissions: TableRow[] = [
  { applicant: "Favour Nwosu", applyingFor: "JSS 1", submitted: "Today", status: "Review" },
  { applicant: "Abdul Bello", applyingFor: "SS 1", submitted: "Yesterday", status: "Documents pending" },
  { applicant: "Ifeoma Obi", applyingFor: "JSS 2", submitted: "19 Sep", status: "Review" },
];
export const todaysClasses: TableRow[] = [
  { time: "8:00 – 8:40", class: "JSS 2A", subject: "Mathematics", room: "Block B · 12" },
  { time: "10:20 – 11:00", class: "JSS 2B", subject: "Mathematics", room: "Block B · 14" },
  { time: "12:30 – 1:10", class: "JSS 3A", subject: "Basic Science", room: "Science Lab" },
];
export const timetable: TableRow[] = [
  { time: "8:00", subject: "Mathematics", teacher: "Mr Balogun", room: "SS2A" },
  { time: "8:40", subject: "English Language", teacher: "Mrs Nwosu", room: "SS2A" },
  { time: "10:20", subject: "Chemistry", teacher: "Mrs Danjuma", room: "Lab 1" },
];
export const assignments: TableRow[] = [
  { subject: "Chemistry", task: "Periodic table worksheet", due: "25 Sep", status: "In progress" },
  { subject: "English", task: "Essay: My Community", due: "28 Sep", status: "Not started" },
  { subject: "Mathematics", task: "Quadratic equations", due: "30 Sep", status: "Not started" },
];
export const resultRows: TableRow[] = [
  { subject: "Mathematics", assessment: "Mid-term", score: "86%", grade: "A" },
  { subject: "English Language", assessment: "Mid-term", score: "78%", grade: "B" },
  { subject: "Chemistry", assessment: "Mid-term", score: "84%", grade: "A" },
];
export const students: TableRow[] = [
  { name: "Zainab Musa", admissionNo: "GF/2022/084", class: "SS 2A", status: "Active" },
  { name: "David Eze", admissionNo: "GF/2025/141", class: "JSS 1A", status: "Active" },
  { name: "Temilade Adeyemi", admissionNo: "GF/2022/103", class: "SS 2B", status: "Active" },
  { name: "Sadiq Ibrahim", admissionNo: "GF/2023/051", class: "JSS 3C", status: "Active" },
];
export const staff: TableRow[] = [
  { name: "Chinedu Balogun", role: "Mathematics Teacher", department: "Sciences", status: "Active" },
  { name: "Ngozi Nwosu", role: "English Teacher", department: "Languages", status: "Active" },
  { name: "Fatima Danjuma", role: "Chemistry Teacher", department: "Sciences", status: "Active" },
];
export const attendanceRows: TableRow[] = [
  { period: "This week", present: "94%", absent: "4%", late: "2%" },
  { period: "Last week", present: "92%", absent: "5%", late: "3%" },
  { period: "Term average", present: "93%", absent: "5%", late: "2%" },
];
export const activities = ["12 new student records imported", "First-term invoice batch created", "JSS 3 attendance submitted", "School calendar updated"];
