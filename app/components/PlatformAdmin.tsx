"use client";
import { useState } from "react";
import { Badge, Ctx, Icon, Metric, initials, label } from "./shared";

export function PlatformAdmin({
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
    <section className="page">
      <div className="pageHead">
        <div>
          <p className="eyebrow">FenceQuote Pro platform</p>
          <h1>Companies</h1>
          <p>Manage companies without mixing their data.</p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Create company
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Companies"
          value={String(ctx.companies.length)}
          sub="tenants"
        />
        <Metric
          label="Active"
          value={String(
            ctx.companies.filter((c) => c.status === "active").length,
          )}
          sub="workspaces"
        />
        <Metric
          label="Trial"
          value={String(
            ctx.companies.filter((c) => c.status === "trial").length,
          )}
          sub="companies"
        />
        <Metric
          label="Total estimates"
          value={String(
            ctx.companies.reduce((s, c) => s + c.estimate_count, 0),
          )}
          sub="all tenants"
        />
      </div>
      <div className="companyGrid">
        {ctx.companies.map((c) => (
          <article className="card tenantCard" key={c.id}>
            <div
              className="tenantIcon"
              style={{
                background: c.primary_color ?? "#123447",
              }}
            >
              {initials(c.name)}
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
