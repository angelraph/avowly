"use client";

import { useState } from "react";

/** Everything a seller needs to put protection on their existing marketplace post. */
export function SellerKit({ listingId, title }: { listingId: string; title: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/l/${listingId}`;
  const post = `${title}: verified with Avowly. I proved I have it; pay into a PayPal hold and I'm only paid once you've checked the item at the meetup. ${url}`;
  const embed = `<a href="${url}"><img src="${origin}/api/badge/${listingId}" alt="Verified with Avowly" width="320" height="72"></a>`;
  async function copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="status text-ink-500">Put it on your post</p>
      <p className="rounded-[10px] border border-line bg-paper p-3 text-sm text-ink-700">{post}</p>
      <button className="btn-secondary" onClick={() => copy(post, "post")}>{copied === "post" ? "Copied" : "Copy text for Marketplace, Craigslist or Reddit"}</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/badge/${listingId}`} alt="Verified with Avowly badge" width={320} height={72} className="max-w-full" />
      <button className="btn-secondary" onClick={() => copy(embed, "embed")}>{copied === "embed" ? "Copied" : "Copy badge code for a website"}</button>
    </div>
  );
}
