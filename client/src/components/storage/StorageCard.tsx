import { Link } from "react-router-dom";
import { Star, MapPin, Clock } from "lucide-react";
import { StorageLocationSummary } from "@/types";
import { formatCurrency } from "@/utils/format";

export function StorageCard({ location }: { location: StorageLocationSummary }) {
  const photo = location.photos[0];

  return (
    <Link
      to={`/storage/${location.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-lg"
    >
      <div className="relative h-40 w-full overflow-hidden bg-ink-100">
        {photo ? (
          <img
            src={photo}
            alt={location.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">No photo</div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-semibold ${
            location.isOpenNow ? "bg-brand-600 text-white" : "bg-ink-700 text-white"
          }`}
        >
          {location.isOpenNow ? "Open now" : "Closed"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-900 line-clamp-1">{location.name}</h3>
          {location.rating !== null && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {location.rating.toFixed(1)}
              <span className="text-ink-400">({location.reviewCount})</span>
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-sm text-ink-500 line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {location.address}
          {location.distanceKm !== null && (
            <span className="ml-1 shrink-0 font-medium text-ink-600">· {location.distanceKm} km</span>
          )}
        </p>

        <p className="flex items-center gap-1 text-xs text-ink-400">
          <Clock className="h-3.5 w-3.5" />
          {location.availableCapacity} / {location.capacityTotal} bags available
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            {location.priceFrom !== null ? (
              <p className="text-sm text-ink-500">
                From <span className="font-semibold text-ink-900">{formatCurrency(location.priceFrom)}</span>/hr
              </p>
            ) : (
              <p className="text-sm text-ink-400">Pricing unavailable</p>
            )}
          </div>
          <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-brand-700">
            Book
          </span>
        </div>
      </div>
    </Link>
  );
}
