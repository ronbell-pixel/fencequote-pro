"use client";
import { useState } from "react";
import { Ctx, Icon, money } from "./shared";

export type PriceKind = "materials" | "gates" | "addons";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "money" | "number" | "mode";
  cost?: boolean;
  hint?: string;
  placeholder?: string;
};

const MODE_LABEL: Record<string, string> = {
  per_foot: "Per linear foot of fence",
  per_unit: "Per item (quantity entered on the quote)",
  fixed: "Flat price per job",
};

const SECTIONS: Record<
  PriceKind,
  { title: string; singular: string; intro: string; fields: FieldDef[] }
> = {
  materials: {
    title: "Fence materials",
    singular: "material",
    intro: "Priced per linear foot. Posts and concrete assume one post every 8 feet.",
    fields: [
      { key: "name", label: "Fence type", type: "text", placeholder: "Vinyl Privacy" },
      { key: "style", label: "Style", type: "text", placeholder: "Standard" },
      { key: "height", label: "Height", type: "text", placeholder: "6 ft" },
      { key: "color", label: "Color", type: "text", placeholder: "White" },
      { key: "materialCost", label: "Material cost per ft", type: "money", cost: true },
      { key: "laborCost", label: "Labor cost per ft", type: "money", cost: true },
      { key: "postCost", label: "Cost per post", type: "money", cost: true, hint: "1 post per 8 ft" },
      { key: "concreteCost", label: "Concrete per post", type: "money", cost: true },
      { key: "otherCost", label: "Other cost per ft", type: "money", cost: true, hint: "Hardware, caps, fuel…" },
      { key: "sellPrice", label: "Customer price per ft", type: "money" },
    ],
  },
  gates: {
    title: "Gates",
    singular: "gate",
    intro: "Priced per gate.",
    fields: [
      { key: "description", label: "Gate name", type: "text", placeholder: "4' Walk Gate" },
      { key: "width", label: "Width (ft)", type: "number" },
      { key: "materialCost", label: "Material cost", type: "money", cost: true },
      { key: "laborCost", label: "Labor cost", type: "money", cost: true },
      { key: "sellPrice", label: "Customer price", type: "money" },
    ],
  },
  addons: {
    title: "Add-ons & extras",
    singular: "add-on",
    intro: "Extras such as removal, haul away or permits.",
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "Haul Away" },
      { key: "pricingMode", label: "Priced", type: "mode" },
      { key: "materialCost", label: "Your cost", type: "money", cost: true },
      { key: "sellPrice", label: "Customer price", type: "money" },
    ],
  },
};

/** Maps a price book row from the database to the editor's field keys. */
function toForm(kind: PriceKind, row: any): Record<string, string> {
  const s = (v: unknown) => (v == null ? "" : String(v));
  if (kind === "materials")
    return {
      name: s(row.name), style: s(row.style), height: s(row.height), color: s(row.color),
      materialCost: s(row.material_cost_per_foot), laborCost: s(row.labor_cost_per_foot),
      postCost: s(row.post_cost), concreteCost: s(row.concrete_cost),
      otherCost: s(row.other_cost_per_foot), sellPrice: s(row.sell_price_per_foot),
    };
  if (kind === "gates")
    return {
      description: s(row.description), width: s(row.width),
      materialCost: s(row.internal_cost), laborCost: s(row.labor_cost), sellPrice: s(row.sell_price),
    };
  return {
    name: s(row.name), pricingMode: s(row.pricing_mode || "fixed"),
    materialCost: s(row.internal_cost), sellPrice: s(row.customer_price),
  };
}

/** Cost of one unit (foot, gate, or add-on unit), matching the server's estimate math. */
function unitCost(kind: PriceKind, f: Record<string, string>) {
  const n = (k: string) => Number(f[k] || 0);
  if (kind === "materials")
    return n("materialCost") + n("laborCost") + n("otherCost") + n("postCost") / 8 + n("concreteCost") / 8;
  if (kind === "gates") return n("materialCost") + n("laborCost");
  return n("materialCost");
}

const marginOf = (cost: number, sell: number) => (sell > 0 ? ((sell - cost) / sell) * 100 : 0);

function rowTitle(kind: PriceKind, row: any) {
  if (kind === "materials") return { title: row.name, sub: [row.style, row.height, row.color].filter(Boolean).join(" · ") };
  if (kind === "gates") return { title: row.description, sub: `${row.width} ft wide` };
  return { title: row.name, sub: MODE_LABEL[row.pricing_mode] ?? row.pricing_mode };
}

function rowSell(kind: PriceKind, row: any) {
  if (kind === "materials") return `${money(row.sell_price_per_foot)}/ft`;
  if (kind === "gates") return money(row.sell_price);
  return `${money(row.customer_price)}${row.pricing_mode === "per_foot" ? "/ft" : row.pricing_mode === "per_unit" ? " each" : ""}`;
}

