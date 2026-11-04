# Testing Clasp (for judges)

**Live demo:** https://clasp-nine.vercel.app. No install or API key needed: all keys stay on the server. Everything runs on the PayPal sandbox, so no real money moves.

**Sandbox logins are in the Devpost "testing instructions" field**, not in this public repo. Log in with them only inside the PayPal window.

## 2-minute tour (no items needed)

1. **Scam check:** open [/check](https://clasp-nine.vercel.app/check) and paste:
   > Brand new iPhone 15 Pro only $120. I'm overseas so my shipper will deliver. Send a $50 deposit by gift card today, many people want it.

   Expect **High risk**, with the reasons and a message to send the seller.
2. **The engine:** read [Docs](https://clasp-nine.vercel.app/docs) and [`src/lib/policy.ts`](../src/lib/policy.ts).
3. **Agent tools:** connect any MCP client to `https://clasp-nine.vercel.app/api/mcp`, or see [/agents](https://clasp-nine.vercel.app/agents).

## Full sale (10 minutes, any item with a serial number)

Use two browser windows; a normal one (seller) and a private one (buyer).

1. **Seller:** open [/new](https://clasp-nine.vercel.app/new), choose Sell, and use the sandbox **seller email** as "PayPal email to get paid".
2. Write the one-time code on paper. Add a photo of the paper beside the item, and a photo of its serial number. Tap **Verify with AI**, and copy the listing link.
3. **Buyer:** open the link in the private window, tap the PayPal button, log in with the sandbox **buyer** login, choose the card, and complete. You land in the deal room: **CLASPED**.
4. **Try the fraud case:** in the deal room, upload a photo of a *different* serial number. Expect **MISMATCH**, and nothing charged.
5. **Real handoff:** upload the real serial. For phones and tablets, add the Find My / Find Hub screen with the switch off. Expect **MATCHED**, then tap **Release**.
6. Open the proof page and download the handoff record PDF.

## Rental

As above, but choose **Rent out**, set a deposit and list a charger with a price. Record pickup with the charger visible, then scan the return without it from the owner's window. Expect the charger price **kept** and the rest released.

## Run the checks yourself

```bash
npm install
npm test                 # money rules, scam scoring, data sanitizing
npm run test:paypal      # needs your own sandbox keys in .env.local
```
