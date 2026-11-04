import type { Metadata } from "next";
import { RISK_FLAGS } from "@/lib/policy";
import { CheckForm } from "./CheckForm";

export const metadata: Metadata = {
  title: "Is this listing a scam? Free check · Avowly",
  description: "Paste a listing or the seller's messages and get an instant check for the warning signs of a marketplace scam. Free, no sign-up, nothing stored.",
};

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-14">
      <p className="status text-accent-ink">Free tool</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">Is this listing a scam?</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-500 sm:text-xl">
        Paste the listing or the seller&apos;s messages, or add a screenshot. No sign-up. We don&apos;t store what you send, only the verdict.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckForm />
        <aside>
          <p className="status text-ink-500">What we look for</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            {Object.values(RISK_FLAGS).map((f) => (
              <li key={f.label} className="flex gap-2">
                <span className="text-accent">◆</span>
                {f.label}
              </li>
            ))}
            <li className="flex gap-2">
              <span className="text-accent">◆</span>
              A price far below the going rate, from live retail offers
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-500">
            The AI only spots these signs. A published set of rules scores them. It can&apos;t prove a listing is safe; a hold that only the real item
            can release can.
          </p>
        </aside>
      </div>
    </div>
  );
}
