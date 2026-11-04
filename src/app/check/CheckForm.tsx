"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoPicker } from "@/components/PhotoPicker";

export function CheckForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("price", price);
      photos.forEach((p) => form.append("photos", p));
      const res = await fetch("/api/check", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't run the check");
      router.push(`/check/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div>
        <label className="label" htmlFor="text">The listing or the seller&apos;s messages</label>
        <textarea
          id="text"
          rows={7}
          className="field"
          placeholder="Paste the description, or what the seller told you…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div>
        <p className="label">Or a screenshot</p>
        <PhotoPicker files={photos} onChange={setPhotos} max={4} />
      </div>
      <div>
        <label className="label" htmlFor="price">Asking price in USD <span className="font-normal text-ink-500">(optional)</span></label>
        <input id="price" className="field sm:max-w-40" inputMode="decimal" placeholder="$250" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      {error && <p className="text-sm text-oxblood">{error}</p>}
      <button className="btn-primary" disabled={busy || (!text.trim() && photos.length === 0)}>
        {busy ? "Checking…" : "Check this listing"}
      </button>
    </form>
  );
}
