ALTER TABLE companies ADD COLUMN legal_name TEXT;
--> statement-breakpoint
ALTER TABLE companies ADD COLUMN slug TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE companies ADD COLUMN status TEXT NOT NULL DEFAULT 'trial';
--> statement-breakpoint
ALTER TABLE companies ADD COLUMN setup_step INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE companies ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
--> statement-breakpoint
ALTER TABLE users ADD COLUMN platform_role TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
--> statement-breakpoint
ALTER TABLE company_users ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE company_users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE materials ADD COLUMN other_cost_per_foot REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE materials ADD COLUMN minimum_sell_price_per_foot REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE materials ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE materials ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE gates ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE gates ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE addons ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE addons ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimates ADD COLUMN property_id TEXT;
--> statement-breakpoint
ALTER TABLE estimates ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage';
--> statement-breakpoint
ALTER TABLE estimates ADD COLUMN discount_value REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE estimates ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'not_required';
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN section_name TEXT NOT NULL DEFAULT 'Section';
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN style TEXT;
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN height TEXT;
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN color TEXT;
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN sell_price REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_sections ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_gates ADD COLUMN sell_price REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE estimate_gates ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_gates ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_estimate_gates_tenant ON estimate_gates(company_id,estimate_id);
--> statement-breakpoint
ALTER TABLE estimate_addons ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_addons ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_estimate_addons_tenant ON estimate_addons(company_id,estimate_id);
--> statement-breakpoint
ALTER TABLE estimate_photos ADD COLUMN target_type TEXT NOT NULL DEFAULT 'job';
--> statement-breakpoint
ALTER TABLE estimate_photos ADD COLUMN target_id TEXT;
--> statement-breakpoint
ALTER TABLE estimate_photos ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_estimate_photos_tenant ON estimate_photos(company_id,estimate_id);
--> statement-breakpoint
ALTER TABLE estimate_notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_costs ADD COLUMN gate_cost REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE estimate_costs ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_costs ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_estimate_costs_tenant ON estimate_costs(company_id,estimate_id);
--> statement-breakpoint
ALTER TABLE estimate_versions ADD COLUMN approval_token TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE estimate_versions ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_estimate_versions_token ON estimate_versions(approval_token);
--> statement-breakpoint
ALTER TABLE documents ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(company_id,estimate_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_version ON quote_acceptances(company_id,version_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS company_settings (
 company_id TEXT PRIMARY KEY NOT NULL,address TEXT,city TEXT,state TEXT,zip TEXT,phone TEXT,email TEXT,website TEXT,primary_contact TEXT,timezone TEXT,logo_key TEXT,
 primary_color TEXT NOT NULL DEFAULT '#123447',secondary_color TEXT NOT NULL DEFAULT '#2f7d62',accent_color TEXT NOT NULL DEFAULT '#c8ef5a',sales_tax REAL NOT NULL DEFAULT 0,deposit_pct REAL NOT NULL DEFAULT 30,quote_expiration_days INTEGER NOT NULL DEFAULT 30,estimate_prefix TEXT NOT NULL DEFAULT 'FQP',next_estimate_number INTEGER NOT NULL DEFAULT 10001,min_gross_margin REAL NOT NULL DEFAULT 30,max_sales_discount REAL NOT NULL DEFAULT 5,proposal_terms TEXT,proposal_footer TEXT,approval_text TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,description TEXT,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',invited_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_company_email ON invitations(company_id,email);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS properties (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,customer_id TEXT NOT NULL,address TEXT NOT NULL,city TEXT NOT NULL,state TEXT NOT NULL,zip TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_properties_company_customer ON properties(company_id,customer_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS material_styles (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,material_id TEXT NOT NULL,name TEXT NOT NULL,height TEXT,color TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_styles_company_material ON material_styles(company_id,material_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS estimate_drafts (id TEXT PRIMARY KEY NOT NULL,company_id TEXT NOT NULL,user_id TEXT NOT NULL,customer_id TEXT,payload TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_company_user ON estimate_drafts(company_id,user_id);
--> statement-breakpoint
PRAGMA optimize;
