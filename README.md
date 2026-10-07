# Business Online Mastery

A static preservation of **Business Online Mastery — Sharing The Experience**, migrated from WordPress to Next.js. The public site is an editorial archive covering AI and LLMs, data and Power BI, global business, learning, and SEO.

## Architecture

- Next.js, TypeScript, and the App Router
- Static export with trailing slashes
- No backend, database, CMS, accounts, forms, newsletter, or commerce runtime
- Content stored as JSON under `content/`
- Editorial media stored under `public/wp-content/uploads/`
- Client-side search generated as `public/search-index.json`
- Production output generated in `out/`

## Local development

```powershell
npm install
npm run dev
```

Run the complete test, build, and static-output validation sequence with:

```powershell
npm run check
```

## Content updates

The live website is no longer WordPress. For normal maintenance, edit the relevant JSON content, components, styles, or media directly, then run `npm run check` before committing.

The `npm run import:wordpress` command is a preserved one-time migration utility. It rebuilds generated content and media from the archived WXR and uploads ZIP and should not be used for routine updates.

## Migration sources and reports

The ignored `migration-source/` directory contains the local WordPress WXR and uploads backup. Never commit those source archives.

The importer:

- accepts only published posts and meaningful published pages;
- normalizes internal URLs and dated upload paths;
- preserves useful Yoast/Rank Math metadata;
- removes forms, scripts, dead shortcodes, and implementation-only markup;
- excludes WooCommerce, course, account, subscription, and plugin-system pages;
- retains only media referenced by editorial content or featured images; and
- compares the static routes with the live legacy sitemap.

Audit artifacts are written under `migration/`, including:

- `content-report.json`
- `url-map.json`
- `url-audit.json`
- `internal-links.json`
- `removed-content-links.json`
- `attachment-map.json`
- `media-manifest.json`

## Deployment

The existing Azure Static Web Apps workflow at `.github/workflows/azure-static-web-apps-zealous-pond-020176010.yml` remains unchanged. It builds from `/`, publishes `out/`, and deploys when `main` is pushed.

Do not add a second workflow, rename the deployment secret, or change DNS as part of ordinary content updates.
