export const runtime = "edge";

const store = new Map<string, number>();
const CELL_SIZE_DEG = 0.2;
const q = (v: number, s: number) => Math.round(v / s) * s;

export async function POST(req: Request) {
  let cell: string | null = null;

  // 1) Try client-sent coarse cell (if you keep that)
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.cell === "string" && body.cell.length < 32) {
      cell = body.cell;
    }
  } catch {}

  // 2) If not provided, use Vercel geo headers
  if (!cell) {
    const lat = Number(req.headers.get("x-vercel-ip-latitude"));
    const lon = Number(req.headers.get("x-vercel-ip-longitude"));
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      cell = `${q(lat, CELL_SIZE_DEG).toFixed(1)},${q(lon, CELL_SIZE_DEG).toFixed(1)}`;
    } else {
      // Last-resort: country centroid (very coarse)
      const country = req.headers.get("x-vercel-ip-country") || "??";
      // Minimal centroids for a few common cases (add more as needed)
      const centroids: Record<string, [number, number]> = {
        GB: [54.0, -2.0], US: [39.8, -98.6], IN: [22.3, 79.0], DE: [51.2, 10.4],
        FR: [46.2, 2.2],  ES: [40.2, -3.7],  IT: [41.9, 12.6],
      };
      const c = centroids[country];
      if (c) cell = `${q(c[0], CELL_SIZE_DEG).toFixed(1)},${q(c[1], CELL_SIZE_DEG).toFixed(1)}`;
    }
  }

  if (cell) store.set(cell, (store.get(cell) ?? 0) + 1);
  return new Response(null, { status: 204 });
}

export async function GET() {
  const data = Array.from(store.entries()).map(([cell, count]) => ({ cell, count }));
  return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
}
