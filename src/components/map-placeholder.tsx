import { Map as MapIcon } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div
      className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 text-center sm:h-80"
    >
      <MapIcon aria-hidden className="size-8 text-ink-muted" />
      <p className="mt-3 text-sm font-medium text-ink">
        Interactive map coming in the next phase
      </p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        Story locations will appear here once the map is connected.
      </p>
    </div>
  );
}
