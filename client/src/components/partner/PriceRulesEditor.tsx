import { LuggageType, PriceRule } from "@/types";

const TYPES: { value: LuggageType; label: string }[] = [
  { value: "BACKPACK", label: "Backpack" },
  { value: "SMALL_SUITCASE", label: "Small suitcase" },
  { value: "LARGE_SUITCASE", label: "Large suitcase" },
  { value: "OTHER", label: "Other" },
];

export function PriceRulesEditor({ rules, onChange }: { rules: PriceRule[]; onChange: (next: PriceRule[]) => void }) {
  function setPrice(luggageType: LuggageType, pricePerHour: number) {
    const existing = rules.find((r) => r.luggageType === luggageType);
    const next = existing
      ? rules.map((r) => (r.luggageType === luggageType ? { ...r, pricePerHour } : r))
      : [...rules, { luggageType, pricePerHour }];
    onChange(next.filter((r) => r.pricePerHour > 0));
  }

  return (
    <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
      {TYPES.map((t) => {
        const rule = rules.find((r) => r.luggageType === t.value);
        return (
          <div key={t.value} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-ink-700">{t.label}</span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-ink-400">₹</span>
              <input
                type="number"
                min={0}
                step={1}
                value={rule?.pricePerHour ?? ""}
                onChange={(e) => setPrice(t.value, Number(e.target.value))}
                placeholder="0"
                className="w-20 rounded-lg border border-ink-200 px-2 py-1"
              />
              <span className="text-ink-400">/hr</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
