"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEAL_STATUS, Status, type Tone } from "@/components/Status";
import { formatMoney } from "@/lib/money";

type Row = { href: string; title: string; cents: number; word: string; tone: Tone; kind: string };

const LISTING: Record<string, { word: string; tone: Tone }> = {
  draft: { word: "Not verified", tone: "muted" },
  verified: { word: "Live", tone: "matched" },
  reserved: { word: "Clasped", tone: "brass" },
  closed: { word: "Sold", tone: "ink" },
};

/**
 * Clasp has no accounts: your private links live on this device. This page gathers them so
 * nobody loses a deal because they closed a tab.
 */
export function MyDeals() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const entries: [string, string][] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          if (k.startsWith("clasp:listing:") || k.startsWith("clasp:deal:")) entries.push([k, localStorage.getItem(k) ?? ""]);
        }
      } catch {}
      const loaded = await Promise.all(
        entries.map(async ([k, key]): Promise<Row | null> => {
          const id = k.split(":")[2];
          const isDeal = k.startsWith("clasp:deal:");
          const res = await fetch(isDeal ? `/api/deals/${id}?k=${encodeURIComponent(key)}` : `/api/listings/${id}?k=${encodeURIComponent(key)}`).catch(() => null);
          if (!res?.ok) return null;
          const d = await res.json();
          if (isDeal) {
            if (d.deal.status === "awaiting_payment") return null;
            const s = DEAL_STATUS[d.deal.status] ?? { word: d.deal.status, tone: "muted" as Tone };
            return { href: `/d/${id}?k=${encodeURIComponent(key)}`, title: d.listing.title, cents: d.deal.authorizedCents, word: s.word, tone: s.tone, kind: d.listing.mode === "sale" ? "Buying" : "Renting" };
          }
          const s = LISTING[d.status] ?? { word: d.status, tone: "muted" as Tone };
          return { href: `/l/${id}?k=${encodeURIComponent(key)}`, title: d.title, cents: d.priceCents, word: s.word, tone: s.tone, kind: d.mode === "sale" ? "Selling" : "Renting out" };
        }),
      );
      setRows(loaded.filter((r): r is Row => !!r));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-10">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">My deals</h1>
      <p className="mt-2 text-ink-500">Your listings and deals on this device. Clasp has no accounts, so keep your private links safe.</p>
      {rows === null ? (
        <p className="mt-8 text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-line bg-card p-6 text-center">
          <p className="font-medium">Nothing here yet.</p>
          <p className="mt-1 text-sm text-ink-500">Listings and deals you start on this device appear here.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/new" className="btn-primary">Sell or rent</Link>
            <Link href="/browse" className="btn-secondary">Browse</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="flex items-center justify-between gap-4 py-4">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="text-sm text-ink-500">{r.kind} · <span className="amount">{formatMoney(r.cents)}</span></span>
                </span>
                <Status tone={r.tone}>{r.word}</Status>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
