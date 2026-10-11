"use client";

import { Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useState } from "react";
import type { StoryMapProps } from "@/components/map/story-map";
import { StateMessage } from "@/components/ui/state-message";
import type { LatLng } from "@/lib/map";

// Leaflet needs `window`, so the map is only ever loaded in the browser.
const StoryMap = dynamic(() => import("@/components/map/story-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-surface">
      <p role="status" className="text-sm text-ink-muted">
        Loading map…
      </p>
    </div>
  ),
});

type ExploreMapProps = Omit<StoryMapProps, "selectedLocation" | "onLocationSelect"> & {
  /** Let users click the map to pick a location (for the future story form). */
  enableLocationPicker?: boolean;
  /** Show the note that pins are demo examples. */
  showDemoNote?: boolean;
  /** Controlled picker: current location and change handler (optional). */
  location?: LatLng | null;
  onLocationChange?: (location: LatLng | null) => void;
  /** Text shown under the map before a location is picked. */
  pickerHint?: string;
};

export function ExploreMap({
  enableLocationPicker = false,
  showDemoNote = false,
  location,
  onLocationChange,
  pickerHint = "Click the map to see a location's coordinates. Nothing is saved here.",
  ...mapProps
}: ExploreMapProps) {
  const [internal, setInternal] = useState<LatLng | null>(null);
  const controlled = onLocationChange !== undefined;
  const selected = controlled ? (location ?? null) : internal;
  const setSelected = controlled ? onLocationChange : setInternal;

  return (
    <div>
      <div
        id="story-map"
        className="h-72 scroll-mt-6 overflow-hidden rounded-lg border-2 border-line bg-surface sm:h-96"
      >
        <MapErrorBoundary>
          <StoryMap
            {...mapProps}
            selectedLocation={enableLocationPicker ? selected : null}
            onLocationSelect={enableLocationPicker ? setSelected : undefined}
          />
        </MapErrorBoundary>
      </div>

      {showDemoNote && (
        <p className="mt-2 text-xs text-ink-muted">
          Demo pins mark example locations, not real community submissions.
        </p>
      )}

      {enableLocationPicker && (
        <div aria-live="polite" className="mt-3 text-sm text-ink-muted">
          {selected ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Selected location:{" "}
                <span className="font-mono text-ink">
                  {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded text-accent underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </p>
          ) : (
            <p>{pickerHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Keeps a map failure from taking down the rest of the page. */
class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center">
        <StateMessage
          icon={MapIcon}
          tone="error"
          title="The map couldn't be displayed"
          description="Stories are still available in the list."
        />
      </div>
    );
  }
}
