import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Staff sign-in through Cloudflare Access.
 *
 * Cloudflare Access sits in front of the Worker and handles the login screen
 * (one-time PIN email, Google, Microsoft, ...). Every request it lets through
 * carries a signed JWT in the `Cf-Access-Jwt-Assertion` header. We verify that
 * JWT's signature, issuer and audience here, so the app stays locked even if an
 * Access policy is misconfigured or someone reaches the Worker another way.
 *
 * Required Worker variables (wrangler.jsonc `vars`):
 *   CF_ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
 *   CF_ACCESS_AUD          the Application Audience (AUD) tag of the Access app
 */

export type AuthUser = { id: string; email: string; name: string };

type AccessEnv = { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string };

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
export const DEV_USER: AuthUser = {
  id: "local-super-admin",
  email: "admin@fencequote.local",
  name: "Jordan Ellis",
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function teamIssuer(domain: string) {
  const host = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}`;
}

/** Turns "jordan.ellis@x.com" into "Jordan Ellis" for first-time users. */
export function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

/** True only for `vite dev` on this machine. Production builds compile this to false. */
export function isLocalDev(host: string) {
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return process.env.NODE_ENV === "development" && LOCAL_HOSTS.includes(hostname);
}

/** Returns the signed-in staff member, or null if the request has no valid Access token. */
export async function getAccessUser(headers: Headers, host: string): Promise<AuthUser | null> {
  if (isLocalDev(host)) return DEV_USER;
  const { CF_ACCESS_TEAM_DOMAIN: team, CF_ACCESS_AUD: aud } = env as unknown as AccessEnv;
  const token = headers.get("cf-access-jwt-assertion");
  if (!token || !team || !aud) return null;
  const issuer = teamIssuer(team);
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, { issuer, audience: aud });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || !payload.sub) return null;
    return { id: `cf:${payload.sub}`, email, name: nameFromEmail(email) };
  } catch {
    return null;
  }
}
