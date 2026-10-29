-- E-signature audit trail for customer proposal acceptance.
ALTER TABLE `quote_acceptances` ADD `signer_email` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `signature_method` text DEFAULT 'typed' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `signature_image` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `consent_text` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `document_hash` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `decision` text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_acceptances` ADD `decline_reason` text;
