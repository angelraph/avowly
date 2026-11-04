// Set SANDBOX_SELLER_EMAIL to a sandbox business account. 4111... is the standard test card number.
// Exercises Avowly's money paths directly against the PayPal SANDBOX with a test card.
const B = process.env.PAYPAL_API_BASE;
const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
const tok = await (await fetch(`${B}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
const run = Date.now().toString(36);
let n = 0;
async function call(method, path, body) {
  const r = await fetch(B + path, {
    method,
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", Prefer: "return=representation", "PayPal-Request-Id": `mech-${run}-${n++}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j = {};
  try { j = t ? JSON.parse(t) : {}; } catch {}
  return { status: r.status, j, debug: r.headers.get("paypal-debug-id") };
}
const issue = (x) => `${x.status} ${x.j.name ?? ""} ${x.j.details?.[0]?.issue ?? ""} ${x.debug ?? ""}`.trim();

async function hold(value) {
  const o = await call("POST", "/v2/checkout/orders", {
    intent: "AUTHORIZE",
    purchase_units: [{ amount: { currency_code: "USD", value } }],
    payment_source: { card: { number: "4111111111111111", expiry: "2030-12", name: "Sandbox Tester", security_code: "123" } },
  });
  let auth = o.j.purchase_units?.[0]?.payments?.authorizations?.[0];
  console.log(`  create order: ${o.status} ${o.j.status ?? issue(o)}`);
  if (!auth && o.j.id && o.status < 300) {
    const a = await call("POST", `/v2/checkout/orders/${o.j.id}/authorize`, {});
    console.log(`  authorize: ${a.status} ${a.j.status ?? issue(a)}`);
    auth = a.j.purchase_units?.[0]?.payments?.authorizations?.[0];
  }
  return auth;
}
const cap = (id, value, final_capture) => call("POST", `/v2/payments/authorizations/${id}/capture`, { amount: { currency_code: "USD", value }, final_capture });
const show = async (id) => { const a = await call("GET", `/v2/payments/authorizations/${id}`); return a.j.status; };

console.log("A. Clean rental: fee captured, then release the rest");
let a = await hold("345.00");
if (a) {
  const c = await cap(a.id, "45.00", false);
  console.log(`  capture fee 45 (final=false): ${c.status} ${c.j.status ?? issue(c)} | auth now ${await show(a.id)}`);
  const v = await call("POST", `/v2/payments/authorizations/${a.id}/void`);
  console.log(`  void remainder: ${v.status} ${v.j.status ?? issue(v)} | auth now ${await show(a.id)}`);
}

console.log("B. Rental with damage: fee, then final partial capture");
a = await hold("345.00");
if (a) {
  const c1 = await cap(a.id, "45.00", false);
  console.log(`  capture fee 45 (final=false): ${c1.status} ${c1.j.status ?? issue(c1)}`);
  const c2 = await cap(a.id, "25.00", true);
  console.log(`  capture damage 25 (final=true): ${c2.status} ${c2.j.status ?? issue(c2)} | auth now ${await show(a.id)}`);
  const c3 = await cap(a.id, "5.00", true);
  console.log(`  third capture must be refused: ${c3.status} ${c3.j.status ?? issue(c3)}`);
}

console.log("C. Sale cancelled before capture");
a = await hold("262.50");
if (a) {
  const v = await call("POST", `/v2/payments/authorizations/${a.id}/void`);
  console.log(`  void: ${v.status} | auth now ${await show(a.id)}`);
}

console.log("D. Sale: capture price + fee, pay seller the price");
a = await hold("262.50");
if (a) {
  const c = await cap(a.id, "262.50", true);
  const br = c.j.seller_receivable_breakdown;
  console.log(`  capture: ${c.status} ${c.j.status ?? issue(c)} | PayPal fee ${br?.paypal_fee?.value} net ${br?.net_amount?.value}`);
  const p = await call("POST", "/v1/payments/payouts", {
    sender_batch_header: { sender_batch_id: `mech-${run}`, email_subject: "Avowly sandbox test" },
    items: [{ recipient_type: "EMAIL", receiver: process.env.SANDBOX_SELLER_EMAIL, amount: { currency: "USD", value: "250.00" }, sender_item_id: `mech-${run}` }],
  });
  const id = p.j.batch_header?.payout_batch_id;
  console.log(`  payout: ${p.status} ${p.j.batch_header?.batch_status ?? issue(p)}`);
  if (id) {
    await new Promise((r) => setTimeout(r, 15000));
    const s = await call("GET", `/v1/payments/payouts/${id}`);
    console.log(`  payout after 15s: batch ${s.j.batch_header?.batch_status} | item ${s.j.items?.[0]?.transaction_status}`);
  }
}
