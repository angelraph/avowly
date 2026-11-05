"use client";

import Link from "next/link";
import { useState } from "react";

/** Creates a judge demo listing and hands over both sides: the buyer page and the seller's view. */
export function DemoStart() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ listingId: string; sellerKey: string } | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start a demo");
      try {
        localStorage.setItem(`avowly:listing:${data.listingId}`, data.sellerKey);
      } catch {}
      setMade(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (made)
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-matched">✓ Your demo phone is listed and verified.</p>
        <Link href={`/l/${made.listingId}`} className="btn-primary py-4 text-base">
          1. Buy it as the buyer →
        </Link>
        <a href={`/l/${made.listingId}?k=${encodeURIComponent(made.sellerKey)}`} target="_blank" rel="noreferrer" className="btn-secondary">
          Open the seller&apos;s view in a new tab
        </a>
        <p className="text-xs text-ink-500">Keep the seller&apos;s view open beside the buyer&apos;s to watch the money move on both sides.</p>
      </div>
    );

  return (
    <div className="space-y-2">
      <button className="btn-primary py-4 text-base" disabled={busy} onClick={start}>
        {busy ? "Listing a demo phone…" : "Start a demo deal"}
      </button>
      {error && <p className="text-sm text-bad-600">{error}</p>}
    </div>
  );
}
