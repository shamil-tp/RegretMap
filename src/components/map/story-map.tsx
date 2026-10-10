"use client";

import "leaflet/dist/leaflet.css";
import {
  createLeafletContext,
  LeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  OSM_ATTRIBUTION,
  tileConfig,
  type LatLng,
  type MapPoint,
} from "@/lib/map";
import { storyCategories } from "@/lib/stories";

const storyPinIcon = L.divIcon({
  className: "map-pin",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const selectedPinIcon = L.divIcon({
  className: "map-pin map-pin--selected",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type StoryMapProps = {
  points: MapPoint[];
  selectedLocation?: LatLng | null;
  /** When provided, clicking the map reports the clicked coordinates. */
  onLocationSelect?: (location: LatLng) => void;
};

export default function StoryMap({
  points,
  selectedLocation,
  onLocationSelect,
}: StoryMapProps) {
  const [tileError, setTileError] = useState(false);
  const tileEvents = useMemo(
    () => ({
      tileerror: () => setTileError(true),
      tileload: () => setTileError(false),
    }),
    [],
  );

  return (
    <div className="relative isolate h-full w-full">
      <LeafletMapRoot>
        <TileLayer
          url={tileConfig.url}
          attribution={OSM_ATTRIBUTION}
          maxZoom={MAX_ZOOM}
          eventHandlers={tileEvents}
        />
        <ResizeHandler />
        {onLocationSelect && <ClickToSelect onSelect={onLocationSelect} />}

        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={storyPinIcon}
            title={point.title}
            alt={`Story location: ${point.title}`}
          >
            <Popup>
              <div className="flex flex-col gap-1.5 font-sans">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="accent">{storyCategories[point.category]}</Badge>
                  {point.isDemo && <Badge tone="demo">Demo example</Badge>}
                </div>
                <div className="text-sm font-semibold leading-snug text-ink">
                  {point.title}
                </div>
                <div className="text-xs text-ink-muted">{point.place}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {selectedLocation && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={selectedPinIcon}
            title="Selected location"
            alt="Selected location"
            interactive={false}
          />
        )}
      </LeafletMapRoot>

      {(tileError || tileConfig.isInvalid) && (
        <p
          role="status"
          className="absolute inset-x-3 top-3 z-[1000] rounded-md border border-line bg-canvas/95 px-3 py-2 text-sm text-ink-muted shadow-sm"
        >
          {tileError
            ? "Some map tiles couldn't load. Check your connection and try again."
            : "The configured map tile URL is invalid, so the default OpenStreetMap tiles are shown."}
        </p>
      )}
    </div>
  );
}

/**
 * Creates the Leaflet map in an effect and removes it in that effect's cleanup,
 * so Strict Mode re-runs and hidden/re-shown routes always get a fresh, single
 * map instance. (react-leaflet's MapContainer creates the map in a ref callback
 * but removes it in an effect cleanup, which leaves a dead map after a re-run.)
 */
function LeafletMapRoot({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const map = L.map(node, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      worldCopyJump: true,
    });
    setContext(createLeafletContext(map));

    return () => {
      setContext(null);
      map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Map of story locations. Drag to pan; use the plus and minus buttons or scroll to zoom. When focused, arrow keys pan and plus/minus keys zoom."
      className="h-full w-full"
    >
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}

/** Keeps Leaflet's size in sync when the container is resized or revealed. */
function ResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function ClickToSelect({
  onSelect,
}: {
  onSelect: (location: LatLng) => void;
}) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng.wrap();
      onSelect({ latitude: lat, longitude: lng });
    },
  });
  return null;
}
