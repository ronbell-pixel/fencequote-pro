"use client";
import { Ctx, Icon, Metric, STATUSES, money } from "./shared";

const unitCost = (m: any) =>
  Number(m.material_cost_per_foot || 0) +
  Number(m.labor_cost_per_foot || 0) +
  Number(m.other_cost_per_foot || 0) +
  Number(m.post_cost || 0) / 8 +
  Number(m.concrete_cost || 0) / 8;

export function Reports({
  ctx,
  canSeeCosts,
  notify,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  notify: (s: string) => void;
}) {
  if (!canSeeCosts)
    return (
      <section className="page">
        <div className="locked">
          <Icon name="lock" size={28} />
          <h1>Management reporting</h1>
          <p>Margin and cost reports are available to owners and managers.</p>
        </div>
      </section>
    );
  const n = ctx.estimates.length;
  const total = ctx.estimates.reduce((s, e) => s + e.total, 0);
  const avgMargin = n
    ? ctx.estimates.reduce((s, e) => s + (e.gross_margin ?? 0), 0) / n
    : 0;
  const open = ctx.estimates
    .filter((e) => !["approved", "declined"].includes(e.status))
    .reduce((s, e) => s + e.total, 0);
  const maxSell = Math.max(1, ...ctx.materials.map((m) => m.sell_price_per_foot));
  const materials = ctx.materials.map((m) => ({
    ...m,
    margin: m.sell_price_per_foot
      ? ((m.sell_price_per_foot - unitCost(m)) / m.sell_price_per_foot) * 100
      : 0,
  }));
  const stages = STATUSES.map(([key, name]) => {
    const list = ctx.estimates.filter((e) => e.status === key);
    return { name, count: list.length, total: list.reduce((s, e) => s + e.total, 0) };
  });

  const exportReport = () => {
    const lines = [
      ["Report", `${ctx.company.name} — ${new Date().toLocaleDateString()}`],
      [],
      ["Metric", "Value"],
      ["Average gross margin %", avgMargin.toFixed(1)],
      ["Average quote", (total / (n || 1)).toFixed(2)],
      ["Total estimates", n],
      ["Open pipeline", open.toFixed(2)],
      [],
      ["Stage", "Quotes", "Dollars"],
      ...stages.map((s) => [s.name, s.count, s.total.toFixed(2)]),
      [],
      ["Material", "Style", "Sell per ft", "Cost per ft", "Margin %"],
      ...materials.map((m) => [
        m.name, m.style, m.sell_price_per_foot, unitCost(m).toFixed(2), m.margin.toFixed(1),
      ]),
    ];
    const csv = lines
      .map((l) => l.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ctx.company.slug || "fencequote"}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Report exported");
  };

  return (
    <section className="page">
      <div className="pageHead">
        <div>
          <h1>Reports</h1>
          <p>Performance and profitability for {ctx.company.name}.</p>
        </div>
        <button className="quiet" onClick={exportReport}>
          <Icon name="download" size={16} /> Export report
        </button>
      </div>
      <div className="metrics">
        <Metric label="Avg. gross margin" value={`${avgMargin.toFixed(1)}%`} sub={`Target ${ctx.company.min_gross_margin}%`} />
        <Metric label="Average quote" value={money(total / (n || 1))} sub={`${n} estimates`} />
        <Metric label="Total quoted" value={money(total)} sub="All statuses" />
        <Metric label="Open pipeline" value={money(open)} sub="Not yet signed or declined" />
      </div>
      <div className="dashGrid">
        <section className="card">
          <div className="cardHead">
            <h2>Price &amp; margin by material</h2>
          </div>
          <p className="muted small">Bar length is sell price per foot. Margin includes posts and concrete.</p>
          {materials.map((m) => (
            <div className="chartRow" key={m.id}>
              <span>
                {m.name}
                <small>{m.style}</small>
              </span>
              <div>
                <i style={{ width: `${(m.sell_price_per_foot / maxSell) * 100}%` }} />
              </div>
              <b>
                {money(m.sell_price_per_foot)}/ft
                <small className={m.margin < Number(ctx.company.min_gross_margin) ? "bad" : ""}>
                  {Math.round(m.margin)}% margin
                </small>
              </b>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="cardHead">
            <h2>Quotes by stage</h2>
          </div>
          <dl className="statList">
            {stages.map((s) => (
              <div key={s.name}>
                <dt>
                  {s.name} <span className="muted">· {s.count}</span>
                </dt>
                <dd>{money(s.total)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  );
}
