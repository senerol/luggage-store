import { api } from "./client";

export interface CreateReportInput {
  targetType: "STORAGE_LOCATION" | "BOOKING" | "USER";
  targetId: string;
  reason: string;
}

export async function createReport(input: CreateReportInput) {
  await api.post("/reports", input);
}
