import { useEffect, useMemo, useRef, useState } from "react";
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
import { searchStorage, SearchParams, SearchResponse } from "@/api/storage";
import { extractErrorMessage } from "@/api/client";

// Fields the FilterPanel actually controls. `search`/`lat`/`lng` come from
// the URL instead (see below) - that's the single source of truth for "what
// place is being searched", so a typed search always survives a refresh,
// direct link, or browser back/forward, and never goes stale while the user
// stays on this page (the previous version stored these in useState's lazy
// initializer, which only ran once on mount).
type PanelFilters = Omit<SearchParams, "search" | "lat" | "lng">;

function emptyStateContent(meta: SearchResponse["meta"] | null, searchText?: string) {
  if (!meta) {
    return { title: "No storage found", description: "Try widening your distance filter or searching a different area." };
  }
  switch (meta.mode) {
    case "UNRESOLVED":
      return {
        title: "We couldn't find this location",
        description: "Try a nearby landmark, area, or city.",
      };
    case "SEARCHED_LOCATION":
      return {
        title: `No storage found near ${meta.resolvedLocation?.label ?? "this location"}`,
        description: "Try another location or increase your search distance.",
      };
    case "USER_LOCATION":
      return {
        title: "No storage found near your location",
        description: "Try increasing your search distance.",
      };
    case "NAME_MATCH":
      return {
        title: searchText ? `No storage matches "${searchText}"` : "No storage found",
        description: "Try adjusting your filters.",
      };
    default:
      return { title: "No storage found", description: "Try widening your distance filter or searching a different area." };
  }
}

export default function SearchPage() {
  const [urlParams] = useSearchParams();

  const searchText = urlParams.get("search") ?? undefined;
  const lat = urlParams.get("lat") ? Number(urlParams.get("lat")) : undefined;
  const lng = urlParams.get("lng") ? Number(urlParams.get("lng")) : undefined;

  const [panelFilters, setPanelFilters] = useState<PanelFilters>(() => ({
    sort: urlParams.get("lat") ? "distance" : "rating",
  }));

  const filters = useMemo<SearchParams>(
    () => ({ ...panelFilters, search: searchText, lat, lng }),
    [panelFilters, searchText, lat, lng]
  );

  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const resultsRef = useRef<HTMLDivElement>(null);
  const previousLocationKey = useRef<string>("");

  useEffect(() => {
    setResponse(null);
    setError(null);
    searchStorage(filters)
      .then(setResponse)
      .catch((err) => setError(extractErrorMessage(err)));
  }, [filters]);

  // Scroll the results into view when the user submits a genuinely new place
  // search (typed text or "Use my location") - not on every filter tweak,
  // and not causing an awkward jump if the results are already on screen.
  useEffect(() => {
    const locationKey = `${searchText ?? ""}|${lat ?? ""}|${lng ?? ""}`;
    const isFirstRun = previousLocationKey.current === "";
    const changed = previousLocationKey.current !== locationKey;
    previousLocationKey.current = locationKey;

    if (!isFirstRun && changed && response) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchText, lat, lng, response]);

  function handlePanelChange(next: SearchParams) {
    const { search: _s, lat: _lat, lng: _lng, ...rest } = next;
    setPanelFilters(rest);
  }

  const results = response?.results ?? null;
  const meta = response?.meta ?? null;
  const referenceMarker = meta?.resolvedLocation ?? null;

  const center: [number, number] | undefined = referenceMarker
    ? [referenceMarker.latitude, referenceMarker.longitude]
    : results?.[0]
    ? [results[0].latitude, results[0].longitude]
    : undefined;

  const empty = emptyStateContent(meta, searchText);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SearchBar className="mb-4" defaultValue={searchText} />

      {referenceMarker && (
        <p className="mb-4 text-sm text-ink-500">
          Showing results near <span className="font-medium text-ink-800">{referenceMarker.label}</span>
          {meta?.mode === "USER_LOCATION" && " (your current location)"}
        </p>
      )}

      <div ref={resultsRef} className="mb-4 flex scroll-mt-20 items-center justify-between gap-3 md:hidden">
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
          <FilterPanel filters={filters} onChange={handlePanelChange} />
        </div>

        <div className={clsx(mobileView === "map" && "hidden", "lg:block")}>
          {error && <ErrorMessage message={error} onRetry={() => setPanelFilters({ ...panelFilters })} />}
          {!results && !error && <LoadingSpinner label="Finding storage near you…" />}
          {results && results.length === 0 && <EmptyState icon={SearchX} title={empty.title} description={empty.description} />}
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
          <MapView
            locations={results ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            center={center}
            referenceMarker={referenceMarker}
          />
        </div>
      </div>
    </div>
  );
}
