import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the FenceQuote Pro application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /FenceQuote Pro/);
  assert.match(html, /Measure the yard/);
  assert.match(html, /Sign in with ChatGPT/);
  assert.match(html, /same email address your company owner invited/i);
  assert.doesNotMatch(html, /Authentication required|Workspace unavailable/);
});

test("keeps satellite yard measurement and geocoding wired into estimates", async () => {
  const [measure, geocode, page] = await Promise.all([
    readFile(new URL("../app/YardMeasure.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/geocode/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(measure, /World_Imagery/);
  assert.match(measure, /maxNativeZoom: 19/);
  assert.match(measure, /Back-left house corner/);
  assert.match(measure, /Use this fence run/);
  assert.match(measure, /final footage onsite/i);
  assert.doesNotMatch(measure, /L\.polygon/);
  assert.match(geocode, /geocoding\.geo\.census\.gov/);
  assert.match(page, /chatGPTSignInPath/);
});

test("keeps customer and estimate operations wired into the product", async () => {
  const [app, estimatesRoute] = await Promise.all([
    readFile(new URL("../app/FenceQuoteApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/estimates/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /Add customer/);
  assert.match(app, /Export CSV/);
  assert.match(app, /MOVE THROUGH PIPELINE/);
  assert.match(estimatesRoute, /export async function PATCH/);
  assert.match(estimatesRoute, /estimate_status_changed/);
});

test("keeps customer e-signature wired end to end", async () => {
  const [page, signer, pad, acceptance, esign, app] = await Promise.all([
    readFile(new URL("../app/p/[token]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SignProposal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SignaturePad.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/acceptance/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/esign.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/FenceQuoteApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /recordView/);
  assert.match(signer, /Accept & sign/);
  assert.match(signer, /Signature certificate/);
  assert.match(pad, /toDataURL\("image\/png"\)/);
  assert.match(acceptance, /consent !== true/);
  assert.match(acceptance, /expired/);
  assert.match(acceptance, /cf-connecting-ip/);
  assert.match(esign, /SHA-256/);
  assert.match(app, /CUSTOMER E-SIGNATURE/);
});
