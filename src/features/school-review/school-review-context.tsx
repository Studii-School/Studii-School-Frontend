"use client";

import { createContext, useContext } from "react";

export const SchoolReviewContext = createContext(false);

export function useSchoolUnderReview() {
  return useContext(SchoolReviewContext);
}
