import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocateFixed, Search } from "lucide-react";
import toast from "react-hot-toast";

export function SearchBar({ className, defaultValue }: { className?: string; defaultValue?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [locating, setLocating] = useState(false);

  // Keep the input in sync when the page's own URL-driven search text
  // changes from outside this component (e.g. browser back/forward).
  useEffect(() => {
    setQuery(defaultValue ?? "");
  }, [defaultValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    navigate(`/search?${params.toString()}`);
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const params = new URLSearchParams({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        });
        navigate(`/search?${params.toString()}`);
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Try searching by address instead.");
      }
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-ink-100 sm:flex-row ${className ?? ""}`}
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5">
        <Search className="h-5 w-5 shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try 'Connaught Place, Delhi'"
          className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
      </div>
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating}
        className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        <LocateFixed className="h-4 w-4" />
        {locating ? "Locating…" : "Use my location"}
      </button>
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Search
      </button>
    </form>
  );
}
