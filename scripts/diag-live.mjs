// Read-only diagnostics against the live database and PayPal sandbox. Prints no secrets.
// Usage: node --env-file=<path to .env.local> scripts/diag-live.mjs
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = async (sql, args = []) => (await pool.query(sql, args)).rows;

console.log("VAPID configured locally:", !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY));
console.log("\n== push subscriptions ==");
for (const r of await q(`select role, listing_id, deal_id, split_part(endpoint,'/',3) as host, created_at from push_subscriptions order by created_at`)) console.log(r);

console.log("\n== notify / push related events ==");
for (const r of await q(`select type, deal_id, created_at from events where type ilike '%push%' or type ilike '%notif%' order by created_at`)) console.log(r);

console.log("\n== dispute events ==");
for (const r of await q(`select type, deal_id, payload, created_at from events where type ilike '%dispute%' order by created_at`)) console.log(r);

console.log("\n== webhook events, last 15 ==");
for (const r of await q(`select type, deal_id, created_at from events where type ilike 'webhook%' or type ilike 'paypal.webhook%' order by created_at desc limit 15`)) console.log(r);

console.log("\n== event types overall ==");
for (const r of await q(`select type, count(*)::int n from events group by type order by n desc`)) console.log(r.type, r.n);

// PayPal disputes
const base = process.env.PAYPAL_API_BASE;
const tok = await fetch(`${base}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: "Basic " + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
}).then((r) => r.json());
const auth = { Authorization: `Bearer ${tok.access_token}` };
const d = await fetch(`${base}/v1/customer/disputes?page_size=50`, { headers: auth });
const dj = await d.json();
console.log("\n== PayPal disputes ==", d.status, "items:", dj.items?.length ?? 0);
for (const it of dj.items ?? []) console.log(it.dispute_id, it.status, it.reason, it.dispute_life_cycle_stage, it.create_time, JSON.stringify(it.disputed_transactions));

const wh = await fetch(`${base}/v1/notifications/webhooks/${process.env.PAYPAL_WEBHOOK_ID}`, { headers: auth });
const whj = await wh.json();
console.log("\n== webhook ==", wh.status, whj.url, (whj.event_types ?? []).map((e) => e.name).join(", "));

const ev = await fetch(`${base}/v1/notifications/webhooks-events?page_size=20&event_type=CUSTOMER.DISPUTE.CREATED`, { headers: auth });
const evj = await ev.json();
console.log("\n== PayPal-side dispute webhook events ==", ev.status, (evj.events ?? []).length);
for (const e of evj.events ?? []) console.log(e.id, e.event_type, e.create_time);
const ev2 = await fetch(`${base}/v1/notifications/webhooks-events?page_size=10`, { headers: auth });
const ev2j = await ev2.json();
console.log("\n== latest PayPal webhook events (any) ==");
for (const e of ev2j.events ?? []) console.log(e.event_type, e.create_time);
await pool.end();
