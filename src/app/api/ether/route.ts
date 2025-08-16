import type { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CELL_SIZE_DEG = 0.2;
const q = (v: number, s: number) => Math.round(v / s) * s;

// Typed global store so we don't use `any`
declare global {
  // eslint-disable-next-line no-var
  var __ether: Map<string, number> | undefined;
}

/** Safely extract a `cell` string from unknown JSON */
function extractCell(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const val = (body as Record<string, unknown>).cell;
  return typeof val === "string" ? val : null;
}

export async function POST(req: NextRequest) {
  let cell: string | null = null;

  // 1) Try client-provided coarse cell (optional)
  try {
    const bodyUnknown = await req.json().catch(() => null);
    const candidate = extractCell(bodyUnknown);
    if (candidate && candidate.length < 32) cell = candidate;
  } catch {
    // ignore parse errors
  }

  // 2) Fallback to Vercel geo headers
  if (!cell) {
    const lat = Number(req.headers.get("x-vercel-ip-latitude"));
    const lon = Number(req.headers.get("x-vercel-ip-longitude"));

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      cell = `${q(lat, CELL_SIZE_DEG).toFixed(1)},${q(lon, CELL_SIZE_DEG).toFixed(1)}`;
    } else {
      // 3) Very coarse fallback using country/city hints
      const country = (req.headers.get("x-vercel-ip-country") || "").toLowerCase();
      const city = (req.headers.get("x-vercel-ip-city") || "").toLowerCase();

      const centroids: Record<string, [number, number]> = {
        gb: [51.5, -0.13], // London-ish
        us: [39.8, -98.6],
        in: [22.3, 79.0],
        de: [51.2, 10.4],
        fr: [46.2, 2.2],
        es: [40.2, -3.7],
        it: [41.9, 12.6],
      };
      const cityHints: Record<string, [number, number]> = {
        london: [51.5, -0.13],
        manchester: [53.5, -2.2],
        edinburgh: [55.95, -3.2],
      };

      const c = cityHints[city] ?? centroids[country];
      if (c) {
        cell = `${q(c[0], CELL_SIZE_DEG).toFixed(1)},${q(c[1], CELL_SIZE_DEG).toFixed(1)}`;
      }
    }
  }

  // 4) Persist to a typed in-memory store (demo only)
  const store: Map<string, number> = (globalThis.__ether ??= new Map<string, number>());
  if (cell) store.set(cell, (store.get(cell) ?? 0) + 1);

  return new Response(null, { status: 204 });
}

export async function GET() {
  const store: Map<string, number> = globalThis.__ether ?? new Map<string, number>();
  const data = Array.from(store.entries()).map(([cell, count]) => ({ cell, count }));
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
