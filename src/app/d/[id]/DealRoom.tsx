"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EmailUpdates } from "@/components/EmailUpdates";
import { NotifyButton } from "@/components/NotifyButton";
import { PhotoPicker } from "@/components/PhotoPicker";
import { ShareProof } from "@/components/ShareProof";
import { DEAL_STATUS, Status } from "@/components/Status";
import { formatMoney } from "@/lib/money";

type Charge = { reason: string; amountCents: number; evidencePhotoId: string | null };
type Decision =
  | { kind: "sale_handoff"; verdict: "match" | "mismatch" | "rescan" | "locked"; canRelease: boolean; reasons: string[]; photoIds: string[]; identityConfirmed?: boolean; lockStatus?: "off" | "on" | "not_shown" }
  | { kind: "rental_return"; verdict: "clean" | "charge"; charges: Charge[]; flaggedNotCharged: string[]; totalCents: number; releasedCents: number; photoIds: string[] };

type State = {
  role: "buyer" | "seller" | null;
  listing: {
    id: string;
    mode: "sale" | "rental";
    title: string;
    sellerName: string;
    priceCents: number;
    depositCents: number;
    hasAntiTheftLock: boolean;
    distinctiveFeatures: string[];
    identifierKinds: string[];
    accessories: { name: string }[];
    demo: boolean;
    delivery: "meetup" | "shipping";
    paypalVerified: boolean;
  };
  checkedInAt: string | null;
  checkin: { code: string; url: string; qrSvg: string | null } | null;
  deal: {
    status: string;
    authorizedCents: number;
    capturedCents: number;
    feeCents: number;
    paidOutCents: number;
    decision: Decision | null;
    pickupInspection: { presentAtPickup: Record<string, boolean>; conditionNotes: string[] } | null;
    clock: { honorEndsAt: string; expiresAt: string; phase: string } | null;
    shipping: { carrier: string; tracking: string; at: string } | null;
  };
  events: { type: string; at: string; payload: Record<string, unknown> }[];
};

