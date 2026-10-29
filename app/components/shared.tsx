"use client";

export type Role = "owner" | "manager" | "salesperson";
export type View =
  | "dashboard"
  | "customers"
  | "estimates"
  | "reports"
  | "admin"
  | "platform";
export type Ctx = {
  session: {
    userId: string;
    name: string;
    role: Role;
    platformRole: "super_admin" | null;
    companyId: string;
    supportMode: boolean;
  };
  company: any;
  companies: any[];
  customers: any[];
  materials: any[];
  gates: any[];
  addons: any[];
  estimates: any[];
  activity: any[];
};
export type DraftSection = {
  key: string;
  name: string;
  description: string;
  length: number;
  materialId: string;
  notes: string;
};

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
export const label = (v: string) =>
  v ? v[0].toUpperCase() + v.slice(1).replaceAll("_", " ") : "";
export const initials = (name: string) =>
  name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

/** Customer-facing name for each pipeline status. */
export const STATUSES = [
  ["draft", "Draft"],
  ["ready", "Ready"],
  ["sent", "Sent"],
  ["viewed", "Viewed"],
  ["approved", "Signed"],
  ["declined", "Declined"],
] as const;
export const statusLabel = (s: string) =>
  STATUSES.find(([k]) => k === s)?.[1] ?? label(s);

const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  users:
    "M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.2 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1",
  building: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  send: "m22 2-7 20-4-9-9-4zM22 2 11 13",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
  check: "M20 6 9 17l-5-5",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  pin: "M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M22 6l-10 7L2 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  chevron: "m9 18 6-6-6-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  copy: "M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15",
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.more} />
    </svg>
  );
}

export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge b-${status.toLowerCase().replaceAll(" ", "-")}`}>
      {status}
    </span>
  );
}

/** Pipeline status pill. Uses the estimate's raw status key. */
export function StatusPill({ status }: { status: string }) {
  return <span className={`pill s-${status}`}>{statusLabel(status)}</span>;
}

export function TenantLogo({
  company,
  large = false,
}: {
  company: any;
  large?: boolean;
}) {
  return company.logo_key ? (
    <img
      className={large ? "tenantLogo large" : "tenantLogo"}
      src={`/api/files?company=${company.id}&kind=logo`}
      alt={`${company.name} logo`}
    />
  ) : (
    <span
      className={large ? "companyLogo large" : "companyLogo"}
      style={{ background: company.primary_color, color: company.accent_color }}
    >
      {initials(company.name)}
    </span>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good";
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <p className={tone === "good" ? "good" : ""}>{sub}</p>}
    </div>
  );
}

export function EstimateTable({
  rows,
  canSeeCosts,
  onSelect,
}: {
  rows: any[];
  canSeeCosts: boolean;
  onSelect?: (estimate: any) => void;
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Estimate</th>
            <th>Customer</th>
            <th>Amount</th>
            {canSeeCosts && <th>Margin</th>}
            <th>Status</th>
            <th>
              <span className="srOnly">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              className={onSelect ? "clickableRow" : ""}
              onClick={() => onSelect?.(e)}
            >
              <td>
                <strong>{e.estimate_number}</strong>
                <small>{new Date(e.updated_at).toLocaleDateString()}</small>
              </td>
              <td>
                <strong className="weightMedium">{e.customer}</strong>
                <small>{e.property_address}</small>
              </td>
              <td>
                <strong>{money(e.total)}</strong>
                <small>{money(e.deposit)} deposit</small>
              </td>
              {canSeeCosts && (
                <td>
                  <strong className="weightMedium">
                    {Math.round(e.gross_margin ?? 0)}%
                  </strong>
                  <small>{money(e.gross_profit)} GP</small>
                </td>
              )}
              <td>
                <StatusPill status={e.status} />
              </td>
              <td className="rowAction">
                {onSelect && (
                  <button
                    className="iconBtn ghost"
                    aria-label={`Open ${e.estimate_number}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(e);
                    }}
                  >
                    <Icon name="chevron" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="emptyState">No estimates match these filters.</div>
      )}
    </div>
  );
}

export function materialName(ctx: Ctx, id: string) {
  const m = ctx.materials.find((x) => x.id === id);
  return [m?.name ?? "Fence", m?.style, m?.height, m?.color]
    .filter(Boolean)
    .join(" · ");
}
