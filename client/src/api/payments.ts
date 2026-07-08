import { api } from "./client";
import { ApiEnvelope, Booking } from "@/types";

export interface CreateOrderResult {
  paymentId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  bookingId: string;
  bookingCode: string;
}

export async function createPaymentOrder(bookingId: string): Promise<CreateOrderResult> {
  const res = await api.post<ApiEnvelope<CreateOrderResult>>("/payments/create-order", { bookingId });
  return res.data.data;
}

export interface VerifyPaymentInput {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<Booking> {
  const res = await api.post<ApiEnvelope<{ booking: Booking }>>("/payments/verify", input);
  return res.data.data.booking;
}
