"use client";

import { useEffect, useState } from "react";

/**
 * Lets either party get deal updates by email, which works on every phone, including ones
 * that block browser notifications. Hidden when the server can't send email.
 */
export function EmailUpdates({ subscriptionKey, listingId, dealId }: { subscriptionKey: string; listingId?: string; dealId?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ to: string; sent: boolean; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notify-email")
      .then((r) => r.json())
      .then((d) => setEnabled(d.enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: subscriptionKey, listingId, dealId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that address");
      setDone({ to: email.trim(), sent: data.sent === true, error: data.error });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="space-y-1 text-sm">
        <p className="text-ok-600">✉️ Updates will be emailed to {done.to}.</p>
        {done.sent ? (
          <p className="text-ink-500">A test email is on its way. Not there in a few minutes? Check spam and mark it &quot;not spam&quot;.</p>
        ) : (
          <p className="text-bad-600">Saved, but the test email didn&apos;t send{done.error ? `: ${done.error}` : ""}.</p>
        )}
        <button type="button" className="text-avowly-600 underline" onClick={() => setDone(null)}>
          Use a different address
        </button>
      </div>
    );

  return (
    <form onSubmit={save} className="space-y-2">
      <label htmlFor="updates-email" className="text-sm text-ink-700">
        Email me updates (works on every phone)
      </label>
      <div className="flex gap-2">
        <input
          id="updates-email"
          className="field min-w-0 flex-1"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn-secondary shrink-0" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-sm text-bad-600">{error}</p>}
    </form>
  );
}
