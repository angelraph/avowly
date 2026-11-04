"use client";

import { useState } from "react";

/** Send the seller the verification request, or share the result as a warning to others. */
export function ShareCheck({ id, message }: { id: string; message: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button className="btn-primary" onClick={() => copy(message, "message")}>{copied === "message" ? "Copied" : "Copy message to seller"}</button>
      <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
      <button className="btn-secondary sm:col-span-2" onClick={() => copy(`${window.location.origin}/check/${id}`, "link")}>
        {copied === "link" ? "Link copied" : "Copy link to this result"}
      </button>
    </div>
  );
}
