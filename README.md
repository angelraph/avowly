# Avowly

**Pay strangers like you trust them.** PayPal holds the money. AI checks the item in the buyer's hands. The seller is paid the moment it's the real thing, and never if it isn't.

**Live:** https://avowly.vercel.app · **Judges:** [testing guide](docs/JUDGE_TESTING.md) · **Docs:** [/docs](https://avowly.vercel.app/docs) · **Agents:** `https://avowly.vercel.app/api/mcp`

Runs on the PayPal sandbox. Every payment step is a real PayPal API call; no real money moves.

## The problem

Buying from a stranger still runs on cash, hope and screenshots.

- A UK bank (TSB) contacted 100 Facebook Marketplace sellers and found **34% of the listings were fraudulent** (2023).
- Reported US fraud losses reached **$12.5B** in 2024, with online shopping the second most reported category (FTC).
- Cash and instant transfers protect nobody. Sellers fear "empty box" claims, buyers fear swapped or locked devices, and rental deposits are argued from memory.

Escrow apps exist, but in each one I found, a person taps "received" and the money moves on their word. **In Avowly, the item itself releases the payment.**

## How it works

### Sale
1. **Possession proof.** The seller photographs the item beside a one-time code. A photo copied from elsewhere can't have it.
2. **PayPal hold.** The buyer approves in PayPal. Price plus buyer protection is authorized, not charged.
3. **Handoff scan.** At the meetup the buyer scans the item. The model transcribes the serial or IMEI **without being told what to expect**; plain code compares it. Items with no serial match on recorded unique marks. Devices must show their anti-theft lock off.
4. **Release.** Match: capture, and the seller receives their full price by PayPal Payouts. Mismatch: nothing is charged.
5. **Proof.** Both sides get a shareable proof page and a PDF handoff record, which goes to PayPal automatically if a dispute is opened.

### Rental: the same engine, two handoffs
One hold covers fee + protection + deposit. The fee is captured at pickup with `final_capture: false`. At return the AI compares the item with its pickup photos, and code charges only confident findings from a price list both sides saw up front, capped at the deposit. A clean return voids the rest.

