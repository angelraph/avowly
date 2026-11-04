import { describe, expect, it } from "vitest";
import { decisionView, timelinePayload } from "./sanitize";

describe("timelinePayload", () => {
  it("drops raw readings and identifiers", () => {
    const out = timelinePayload({
      amount: { value: "250.00" },
      reading: { identifiers: [{ kind: "IMEI", value: "490154203237518" }], notes: ["Contact Don"] },
      verdict: { matched: { value: "490154203237518" } },
      authorizationId: "ABC",
      purpose: "sale",
    });
    expect(out).toEqual({ amount: { value: "250.00" }, purpose: "sale" });
    expect(JSON.stringify(out)).not.toContain("490154203237518");
  });
});

describe("decisionView", () => {
  it("removes model notes but keeps the verdict", () => {
    const out = decisionView({ kind: "sale_handoff", verdict: "match", notes: ["0803 933 4616 visible"], featureChecks: [] }) as Record<string, unknown>;
    expect(out.verdict).toBe("match");
    expect(out.notes).toBeUndefined();
  });
  it("handles an empty decision", () => {
    expect(decisionView(null)).toBeNull();
  });
});
