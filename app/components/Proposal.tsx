"use client";
import { useState } from "react";
import SignaturePad, { type SignatureValue } from "../SignaturePad";
import { Ctx, DraftSection, Icon, TenantLogo, materialName, money } from "./shared";

export function Proposal({
  ctx,
  result,
  sections,
  gates,
  addons,
  customer,
  notes,
  onApprove,
  accepting,
  onDone,
}: {
  ctx: Ctx;
  result: any;
  sections: DraftSection[];
  gates: any[];
  addons: { id: string; quantity: number }[];
  customer: any;
  notes: string;
  onApprove: (n: string, s: NonNullable<SignatureValue>) => void;
  accepting: boolean;
  onDone: () => void;
}) {
  const [approved, setApproved] = useState(false),
    [name, setName] = useState(
      `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`,
    ),
    [consent, setConsent] = useState(false),
    [signature, setSignature] = useState<SignatureValue>(null);
  const lines = [
    ...sections.map((s) => ({
      key: s.key,
      title: `${s.name} · ${materialName(ctx, s.materialId)}`,
      detail: [s.description, `${s.length} linear feet`].filter(Boolean).join(" · "),
      price:
        s.length *
        Number(ctx.materials.find((m) => m.id === s.materialId)?.sell_price_per_foot || 0),
    })),
    ...gates.map((g) => {
      const gate = ctx.gates.find((x) => x.id === g.gateId);
      return {
        key: g.key,
        title: gate?.description ?? "Gate",
        detail: `${gate?.width ?? ""} ft wide · qty ${g.quantity}`,
        price: Number(gate?.sell_price || 0) * g.quantity,
      };
    }),
    ...addons.map((a) => {
      const addon = ctx.addons.find((x) => x.id === a.id);
      return {
        key: a.id,
        title: addon?.name ?? "Extra",
        detail:
          addon?.pricing_mode === "per_foot"
            ? `${a.quantity} linear feet`
            : addon?.pricing_mode === "per_unit"
              ? `Qty ${a.quantity}`
              : "Flat rate",
        price: Number(addon?.customer_price || 0) * a.quantity,
      };
    }),
  ];
  const discount = lines.reduce((s, l) => s + l.price, 0) - result.subtotal;
  return (
    <div className="modal proposalModal">
      <div className="proposalWrap">
        <div className="proposalTools">
          <button className="iconBtn" aria-label="Close proposal" onClick={onDone}>
            <Icon name="close" />
          </button>
          <strong>Customer proposal</strong>
          <span />
          <button className="quiet" onClick={() => window.print()}>
            <Icon name="download" size={16} /> Print / PDF
          </button>
        </div>
        <article
          className="proposal"
          style={
            {
              "--proposal-primary": ctx.company.primary_color,
              "--proposal-secondary": ctx.company.secondary_color,
              "--proposal-accent": ctx.company.accent_color,
            } as React.CSSProperties
          }
        >
          <header>
            <div className="proposalBrand">
              <TenantLogo company={ctx.company} large />
              <div>
                <h2>{ctx.company.name}</h2>
                <small>
                  {ctx.company.phone} · {ctx.company.website}
                </small>
              </div>
            </div>
            <div>
              <strong>Proposal</strong>
              <span>{result.estimateNumber} · V1</span>
            </div>
          </header>
          <div className="proposalIntro">
            <div>
              <small>Prepared for</small>
              <h1>
                {customer?.first_name} {customer?.last_name}
              </h1>
              <p>
                {customer?.property_address}
                <br />
                {ctx.company.city}, {ctx.company.state}
              </p>
            </div>
            <div>
              <p>
                <span>Estimate date</span>
                <b>{new Date().toLocaleDateString()}</b>
              </p>
              <p>
                <span>Valid for</span>
                <b>{ctx.company.quote_expiration_days} days</b>
              </p>
            </div>
          </div>
          <div
            className="proposalScope"
            style={{ background: ctx.company.primary_color }}
          >
            <small>Your project</small>
            <h2>A professionally installed fence, built for your property.</h2>
            <p>{notes}</p>
            <div className="proposalStats">
              <div>
                <strong>{sections.reduce((s, x) => s + x.length, 0)}</strong>
                <span>Linear feet</span>
              </div>
              <div>
                <strong>{sections.length}</strong>
                <span>Fence sections</span>
              </div>
              <div>
                <strong>{gates.reduce((n, g) => n + g.quantity, 0)}</strong>
                <span>Gates</span>
              </div>
              <div>
                <strong>{addons.length}</strong>
                <span>Extras</span>
              </div>
            </div>
          </div>
          {lines.map((l) => (
            <div className="proposalLine" key={l.key}>
              <div>
                <span>{l.title}</span>
                <small>{l.detail}</small>
              </div>
              <b>{money(l.price)}</b>
            </div>
          ))}
          <div className="proposalTotals">
            {discount > 0.5 && (
              <p>
                <span>Discount</span>
                <b>−{money(discount)}</b>
              </p>
            )}
            <p>
              <span>Subtotal</span>
              <b>{money(result.subtotal)}</b>
            </p>
            <p>
              <span>Sales tax</span>
              <b>{money(result.total - result.subtotal)}</b>
            </p>
            <p className="grand">
              <span>Project total</span>
              <b>{money(result.total)}</b>
            </p>
            <p className="deposit">
              <span>Deposit to schedule</span>
              <b>{money(result.deposit)}</b>
            </p>
          </div>
          <div className="approval">
            <small>Approve your proposal</small>
            <h2>Let’s build your fence.</h2>
            <label>
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />{" "}
              {ctx.company.approval_text}
            </label>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              I agree to sign electronically. My electronic signature is legally
              binding.
            </label>
            <div className="approvalInputs">
              <label>
                Customer name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <SignaturePad name={name} onChange={setSignature} />
            {result.acceptError && (
              <p className="pageError">{result.acceptError}</p>
            )}
            <button
              className="approve"
              disabled={
                !approved || !consent || !name.trim() || !signature || accepting
              }
              onClick={() => signature && onApprove(name, signature)}
            >
              {accepting
                ? "Recording signature…"
                : `Accept & sign · ${money(result.total)}`}
            </button>
            <p className="approvalRemote">
              Customer not here? Close this proposal, open {result.estimateNumber}{" "}
              under Estimates, and send them the e-signature link.
            </p>
          </div>
          <footer>
            {ctx.company.name} · {ctx.company.address}, {ctx.company.city},{" "}
            {ctx.company.state} · {ctx.company.phone}
            <br />
            <span>{ctx.company.proposal_terms}</span>
            <br />
            <span>{ctx.company.proposal_footer}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
