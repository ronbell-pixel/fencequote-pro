import { env } from "cloudflare:workers";
import { loadProposal } from "../../../../lib/esign";

/** Serves the company logo to customers holding a valid proposal link. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const proposal = await loadProposal((await params).token);
  const key = proposal?.company?.logo_key;
  const object = key ? await env.UPLOADS.get(key) : null;
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
}
