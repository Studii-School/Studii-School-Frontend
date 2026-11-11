export type FacilityModule = "library" | "transport" | "health" | "inventory";

export interface LibraryBook {
  id: string;
  schoolId: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  copies: number;
  availableCopies: number;
  shelf?: string;
  createdAt: string;
}

export interface LibraryLoan {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  className?: string;
  status: "REQUESTED" | "ISSUED" | "RETURNED" | "DECLINED";
  issuedAt?: string;
  dueDate: string;
  returnedAt?: string;
  requestedAt: string;
}

export interface SchoolRoute {
  id: string;
  schoolId: string;
  name: string;
  vehicle: string;
  vehicleNumber: string;
  driver: string;
  driverPhone: string;
  departureTime: string;
  stops: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface TransportAssignment {
  id: string;
  schoolId: string;
  routeId: string;
  studentId: string;
  studentName: string;
  pickupStop: string;
  dropoffStop: string;
  pickupContact: string;
  pickupPhone: string;
  status: "ACTIVE" | "PAUSED";
  updatedAt: string;
}

export interface PickupUpdate {
  id: string;
  schoolId: string;
  studentId?: string;
  studentName?: string;
  routeId?: string;
  message: string;
  kind: "GENERAL" | "DELAY" | "PICKUP_CHANGE" | "ABSENT";
  createdBy: string;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  category: "ALLERGY" | "MEDICATION" | "CONDITION" | "INCIDENT" | "EMERGENCY_CONTACT";
  title: string;
  details: string;
  severity?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  contactName?: string;
  contactPhone?: string;
  recordedBy: string;
  createdAt: string;
}

export interface InventoryAsset {
  id: string;
  schoolId: string;
  name: string;
  assetTag: string;
  category: string;
  location: string;
  quantity: number;
  condition: "GOOD" | "NEEDS_REPAIR" | "OUT_OF_SERVICE";
  nextMaintenance?: string;
  notes?: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  schoolId: string;
  assetId?: string;
  assetName: string;
  location: string;
  description: string;
  priority: "LOW" | "NORMAL" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  reportedBy: string;
  createdAt: string;
}

export interface FacilitiesState {
  books: LibraryBook[];
  loans: LibraryLoan[];
  routes: SchoolRoute[];
  transportAssignments: TransportAssignment[];
  pickupUpdates: PickupUpdate[];
  healthRecords: HealthRecord[];
  assets: InventoryAsset[];
  maintenanceRequests: MaintenanceRequest[];
}

export type FacilityInputMap = {
  book: Omit<LibraryBook, "id" | "schoolId" | "availableCopies" | "createdAt">;
  loan: Pick<LibraryLoan, "bookId" | "studentId" | "studentName" | "className" | "dueDate">;
  loanRequest: Pick<LibraryLoan, "bookId" | "studentId" | "studentName" | "className" | "dueDate">;
  route: Omit<SchoolRoute, "id" | "schoolId" | "createdAt">;
  transportAssignment: Omit<TransportAssignment, "id" | "schoolId" | "updatedAt">;
  pickupUpdate: Omit<PickupUpdate, "id" | "schoolId" | "createdAt">;
  healthRecord: Omit<HealthRecord, "id" | "schoolId" | "createdAt">;
  asset: Omit<InventoryAsset, "id" | "schoolId" | "updatedAt">;
  maintenanceRequest: Omit<MaintenanceRequest, "id" | "schoolId" | "createdAt" | "status">;
};
