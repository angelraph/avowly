import { describe, expect, it } from "vitest";
import { checkinCode, checkinMatches, checkinQrSvg, checkinUrl } from "./checkin";

describe("meetup check-in code", () => {
  it("is six digits and stable for the same deal and seller", () => {
    const a = checkinCode("deal1", "sellerKeyA");
    expect(a).toMatch(/^\d{6}$/);
    expect(checkinCode("deal1", "sellerKeyA")).toBe(a);
  });
  it("changes with the seller key and the deal", () => {
    expect(checkinCode("deal1", "sellerKeyB")).not.toBe(checkinCode("deal1", "sellerKeyA"));
    expect(checkinCode("deal2", "sellerKeyA")).not.toBe(checkinCode("deal1", "sellerKeyA"));
  });
  it("accepts the right code with spaces and rejects others", () => {
    const c = checkinCode("deal1", "sellerKeyA");
    expect(checkinMatches("deal1", "sellerKeyA", `${c.slice(0, 3)} ${c.slice(3)}`)).toBe(true);
    expect(checkinMatches("deal1", "sellerKeyA", c === "000000" ? "111111" : "000000")).toBe(false);
    expect(checkinMatches("deal1", "sellerKeyA", "")).toBe(false);
    expect(checkinMatches("deal1", "sellerKeyA", "12345")).toBe(false);
  });
  it("renders a QR for the deal link", async () => {
    const url = checkinUrl("https://avowly.vercel.app", "deal1", "123456");
    expect(url).toBe("https://avowly.vercel.app/d/deal1?checkin=123456");
    expect(await checkinQrSvg(url)).toContain("<svg");
  });
});
