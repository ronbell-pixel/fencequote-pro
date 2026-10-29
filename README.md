# FenceQuote Pro

Multi-company fence estimating: satellite yard measuring, margin-protected pricing, branded proposals, and customer e-signature.

Runs on Cloudflare Workers (via [vinext](https://github.com/cloudflare/vinext)), with Cloudflare D1 for data, R2 for files, and Cloudflare Access for staff sign-in.

- **Deploying:** see [DEPLOY.md](DEPLOY.md)
- **Local development:** `npm install`, then `npm run dev` (auto-signs you in as a demo admin on localhost)
- **Tests:** `npm test`

## Layout

| Path | What it is |
| --- | --- |
| `app/page.tsx` | Staff app entry; shows the sign-in page when there's no Access login |
| `app/FenceQuoteApp.tsx` | App shell: navigation, search, notifications |
| `app/components/` | One file per screen (Dashboard, Estimates, Builder, Proposal, …) |
| `app/p/[token]/` | Public customer proposal and e-signature page |
| `app/api/` | JSON API routes; all except `acceptance` require a staff login |
| `lib/auth.ts` | Cloudflare Access JWT verification |
| `lib/tenant.ts` | Sessions, company isolation, roles, database schema bootstrap |
| `lib/esign.ts` | Signing links, audit trail, document fingerprinting |
| `wrangler.jsonc` | Worker config: D1/R2 bindings and settings |

## Who can sign in

1. Cloudflare Access decides who reaches the site at all (an email allow-list).
2. The app then checks the signed Access token on every request.
3. The app only lets in emails that a company owner added in **Settings → Users**, or that appear in `SUPER_ADMIN_EMAILS`.

Customers never sign in. They use the unguessable proposal link, which only shows and signs that single proposal.