function eventLabel(e: State["events"][number]): string {
  const p = e.payload as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const amt = p.amount?.value ? ` $${p.amount.value}` : "";
  const map: Record<string, string> = {
    "paypal.order.created": "PayPal order created",
    "paypal.authorized": `PayPal hold placed${amt}`,
    "paypal.reauthorized": "Hold renewed with PayPal",
    "paypal.capture": `PayPal captured${amt} (${String(p.purpose ?? "").replace("_", " ")})`,
    "paypal.payout": `Payout sent to seller${amt}`,
    "dispute.seen":
      p.status === "WAITING_FOR_SELLER_RESPONSE"
        ? `PayPal asked the seller to respond to dispute ${p.disputeId ?? ""}`
        : p.status === "WAITING_FOR_BUYER_RESPONSE"
          ? `PayPal passed dispute ${p.disputeId ?? ""} back to the buyer`
          : p.status === "RESOLVED"
            ? `PayPal dispute ${p.disputeId ?? ""} resolved`
            : `Buyer opened a PayPal dispute (${p.disputeId ?? ""})`,
    "dispute.evidence_submitted": "Avowly sent the handoff record to PayPal as evidence",
    "dispute.defense_failed": "Couldn't send evidence automatically. Use “Send record to PayPal”",
    "paypal.voided": "PayPal hold cancelled, money released",
    "paypal.hold_lapses": "Remaining hold will lapse on its own; nothing more can be charged",
    "deal.cancelled": `Deal cancelled by the ${p.by ?? "buyer"}`,
    "handoff.match": "Handoff scan: identity matches",
    "handoff.mismatch": "Handoff scan: NOT the listed item",
    "handoff.rescan": "Handoff scan: another photo needed",
    "handoff.locked": "Handoff scan: device is locked",
    "rental.pickup_recorded": "Pickup condition recorded",
    "rental.return_clean": "Return scan: clean",
    "rental.return_charge": "Return scan: agreed charges found",
    "deal.released": "Deal complete",
    "deal.settled": "Rental settled",
    "support.ticket_opened": `Support ticket ${p.ticket ?? ""} opened`,
    "handoff.checkin": "Buyer checked in with the seller's code: it's really them",
    "handoff.checkin_failed": "Check-in code didn't match the seller",
    "deal.shipped": `Seller shipped it${p.carrier ? ` with ${p.carrier}` : ""}${p.tracking ? `, tracking ${p.tracking}` : ""}`,
    "listing.paypal_verified": "Seller verified with PayPal",
    "notify.email":`Email to the ${p.audience ?? "party"}: ${p.sent ? "sent" : "not sent"}`,
    "notify.email_set": `The ${p.audience ?? "party"} turned on email updates${p.sent ? "" : " (test email didn't send)"}`,
    "notify.push":`Notification sent to the ${p.audience ?? "party"}: ${p.accepted ?? 0} of ${p.devices ?? 0} device${p.devices === 1 ? "" : "s"} reached`,
  };
  const webhook: Record<string, string> = {
    "CHECKOUT.ORDER.APPROVED": "buyer approved the payment",
    "PAYMENT.AUTHORIZATION.CREATED": "funds are on hold",
    "PAYMENT.AUTHORIZATION.VOIDED": "hold released",
    "PAYMENT.CAPTURE.COMPLETED": "payment captured",
    "PAYMENT.CAPTURE.PENDING": "capture pending",
    "PAYMENT.CAPTURE.DECLINED": "capture declined",
    "PAYMENT.CAPTURE.REFUNDED": "payment refunded",
    "PAYMENT.CAPTURE.REVERSED": "payment reversed",
    "PAYMENT.PAYOUTSBATCH.SUCCESS": "payout batch processed",
    "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": "seller received the payout",
    "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": "payout waiting to be claimed",
    "PAYMENT.PAYOUTS-ITEM.FAILED": "payout failed",
    "CUSTOMER.DISPUTE.CREATED": "dispute opened",
    "CUSTOMER.DISPUTE.UPDATED": "dispute updated",
    "CUSTOMER.DISPUTE.RESOLVED": "dispute resolved",
  };
  if (e.type.startsWith("webhook.")) {
    const name = e.type.slice(8);
    return `PayPal confirmed: ${webhook[name] ?? name}${amt}`;
  }
  return map[e.type] ?? e.type;
}

function Step({ done, n, children }: { done: boolean; n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-matched text-white" : "bg-ink-100 text-ink-700"}`}>
        {done ? "✓" : n}
      </span>
      <div className={`min-w-0 flex-1 text-sm ${done ? "text-ink-500" : "text-ink-700"}`}>{children}</div>
    </li>
  );
}

/** What the buyer still needs to photograph, ticking off what already passed. */
function ScanGuide({ kinds, marks, hasLock, identityDone, lockDone }: { kinds: string[]; marks: string[]; hasLock: boolean; identityDone: boolean; lockDone: boolean }) {
  const label = kinds.join(" / ");
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        <Step done={identityDone} n={1}>
          {kinds.length ? (
            <>
              <strong>Photograph the {label}</strong> on the item in your hands.
              {kinds.includes("IMEI") && " On a phone, dial *#06# on it yourself and photograph that screen."}
            </>
          ) : (
            <>
              <strong>Photograph these marks up close:</strong> {marks.join("; ")}.
            </>
          )}
        </Step>
        {hasLock && (
          <Step done={lockDone} n={2}>
            <strong>Photograph the Find switch turned off.</strong> Ask the seller to turn it off, so the device can&apos;t be locked after you buy it.
            {!lockDone && (
              <details className="mt-2 rounded-[10px] border border-line bg-paper px-3 py-2">
                <summary className="cursor-pointer font-medium text-ink-900">Where&apos;s the switch?</summary>
                <ul className="mt-2 space-y-2">
                  <li><strong>Android:</strong> Settings → Google → All services → Find Hub (or Find My Device).</li>
                  <li><strong>iPhone:</strong> Settings → your name → Find My → Find My iPhone.</li>
                  <li><strong>Can&apos;t see it?</strong> Search &quot;Find&quot; in Settings. The photo must show the switch itself; a map or device info page won&apos;t count.</li>
                </ul>
              </details>
            )}
          </Step>
        )}
      </ol>
      <p className="text-xs text-ink-500">Photos clear after each check. Ticked steps stay ticked for an hour, so add only what&apos;s left.</p>
    </div>
  );
}

