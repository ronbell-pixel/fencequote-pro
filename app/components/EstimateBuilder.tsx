"use client";
import { useState } from "react";
import YardMeasure from "../YardMeasure";
import { Proposal } from "./Proposal";
import { NewCustomerForm, emptyCustomer } from "./NewCustomerForm";
import { Ctx, DraftSection, Icon, TenantLogo, initials, money } from "./shared";

export function EstimateBuilder({
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
        description: "",
        length: 0,
        materialId: ctx.materials[0]?.id ?? "",
        notes: "",
      },
    ]),
    [gates, setGates] = useState<any[]>([]),
    [selectedAddons, setSelectedAddons] = useState<string[]>([]),
    [addonQty, setAddonQty] = useState<Record<string, number>>({}),
    [files, setFiles] = useState<File[]>([]),
    [internalNotes, setInternalNotes] = useState(""),
    [customerNotes, setCustomerNotes] = useState(""),
    [customerQuery, setCustomerQuery] = useState(""),
    [discountType, setDiscountType] = useState("percentage"),
    [discountValue, setDiscountValue] = useState(0),
    [saving, setSaving] = useState(false),
    [savedAt, setSavedAt] = useState(""),
    [result, setResult] = useState<any>(null),
    [accepting, setAccepting] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>(ctx.customers),
    [showNewCustomer, setShowNewCustomer] = useState(false),
    [newCustomer, setNewCustomer] = useState(
      emptyCustomer(ctx, "Field estimate"),
    );
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
    addonQuantity = (id: string) => {
      const mode = ctx.addons.find((x) => x.id === id)?.pricing_mode;
      return mode === "fixed" ? 1 : mode === "per_foot" ? feet : (addonQty[id] ?? 1);
    },
    addonSell = selectedAddons.reduce(
      (s, id) =>
        s +
        Number(ctx.addons.find((x) => x.id === id)?.customer_price || 0) *
          addonQuantity(id),
      0,
    ),
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
                Number(m?.other_cost_per_foot || 0) +
                Number(m?.post_cost || 0) / 8 +
                Number(m?.concrete_cost || 0) / 8)
          );
        }, 0) +
        gates.reduce((s, x) => {
          const g = ctx.gates.find((g) => g.id === x.gateId);
          return (
            s +
            (Number(g?.internal_cost || 0) + Number(g?.labor_cost || 0)) *
              x.quantity
          );
        }, 0) +
        selectedAddons.reduce(
          (s, id) =>
            s +
            Number(ctx.addons.find((a) => a.id === id)?.internal_cost || 0) *
              addonQuantity(id),
          0,
        )
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
      quantity: addonQuantity(id),
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
  const visibleCustomers = customerList.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.property_address} ${c.mobile} ${c.email}`
      .toLowerCase()
      .includes(customerQuery.toLowerCase()),
  );
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
        addons={selectedAddons.map((id) => ({
          id,
          quantity: addonQuantity(id),
        }))}
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
              signerEmail: customerList.find((c) => c.id === customerId)
                ?.email,
              signatureMethod: signature.method,
              signature:
                signature.method === "typed" ? signature.text : undefined,
              signatureImage:
                signature.method === "drawn" ? signature.image : undefined,
              approved: true,
              consent: true,
            }),
          });
          if (r.ok) setResult({ ...result, approved: true });
          else
            setResult({
              ...result,
              acceptError: (await r.json()).error ?? "Unable to record signature",
            });
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
          <span>
            <Icon name="check" size={28} />
          </span>
          <h2>Proposal signed</h2>
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
          <button className="iconBtn" aria-label="Close estimate" onClick={onClose}>
            <Icon name="close" />
          </button>
          <div>
            <small>New estimate · {ctx.company.name}</small>
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
                    <Icon name="search" size={16} />
                    <input
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      aria-label="Search customers"
                      placeholder="Search name, address, phone, or email"
                    />
                  </label>
                  <div className="customerPick">
                    {visibleCustomers.map((c) => (
                      <button
                        className={customerId === c.id ? "active" : ""}
                        aria-pressed={customerId === c.id}
                        onClick={() => setCustomerId(c.id)}
                        key={c.id}
                      >
                        <span className="avatar">
                          {initials(`${c.first_name} ${c.last_name}`)}
                        </span>
                        <div>
                          <strong>
                            {c.first_name} {c.last_name}
                          </strong>
                          <small>
                            {c.property_address} · {c.mobile}
                          </small>
                        </div>
                        {customerId === c.id && <Icon name="check" />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="addLine"
                    onClick={() => setShowNewCustomer(true)}
                  >
                    <Icon name="plus" size={16} /> New customer
                  </button>
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
                            aria-label={`Duplicate ${s.name}`}
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
                            <Icon name="copy" size={16} />
                          </button>
                          <button
                            title="Delete"
                            aria-label={`Delete ${s.name}`}
                            disabled={sections.length === 1}
                            onClick={() =>
                              setSections(
                                sections.filter((x) => x.key !== s.key),
                              )
                            }
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="addSection" onClick={addSection}>
                    <Icon name="plus" size={16} /> Add fence section
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
                    <Icon name="plus" size={16} /> Add gate
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
                    {ctx.addons.map((a) => {
                      const on = selectedAddons.includes(a.id);
                      return (
                        <div className={on ? "addonRow on" : "addonRow"} key={a.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={on}
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
                              <small>
                                {money(a.customer_price)}
                                {a.pricing_mode === "per_foot"
                                  ? " per foot"
                                  : a.pricing_mode === "per_unit"
                                    ? " each"
                                    : " flat"}
                              </small>
                            </span>
                          </label>
                          {on && a.pricing_mode === "per_unit" && (
                            <label className="qty">
                              Qty
                              <input
                                type="number"
                                min="1"
                                value={addonQty[a.id] ?? 1}
                                onChange={(e) =>
                                  setAddonQty({
                                    ...addonQty,
                                    [a.id]: Math.max(1, +e.target.value),
                                  })
                                }
                              />
                            </label>
                          )}
                          <b>
                            {on
                              ? money(Number(a.customer_price) * addonQuantity(a.id))
                              : ""}
                          </b>
                        </div>
                      );
                    })}
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
                    <span>
                      <Icon name="camera" size={26} />
                    </span>
                    <h3>Take or upload job-site photos</h3>
                    <p>Photos are attached to this estimate when you save.</p>
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
                        <Icon name="camera" />
                        <div>
                          <strong>{f.name}</strong>
                          <small>
                            {Math.round(f.size / 1024)} KB · Overall Job
                          </small>
                        </div>
                        <button
                          className="iconBtn ghost"
                          aria-label={`Remove ${f.name}`}
                          onClick={() =>
                            setFiles(files.filter((_, x) => x !== i))
                          }
                        >
                          <Icon name="close" size={16} />
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
                        {selectedCustomer
                          ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                          : "None selected"}
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
                      <strong>{gates.reduce((n, g) => n + g.quantity, 0)} gates</strong>
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
            {step ? "Back" : "Cancel"}
          </button>
          <span>Step {step + 1} of 6</span>
          {step < 5 ? (
            <button className="primary" onClick={next}>
              Save & continue
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
export function StepTitle({
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
