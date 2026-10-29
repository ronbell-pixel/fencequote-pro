# FenceQuote Pro — source backup and migration status

This archive contains the source of FenceQuote Pro as retrieved on October 29, 2026. It is a source backup, not a completed Cloudflare migration package. Do not deploy it as a production application yet.

## Work needed before deployment

1. Replace Sites-managed Sign in with ChatGPT and trusted identity headers with a secure authentication system suitable for your Cloudflare deployment. Protect every tenant and administrative API, verify server-side identity, and test tenant isolation and invitation flows. The existing sign-in path and identity headers depend on Sites and will not work on a standalone Worker. Never trust client-supplied identity headers.
2. Configure an independently owned Cloudflare Worker, D1 database (`DB` binding), and private R2 bucket (`UPLOADS` binding). Replace the placeholder development bindings and Sites-specific build configuration with verified Cloudflare deployment configuration. Apply and validate the appropriate schema and migrations on a new database.
3. Export existing records and uploaded files from the current Site using an authorized, verified export route, then import and reconcile them into the new D1 database and R2 bucket. This archive contains source code only, not live customer records, estimates, users, signatures, photos, logos, or credentials. The code seeds demo data when a database is empty.
4. Test login, tenant separation, roles and cost visibility, estimates, customer proposals and acceptance links, uploads, backups, and restore on a private test deployment before changing your domain. The first signed-in user on an empty database is made a super administrator by the current code; change and secure this bootstrap flow before exposure.
5. Connect a private GitHub repository to Cloudflare only after the changes above are completed. Keep secrets out of GitHub and configure them in Cloudflare.

The original Site remains unchanged. The included original README describes its Sites environment, not a complete standalone Cloudflare deployment guide.
