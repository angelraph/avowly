// Read-only check of every public page and endpoint on the live site.
const base = process.argv[2] ?? "https://avowly.vercel.app";
const pages = [
  "/", "/about", "/agents", "/browse", "/check", "/docs", "/faq", "/my", "/new", "/privacy", "/support", "/terms", "/trust",
  "/l/cap2dwkew2bu", "/l/95e7cvv333qd", "/p/jz8gdc2k34f7", "/p/d6r8tnmjta2m",
  "/p/jz8gdc2k34f7/opengraph-image", "/l/cap2dwkew2bu/opengraph-image", "/icon", "/manifest.webmanifest", "/sw.js",
  "/api/config", "/api/push", "/api/badge/jz8gdc2k34f7", "/api/mcp",
];
for (const p of pages) {
  const t = Date.now();
  try {
    const r = await fetch(base + p, { redirect: "manual" });
    const body = await r.text();
    const bad = /Application error|Internal Server Error|Unhandled Runtime Error|NEXT_NOT_FOUND/.test(body);
    console.log(String(r.status).padEnd(4), String(Date.now() - t).padStart(5) + "ms", p, r.headers.get("content-type")?.split(";")[0] ?? "", bad ? "<< ERROR TEXT IN BODY" : "");
  } catch (e) {
    console.log("FAIL", p, e.message);
  }
}
// MCP: list tools as an agent would.
const mcp = await fetch(base + "/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
});
const txt = await mcp.text();
console.log("\nMCP tools/list", mcp.status, (txt.match(/"name":"[^"]+"/g) ?? []).join(" "));
const search = await fetch(base + "/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_verified_listings", arguments: { query: "phone" } } }),
});
console.log("MCP search_verified_listings", search.status, (await search.text()).slice(0, 300));
