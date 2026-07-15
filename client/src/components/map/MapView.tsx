import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { StorageLocationSummary } from "@/types";
import { formatCurrency } from "@/utils/format";

// Leaflet's default marker icons reference image files that Vite doesn't
// bundle automatically; rebuild them from CDN-hosted assets so pins render.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -44],
  shadowSize: [52, 52],
  className: "hue-rotate-90",
});

// The searched place / "use my location" point - visually distinct (color
// shift + slightly larger) from storage pins so it reads as "what you
// searched for", not another result.
const referenceIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -42],
  shadowSize: [49, 49],
  className: "hue-rotate-180 saturate-200",
});

export interface ReferenceMarker {
  label: string;
  latitude: number;
  longitude: number;
}

function FitBounds({ locations, reference }: { locations: StorageLocationSummary[]; reference?: ReferenceMarker | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = locations.map((l) => [l.latitude, l.longitude]);
    if (reference) points.push([reference.latitude, reference.longitude]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [locations, reference, map]);
  return null;
}

export function MapView({
  locations,
  selectedId,
  onSelect,
  center,
  referenceMarker,
}: {
  locations: StorageLocationSummary[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center?: [number, number];
  /** The searched place or "use my location" point, shown distinctly from storage pins. */
  referenceMarker?: ReferenceMarker | null;
}) {
  const navigate = useNavigate();
  const fallbackCenter = useMemo<[number, number]>(() => center ?? [28.6139, 77.209], [center]);

  return (
    <MapContainer center={fallbackCenter} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locations={locations} reference={referenceMarker} />
      {referenceMarker && (
        <Marker position={[referenceMarker.latitude, referenceMarker.longitude]} icon={referenceIcon}>
          <Popup>
            <p className="font-semibold">📍 {referenceMarker.label}</p>
            <p className="text-xs text-ink-500">Searched location</p>
          </Popup>
        </Marker>
      )}
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.latitude, loc.longitude]}
          icon={loc.id === selectedId ? selectedIcon : defaultIcon}
          eventHandlers={{ click: () => onSelect?.(loc.id) }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold">{loc.name}</p>
              {loc.priceFrom !== null && <p className="text-xs text-ink-500">From {formatCurrency(loc.priceFrom)}/hr</p>}
              <button
                onClick={() => navigate(`/storage/${loc.id}`)}
                className="mt-2 w-full rounded bg-brand-600 py-1 text-xs font-semibold text-white"
              >
                View details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
