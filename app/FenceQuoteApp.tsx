"use client";
import { useEffect, useState } from "react";
import YardMeasure from "./YardMeasure";

type Role = "owner" | "manager" | "salesperson";
type View =
  "dashboard" | "customers" | "estimates" | "reports" | "admin" | "platform";
type Ctx = {
  session: {
    userId: string;
    name: string;
    role: Role;
    platformRole: "super_admin" | null;
    companyId: string;
    supportMode: boolean;
  };
  company: any;
  companies: any[];
  customers: any[];
  materials: any[];
  gates: any[];
  addons: any[];
  estimates: any[];
};
type DraftSection = {
  key: string;
  name: string;
  description: string;
  length: number;
  materialId: string;
  notes: string;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
const icon: Record<string, string> = {
  dashboard: "▦",
  customers: "♙",
  estimates: "▤",
  reports: "↗",
  admin: "⚙",
  platform: "◇",
};
const label = (v: string) =>
  v ? v[0].toUpperCase() + v.slice(1).replaceAll("_", " ") : "";
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge b-${status.toLowerCase().replaceAll(" ", "-")}`}>
      {status}
    </span>
  );
}

export default function FenceQuoteApp({ userName }: { userName: string }) {
  const [ctx, setCtx] = useState<Ctx | null>(null),
    [view, setView] = useState<View>("dashboard"),
    [builder, setBuilder] = useState(false),
    [onboarding, setOnboarding] = useState(false),
    [mobile, setMobile] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const load = async (company?: string, asRole?: string) => {
    setLoading(true);
    setError("");
    const q = new URLSearchParams();
    if (company) q.set("company", company);
    if (asRole) q.set("asRole", asRole);
    const r = await fetch(`/api/context?${q}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Unable to load workspace");
      setLoading(false);
      return;
    }
    setCtx(j);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2500);
  };
  const canSeeCosts = ctx?.session.role !== "salesperson";
  if (loading && !ctx)
    return (
      <div className="appLoading">
        <div className="brandmark">FQ</div>
        <h1>FenceQuote Pro</h1>
        <p>Opening your company workspace…</p>
      </div>
    );
  if (error && !ctx)
    return (
      <div className="appLoading">
        <div className="brandmark">!</div>
        <h1>Workspace unavailable</h1>
        <p>{error}</p>
        <button className="primary" onClick={() => load()}>
          Try again
        </button>
      </div>
    );
  if (!ctx) return null;
  const switchCompany = (companyId: string) =>
    load(companyId, ctx.session.role);
  const switchRole = (role: string) => load(ctx.session.companyId, role);
  return (
    <div
      className="shell"
      style={
        {
          "--tenant-primary": ctx.company.primary_color,
          "--tenant-secondary": ctx.company.secondary_color,
          "--tenant-accent": ctx.company.accent_color,
        } as React.CSSProperties
      }
    >
      <aside className={mobile ? "side open" : "side"}>
        <div className="brand">
          <div className="brandmark">FQ</div>
          <div>
            <strong>FenceQuote</strong>
            <span>PRO</span>
          </div>
        </div>
        <nav>
          {(
            [
              "dashboard",
              "customers",
              "estimates",
              "reports",
              "admin",
            ] as View[]
          ).map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => {
                setView(v);
                setMobile(false);
              }}
            >
              <i>{icon[v]}</i>
              {label(v)}
              {v === "estimates" && <em>{ctx.estimates.length}</em>}
            </button>
          ))}
          {ctx.session.platformRole && (
            <button
              className={
                view === "platform" ? "active platformLink" : "platformLink"
              }
              onClick={() => {
                setView("platform");
                setMobile(false);
              }}
            >
              <i>{icon.platform}</i>Platform Admin
            </button>
          )}
        </nav>
        <div className="sideFoot">
          {ctx.session.platformRole && (
            <div className="demoSelect">
              <label>Test permission view</label>
              <select
                aria-label="Test permission view"
                value={ctx.session.role}
                onChange={(e) => switchRole(e.target.value)}
              >
                <option value="owner">Company Owner</option>
                <option value="manager">Manager</option>
                <option value="salesperson">Salesperson</option>
              </select>
            </div>
          )}
          <div className="profile">
            <div className="avatar">
              {userName
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <strong>{userName}</strong>
              <span>
                {ctx.session.platformRole ? "Super Admin · " : ""}
                {label(ctx.session.role)}
              </span>
            </div>
            <b>•••</b>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <main>
        <header>
          <button
            className="menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="company">
            <TenantLogo company={ctx.company} large />
            <div>
              <strong>{ctx.company.name}</strong>
              <small>
                {ctx.company.city}, {ctx.company.state}
              </small>
            </div>
          </div>
          <div className="headerActions">
            <button className="iconBtn" aria-label="Notifications">
              ♢<span />
            </button>
            <button className="primary" onClick={() => setBuilder(true)}>
              ＋ New estimate
            </button>
          </div>
        </header>
        {ctx.session.supportMode && (
          <div className="supportBanner">
            <b>Support mode</b> Viewing Company: {ctx.company.name}
            <button onClick={() => setView("platform")}>
              Return to Platform Admin
            </button>
          </div>
        )}
        {error && <div className="pageError">{error}</div>}
        {view === "dashboard" && (
          <Dashboard
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            onNew={() => setBuilder(true)}
            onAll={() => setView("estimates")}
          />
        )}
        {view === "customers" && (
          <Customers
            ctx={ctx}
            notify={notify}
            reload={() => load(ctx.session.companyId, ctx.session.role)}
          />
        )}
        {view === "estimates" && (
          <Estimates
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            onNew={() => setBuilder(true)}
            notify={notify}
            reload={() => load(ctx.session.companyId, ctx.session.role)}
          />
        )}
        {view === "reports" && <Reports ctx={ctx} canSeeCosts={canSeeCosts} />}
        {view === "admin" && (
          <Admin
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            onSetup={() => setOnboarding(true)}
            notify={notify}
            reload={() => load(ctx.session.companyId, ctx.session.role)}
          />
        )}
        {view === "platform" && ctx.session.platformRole && (
          <PlatformAdmin
            ctx={ctx}
            onOpen={(id) => {
              switchCompany(id);
              setView("dashboard");
            }}
            notify={notify}
            reload={() => load(ctx.session.companyId, ctx.session.role)}
          />
        )}
      </main>
      {builder && (
        <EstimateBuilder
          ctx={ctx}
          canSeeCosts={canSeeCosts}
          onClose={() => setBuilder(false)}
          onSaved={() => {
            setBuilder(false);
            load(ctx.session.companyId, ctx.session.role);
            notify("Estimate saved to your company workspace");
          }}
        />
      )}
      {onboarding && (
        <Onboarding
          ctx={ctx}
          onClose={() => setOnboarding(false)}
          onDone={() => {
            setOnboarding(false);
            load(ctx.session.companyId, ctx.session.role);
            notify("Company setup updated");
          }}
        />
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function TenantLogo({
  company,
  large = false,
}: {
  company: any;
  large?: boolean;
}) {
  return company.logo_key ? (
    <img
      className={large ? "tenantLogo large" : "tenantLogo"}
      src={`/api/files?company=${company.id}&kind=logo`}
      alt={`${company.name} logo`}
    />
  ) : (
    <span
      className={large ? "companyLogo large" : "companyLogo"}
      style={{ background: company.primary_color, color: company.accent_color }}
    >
      {company.name
        .split(" ")
        .map((x: string) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}

function Dashboard({
  ctx,
  canSeeCosts,
  onNew,
  onAll,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  onNew: () => void;
  onAll: () => void;
}) {
  const approved = ctx.estimates.filter((e) => e.status === "approved"),
    quoted = ctx.estimates.reduce((s, e) => s + e.total, 0),
    approvedTotal = approved.reduce((s, e) => s + e.total, 0);
  return (
    <section className="page">
      <div className="dashboardHero">
        <TenantLogo company={ctx.company} large />
        <div>
          <p>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>Good morning, {ctx.session.name.split(" ")[0]}</h1>
          <span>
            Measure accurately, protect your margin, and keep every quote
            moving.
          </span>
        </div>
        <button className="heroAction" onClick={onNew}>
          <b>＋</b>
          <span>
            Start a new estimate
            <small>Satellite measure or manual build</small>
          </span>
          <i>→</i>
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Quotes this month"
          value={String(ctx.estimates.length)}
          delta="Live"
          sub="tenant data"
        />
        <Metric
          label="Total quoted"
          value={money(quoted)}
          delta="Current"
          sub="pipeline"
        />
        <Metric
          label="Approved dollars"
          value={money(approvedTotal)}
          delta="Won"
          sub="revenue"
        />
        <Metric
          label="Win rate"
          value={`${ctx.estimates.length ? Math.round((approved.length / ctx.estimates.length) * 100) : 0}%`}
          delta="Approved"
          sub="of all quotes"
        />
      </div>
      <div className="dashGrid">
        <div className="card pipeline">
          <div className="cardHead">
            <div>
              <h2>Quote pipeline</h2>
              <p>Live company totals</p>
            </div>
            <button className="quiet">This month⌄</button>
          </div>
          <div className="pipelineTotal">
            <strong>{money(quoted)}</strong>
            <span>{ctx.estimates.length} total quotes</span>
          </div>
          <div className="bar">
            <i style={{ width: "24%" }} />
            <i style={{ width: "30%" }} />
            <i style={{ width: "34%" }} />
            <i style={{ width: "12%" }} />
          </div>
          <div className="legend">
            {["draft", "sent", "approved", "declined"].map((s, i) => (
              <span key={s}>
                <i className={`c${i + 1}`} />
                {label(s)}{" "}
                <b>{ctx.estimates.filter((e) => e.status === s).length}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="card attention">
          <div className="cardHead">
            <div>
              <h2>Needs attention</h2>
              <p>Items requiring action</p>
            </div>
          </div>
          <button>
            <span className="warn">!</span>
            <div>
              <strong>
                {
                  ctx.estimates.filter((e) => e.approval_status === "required")
                    .length
                }{" "}
                discounts need approval
              </strong>
              <small>Below margin threshold</small>
            </div>
            <b>›</b>
          </button>
          <button>
            <span className="clock">◷</span>
            <div>
              <strong>Follow up on sent quotes</strong>
              <small>
                {
                  ctx.estimates.filter((e) =>
                    ["sent", "viewed"].includes(e.status),
                  ).length
                }{" "}
                awaiting response
              </small>
            </div>
            <b>›</b>
          </button>
          <button>
            <span className="eye">◎</span>
            <div>
              <strong>Company setup</strong>
              <small>{ctx.company.setup_step} of 8 steps complete</small>
            </div>
            <b>›</b>
          </button>
        </div>
      </div>
      <div className="card recent">
        <div className="cardHead">
          <div>
            <h2>Recent estimates</h2>
            <p>Your team’s latest activity</p>
          </div>
          <button className="link" onClick={onAll}>
            View all estimates →
          </button>
        </div>
        <EstimateTable
          rows={ctx.estimates.slice(0, 6)}
          canSeeCosts={canSeeCosts}
        />
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: string;
  sub: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>
        <b>{delta}</b> {sub}
      </p>
    </div>
  );
}
function EstimateTable({
  rows,
  canSeeCosts,
  onSelect,
}: {
  rows: any[];
  canSeeCosts: boolean;
  onSelect?: (estimate: any) => void;
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Estimate</th>
            <th>Customer / property</th>
            <th>Amount</th>
            {canSeeCosts && <th>Margin</th>}
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              className={onSelect ? "clickableRow" : ""}
              onClick={() => onSelect?.(e)}
            >
              <td>
                <button className="idLink" onClick={() => onSelect?.(e)}>
                  {e.estimate_number}
                </button>
                <small>{new Date(e.updated_at).toLocaleDateString()}</small>
              </td>
              <td>
                <strong>{e.customer}</strong>
                <small>{e.property_address}</small>
              </td>
              <td>
                <strong>{money(e.total)}</strong>
                <small>{money(e.deposit)} deposit</small>
              </td>
              {canSeeCosts && (
                <td>
                  <strong>{Math.round(e.gross_margin ?? 0)}%</strong>
                  <small>{money(e.gross_profit)} GP</small>
                </td>
              )}
              <td>
                <Badge status={label(e.status)} />
              </td>
              <td>
                <button
                  className="dots"
                  aria-label={`Open ${e.estimate_number}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect?.(e);
                  }}
                >
                  •••
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="emptyState">No estimates match these filters.</div>
      )}
    </div>
  );
}

function Customers({
  ctx,
  notify,
  reload,
}: {
  ctx: Ctx;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const [q, setQ] = useState(""),
    [creating, setCreating] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [customer, setCustomer] = useState({
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
      propertyAddress: "",
      city: ctx.company.city ?? "",
      state: ctx.company.state ?? "",
      zip: ctx.company.zip ?? "",
      leadSource: "Website",
    });
  const rows = ctx.customers.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.property_address} ${c.mobile} ${c.email}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const create = async () => {
    setSaving(true);
    setError("");
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customer,
        companyId: ctx.company.id,
        asRole: ctx.session.role,
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) return setError(j.error ?? "Unable to create customer");
    setCreating(false);
    notify(`${customer.firstName} ${customer.lastName} added`);
    reload();
  };
  return (
    <>
      <section className="page">
        <div className="sectionTitle">
          <div>
            <h1>Customers</h1>
            <p>Tenant-isolated contacts and properties.</p>
          </div>
          <button className="primary" onClick={() => setCreating(true)}>
            ＋ Add customer
          </button>
        </div>
        <div className="toolbar">
          <label className="search">
            ⌕{" "}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers, address, phone…"
            />
          </label>
          <span>{rows.length} customers</span>
        </div>
        <div className="card customerCards">
          {rows.map((c) => (
            <article key={c.id}>
              <div className="customerAvatar">
                {c.first_name[0]}
                {c.last_name[0]}
              </div>
              <div className="customerMain">
                <h3>
                  {c.first_name} {c.last_name}
                </h3>
                <p>⌖ {c.property_address}</p>
                <div>
                  <span>☎ {c.mobile}</span>
                  <span>✉ {c.email || "No email"}</span>
                </div>
              </div>
              <div className="customerMeta">
                <Badge status="Active" />
                <strong>
                  {ctx.estimates.filter((e) => e.customer_id === c.id).length}
                </strong>
                <small>estimates</small>
              </div>
            </article>
          ))}
        </div>
      </section>
      {creating && (
        <NewCustomerForm
          value={customer}
          setValue={setCustomer}
          saving={saving}
          error={error}
          onCancel={() => {
            setCreating(false);
            setError("");
          }}
          onCreate={create}
        />
      )}
    </>
  );
}
function Estimates({
  ctx,
  canSeeCosts,
  onNew,
  notify,
  reload,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  onNew: () => void;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const [status, setStatus] = useState("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<any>(null);
  const rows = ctx.estimates.filter(
    (e) =>
      (status === "all" || e.status === status) &&
      `${e.estimate_number} ${e.customer} ${e.property_address}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const updateStatus = async (nextStatus: string) => {
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
    setSelected({
      ...selected,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    });
    notify(`${selected.estimate_number} marked ${label(nextStatus)}`);
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
          e.status,
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
        <div className="sectionTitle">
          <div>
            <h1>Estimates</h1>
            <p>Create, save, and track every company quote.</p>
          </div>
          <button className="primary" onClick={onNew}>
            ＋ New estimate
          </button>
        </div>
        <div className="tabs">
          {[
            "all",
            "draft",
            "ready",
            "sent",
            "viewed",
            "approved",
            "declined",
          ].map((s) => (
            <button
              className={status === s ? "active" : ""}
              onClick={() => setStatus(s)}
              key={s}
            >
              {label(s)}
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
            ⌕{" "}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search estimate, customer, or address…"
            />
          </label>
          <span>{rows.length} shown</span>
          <button className="quiet" onClick={exportRows}>
            ⇩ Export CSV
          </button>
        </div>
        <div className="card recent">
          <EstimateTable
            rows={rows}
            canSeeCosts={canSeeCosts}
            onSelect={setSelected}
          />
        </div>
      </section>
      {selected && (
        <EstimateDetail
          estimate={selected}
          canSeeCosts={canSeeCosts}
          onClose={() => setSelected(null)}
          onStatus={updateStatus}
        />
      )}
    </>
  );
}

function EstimateDetail({
  estimate,
  canSeeCosts,
  onClose,
  onStatus,
}: {
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
      <aside className="detailPanel">
        <header>
          <div>
            <small>ESTIMATE</small>
            <h2>{estimate.estimate_number}</h2>
          </div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="detailStatus">
          <Badge status={label(estimate.status)} />
          <span>
            Updated {new Date(estimate.updated_at).toLocaleDateString()}
          </span>
        </div>
        <section>
          <small>CUSTOMER</small>
          <h3>{estimate.customer}</h3>
          <p>{estimate.property_address}</p>
        </section>
        <section>
          <small>QUOTE SUMMARY</small>
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
            <small>INTERNAL FINANCIALS</small>
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
        <section>
          <small>MOVE THROUGH PIPELINE</small>
          <div className="statusActions">
            {["draft", "ready", "sent", "viewed", "approved", "declined"].map(
              (status) => (
                <button
                  key={status}
                  className={estimate.status === status ? "active" : ""}
                  disabled={estimate.status === status}
                  onClick={() => onStatus(status)}
                >
                  {estimate.status === status ? "✓ " : ""}
                  {label(status)}
                </button>
              ),
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
function Reports({ ctx, canSeeCosts }: { ctx: Ctx; canSeeCosts: boolean }) {
  if (!canSeeCosts)
    return (
      <section className="page">
        <div className="locked">
          <span>◈</span>
          <h1>Management reporting</h1>
          <p>
            Financial and margin data is not included in salesperson responses.
          </p>
        </div>
      </section>
    );
  const avg = ctx.estimates.length
    ? ctx.estimates.reduce((s, e) => s + (e.gross_margin ?? 0), 0) /
      ctx.estimates.length
    : 0;
  return (
    <section className="page">
      <div className="sectionTitle">
        <div>
          <h1>Reports</h1>
          <p>Performance and profitability for {ctx.company.name} only.</p>
        </div>
        <button className="quiet">⇩ Export report</button>
      </div>
      <div className="metrics">
        <Metric
          label="Average gross margin"
          value={`${avg.toFixed(1)}%`}
          delta="Tenant"
          sub="financials"
        />
        <Metric
          label="Average quote"
          value={money(
            ctx.estimates.reduce((s, e) => s + e.total, 0) /
              (ctx.estimates.length || 1),
          )}
          delta="Current"
          sub="portfolio"
        />
        <Metric
          label="Total estimates"
          value={String(ctx.estimates.length)}
          delta="All"
          sub="statuses"
        />
        <Metric
          label="Pending pipeline"
          value={money(
            ctx.estimates
              .filter((e) => !["approved", "declined"].includes(e.status))
              .reduce((s, e) => s + e.total, 0),
          )}
          delta="Open"
          sub="opportunity"
        />
      </div>
      <div className="card chartCard">
        <div className="cardHead">
          <div>
            <h2>Material performance</h2>
            <p>Configured selling prices by fence type</p>
          </div>
        </div>
        {ctx.materials.slice(0, 6).map((m, i) => (
          <div className="chartRow" key={m.id}>
            <span>{m.name}</span>
            <div>
              <i style={{ width: `${Math.min(95, 35 + i * 12)}%` }} />
            </div>
            <b>{money(m.sell_price_per_foot)}/ft</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function Admin({
  ctx,
  canSeeCosts,
  onSetup,
  notify,
  reload,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  onSetup: () => void;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const [tab, setTab] = useState("Company Settings"),
    [invite, setInvite] = useState({
      name: "",
      email: "",
      role: "salesperson",
    }),
    [inviteReady, setInviteReady] = useState("");
  const owner = ctx.session.role === "owner";
  const sendInvite = async () => {
    const r = await fetch("/api/company-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...invite, companyId: ctx.company.id }),
    });
    const j = await r.json();
    if (!r.ok) return notify(j.error);
    setInviteReady(invite.email);
    notify(`Access prepared for ${invite.email}`);
    setInvite({ name: "", email: "", role: "salesperson" });
  };
  return (
    <section className="page">
      <div className="sectionTitle">
        <div>
          <h1>Administration</h1>
          <p>Configure this company’s workspace.</p>
        </div>
        {owner && (
          <button className="primary" onClick={onSetup}>
            Resume company setup · {ctx.company.setup_step}/8
          </button>
        )}
      </div>
      <div className="adminLayout">
        <div className="adminNav">
          {[
            "Company Settings",
            "Materials & Pricing",
            "Gates",
            "Add-ons",
            "Users",
            "Permissions",
          ].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
              <span>›</span>
            </button>
          ))}
        </div>
        <div className="card adminPanel">
          {tab === "Company Settings" ? (
            <>
              <div className="cardHead">
                <div>
                  <h2>Company settings</h2>
                  <p>Identity, branding, proposal defaults, and quote rules.</p>
                </div>
                <Badge status={label(ctx.company.status)} />
              </div>
              <div className="companySettingsHero">
                <TenantLogo company={ctx.company} large />
                <div>
                  <h3>{ctx.company.name}</h3>
                  <p>
                    {ctx.company.city}, {ctx.company.state} ·{" "}
                    {ctx.company.phone}
                  </p>
                  <div className="brandSwatches">
                    <i style={{ background: ctx.company.primary_color }} />
                    <i style={{ background: ctx.company.secondary_color }} />
                    <i style={{ background: ctx.company.accent_color }} />
                  </div>
                </div>
                <button className="quiet" onClick={onSetup}>
                  Edit setup
                </button>
              </div>
              <div className="settingsSummary">
                {[
                  ["Estimate prefix", ctx.company.estimate_prefix],
                  ["Sales tax", `${ctx.company.sales_tax}%`],
                  ["Deposit", `${ctx.company.deposit_pct}%`],
                  ["Minimum margin", `${ctx.company.min_gross_margin}%`],
                  [
                    "Sales discount limit",
                    `${ctx.company.max_sales_discount}%`,
                  ],
                  ["Expiration", `${ctx.company.quote_expiration_days} days`],
                ].map((x) => (
                  <div key={x[0]}>
                    <span>{x[0]}</span>
                    <strong>{x[1]}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : tab === "Materials & Pricing" ? (
            <>
              <div className="cardHead">
                <div>
                  <h2>Materials & pricing</h2>
                  <p>Independent pricing for {ctx.company.name}.</p>
                </div>
                {owner && <button className="primary">＋ Add material</button>}
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Material / style</th>
                      <th>Height</th>
                      {canSeeCosts && (
                        <>
                          <th>Material cost</th>
                          <th>Labor cost</th>
                        </>
                      )}
                      <th>Sell / ft</th>
                      <th>Min. sell</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.materials.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.name}</strong>
                          <small>
                            {m.style} · {m.color}
                          </small>
                        </td>
                        <td>{m.height}</td>
                        {canSeeCosts && (
                          <>
                            <td>{money(m.material_cost_per_foot)}</td>
                            <td>{money(m.labor_cost_per_foot)}</td>
                          </>
                        )}
                        <td>
                          <strong>{money(m.sell_price_per_foot)}</strong>
                        </td>
                        <td>{money(m.minimum_sell_price_per_foot)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : tab === "Users" ? (
            <>
              <div className="cardHead">
                <div>
                  <h2>Company users</h2>
                  <p>Add a teammate’s email and assign their company role.</p>
                </div>
              </div>
              {owner ? (
                <div className="inviteForm">
                  <label>
                    Name
                    <input
                      value={invite.name}
                      onChange={(e) =>
                        setInvite({ ...invite, name: e.target.value })
                      }
                      placeholder="Taylor Morgan"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      value={invite.email}
                      onChange={(e) =>
                        setInvite({ ...invite, email: e.target.value })
                      }
                      placeholder="taylor@company.com"
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={invite.role}
                      onChange={(e) =>
                        setInvite({ ...invite, role: e.target.value })
                      }
                    >
                      <option value="salesperson">Salesperson</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner / Admin</option>
                    </select>
                  </label>
                  <button className="primary" onClick={sendInvite}>
                    Prepare user access
                  </button>
                </div>
              ) : (
                <div className="locked compact">
                  Owner access required to invite users.
                </div>
              )}
              {owner && inviteReady && (
                <div className="inviteReady">
                  <span>✓</span>
                  <div>
                    <strong>Access is ready for {inviteReady}</strong>
                    <p>
                      Share this site address with them. They must choose “Sign
                      in with ChatGPT” using that exact email address.
                    </p>
                  </div>
                  <button
                    className="quiet"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "https://fencequote-pro-v1.rb-mo.chatgpt.site",
                      );
                      notify("Sign-in link copied");
                    }}
                  >
                    Copy sign-in link
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="emptyConfig">
              <span>⚙</span>
              <h3>{tab} are tenant-specific</h3>
              <p>These settings apply only to {ctx.company.name}.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlatformAdmin({
  ctx,
  onOpen,
  notify,
  reload,
}: {
  ctx: Ctx;
  onOpen: (id: string) => void;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const [creating, setCreating] = useState(false),
    [name, setName] = useState("");
  const create = async () => {
    const r = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    if (!r.ok) return notify(j.error);
    setCreating(false);
    setName("");
    notify("New trial company created");
    reload();
  };
  const setStatus = async (id: string, status: string) => {
    await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: id, status }),
    });
    notify(`Company marked ${status}`);
    reload();
  };
  return (
    <section className="page platformPage">
      <div className="sectionTitle">
        <div>
          <p>FENCEQUOTE PRO PLATFORM</p>
          <h1>Companies</h1>
          <span>Manage SaaS tenants without mixing their operating data.</span>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          ＋ Create company
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Companies"
          value={String(ctx.companies.length)}
          delta="Platform"
          sub="tenants"
        />
        <Metric
          label="Active"
          value={String(
            ctx.companies.filter((c) => c.status === "active").length,
          )}
          delta="Live"
          sub="workspaces"
        />
        <Metric
          label="Trial"
          value={String(
            ctx.companies.filter((c) => c.status === "trial").length,
          )}
          delta="Onboarding"
          sub="companies"
        />
        <Metric
          label="Total estimates"
          value={String(
            ctx.companies.reduce((s, c) => s + c.estimate_count, 0),
          )}
          delta="Usage"
          sub="all tenants"
        />
      </div>
      <div className="companyGrid">
        {ctx.companies.map((c) => (
          <article className="card tenantCard" key={c.id}>
            <div
              className="tenantIcon"
              style={{
                background:
                  c.id === "co_premier"
                    ? "#243b6b"
                    : c.id === "co_midwest"
                      ? "#2c4a3b"
                      : "#123447",
              }}
            >
              {c.name
                .split(" ")
                .map((x: string) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <h3>{c.name}</h3>
              <p>
                {c.city}, {c.state}
              </p>
            </div>
            <Badge status={label(c.status)} />
            <dl>
              <div>
                <dt>Users</dt>
                <dd>{c.user_count}</dd>
              </div>
              <div>
                <dt>Estimates</dt>
                <dd>{c.estimate_count}</dd>
              </div>
              <div>
                <dt>Setup</dt>
                <dd>{c.setup_step}/8</dd>
              </div>
            </dl>
            <div className="tenantActions">
              <button className="primary" onClick={() => onOpen(c.id)}>
                Open for support
              </button>
              <select
                aria-label={`Status for ${c.name}`}
                value={c.status}
                onChange={(e) => setStatus(c.id, e.target.value)}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </article>
        ))}
      </div>
      {creating && (
        <div className="miniModal">
          <div className="card">
            <h2>Create company</h2>
            <p>Start a new isolated trial workspace.</p>
            <label>
              Company name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ABC Fence"
              />
            </label>
            <div>
              <button className="quiet" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={!name.trim()}
                onClick={create}
              >
                Create trial company
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Onboarding({
  ctx,
  onClose,
  onDone,
}: {
  ctx: Ctx;
  onClose: () => void;
  onDone: () => void;
}) {
  const steps = [
      "Company Information",
      "Logo & Branding",
      "Quote Settings",
      "Materials & Pricing",
      "Gates",
      "Add-ons",
      "Users",
      "Finish Setup",
    ],
    [step, setStep] = useState(
      Math.min(7, Math.max(0, ctx.company.setup_step - 1)),
    ),
    [form, setForm] = useState({ ...ctx.company }),
    [logo, setLogo] = useState<File | null>(null),
    [saving, setSaving] = useState(false);
  const save = async (done = false) => {
    setSaving(true);
    const payload = {
      companyId: ctx.company.id,
      name: form.name,
      legalName: form.legal_name,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      phone: form.phone,
      email: form.email,
      website: form.website,
      primaryContact: form.primary_contact,
      timezone: form.timezone,
      primaryColor: form.primary_color,
      secondaryColor: form.secondary_color,
      accentColor: form.accent_color,
      salesTax: form.sales_tax,
      depositPct: form.deposit_pct,
      quoteExpirationDays: form.quote_expiration_days,
      estimatePrefix: form.estimate_prefix,
      minGrossMargin: form.min_gross_margin,
      maxSalesDiscount: form.max_sales_discount,
      proposalTerms: form.proposal_terms,
      proposalFooter: form.proposal_footer,
      approvalText: form.approval_text,
      setupStep: done ? 8 : Math.max(ctx.company.setup_step, step + 1),
    };
    const r = await fetch("/api/company-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok && logo) {
      const fd = new FormData();
      fd.set("companyId", ctx.company.id);
      fd.set("kind", "logo");
      fd.set("file", logo);
      await fetch("/api/files", { method: "POST", body: fd });
    }
    setSaving(false);
    if (done) onDone();
    else setStep(Math.min(7, step + 1));
  };
  return (
    <div className="modal">
      <div className="onboarding">
        <div className="onboardSide">
          <div className="brand">
            <div className="brandmark">FQ</div>
            <strong>Company Setup</strong>
          </div>
          <div className="setupProgress">
            <span>Setup progress</span>
            <strong>
              {Math.max(ctx.company.setup_step, step)} of 8 completed
            </strong>
            <i>
              <b
                style={{
                  width: `${(Math.max(ctx.company.setup_step, step) / 8) * 100}%`,
                }}
              />
            </i>
          </div>
          {steps.map((s, i) => (
            <button
              className={i === step ? "active" : i < step ? "done" : ""}
              onClick={() => setStep(i)}
              key={s}
            >
              <i>{i < step ? "✓" : i + 1}</i>
              <span>{s}</span>
            </button>
          ))}
        </div>
        <div className="onboardMain">
          <div className="onboardTop">
            <div>
              <small>STEP {step + 1} OF 8</small>
              <h2>{steps[step]}</h2>
            </div>
            <button className="close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="onboardBody">
            {step === 0 && (
              <div className="settingsForm">
                <Field
                  label="Company name"
                  value={form.name}
                  set={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Legal company name"
                  value={form.legal_name ?? ""}
                  set={(v) => setForm({ ...form, legal_name: v })}
                />
                <Field
                  label="Address"
                  value={form.address ?? ""}
                  set={(v) => setForm({ ...form, address: v })}
                />
                <Field
                  label="City"
                  value={form.city ?? ""}
                  set={(v) => setForm({ ...form, city: v })}
                />
                <Field
                  label="State"
                  value={form.state ?? ""}
                  set={(v) => setForm({ ...form, state: v })}
                />
                <Field
                  label="ZIP"
                  value={form.zip ?? ""}
                  set={(v) => setForm({ ...form, zip: v })}
                />
                <Field
                  label="Main phone"
                  value={form.phone ?? ""}
                  set={(v) => setForm({ ...form, phone: v })}
                />
                <Field
                  label="Main email"
                  value={form.email ?? ""}
                  set={(v) => setForm({ ...form, email: v })}
                />
                <Field
                  label="Website"
                  value={form.website ?? ""}
                  set={(v) => setForm({ ...form, website: v })}
                />
                <Field
                  label="Primary contact"
                  value={form.primary_contact ?? ""}
                  set={(v) => setForm({ ...form, primary_contact: v })}
                />
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="logoUpload">
                  <TenantLogo company={ctx.company} large />
                  <div>
                    <h3>Upload Company Logo</h3>
                    <p>PNG, JPG, WebP, or SVG · maximum 10 MB</p>
                    <label className="primary fileButton">
                      Choose file
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {logo && <span>{logo.name}</span>}
                  </div>
                </div>
                <div className="colorFields">
                  <label>
                    Primary brand color
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) =>
                        setForm({ ...form, primary_color: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Secondary color
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) =>
                        setForm({ ...form, secondary_color: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Accent color
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) =>
                        setForm({ ...form, accent_color: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="settingsForm">
                <Field
                  label="Estimate prefix"
                  value={form.estimate_prefix}
                  set={(v) => setForm({ ...form, estimate_prefix: v })}
                />
                <Field
                  label="Starting number"
                  value={String(form.next_estimate_number)}
                  set={() => {}}
                />
                <Field
                  label="Default sales tax %"
                  value={String(form.sales_tax)}
                  set={(v) => setForm({ ...form, sales_tax: v })}
                />
                <Field
                  label="Default deposit %"
                  value={String(form.deposit_pct)}
                  set={(v) => setForm({ ...form, deposit_pct: v })}
                />
                <Field
                  label="Quote expiration days"
                  value={String(form.quote_expiration_days)}
                  set={(v) => setForm({ ...form, quote_expiration_days: v })}
                />
                <Field
                  label="Minimum gross margin %"
                  value={String(form.min_gross_margin)}
                  set={(v) => setForm({ ...form, min_gross_margin: v })}
                />
                <Field
                  label="Maximum salesperson discount %"
                  value={String(form.max_sales_discount)}
                  set={(v) => setForm({ ...form, max_sales_discount: v })}
                />
                <label className="wide">
                  Proposal terms
                  <textarea
                    value={form.proposal_terms ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, proposal_terms: e.target.value })
                    }
                  />
                </label>
              </div>
            )}
            {step >= 3 && step < 7 && (
              <div className="setupReady">
                <span>✓</span>
                <h3>{steps[step]} are ready</h3>
                <p>
                  {step === 3
                    ? `${ctx.materials.length} materials`
                    : step === 4
                      ? `${ctx.gates.length} gate types`
                      : step === 5
                        ? `${ctx.addons.length} add-ons`
                        : "Invite your company team"}{" "}
                  already configured for this tenant.
                </p>
                <button className="quiet">Review configuration</button>
              </div>
            )}
            {step === 7 && (
              <div className="finishSetup">
                <span>✓</span>
                <h2>Your company workspace is ready</h2>
                <p>
                  Branding, pricing, users, and quote settings are isolated to{" "}
                  {form.name}.
                </p>
                <ul>
                  {steps.slice(0, 7).map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="onboardFoot">
            <button
              className="quiet"
              onClick={() => (step ? setStep(step - 1) : onClose())}
            >
              {step ? "← Back" : "Cancel"}
            </button>
            {step < 7 ? (
              <button
                className="primary"
                disabled={saving}
                onClick={() => save()}
              >
                {saving ? "Saving…" : "Save & continue →"}
              </button>
            ) : (
              <button
                className="primary"
                disabled={saving}
                onClick={() => save(true)}
              >
                Finish company setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({
  label: lab,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label>
      {lab}
      <input value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
}

function EstimateBuilder({
  ctx,
  canSeeCosts,
  onClose,
  onSaved,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const steps = ["Customer", "Fence", "Gates", "Extras", "Photos", "Review"],
    [step, setStep] = useState(0),
    [customerId, setCustomerId] = useState(ctx.customers[0]?.id ?? ""),
    [sections, setSections] = useState<DraftSection[]>([
      {
        key: crypto.randomUUID(),
        name: "Section A",
        description: "Back Property Line",
        length: 82,
        materialId: ctx.materials[0]?.id ?? "",
        notes: "",
      },
      {
        key: crypto.randomUUID(),
        name: "Section B",
        description: "Left Property Line",
        length: 64,
        materialId: ctx.materials[0]?.id ?? "",
        notes: "",
      },
      {
        key: crypto.randomUUID(),
        name: "Section C",
        description: "Right Property Line",
        length: 37,
        materialId: ctx.materials[1]?.id ?? ctx.materials[0]?.id ?? "",
        notes: "",
      },
    ]),
    [gates, setGates] = useState<any[]>(
      ctx.gates.slice(0, 2).map((g, i) => ({
        key: crypto.randomUUID(),
        gateId: g.id,
        sectionKey: "",
        quantity: 1,
        notes: i ? "Drive access" : "",
      })),
    ),
    [selectedAddons, setSelectedAddons] = useState<string[]>(
      ctx.addons.slice(0, 1).map((a) => a.id),
    ),
    [files, setFiles] = useState<File[]>([]),
    [internalNotes, setInternalNotes] = useState(
      "Rocky soil near the northwest corner. Allow extra time for post holes.",
    ),
    [customerNotes, setCustomerNotes] = useState(
      "Fence line follows the marked property boundary. Final placement is subject to utility marking.",
    ),
    [discountType, setDiscountType] = useState("percentage"),
    [discountValue, setDiscountValue] = useState(3),
    [saving, setSaving] = useState(false),
    [savedAt, setSavedAt] = useState(""),
    [result, setResult] = useState<any>(null),
    [accepting, setAccepting] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>(ctx.customers),
    [showNewCustomer, setShowNewCustomer] = useState(false),
    [newCustomer, setNewCustomer] = useState({
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
      propertyAddress: "",
      city: ctx.company.city ?? "",
      state: ctx.company.state ?? "",
      zip: ctx.company.zip ?? "",
      leadSource: "Field estimate",
    });
  const createCustomer = async () => {
    setSaving(true);
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newCustomer,
        companyId: ctx.company.id,
        asRole: ctx.session.role,
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) {
      setResult(j);
      return;
    }
    const updated = [...customerList, j.customer];
    ctx.customers = updated;
    setCustomerList(updated);
    setCustomerId(j.customer.id);
    setShowNewCustomer(false);
  };
  useEffect(() => {
    const button =
      document.querySelector<HTMLButtonElement>(".builder .addLine");
    if (!button) return;
    const open = () => setShowNewCustomer(true);
    button.addEventListener("click", open);
    return () => button.removeEventListener("click", open);
  }, [step]);
  const material = (id: string) => ctx.materials.find((m) => m.id === id),
    feet = sections.reduce((s, x) => s + Number(x.length || 0), 0),
    fenceSell = sections.reduce(
      (s, x) =>
        s +
        Number(x.length || 0) *
          Number(material(x.materialId)?.sell_price_per_foot || 0),
      0,
    ),
    gateSell = gates.reduce(
      (s, x) =>
        s +
        Number(ctx.gates.find((g) => g.id === x.gateId)?.sell_price || 0) *
          x.quantity,
      0,
    ),
    addonSell = selectedAddons.reduce((s, id) => {
      const a = ctx.addons.find((x) => x.id === id);
      return (
        s +
        Number(a?.customer_price || 0) *
          (a?.pricing_mode === "fixed" ? 1 : feet)
      );
    }, 0),
    base = fenceSell + gateSell + addonSell,
    discount =
      discountType === "dollar"
        ? Math.min(base, discountValue)
        : (base * discountValue) / 100,
    subtotal = base - discount,
    tax = (subtotal * Number(ctx.company.sales_tax)) / 100,
    total = subtotal + tax,
    deposit = (total * Number(ctx.company.deposit_pct)) / 100;
  const costs = canSeeCosts
      ? sections.reduce((s, x) => {
          const m = material(x.materialId);
          return (
            s +
            Number(x.length || 0) *
              (Number(m?.material_cost_per_foot || 0) +
                Number(m?.labor_cost_per_foot || 0) +
                Number(m?.other_cost_per_foot || 0))
          );
        }, 0) +
        gates.reduce((s, x) => {
          const g = ctx.gates.find((g) => g.id === x.gateId);
          return (
            s +
            (Number(g?.internal_cost || 0) + Number(g?.labor_cost || 0)) *
              x.quantity
          );
        }, 0)
      : 0,
    margin = total ? ((total - costs) / total) * 100 : 0;
  const payload = {
    companyId: ctx.company.id,
    asRole: ctx.session.role,
    customerId,
    sections: sections.map((s) => ({
      name: s.name,
      description: s.description,
      length: s.length,
      materialId: s.materialId,
      notes: s.notes,
    })),
    gates: gates.map((g) => ({
      gateId: g.gateId,
      quantity: g.quantity,
      notes: g.notes,
    })),
    addons: selectedAddons.map((id) => ({
      addonId: id,
      quantity:
        ctx.addons.find((a) => a.id === id)?.pricing_mode === "fixed"
          ? 1
          : feet,
    })),
    internalNotes,
    customerNotes,
    discountType,
    discountValue,
  };
  const autosave = async (next = step) => {
    if (!customerId) return;
    const r = await fetch("/api/autosave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: ctx.company.id,
        asRole: ctx.session.role,
        customerId,
        step: next,
        payload,
      }),
    });
    if (r.ok) setSavedAt("Saved just now");
  };
  const next = async () => {
    await autosave(step + 1);
    setStep(Math.min(5, step + 1));
  };
  const saveEstimate = async (finalize: boolean) => {
    setSaving(true);
    const r = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, finalize }),
    });
    const j = await r.json();
    if (!r.ok) {
      setSaving(false);
      setResult(j);
      return;
    }
    for (const file of files) {
      const fd = new FormData();
      fd.set("companyId", ctx.company.id);
      fd.set("kind", "photo");
      fd.set("estimateId", j.id);
      fd.set("targetType", "job");
      fd.set("caption", "Job site photo");
      fd.set("file", file);
      await fetch("/api/files", { method: "POST", body: fd });
    }
    await fetch("/api/autosave", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: ctx.company.id,
        asRole: ctx.session.role,
      }),
    });
    setSaving(false);
    if (finalize) setResult(j);
    else onSaved();
  };
  const addSection = () =>
    setSections([
      ...sections,
      {
        key: crypto.randomUUID(),
        name: `Section ${String.fromCharCode(65 + sections.length)}`,
        description: "New Fence Run",
        length: 0,
        materialId: ctx.materials[0]?.id ?? "",
        notes: "",
      },
    ]);
  const updateSection = (key: string, field: string, value: any) =>
    setSections(
      sections.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    );
  const selectedCustomer = customerList.find((c) => c.id === customerId);
  const applySatelliteMeasurement = (measuredFeet: number, address: string) => {
    setSections([
      {
        key: crypto.randomUUID(),
        name: "Mapped Backyard Run",
        description: "House corner to house corner via rear property line",
        length: measuredFeet,
        materialId: sections[0]?.materialId ?? ctx.materials[0]?.id ?? "",
        notes: `Open fence run · ${address} · Verify property corners and final footage onsite`,
      },
    ]);
    setSavedAt("Satellite measurement applied");
  };
  if (showNewCustomer)
    return (
      <NewCustomerForm
        value={newCustomer}
        setValue={setNewCustomer}
        saving={saving}
        error={result?.error}
        onCancel={() => setShowNewCustomer(false)}
        onCreate={createCustomer}
      />
    );
  if (result?.estimateNumber && !result.approved)
    return (
      <Proposal
        ctx={ctx}
        result={result}
        sections={sections}
        gates={gates}
        addons={selectedAddons}
        customer={customerList.find((c) => c.id === customerId)}
        notes={customerNotes}
        onApprove={async (name, signature) => {
          setAccepting(true);
          const r = await fetch("/api/acceptance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: result.approvalToken,
              customerName: name,
              signature,
              approved: true,
            }),
          });
          if (r.ok) setResult({ ...result, approved: true });
          setAccepting(false);
        }}
        accepting={accepting}
        onDone={onSaved}
      />
    );
  if (result?.approved)
    return (
      <div className="modal">
        <div className="approvalComplete">
          <span>✓</span>
          <h2>Proposal approved</h2>
          <p>
            {result.estimateNumber} is now preserved as an accepted version.
          </p>
          <button className="primary" onClick={onSaved}>
            Return to estimates
          </button>
        </div>
      </div>
    );
  return (
    <div className="modal">
      <div className="builder wideBuilder">
        <div className="builderTop">
          <button className="close" onClick={onClose}>
            ×
          </button>
          <div>
            <small>NEW ESTIMATE · {ctx.company.name.toUpperCase()}</small>
            <h2>{ctx.company.estimate_prefix}-NEW</h2>
          </div>
          <span>{savedAt || "Autosave ready"}</span>
          <button
            className="quiet saveExit"
            onClick={() => saveEstimate(false)}
          >
            Save & Exit
          </button>
        </div>
        <div className="stepper">
          {steps.map((s, i) => (
            <button
              key={s}
              className={i === step ? "active" : i < step ? "done" : ""}
              onClick={() => setStep(i)}
            >
              <i>{i < step ? "✓" : i + 1}</i>
              <span>{s}</span>
            </button>
          ))}
        </div>
        <div className="estimateWorkspace">
          <div className="builderBody">
            <div className="formStep">
              {step === 0 && (
                <>
                  <StepTitle
                    n="01"
                    title="Choose a customer"
                    text="Search this company’s contacts or add someone new."
                  />
                  <label className="search big">
                    ⌕{" "}
                    <input placeholder="Search name, address, phone, or email…" />
                  </label>
                  <div className="customerPick">
                    {customerList.map((c) => (
                      <button
                        className={customerId === c.id ? "active" : ""}
                        onClick={() => setCustomerId(c.id)}
                        key={c.id}
                      >
                        <span className="customerAvatar">
                          {c.first_name[0]}
                          {c.last_name[0]}
                        </span>
                        <div>
                          <strong>
                            {c.first_name} {c.last_name}
                          </strong>
                          <small>
                            {c.property_address} · {c.mobile}
                          </small>
                        </div>
                        <i>{customerId === c.id ? "✓" : ""}</i>
                      </button>
                    ))}
                  </div>
                  <button className="addLine">＋ New customer</button>
                </>
              )}
              {step === 1 && (
                <>
                  <StepTitle
                    n="02"
                    title="Build the fence plan"
                    text="Measure from satellite or build the fence runs manually."
                  />
                  <YardMeasure
                    initialAddress={`${selectedCustomer?.property_address ?? ""}, ${ctx.company.city ?? ""}, ${ctx.company.state ?? ""} ${ctx.company.zip ?? ""}`}
                    onApply={applySatelliteMeasurement}
                  />
                  <div className="sectionList">
                    {sections.map((s, i) => (
                      <div className="sectionCard v11" key={s.key}>
                        <span>{String.fromCharCode(65 + i)}</span>
                        <div className="sectionFields">
                          <label>
                            Section name
                            <input
                              value={s.name}
                              onChange={(e) =>
                                updateSection(s.key, "name", e.target.value)
                              }
                            />
                          </label>
                          <label>
                            Description
                            <input
                              value={s.description}
                              onChange={(e) =>
                                updateSection(
                                  s.key,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          <label>
                            Length
                            <div className="unit">
                              <input
                                type="number"
                                value={s.length}
                                onChange={(e) =>
                                  updateSection(
                                    s.key,
                                    "length",
                                    +e.target.value,
                                  )
                                }
                              />
                              <span>ft</span>
                            </div>
                          </label>
                          <label>
                            Material
                            <select
                              value={s.materialId}
                              onChange={(e) =>
                                updateSection(
                                  s.key,
                                  "materialId",
                                  e.target.value,
                                )
                              }
                            >
                              {ctx.materials.map((m) => (
                                <option value={m.id} key={m.id}>
                                  {m.name} · {m.style} · {m.height} · {m.color}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="wideField">
                            Notes
                            <input
                              value={s.notes}
                              onChange={(e) =>
                                updateSection(s.key, "notes", e.target.value)
                              }
                              placeholder="Section notes…"
                            />
                          </label>
                        </div>
                        <div className="sectionActions">
                          <button
                            title="Duplicate"
                            onClick={() =>
                              setSections([
                                ...sections,
                                {
                                  ...s,
                                  key: crypto.randomUUID(),
                                  name: `${s.name} Copy`,
                                },
                              ])
                            }
                          >
                            ⧉
                          </button>
                          <button
                            title="Delete"
                            disabled={sections.length === 1}
                            onClick={() =>
                              setSections(
                                sections.filter((x) => x.key !== s.key),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="addSection" onClick={addSection}>
                    ＋ Add Fence Section
                  </button>
                  <div className="running">
                    <span>Total linear feet</span>
                    <strong>{feet} ft</strong>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <StepTitle
                    n="03"
                    title="Add gates"
                    text="Gate choices and prices come from this company’s catalog."
                  />
                  {gates.map((g, i) => (
                    <div className="choiceCard" key={g.key}>
                      <div>
                        <span>GATE {i + 1}</span>
                        <select
                          value={g.gateId}
                          onChange={(e) =>
                            setGates(
                              gates.map((x) =>
                                x.key === g.key
                                  ? { ...x, gateId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {ctx.gates.map((x) => (
                            <option value={x.id} key={x.id}>
                              {x.description} · {x.width} ft
                            </option>
                          ))}
                        </select>
                        <small>
                          Assigned to {sections[i % sections.length]?.name}
                        </small>
                      </div>
                      <label>
                        Qty{" "}
                        <input
                          type="number"
                          value={g.quantity}
                          min="1"
                          onChange={(e) =>
                            setGates(
                              gates.map((x) =>
                                x.key === g.key
                                  ? { ...x, quantity: +e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </label>
                      <b>
                        {money(
                          Number(
                            ctx.gates.find((x) => x.id === g.gateId)
                              ?.sell_price || 0,
                          ) * g.quantity,
                        )}
                      </b>
                    </div>
                  ))}
                  <button
                    className="addSection"
                    onClick={() =>
                      setGates([
                        ...gates,
                        {
                          key: crypto.randomUUID(),
                          gateId: ctx.gates[0]?.id,
                          quantity: 1,
                          notes: "",
                        },
                      ])
                    }
                  >
                    ＋ Add Gate
                  </button>
                </>
              )}
              {step === 3 && (
                <>
                  <StepTitle
                    n="04"
                    title="Extras, notes & discounts"
                    text="Add tenant-priced extras and keep internal details private."
                  />
                  <div className="addonGrid">
                    {ctx.addons.map((a) => (
                      <label key={a.id}>
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(a.id)}
                          onChange={(e) =>
                            setSelectedAddons(
                              e.target.checked
                                ? [...selectedAddons, a.id]
                                : selectedAddons.filter((x) => x !== a.id),
                            )
                          }
                        />
                        <span>
                          {a.name}
                          <small>{label(a.pricing_mode)}</small>
                        </span>
                        <b>
                          {money(a.customer_price)}
                          {a.pricing_mode === "per_foot" ? "/ft" : ""}
                        </b>
                      </label>
                    ))}
                  </div>
                  <div className="notesGrid">
                    <label>
                      Customer notes
                      <textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                      />
                    </label>
                    <label>
                      Internal notes <i>Private</i>
                      <textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="discountControls">
                    <label>
                      Discount type
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="dollar">Dollar amount</option>
                      </select>
                    </label>
                    <label>
                      Discount value
                      <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(+e.target.value)}
                      />
                    </label>
                  </div>
                  {ctx.session.role === "salesperson" &&
                    discountType === "percentage" &&
                    discountValue > Number(ctx.company.max_sales_discount) && (
                      <div className="approvalWarn">
                        ! Manager Approval Required — this exceeds the company’s{" "}
                        {ctx.company.max_sales_discount}% salesperson limit.
                      </div>
                    )}
                </>
              )}
              {step === 4 && (
                <>
                  <StepTitle
                    n="05"
                    title="Document the job"
                    text="Photos are stored in tenant-isolated file storage after save."
                  />
                  <label className="upload uploadInput">
                    <span>▧</span>
                    <h3>Take or upload job-site photos</h3>
                    <p>
                      Associate photos with the overall job in this V1.1
                      workflow.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) =>
                        setFiles([
                          ...files,
                          ...Array.from(e.target.files ?? []),
                        ])
                      }
                    />
                    <button className="quiet" type="button">
                      Choose photos
                    </button>
                  </label>
                  <div className="photoQueue">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`}>
                        <span>▧</span>
                        <div>
                          <strong>{f.name}</strong>
                          <small>
                            {Math.round(f.size / 1024)} KB · Overall Job
                          </small>
                        </div>
                        <button
                          onClick={() =>
                            setFiles(files.filter((_, x) => x !== i))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {step === 5 && (
                <>
                  <StepTitle
                    n="06"
                    title="Review & create proposal"
                    text="Confirm scope, pricing, and company branding."
                  />
                  <div className="reviewCard full">
                    <div>
                      <span>Customer</span>
                      <strong>
                        {
                          ctx.customers.find((c) => c.id === customerId)
                            ?.first_name
                        }{" "}
                        {
                          ctx.customers.find((c) => c.id === customerId)
                            ?.last_name
                        }
                      </strong>
                    </div>
                    <div>
                      <span>Fence</span>
                      <strong>
                        {sections.length} sections · {feet} linear ft ·{" "}
                        {new Set(sections.map((s) => s.materialId)).size}{" "}
                        materials
                      </strong>
                    </div>
                    <div>
                      <span>Gates</span>
                      <strong>{gates.length} configured</strong>
                    </div>
                    <div>
                      <span>Extras</span>
                      <strong>{selectedAddons.length} selected</strong>
                    </div>
                    <div>
                      <span>Photos</span>
                      <strong>{files.length} ready to upload</strong>
                    </div>
                    <div>
                      <span>Quote total</span>
                      <strong>{money(total)}</strong>
                    </div>
                  </div>
                  {result?.error && (
                    <div className="approvalWarn">! {result.error}</div>
                  )}
                  <div className="proposalBrandPreview">
                    <TenantLogo company={ctx.company} large />
                    <div>
                      <small>CUSTOMER PROPOSAL BRAND</small>
                      <strong>{ctx.company.name}</strong>
                      <span>
                        {ctx.company.phone} · {ctx.company.website}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <aside className="estimateSummary">
            <div className="summaryHead">
              <small>ESTIMATE SUMMARY</small>
              <h3>{ctx.company.estimate_prefix}-NEW</h3>
              <span>{feet} Linear Feet</span>
            </div>
            <div className="summaryLines">
              <p>
                <span>Fence</span>
                <b>{money(fenceSell)}</b>
              </p>
              <p>
                <span>Gates</span>
                <b>{money(gateSell)}</b>
              </p>
              <p>
                <span>Extras</span>
                <b>{money(addonSell)}</b>
              </p>
              <p className="negative">
                <span>Discount</span>
                <b>−{money(discount)}</b>
              </p>
              <p>
                <span>Subtotal</span>
                <b>{money(subtotal)}</b>
              </p>
              <p>
                <span>Tax</span>
                <b>{money(tax)}</b>
              </p>
            </div>
            <div className="summaryTotal">
              <span>TOTAL</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summaryDeposit">
              <span>Deposit · {ctx.company.deposit_pct}%</span>
              <b>{money(deposit)}</b>
            </div>
            {canSeeCosts && (
              <div className="summaryFinancials">
                <small>INTERNAL FINANCIALS</small>
                <p>
                  <span>Estimated cost</span>
                  <b>{money(costs)}</b>
                </p>
                <p>
                  <span>Gross profit</span>
                  <b>{money(total - costs)}</b>
                </p>
                <p>
                  <span>Gross margin</span>
                  <b>{margin.toFixed(1)}%</b>
                </p>
              </div>
            )}
          </aside>
        </div>
        <div className="builderFoot">
          <button
            className="quiet"
            onClick={() => (step ? setStep(step - 1) : onClose())}
          >
            {step ? "← Back" : "Cancel"}
          </button>
          <span>Step {step + 1} of 6</span>
          {step < 5 ? (
            <button className="primary" onClick={next}>
              Save & continue →
            </button>
          ) : (
            <button
              className="primary"
              disabled={saving}
              onClick={() => saveEstimate(true)}
            >
              {saving ? "Creating…" : "Generate customer proposal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function NewCustomerForm({
  value,
  setValue,
  saving,
  error,
  onCancel,
  onCreate,
}: {
  value: any;
  setValue: (v: any) => void;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const field = (key: string, labelText: string, required = true) => (
    <label style={{ fontSize: 10, fontWeight: 750, color: "var(--muted)" }}>
      {labelText}
      <input
        style={{
          display: "block",
          width: "100%",
          marginTop: 5,
          padding: 11,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "white",
        }}
        required={required}
        value={value[key]}
        onChange={(e) => setValue({ ...value, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="modal">
      <div
        className="newCustomerModal"
        style={{
          width: "min(720px, calc(100% - 30px))",
          background: "var(--bg)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="builderTop">
          <button className="close" onClick={onCancel}>
            ×
          </button>
          <div>
            <small>NEW CONTACT</small>
            <h2>Add customer & property</h2>
          </div>
        </div>
        <div
          className="newCustomerFields"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
            gap: 12,
            padding: 25,
          }}
        >
          {field("firstName", "First name")}
          {field("lastName", "Last name")}
          {field("mobile", "Mobile")}
          {field("email", "Email", false)}
          {field("propertyAddress", "Property address")}
          {field("city", "City")}
          {field("state", "State")}
          {field("zip", "ZIP")}
          {field("leadSource", "Lead source", false)}
        </div>
        {error && <div className="approvalWarn">! {error}</div>}
        <div className="builderFoot">
          <button className="quiet" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" disabled={saving} onClick={onCreate}>
            {saving ? "Creating…" : "Create & select customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
function StepTitle({
  n,
  title,
  text,
}: {
  n: string;
  title: string;
  text: string;
}) {
  return (
    <div className="stepTitle">
      <span>{n}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Proposal({
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
  addons: string[];
  customer: any;
  notes: string;
  onApprove: (n: string, s: string) => void;
  accepting: boolean;
  onDone: () => void;
}) {
  const [approved, setApproved] = useState(false),
    [name, setName] = useState(
      `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`,
    ),
    [signature, setSignature] = useState("");
  return (
    <div className="modal proposalModal">
      <div className="proposalWrap">
        <div className="proposalTools">
          <button className="close" onClick={onDone}>
            ×
          </button>
          <strong>Customer proposal</strong>
          <span />
          <button className="quiet" onClick={() => window.print()}>
            ⇩ Print / PDF
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
                <h2>{ctx.company.name.toUpperCase()}</h2>
                <small>
                  {ctx.company.phone} · {ctx.company.website}
                </small>
              </div>
            </div>
            <div>
              <strong>PROPOSAL</strong>
              <span>{result.estimateNumber} · V1</span>
            </div>
          </header>
          <div className="proposalIntro">
            <div>
              <small>PREPARED FOR</small>
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
            <small>YOUR PROJECT</small>
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
                <strong>{gates.length}</strong>
                <span>Gates</span>
              </div>
              <div>
                <strong>{addons.length}</strong>
                <span>Extras</span>
              </div>
            </div>
          </div>
          {sections.map((s) => (
            <div className="proposalLine" key={s.key}>
              <div>
                <span>
                  {s.name} · {materialName(ctx, s.materialId)}
                </span>
                <small>
                  {s.description} · {s.length} linear feet
                </small>
              </div>
              <b>
                {money(
                  s.length *
                    Number(
                      ctx.materials.find((m) => m.id === s.materialId)
                        ?.sell_price_per_foot || 0,
                    ),
                )}
              </b>
            </div>
          ))}
          <div className="proposalTotals">
            <p>
              <span>Subtotal</span>
              <b>{money(result.subtotal)}</b>
            </p>
            <p>
              <span>Sales tax</span>
              <b>{money(result.total - result.subtotal)}</b>
            </p>
            <p>
              <span>Project total</span>
              <b>{money(result.total)}</b>
            </p>
            <p>
              <span>Deposit to schedule</span>
              <b>{money(result.deposit)}</b>
            </p>
          </div>
          <div className="approval">
            <small>APPROVE YOUR PROPOSAL</small>
            <h2>Let’s build your fence.</h2>
            <label>
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />{" "}
              {ctx.company.approval_text}
            </label>
            <div className="approvalInputs">
              <label>
                Customer name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Electronic signature
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type full legal name"
                />
              </label>
            </div>
            <button
              className="approve"
              disabled={
                !approved || !name.trim() || !signature.trim() || accepting
              }
              onClick={() => onApprove(name, signature)}
            >
              {accepting
                ? "Recording approval…"
                : `Accept proposal · ${money(result.total)}`}
            </button>
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
function materialName(ctx: Ctx, id: string) {
  const m = ctx.materials.find((x) => x.id === id);
  return `${m?.name ?? "Fence"} · ${m?.style ?? ""} · ${m?.height ?? ""} · ${m?.color ?? ""}`;
}
