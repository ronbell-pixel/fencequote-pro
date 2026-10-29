"use client";
import { useState } from "react";
import type { ProposalRecord } from "../lib/esign";
import SignaturePad, { type SignatureValue } from "./SignaturePad";

type Proposal = NonNullable<ProposalRecord>;
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default function SignProposal({ proposal, consent }: { proposal: Proposal; consent: string }) {
  const { company, customer, snapshot } = proposal;
  const [record, setRecord] = useState(proposal.acceptance),
    [name, setName] = useState(customer ? `${customer.first_name} ${customer.last_name}` : ""),
    [email, setEmail] = useState(customer?.email ?? ""),
    [signature, setSignature] = useState<SignatureValue>(null),
    [agreeTerms, setAgreeTerms] = useState(false),
    [agreeEsign, setAgreeEsign] = useState(false),
    [declining, setDeclining] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  const submit = async (decision: "accepted" | "declined") => {
    setBusy(true);
    setError("");
    const r = await fetch("/api/acceptance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: proposal.token,
        decision,
        customerName: name,
        signerEmail: email,
        approved: agreeTerms,
        consent: agreeEsign,
        reason,
        signatureMethod: signature?.method,
        signature: signature?.method === "typed" ? signature.text : undefined,
        signatureImage: signature?.method === "drawn" ? signature.image : undefined,
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Something went wrong. Please try again.");
    setRecord({
      customer_name: name,
      signer_email: email,
      signature: signature?.method === "typed" ? signature.text : name,
      signature_method: signature?.method ?? "typed",
      signature_image: signature?.method === "drawn" ? signature.image : null,
      document_hash: j.documentHash,
      accepted_at: j.acceptedAt,
      approved_amount: proposal.total,
      decision,
      decline_reason: reason,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canSign = !!name.trim() && !!signature && agreeTerms && agreeEsign && !busy;
  const lines = [
    ...(snapshot.sections ?? []).map((s: any) => ({
      title: [s.material, s.style].filter(Boolean).join(" · ") || s.name,
      detail: [s.name, s.height, s.color, s.length ? `${s.length} linear ft` : ""].filter(Boolean).join(" · "),
      price: s.price,
    })),
    ...(snapshot.gates ?? []).map((g: any) => ({ title: g.description, detail: `Qty ${g.quantity}`, price: g.price })),
    ...(snapshot.addons ?? []).map((a: any) => ({ title: a.name, detail: a.quantity > 1 ? `Qty ${a.quantity}` : "Included service", price: a.price })),
  ];
  const feet = (snapshot.sections ?? []).reduce((n: number, s: any) => n + Number(s.length || 0), 0);
  const initials = company.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("");

  return (
    <div
      className="esign"
      style={{ "--brand": company.primary_color, "--brand-2": company.secondary_color, "--brand-accent": company.accent_color } as React.CSSProperties}
    >
      <header className="esignTop">
        <div className="esignBrand">
          {company.logo_key ? (
            <img src={`/p/${proposal.token}/logo`} alt={`${company.name} logo`} />
          ) : (
            <span>{initials}</span>
          )}
          <div>
            <strong>{company.name}</strong>
            <small>{[company.phone, company.website].filter(Boolean).join(" · ")}</small>
          </div>
        </div>
        <button className="esignGhost" onClick={() => window.print()}>
          Download PDF
        </button>
      </header>

      {record && (
        <div className={`esignBanner ${record.decision === "declined" ? "declined" : ""}`} role="status">
          <b>{record.decision === "declined" ? "–" : "✓"}</b>
          <div>
            <strong>{record.decision === "declined" ? "You declined this proposal" : "Signed — thank you!"}</strong>
            <span>
              {record.decision === "declined"
                ? `${company.name} has been notified and may follow up with options.`
                : `${company.name} will contact you to collect the ${money(proposal.deposit)} deposit and schedule your installation.`}
            </span>
          </div>
        </div>
      )}

      <main className="esignGrid">
        <article className="esignDoc">
          <section className="esignHero">
            <small>
              Proposal {proposal.estimateNumber} · Version {proposal.version}
            </small>
            <h1>
              {customer ? `${customer.first_name}, here’s your fence proposal.` : "Your fence proposal"}
            </h1>
            <p>{customer?.property_address}</p>
            <dl>
              <div>
                <dt>Project total</dt>
                <dd>{money(proposal.total)}</dd>
              </div>
              <div>
                <dt>Deposit to schedule</dt>
                <dd>{money(proposal.deposit)}</dd>
              </div>
              {feet > 0 && (
                <div>
                  <dt>Fence length</dt>
                  <dd>{feet} ft</dd>
                </div>
              )}
              <div>
                <dt>{proposal.expired ? "Expired" : "Valid until"}</dt>
                <dd>{date(proposal.expiresAt)}</dd>
              </div>
            </dl>
          </section>

          {snapshot.customerNotes && (
            <section className="esignCard">
              <h2>Project notes</h2>
              <p className="esignNotes">{snapshot.customerNotes}</p>
            </section>
          )}

          <section className="esignCard">
            <h2>What’s included</h2>
            {lines.length ? (
              <ul className="esignLines">
                {lines.map((l, i) => (
                  <li key={i}>
                    <div>
                      <strong>{l.title}</strong>
                      <span>{l.detail}</span>
                    </div>
                    {l.price != null && <b>{money(l.price)}</b>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="esignMuted">Full scope details are available from {company.name} on request.</p>
            )}
            <dl className="esignTotals">
              <div>
                <dt>Subtotal</dt>
                <dd>{money(proposal.subtotal)}</dd>
              </div>
              <div>
                <dt>Sales tax</dt>
                <dd>{money(proposal.total - proposal.subtotal)}</dd>
              </div>
              <div className="grand">
                <dt>Project total</dt>
                <dd>{money(proposal.total)}</dd>
              </div>
              <div className="deposit">
                <dt>Deposit due to schedule</dt>
                <dd>{money(proposal.deposit)}</dd>
              </div>
            </dl>
          </section>

          {(snapshot.terms || company.proposal_terms) && (
            <section className="esignCard">
              <h2>Terms</h2>
              <p className="esignMuted">{snapshot.terms || company.proposal_terms}</p>
            </section>
          )}

          {record && record.decision !== "declined" && (
            <section className="esignCard esignCert">
              <h2>Signature certificate</h2>
              <div className="esignSigImage">
                {record.signature_image ? (
                  <img src={record.signature_image} alt={`Signature of ${record.customer_name}`} />
                ) : (
                  <span className="esignScript">{record.signature}</span>
                )}
              </div>
              <dl>
                <div><dt>Signed by</dt><dd>{record.customer_name}{record.signer_email ? ` · ${record.signer_email}` : ""}</dd></div>
                <div><dt>Signed at</dt><dd>{stamp(record.accepted_at)}</dd></div>
                <div><dt>Method</dt><dd>{record.signature_method === "drawn" ? "Hand-drawn electronic signature" : "Typed electronic signature"}</dd></div>
                <div><dt>Amount approved</dt><dd>{money(record.approved_amount)}</dd></div>
                {record.ip_address && <div><dt>IP address</dt><dd>{record.ip_address}</dd></div>}
                <div><dt>Document fingerprint</dt><dd className="mono">SHA-256 {record.document_hash}</dd></div>
              </dl>
            </section>
          )}

          <footer className="esignFoot">
            {company.legal_name || company.name} · {[company.address, company.city, company.state].filter(Boolean).join(", ")}
            {company.proposal_footer && <span>{company.proposal_footer}</span>}
          </footer>
        </article>

        {!record && (
          <aside className="esignSign" id="sign" aria-labelledby="sign-title">
            {proposal.expired ? (
              <>
                <h2 id="sign-title">This proposal has expired</h2>
                <p className="esignMuted">
                  Prices were valid until {date(proposal.expiresAt)}. Contact {company.name}
                  {company.phone ? ` at ${company.phone}` : ""} for an updated quote.
                </p>
              </>
            ) : declining ? (
              <>
                <h2 id="sign-title">Decline this proposal</h2>
                <p className="esignMuted">Optional: let {company.name} know why, so they can follow up with options.</p>
                <label className="esignField">
                  <span>Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
                <label className="esignField">
                  <span>Reason (optional)</span>
                  <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Over budget, went with another style…" />
                </label>
                {error && <p className="esignError" role="alert">{error}</p>}
                <button className="esignPrimary danger" disabled={!name.trim() || busy} onClick={() => submit("declined")}>
                  {busy ? "Sending…" : "Decline proposal"}
                </button>
                <button className="esignLink" onClick={() => setDeclining(false)}>Back to signing</button>
              </>
            ) : (
              <>
                <small className="esignStep">Ready to build?</small>
                <h2 id="sign-title">Approve &amp; sign</h2>
                <label className="esignField">
                  <span>Full legal name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
                <label className="esignField">
                  <span>Email for your signed copy</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <SignaturePad name={name} onChange={setSignature} />
                <label className="esignCheck">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                  <span>{company.approval_text || "I approve this proposal and agree to the stated terms."}</span>
                </label>
                <label className="esignCheck">
                  <input type="checkbox" checked={agreeEsign} onChange={(e) => setAgreeEsign(e.target.checked)} />
                  <span>{consent}</span>
                </label>
                {error && <p className="esignError" role="alert">{error}</p>}
                <button className="esignPrimary" disabled={!canSign} onClick={() => submit("accepted")}>
                  {busy ? "Signing…" : `Accept & sign · ${money(proposal.total)}`}
                </button>
                <p className="esignFine">
                  🔒 Your signature, the time, and your IP address are recorded with a fingerprint of this exact proposal.
                </p>
                <button className="esignLink" onClick={() => setDeclining(true)}>Not ready? Decline this proposal</button>
              </>
            )}
          </aside>
        )}
      </main>
      {!record && !proposal.expired && (
        <a className="esignJump" href="#sign">
          Review &amp; sign · {money(proposal.total)}
        </a>
      )}
    </div>
  );
}