### Self-spreading
- **Free scam check** ([/check](https://avowly.vercel.app/check)): paste any listing and get a verdict, plus a ready message asking the seller to verify with Avowly. The asking buyer recruits the seller.
- **Live badge and post kit:** sellers paste a verified link or badge into posts on any marketplace, and the badge shows the listing's real status.
- **Proof pages and link previews:** every completed deal is a shareable, privacy-safe proof of a good seller.

### Agents commit. People approve.
An MCP server lets AI shopping agents find verified listings and start a protected purchase. They can't move money: the tool returns a PayPal link only the human can approve, and the item still releases payment.

## The design rule: the AI reads, plain rules decide

The model reports what it sees, with a confidence. It never calls PayPal, never sees a price it could change, and treats text in photos as data, not instructions. Every capture, charge and release is decided in [`src/lib/policy.ts`](src/lib/policy.ts), covered by [unit tests](src/lib/policy.test.ts).

## Privacy

- Before any photo is stored, other people's personal information (phone numbers, names, call logs, faces) is pixelated. The original is never saved, EXIF is stripped, and if the check fails nothing is stored.
- Photos are private by default; only clean item shots can appear publicly.
- Scam-check input is never stored. IP addresses are stored only as salted hashes.
- Deal data requires a party's key; proof pages show no keys, emails or full serials.

## PayPal integration

| Capability | Used for | Code |
|---|---|---|
| JS SDK v6 | PayPal button, one-time payment session | `src/components/PayButton.tsx` |
| Orders v2 `AUTHORIZE` | Holds; redirect approval for agent purchases | `src/lib/paypal.ts`, `src/lib/deals.ts` |
| Payments v2 | Partial and final capture, void, reauthorize | `src/lib/paypal.ts`, `src/lib/store.ts` |
| Payouts | Paying sellers at release | `captureForSeller` in `src/lib/store.ts` |
| Webhooks | Signature-verified confirmations in each timeline | `src/app/api/webhooks/paypal/route.ts` |
| Disputes | Automatic evidence: PDF via `provide-evidence` | `src/lib/disputes.ts`, `src/lib/evidence.ts` |

`PayPal-Request-Id` makes every money call idempotent, and a compare-and-set status change stops double captures. Holds are renewed after the 3-day honor period, up to day 29.

## AI and sponsor tools

| Tool | How it's used |
|---|---|
| **OpenAI Responses API** (vision, strict structured outputs) | Reads possession codes, serials, marks, lock screens and accessories; compares pickup and return photos; finds personal information to blur; picks scam-check flags from a fixed list |
| **Channel3** | Live retail prices for the market check and scam check, compared only against the same brand and model number, with at least 3 offers before any verdict |
| **Model Context Protocol** (`mcp-handler`) | Agent commerce server |
| Vercel, Neon | Hosting, Postgres |

## Tested for real

- `npm test`: unit tests for every money rule, scam scoring and data sanitizing.
- `npm run test:paypal`: runs the money paths against the PayPal sandbox with a test card. Results: fee capture then void of the remainder; fee then final partial capture; a further capture refused (`AUTHORIZATION_ALREADY_CAPTURED`); void before capture; capture then payout to a sandbox seller.
- A full sale ran on the live site in the PayPal sandbox with a real phone, started by an AI agent over MCP and approved by a person in PayPal. A different phone's IMEI got MISMATCH, the anti-theft switch left on was blocked, and the right phone captured the hold and paid the seller. PayPal's webhooks confirmed each step. [Proof page](https://avowly.vercel.app/p/jz8gdc2k34f7).
- A full rental ran on the live site: a laptop with a $20 fee and $100 deposit. The renter recorded pickup; the first return photo included the charger and came back clean; a rescan without it found the missing charger, so $25 was captured from the price list and $75 released. The owner was paid $45 in total by Payouts. [Proof page](https://avowly.vercel.app/p/d6r8tnmjta2m).
- A PayPal dispute ran end to end: the sandbox buyer filed "item not received" on the sale above. PayPal's webhook reached Avowly about 3 minutes later; when PayPal moved the case to waiting for the seller, Avowly sent the handoff record PDF as `PROOF_OF_FULFILLMENT` evidence 2 seconds later with no action from the seller, and PayPal moved the case to waiting for the buyer.
- Not yet proven: web push notifications. Google's push service accepts every message Avowly sends (HTTP 201), but on the Oppo test phone none were displayed. Android phone makers often block browser notifications by default; the app now tells people which settings to change, and logs each delivery in the deal history. Email updates are the fallback that works on every phone: either party can add an address on the deal page, gets a test email at once, and each send is recorded (never the address). Set `GMAIL_USER` and `GMAIL_APP_PASSWORD`, or `RESEND_API_KEY`, to turn it on.

## Run it locally

Requires Node 20+, a PayPal sandbox app and an OpenAI key.

```bash
git clone https://github.com/angelraph/avowly
cd avowly
npm install
cp .env.example .env.local   # add your PayPal sandbox and OpenAI keys
npm run dev
```

Open http://localhost:3000. No database setup is needed: without `DATABASE_URL`, Avowly uses an embedded Postgres in `./.data`. Create US sandbox accounts as described in [SETUP.md](SETUP.md).

## Honest limits

- Sandbox only. Production would use PayPal's platform features, which need partner approval.
- The model reads; it isn't a certified inspector. Low-confidence reads ask for another photo and are never charged.
- A matching serial proves it's the listed item, not that every part works.
- Lock status comes from the device's own screen; carrier blacklist checks aren't included.
- Redaction relies on the model finding personal areas, so small or decorative text can be missed, and a box can land in the wrong place. In testing, a name in decorative script on a notebook stayed readable in one photo. Photos that show anything personal stay private to the deal's parties, and sellers are told to use a plain surface.

## License

MIT
