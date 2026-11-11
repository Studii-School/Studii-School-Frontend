import { apiRequest, readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { emptyFacilitiesState, getStoredFacilities, saveStoredFacilities } from "./facilities.storage";
import type { FacilitiesState, FacilityInputMap } from "./facilities.types";

type FacilityAction = keyof FacilityInputMap;
type ResponseState = FacilitiesState | { data?: FacilitiesState; facilities?: FacilitiesState };

function unwrap(value: ResponseState): FacilitiesState {
  if ("books" in value) return { ...emptyFacilitiesState(), ...value };
  return { ...emptyFacilitiesState(), ...(value.facilities ?? value.data ?? {}) };
}

function id(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function schoolId() {
  return readStoredUser()?.schoolId ?? "school-001";
}

async function append<K extends keyof FacilitiesState>(key: K, item: FacilitiesState[K][number]) {
  const state = getStoredFacilities();
  const next = { ...state, [key]: [item, ...state[key]] } as FacilitiesState;
  saveStoredFacilities(next);
  return next;
}

export const facilitiesRepository = {
  async getAll(): Promise<FacilitiesState> {
    if (!readStoredToken()) return getStoredFacilities();
    return unwrap(await apiRequest<ResponseState>("/facilities"));
  },

  async create<K extends FacilityAction>(action: K, input: FacilityInputMap[K]) {
    if (readStoredToken()) {
      return apiRequest<{ item?: unknown; data?: unknown }>(`/facilities/${action === "loanRequest" ? "library/requests" : action === "loan" ? "library/loans" : action === "transportAssignment" ? "transport/assignments" : action === "pickupUpdate" ? "transport/pickup-updates" : action === "healthRecord" ? "health/records" : action === "maintenanceRequest" ? "inventory/maintenance-requests" : action === "book" ? "library/books" : action === "route" ? "transport/routes" : `inventory/assets`}`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    }

    const now = new Date().toISOString();
    const owner = schoolId();
    switch (action) {
      case "book": {
        const data = input as FacilityInputMap["book"];
        if (!data.title.trim() || data.copies < 1) throw new Error("Enter a book title and at least one copy.");
        const item = { ...data, id: id("book"), schoolId: owner, title: data.title.trim(), availableCopies: data.copies, createdAt: now };
        return append("books", item);
      }
      case "loan":
      case "loanRequest": {
        const data = input as FacilityInputMap["loan"];
        const state = getStoredFacilities();
        const book = state.books.find((item) => item.id === data.bookId);
        if (!book) throw new Error("Choose a book from the catalogue.");
        const pending = state.loans.some((loan) => loan.bookId === book.id && loan.studentId === data.studentId && loan.status !== "RETURNED");
        if (pending) throw new Error("This student already has an open loan or request for this book.");
        const requested = action === "loanRequest";
        if (!requested && book.availableCopies < 1) throw new Error("No copies are currently available.");
        const loan = { ...data, id: id("loan"), schoolId: owner, bookTitle: book.title, status: requested ? "REQUESTED" as const : "ISSUED" as const, issuedAt: requested ? undefined : now, requestedAt: now };
        if (!requested) book.availableCopies -= 1;
        saveStoredFacilities({ ...state, books: state.books.map((item) => item.id === book.id ? book : item), loans: [loan, ...state.loans] });
        return getStoredFacilities();
      }
      case "route": {
        const data = input as FacilityInputMap["route"];
        if (!data.name.trim() || !data.driver.trim()) throw new Error("Enter a route name and driver.");
        return append("routes", { ...data, id: id("route"), schoolId: owner, name: data.name.trim(), stops: data.stops.filter(Boolean), createdAt: now });
      }
      case "transportAssignment": {
        const data = input as FacilityInputMap["transportAssignment"];
        const state = getStoredFacilities();
        if (!state.routes.some((item) => item.id === data.routeId)) throw new Error("Choose a route first.");
        const current = state.transportAssignments.find((item) => item.studentId === data.studentId);
        const assignment = { ...data, id: current?.id ?? id("transport"), schoolId: owner, updatedAt: now };
        const next = { ...state, transportAssignments: current ? state.transportAssignments.map((item) => item.id === current.id ? assignment : item) : [assignment, ...state.transportAssignments] };
        saveStoredFacilities(next);
        return next;
      }
      case "pickupUpdate": {
        const data = input as FacilityInputMap["pickupUpdate"];
        if (!data.message.trim()) throw new Error("Add a pickup update message.");
        return append("pickupUpdates", { ...data, id: id("pickup"), schoolId: owner, message: data.message.trim(), createdAt: now });
      }
      case "healthRecord": {
        const data = input as FacilityInputMap["healthRecord"];
        if (!data.studentId || !data.title.trim()) throw new Error("Choose a student and add a record title.");
        return append("healthRecords", { ...data, id: id("health"), schoolId: owner, title: data.title.trim(), createdAt: now });
      }
      case "asset": {
        const data = input as FacilityInputMap["asset"];
        if (!data.name.trim() || !data.assetTag.trim()) throw new Error("Enter an asset name and asset tag.");
        const state = getStoredFacilities();
        if (state.assets.some((item) => item.assetTag.toLowerCase() === data.assetTag.trim().toLowerCase())) throw new Error("That asset tag is already in use.");
        return append("assets", { ...data, id: id("asset"), schoolId: owner, name: data.name.trim(), assetTag: data.assetTag.trim(), updatedAt: now });
      }
      case "maintenanceRequest": {
        const data = input as FacilityInputMap["maintenanceRequest"];
        if (!data.assetName.trim() || !data.description.trim()) throw new Error("Add an item name and describe the issue.");
        return append("maintenanceRequests", { ...data, id: id("maintenance"), schoolId: owner, status: "OPEN" as const, createdAt: now });
      }
    }
  },

  async returnLoan(loanId: string) {
    if (readStoredToken()) {
      await apiRequest(`/facilities/library/loans/${encodeURIComponent(loanId)}/return`, { method: "POST" });
      return this.getAll();
    }
    const state = getStoredFacilities();
    const loan = state.loans.find((item) => item.id === loanId);
    if (!loan || loan.status === "RETURNED") throw new Error("This loan is no longer open.");
    const books = state.books.map((book) => book.id === loan.bookId ? { ...book, availableCopies: Math.min(book.copies, book.availableCopies + (loan.status === "ISSUED" ? 1 : 0)) } : book);
    const loans = state.loans.map((item) => item.id === loanId ? { ...item, status: "RETURNED" as const, returnedAt: new Date().toISOString() } : item);
    return saveStoredFacilities({ ...state, books, loans });
  },

  async resolveLoanRequest(loanId: string, issue: boolean) {
    if (readStoredToken()) {
      await apiRequest(`/facilities/library/requests/${encodeURIComponent(loanId)}/${issue ? "issue" : "decline"}`, { method: "POST" });
      return this.getAll();
    }
    const state = getStoredFacilities();
    const loan = state.loans.find((item) => item.id === loanId && item.status === "REQUESTED");
    if (!loan) throw new Error("This book request is no longer waiting for review.");
    const book = state.books.find((item) => item.id === loan.bookId);
    if (issue && (!book || book.availableCopies < 1)) throw new Error("No copies are currently available.");
    const now = new Date().toISOString();
    const loans = state.loans.map((item) => item.id === loanId ? { ...item, status: issue ? "ISSUED" as const : "DECLINED" as const, issuedAt: issue ? now : undefined } : item);
    const books = issue ? state.books.map((item) => item.id === loan.bookId ? { ...item, availableCopies: item.availableCopies - 1 } : item) : state.books;
    return saveStoredFacilities({ ...state, books, loans });
  },

  async updateAssetCondition(assetId: string, condition: FacilityInputMap["asset"]["condition"]) {
    if (readStoredToken()) {
      await apiRequest(`/facilities/inventory/assets/${encodeURIComponent(assetId)}`, { method: "PATCH", body: JSON.stringify({ condition }) });
      return this.getAll();
    }
    const state = getStoredFacilities();
    return saveStoredFacilities({ ...state, assets: state.assets.map((item) => item.id === assetId ? { ...item, condition, updatedAt: new Date().toISOString() } : item) });
  },

  async updateMaintenanceStatus(requestId: string, status: "IN_PROGRESS" | "RESOLVED") {
    if (readStoredToken()) {
      await apiRequest(`/facilities/inventory/maintenance-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      return this.getAll();
    }
    const state = getStoredFacilities();
    return saveStoredFacilities({ ...state, maintenanceRequests: state.maintenanceRequests.map((item) => item.id === requestId ? { ...item, status } : item) });
  },
};
