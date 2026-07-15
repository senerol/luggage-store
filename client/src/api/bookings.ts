import { api } from "./client";
import { ApiEnvelope, Booking, LuggageType } from "@/types";

export interface CreateBookingInput {
  storageLocationId: string;
  dropoffAt: string;
  pickupAt: string;
  items: { luggageType: LuggageType; quantity: number }[];
  clientUtcOffsetMinutes: number;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await api.post<ApiEnvelope<{ booking: Booking }>>("/bookings", input);
  return res.data.data.booking;
}

export async function listMyBookings(): Promise<Booking[]> {
  const res = await api.get<ApiEnvelope<{ bookings: Booking[] }>>("/bookings");
  return res.data.data.bookings;
}

export async function getBookingById(id: string): Promise<Booking> {
  const res = await api.get<ApiEnvelope<{ booking: Booking }>>(`/bookings/${id}`);
  return res.data.data.booking;
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.patch<ApiEnvelope<{ booking: Booking }>>(`/bookings/${id}/cancel`, { reason });
  return res.data.data.booking;
}
