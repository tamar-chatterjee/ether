// Client-only wrapper to avoid SSR issues with Leaflet
"use client";
import dynamic from "next/dynamic";

const Heatmap = dynamic(() => import("@/components/Heatmap"), { ssr: false });

export default function MapPage() {
  return <Heatmap />;
}
