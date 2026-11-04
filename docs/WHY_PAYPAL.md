# Why this belongs on PayPal

Avowly is a proposal as much as a product: PayPal already has every primitive needed to make in-person and peer-to-peer deals safe, and it is the one company that can offer this at scale.

## The gap

PayPal's trust machinery was built for shipped goods. An in-person handoff leaves no tracking number, so it leaves little evidence for either side. That's why local deals still run on cash and instant transfers, outside PayPal entirely. That is volume PayPal doesn't see.

## What Avowly adds

| PayPal primitive | What Avowly turns it into |
|---|---|
| Authorization and capture | A hold that a physical item releases |
| Partial capture + void | Deposits that settle themselves, with only agreed charges |
| Payouts | Sellers paid at the handoff |
| Disputes API | Evidence that already exists when a dispute opens |
| Webhooks | A shared, verifiable timeline for both parties |

## Why PayPal would care

1. **New volume.** Each protected meetup is a PayPal transaction that would otherwise have been cash or an unprotected transfer.
2. **Better dispute evidence.** A possession photo, an identifier match and a timestamped release give an in-person deal the kind of proof a tracking number gives a shipped one.
3. **A safe role for agents.** As agents start shopping for people, Avowly's pattern keeps a human approval in PayPal and ties release to the physical world: agents commit, PayPal holds, the item releases.
4. **Distribution PayPal doesn't have to buy.** Listings, badges, scam checks and proof pages carry the PayPal payment experience onto marketplaces where it isn't the default.

## How it could ship

- Platform partner approval for platform fees and delayed disbursement, so funds never pass through Avowly.
- A "Verified handoff" option inside PayPal's goods and services flow, using the same engine.
- Evidence from verified handoffs feeding PayPal's dispute decisions.
- Device checks added through carrier and IMEI data partners.

These are proposals and estimates of value, not results: Avowly runs on the sandbox today and has no production transaction data.
