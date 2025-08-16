import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const wanted = [
    "x-vercel-ip-country",
    "x-vercel-ip-city",
    "x-vercel-ip-latitude",
    "x-vercel-ip-longitude",
    "x-vercel-ip-timezone",
  ] as const;

  const out: Record<string, string | null> = {};
  wanted.forEach((k) => (out[k] = req.headers.get(k)));
  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
