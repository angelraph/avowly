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
  it("passes short status words but not free text or objects", () => {
    expect(timelinePayload({ status: "WAITING_FOR_SELLER_RESPONSE", accepted: 1, devices: 2, audience: "seller" })).toEqual({
      status: "WAITING_FOR_SELLER_RESPONSE",
      accepted: 1,
      devices: 2,
      audience: "seller",
    });
    expect(timelinePayload({ status: "IMEI 490154203237518", accepted: "1", audience: { x: 1 } })).toEqual({});
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

describe("publicConditionNotes", () => {
  it("keeps wear and drops remarks about the photos", async () => {
    const { publicConditionNotes } = await import("./sanitize");
    expect(
      publicConditionNotes(["Display is powered on in photo 0.", "Exact model is not visible in the supplied photos.", "Black rear panel has light surface marks."]),
    ).toEqual(["Black rear panel has light surface marks."]);
  });
});
