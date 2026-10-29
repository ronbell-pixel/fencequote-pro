"use client";
import { useState } from "react";
import { NewCustomerForm, emptyCustomer } from "./NewCustomerForm";
import { Ctx, Icon, initials, money } from "./shared";

export function Customers({
  ctx,
  notify,
  reload,
  onEstimates,
}: {
  ctx: Ctx;
  notify: (s: string) => void;
  reload: () => void;
  onEstimates: (query: string) => void;
}) {
  const [q, setQ] = useState(""),
    [creating, setCreating] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [customer, setCustomer] = useState(emptyCustomer(ctx, "Website"));
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
    setCustomer(emptyCustomer(ctx, "Website"));
    reload();
  };
  return (
    <>
      <section className="page">
        <div className="pageHead">
          <div>
            <h1>Customers</h1>
            <p>Contacts and properties for {ctx.company.name}.</p>
          </div>
          <button className="primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Add customer
          </button>
        </div>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search customers"
              placeholder="Search name, address, phone, or email"
            />
          </label>
          <span className="muted">{rows.length} customers</span>
        </div>
        <div className="card flush customerList">
          {rows.map((c) => {
            const quotes = ctx.estimates.filter((e) => e.customer_id === c.id);
            const name = `${c.first_name} ${c.last_name}`;
            return (
              <article key={c.id}>
                <span className="avatar lg">{initials(name)}</span>
                <div className="customerMain">
                  <h3>{name}</h3>
                  <p>
                    <Icon name="pin" size={14} /> {c.property_address}
                  </p>
                  <div className="customerContact">
                    {c.mobile && (
                      <a href={`tel:${c.mobile}`}>
                        <Icon name="phone" size={14} /> {c.mobile}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`}>
                        <Icon name="mail" size={14} /> {c.email}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  className="customerMeta"
                  disabled={!quotes.length}
                  onClick={() => onEstimates(name)}
                >
                  <strong>{quotes.length}</strong>
                  <small>
                    {quotes.length === 1 ? "estimate" : "estimates"}
                    {quotes.length
                      ? ` · ${money(quotes.reduce((s, e) => s + e.total, 0))}`
                      : ""}
                  </small>
                </button>
              </article>
            );
          })}
          {!rows.length && (
            <div className="emptyState">No customers match “{q}”.</div>
          )}
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
