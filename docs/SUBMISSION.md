# Devpost submission text

**Name:** Avowly
**Tagline:** Pay strangers like you trust them. Money moves only when the thing does.
**Demo:** https://avowly.vercel.app
**Code:** https://github.com/angelraph/avowly
**Video:** add the public YouTube link before submitting

## Inspiration
One UK bank's fraud team contacted 100 Facebook Marketplace sellers and found 34% of the listings were fraudulent. Reported US fraud losses reached $12.5B in 2024. Yet the moment two strangers meet to swap money for a used phone still runs on cash and hope. PayPal solved trust between strangers online. Nobody had solved it for the meetup.

## What it does
Avowly ties a PayPal payment to a physical item.

- **Prove it:** the seller photographs the item beside a one-time code, so fake listings can't pass.
- **Hold it:** the buyer approves in PayPal; the money is authorized, not charged.
- **Check it:** at the handoff the buyer scans the item. The serial or IMEI must match, or for items without serials, unique marks recorded at listing. A swapped device or an activation-locked phone can't pass.
- **Release it:** on a match, PayPal captures and the seller is paid their full price by Payouts. Otherwise nothing is charged.
- **Rentals:** one hold covers fee and deposit. At return, AI compares the item with its pickup photos, and only damage on a price list both sides saw up front can be charged. The rest is released.
- **Disputes:** a PDF handoff record goes to PayPal automatically as evidence.
- **Agents:** an MCP server lets AI shopping agents find verified items and start a purchase, but only the human can approve it in PayPal.
- **Free scam check:** paste any listing for a verdict and a ready message asking the seller to verify. Listings, badges and proof pages spread Avowly on their own.

## How we built it
Next.js and TypeScript on Vercel, Postgres on Neon. PayPal: JS SDK v6, Orders v2 (AUTHORIZE), Payments v2 (partial and final capture, void, reauthorize), Payouts, signature-verified Webhooks and the Disputes API. AI: the OpenAI Responses API with vision and strict structured outputs. Channel3 supplies live retail prices. `mcp-handler` serves the agent tools.

**The core design rule: the AI reads, plain rules decide.** The model only reports what it sees, with a confidence. It isn't told which serial to expect, never sees a price it could change, and never calls PayPal. Every money decision lives in tested, public code.

## Tools and how they were used
- **OpenAI (vision, structured outputs):** reads codes, serials, marks, lock screens and accessories; compares pickup and return photos; locates personal information to blur; picks scam-check flags from a fixed list.
- **PayPal developer platform:** central to the product, as listed above.
- **Channel3:** market price checks, matched only on the same brand and model number, needing at least 3 offers.
- **Model Context Protocol:** the agent commerce server.
- **Vercel and Neon:** hosting and database.

## Challenges
- **PayPal refused holds paid directly to a third-party seller** without partner approval, so Avowly holds through its own sandbox account and pays sellers by Payouts, which also funds buyer protection.
- **Privacy:** real IMEI screenshots contain other people's phone numbers. Every photo is now pixelated before storage, and originals are never saved. Our first version of the blur silently did nothing; we caught it by looking at the output.
- **Honest pricing:** a catalog search for one phone returned a different model and flip-flops. Prices now require the same brand and model number.

## Accomplishments
- A full sale ran on the live site: an AI agent found a real phone and started the purchase, a person approved in PayPal, a different phone was refused, a locked phone was blocked, and the right phone paid the seller.
- A rental ran on the live site: a missing charger was found at return, $25 was charged from the agreed price list and $75 of the deposit came back.
- A real PayPal dispute ("item not received") was answered automatically: Avowly sent the handoff record as evidence 2 seconds after PayPal asked the seller, and PayPal passed the case back to the buyer.
- Every money rule is unit tested, and the money paths have a repeatable script against the sandbox.
- In the scam check, a listing that told the AI to approve it still came back high risk.
- Testing on a real phone found what tidy test data missed: screens label an IMEI "SIM slot 1" and add a software version after it. Both are now handled and covered by tests.

## What we learned
Models are excellent readers and poor judges of money. Separating the two made the product both more capable and easier to trust.

## What's next
Shipped deals scanned on delivery, PayPal platform partner approval, carrier and IMEI data checks, rental business accounts, and a "Verified handoff" option PayPal could offer natively. See [WHY_PAYPAL.md](WHY_PAYPAL.md).

## Testing instructions field (paste into Devpost; do not commit the passwords)
See docs/JUDGE_TESTING.md in the repo. Sandbox buyer login: (paste email and password from the PayPal dashboard). Sandbox seller email for listings: (paste).
