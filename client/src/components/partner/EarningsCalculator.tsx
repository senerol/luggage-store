import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export function EarningsCalculator() {
  const [bagsPerDay, setBagsPerDay] = useState(10);
  const [pricePerBag, setPricePerBag] = useState(50);

  const dailyGross = useMemo(() => bagsPerDay * pricePerBag, [bagsPerDay, pricePerBag]);
  const monthlyGross = dailyGross * 30;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2 text-brand-700">
        <Calculator className="h-5 w-5" />
        <h3 className="font-semibold">Earnings calculator</h3>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Bags stored per day</span>
          <input
            type="range"
            min={1}
            max={50}
            value={bagsPerDay}
            onChange={(e) => setBagsPerDay(Number(e.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <span className="mt-1 block text-sm text-ink-500">{bagsPerDay} bags/day</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-700">Average price per bag</span>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={pricePerBag}
            onChange={(e) => setPricePerBag(Number(e.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <span className="mt-1 block text-sm text-ink-500">{formatCurrency(pricePerBag)}/bag</span>
        </label>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl bg-brand-50 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-ink-600">Estimated daily gross</p>
          <p className="text-2xl font-bold text-brand-800">{formatCurrency(dailyGross)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-600">Estimated monthly gross</p>
          <p className="text-2xl font-bold text-brand-800">{formatCurrency(monthlyGross)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400">
        This is an estimate only, not a guarantee of income. Your actual earnings depend on demand at your location,
        the number of bags stored, and Luggo's platform commission, which is deducted from the total shown here.
      </p>
    </div>
  );
}
