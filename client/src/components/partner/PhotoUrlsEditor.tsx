import { Plus, X } from "lucide-react";

export function PhotoUrlsEditor({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  function update(i: number, value: string) {
    const next = [...photos];
    next[i] = value;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {photos.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...photos, ""])}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
      >
        <Plus className="h-4 w-4" /> Add photo URL
      </button>
      <p className="text-xs text-ink-400">
        Paste image URLs (e.g. from an image host). At least one photo is required.
      </p>
    </div>
  );
}
