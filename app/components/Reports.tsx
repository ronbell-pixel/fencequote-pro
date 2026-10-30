"use client";
import { useState } from "react";
import { Ctx, Icon, STATUSES, money } from "./shared";

const unitCost = (m: any) =>
  Number(m.material_cost_per_foot || 0) +
  Number(m.labor_cost_per_foot || 0) +
  Number(m.other_cost_per_foot || 0) +
  Number(m.post_cost || 0) / 8 +
  Number(m.concrete_cost || 0) / 8;

/** Categorical slots for materials, assigned in price-book order (color follows the material). */
const MATERIAL_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

type Slice = { key: string; name: string; count: number; total: number };

/** Donut chart of quote dollars by pipeline stage, with hover details and a table view. */
function StageDonut({ slices }: { slices: Slice[] }) {
  const [hover, setHover] = useState<string | null>(null),
    [table, setTable] = useState(false);
  const total = slices.reduce((s, x) => s + x.total, 0);
  const R = 90, r = 58, C = 110;
  const shown = slices.filter((s) => s.total > 0);
  let angle = -Math.PI / 2;
  const gap = shown.length > 1 ? 0.02 : 0; // ~2px surface gap between slices
  const arcs = shown.map((s) => {
    const sweep = (s.total / total) * Math.PI * 2;
    const a0 = angle + gap / 2,
      a1 = angle + sweep - gap / 2;
    angle += sweep;
    const p = (rad: number, a: number) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0);
    const d =
      shown.length === 1
        ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} L ${C - 0.01} ${C - r} A ${r} ${r} 0 1 0 ${C} ${C - r} Z`
        : `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    return { ...s, d };
  });
  const active = slices.find((s) => s.key === hover);

  return (
    <div className="donutWrap">
      <div className="donutChart">
        {total > 0 ? (
          <svg viewBox="0 0 220 220" role="img" aria-label="Quote dollars by stage">
            {arcs.map((a) => (
              <path
                key={a.key}
                d={a.d}
                className={`s-${a.key} donutSlice${hover && hover !== a.key ? " dim" : ""}`}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${a.name}: ${money(a.total)} · ${a.count} quote${a.count === 1 ? "" : "s"}`}</title>
              </path>
            ))}
          </svg>
        ) : (
          <div className="donutEmpty">No quotes yet</div>
        )}
        <div className="donutCenter" aria-hidden="true">
          <small>{active ? active.name : "All quotes"}</small>
          <strong>{money(active ? active.total : total)}</strong>
          <span>
            {active
              ? `${Math.round((active.total / (total || 1)) * 100)}% · ${active.count} quote${active.count === 1 ? "" : "s"}`
              : `${slices.reduce((n, s) => n + s.count, 0)} quotes`}
          </span>
        </div>
      </div>
      <ul className="donutLegend">
        {slices.map((s) => (
          <li
            key={s.key}
            className={hover === s.key ? "active" : ""}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
          >
            <i className={`s-${s.key}`} />
            <span>
              {s.name} <em>· {s.count}</em>
            </span>
            <b>{money(s.total)}</b>
            <small>{total ? Math.round((s.total / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
      <button className="link tableToggle" onClick={() => setTable(!table)}>
        {table ? "Hide table" : "Show as table"}
      </button>
      {table && (
        <table className="miniTable">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Quotes</th>
              <th>Dollars</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.key}>
                <td>{s.name}</td>
                <td>{s.count}</td>
                <td>{money(s.total)}</td>
                <td>{total ? Math.round((s.total / total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

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
  const won = ctx.estimates.filter((e) => e.status === "approved");
  const lost = ctx.estimates.filter((e) => e.status === "declined");
  const decided = won.length + lost.length;
  const target = Number(ctx.company.min_gross_margin || 0);
  const maxSell = Math.max(1, ...ctx.materials.map((m) => m.sell_price_per_foot));
  const materials = ctx.materials.map((m, i) => ({
    ...m,
    color: MATERIAL_COLORS[i % MATERIAL_COLORS.length],
    margin: m.sell_price_per_foot
      ? ((m.sell_price_per_foot - unitCost(m)) / m.sell_price_per_foot) * 100
      : 0,
  }));
  const stages: Slice[] = STATUSES.map(([key, name]) => {
    const list = ctx.estimates.filter((e) => e.status === key);
    return { key, name, count: list.length, total: list.reduce((s, e) => s + e.total, 0) };
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
      ["Win rate %", decided ? ((won.length / decided) * 100).toFixed(1) : ""],
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

  const kpis = [
    { tone: "blue", icon: "chart", label: "Total quoted", value: money(total), sub: `${n} estimates` },
    { tone: "green", icon: "check", label: "Won", value: money(won.reduce((s, e) => s + e.total, 0)), sub: decided ? `${Math.round((won.length / decided) * 100)}% win rate` : "No decisions yet" },
    { tone: "violet", icon: "clock", label: "Open pipeline", value: money(open), sub: "Not yet signed or declined" },
    { tone: avgMargin < target ? "red" : "aqua", icon: "file", label: "Avg. gross margin", value: `${avgMargin.toFixed(1)}%`, sub: `Target ${target}%` },
  ];

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
        {kpis.map((k) => (
          <div className={`kpi tone-${k.tone}`} key={k.label}>
            <span className="kpiIcon">
              <Icon name={k.icon} size={18} />
            </span>
            <span className="kpiLabel">{k.label}</span>
            <strong>{k.value}</strong>
            <p>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="dashGrid">
        <section className="card">
          <div className="cardHead">
            <div>
              <h2>Quote dollars by stage</h2>
              <p>Hover a slice or row for details.</p>
            </div>
          </div>
          <StageDonut slices={stages} />
        </section>

        <section className="card">
          <div className="cardHead">
            <div>
              <h2>Price &amp; margin by material</h2>
              <p>Bar length is sell price per foot. Margin includes posts and concrete.</p>
            </div>
          </div>
          {materials.map((m) => (
            <div className="chartRow" key={m.id} title={`${m.name}: ${money(m.sell_price_per_foot)}/ft, ${Math.round(m.margin)}% margin`}>
              <span>
                <i className="swatch" style={{ background: m.color }} />
                {m.name}
                <small>{m.style}</small>
              </span>
              <div>
                <i style={{ width: `${(m.sell_price_per_foot / maxSell) * 100}%`, background: m.color }} />
              </div>
              <b>
                {money(m.sell_price_per_foot)}/ft
                <small className={m.margin < target ? "bad" : "good"}>
                  {m.margin < target ? "▼" : "▲"} {Math.round(m.margin)}% margin
                </small>
              </b>
            </div>
          ))}
          {!materials.length && <p className="muted">Add materials in Settings → Price book.</p>}
        </section>
      </div>
    </section>
  );
}
