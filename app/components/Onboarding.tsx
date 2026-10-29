"use client";
import { useState } from "react";
import { Ctx, Icon, TenantLogo } from "./shared";

export function Onboarding({
  ctx,
  onClose,
  onDone,
}: {
  ctx: Ctx;
  onClose: () => void;
  onDone: () => void;
}) {
  const steps = [
      "Company Information",
      "Logo & Branding",
      "Quote Settings",
      "Materials & Pricing",
      "Gates",
      "Add-ons",
      "Users",
      "Finish Setup",
    ],
    [step, setStep] = useState(
      Math.min(7, Math.max(0, ctx.company.setup_step - 1)),
    ),
    [form, setForm] = useState({ ...ctx.company }),
    [logo, setLogo] = useState<File | null>(null),
    [saving, setSaving] = useState(false);
  const save = async (done = false) => {
    setSaving(true);
    const payload = {
      companyId: ctx.company.id,
      name: form.name,
      legalName: form.legal_name,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      phone: form.phone,
      email: form.email,
      website: form.website,
      primaryContact: form.primary_contact,
      timezone: form.timezone,
      primaryColor: form.primary_color,
      secondaryColor: form.secondary_color,
      accentColor: form.accent_color,
      salesTax: form.sales_tax,
      depositPct: form.deposit_pct,
      quoteExpirationDays: form.quote_expiration_days,
      estimatePrefix: form.estimate_prefix,
      minGrossMargin: form.min_gross_margin,
      maxSalesDiscount: form.max_sales_discount,
      proposalTerms: form.proposal_terms,
      proposalFooter: form.proposal_footer,
      approvalText: form.approval_text,
      setupStep: done ? 8 : Math.max(ctx.company.setup_step, step + 1),
    };
    const r = await fetch("/api/company-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok && logo) {
      const fd = new FormData();
      fd.set("companyId", ctx.company.id);
      fd.set("kind", "logo");
      fd.set("file", logo);
      await fetch("/api/files", { method: "POST", body: fd });
    }
    setSaving(false);
    if (done) onDone();
    else setStep(Math.min(7, step + 1));
  };
  return (
    <div className="modal">
      <div className="onboarding" role="dialog" aria-modal="true" aria-label="Company setup">
        <div className="onboardSide">
          <div className="brand">
            <div className="brandmark">FQ</div>
            <strong>Company Setup</strong>
          </div>
          <div className="setupProgress">
            <span>Setup progress</span>
            <strong>
              {Math.max(ctx.company.setup_step, step)} of 8 completed
            </strong>
            <i>
              <b
                style={{
                  width: `${(Math.max(ctx.company.setup_step, step) / 8) * 100}%`,
                }}
              />
            </i>
          </div>
          {steps.map((s, i) => (
            <button
              className={i === step ? "active" : i < step ? "done" : ""}
              onClick={() => setStep(i)}
              key={s}
            >
              <i>{i < step ? "✓" : i + 1}</i>
              <span>{s}</span>
            </button>
          ))}
        </div>
        <div className="onboardMain">
          <div className="onboardTop">
            <div>
              <small>Step {step + 1} of 8</small>
              <h2>{steps[step]}</h2>
            </div>
            <button className="iconBtn" aria-label="Close setup" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <div className="onboardBody">
            {step === 0 && (
              <div className="settingsForm">
                <Field
                  label="Company name"
                  value={form.name}
                  set={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Legal company name"
                  value={form.legal_name ?? ""}
                  set={(v) => setForm({ ...form, legal_name: v })}
                />
                <Field
                  label="Address"
                  value={form.address ?? ""}
                  set={(v) => setForm({ ...form, address: v })}
                />
                <Field
                  label="City"
                  value={form.city ?? ""}
                  set={(v) => setForm({ ...form, city: v })}
                />
                <Field
                  label="State"
                  value={form.state ?? ""}
                  set={(v) => setForm({ ...form, state: v })}
                />
                <Field
                  label="ZIP"
                  value={form.zip ?? ""}
                  set={(v) => setForm({ ...form, zip: v })}
                />
                <Field
                  label="Main phone"
                  value={form.phone ?? ""}
                  set={(v) => setForm({ ...form, phone: v })}
                />
                <Field
                  label="Main email"
                  value={form.email ?? ""}
                  set={(v) => setForm({ ...form, email: v })}
                />
                <Field
                  label="Website"
                  value={form.website ?? ""}
                  set={(v) => setForm({ ...form, website: v })}
                />
                <Field
                  label="Primary contact"
                  value={form.primary_contact ?? ""}
                  set={(v) => setForm({ ...form, primary_contact: v })}
                />
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="logoUpload">
                  <TenantLogo company={ctx.company} large />
                  <div>
                    <h3>Upload Company Logo</h3>
                    <p>PNG, JPG, WebP, or SVG · maximum 10 MB</p>
                    <label className="primary fileButton">
                      Choose file
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {logo && <span>{logo.name}</span>}
                  </div>
                </div>
                <div className="colorFields">
                  <label>
                    Primary brand color
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) =>
                        setForm({ ...form, primary_color: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Secondary color
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) =>
                        setForm({ ...form, secondary_color: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Accent color
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) =>
                        setForm({ ...form, accent_color: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="settingsForm">
                <Field
                  label="Estimate prefix"
                  value={form.estimate_prefix}
                  set={(v) => setForm({ ...form, estimate_prefix: v })}
                />
                <Field
                  label="Starting number"
                  value={String(form.next_estimate_number)}
                />
                <Field
                  label="Default sales tax %"
                  value={String(form.sales_tax)}
                  set={(v) => setForm({ ...form, sales_tax: v })}
                />
                <Field
                  label="Default deposit %"
                  value={String(form.deposit_pct)}
                  set={(v) => setForm({ ...form, deposit_pct: v })}
                />
                <Field
                  label="Quote expiration days"
                  value={String(form.quote_expiration_days)}
                  set={(v) => setForm({ ...form, quote_expiration_days: v })}
                />
                <Field
                  label="Minimum gross margin %"
                  value={String(form.min_gross_margin)}
                  set={(v) => setForm({ ...form, min_gross_margin: v })}
                />
                <Field
                  label="Maximum salesperson discount %"
                  value={String(form.max_sales_discount)}
                  set={(v) => setForm({ ...form, max_sales_discount: v })}
                />
                <label className="wide">
                  Proposal terms
                  <textarea
                    value={form.proposal_terms ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, proposal_terms: e.target.value })
                    }
                  />
                </label>
              </div>
            )}
            {step >= 3 && step < 7 && (
              <div className="setupReady">
                <span>✓</span>
                <h3>{steps[step]} are ready</h3>
                <p>
                  {step === 3
                    ? `${ctx.materials.length} materials`
                    : step === 4
                      ? `${ctx.gates.length} gate types`
                      : step === 5
                        ? `${ctx.addons.length} add-ons`
                        : "Invite your company team"}{" "}
                  already configured for this tenant.
                </p>
              </div>
            )}
            {step === 7 && (
              <div className="finishSetup">
                <span>✓</span>
                <h2>Your company workspace is ready</h2>
                <p>
                  Branding, pricing, users, and quote settings are isolated to{" "}
                  {form.name}.
                </p>
                <ul>
                  {steps.slice(0, 7).map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="onboardFoot">
            <button
              className="quiet"
              onClick={() => (step ? setStep(step - 1) : onClose())}
            >
              {step ? "Back" : "Cancel"}
            </button>
            {step < 7 ? (
              <button
                className="primary"
                disabled={saving}
                onClick={() => save()}
              >
                {saving ? "Saving…" : "Save & continue"}
              </button>
            ) : (
              <button
                className="primary"
                disabled={saving}
                onClick={() => save(true)}
              >
                Finish company setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export function Field({
  label: lab,
  value,
  set,
}: {
  label: string;
  value: string;
  set?: (v: string) => void;
}) {
  return (
    <label>
      {lab}
      <input
        value={value}
        readOnly={!set}
        onChange={(e) => set?.(e.target.value)}
      />
    </label>
  );
}
