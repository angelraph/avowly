import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Status, type Tone } from "@/components/Status";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { ShareCheck } from "./ShareCheck";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.scamChecks).where(eq(schema.scamChecks.id, id));
  return row ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await load(id);
  if (!row) return { title: "Clasp" };
  const title = `${row.headline} · Clasp scam check`;
  return { title, description: "Free check for the warning signs of a marketplace scam.", openGraph: { title, type: "website" } };
}

const TONE: Record<string, { tone: Tone; word: string; box: string }> = {
  high: { tone: "oxblood", word: "High risk", box: "border-oxblood/25 bg-oxblood-tint" },
  caution: { tone: "kept", word: "Caution", box: "border-kept/25 bg-kept-tint" },
  no_flags: { tone: "ink", word: "No flags found", box: "border-line bg-card" },
};

export default async function CheckResultPage({ params }: Props) {
  const { id } = await params;
  const row = await load(id);
  if (!row) notFound();
  const t = TONE[row.level] ?? TONE.caution;
  const verifyUrl = `${env.appUrl()}/new`;
  const message = `Before I pay, can you verify the item with Clasp? It takes 2 minutes and it's free for you: you prove you have it, PayPal holds my money, and you're paid at the handoff as soon as it checks out. ${verifyUrl}`;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pb-10 pt-8">
      <section className={`rounded-[10px] border p-6 ${t.box}`}>
        <Status tone={t.tone}>{t.word}</Status>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em]">{row.headline}</h1>
        {row.product && <p className="mt-1 text-ink-500">{row.product}</p>}
        {row.reasons.length > 0 && (
          <ul className="mt-4 space-y-2 text-ink-700">
            {row.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className={row.level === "high" ? "text-oxblood" : "text-kept"}>◆</span>
                {r}
              </li>
            ))}
          </ul>
        )}
        {row.priceMessage && !row.reasons.some((r) => r.includes("going rate")) && <p className="mt-3 text-sm text-ink-500">Price: {row.priceMessage}</p>}
      </section>

      <section className="rounded-[10px] border border-line bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Don&apos;t guess. Ask the seller to prove it.</h2>
        <p className="mt-2 text-ink-500">
          With Clasp, the seller proves they have the item, PayPal holds your money, and they&apos;re paid only when the item in your hands checks out. A real
          seller loses nothing. A scammer can&apos;t do it.
        </p>
        <p className="mt-4 rounded-[10px] border border-line bg-paper p-3 text-sm text-ink-700">{message}</p>
        <ShareCheck id={id} message={message} />
      </section>

      <p className="text-center text-xs text-ink-500">
        Automated check of warning signs, not a finding about any person. <Link href="/check" className="underline underline-offset-2">Check another listing</Link>
      </p>
    </div>
  );
}
