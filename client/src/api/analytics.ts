import { api } from "./client";

export async function logEvent(type: "PARTNER_PAGE_VIEW" | "APPLICATION_STARTED") {
  // Fire-and-forget: analytics must never break the page it's tracking.
  try {
    await api.post("/analytics/events", { type });
  } catch {
    // ignore
  }
}
