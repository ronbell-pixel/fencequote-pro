"use client";
import { useState } from "react";
import { Ctx, EstimateTable, Icon, Metric, STATUSES, money } from "./shared";

const PERIODS = [
  ["month", "This month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
  ["all", "All time"],
] as const;
type Period = (typeof PERIODS)[number][0];

function periodStart(period: Period) {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "quarter")
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(0);
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Dashboard({
  ctx,
  canSeeCosts,
  userName,
  onNew,
  onOpen,
  onSetup,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  userName: string;
  onNew: () => void;
  onOpen: (status: string, query?: string) => void;
  onSetup: () => void;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const since = periodStart(period);
  const rows = ctx.estimates.filter((e) => new Date(e.created_at) >= since);
  const sum = (list: any[]) => list.reduce((s, e) => s + Number(e.total || 0), 0);
  const byStatus = (s: string) => rows.filter((e) => e.status === s);
  const open = rows.filter((e) => !["approved", "declined"].includes(e.status));
  const waiting = rows.filter((e) => ["sent", "viewed"].includes(e.status));
  const signed = byStatus("approved"),
    declined = byStatus("declined"),
    decided = signed.length + declined.length;
  const avgMargin = rows.length
    ? rows.reduce((s, e) => s + Number(e.gross_margin ?? 0), 0) / rows.length
    : 0;
  const stages = STATUSES.map(([key, name]) => ({
    key,
    name,
    count: byStatus(key).length,
    total: sum(byStatus(key)),
  }));
  const pipelineTotal = stages.reduce((s, x) => s + x.total, 0);

  const nextUp = [
    ...ctx.estimates
      .filter((e) => e.approval_status === "required")
      .map((e) => ({
        e, icon: "alert", tone: "warn", action: "Review",
        title: `${e.estimate_number} needs manager approval`,
        sub: `${e.customer} · discount or margin outside limits`,
      })),
    ...ctx.estimates
      .filter((e) => e.status === "viewed")
      .map((e) => ({
        e, icon: "eye", tone: "warn", action: "Call",
        title: `${e.customer} opened their proposal`,
        sub: `${e.estimate_number} · ${money(e.total)} · not signed yet`,
      })),
    ...ctx.estimates
      .filter((e) => e.status === "ready")
      .map((e) => ({
        e, icon: "send", tone: "info", action: "Send",
        title: `Send ${e.estimate_number} for signature`,
        sub: `${e.customer} · ${money(e.total)} · ready`,
      })),
    ...ctx.estimates
      .filter((e) => e.status === "sent")
      .map((e) => ({
        e, icon: "clock", tone: "muted", action: "Remind",
        title: `${e.customer} hasn’t opened their quote`,
        sub: `${e.estimate_number} · sent ${new Date(e.updated_at).toLocaleDateString()}`,
      })),
  ];
  const firstName = (ctx.session.name || userName).split(" ")[0];

  return (
    <section className="page">
      <div className="pageHead">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>
            {greeting()}, {firstName}
          </h1>
        </div>
        <div className="segmented" role="group" aria-label="Time period">
          {PERIODS.map(([key, name]) => (
            <button
              key={key}
              aria-pressed={period === key}
              className={period === key ? "active" : ""}
              onClick={() => setPeriod(key)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics">
        <Metric
          label="Open pipeline"
          value={money(sum(open))}
          sub={`${open.length} quote${open.length === 1 ? "" : "s"} · ${waiting.length} awaiting customer`}
        />
        <Metric
          label="Signed"
          value={money(sum(signed))}
          sub={`${signed.length} signed proposal${signed.length === 1 ? "" : "s"}`}
          tone="good"
        />
        <Metric
          label="Win rate"
          value={decided ? `${Math.round((signed.length / decided) * 100)}%` : "—"}
          sub={decided ? `${signed.length} won of ${decided} decided` : "No decisions yet"}
        />
        {canSeeCosts ? (
          <Metric
            label="Avg. gross margin"
            value={rows.length ? `${Math.round(avgMargin)}%` : "—"}
            sub={`Target ${ctx.company.min_gross_margin}% or higher`}
          />
        ) : (
          <Metric
            label="Average quote"
            value={money(rows.length ? sum(rows) / rows.length : 0)}
            sub={`${rows.length} quotes`}
          />
        )}
      </div>

      <div className="dashGrid">
        <section className="card">
          <div className="cardHead">
            <h2>Pipeline by stage</h2>
            <button className="link" onClick={() => onOpen("all")}>
              View all
            </button>
          </div>
          {pipelineTotal ? (
            <div className="stageBar" role="img" aria-label="Quote dollars by stage">
              {stages
                .filter((s) => s.total)
                .map((s) => (
                  <i
                    key={s.key}
                    className={`s-${s.key}`}
                    style={{ flexGrow: s.total }}
                    title={`${s.name}: ${money(s.total)}`}
                  />
                ))}
            </div>
          ) : (
            <p className="muted">No quotes in this period yet.</p>
          )}
          <div className="stageLegend">
            {stages.map((s) => (
              <button key={s.key} onClick={() => onOpen(s.key)}>
                <span>
                  <i className={`s-${s.key}`} />
                  {s.name} · {s.count}
                </span>
                <strong>{money(s.total)}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="cardHead">
            <h2>Up next</h2>
          </div>
          <div className="actionList">
            {ctx.company.setup_step < 8 && (
              <button onClick={onSetup}>
                <span className="actionIcon info">
                  <Icon name="settings" size={17} />
                </span>
                <span>
                  <strong>Finish company setup</strong>
                  <small>{ctx.company.setup_step} of 8 steps complete</small>
                </span>
                <em>Continue</em>
              </button>
            )}
            {nextUp.slice(0, 5).map((x) => (
              <button
                key={`${x.e.id}-${x.action}`}
                onClick={() => onOpen("all", x.e.estimate_number)}
              >
                <span className={`actionIcon ${x.tone}`}>
                  <Icon name={x.icon} size={17} />
                </span>
                <span>
                  <strong>{x.title}</strong>
                  <small>{x.sub}</small>
                </span>
                <em>{x.action}</em>
              </button>
            ))}
            {!nextUp.length && ctx.company.setup_step >= 8 && (
              <div className="emptyState small">
                <Icon name="check" />
                <p>You’re all caught up.</p>
                <button className="quiet" onClick={onNew}>
                  Start a new estimate
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card flush">
        <div className="cardHead">
          <h2>Recent estimates</h2>
          <button className="link" onClick={() => onOpen("all")}>
            View all
          </button>
        </div>
        <EstimateTable
          rows={ctx.estimates.slice(0, 6)}
          canSeeCosts={canSeeCosts}
          onSelect={(e) => onOpen("all", e.estimate_number)}
        />
      </section>
    </section>
  );
}