export function PriceBook({
  ctx,
  kind,
  canSeeCosts,
  notify,
  reload,
}: {
  ctx: Ctx;
  kind: PriceKind;
  canSeeCosts: boolean;
  notify: (s: string) => void;
  reload: () => void;
}) {
  const section = SECTIONS[kind];
  const rows = ctx[kind] as any[];
  const canEdit = ctx.session.canEditPricing;
  const target = Number(ctx.company.min_gross_margin || 0);
  const emptyBook = !ctx.materials.length && !ctx.gates.length && !ctx.addons.length;
  const [editing, setEditing] = useState<{ id: string | null; form: Record<string, string> } | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");

  const call = async (method: string, body: object) => {
    const r = await fetch("/api/pricebook", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: ctx.company.id, asRole: ctx.session.role, kind, ...body }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Something went wrong");
    return j;
  };
  const openNew = () => {
    setError("");
    setEditing({
      id: null,
      form: Object.fromEntries(section.fields.map((f) => [f.key, f.type === "mode" ? "fixed" : ""])),
    });
  };
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await call(editing.id ? "PATCH" : "POST", { id: editing.id, item: editing.form });
      notify(editing.id ? "Price book updated" : `New ${section.singular} added`);
      setEditing(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: any) => {
    const { title } = rowTitle(kind, row);
    if (!window.confirm(`Remove “${title}” from the price book? Existing estimates keep their saved prices.`)) return;
    try {
      await call("DELETE", { id: row.id });
      notify(`${title} removed`);
      reload();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const loadStarter = async () => {
    try {
      const j = await call("POST", { action: "starter" });
      notify(`Starter price book loaded (${j.added} items) — review the prices`);
      reload();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const form = editing?.form ?? {};
  const cost = unitCost(kind, form),
    sell = Number(form.sellPrice || 0),
    margin = marginOf(cost, sell);

  return (
    <>
      <div className="cardHead">
        <div>
          <h2>{section.title}</h2>
          <p>{section.intro}</p>
        </div>
        {canEdit && (
          <button className="primary" onClick={openNew}>
            <Icon name="plus" size={16} /> Add {section.singular}
          </button>
        )}
      </div>

      {!rows.length ? (
        <div className="emptyConfig">
          <Icon name="file" size={28} />
          <h3>No {section.title.toLowerCase()} yet</h3>
          <p>
            {canEdit
              ? emptyBook
                ? "Add your own items, or load a starter price book of common fence types, gates and extras and adjust the prices."
                : `Add the ${section.title.toLowerCase()} you sell so they can be picked on estimates.`
              : "Ask your company owner to set up the price book."}
          </p>
          {canEdit && emptyBook && (
            <button className="quiet" onClick={loadStarter}>
              Load starter price book
            </button>
          )}
        </div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{kind === "materials" ? "Material" : kind === "gates" ? "Gate" : "Add-on"}</th>
                {canSeeCosts && <th>Your cost</th>}
                <th>Customer price</th>
                {canSeeCosts && <th>Margin</th>}
                {canEdit && (
                  <th>
                    <span className="srOnly">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { title, sub } = rowTitle(kind, row);
                const f = toForm(kind, row);
                const c = unitCost(kind, f),
                  m = marginOf(c, Number(f.sellPrice || 0));
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{title}</strong>
                      <small>{sub}</small>
                    </td>
                    {canSeeCosts && (
                      <td>
                        {kind === "materials" ? `${money(c)}/ft` : money(c)}
                      </td>
                    )}
                    <td>
                      <strong>{rowSell(kind, row)}</strong>
                    </td>
                    {canSeeCosts && (
                      <td>
                        <span className={m < target ? "marginBad" : "marginOk"}>
                          {Math.round(m)}%
                        </span>
                      </td>
                    )}
                    {canEdit && (
                      <td className="rowActions">
                        <button
                          className="iconBtn ghost"
                          aria-label={`Edit ${title}`}
                          onClick={() => {
                            setError("");
                            setEditing({ id: row.id, form: f });
                          }}
                        >
                          <Icon name="pen" size={16} />
                        </button>
                        <button
                          className="iconBtn ghost"
                          aria-label={`Remove ${title}`}
                          onClick={() => remove(row)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal">
          <form
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricebook-title"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="dialogHead">
              <div>
                <small>Price book</small>
                <h2 id="pricebook-title">
                  {editing.id ? "Edit" : "Add"} {section.singular}
                </h2>
              </div>
              <button
                type="button"
                className="iconBtn"
                aria-label="Close"
                onClick={() => setEditing(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="formGrid">
              {section.fields.map((f) =>
                f.type === "mode" ? (
                  <label key={f.key} className="wide">
                    {f.label}
                    <select
                      value={form[f.key]}
                      onChange={(e) =>
                        setEditing({ ...editing, form: { ...form, [f.key]: e.target.value } })
                      }
                    >
                      {Object.entries(MODE_LABEL).map(([v, text]) => (
                        <option key={v} value={v}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={f.key} className={f.key === "sellPrice" ? "sellField" : ""}>
                    <span>
                      {f.label}
                      {f.hint && <i> ({f.hint})</i>}
                    </span>
                    <span className={f.type === "money" ? "moneyInput" : ""}>
                      {f.type === "money" && <b aria-hidden="true">$</b>}
                      <input
                        required={["name", "description", "sellPrice", "width"].includes(f.key)}
                        type={f.type === "text" ? "text" : "number"}
                        inputMode={f.type === "text" ? undefined : "decimal"}
                        min={f.type === "text" ? undefined : 0}
                        step={f.type === "text" ? undefined : "0.01"}
                        placeholder={f.placeholder}
                        value={form[f.key]}
                        onChange={(e) =>
                          setEditing({ ...editing, form: { ...form, [f.key]: e.target.value } })
                        }
                      />
                    </span>
                  </label>
                ),
              )}
            </div>
            <div className="marginPreview" aria-live="polite">
              <span>
                Your cost <b>{money(cost)}</b>
                {kind === "materials" ? " per ft" : ""}
              </span>
              <span>
                Profit <b>{money(sell - cost)}</b>
              </span>
              <span className={sell && margin < target ? "marginBad" : "marginOk"}>
                Margin <b>{sell ? `${Math.round(margin)}%` : "—"}</b>
              </span>
              {sell > 0 && margin < target && (
                <small>Below your {target}% margin target.</small>
              )}
            </div>
            {error && <div className="pageError">{error}</div>}
            <div className="dialogFoot">
              <button type="button" className="quiet" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : editing.id ? "Save changes" : `Add ${section.singular}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
