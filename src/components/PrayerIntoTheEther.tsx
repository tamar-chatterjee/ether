"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";


// Allow Safari’s legacy webkitAudioContext without using `any`
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}



const SEND_TO_SERVER = true; // set false if you want zero network requests

// Coarse geo cell (~20–30 km)
const CELL_SIZE_DEG = 0.2;
const isRTL = (t: string) => /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test((t || "").replace(/\s+/g, ""));
const quantize = (v: number, step: number) => Math.round(v / step) * step;
const toCell = (lat: number, lon: number) =>
  `${quantize(lat, CELL_SIZE_DEG).toFixed(1)},${quantize(lon, CELL_SIZE_DEG).toFixed(1)}`;

export default function PrayerIntoTheEther() {
  const [value, setValue] = useState("");
  const [dir, setDir] = useState<"auto" | "ltr" | "rtl">("auto");
  const [status, setStatus] = useState("");
  const [releasedText, setReleasedText] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [consent, setConsent] = useState(true);
  const [consentGeo, setConsentGeo] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setDir(isRTL(value) ? "rtl" : "ltr"), [value]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return setStatus("Please acknowledge the notice.");
    const text = value.trim();
    if (!text || cooldown) return;

    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);

    setReleasedText(text);
    setValue("");
    areaRef.current?.focus();

    let cell: string | null = null;
    if (consentGeo && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, maximumAge: 60_000, timeout: 4000,
          })
        );
        const { latitude, longitude } = pos.coords;
        cell = toCell(latitude, longitude);
      } catch { cell = null; }
    }

    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (typeof Ctx === "function") {
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 528;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        const now = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.00001, now + 1.6);
        o.stop(now + 1.7);
      }
    } catch {
      // ignore
    }
    

    setStatus("Releasing…");

    if (SEND_TO_SERVER) {
      try {
        await fetch("/api/ether", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cell, at: new Date().toISOString() }),
        });
        setStatus("Released. Nothing was stored.");
      } catch {
        setStatus("Released locally. (Network unavailable.)");
      }
    } else {
      await new Promise((r) => setTimeout(r, 1400));
      setStatus("Released. Nothing was stored.");
    }

    setTimeout(() => setStatus(""), 3000);
    setTimeout(() => setReleasedText(""), 2200);
  }

  const releaseGhost = useMemo(() => {
    if (!releasedText) return null;
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="max-w-2xl w-full px-4">
          <p
            className="text-center text-lg sm:text-xl leading-8 tracking-wide select-none [text-wrap:balance] animate-ether"
            dir={isRTL(releasedText) ? "rtl" : "ltr"}
          >
            {releasedText.split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 8}ms` }} className="inline-block animate-float">
                {ch === "\n" ? "\u00A0" : ch}
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  }, [releasedText]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <header className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight">Into the Ether</h1>
          <p className="mt-3 text-sm text-neutral-300">
            A quiet place to release what matters. Any language. No accounts. No trail.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <textarea
            id="prayer" ref={areaRef} dir={dir} value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Write in your language…" rows={8}
            className="w-full rounded-2xl bg-neutral-900/70 backdrop-blur p-4 ring-1 ring-neutral-800 focus:ring-2 focus:ring-indigo-400 outline-none placeholder:text-neutral-500"
            maxLength={2000} autoFocus
          />

          <div className="flex items-start gap-3 text-sm">
            <input
              id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-400"
            />
            <label htmlFor="consent" className="text-neutral-300">
              I understand this is a one-way release. My words are not stored or displayed.
            </label>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <input
              id="consentGeo" type="checkbox" checked={consentGeo} onChange={(e) => setConsentGeo(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900"
            />
            <label htmlFor="consentGeo" className="text-neutral-300">
              Share a <span className="underline decoration-dotted">very rough</span> location (≈20–30 km) to help build an anonymous heatmap.
            </label>
          </div>

          <button
            type="submit" disabled={!value.trim() || !consent || cooldown}
            className="rounded-2xl px-5 py-2 text-sm font-medium bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50"
          >
            Send into the ether
          </button>

          {status && <div className="text-center text-neutral-300 text-sm mt-2">{status}</div>}
        </form>
      </main>

      {releaseGhost}

      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1;} 60% { opacity: .5; } 100% { transform: translateY(-40px) scale(1.02); opacity: 0;} }
        .animate-float { animation: floatUp 1.8s ease-in forwards; }
        @keyframes ether { 0% { opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { opacity: 0 } }
        .animate-ether { animation: ether 2.1s ease-out forwards; }
      `}</style>
    </div>
  );
}
