import { OperatingHour } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OperatingHoursEditor({
  hours,
  onChange,
}: {
  hours: OperatingHour[];
  onChange: (next: OperatingHour[]) => void;
}) {
  function getDay(dayOfWeek: number) {
    return hours.find((h) => h.dayOfWeek === dayOfWeek);
  }

  function setDay(dayOfWeek: number, open: boolean, openTime = "09:00", closeTime = "21:00") {
    if (!open) {
      onChange(hours.filter((h) => h.dayOfWeek !== dayOfWeek));
      return;
    }
    const existing = getDay(dayOfWeek);
    const next = existing
      ? hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, openTime, closeTime } : h))
      : [...hours, { dayOfWeek, openTime, closeTime }];
    onChange(next);
  }

  return (
    <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
      {DAY_NAMES.map((name, i) => {
        const day = getDay(i);
        return (
          <div key={name} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                checked={!!day}
                onChange={(e) => setDay(i, e.target.checked, day?.openTime, day?.closeTime)}
                className="h-4 w-4 rounded accent-brand-600"
              />
              {name}
            </label>
            {day && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={day.openTime}
                  onChange={(e) => setDay(i, true, e.target.value, day.closeTime)}
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
                <span className="text-ink-400">to</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={(e) => setDay(i, true, day.openTime, e.target.value)}
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
              </div>
            )}
            {!day && <span className="text-sm text-ink-400">Closed</span>}
          </div>
        );
      })}
    </div>
  );
}
