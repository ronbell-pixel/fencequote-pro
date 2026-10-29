import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const TEAM = "fencequote-test.cloudflareaccess.com";
const AUD = "test-aud-tag";
globalThis.__TEST_ENV__ = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD };

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === `https://${TEAM}/cdn-cgi/access/certs`)
    return Response.json({ keys: [jwk] });
  return realFetch(input, init);
};

const { getAccessUser } = await import("../lib/auth.ts");

const sign = (claims = {}, opts = {}) =>
  new SignJWT({ email: "Taylor.Morgan@Example.com", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("user-123")
    .setIssuer(opts.issuer ?? `https://${TEAM}`)
    .setAudience(opts.audience ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? privateKey);
const headersWith = (token) =>
  new Headers(token ? { "cf-access-jwt-assertion": token } : {});

test("accepts a valid Cloudflare Access token", async () => {
  const user = await getAccessUser(headersWith(await sign()), "app.example.com");
  assert.deepEqual(user, {
    id: "cf:user-123",
    email: "taylor.morgan@example.com",
    name: "Taylor Morgan",
  });
});

test("rejects missing, forged, expired, and mis-addressed tokens", async () => {
  const other = (await generateKeyPair("RS256")).privateKey;
  for (const token of [
    null,
    "not-a-jwt",
    await sign({}, { key: other }),
    await sign({}, { audience: "some-other-app" }),
    await sign({}, { issuer: "https://evil.cloudflareaccess.com" }),
    await sign({}, { exp: Math.floor(Date.now() / 1000) - 60 }),
    await sign({ email: undefined }),
  ])
    assert.equal(await getAccessUser(headersWith(token), "app.example.com"), null);
});

test("never uses the local-dev bypass outside development", async () => {
  assert.notEqual(process.env.NODE_ENV, "development");
  assert.equal(await getAccessUser(headersWith(null), "localhost:5173"), null);
});
