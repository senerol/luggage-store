import { api } from "./client";
import { ApiEnvelope } from "@/types";
import { PartnerApplication, PartnerStorageLocation, Payout } from "./partner";

export type { PartnerApplication, PartnerStorageLocation, Payout };

export interface AdminDashboard {
  totalUsers: number;
  totalCustomers: number;
  totalPartners: number;
  activeStorageLocations: number;
  totalBookings: number;
  grossBookingValue: number;
  platformRevenue: number;
  totalPartnerEarnings: number;
  partnerPayoutsSettled: number;
  totalTransactions: number;
  pendingApprovals: number;
  pendingPartners: number;
  pendingStorage: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  partnerConversionRate: number;
  openReports: number;
}

export async function getDashboard(): Promise<AdminDashboard> {
  const res = await api.get<ApiEnvelope<AdminDashboard>>("/admin/dashboard");
  return res.data.data;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await api.get<ApiEnvelope<{ users: AdminUser[] }>>("/admin/users");
  return res.data.data.users;
}

export interface AdminPartner {
  id: string;
  businessName: string;
  businessType?: string | null;
  approved: boolean;
  user: { id: string; name: string; email: string; phone?: string | null };
  storageLocations: { id: string; name: string; status: string }[];
}

export async function listPartners(): Promise<AdminPartner[]> {
  const res = await api.get<ApiEnvelope<{ partners: AdminPartner[] }>>("/admin/partners");
  return res.data.data.partners;
}

export async function suspendPartner(id: string) {
  await api.patch(`/admin/partners/${id}/suspend`);
}

export async function reinstatePartner(id: string) {
  await api.patch(`/admin/partners/${id}/reinstate`);
}

export async function createPayoutForPartner(id: string, note?: string): Promise<Payout> {
  const res = await api.post<ApiEnvelope<{ payout: Payout }>>(`/admin/partners/${id}/payouts`, { note });
  return res.data.data.payout;
}

export async function listStorageLocations(status?: string): Promise<PartnerStorageLocation[]> {
  const res = await api.get<ApiEnvelope<{ locations: PartnerStorageLocation[] }>>("/admin/storage", {
    params: { status },
  });
  return res.data.data.locations;
}

export async function approveStorage(id: string) {
  await api.patch(`/admin/storage/${id}/approve`);
}

export async function rejectStorage(id: string) {
  await api.patch(`/admin/storage/${id}/reject`);
}

export async function listApplications(status?: string): Promise<PartnerApplication[]> {
  const res = await api.get<ApiEnvelope<{ applications: PartnerApplication[] }>>("/admin/applications", {
    params: { status },
  });
  return res.data.data.applications;
}

export async function getApplicationById(id: string): Promise<PartnerApplication> {
  const res = await api.get<ApiEnvelope<{ application: PartnerApplication }>>(`/admin/applications/${id}`);
  return res.data.data.application;
}

export async function approveApplication(id: string) {
  await api.patch(`/admin/applications/${id}/approve`);
}

export async function rejectApplication(id: string, rejectionReason: string) {
  await api.patch(`/admin/applications/${id}/reject`, { rejectionReason });
}

export async function requestApplicationChanges(id: string, adminNote: string) {
  await api.patch(`/admin/applications/${id}/request-changes`, { adminNote });
}

export interface AdminBooking {
  id: string;
  bookingCode: string;
  status: string;
  totalAmount: number;
  dropoffAt: string;
  pickupAt: string;
  createdAt: string;
  customer: { name: string; email: string };
  storageLocation: { name: string; city: string };
}

export async function listBookings(): Promise<AdminBooking[]> {
  const res = await api.get<ApiEnvelope<{ bookings: AdminBooking[] }>>("/admin/bookings");
  return res.data.data.bookings;
}

export interface AdminPayment {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  amount: number;
  status: string;
  createdAt: string;
  booking: { bookingCode: string };
}

export async function listPayments(): Promise<AdminPayment[]> {
  const res = await api.get<ApiEnvelope<{ payments: AdminPayment[] }>>("/admin/payments");
  return res.data.data.payments;
}

export interface AdminReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  customer: { name: string };
  storageLocation: { name: string };
}

export async function listReviews(): Promise<AdminReview[]> {
  const res = await api.get<ApiEnvelope<{ reviews: AdminReview[] }>>("/admin/reviews");
  return res.data.data.reviews;
}

export interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  reporter: { name: string; email: string };
}

export async function listReports(status?: string): Promise<AdminReport[]> {
  const res = await api.get<ApiEnvelope<{ reports: AdminReport[] }>>("/admin/reports", { params: { status } });
  return res.data.data.reports;
}

export async function resolveReport(id: string, status: "RESOLVED" | "DISMISSED", adminNote?: string) {
  await api.patch(`/admin/reports/${id}`, { status, adminNote });
}

export async function listPayouts(status?: string): Promise<Payout[]> {
  const res = await api.get<ApiEnvelope<{ payouts: Payout[] }>>("/admin/payouts", { params: { status } });
  return res.data.data.payouts;
}

export async function markPayoutPaid(id: string): Promise<Payout> {
  const res = await api.patch<ApiEnvelope<{ payout: Payout }>>(`/admin/payouts/${id}/mark-paid`);
  return res.data.data.payout;
}

export async function getCommission(): Promise<{ commissionPercent: number; updatedAt: string }> {
  const res = await api.get<ApiEnvelope<{ commissionPercent: number; updatedAt: string }>>(
    "/admin/settings/commission"
  );
  return res.data.data;
}

export async function setCommission(commissionPercent: number) {
  const res = await api.patch<ApiEnvelope<{ commissionPercent: number; updatedAt: string }>>(
    "/admin/settings/commission",
    { commissionPercent }
  );
  return res.data.data;
}

export interface PartnerFunnel {
  pageViews: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  applicationsApproved: number;
  partnersReceivingBookings: number;
  conversionRate: number;
}

export async function getPartnerFunnel(): Promise<PartnerFunnel> {
  const res = await api.get<ApiEnvelope<{ funnel: PartnerFunnel }>>("/admin/analytics/partner-funnel");
  return res.data.data.funnel;
}
