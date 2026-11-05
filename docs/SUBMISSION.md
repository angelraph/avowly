# Avowly: Devpost submission

**Name:** Avowly
**Elevator pitch:** Pay strangers like you trust them. PayPal holds the money, AI checks the item in your hands, and the seller is paid only when it's the real thing.
**Live app:** https://avowly.vercel.app
**Try a full deal in 2 minutes:** https://avowly.vercel.app/demo
**Code:** https://github.com/angelraph/avowly
**Video:** https://youtu.be/evy2Yd8vFI8

## About the project

### Inspiration

I've watched people buy phones from strangers more times than I can count. Same routine every time: meet somewhere public, hand over cash, hope it's not a swapped phone or one that gets locked remotely an hour later. When it goes wrong, the money is gone and there's nobody to call.

It's not a small problem. When TSB, a UK bank, contacted 100 Facebook Marketplace sellers, 34% of the listings turned out to be fraudulent. Americans reported $12.5 billion in fraud losses in 2024, and online shopping was the second most reported category.

PayPal fixed trust between strangers online years ago. Nobody fixed it for the moment two strangers actually meet. That's what I wanted to build.

### What it does

Avowly ties a PayPal payment to the actual item.

- **Prove it.** The seller photographs the item next to a one-time code. A stolen photo can't have that code. AI reads the serial or IMEI, and blurs anyone's personal details before the photo is saved.
- **Hold it.** The buyer pays with PayPal, but the money is only authorized. Nothing is charged yet.
- **Check in.** At the meetup the buyer scans a QR code on the seller's phone. Only the real seller's link can show it.
- **Check it.** The buyer scans the item. The serial has to match. For phones, Find My or Find Hub has to be off, so nobody pays for a phone that can be locked later.
- **Release it.** On a match, PayPal captures the payment and the seller gets their full price through Payouts. Wrong item, locked phone, anything else: nothing is charged.

The same engine handles rentals. One hold covers the fee and the deposit. When the item comes back, AI compares it with the pickup photos, and only damage on a price list both sides agreed to can be charged. The rest of the deposit comes back by itself.

A few more things it does:

- If the buyer opens a PayPal dispute later, Avowly sends PayPal the full handoff record as evidence, on its own.
- Sellers can log in with PayPal, so buyers see "PayPal verified seller" and payouts go to that exact account.
- Sellers can ship instead of meeting. The buyer scans the item when it arrives.
- Updates by email, so it works even on phones that block browser notifications.
- AI shopping agents can find verified items and start a purchase through an MCP server, but only a human can approve the payment in PayPal.
- A free scam check: paste any listing and get a verdict, plus a message asking the seller to prove it with Avowly.
- A judge demo at /demo that runs a full deal in two minutes with no phone needed.

### What actually happened on the live site

I didn't want to claim anything I hadn't seen work, so everything below ran on the live site in the PayPal sandbox, with PayPal's own webhooks confirming each step.

- **A phone sale started by an AI agent.** An agent found my Oppo over MCP and started the purchase, and I approved it in PayPal ($262.50 held). I scanned a different phone first: Mismatch. Then the right phone with Find Hub still on: blocked. Switch off: Matched. Release captured the money and the seller got $250.
- **A real PayPal dispute.** Then I opened an "item not received" case from the buyer account. Two seconds after PayPal asked the seller to respond, Avowly had already sent the evidence PDF. PayPal passed the case back to the buyer.
- **A laptop rental.** $20 fee, $100 deposit. It came back without the charger, so $25 was kept from the agreed list and $75 went back automatically.
- **The judge demo.** $126 held, check-in, four AI checks, $120 paid out.

### How I built it

Next.js and TypeScript on Vercel, with Postgres on Neon.

PayPal is the backbone: JS SDK v6, Orders v2 with intent AUTHORIZE for the hold, Payments v2 for partial and final captures, voids and reauthorizations, Payouts to pay sellers, signature-verified webhooks, the Disputes API to send evidence, and Log in with PayPal for verified sellers.

The AI is OpenAI's Responses API with vision and strict structured outputs. It reads serials, codes, lock screens and accessories, compares rental photos, and finds personal details to blur. Channel3 gives live market prices. The agent tools run on an MCP server.

The one rule I stuck to the whole way: **the AI reads, plain rules decide.** The model only reports what it sees and how sure it is. It's never told which serial to expect, never sees a price, and never touches PayPal. Every money decision is in normal code with unit tests.

### Challenges I ran into

- **PayPal wouldn't let me hold money payable straight to a third party seller** without partner approval. So Avowly holds through its own account and pays sellers with Payouts, which also covers the buyer protection fee.
- **Real phones are messier than test data.** My phone's screen labels the IMEI "SIM slot 1" and adds a software version after it. Both broke the reader until I fixed them and added tests.
- **Privacy.** Real IMEI screenshots show other people's phone numbers. Now every photo is blurred before it's saved and the original is thrown away. My first blur silently did nothing, and I only caught it by actually looking at the output.
- **My test phone blocked notifications.** Google accepted every push I sent, but the phone never showed them. So I added email updates, and those landed in the inbox.

### Accomplishments I'm proud of

- A real sale, a real rental and a real dispute all ran end to end on the live site.
- A scam listing that literally told the AI to approve it still came back high risk.
- 52 unit tests cover every rule that moves money.

### What I learned

AI models are great at reading and bad at deciding about money. Once I split those two jobs, the product got more capable and easier to trust at the same time.

### What's next

Carrier blacklist checks for phones, PayPal partner approval so sellers get paid directly, accounts for rental businesses, and a "verified handoff" option PayPal could offer to everyone.

## Built with

paypal, next.js, typescript, react, openai, model-context-protocol, postgresql, neon, vercel, tailwindcss, drizzle, web-push, node.js

## Testing instructions (paste into Devpost; the password stays out of this repo)

The fastest way is the 2 minute demo: https://avowly.vercel.app/demo. Tap Start a demo deal, pay with the sandbox buyer below, tap "Demo: use the seller's code", then the four sample screens in order (Mismatch, One more photo, Locked, Matched), then Release. Full guide: [JUDGE_TESTING.md](JUDGE_TESTING.md).

Sandbox buyer: (email and password from the PayPal sandbox dashboard)
