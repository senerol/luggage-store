import { Minus, Plus } from "lucide-react";
import { LuggageType, PriceRule } from "@/types";
import { formatCurrency, luggageLabel } from "@/utils/format";

export type LuggageCounts = Partial<Record<LuggageType, number>>;

export function LuggageSelector({
  priceRules,
  counts,
  onChange,
}: {
  priceRules: PriceRule[];
  counts: LuggageCounts;
  onChange: (next: LuggageCounts) => void;
}) {
  function setCount(type: LuggageType, value: number) {
    onChange({ ...counts, [type]: Math.max(0, value) });
  }

  return (
    <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
      {priceRules.map((rule) => {
        const count = counts[rule.luggageType] ?? 0;
        return (
          <div key={rule.luggageType} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-ink-800">{luggageLabel(rule.luggageType)}</p>
              <p className="text-xs text-ink-400">{formatCurrency(rule.pricePerHour)}/hr per bag</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCount(rule.luggageType, count - 1)}
                disabled={count === 0}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-600 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center font-semibold text-ink-900">{count}</span>
              <button
                type="button"
                onClick={() => setCount(rule.luggageType, count + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-600 hover:bg-ink-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
