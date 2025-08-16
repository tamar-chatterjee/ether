"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Convert "lat,lon" to numbers
function parseCell(cell: string) {
  const [lat, lon] = cell.split(",").map(parseFloat);
  return { lat, lon };
}

// Simple radius scaling for a heat-like look
function radiusFor(count: number) {
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
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const center = useMemo(() => ({ lat: 20, lon: 0 }), []);
  const mapCenter: LatLngExpression = [center.lat, center.lon];

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
          <MapContainer
            center={mapCenter}
            zoom={2}
            minZoom={2}
            maxZoom={10}
            worldCopyJump
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {data.map(({ cell, count }) => {
              const { lat, lon } = parseCell(cell);
              const r = radiusFor(count);
              return (
                <CircleMarker
                  key={cell}
                  center={[lat, lon]}
                  radius={r}
                  pathOptions={{
                    color: "rgba(99,102,241,0.55)",
                    fillColor: "rgba(99,102,241,0.35)",
                    fillOpacity: 0.6,
                    weight: 1,
                  }}
                >
                  <Tooltip direction="top" opacity={0.9}>
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
