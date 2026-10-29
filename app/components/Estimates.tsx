"use client";
import { useEffect, useState } from "react";
import {
  Ctx,
  EstimateTable,
  Icon,
  STATUSES,
  StatusPill,
  label,
  money,
  statusLabel,
} from "./shared";

export function Estimates({
  ctx,
  canSeeCosts,
  initialStatus = "all",
  initialQuery = "",
  notify,
  reload,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  initialStatus?: string;
  initialQuery?: string;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const [status, setStatus] = useState(initialStatus),
    [query, setQuery] = useState(initialQuery),
    [selectedId, setSelectedId] = useState<string | null>(
      () =>
        ctx.estimates.find(
          (e) => e.estimate_number.toLowerCase() === initialQuery.toLowerCase(),
        )?.id ?? null,
    );
  const selected = ctx.estimates.find((e) => e.id === selectedId) ?? null;
  const rows = ctx.estimates.filter(
    (e) =>
      (status === "all" || e.status === status) &&
      `${e.estimate_number} ${e.customer} ${e.property_address}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const updateStatus = async (nextStatus: string) => {
    if (!selected) return;
    const r = await fetch("/api/estimates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: ctx.company.id,
        asRole: ctx.session.role,
        estimateId: selected.id,
        status: nextStatus,
      }),
    });
    const j = await r.json();
    if (!r.ok) return notify(j.error ?? "Unable to update estimate");
    notify(`${selected.estimate_number} marked ${statusLabel(nextStatus)}`);
    reload();
  };
  const exportRows = () => {
    const headings = [
        "Estimate",
        "Customer",
        "Property",
        "Amount",
        "Deposit",
        "Status",
        "Updated",
      ],
      csv = [
        headings,
        ...rows.map((e) => [
          e.estimate_number,
          e.customer,
          e.property_address,
          e.total,
          e.deposit,
          statusLabel(e.status),
          e.updated_at,
        ]),
      ]
        .map((line) =>
          line
            .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n"),
      url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      a = document.createElement("a");
    a.href = url;
    a.download = `${ctx.company.slug || "fencequote"}-estimates.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${rows.length} estimates exported`);
  };
  return (
    <>
      <section className="page">
        <div className="pageHead">
          <div>
            <h1>Estimates</h1>
            <p>Create, send, and track every quote.</p>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Filter by status">
          {[["all", "All"] as const, ...STATUSES].map(([s, name]) => (
            <button
              role="tab"
              aria-selected={status === s}
              className={status === s ? "active" : ""}
              onClick={() => setStatus(s)}
              key={s}
            >
              {name}
              <span>
                {s === "all"
                  ? ctx.estimates.length
                  : ctx.estimates.filter((e) => e.status === s).length}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search estimates"
              placeholder="Search estimate, customer, or address"
            />
          </label>
          <span className="muted">{rows.length} shown</span>
          <button className="quiet" onClick={exportRows}>
            <Icon name="download" size={16} /> Export CSV
          </button>
        </div>
        <div className="card flush">
          <EstimateTable
            rows={rows}
            canSeeCosts={canSeeCosts}
            onSelect={(e) => setSelectedId(e.id)}
          />
        </div>
      </section>
      {selected && (
        <EstimateDetail
          ctx={ctx}
          notify={notify}
          estimate={selected}
          canSeeCosts={canSeeCosts}
          onClose={() => setSelectedId(null)}
          onStatus={updateStatus}
        />
      )}
    </>
  );
}

export function EstimateDetail({
  ctx,
  notify,
  estimate,
  canSeeCosts,
  onClose,
  onStatus,
}: {
  ctx: Ctx;
  notify: (s: string) => void;
  estimate: any;
  canSeeCosts: boolean;
  onClose: () => void;
  onStatus: (status: string) => void;
}) {
  return (
    <div
      className="modal detailModal"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="detailPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estimate-title"
      >
        <header>
          <div>
            <small>Estimate</small>
            <h2 id="estimate-title">{estimate.estimate_number}</h2>
          </div>
          <button className="iconBtn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="detailStatus">
          <StatusPill status={estimate.status} />
          <span>
            Updated {new Date(estimate.updated_at).toLocaleDateString()}
          </span>
        </div>
        <section>
          <small>Customer</small>
          <h3>{estimate.customer}</h3>
          <p>{estimate.property_address}</p>
        </section>
        <section>
          <small>Quote summary</small>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(estimate.subtotal)}</dd>
            </div>
            <div>
              <dt>Sales tax</dt>
              <dd>{money(estimate.total - estimate.subtotal)}</dd>
            </div>
            <div className="detailTotal">
              <dt>Total</dt>
              <dd>{money(estimate.total)}</dd>
            </div>
            <div>
              <dt>Deposit</dt>
              <dd>{money(estimate.deposit)}</dd>
            </div>
          </dl>
        </section>
        {canSeeCosts && (
          <section>
            <small>Internal financials</small>
            <dl>
              <div>
                <dt>Estimated cost</dt>
                <dd>{money(estimate.total_cost)}</dd>
              </div>
              <div>
                <dt>Gross profit</dt>
                <dd>{money(estimate.gross_profit)}</dd>
              </div>
              <div>
                <dt>Gross margin</dt>
                <dd>{Number(estimate.gross_margin ?? 0).toFixed(1)}%</dd>
              </div>
            </dl>
          </section>
        )}
        <ESignPanel
          ctx={ctx}
          estimate={estimate}
          notify={notify}
          onSent={() =>
            ["draft", "ready"].includes(estimate.status) && onStatus("sent")
          }
        />
        <section>
          <small>Move through pipeline</small>
          <div className="statusActions">
            {STATUSES.map(([status, name]) => (
              <button
                key={status}
                className={estimate.status === status ? "active" : ""}
                disabled={estimate.status === status}
                onClick={() => onStatus(status)}
              >
                {estimate.status === status && <Icon name="check" size={14} />}
                {name}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function ESignPanel({
  ctx,
  estimate,
  notify,
  onSent,
}: {
  ctx: Ctx;
  estimate: any;
  notify: (s: string) => void;
  onSent: () => void;
}) {
  const [info, setInfo] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const q = new URLSearchParams({
      estimateId: estimate.id,
      company: ctx.company.id,
      asRole: ctx.session.role,
    });
    fetch(`/api/estimates?${q}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) setInfo(j);
        else setError(j.error ?? "Unable to load signing link");
      })
      .catch(() => setError("Unable to load signing link"));
  }, [estimate.id, estimate.status, ctx.company.id, ctx.session.role]);
  const customer = ctx.customers.find((c) => c.id === estimate.customer_id);
  const link = info ? `${window.location.origin}${info.signingPath}` : "";
  const message = `Hi ${customer?.first_name ?? ""}, here is your fence proposal ${estimate.estimate_number} from ${ctx.company.name}. You can review and e-sign it here: ${link}`;
  const sig = info?.signature;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    notify("Signing link copied");
    onSent();
  };
  return (
    <section className="esignPanel">
      <small>Customer e-signature</small>
      {error && <p className="pageError">{error}</p>}
      {!info && !error && (
        <p className="esignPanelMuted">Loading signing link…</p>
      )}
      {sig?.decision === "accepted" && (
        <div className="esignPanelSigned">
          <div className="esignPanelSig">
            {sig.signature_image ? (
              <img
                src={sig.signature_image}
                alt={`Signature of ${sig.customer_name}`}
              />
            ) : (
              <span>{sig.signature}</span>
            )}
          </div>
          <p>
            <b>Signed by {sig.customer_name}</b>
            {new Date(sig.accepted_at).toLocaleString()} ·{" "}
            {sig.signature_method === "drawn" ? "drawn" : "typed"} signature
            {sig.ip_address ? ` · IP ${sig.ip_address}` : ""}
          </p>
          <a
            className="quiet"
            href={info.signingPath}
            target="_blank"
            rel="noreferrer"
          >
            View signed proposal &amp; certificate
          </a>
        </div>
      )}
      {sig?.decision === "declined" && (
        <div className="esignPanelDeclined">
          <b>Declined by {sig.customer_name}</b>
          <span>{new Date(sig.accepted_at).toLocaleString()}</span>
          {sig.decline_reason && <q>{sig.decline_reason}</q>}
        </div>
      )}
      {info && !sig && (
        <>
          <p className="esignPanelMuted">
            Send this secure link. Your customer reviews the proposal and signs
            on any phone or computer — no account needed.
          </p>
          <div className="esignPanelLink">
            <input
              readOnly
              value={link}
              aria-label="Customer signing link"
              onFocus={(e) => e.target.select()}
            />
            <button className="primary" onClick={copy}>
              <Icon name="copy" size={16} /> Copy link
            </button>
          </div>
          <div className="esignPanelActions">
            <a
              className="quiet"
              href={`mailto:${customer?.email ?? ""}?subject=${encodeURIComponent(`Your fence proposal ${estimate.estimate_number}`)}&body=${encodeURIComponent(message)}`}
              onClick={onSent}
            >
              <Icon name="mail" size={16} /> Email
            </a>
            <a
              className="quiet"
              href={`sms:${customer?.mobile ?? ""}?&body=${encodeURIComponent(message)}`}
              onClick={onSent}
            >
              <Icon name="phone" size={16} /> Text
            </a>
            <a
              className="quiet"
              href={info.signingPath}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="eye" size={16} /> Preview
            </a>
          </div>
        </>
      )}
      {!!info?.activity?.length && (
        <ol className="esignPanelActivity">
          {info.activity.slice(0, 5).map((a: any, i: number) => (
            <li key={i}>
              <span>{label(a.action)}</span>
              <time>{new Date(a.created_at).toLocaleString()}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
