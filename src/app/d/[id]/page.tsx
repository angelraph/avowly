import { DealRoom } from "./DealRoom";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string; error?: string; checkin?: string }>;
}) {
  const { id } = await params;
  const { k, error, checkin } = await searchParams;
  // ?checkin= arrives when the buyer scans the seller's QR with their phone camera.
  return <DealRoom id={id} urlKey={k ?? null} initialError={error ?? null} scannedCode={checkin?.replace(/\D/g, "").slice(0, 6) || null} />;
}
