import { env } from "../config/env";

export interface PriceRuleLike {
  luggageType: string;
  pricePerHour: number;
}

export interface ItemInput {
  luggageType: string;
  quantity: number;
}

export interface PricedItem extends ItemInput {
  pricePerUnit: number; // for the full duration, per bag
  subtotal: number;
}

export interface PriceBreakdown {
  hours: number;
  items: PricedItem[];
  baseAmount: number;
  serviceFee: number;
  totalAmount: number;
}

// Billed in whole hours, rounded up, with a 1-hour minimum - matches how
// almost every hourly storage/parking product actually bills.
export function billableHours(dropoffAt: Date, pickupAt: Date): number {
  const ms = pickupAt.getTime() - dropoffAt.getTime();
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  return Math.max(1, hours);
}

export function calculatePrice(
  priceRules: PriceRuleLike[],
  items: ItemInput[],
  dropoffAt: Date,
  pickupAt: Date
): PriceBreakdown {
  const hours = billableHours(dropoffAt, pickupAt);
  const rulesByType = new Map(priceRules.map((r) => [r.luggageType, r.pricePerHour]));

  const pricedItems: PricedItem[] = items.map((item) => {
    const rate = rulesByType.get(item.luggageType);
    if (rate === undefined) {
      throw new Error(`No price rule for luggage type ${item.luggageType} at this location.`);
    }
    const pricePerUnit = round2(rate * hours);
    const subtotal = round2(pricePerUnit * item.quantity);
    return { ...item, pricePerUnit, subtotal };
  });

  const baseAmount = round2(pricedItems.reduce((sum, i) => sum + i.subtotal, 0));
  const serviceFee = round2((baseAmount * env.SERVICE_FEE_PERCENT) / 100);
  const totalAmount = round2(baseAmount + serviceFee);

  return { hours, items: pricedItems, baseAmount, serviceFee, totalAmount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CommissionSplit {
  platformCommissionPercent: number;
  platformCommissionAmount: number;
  partnerEarningsAmount: number;
}

/**
 * Splits the total amount a customer pays into what the partner keeps and
 * what Luggo takes as commission. This is a separate concept from
 * `serviceFee` above: serviceFee is an extra line item shown to the customer
 * at checkout ("Platform fee"), while this commission is Luggo's cut of the
 * total collected amount, taken out of what would otherwise be paid to the
 * partner ("Platform commission"). Both exist simultaneously per the product
 * spec; a real production system would likely tune one of them toward zero,
 * but keeping them separate and explicit here makes each individually
 * auditable in the booking record.
 */
export function splitCommission(totalAmount: number, commissionPercent: number): CommissionSplit {
  const platformCommissionAmount = round2((totalAmount * commissionPercent) / 100);
  const partnerEarningsAmount = round2(totalAmount - platformCommissionAmount);
  return { platformCommissionPercent: commissionPercent, platformCommissionAmount, partnerEarningsAmount };
}
