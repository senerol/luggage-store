import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { List, MapIcon, SearchX } from "lucide-react";
import clsx from "clsx";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterPanel } from "@/components/search/FilterPanel";
import { MapView } from "@/components/map/MapView";
import { StorageCard } from "@/components/storage/StorageCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { EmptyState } from "@/components/common/EmptyState";
import { searchStorage, SearchParams } from "@/api/storage";
import { StorageLocationSummary } from "@/types";
import { extractErrorMessage } from "@/api/client";

export default function SearchPage() {
  const [urlParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchParams>(() => ({
    lat: urlParams.get("lat") ? Number(urlParams.get("lat")) : undefined,
    lng: urlParams.get("lng") ? Number(urlParams.get("lng")) : undefined,
    search: urlParams.get("search") ?? undefined,
    sort: urlParams.get("lat") ? "distance" : "rating",
  }));

  const [results, setResults] = useState<StorageLocationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  useEffect(() => {
    setResults(null);
    setError(null);
    searchStorage(filters)
      .then(setResults)
      .catch((err) => setError(extractErrorMessage(err)));
  }, [filters]);

  const center: [number, number] | undefined =
    filters.lat && filters.lng ? [filters.lat, filters.lng] : results?.[0] ? [results[0].latitude, results[0].longitude] : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SearchBar className="mb-6" />

      <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
        <p className="text-sm text-ink-500">{results ? `${results.length} results` : "Searching…"}</p>
        <div className="flex rounded-lg border border-ink-200 p-0.5">
          <button
            onClick={() => setMobileView("list")}
            className={clsx("flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium", mobileView === "list" ? "bg-brand-600 text-white" : "text-ink-600")}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setMobileView("map")}
            className={clsx("flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium", mobileView === "map" ? "bg-brand-600 text-white" : "text-ink-600")}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_1fr]">
        <div className="hidden lg:block">
          <FilterPanel filters={filters} onChange={setFilters} />
        </div>

        <div className={clsx(mobileView === "map" && "hidden", "lg:block")}>
          {error && <ErrorMessage message={error} onRetry={() => setFilters({ ...filters })} />}
          {!results && !error && <LoadingSpinner label="Finding storage near you…" />}
          {results && results.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No storage found"
              description="Try widening your distance filter or searching a different area."
            />
          )}
          {results && results.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {results.map((loc) => (
                <div
                  key={loc.id}
                  onMouseEnter={() => setSelectedId(loc.id)}
                  className={clsx("rounded-xl", selectedId === loc.id && "ring-2 ring-brand-400")}
                >
                  <StorageCard location={loc} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={clsx("h-[70vh] overflow-hidden rounded-xl border border-ink-100 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]", mobileView === "list" && "hidden lg:block")}>
          <MapView locations={results ?? []} selectedId={selectedId} onSelect={setSelectedId} center={center} />
        </div>
      </div>
    </div>
  );
}
