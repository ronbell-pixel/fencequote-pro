"use client";
import { useEffect, useRef, useState } from "react";
import { Admin } from "./components/Admin";
import { Customers } from "./components/Customers";
import { Dashboard } from "./components/Dashboard";
import { EstimateBuilder } from "./components/EstimateBuilder";
import { Estimates } from "./components/Estimates";
import { Onboarding } from "./components/Onboarding";
import { PlatformAdmin } from "./components/PlatformAdmin";
import { Reports } from "./components/Reports";
import {
  Ctx,
  Icon,
  TenantLogo,
  View,
  initials,
  label,
} from "./components/shared";

const NAV: { view: View; label: string; icon: string }[] = [
  { view: "dashboard", label: "Home", icon: "home" },
  { view: "estimates", label: "Estimates", icon: "file" },
  { view: "customers", label: "Customers", icon: "users" },
  { view: "reports", label: "Reports", icon: "chart" },
  { view: "admin", label: "Settings", icon: "settings" },
];

const ACTIVITY_TEXT: Record<string, string> = {
  proposal_viewed: "opened their proposal",
  customer_accepted: "signed their proposal",
  customer_declined: "declined their proposal",
};

export default function FenceQuoteApp({ userName }: { userName: string }) {
  const [ctx, setCtx] = useState<Ctx | null>(null),
    [view, setView] = useState<View>("dashboard"),
    [filter, setFilter] = useState({ status: "all", query: "" }),
    [search, setSearch] = useState(""),
    [builder, setBuilder] = useState(false),
    [onboarding, setOnboarding] = useState(false),
    [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState<"" | "bell" | "profile">(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMenu("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2500);
  };
  const go = (v: View, nextFilter?: { status?: string; query?: string }) => {
    setView(v);
    setMobile(false);
    setMenu("");
    if (nextFilter) setFilter({ status: "all", query: "", ...nextFilter });
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
  const reload = () => load(ctx.session.companyId, ctx.session.role);
  const switchCompany = (companyId: string) =>
    load(companyId, ctx.session.role);
  const switchRole = (role: string) => load(ctx.session.companyId, role);
  const customerActivity = ctx.activity.filter((a) => ACTIVITY_TEXT[a.action]);
  const displayName = ctx.session.name || userName;
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
          <strong>
            FenceQuote <span>Pro</span>
          </strong>
        </div>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <button
              key={n.view}
              className={view === n.view ? "active" : ""}
              aria-current={view === n.view ? "page" : undefined}
              onClick={() =>
                go(n.view, n.view === "estimates" ? {} : undefined)
              }
            >
              <Icon name={n.icon} />
              {n.label}
              {n.view === "estimates" && <em>{ctx.estimates.length}</em>}
            </button>
          ))}
          {ctx.session.platformRole && (
            <button
              className={view === "platform" ? "active" : ""}
              onClick={() => go("platform")}
            >
              <Icon name="building" />
              Platform admin
            </button>
          )}
        </nav>
        <div className="sideFoot">
          {ctx.session.platformRole && (
            <label className="demoSelect">
              <span>Preview as</span>
              <select
                value={ctx.session.role}
                onChange={(e) => switchRole(e.target.value)}
              >
                <option value="owner">Company owner</option>
                <option value="manager">Manager</option>
                <option value="salesperson">Salesperson</option>
              </select>
            </label>
          )}
          <div className="menuWrap">
            <button
              className="profile"
              aria-haspopup="menu"
              aria-expanded={menu === "profile"}
              onClick={() => setMenu(menu === "profile" ? "" : "profile")}
            >
              <span className="avatar">{initials(displayName)}</span>
              <span>
                <strong>{displayName}</strong>
                <small>
                  {ctx.session.platformRole ? "Super admin · " : ""}
                  {label(ctx.session.role)}
                </small>
              </span>
              <Icon name="more" />
            </button>
            {menu === "profile" && (
              <div className="popover up" role="menu">
                <button role="menuitem" onClick={() => go("admin")}>
                  <Icon name="settings" />
                  Company settings
                </button>
                <a
                  role="menuitem"
                  href="/cdn-cgi/access/logout"
                  target="_top"
                >
                  <Icon name="logout" />
                  Sign out
                </a>
              </div>
            )}
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
      {menu && (
        <button
          className="menuScrim"
          aria-label="Close menu"
          onClick={() => setMenu("")}
        />
      )}
      <main>
        <header className="topbar">
          <button
            className="iconBtn menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="company">
            <TenantLogo company={ctx.company} />
            <div>
              <strong>{ctx.company.name}</strong>
              <small>
                {ctx.company.city}, {ctx.company.state}
              </small>
            </div>
          </div>
          <form
            className="globalSearch"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go("estimates", { query: search.trim() });
              setSearch("");
              searchRef.current?.blur();
            }}
          >
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search estimates"
              placeholder="Search estimates, customers, addresses"
            />
            <kbd>⌘K</kbd>
          </form>
          <div className="headerActions">
            <div className="menuWrap">
              <button
                className="iconBtn"
                aria-label={`Notifications${customerActivity.length ? ` (${customerActivity.length})` : ""}`}
                aria-haspopup="menu"
                aria-expanded={menu === "bell"}
                onClick={() => setMenu(menu === "bell" ? "" : "bell")}
              >
                <Icon name="bell" />
                {!!customerActivity.length && <span className="dot" />}
              </button>
              {menu === "bell" && (
                <div className="popover notifications" role="menu">
                  <strong className="popoverTitle">Customer activity</strong>
                  {customerActivity.length ? (
                    customerActivity.slice(0, 8).map((a, i) => (
                      <button
                        role="menuitem"
                        key={i}
                        onClick={() =>
                          go("estimates", { query: a.estimate_number ?? "" })
                        }
                      >
                        <Icon
                          name={
                            a.action === "customer_accepted"
                              ? "check"
                              : a.action === "customer_declined"
                                ? "close"
                                : "eye"
                          }
                        />
                        <span>
                          <b>{a.customer ?? "A customer"}</b>{" "}
                          {ACTIVITY_TEXT[a.action]}
                          <small>
                            {a.estimate_number} ·{" "}
                            {new Date(a.created_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="popoverEmpty">
                      You’ll see it here when a customer opens, signs, or
                      declines a proposal.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              className="primary"
              aria-label="New estimate"
              onClick={() => setBuilder(true)}
            >
              <Icon name="plus" size={16} />
              <span className="hideSm">New estimate</span>
            </button>
          </div>
        </header>
        {ctx.session.supportMode && (
          <div className="supportBanner">
            <b>Support mode</b> Viewing {ctx.company.name}
            <button onClick={() => go("platform")}>
              Return to platform admin
            </button>
          </div>
        )}
        {error && <div className="pageError">{error}</div>}
        {view === "dashboard" && (
          <Dashboard
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            userName={displayName}
            onNew={() => setBuilder(true)}
            onOpen={(status, query) => go("estimates", { status, query })}
            onSetup={() => setOnboarding(true)}
          />
        )}
        {view === "customers" && (
          <Customers
            ctx={ctx}
            notify={notify}
            reload={reload}
            onEstimates={(query) => go("estimates", { query })}
          />
        )}
        {view === "estimates" && (
          <Estimates
            key={`${filter.status}|${filter.query}`}
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            initialStatus={filter.status}
            initialQuery={filter.query}
            notify={notify}
            reload={reload}
          />
        )}
        {view === "reports" && (
          <Reports ctx={ctx} canSeeCosts={canSeeCosts} notify={notify} />
        )}
        {view === "admin" && (
          <Admin
            ctx={ctx}
            canSeeCosts={canSeeCosts}
            onSetup={() => setOnboarding(true)}
            notify={notify}
          />
        )}
        {view === "platform" && ctx.session.platformRole && (
          <PlatformAdmin
            ctx={ctx}
            onOpen={(id) => {
              switchCompany(id);
              go("dashboard");
            }}
            notify={notify}
            reload={reload}
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
            reload();
            notify("Estimate saved");
          }}
        />
      )}
      {onboarding && (
        <Onboarding
          ctx={ctx}
          onClose={() => setOnboarding(false)}
          onDone={() => {
            setOnboarding(false);
            reload();
            notify("Company setup updated");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
