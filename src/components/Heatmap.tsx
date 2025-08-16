"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLngExpression } from "leaflet";
const c: LatLngExpression = [center.lat, center.lon];
// then pass center={c}


// add below your existing imports
import type { ComponentType } from "react";

// Create a TS-safe alias that accepts arbitrary props without `any`
const MapContainerAny = MapContainer as unknown as ComponentType<Record<string, unknown>>;


// Convert a "lat,lon" coarse cell string to numbers
function parseCell(cell: string) {
  const [lat, lon] = cell.split(",").map(parseFloat);
  return { lat, lon };
}

// Simple radius scaling (tweak to taste)
function radiusFor(count: number) {
  // Base 6px + log scale; cap for sanity
  return Math.min(30, 6 + Math.log2(Math.max(1, count)) * 6);
}

export default function Heatmap() {
  const [data, setData] = useState<{ cell: string; count: number }[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/ether", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (alive && Array.isArray(json?.data)) setData(json.data);
      } catch { /* ignore */ }
    }

    load();
    const id = setInterval(load, 10_000); // refresh every 10s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Default view: world
  const center = useMemo(() => ({ lat: 20, lon: 0 }), []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <header className="mb-4">
          <h1 className="text-2xl font-medium">Where the whispers gathered</h1>
          <p className="text-sm text-neutral-400">
            Coarse, anonymous cells only. No precise locations. No IPs. No text.
          </p>
        </header>

        <div className="h-[70vh] w-full overflow-hidden rounded-xl ring-1 ring-neutral-800">
          <MapContainerAny
              center={[center.lat, center.lon]}
              zoom={2}
              minZoom={2}
              maxZoom={10}
              worldCopyJump
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
            {/* OpenStreetMap tiles via Carto CDN (no key needed). Swap if desired. */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {data.map(({ cell, count }) => {
              const { lat, lon } = parseCell(cell);
              const r = radiusFor(count);
              // draw as soft circles; Leaflet color props accept CSS strings
              return (
                <CircleMarker
                  key={cell}
                  center={[lat, lon]}
                  radius={r}
                  pathOptions={{
                    color: "rgba(99,102,241,0.55)",      // stroke
                    fillColor: "rgba(99,102,241,0.35)",   // fill
                    fillOpacity: 0.6,
                    weight: 1,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -r]} opacity={0.9}>
                    <div className="text-xs">
                      Cell: <span className="font-mono">{cell}</span>
                      <br />
                      Count: <strong>{count}</strong>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