function useCountdown(target: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "ended";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

/** Judge demo: sample screens a buyer can "scan" instead of photographing a real phone. */
const DEMO_SHOTS = [
  { file: "imei-wrong.png", label: "A different phone's IMEI", expect: "Mismatch" },
  { file: "imei-right.png", label: "The listed phone's IMEI", expect: "One more photo" },
  { file: "findhub-on.png", label: "Find Hub still on", expect: "Locked" },
  { file: "findhub-off.png", label: "Find Hub switched off", expect: "Matched" },
];

export function DealRoom({ id, urlKey, initialError, scannedCode }: { id: string; urlKey: string | null; initialError?: string | null; scannedCode?: string | null }) {
  const [key, setKey] = useState<string | null>(urlKey);
  const [state, setState] = useState<State | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  // Remember this deal on the device so it shows up in My deals (agent-started deals arrive by link).
  useEffect(() => {
    if (!urlKey || !state?.role) return;
    try {
      if (state.role === "buyer") localStorage.setItem(`avowly:deal:${id}`, urlKey);
    } catch {}
  }, [id, urlKey, state?.role]);

  useEffect(() => {
    if (urlKey) return;
    try {
      setKey(localStorage.getItem(`avowly:deal:${id}`));
    } catch {}
  }, [id, urlKey]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/deals/${id}${key ? `?k=${encodeURIComponent(key)}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setState(data);
    else setError(data.error);
  }, [id, key]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const honorLeft = useCountdown(state?.deal.clock?.honorEndsAt);
  const [code, setCode] = useState("");
  const [ship, setShip] = useState({ carrier: "", tracking: "" });

  // Arrived by scanning the seller's QR: check in once the deal has loaded as the buyer.
  const [autoCheckin, setAutoCheckin] = useState(scannedCode ?? null);
  useEffect(() => {
    if (!autoCheckin || state?.role !== "buyer" || state.checkedInAt || state.deal.status !== "held") return;
    setAutoCheckin(null);
    act("checkin", "checkin", false, { code: autoCheckin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckin, state?.role, state?.checkedInAt, state?.deal.status]);

  async function demoScan(file: string, label: string) {
    const blob = await (await fetch(`/demo/${file}`)).blob();
    await act("handoff", label, [new File([blob], file, { type: "image/png" })]);
  }

  async function act(path: string, label: string, withPhotos: boolean | File[] = false, extra: Record<string, string> = {}) {
    setError(null);
    setNotice(null);
    setBusy(label);
    try {
      let res: Response;
      if (withPhotos) {
        const form = new FormData();
        form.set("key", key ?? "");
        (Array.isArray(withPhotos) ? withPhotos : photos).forEach((p) => form.append("photos", p));
        res = await fetch(`/api/deals/${id}/${path}`, { method: "POST", body: form });
      } else {
        res = await fetch(`/api/deals/${id}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, ...extra }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.paypalDebugId ? `${data.error} · PayPal debug id ${data.paypalDebugId}` : data.error);
      setPhotos([]);
      if (path === "defend") {
        const results = (data.results ?? []) as { outcome: string; disputeId: string }[];
        setNotice(
          results.length === 0
            ? "No PayPal disputes on this deal."
            : results.map((r) => (r.outcome === "submitted" ? `Record sent to PayPal for dispute ${r.disputeId}.` : r.outcome === "already_submitted" ? `Record already sent for dispute ${r.disputeId}.` : `Dispute ${r.disputeId} found; PayPal isn't asking for evidence yet.`)).join(" "),
        );
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (!state) return <p className="mx-auto max-w-xl px-4 pt-16 text-center text-ink-500">{error ?? "Loading…"}</p>;
  const { listing, deal, role } = state;
  const s = DEAL_STATUS[deal.status] ?? { word: deal.status, tone: "muted" as const, line: "" };
  const held = deal.authorizedCents - deal.capturedCents;
  const isOpenHold = ["held", "active", "returned", "releasing", "picking_up", "settling"].includes(deal.status);
  const decision = deal.decision;
  const party = listing.mode === "sale" ? "seller" : "owner";
  const youAre = role === "seller" ? party : role === "buyer" ? (listing.mode === "sale" ? "buyer" : "renter") : null;

  // The one number that matters right now.
  const hero =
    deal.status === "released"
      ? { cents: deal.paidOutCents, label: `paid to ${listing.sellerName.split(/\s+/)[0]}` }
      : deal.status === "settled" && decision?.kind === "rental_return"
        ? { cents: decision.releasedCents, label: "of the deposit released" }
        : deal.status === "voided"
          ? { cents: 0, label: "charged" }
          : { cents: isOpenHold ? held : deal.authorizedCents, label: isOpenHold ? "held by PayPal, not charged" : "to authorize" };

  const scanner = (title: string, hint: ReactNode, path: string, cta: string) => (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-2 text-sm text-ink-500">{hint}</div>
      </div>
      <PhotoPicker files={photos} onChange={setPhotos} />
      <button className="btn-primary" disabled={!!busy || photos.length === 0} onClick={() => act(path, cta, true)}>
        {busy === cta ? "Reading the photos…" : cta}
      </button>
    </div>
  );

  const thumb = (p: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={p} src={`/api/photos/${p}?k=${encodeURIComponent(key ?? "")}`} alt="Scan" className="aspect-square w-full rounded-[10px] object-cover" />
  );

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pb-16 pt-6">
      {/* header: status word, the one amount, nothing else */}
      <section>
        <p className="text-sm text-ink-500">
          {listing.mode === "sale" ? "Purchase" : "Rental"} · {listing.title}
          {youAre && <span className="text-ink-300"> · you&apos;re the {youAre}</span>}
        </p>
        <div className="mt-4">
          <Status tone={s.tone} pulse={deal.status === "held"}>{s.word}</Status>
        </div>
        <p className="amount mt-2 text-6xl leading-none">{formatMoney(hero.cents)}</p>
        <p className="mt-2 text-ink-500">{hero.label}</p>

        <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line text-sm">
          <div className="py-3 pr-3">
            <dt className="text-ink-500">Authorized</dt>
            <dd className="amount mt-0.5 text-base">{formatMoney(deal.authorizedCents)}</dd>
          </div>
          <div className="px-3 py-3">
            <dt className="text-ink-500">Captured</dt>
            <dd className="amount mt-0.5 text-base">{formatMoney(deal.capturedCents)}</dd>
          </div>
          <div className="py-3 pl-3">
            <dt className="text-ink-500">To {party}</dt>
            <dd className="amount mt-0.5 text-base">{formatMoney(deal.paidOutCents)}</dd>
          </div>
        </dl>
        {deal.status === "held" && honorLeft && (
          <p className="mt-3 text-xs text-ink-500">
            Guaranteed by PayPal for {honorLeft === "ended" ? "a little longer" : honorLeft}; Avowly renews it automatically, up to 29 days.
          </p>
        )}
        {deal.feeCents > 0 && (
          <p className="mt-1 text-xs text-ink-500">
            Includes {formatMoney(deal.feeCents)} buyer protection. The {party} receives their full {formatMoney(listing.priceCents)}.
          </p>
        )}
      </section>

      {/* the latest verdict */}
      {decision?.kind === "sale_handoff" && (
        <section
          className={`rounded-[10px] border p-5 ${
            decision.verdict === "match"
              ? "border-matched/25 bg-matched-tint"
              : decision.verdict === "rescan"
                ? "border-line bg-card"
                : "border-oxblood/25 bg-oxblood-tint"
          }`}
        >
          <Status tone={decision.verdict === "match" ? "matched" : decision.verdict === "rescan" ? "kept" : "oxblood"}>
            {decision.verdict === "match" ? "Matched" : decision.verdict === "mismatch" ? "Mismatch" : decision.verdict === "locked" ? "Locked" : "One more photo"}
          </Status>
          <p className="mt-2 text-lg font-medium">
            {decision.verdict === "match" && "This is the listed item."}
            {decision.verdict === "mismatch" && "This is not the listed item."}
            {decision.verdict === "locked" && "The device's anti-theft lock is on."}
            {decision.verdict === "rescan" && "Almost there. One more photo needed."}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {decision.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {decision.photoIds.length > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{decision.photoIds.slice(-4).map(thumb)}</div>}
          {decision.verdict !== "match" && <p className="mt-3 text-sm text-ink-500">No money has moved. The hold stays until you scan again or cancel.</p>}
        </section>
      )}

      {decision?.kind === "rental_return" && (
        <section className="rounded-[10px] border border-line bg-card p-5">
          <Status tone={decision.verdict === "clean" ? "matched" : "kept"}>{decision.verdict === "clean" ? "Clean return" : "Kept"}</Status>
          <p className="mt-2 text-lg font-medium">{decision.verdict === "clean" ? "Returned in the same condition." : "Charges from the agreed list."}</p>
          {decision.charges.length > 0 && (
            <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
              {decision.charges.map((c) => (
                <li key={c.reason} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-3">
                    {c.evidencePhotoId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/photos/${c.evidencePhotoId}?k=${encodeURIComponent(key ?? "")}`} alt="" className="h-10 w-10 rounded-[6px] object-cover" />
                    )}
                    {c.reason}
                  </span>
                  <span className="amount">{formatMoney(c.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
          {decision.flaggedNotCharged.length > 0 && (
            <div className="mt-4 text-sm">
              <p className="status text-ink-500">Flagged, not charged</p>
              <ul className="mt-1 space-y-1 text-ink-700">
                {decision.flaggedNotCharged.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="status text-kept">Kept</dt>
              <dd className="amount text-xl">{formatMoney(decision.totalCents)}</dd>
            </div>
            <div>
              <dt className="status text-ink-700">Released</dt>
              <dd className="amount text-xl">{formatMoney(decision.releasedCents)}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* the one thing to do next */}
      {listing.mode === "sale" && deal.status === "held" && role === "buyer" && listing.delivery === "shipping" && (
        <section className="rounded-[10px] border border-line bg-card p-5 text-sm">
          <p className="status text-ink-500">Shipped sale</p>
          {deal.shipping ? (
            <p className="mt-2 text-ink-700">
              📦 On its way with <b>{deal.shipping.carrier}</b>, tracking <span className="font-mono">{deal.shipping.tracking}</span>. When it arrives, scan it below before you release the money. If it never comes, cancel and nothing is charged.
            </p>
          ) : (
            <p className="mt-2 text-ink-700">Waiting for {listing.sellerName.split(/\s+/)[0]} to ship it. You&apos;ll be told the tracking number. The money stays held until you scan it on arrival.</p>
          )}
        </section>
      )}

      {listing.mode === "sale" && deal.status === "held" && role === "buyer" && listing.delivery === "meetup" && (
        <section className={`rounded-[10px] border p-5 text-sm ${state.checkedInAt ? "border-matched/25 bg-matched-tint" : "border-line bg-card"}`}>
          {state.checkedInAt ? (
            <p className="text-ink-700">
              <span className="font-medium text-matched">✓ Seller confirmed in person.</span> You scanned the code on their phone at{" "}
              {new Date(state.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Now scan the item.
            </p>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                act("checkin", "checkin", false, { code });
              }}
            >
              <p className="font-medium text-ink-900">At the meetup? Check in first.</p>
              <p className="text-ink-500">Ask the seller to open their Avowly deal. Scan the QR code on their screen with your camera, or type the 6-digit code. It proves you&apos;re meeting the person who listed this.</p>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input className="field min-w-0 font-mono tracking-widest" inputMode="numeric" maxLength={7} placeholder="123 456" value={code} onChange={(e) => setCode(e.target.value)} />
                <button className="btn-secondary w-auto px-5" disabled={!!busy || code.replace(/\D/g, "").length !== 6}>
                  {busy === "checkin" ? "Checking…" : "Check in"}
                </button>
              </div>
              {listing.demo && state.checkin && (
                <button type="button" className="text-sm text-accent underline" onClick={() => act("checkin", "checkin", false, { code: state.checkin!.code })}>
                  Demo: use the seller&apos;s code ({state.checkin.code})
                </button>
              )}
            </form>
          )}
        </section>
      )}

      {listing.mode === "sale" && deal.status === "held" && role === "buyer" && listing.demo && !(decision?.kind === "sale_handoff" && decision.canRelease) && (
        <section className="rounded-[10px] border border-accent/30 bg-accent-tint p-5 text-sm">
          <p className="status text-accent-ink">Judge demo</p>
          <p className="mt-2 text-ink-700">
            No phone needed. Tap these sample screens in order; each goes through the real AI check and the real rules. Watch the result change, then release the money.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_SHOTS.map((d, i) => (
              <button key={d.file} type="button" className="btn-secondary flex-col gap-1 py-3 text-left" disabled={!!busy} onClick={() => demoScan(d.file, d.file)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/demo/${d.file}`} alt="" className="h-20 w-auto rounded border border-line" />
                <span className="text-sm font-medium">
                  {i + 1}. {busy === d.file ? "Reading…" : d.label}
                </span>
                <span className="text-xs text-ink-500">Expect: {d.expect}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {listing.mode === "sale" && deal.status === "held" && role === "buyer" && (
        <div className="space-y-3">
          {decision?.kind === "sale_handoff" && decision.canRelease ? (
            <button className="btn-primary py-4 text-base" disabled={!!busy} onClick={() => act("release", "release")}>
              {busy === "release" ? "Paying the seller…" : `Release ${formatMoney(listing.priceCents)} to ${listing.sellerName.split(/\s+/)[0]}`}
            </button>
          ) : (
            scanner(
              listing.delivery === "shipping" ? "Scan it when it arrives" : "Scan the item in your hands",
              <ScanGuide
                kinds={listing.identifierKinds}
                marks={listing.distinctiveFeatures}
                hasLock={listing.hasAntiTheftLock}
                identityDone={decision?.kind === "sale_handoff" && !!decision.identityConfirmed}
                lockDone={decision?.kind === "sale_handoff" && decision.lockStatus === "off"}
              />,
              "handoff",
              "Check this item",
            )
          )}
          <button className="w-full py-2 text-sm text-ink-500 hover:text-oxblood" disabled={!!busy} onClick={() => act("cancel", "cancel")}>
            Cancel and release my hold
          </button>
        </div>
      )}
      {listing.mode === "sale" && deal.status === "held" && role === "seller" && listing.delivery === "meetup" && (
        <section className="space-y-4 rounded-[10px] border border-line bg-card p-5">
          <p className="text-ink-700">
            The buyer&apos;s money is held. At the meetup they scan the item; if it matches your verified listing, you&apos;re paid on the spot.{listing.hasAntiTheftLock && " They will also ask you to turn off the Find switch: Settings → Google → All services → Find Hub on Android, or Settings → your name → Find My on iPhone."}
          </p>
          {state.checkedInAt ? (
            <p className="text-sm font-medium text-matched">✓ The buyer checked in with your code.</p>
          ) : (
            state.checkin && (
              <div className="flex flex-col items-center gap-2 rounded-[10px] border border-line bg-white p-4 text-center">
                <p className="text-sm font-medium text-ink-900">Show this to the buyer when you meet</p>
                {state.checkin.qrSvg && <div className="w-52" dangerouslySetInnerHTML={{ __html: state.checkin.qrSvg }} />}
                <p className="font-mono text-2xl tracking-[0.3em] text-ink-900">
                  {state.checkin.code.slice(0, 3)} {state.checkin.code.slice(3)}
                </p>
                <p className="text-xs text-ink-500">Only your link can show this code, so the buyer knows it&apos;s really you.</p>
              </div>
            )
          )}
        </section>
      )}
      {listing.mode === "sale" && deal.status === "held" && role === "seller" && listing.delivery === "shipping" && (
        <section className="space-y-3 rounded-[10px] border border-line bg-card p-5">
          {deal.shipping ? (
            <p className="text-ink-700">
              📦 Shipped with <b>{deal.shipping.carrier}</b>, tracking <span className="font-mono">{deal.shipping.tracking}</span>. The buyer scans it on arrival; if it matches your verified listing, you&apos;re paid straight away.
            </p>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                act("ship", "ship", false, ship);
              }}
            >
              <p className="font-medium text-ink-900">The buyer&apos;s money is held. Ship it, then add the tracking.</p>
              <p className="text-sm text-ink-500">Ship the exact item you verified. The buyer scans it on arrival, and you&apos;re paid when it matches.</p>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <input className="field min-w-0" placeholder="Carrier" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} />
                <input className="field min-w-0 font-mono" placeholder="Tracking number" value={ship.tracking} onChange={(e) => setShip({ ...ship, tracking: e.target.value })} />
              </div>
              <button className="btn-primary" disabled={!!busy || !ship.carrier.trim() || !ship.tracking.trim()}>
                {busy === "ship" ? "Saving…" : "Mark as shipped"}
              </button>
            </form>
          )}
        </section>
      )}

      {listing.mode === "rental" &&
        deal.status === "held" &&
        role === "buyer" &&
        scanner(
          "Record what you received",
          `Photograph the item from all sides with every accessory laid out (${listing.accessories.map((a) => a.name).join(", ") || "none listed"}). This protects you at return.`,
          "pickup",
          "Record pickup and pay the fee",
        )}
      {listing.mode === "rental" && deal.status === "held" && role && (
        <button className="w-full py-2 text-sm text-ink-500 hover:text-oxblood" disabled={!!busy} onClick={() => act("cancel", "cancel")}>
          Cancel and release the hold
        </button>
      )}
      {listing.mode === "rental" && deal.status === "active" && deal.pickupInspection && (
        <section className="rounded-[10px] border border-line bg-card p-5 text-sm">
          <p className="status text-ink-500">Recorded at pickup</p>
          <ul className="mt-2 space-y-1 text-ink-700">
            {Object.entries(deal.pickupInspection.presentAtPickup).map(([name, present]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className={present ? "text-matched" : "text-ink-500"}>{present ? "received" : "not seen · can't be charged"}</span>
              </li>
            ))}
            {deal.pickupInspection.conditionNotes.map((n) => (
              <li key={n} className="text-ink-500">Existing: {n}</li>
            ))}
          </ul>
        </section>
      )}
      {listing.mode === "rental" &&
        deal.status === "active" &&
        role === "seller" &&
        scanner("Scan it back in", "Same angles as pickup, with every accessory laid out.", "return", "Compare with pickup")}
      {listing.mode === "rental" && deal.status === "active" && role === "buyer" && (
        <p className="rounded-[10px] border border-line bg-card p-5 text-sm text-ink-700">
          You have the item. When you hand it back, the owner scans it in from their own page, and you&apos;ll see the result here. Your deposit stays on hold until then.
        </p>
      )}
      {listing.mode === "rental" && deal.status === "returned" && role === "buyer" && (
        <p className="rounded-[10px] border border-line bg-card p-5 text-sm text-ink-700">
          The owner has scanned the item back in. Your deposit is settled once they confirm the result above.
        </p>
      )}
      {listing.mode === "rental" && deal.status === "returned" && role === "seller" && decision?.kind === "rental_return" && (
        <div className="space-y-3">
          <button className="btn-primary py-4 text-base" disabled={!!busy} onClick={() => act("settle", "settle")}>
            {busy === "settle"
              ? "Settling with PayPal…"
              : decision.totalCents > 0
                ? `Keep ${formatMoney(decision.totalCents)} · release ${formatMoney(decision.releasedCents)}`
                : `Release the full ${formatMoney(listing.depositCents)} deposit`}
          </button>
          <details className="rounded-[10px] border border-line bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">Wrong photo? Scan it again</summary>
            <div className="mt-3">
              {scanner("Scan it back in", "This replaces the result above. Nothing has moved yet.", "return", "Compare with pickup")}
            </div>
          </details>
        </div>
      )}

      {(deal.status === "released" || deal.status === "settled") && (
        <section className="space-y-3 rounded-[10px] border border-line bg-card p-5 text-center">
          <p className="font-serif text-2xl">Nobody had to trust anybody.</p>
          <p className="text-sm text-ink-500">
            {role === "seller" ? "Share your proof. It's how the next buyer knows you're the real deal." : "Share the proof, or use Avowly for your next deal."}
          </p>
          <ShareProof dealId={id} title={listing.title} />
          <Link href="/new" className="btn-secondary">Sell or rent something with Avowly</Link>
        </section>
      )}

      {role && deal.capturedCents > 0 && (
        <section className="space-y-2">
          <a className="btn-secondary" href={`/api/deals/${id}/record?k=${encodeURIComponent(key ?? "")}`} download>
            Download the handoff record (PDF)
          </a>
          {role === "seller" && (
            <button className="btn-secondary" disabled={!!busy} onClick={() => act("defend", "defend")}>
              {busy === "defend" ? "Checking PayPal for disputes…" : "Check for disputes and send the record"}
            </button>
          )}
          <p className="text-xs text-ink-500">If the buyer ever opens a PayPal dispute, Avowly sends this record to PayPal automatically.</p>
        </section>
      )}

      {role && key && !["released", "settled", "voided"].includes(deal.status) && (
        <section className="space-y-3">
          <NotifyButton
            subscriptionKey={key}
            dealId={id}
            label={listing.mode === "rental" && role === "buyer" ? "Notify me when my deposit is back" : "Notify me about this deal"}
          />
          <EmailUpdates subscriptionKey={key} dealId={id} />
        </section>
      )}

      {notice && <p className="text-sm text-matched">{notice}</p>}
      {error && <p className="rounded-[10px] border border-oxblood/25 bg-oxblood-tint px-4 py-3 text-sm text-oxblood">{error}</p>}

      {/* activity: one quiet line per event, Linear-style */}
      <section>
        <p className="status text-ink-500">Activity</p>
        <ol className="relative mt-3 space-y-3 border-l border-line pl-5">
          {state.events.map((e, i) => {
            const fromPayPal = e.type.startsWith("webhook.");
            const isMoney = e.type.startsWith("paypal.") || fromPayPal;
            return (
              <li key={i} className="relative text-sm">
                <span
                  className={`absolute -left-[24.5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-paper ${
                    e.type.includes("mismatch") ? "bg-oxblood" : fromPayPal ? "bg-matched" : isMoney ? "bg-accent" : "bg-ink-300"
                  }`}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <span className={isMoney ? "text-ink-900" : "text-ink-700"}>{eventLabel(e)}</span>
                  <time className="shrink-0 text-xs text-ink-500" dateTime={e.at}>
                    {ago(e.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
