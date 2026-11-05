import type { Metadata } from "next";
import Link from "next/link";
import { DemoStart } from "./DemoStart";

export const metadata: Metadata = {
  title: "Try a full deal · Avowly",
  description: "Run a complete protected sale in the PayPal sandbox in two minutes, with no phone or second person needed.",
};

const STEPS: [string, string][] = [
  ["Start", "Avowly lists a sample phone that's already verified, so you skip the seller's photos."],
  ["Pay", "Tap the PayPal button and log in with the sandbox buyer from the testing instructions. The money is authorized, not charged."],
  ["Check in", "Use the seller's code, as a buyer would by scanning the QR on the seller's phone."],
  ["Scan", "Tap the sample screens in order. Each goes through the real AI check: wrong phone → Mismatch, right phone → one more photo, lock still on → Locked, lock off → Matched."],
  ["Release", "PayPal captures the hold and pays the sandbox seller by Payouts. Open the proof page and the PDF record."],
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 pb-16 pt-8">
      <div>
        <p className="status text-accent">Judge demo · PayPal sandbox</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Try a full deal in two minutes</h1>
        <p className="mt-2 text-ink-500">
          No phone, no item, no second person. Everything after the listing is real: the PayPal hold, the AI scan, the rules, the capture and the payout.
        </p>
      </div>
      <ol className="space-y-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-paper">{i + 1}</span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-ink-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <DemoStart />
      <p className="text-sm text-ink-500">
        Prefer to see finished deals? The <Link className="underline" href="/p/jz8gdc2k34f7">real phone sale</Link> and the{" "}
        <Link className="underline" href="/p/d6r8tnmjta2m">real laptop rental</Link> ran on this site with real items. Demo deals are hidden from search and the home page numbers.
      </p>
    </div>
  );
}
