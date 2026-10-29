import { db, id, now } from "./tenant";

/** Text the signer agrees to before signing (ESIGN Act / UETA consumer consent). */
export const ESIGN_CONSENT =
  "I agree to use electronic records and signatures for this proposal. My electronic signature is legally binding and has the same effect as a handwritten signature. I can download a copy of this signed proposal.";

const MAX_SIGNATURE_BYTES = 200_000;

let schemaReady: Promise<void> | null = null;

/** Adds the e-signature audit columns to existing databases. Safe to call on every request. */
export function ensureEsignSchema() {
  schemaReady ??= (async () => {
    const d1 = db();
    await d1.prepare("CREATE TABLE IF NOT EXISTS quote_acceptances (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,estimate_id TEXT NOT NULL,version_id TEXT NOT NULL,customer_name TEXT NOT NULL,signature TEXT NOT NULL,approved_amount REAL NOT NULL,accepted_at TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(company_id,version_id))").run();
    const existing = new Set(((await d1.prepare("PRAGMA table_info(quote_acceptances)").all()).results as { name: string }[]).map((c) => c.name));
    const columns: [string, string][] = [
      ["signer_email", "TEXT"],
      ["signature_method", "TEXT NOT NULL DEFAULT 'typed'"],
      ["signature_image", "TEXT"],
      ["consent_text", "TEXT"],
      ["document_hash", "TEXT"],
      ["ip_address", "TEXT"],
      ["user_agent", "TEXT"],
      ["decision", "TEXT NOT NULL DEFAULT 'accepted'"],
      ["decline_reason", "TEXT"],
    ];
    for (const [name, type] of columns) if (!existing.has(name)) await d1.prepare(`ALTER TABLE quote_acceptances ADD COLUMN ${name} ${type}`).run();
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ProposalRecord = Awaited<ReturnType<typeof loadProposal>>;

/** Loads everything the public signing page needs from an approval token. Returns null for unknown tokens. */
export async function loadProposal(token: string) {
  if (!/^[0-9a-f-]{40,100}$/i.test(token)) return null;
  await ensureEsignSchema();
  const d1 = db();
  const version = await d1
    .prepare("SELECT v.id,v.company_id,v.estimate_id,v.version,v.snapshot,v.created_at,e.estimate_number,e.status,e.subtotal,e.total,e.deposit,e.customer_id FROM estimate_versions v JOIN estimates e ON e.id=v.estimate_id AND e.company_id=v.company_id WHERE v.approval_token=?")
    .bind(token)
    .first<any>();
  if (!version) return null;
  const [company, customer, acceptance] = await Promise.all([
    d1.prepare("SELECT c.id,c.name,c.legal_name,s.address,s.city,s.state,s.zip,s.phone,s.email,s.website,s.logo_key,s.primary_color,s.secondary_color,s.accent_color,s.quote_expiration_days,s.proposal_terms,s.proposal_footer,s.approval_text FROM companies c JOIN company_settings s ON s.company_id=c.id WHERE c.id=?").bind(version.company_id).first<any>(),
    d1.prepare("SELECT first_name,last_name,property_address,email,mobile FROM customers WHERE id=? AND company_id=?").bind(version.customer_id, version.company_id).first<any>(),
    d1.prepare("SELECT customer_name,signer_email,signature,signature_method,signature_image,consent_text,document_hash,ip_address,user_agent,approved_amount,accepted_at,decision,decline_reason FROM quote_acceptances WHERE version_id=? AND company_id=?").bind(version.id, version.company_id).first<any>(),
  ]);
  const snapshotText = typeof version.snapshot === "string" ? version.snapshot : JSON.stringify(version.snapshot);
  const expiresAt = new Date(new Date(version.created_at).getTime() + Number(company?.quote_expiration_days ?? 30) * 86_400_000).toISOString();
  return {
    token,
    versionId: version.id as string,
    companyId: version.company_id as string,
    estimateId: version.estimate_id as string,
    estimateNumber: version.estimate_number as string,
    version: version.version as number,
    status: version.status as string,
    createdAt: version.created_at as string,
    expiresAt,
    expired: !acceptance && Date.now() > new Date(expiresAt).getTime(),
    total: Number(version.total),
    subtotal: Number(version.subtotal),
    deposit: Number(version.deposit),
    snapshot: JSON.parse(snapshotText),
    documentHash: await sha256(snapshotText),
    company,
    customer,
    acceptance: acceptance ?? null,
  };
}

/** Marks a sent proposal as viewed the first time the customer opens it. */
export async function recordView(p: NonNullable<ProposalRecord>, userAgent: string) {
  if (!["sent", "ready"].includes(p.status) || p.acceptance) return;
  const stamp = now(), d1 = db();
  await d1.batch([
    d1.prepare("UPDATE estimates SET status='viewed',updated_at=? WHERE id=? AND company_id=? AND status IN ('sent','ready')").bind(stamp, p.estimateId, p.companyId),
    d1.prepare("INSERT INTO activity_log (id,company_id,estimate_id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(id("act"), p.companyId, p.estimateId, "customer", "proposal_viewed", JSON.stringify({ userAgent: userAgent.slice(0, 300) }), stamp),
  ]);
}

/** Validates a drawn signature data URL. */
export function validSignatureImage(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/png;base64,") && value.length < MAX_SIGNATURE_BYTES;
}

/** Returns the existing signing token for an estimate, creating a version from saved line items if none exists. */
export async function ensureSigningToken(companyId: string, estimateId: string, userId: string) {
  const d1 = db();
  const existing = await d1.prepare("SELECT approval_token FROM estimate_versions WHERE estimate_id=? AND company_id=? ORDER BY version DESC LIMIT 1").bind(estimateId, companyId).first<{ approval_token: string }>();
  if (existing) return existing.approval_token;
  const estimate = await d1.prepare("SELECT * FROM estimates WHERE id=? AND company_id=?").bind(estimateId, companyId).first<any>();
  if (!estimate) throw Object.assign(new Error("Estimate not found"), { status: 404 });
  const settings = await d1.prepare("SELECT proposal_terms FROM company_settings WHERE company_id=?").bind(companyId).first<any>();
  const [sections, gates, addons, notes] = await Promise.all([
    d1.prepare("SELECT s.section_name,s.description,s.length_feet,s.sell_price,m.name,s.style,s.height,s.color FROM estimate_sections s LEFT JOIN materials m ON m.id=s.material_id AND m.company_id=s.company_id WHERE s.estimate_id=? AND s.company_id=?").bind(estimateId, companyId).all<any>(),
    d1.prepare("SELECT g.description,eg.quantity,eg.sell_price FROM estimate_gates eg JOIN gates g ON g.id=eg.gate_id AND g.company_id=eg.company_id WHERE eg.estimate_id=? AND eg.company_id=?").bind(estimateId, companyId).all<any>(),
    d1.prepare("SELECT a.name,ea.quantity,ea.customer_price FROM estimate_addons ea JOIN addons a ON a.id=ea.addon_id AND a.company_id=ea.company_id WHERE ea.estimate_id=? AND ea.company_id=?").bind(estimateId, companyId).all<any>(),
    d1.prepare("SELECT body FROM estimate_notes WHERE estimate_id=? AND company_id=? AND visibility='customer' ORDER BY created_at DESC LIMIT 1").bind(estimateId, companyId).first<any>(),
  ]);
  const token = crypto.randomUUID() + crypto.randomUUID(), stamp = now();
  const snapshot = {
    companyId, estimateNumber: estimate.estimate_number, total: estimate.total, subtotal: estimate.subtotal, deposit: estimate.deposit,
    sections: sections.results.map((x: any) => ({ name: x.section_name, description: x.description, length: x.length_feet, price: x.sell_price, material: x.name, style: x.style, height: x.height, color: x.color })),
    gates: gates.results.map((x: any) => ({ description: x.description, quantity: x.quantity, price: x.sell_price })),
    addons: addons.results.map((x: any) => ({ name: x.name, quantity: x.quantity, price: x.customer_price })),
    customerNotes: notes?.body ?? "", terms: settings?.proposal_terms ?? "",
  };
  await d1.prepare("INSERT INTO estimate_versions (id,company_id,estimate_id,version,approval_token,snapshot,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id("ver"), companyId, estimateId, estimate.version ?? 1, token, JSON.stringify(snapshot), userId, stamp, stamp).run();
  return token;
}
