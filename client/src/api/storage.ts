import { api } from "./client";
import { ApiEnvelope, AvailabilityResult, LuggageType, Review, SearchMeta, StorageLocationSummary } from "@/types";

export interface SearchParams {
  lat?: number;
  lng?: number;
  city?: string;
  search?: string;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  luggageType?: LuggageType;
  sort?: "distance" | "price" | "rating";
}

export interface SearchResponse {
  results: StorageLocationSummary[];
  meta: SearchMeta;
}

export async function searchStorage(params: SearchParams): Promise<SearchResponse> {
  const res = await api.get<ApiEnvelope<SearchResponse & { count: number }>>("/storage", { params });
  return { results: res.data.data.results, meta: res.data.data.meta };
}

export async function getStorageById(id: string): Promise<StorageLocationSummary> {
  const res = await api.get<ApiEnvelope<{ location: StorageLocationSummary }>>(`/storage/${id}`);
  return res.data.data.location;
}

export async function checkStorageAvailability(
  id: string,
  dropoffAt: string,
  pickupAt: string,
  bags: number,
  clientUtcOffsetMinutes: number
): Promise<AvailabilityResult> {
  const res = await api.get<ApiEnvelope<{ availability: AvailabilityResult }>>(`/storage/${id}/availability`, {
    params: { dropoffAt, pickupAt, bags, clientUtcOffsetMinutes },
  });
  return res.data.data.availability;
}

export async function getReviews(storageLocationId: string): Promise<Review[]> {
  const res = await api.get<ApiEnvelope<{ reviews: Review[] }>>(`/storage/${storageLocationId}/reviews`);
  return res.data.data.reviews;
}

export async function submitReview(
  storageLocationId: string,
  input: { bookingId: string; rating: number; comment?: string }
): Promise<Review> {
  const res = await api.post<ApiEnvelope<{ review: Review }>>(`/storage/${storageLocationId}/reviews`, input);
  return res.data.data.review;
}
