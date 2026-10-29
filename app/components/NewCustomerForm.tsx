"use client";
import { Ctx, Icon } from "./shared";

export const emptyCustomer = (ctx: Ctx, leadSource: string) => ({
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  propertyAddress: "",
  city: ctx.company.city ?? "",
  state: ctx.company.state ?? "",
  zip: ctx.company.zip ?? "",
  leadSource,
});

const FIELDS: [string, string, boolean, string?][] = [
  ["firstName", "First name", true, "given-name"],
  ["lastName", "Last name", true, "family-name"],
  ["mobile", "Mobile", true, "tel"],
  ["email", "Email", false, "email"],
  ["propertyAddress", "Property address", true, "street-address"],
  ["city", "City", true, "address-level2"],
  ["state", "State", true, "address-level1"],
  ["zip", "ZIP", true, "postal-code"],
  ["leadSource", "Lead source", false],
];

export function NewCustomerForm({
  value,
  setValue,
  saving,
  error,
  onCancel,
  onCreate,
}: {
  value: any;
  setValue: (v: any) => void;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="modal">
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-customer-title"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
      >
        <div className="dialogHead">
          <div>
            <small>New contact</small>
            <h2 id="new-customer-title">Add customer &amp; property</h2>
          </div>
          <button
            type="button"
            className="iconBtn"
            aria-label="Close"
            onClick={onCancel}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="formGrid">
          {FIELDS.map(([key, text, required, autoComplete]) => (
            <label key={key} className={key === "propertyAddress" ? "wide" : ""}>
              {text}
              {!required && <i> (optional)</i>}
              <input
                required={required}
                autoComplete={autoComplete}
                type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"}
                value={value[key]}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {error && <div className="pageError">{error}</div>}
        <div className="dialogFoot">
          <button type="button" className="quiet" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Creating…" : "Create customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
