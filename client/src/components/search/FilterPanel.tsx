import { LuggageType } from "@/types";
import { SearchParams } from "@/api/storage";

const LUGGAGE_OPTIONS: { value: LuggageType; label: string }[] = [
  { value: "BACKPACK", label: "Backpack" },
  { value: "SMALL_SUITCASE", label: "Small suitcase" },
  { value: "LARGE_SUITCASE", label: "Large suitcase" },
  { value: "OTHER", label: "Other" },
];

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: SearchParams;
  onChange: (next: SearchParams) => void;
}) {
  function set<K extends keyof SearchParams>(key: K, value: SearchParams[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-5 rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Sort by</p>
        <select
          value={filters.sort ?? "distance"}
          onChange={(e) => set("sort", e.target.value as SearchParams["sort"])}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        >
          <option value="distance">Distance</option>
          <option value="price">Price (low to high)</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Max distance ({filters.maxDistanceKm ?? 15} km)</p>
        <input
          type="range"
          min={1}
          max={30}
          value={filters.maxDistanceKm ?? 15}
          onChange={(e) => set("maxDistanceKm", Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">Min price</p>
          <input
            type="number"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(e) => set("minPrice", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="₹0"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">Max price</p>
          <input
            type="number"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(e) => set("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Any"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Minimum rating</p>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => set("minRating", r || undefined)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                (filters.minRating ?? 0) === r ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"
              }`}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Luggage type</p>
        <select
          value={filters.luggageType ?? ""}
          onChange={(e) => set("luggageType", (e.target.value || undefined) as LuggageType | undefined)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        >
          <option value="">Any type</option>
          {LUGGAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          checked={!!filters.openNow}
          onChange={(e) => set("openNow", e.target.checked || undefined)}
          className="h-4 w-4 rounded accent-brand-600"
        />
        Open now
      </label>
    </div>
  );
}
