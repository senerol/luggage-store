import { LuggageType, PriceRule } from "@/types";
import { LuggageCounts } from "@/components/booking/LuggageSelector";

const SERVICE_FEE_PERCENT = 10; // mirrors the backend's default; the real, authoritative
// total always comes back from POST /api/bookings - this is a client-side preview only.

export function billableHoursPreview(dropoffAt: Date, pickupAt: Date): number {
  const ms = pickupAt.getTime() - dropoffAt.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
}

export function previewPrice(priceRules: PriceRule[], counts: LuggageCounts, dropoffAt: Date, pickupAt: Date) {
  const hours = billableHoursPreview(dropoffAt, pickupAt);
  const rateByType = new Map(priceRules.map((r) => [r.luggageType, r.pricePerHour]));

  const items = (Object.entries(counts) as [LuggageType, number][])
    .filter(([, qty]) => qty > 0)
    .map(([luggageType, quantity]) => {
      const rate = rateByType.get(luggageType) ?? 0;
      const subtotal = Math.round(rate * hours * quantity * 100) / 100;
      return { luggageType, quantity, subtotal };
    });

  const baseAmount = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;
  const serviceFee = Math.round(((baseAmount * SERVICE_FEE_PERCENT) / 100) * 100) / 100;
  const totalAmount = Math.round((baseAmount + serviceFee) * 100) / 100;
  const totalBags = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return { hours, items, baseAmount, serviceFee, totalAmount, totalBags };
}
