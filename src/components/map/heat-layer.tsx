"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { HEATMAP_OPTIONS, type HeatPoint } from "@/lib/heatmap";

let pluginLoad: Promise<void> | null = null;

/** leaflet.heat is a classic plugin that attaches itself to the global `L`. */
function loadHeatPlugin() {
  pluginLoad ??= (async () => {
    (window as unknown as { L: typeof L }).L = L;
    await import("leaflet.heat");
  })();
  return pluginLoad;
}

/**
 * Story-density overlay. The layer is created once per map and its points are
 * replaced in place when the (filtered) story set changes.
 */
export function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
    layerRef.current?.setLatLngs(points);
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    loadHeatPlugin()
      .then(() => {
        if (cancelled) return;
        layerRef.current = L.heatLayer(pointsRef.current, HEATMAP_OPTIONS).addTo(map);
      })
      .catch((error: unknown) => {
        // The heatmap is optional: pins and the story list keep working.
        console.warn("Heatmap layer unavailable:", error);
      });
    return () => {
      cancelled = true;
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [map]);

  return null;
}
