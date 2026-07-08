export type Role = "CUSTOMER" | "PARTNER" | "ADMIN";

export type LuggageType = "BACKPACK" | "SMALL_SUITCASE" | "LARGE_SUITCASE" | "OTHER";

export type BusinessType = "HOTEL" | "HOSTEL" | "CAFE" | "SHOP" | "LUGGAGE_STORE" | "OTHER";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_STORAGE"
  | "READY_FOR_PICKUP"
  | "COLLECTED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "EXPIRED";

export type ApplicationStatus = "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type PayoutStatus = "PENDING" | "PAID";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  partnerProfile?: { id: string; businessName: string; approved: boolean } | null;
}

export interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface PriceRule {
  luggageType: LuggageType;
  pricePerHour: number;
}

export interface StorageLocationSummary {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  photos: string[];
  capacityTotal: number;
  availableCapacity: number;
  status: string;
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number;
  priceFrom: number | null;
  isOpenNow: boolean;
  operatingHours: OperatingHour[];
  priceRules: PriceRule[];
  partner: { id: string; businessName: string; approved: boolean };
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  customer: { name: string };
}

export interface LuggageItem {
  id: string;
  tagCode: string;
  status: "EXPECTED" | "CHECKED_IN" | "IN_STORAGE" | "COLLECTED";
}

export interface BookingItem {
  id: string;
  luggageType: LuggageType;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  luggageItems: LuggageItem[];
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  customer?: { name: string; phone?: string | null };
  storageLocationId: string;
  storageLocation: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  dropoffAt: string;
  pickupAt: string;
  status: BookingStatus;
  baseAmount: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
  platformCommissionPercent?: number;
  platformCommissionAmount?: number;
  partnerEarningsAmount?: number;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  items: BookingItem[];
  createdAt: string;
}

export interface PriceBreakdown {
  hours: number;
  items: { luggageType: LuggageType; quantity: number; pricePerUnit: number; subtotal: number }[];
  baseAmount: number;
  serviceFee: number;
  totalAmount: number;
}

export interface AvailabilityResult {
  storageLocationId: string;
  capacityTotal: number;
  availableCapacity: number;
  requestedBags: number;
  sufficientCapacity: boolean;
  withinOperatingHours: boolean;
  canBook: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}
