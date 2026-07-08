import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, Star, ShieldCheck, Clock, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { MapView } from "@/components/map/MapView";
import { getReviews, getStorageById } from "@/api/storage";
import { Review, StorageLocationSummary } from "@/types";
import { extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate, luggageLabel } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StorageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<StorageLocationSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLocation(null);
    setError(null);
    Promise.all([getStorageById(id), getReviews(id)])
      .then(([loc, revs]) => {
        setLocation(loc);
        setReviews(revs);
      })
      .catch((err) => setError(extractErrorMessage(err)));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorMessage message={error} /></div>;
  if (!location) return <LoadingSpinner className="min-h-[60vh]" label="Loading storage details…" />;

  function handleBook() {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/book/${id}` } } });
      return;
    }
    navigate(`/book/${id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Photo gallery */}
      <div className="mb-6 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        {(location.photos.length ? location.photos : [""]).slice(0, 5).map((photo, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-xl bg-ink-100 ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""} h-48 sm:h-full`}
          >
            {photo ? (
              <img src={photo} alt={location.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-300">No photo</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink-900">{location.name}</h1>
              {location.rating !== null && (
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-ink-100 px-2.5 py-1 text-sm font-semibold text-ink-800">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {location.rating.toFixed(1)}
                  <span className="font-normal text-ink-500">({location.reviewCount})</span>
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-ink-500">
              <MapPin className="h-4 w-4" />
              {location.address}
              {location.distanceKm !== null && <span> · {location.distanceKm} km away</span>}
            </p>
            <p className="mt-4 text-ink-600">{location.description}</p>
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-ink-900">Location</h2>
            <div className="h-64 overflow-hidden rounded-xl border border-ink-100">
              <MapView locations={[location]} center={[location.latitude, location.longitude]} />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-ink-900">
                <Clock className="h-4 w-4" /> Operating hours
              </h2>
              <ul className="space-y-1 text-sm text-ink-600">
                {DAY_NAMES.map((day, i) => {
                  const hours = location.operatingHours.find((h) => h.dayOfWeek === i);
                  return (
                    <li key={day} className="flex justify-between">
                      <span>{day}</span>
                      <span className={hours ? "" : "text-ink-400"}>
                        {hours ? `${hours.openTime} – ${hours.closeTime}` : "Closed"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-ink-900">
                <Package className="h-4 w-4" /> Accepted luggage
              </h2>
              <ul className="space-y-1 text-sm text-ink-600">
                {location.priceRules.map((rule) => (
                  <li key={rule.luggageType} className="flex justify-between">
                    <span>{luggageLabel(rule.luggageType)}</span>
                    <span className="font-medium text-ink-800">{formatCurrency(rule.pricePerHour)}/hr</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-brand-100 bg-brand-50 p-5">
            <h2 className="mb-1 flex items-center gap-1.5 font-semibold text-brand-800">
              <ShieldCheck className="h-4 w-4" /> Safety & security
            </h2>
            <p className="text-sm text-brand-800/80">
              Hosted by <span className="font-medium">{location.partner.businessName}</span>, a verified Luggo
              partner. Every listing is reviewed by our team before it goes live.
            </p>
          </div>

          <div>
            <h2 className="mb-4 font-semibold text-ink-900">Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-500">No reviews yet — be the first to store here and leave one.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-ink-800">{r.customer.name}</p>
                      <span className="flex items-center gap-1 text-sm text-ink-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {r.rating}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-ink-600">{r.comment}</p>}
                    <p className="mt-1 text-xs text-ink-400">{formatDate(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            {location.priceFrom !== null && (
              <p className="text-sm text-ink-500">
                From <span className="text-xl font-bold text-ink-900">{formatCurrency(location.priceFrom)}</span>/hour per bag
              </p>
            )}
            <p className="mt-2 text-sm text-ink-500">
              {location.availableCapacity} of {location.capacityTotal} bags available right now
            </p>
            <button
              onClick={handleBook}
              disabled={location.status !== "APPROVED"}
              className="mt-5 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Book Storage
            </button>
            <Link to="/search" className="mt-3 block text-center text-sm text-ink-500 hover:underline">
              ← Back to search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
