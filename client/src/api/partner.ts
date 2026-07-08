import { api } from "./client";
import { ApiEnvelope, Booking, BusinessType, LuggageType, OperatingHour, PriceRule } from "@/types";

export interface PartnerDashboard {
  locationsCount: number;
  totalCapacity: number;
  todayBookings: number;
  currentlyStored: number;
  upcomingPickups: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalEarnings: number;
  pendingPayout: number;
  platformCommissionTaken: number;
}

export async function getDashboard(): Promise<PartnerDashboard> {
  const res = await api.get<ApiEnvelope<PartnerDashboard>>("/partner/dashboard");
  return res.data.data;
}

export interface PartnerRevenue {
  totalEarnings: number;
  platformCommissionTaken: number;
  pendingPayout: number;
  byLocation: { storageLocationId: string; name: string; totalEarnings: number; platformCommission: number; paidBookings: number }[];
}

export async function getRevenue(): Promise<PartnerRevenue> {
  const res = await api.get<ApiEnvelope<PartnerRevenue>>("/partner/revenue");
  return res.data.data;
}

export async function getPartnerBookings(params?: { status?: string; today?: boolean }): Promise<Booking[]> {
  const res = await api.get<ApiEnvelope<{ bookings: Booking[] }>>("/partner/bookings", { params });
  return res.data.data.bookings;
}

export interface PartnerStorageLocation {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  landmark?: string | null;
  safetyInfo?: string | null;
  photos: string[];
  capacityTotal: number;
  status: string;
  operatingHours: OperatingHour[];
  priceRules: PriceRule[];
}

export async function listMyStorage(): Promise<PartnerStorageLocation[]> {
  const res = await api.get<ApiEnvelope<{ locations: PartnerStorageLocation[] }>>("/partner/storage");
  return res.data.data.locations;
}

export async function getMyStorageById(id: string): Promise<PartnerStorageLocation> {
  const res = await api.get<ApiEnvelope<{ location: PartnerStorageLocation }>>(`/partner/storage/${id}`);
  return res.data.data.location;
}

export interface StorageInput {
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  capacityTotal: number;
  photos: string[];
  operatingHours: OperatingHour[];
  priceRules: PriceRule[];
}

export async function createStorage(input: StorageInput): Promise<PartnerStorageLocation> {
  const res = await api.post<ApiEnvelope<{ location: PartnerStorageLocation }>>("/partner/storage", input);
  return res.data.data.location;
}

export async function updateStorage(id: string, input: Partial<StorageInput>): Promise<PartnerStorageLocation> {
  const res = await api.patch<ApiEnvelope<{ location: PartnerStorageLocation }>>(`/partner/storage/${id}`, input);
  return res.data.data.location;
}

export async function setStorageDisabled(id: string, disabled: boolean): Promise<void> {
  await api.patch(`/partner/storage/${id}/disabled`, { disabled });
}

export interface PartnerApplication {
  id: string;
  businessName: string;
  businessType: BusinessType;
  description: string;
  status: string;
  rejectionReason?: string | null;
  adminNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  storageLocation: PartnerStorageLocation;
  user: { id: string; name: string; email: string; phone?: string | null };
}

export interface SubmitApplicationInput {
  businessName: string;
  businessType: BusinessType;
  description: string;
  storageLocation: {
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    landmark?: string;
    description: string;
    safetyInfo: string;
    capacityTotal: number;
    photos: string[];
    operatingHours: OperatingHour[];
    priceRules: { luggageType: LuggageType; pricePerHour: number }[];
  };
  agreedToTerms: true;
}

export async function submitApplication(input: SubmitApplicationInput): Promise<PartnerApplication> {
  const res = await api.post<ApiEnvelope<{ application: PartnerApplication }>>("/partner/applications", input);
  return res.data.data.application;
}

export async function listMyApplications(): Promise<PartnerApplication[]> {
  const res = await api.get<ApiEnvelope<{ applications: PartnerApplication[] }>>("/partner/applications");
  return res.data.data.applications;
}

export interface Payout {
  id: string;
  amount: number;
  status: string;
  note?: string | null;
  createdAt: string;
  paidAt?: string | null;
  bookings: { id: string; bookingCode: string }[];
}

export async function listMyPayouts(): Promise<Payout[]> {
  const res = await api.get<ApiEnvelope<{ payouts: Payout[] }>>("/partner/payouts");
  return res.data.data.payouts;
}
