"use client";

import "leaflet/dist/leaflet.css";
import {
  createLeafletContext,
  LeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { HeatLayer } from "@/components/map/heat-layer";
import { Badge } from "@/components/ui/badge";
import { showsHeat, showsPins, toHeatPoints, type MapLayers } from "@/lib/heatmap";
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
import { categoryEmoji, storyCategories, type StoryCategory } from "@/lib/stories";

/** Emoji pins by category, cached so hundreds of markers share a few icons. */
const pinIcons = new Map<string, L.DivIcon>();
function storyPinIcon(category: StoryCategory, highlighted: boolean) {
  const key = `${category}:${highlighted}`;
  let icon = pinIcons.get(key);
  if (!icon) {
    const size = highlighted ? 38 : 30;
    icon = L.divIcon({
      className: `map-pin map-pin--emoji${highlighted ? " map-pin--highlighted" : ""}`,
      html: `<span aria-hidden="true">${categoryEmoji[category]}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 2],
    });
    pinIcons.set(key, icon);
  }
  return icon;
}

const selectedPinIcon = L.divIcon({
  className: "map-pin map-pin--selected",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type StoryMapProps = {
  points: MapPoint[];
  /** Which story layers to draw (default: pins only). */
  layers?: MapLayers;
  /** Open the map fitted to the given points instead of the default view. */
  fitToPoints?: boolean;
  /** Open the map at this centre and zoom (ignored when fitToPoints is set). */
  initialView?: { center: LatLng; zoom: number };
  /** Point to draw emphasised (e.g. the story selected in a list). */
  highlightedPointId?: string | null;
  /** Pan to a point and open its popup; change `key` to repeat a request. */
  focusRequest?: { id: string; key: number } | null;
  /** Called when a story pin is clicked. */
  onPointSelect?: (id: string) => void;
  selectedLocation?: LatLng | null;
  /** When provided, clicking the map reports the clicked coordinates. */
  onLocationSelect?: (location: LatLng) => void;
};

export default function StoryMap({
  points,
  layers = "pins",
  fitToPoints = false,
  initialView,
  highlightedPointId,
  focusRequest,
  onPointSelect,
  selectedLocation,
  onLocationSelect,
}: StoryMapProps) {
  const markers = useRef(new Map<string, L.Marker>());
  const heatPoints = useMemo(() => toHeatPoints(points), [points]);
  const [initialBounds] = useState(() =>
    fitToPoints
      ? points.map((p): [number, number] => [p.latitude, p.longitude])
      : initialView
        ? [[initialView.center.latitude, initialView.center.longitude] as [number, number]]
        : [],
  );
  const [initialZoom] = useState(() => (fitToPoints ? undefined : initialView?.zoom));
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
      <LeafletMapRoot initialBounds={initialBounds} singlePointZoom={initialZoom}>
        <TileLayer
          url={tileConfig.url}
          attribution={OSM_ATTRIBUTION}
          maxZoom={MAX_ZOOM}
          eventHandlers={tileEvents}
        />
        <ResizeHandler />
        {onLocationSelect && <ClickToSelect onSelect={onLocationSelect} />}
        <FocusController request={focusRequest} markers={markers} />

        {showsHeat(layers) && <HeatLayer points={heatPoints} />}

        {showsPins(layers) && points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={storyPinIcon(point.category, point.id === highlightedPointId)}
            zIndexOffset={point.id === highlightedPointId ? 1000 : 0}
            title={point.title}
            alt={`Story location: ${point.title}`}
            eventHandlers={{ click: () => onPointSelect?.(point.id) }}
            ref={(marker) => {
              if (marker) markers.current.set(point.id, marker);
              else markers.current.delete(point.id);
            }}
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
                {point.href && (
                  <Link
                    href={point.href}
                    className="mt-1 text-sm font-medium text-accent hover:underline"
                  >
                    Read story
                  </Link>
                )}
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
function LeafletMapRoot({
  initialBounds,
  singlePointZoom = 12,
  children,
}: {
  /** Fitted once on creation; empty uses the default view. */
  initialBounds: [number, number][];
  /** Zoom used when initialBounds has a single point. */
  singlePointZoom?: number;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const map = L.map(node, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      worldCopyJump: true,
    });
    if (initialBounds.length > 1) {
      map.fitBounds(initialBounds, { padding: [32, 32], maxZoom: 12 });
    } else if (initialBounds.length === 1) {
      map.setView(initialBounds[0], singlePointZoom);
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    setContext(createLeafletContext(map));

    return () => {
      setContext(null);
      map.remove();
    };
  }, [initialBounds, singlePointZoom]);

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

function FocusController({
  request,
  markers,
}: {
  request: StoryMapProps["focusRequest"];
  markers: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!request) return;
    const marker = markers.current.get(request.id);
    if (!marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12), { duration: 0.6 });
    map.once("moveend", () => marker.openPopup());
  }, [map, markers, request]);

  return null;
}
