"use client";

import { Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useState } from "react";
import { StateMessage } from "@/components/ui/state-message";
import type { LatLng, MapPoint } from "@/lib/map";

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

export function ExploreMap({ points }: { points: MapPoint[] }) {
  const [selected, setSelected] = useState<LatLng | null>(null);

  return (
    <div>
      <div className="h-72 overflow-hidden rounded-lg border border-line bg-surface sm:h-96">
        <MapErrorBoundary>
          <StoryMap
            points={points}
            selectedLocation={selected}
            onLocationSelect={setSelected}
          />
        </MapErrorBoundary>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Pins mark demo example locations, not real community submissions.
      </p>

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
          <p>
            Click the map to pick a location. It isn&apos;t saved — it will
            be used when sharing an experience.
          </p>
        )}
      </div>
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
