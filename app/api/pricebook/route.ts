import { apiError, db, id, now, requireSession } from "../../../lib/tenant";

/**
 * Price book editing: materials (priced per foot), gates and add-ons.
 * Items are never hard-deleted because saved estimates reference them; "remove" hides them.
 */

type Kind = "materials" | "gates" | "addons";
type Field = { column: string; key: string; type: "text" | "money" | "number" | "mode"; required?: boolean };

const FIELDS: Record<Kind, Field[]> = {
  materials: [
    { column: "name", key: "name", type: "text", required: true },
    { column: "style", key: "style", type: "text" },
    { column: "height", key: "height", type: "text" },
    { column: "color", key: "color", type: "text" },
    { column: "material_cost_per_foot", key: "materialCost", type: "money" },
    { column: "labor_cost_per_foot", key: "laborCost", type: "money" },
    { column: "post_cost", key: "postCost", type: "money" },
    { column: "concrete_cost", key: "concreteCost", type: "money" },
    { column: "other_cost_per_foot", key: "otherCost", type: "money" },
    { column: "sell_price_per_foot", key: "sellPrice", type: "money", required: true },
  ],
  gates: [
    { column: "description", key: "description", type: "text", required: true },
    { column: "width", key: "width", type: "number", required: true },
    { column: "internal_cost", key: "materialCost", type: "money" },
    { column: "labor_cost", key: "laborCost", type: "money" },
    { column: "sell_price", key: "sellPrice", type: "money", required: true },
  ],
  addons: [
    { column: "name", key: "name", type: "text", required: true },
    { column: "pricing_mode", key: "pricingMode", type: "mode", required: true },
    { column: "internal_cost", key: "materialCost", type: "money" },
    { column: "customer_price", key: "sellPrice", type: "money", required: true },
  ],
};
const PREFIX: Record<Kind, string> = { materials: "mat", gates: "gate", addons: "addon" };
const MODES = ["per_foot", "per_unit", "fixed"];

const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });

function parseKind(value: unknown): Kind {
  if (value === "materials" || value === "gates" || value === "addons") return value;
  throw fail("Unknown price book section");
}

/** Validates an item from the client and returns column → value for the given section. */
function values(kind: Kind, item: Record<string, unknown>) {
  const out: Record<string, string | number> = {};
  for (const f of FIELDS[kind]) {
    const raw = item?.[f.key];
    if (f.type === "text") {
      const v = String(raw ?? "").trim().slice(0, 120);
      if (f.required && !v) throw fail("Please fill in the name");
      out[f.column] = v;
    } else if (f.type === "mode") {
      if (!MODES.includes(String(raw))) throw fail("Choose how this add-on is priced");
      out[f.column] = String(raw);
    } else {
      const v = raw === "" || raw == null ? 0 : Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000) throw fail("Prices and sizes must be positive numbers");
      if (f.required && f.type === "number" && v <= 0) throw fail("Gate width must be more than 0");
      out[f.column] = Math.round(v * 100) / 100;
    }
  }
  if (kind === "materials") {
    out.category = out.name;
  }
  return out;
}

async function editor(request: Request, body: any) {
  const session = await requireSession(request, body.companyId, body.asRole);
  if (!session.canEditPricing) throw fail("Only the company owner or a pricing admin can change prices", 403);
  return session;
}

const STARTER: Record<Kind, Record<string, string | number>[]> = {
  materials: [
    { name: "Vinyl Privacy", style: "Standard", height: "6 ft", color: "White", materialCost: 42, laborCost: 23, postCost: 12, concreteCost: 5, otherCost: 2, sellPrice: 94 },
    { name: "Wood Privacy", style: "Cedar Dog Ear", height: "6 ft", color: "Natural", materialCost: 31, laborCost: 27, postCost: 12, concreteCost: 5, otherCost: 2, sellPrice: 79 },
    { name: "Aluminum", style: "3-Rail", height: "4 ft", color: "Black", materialCost: 48, laborCost: 22, postCost: 12, concreteCost: 5, otherCost: 2, sellPrice: 105 },
    { name: "Chain Link", style: "Residential", height: "4 ft", color: "Galvanized", materialCost: 18, laborCost: 16, postCost: 12, concreteCost: 5, otherCost: 2, sellPrice: 49 },
  ],
  gates: [
    { description: "4' Walk Gate", width: 4, materialCost: 430, laborCost: 115, sellPrice: 825 },
    { description: "5' Walk Gate", width: 5, materialCost: 510, laborCost: 135, sellPrice: 950 },
    { description: "Double Drive Gate", width: 10, materialCost: 980, laborCost: 260, sellPrice: 1850 },
  ],
  addons: [
    { name: "Old Fence Removal", pricingMode: "per_foot", materialCost: 1.2, sellPrice: 4 },
    { name: "Haul Away", pricingMode: "fixed", materialCost: 180, sellPrice: 450 },
    { name: "Difficult Digging", pricingMode: "per_unit", materialCost: 55, sellPrice: 125 },
    { name: "Permit", pricingMode: "fixed", materialCost: 75, sellPrice: 225 },
  ],
};

function insert(kind: Kind, companyId: string, row: Record<string, string | number>, stamp: string) {
  const cols = Object.keys(row);
  return db()
    .prepare(`INSERT INTO ${kind} (id,company_id,${cols.join(",")},active,created_at,updated_at) VALUES (?,?,${cols.map(() => "?").join(",")},1,?,?)`)
    .bind(id(PREFIX[kind]), companyId, ...cols.map((c) => row[c]), stamp, stamp);
}

/** Create an item, or load the starter price book with { action: "starter" }. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const session = await editor(request, body);
    const stamp = now();
    if (body.action === "starter") {
      const counts = await db().prepare("SELECT (SELECT COUNT(*) FROM materials WHERE company_id=?1 AND active=1) m,(SELECT COUNT(*) FROM gates WHERE company_id=?1 AND active=1) g,(SELECT COUNT(*) FROM addons WHERE company_id=?1 AND active=1) a").bind(session.companyId).first<{ m: number; g: number; a: number }>();
      if ((counts?.m ?? 0) + (counts?.g ?? 0) + (counts?.a ?? 0) > 0) throw fail("The starter price book can only be loaded into an empty price book", 409);
      const statements = (Object.keys(STARTER) as Kind[]).flatMap((k) => STARTER[k].map((item) => insert(k, session.companyId, values(k, item), stamp)));
      await db().batch(statements);
      return Response.json({ ok: true, added: statements.length }, { status: 201 });
    }
    const kind = parseKind(body.kind);
    await insert(kind, session.companyId, values(kind, body.item), stamp).run();
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

/** Update an item's details and prices. */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as any;
    const session = await editor(request, body);
    const kind = parseKind(body.kind);
    const row = values(kind, body.item);
    const cols = Object.keys(row);
    const result = await db()
      .prepare(`UPDATE ${kind} SET ${cols.map((c) => `${c}=?`).join(",")},updated_at=? WHERE id=? AND company_id=? AND active=1`)
      .bind(...cols.map((c) => row[c]), now(), String(body.id ?? ""), session.companyId)
      .run();
    if (!result.meta.changes) throw fail("Item not found", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

/** Remove an item from the price book. Existing estimates keep their saved prices. */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as any;
    const session = await editor(request, body);
    const kind = parseKind(body.kind);
    const result = await db()
      .prepare(`UPDATE ${kind} SET active=0,updated_at=? WHERE id=? AND company_id=? AND active=1`)
      .bind(now(), String(body.id ?? ""), session.companyId)
      .run();
    if (!result.meta.changes) throw fail("Item not found", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
