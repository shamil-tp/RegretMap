import { HEATMAP_LEGEND_CSS, mapLayerLabels, type MapLayers } from "@/lib/heatmap";

/** Pins / Heatmap / Both switch, built on native radio buttons. */
export function MapLayerToggle({
  value,
  onChange,
}: {
  value: MapLayers;
  onChange: (value: MapLayers) => void;
}) {
  return (
    <fieldset className="inline-flex rounded-md border border-line p-0.5 text-sm">
      <legend className="sr-only">Show on map</legend>
      {(Object.keys(mapLayerLabels) as MapLayers[]).map((option) => (
        <label
          key={option}
          className="cursor-pointer rounded px-3 py-1 text-ink-muted has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name="map-layers"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {mapLayerLabels[option]}
        </label>
      ))}
    </fieldset>
  );
}

/** Explains what heat means — and what it doesn't. */
export function HeatmapLegend() {
  return (
    <div className="text-xs text-ink-muted">
      <p className="font-medium text-ink">Story concentration</p>
      <div className="mt-1 flex items-center gap-2">
        <span>Fewer stories</span>
        <span
          aria-hidden
          className="h-2 w-24 rounded-full opacity-80"
          style={{ backgroundImage: HEATMAP_LEGEND_CSS }}
        />
        <span>More stories</span>
      </div>
      <p className="mt-1.5 max-w-sm">
        Warmer areas have more published stories — not more danger. Busy, popular
        places naturally collect more stories.
      </p>
    </div>
  );
}
