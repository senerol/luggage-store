import { formatCurrency, luggageLabel } from "@/utils/format";
import { LuggageType } from "@/types";

export interface BreakdownItem {
  luggageType: LuggageType;
  quantity: number;
  subtotal: number;
}

export function PriceBreakdownCard({
  hours,
  items,
  baseAmount,
  serviceFee,
  totalAmount,
  estimate = false,
}: {
  hours: number;
  items: BreakdownItem[];
  baseAmount: number;
  serviceFee: number;
  totalAmount: number;
  estimate?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      {estimate && <p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-600">Estimated price</p>}
      <ul className="space-y-1.5 text-sm text-ink-600">
        {items.map((item) => (
          <li key={item.luggageType} className="flex justify-between">
            <span>
              {item.quantity} × {luggageLabel(item.luggageType)} ({hours}h)
            </span>
            <span>{formatCurrency(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-sm">
        <div className="flex justify-between text-ink-600">
          <span>Base price</span>
          <span>{formatCurrency(baseAmount)}</span>
        </div>
        <div className="flex justify-between text-ink-600">
          <span>Service fee</span>
          <span>{formatCurrency(serviceFee)}</span>
        </div>
        <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold text-ink-900">
          <span>Total</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
