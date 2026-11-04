/**
 * What a deal's parties may see of the event log. Stored payloads can hold raw AI
 * readings (full identifiers, on-screen text), so the timeline gets only an allow-list.
 */
const TIMELINE_FIELDS = ["amount", "purpose", "by", "disputeId", "ticket"] as const;

export function timelinePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of TIMELINE_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null) out[field] = payload[field];
  }
  return out;
}

/** The handoff decision as shown to the parties: the verdict, without raw model notes. */
export function decisionView(decision: unknown): unknown {
  if (!decision || typeof decision !== "object") return decision ?? null;
  const copy: Record<string, unknown> = { ...(decision as Record<string, unknown>) };
  delete copy.notes;
  delete copy.featureChecks;
  return copy;
}

/** Condition lines for public pages: real wear only, not the AI's remarks about the photos themselves. */
export function publicConditionNotes(notes: string[]): string[] {
  return notes.filter((n) => !/\bphoto\s*\d+\b|\b(supplied|provided) photos?\b|\bnot visible\b|\bpowered on\b/i.test(n));
}
