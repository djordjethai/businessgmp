# Business Online Mastery publishing rules

- Preserve the author's wording unless editing is explicitly requested. Do not silently rewrite prose.
- Store content as the existing JSON schema with article markup in `contentHtml`; do not introduce MDX.
- Use semantic headings. The layout renders the page title as H1, so start body sections at H2.
- Preserve valid internal and external links. Do not invent URLs.
- Keep local media under `public/wp-content/uploads` and reference it with `/wp-content/uploads/...`. Verify every referenced file exists.
- Do not create duplicate slugs or routes. Validate category names and slugs against `content.config.json`.
- Use `seoDescription` for new content and preserve the existing SEO fields when updating migrated content.
- Do not add contact, newsletter, subscription, or signup forms. Contact is through `mailto:info@georgemposi.com`.
- Preserve the valid Facebook, LinkedIn, and YouTube links and the existing icon components; do not invent social profiles.
- Do not add WooCommerce behavior or product, shop, cart, checkout, or account content.
- Editorial articles may discuss WooCommerce, email marketing, MailerLite, or similar products. Those topics are not runtime dependencies.
- Do not reintroduce WordPress endpoints, shortcodes, plugin scripts, or other WordPress runtime dependencies.
