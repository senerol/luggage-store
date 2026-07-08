import { api } from "./client";
import { ApiEnvelope, Booking } from "@/types";

export interface BookingQr {
  stage: "check-in" | "check-out";
  bookingCode: string;
  qrImage: string; // data URL
  validFrom: string | null;
  validUntil: string | null;
}

export async function getBookingQr(bookingId: string): Promise<BookingQr> {
  const res = await api.get<ApiEnvelope<{ qr: BookingQr }>>(`/qr/booking/${bookingId}`);
  return res.data.data.qr;
}

export async function verifyQr(token: string): Promise<Booking> {
  const res = await api.post<ApiEnvelope<{ booking: Booking }>>("/qr/verify", { token });
  return res.data.data.booking;
}
