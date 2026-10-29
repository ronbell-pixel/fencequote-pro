"use client";
import { useState } from "react";
import { Badge, Ctx, Icon, TenantLogo, label, money } from "./shared";

export function Admin({
  ctx,
  canSeeCosts,
  onSetup,
  notify,
}: {
  ctx: Ctx;
  canSeeCosts: boolean;
  onSetup: () => void;
  notify: (s: string) => void;
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
      <div className="pageHead">
        <div>
          <h1>Settings</h1>
          <p>Configure this company’s workspace.</p>
        </div>
        {owner && (
          <button className="primary" onClick={onSetup}>
            {ctx.company.setup_step < 8
              ? `Resume company setup · ${ctx.company.setup_step}/8`
              : "Edit company setup"}
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
              <Icon name="chevron" size={16} />
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
                        window.location.origin,
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
              <Icon name="settings" size={28} />
              <h3>{tab}</h3>
              <p>
                Editing {tab.toLowerCase()} here is coming soon. For now, use
                company setup to review them.
              </p>
              <button className="quiet" onClick={onSetup}>
                Open company setup
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
