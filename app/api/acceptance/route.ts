import { apiError, db, id, now } from "../../../lib/tenant";
import { ESIGN_CONSENT, loadProposal, validSignatureImage } from "../../../lib/esign";

const fail = (message: string, status: number) => Object.assign(new Error(message), { status });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const proposal = await loadProposal(String(body.token ?? ""));
    if (!proposal) throw fail("Approval link is invalid", 404);
    if (proposal.acceptance) throw fail(proposal.acceptance.decision === "declined" ? "This proposal was already declined" : "This proposal was already accepted", 409);
    if (proposal.status === "approved") throw fail("This proposal was already accepted", 409);
    if (proposal.expired) throw fail("This proposal has expired. Please contact us for an updated quote.", 410);

    const decision = body.decision === "declined" ? "declined" : "accepted";
    const name = String(body.customerName ?? "").trim().slice(0, 120);
    const email = String(body.signerEmail ?? "").trim().slice(0, 200) || null;
    const method = body.signatureMethod === "drawn" ? "drawn" : "typed";
    const typed = String(body.signature ?? "").trim().slice(0, 120);
    const image = method === "drawn" ? body.signatureImage : null;

    if (!name) return Response.json({ error: "Your full name is required" }, { status: 400 });
    if (decision === "accepted") {
      if (body.approved !== true || body.consent !== true) return Response.json({ error: "Please agree to the proposal terms and to signing electronically" }, { status: 400 });
      if (method === "typed" && !typed) return Response.json({ error: "Type your full name to sign" }, { status: 400 });
      if (method === "drawn" && !validSignatureImage(image)) return Response.json({ error: "Draw your signature to sign" }, { status: 400 });
    }

    const stamp = now(), d1 = db();
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 300);
    await d1.batch([
      d1.prepare("INSERT INTO quote_acceptances (id,company_id,estimate_id,version_id,customer_name,signature,approved_amount,accepted_at,created_at,signer_email,signature_method,signature_image,consent_text,document_hash,ip_address,user_agent,decision,decline_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
        id("accept"), proposal.companyId, proposal.estimateId, proposal.versionId, name,
        decision === "accepted" ? (method === "typed" ? typed : name) : "",
        decision === "accepted" ? proposal.total : 0, stamp, stamp, email, method, image,
        decision === "accepted" ? ESIGN_CONSENT : null, proposal.documentHash, ip, userAgent, decision,
        decision === "declined" ? String(body.reason ?? "").trim().slice(0, 1000) || null : null,
      ),
      d1.prepare("UPDATE estimates SET status=?,updated_at=? WHERE id=? AND company_id=?").bind(decision === "accepted" ? "approved" : "declined", stamp, proposal.estimateId, proposal.companyId),
      d1.prepare("INSERT INTO activity_log (id,company_id,estimate_id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(
        id("act"), proposal.companyId, proposal.estimateId, "customer", decision === "accepted" ? "customer_accepted" : "customer_declined",
        JSON.stringify({ name, amount: proposal.total, method, ip, documentHash: proposal.documentHash }), stamp,
      ),
    ]);
    return Response.json({ status: decision === "accepted" ? "approved" : "declined", acceptedAt: stamp, documentHash: proposal.documentHash });
  } catch (error) {
    return apiError(error);
  }
}
