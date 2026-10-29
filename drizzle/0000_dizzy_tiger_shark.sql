CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_company_created` ON `activity_log` (`company_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `addons` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`pricing_mode` text NOT NULL,
	`internal_cost` real NOT NULL,
	`customer_price` real NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`settings` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_users` (
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`pricing_admin` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_company_users_membership` ON `company_users` (`company_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`customer_company` text,
	`property_address` text NOT NULL,
	`billing_address` text,
	`phone` text,
	`mobile` text,
	`email` text,
	`lead_source` text,
	`notes` text,
	`assigned_user_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customers_company_name` ON `customers` (`company_id`,`last_name`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text,
	`kind` text NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_addons` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`addon_id` text NOT NULL,
	`quantity` real NOT NULL,
	`customer_price` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`material_cost` real NOT NULL,
	`labor_cost` real NOT NULL,
	`other_cost` real NOT NULL,
	`total_cost` real NOT NULL,
	`gross_profit` real NOT NULL,
	`gross_margin` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_gates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`section_id` text,
	`gate_id` text NOT NULL,
	`width` real NOT NULL,
	`quantity` integer NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `estimate_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`section_id` text,
	`visibility` text NOT NULL,
	`body` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`section_id` text,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`material_id` text NOT NULL,
	`description` text NOT NULL,
	`length_feet` real NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `idx_sections_company_estimate` ON `estimate_sections` (`company_id`,`estimate_id`);--> statement-breakpoint
CREATE TABLE `estimate_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_estimate_versions_number` ON `estimate_versions` (`company_id`,`estimate_id`,`version`);--> statement-breakpoint
CREATE TABLE `estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`assigned_user_id` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`discount_pct` real DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`deposit` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_estimates_company_number` ON `estimates` (`company_id`,`estimate_number`);--> statement-breakpoint
CREATE INDEX `idx_estimates_company_status` ON `estimates` (`company_id`,`status`);--> statement-breakpoint
CREATE TABLE `gates` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`description` text NOT NULL,
	`width` real NOT NULL,
	`internal_cost` real NOT NULL,
	`sell_price` real NOT NULL,
	`labor_cost` real NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`style` text,
	`height` text,
	`color` text,
	`material_cost_per_foot` real NOT NULL,
	`labor_cost_per_foot` real NOT NULL,
	`sell_price_per_foot` real NOT NULL,
	`removal_price_per_foot` real DEFAULT 0 NOT NULL,
	`post_cost` real DEFAULT 0 NOT NULL,
	`concrete_cost` real DEFAULT 0 NOT NULL,
	`minimum_charge` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_materials_company_active` ON `materials` (`company_id`,`active`);--> statement-breakpoint
CREATE TABLE `quote_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`version_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`signature` text NOT NULL,
	`approved_amount` real NOT NULL,
	`accepted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`oai_user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_oai_user_id` ON `users` (`oai_user_id`);