import { api } from "./client";
import { ApiEnvelope, AvailabilityResult, LuggageType, Review, StorageLocationSummary } from "@/types";

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

export async function searchStorage(params: SearchParams): Promise<StorageLocationSummary[]> {
  const res = await api.get<ApiEnvelope<{ results: StorageLocationSummary[] }>>("/storage", { params });
  return res.data.data.results;
}

export async function getStorageById(id: string): Promise<StorageLocationSummary> {
  const res = await api.get<ApiEnvelope<{ location: StorageLocationSummary }>>(`/storage/${id}`);
  return res.data.data.location;
}

export async function checkStorageAvailability(
  id: string,
  dropoffAt: string,
  pickupAt: string,
  bags: number
): Promise<AvailabilityResult> {
  const res = await api.get<ApiEnvelope<{ availability: AvailabilityResult }>>(`/storage/${id}/availability`, {
    params: { dropoffAt, pickupAt, bags },
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
