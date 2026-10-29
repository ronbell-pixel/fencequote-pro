# Deploying FenceQuote Pro to Cloudflare

FenceQuote Pro runs as a single Cloudflare Worker with:

- **D1** (`DB`) for all company, customer, estimate and signature data
- **R2** (`UPLOADS`) for logos and job photos
- **Cloudflare Access** in front of the staff app, with the customer proposal pages left public

Allow about an hour for the first deployment. You need a Cloudflare account and Node.js 22.13 or newer. A domain on Cloudflare is strongly recommended (for example `quotes.yourcompany.com`).

---

## 1. Install and log in

```bash
npm install
npx wrangler login
```

## 2. Create the database and file storage

```bash
npx wrangler d1 create fencequote-db
npx wrangler r2 bucket create fencequote-uploads
```

Copy the `database_id` printed by the first command into `wrangler.jsonc` (`d1_databases[0].database_id`).

The app creates its tables on first use. You do not need to run migrations on a new database.

## 3. Fill in `wrangler.jsonc`

| Setting | What to put |
| --- | --- |
| `SUPER_ADMIN_EMAILS` | Your email (comma-separate several). These people get platform-admin rights. |
| `BOOTSTRAP_COMPANY_NAME` | Your company name. It's created the first time a platform admin signs in to an empty database. |
| `SEED_DEMO_DATA` | Leave `"false"`. `"true"` fills an empty database with demo companies. |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | Filled in at step 5. |

## 4. First deploy and custom domain

```bash
npm run deploy
```

Then in the dashboard go to **Workers & Pages → fencequote-pro → Settings → Domains & Routes → Add → Custom domain**, and enter e.g. `quotes.yourcompany.com`.

Until step 5 is done, the site shows a sign-in page and refuses all data requests. That is expected.

## 5. Set up Cloudflare Access

1. Open **Zero Trust** in the dashboard. On first use, pick a team name and the **Free** plan.
2. **Turn on email codes:** go to **Zero Trust → Integrations → Identity providers → Add new → One-time PIN**.
   New Zero Trust accounts only allow sign-in with a Cloudflare account, and your staff won't have one. Add Google or Microsoft here too if your team uses them.
3. **Protect the staff app:** go to **Access → Applications → Add an application → Self-hosted**.
   - Name: `FenceQuote Pro`
   - Domain: `quotes.yourcompany.com` (no path)
   - Policy: **Allow**, Include → **Emails** → your staff's email addresses.
     (Or **Emails ending in** `@yourcompany.com` if everyone has a company address.)
   - Save, then open the application and copy its **Application Audience (AUD) Tag**.
4. **Keep customer pages public:** add a second **Self-hosted** application.
   - Name: `FenceQuote customer proposals`
   - Domain: `quotes.yourcompany.com` with these paths, one per row: `p/*`, `api/acceptance`, `_next/*`, `favicon.svg`, `og.png`
   - Policy: **Bypass**, Include → **Everyone**

   More specific paths take priority, so customers can open and sign proposals without logging in. Everything else still needs a staff login.

   **Test it:** after step 6, copy a proposal's signing link (Estimates → open a quote → Copy link). Open it in a private/incognito window.
   It must show the proposal with no login screen, with styling and a working signature pad. If you get the Access login, check the paths above.
5. Put your team domain (`yourteam.cloudflareaccess.com`, shown under **Zero Trust → Settings**) and the AUD tag into `wrangler.jsonc`, then deploy again:

```bash
npm run deploy
```

6. **Close the back door (recommended):** under **Settings → Domains & Routes**, disable the `workers.dev` route, or add `"workers_dev": false` to `wrangler.jsonc`.
   The app refuses requests without a valid Access token either way, so this is clean-up, not a security hole.

## 6. First sign-in

Go to `https://quotes.yourcompany.com`, enter your email, and type the code Cloudflare emails you.

- Because your email is in `SUPER_ADMIN_EMAILS`, the app creates your account and the first company.
- Run **Company setup**: logo, colors, tax, deposit, proposal terms.
- **Adding staff** takes two steps: add them in **Settings → Users**, *and* add their email to the Access policy from step 5.3.
  Anyone who passes Access but hasn't been added in the app sees "hasn't been added to a company yet" and gets no data.

> **Price book:** the app doesn't yet have screens to add or edit materials, gates and add-ons. A brand-new company starts with an empty price book. Either import your existing price book (step 7) or add the price-book editing screens before quoting.

## 7. Moving data from the old site (optional)

The source backup contains no live data. If you have an export of the old site's database:

```bash
npx wrangler d1 execute fencequote-db --remote --file=./old-site-export.sql
```

Upload each logo and photo to the same key stored in the database (`company_settings.logo_key`, `estimate_photos.r2_key`):

```bash
npx wrangler r2 object put "fencequote-uploads/<key>" --file=./path/to/file --remote
```

Existing users are matched by email the first time they sign in through Access.

---

## Local development

```bash
npm run dev
```

On `localhost` you're automatically signed in as a demo platform admin, and an empty local database is filled with demo companies. Neither happens in a production build.

```bash
npm test
```

`npm test` builds the app and runs the test suite, including Cloudflare Access token checks (valid, forged, expired, wrong audience and wrong issuer tokens).
