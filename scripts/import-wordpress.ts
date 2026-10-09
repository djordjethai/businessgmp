import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pipeline } from "node:stream/promises";
import * as unzipper from "unzipper";
import {
  cleanHtml,
  collectInternalLinks,
  excerptFromHtml,
  localUploadPath,
  parseWxr,
  plainTextFromHtml,
  removeDuplicateLeadingFeaturedImage,
  removeDuplicateLeadingTitle,
} from "../lib/wordpress";
import type { ContentItem, MediaManifestEntry } from "../lib/types";
import { CONTACT_EMAIL } from "../lib/site";

const root = process.cwd();
const sourceDirectory = path.join(root, "migration-source");
const xmlPath = path.join(sourceDirectory, "businessonlinemastery.WordPress.2026-10-07.xml");
const uploadsPath = path.join(sourceDirectory, "backup_2026-10-01-0513_Business_Online_Mastery_04fc342b4815-uploads.zip");
const publicUploads = path.join(root, "public", "wp-content", "uploads");
const contentDirectory = path.join(root, "content");
const migrationDirectory = path.join(root, "migration");
const allowedMediaExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".pdf", ".mp4", ".webm", ".mp3", ".wav", ".ogg", ".m4a", ".mov", ".doc", ".docx", ".xls", ".xlsx", ".pbit", ".zip", ".txt"]);
const siteUrl = "https://business.georgemposi.com";
const excludedPageReasons = new Map<string, string>([
  ["subscribe", "obsolete newsletter signup"],
  ["thank-you", "obsolete newsletter confirmation"],
  ["dashboard", "obsolete account dashboard"],
  ["student-registration", "obsolete course registration"],
  ["instructor-registration", "obsolete course registration"],
  ["courses", "obsolete paid course/service page"],
  ["shop", "WooCommerce shop"],
  ["cart", "WooCommerce cart"],
  ["checkout", "WooCommerce checkout"],
  ["my-account", "WooCommerce account"],
  ["refund_returns", "obsolete commerce policy"],
  ["login-customizer", "WordPress plugin system page"],
  ["content-restricted", "obsolete membership restriction"],
  ["1887-2", "unrelated experimental landing page"],
]);
const categoryNames: Record<string, string> = {
  "ai-llms": "AI & LLMs",
  "excel-vba": "Data & Power BI",
  "global-business": "Business",
  learning: "Learning",
  seo: "SEO",
};
const categoryLandingPages: Record<string, string> = {
  "ai-llms": "ai-llms",
  "excel-and-power-bi": "excel-vba",
  "global-business-2": "global-business",
  learning: "learning",
  "seo-2": "seo",
};

type ZipFile = unzipper.File & { path: string; type: string };

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeArchiveRelativePath(entryPath: string): string | undefined {
  const normalized = entryPath.replaceAll("\\", "/");
  const match = normalized.match(/^uploads\/(\d{4}\/\d{2}\/.+)$/);
  if (!match || match[1].split("/").includes("..")) return undefined;
  if (!allowedMediaExtensions.has(path.extname(match[1]).toLowerCase())) return undefined;
  return match[1];
}

async function extractUploads(zipPath: string): Promise<{ files: Set<string>; relativeFiles: string[]; extracted: number }> {
  await rm(publicUploads, { recursive: true, force: true });
  await mkdir(publicUploads, { recursive: true });
  const archive = await unzipper.Open.file(zipPath);
  const files = new Set<string>();
  const relativeFiles: string[] = [];
  let extracted = 0;
  for (const entry of archive.files as ZipFile[]) {
    if (entry.type === "Directory") continue;
    const relativePath = safeArchiveRelativePath(entry.path);
    if (!relativePath) continue;
    const destination = path.join(publicUploads, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await pipeline(entry.stream(), createWriteStream(destination));
    files.add(relativePath.toLowerCase());
    relativeFiles.push(relativePath);
    extracted += 1;
  }
  return { files, relativeFiles, extracted };
}

function uploadRelativePath(publicPath: string): string | undefined {
  const prefix = "/wp-content/uploads/";
  if (!publicPath.toLowerCase().startsWith(prefix)) return undefined;
  let relative = publicPath.slice(prefix.length).split(/[?#]/, 1)[0];
  try {
    relative = decodeURIComponent(relative);
  } catch {
    // Keep the source spelling when an old URL contains malformed escapes.
  }
  return relative.replaceAll("\\", "/").toLowerCase();
}

function mediaExists(publicPath: string | undefined, files: ReadonlySet<string>): boolean {
  if (!publicPath) return false;
  const relative = uploadRelativePath(publicPath);
  return relative ? files.has(relative) : false;
}

function collectRequiredUploads(values: unknown[]): Set<string> {
  const required = new Set<string>();
  const serialized = JSON.stringify(values);
  for (const match of serialized.matchAll(/(?<![A-Za-z0-9._-])\/wp-content\/uploads\/[^\s"'<>),\\]+/g)) {
    const relative = uploadRelativePath(match[0]);
    if (relative) required.add(relative);
  }
  return required;
}

async function pruneUnusedUploads(relativeFiles: string[], requiredFiles: ReadonlySet<string>): Promise<{ removed: number; retained: number; removedBytes: number; retainedBytes: number }> {
  let removed = 0;
  let retained = 0;
  let removedBytes = 0;
  let retainedBytes = 0;
  for (const relativeFile of relativeFiles) {
    const filePath = path.join(publicUploads, ...relativeFile.split("/"));
    const size = (await stat(filePath)).size;
    if (requiredFiles.has(relativeFile.toLowerCase())) {
      retained += 1;
      retainedBytes += size;
      continue;
    }
    await rm(filePath);
    removed += 1;
    removedBytes += size;
  }
  return { removed, retained, removedBytes, retainedBytes };
}

function normalizePathname(value: string): string {
  try {
    const pathname = new URL(value, siteUrl).pathname;
    if (pathname === "/") return "/";
    if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return pathname;
    return `/${pathname.split("/").filter(Boolean).join("/")}/`;
  } catch {
    return value;
  }
}

async function fetchSitemapUrls(): Promise<string[]> {
  const indexResponse = await fetch(`${siteUrl}/sitemap_index.xml`);
  if (!indexResponse.ok) throw new Error(`Sitemap index returned ${indexResponse.status}`);
  const index = await indexResponse.text();
  const childUrls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const urls: string[] = [];
  for (const childUrl of childUrls) {
    const response = await fetch(childUrl);
    if (!response.ok) throw new Error(`${childUrl} returned ${response.status}`);
    const xml = await response.text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  }
  return [...new Set(urls)];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function galleryAttachmentIds(html: string): number[] {
  const ids: number[] = [];
  for (const shortcode of html.matchAll(/\[gallery\b[^\]]*\bids=["']([^"']+)["'][^\]]*\]/gi)) {
    for (const id of shortcode[1].split(",")) {
      const parsed = Number(id.trim());
      if (Number.isInteger(parsed)) ids.push(parsed);
    }
  }
  return ids;
}

function isRemovedDestination(value: string): boolean {
  const pathname = normalizePathname(value);
  return excludedPageReasons.has(pathname.split("/").filter(Boolean)[0] || "")
    || pathname.startsWith("/courses/")
    || pathname.startsWith("/course-category/")
    || pathname.startsWith("/product/")
    || pathname.startsWith("/product-category/");
}

function unlinkRemovedDestinations(html: string): string {
  return html.replace(/\s+href=(["'])(\/[^"']+)\1/gi, (attribute, _quote: string, href: string) => isRemovedDestination(href) ? "" : attribute);
}

function applyStaticPageOverrides(item: ContentItem): ContentItem {
  if (item.slug === "home") {
    return {
      ...item,
      excerpt: "Practical writing about AI, data, digital business, learning, and SEO—grounded in more than 30 years of technology and business experience.",
      contentHtml: "",
      seoTitle: "Business Online Mastery — Sharing The Experience",
      seoDescription: "Practical articles about AI and LLMs, data and Power BI, global business, learning, and SEO.",
    };
  }

  if (item.slug === "contact-us") {
    return {
      ...item,
      excerpt: `Contact Business Online Mastery at ${CONTACT_EMAIL}.`,
      contentHtml: "",
      seoDescription: `Contact Business Online Mastery by email at ${CONTACT_EMAIL}.`,
    };
  }

  if (item.slug === "blog") {
    return {
      ...item,
      excerpt: "Explore the complete Business Online Mastery article archive.",
      contentHtml: '<p>Browse practical articles about AI and LLMs, data and Power BI, global business, learning, and SEO.</p><p><a href="/search/"><strong>Search the complete archive.</strong></a></p>',
      seoDescription: "Explore the Business Online Mastery technical and professional article archive.",
    };
  }

  const categorySlug = categoryLandingPages[item.slug];
  if (categorySlug) {
    const name = categoryNames[categorySlug];
    return {
      ...item,
      title: name,
      excerpt: `Explore ${name} articles from Business Online Mastery.`,
      contentHtml: `<p>This archive has moved to the dedicated <a href="/category/${categorySlug}/"><strong>${name} collection</strong></a>.</p>`,
      seoDescription: `Explore ${name} articles from Business Online Mastery.`,
    };
  }

  if (item.slug === "privacy-policy") {
    return {
      ...item,
      excerpt: "A plain-language privacy note for the static Business Online Mastery website.",
      contentHtml: `<h2>About this website</h2>
<p>Business Online Mastery is a static editorial website. It has no user accounts, comments, contact forms, newsletter signup, advertising, store, or on-site payment features. The site itself does not use analytics or set marketing cookies.</p>
<h2>Email</h2>
<p>If you choose to contact me by email, the message is handled by your email provider and the recipient email provider. Only include information you are comfortable sending by email.</p>
<h2>External websites</h2>
<p>This site links to external websites, including social networks and services discussed in articles. Those websites have their own privacy policies and may collect information when you visit them.</p>
<h2>Hosting</h2>
<p>The hosting provider may process basic technical request information, such as IP address, browser details, and request time, for security and reliable delivery of the website.</p>
<h2>Contact</h2>
<p>For privacy questions, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
      seoTitle: "Privacy Policy",
      seoDescription: "Privacy information for the static Business Online Mastery website.",
    };
  }

  if (item.slug === "terms-of-use") {
    return {
      ...item,
      excerpt: "Terms for using the Business Online Mastery editorial archive.",
      contentHtml: `<h2>Informational content</h2><p>Business Online Mastery publishes personal professional experience and general educational information. The articles are not legal, financial, or professional advice for a specific situation.</p><h2>External links</h2><p>Links to third-party websites are provided for context. Their availability, content, and policies are outside this site's control.</p><h2>Copyright</h2><p>Unless otherwise stated, the original writing and site presentation may not be republished in full without permission.</p><h2>Contact</h2><p>Questions may be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
      seoTitle: "Terms of Use",
      seoDescription: "Terms for using the Business Online Mastery editorial archive.",
    };
  }

  return item;
}

function createAboutPage(home: ContentItem): ContentItem {
  return {
    ...home,
    id: -1,
    slug: "about",
    route: "/about/",
    oldUrl: `${siteUrl}/about/`,
    title: "About",
    excerpt: "The experience behind Business Online Mastery.",
    contentHtml: `<p>My name is George M. Posi. For more than 30 years I have worked as an owner and manager in the information-technology and IT-services industry.</p><p>Business Online Mastery is where I share what that experience continues to teach me—from AI and large language models to data, Power BI, digital business, learning, and SEO.</p><p>The goal is practical: make complex technology easier to understand, connect it to real business work, and share lessons that may help other professionals and entrepreneurs.</p>`,
    categories: [],
    categorySlugs: [],
    tags: [],
    tagSlugs: [],
    featuredImageId: undefined,
    featuredImage: undefined,
    featuredImageAlt: undefined,
    seoTitle: "About Business Online Mastery",
    seoDescription: "Learn about the professional experience and purpose behind Business Online Mastery.",
    focusKeyword: undefined,
    canonical: `${siteUrl}/about/`,
  };
}

async function main(): Promise<void> {
  const xml = await readFile(xmlPath, "utf8");
  const parsed = parseWxr(xml);
  const uploadResult = await extractUploads(uploadsPath);
  const attachmentById = new Map(parsed.attachments.map((attachment) => [attachment.id, attachment]));
  const altByPath = new Map(
    parsed.attachments
      .filter((attachment) => attachment.localPath && attachment.alt)
      .map((attachment) => [attachment.localPath as string, attachment.alt as string]),
  );

  const functionalDependencies: Array<{ route: string; type: string; detail: string }> = [];
  const removedShortcodes: Array<{ route: string; shortcode: string }> = [];
  const excludedPages = parsed.items
    .filter((item) => item.type === "page" && excludedPageReasons.has(item.slug))
    .map((item) => ({ route: item.route, slug: item.slug, title: item.title, reason: excludedPageReasons.get(item.slug) as string }));
  const sourceItems = parsed.items.filter((item) => item.type === "post" || !excludedPageReasons.has(item.slug));
  const galleryIds = new Set(sourceItems.flatMap((item) => galleryAttachmentIds(item.contentHtml)));
  const importedItems = sourceItems.map((item): ContentItem => {
    const cleaned = cleanHtml(item.contentHtml, altByPath);
    if (cleaned.hadInteractiveForm) {
      functionalDependencies.push({ route: item.route, type: "form", detail: "WordPress form controls were removed; preserve any valid outbound links separately." });
    }
    if (cleaned.hadInlineScript) {
      functionalDependencies.push({ route: item.route, type: "inline-script", detail: "Inline WordPress script was removed for the static migration." });
    }
    for (const shortcode of cleaned.removedShortcodes) {
      removedShortcodes.push({ route: item.route, shortcode });
    }
    const featured = item.featuredImageId ? attachmentById.get(item.featuredImageId) : undefined;
    const withoutDuplicateImage = removeDuplicateLeadingFeaturedImage(cleaned.html, featured?.localPath);
    const contentHtml = removeDuplicateLeadingTitle(withoutDuplicateImage, item.title);
    return applyStaticPageOverrides({
      ...item,
      contentHtml,
      excerpt: item.excerpt ? plainTextFromHtml(item.excerpt) : excerptFromHtml(contentHtml),
      featuredImage: featured?.localPath,
      featuredImageAlt: featured?.alt || featured?.title,
    });
  });

  const home = importedItems.find((item) => item.slug === "home");
  if (!home) throw new Error("Published home page was not found in the WXR export");
  const items = [...importedItems, createAboutPage(home)];

  const usedCategorySlugs = new Set(items.filter((item) => item.type === "post").flatMap((item) => item.categorySlugs));
  const categories = parsed.categories
    .filter((category) => usedCategorySlugs.has(category.slug))
    .map((category) => ({
      ...category,
      name: categoryNames[category.slug] || category.name,
      descriptionHtml: cleanHtml(category.descriptionHtml, altByPath).html,
    }));
  for (const item of items) {
    item.categories = item.categorySlugs.map((slug, index) => categoryNames[slug] || item.categories[index] || slug);
  }
  const tagCounts = new Map<string, { name: string; count: number }>();
  for (const post of items.filter((item) => item.type === "post")) {
    post.tagSlugs.forEach((slug, index) => {
      const current = tagCounts.get(slug);
      tagCounts.set(slug, { name: post.tags[index] || slug, count: (current?.count || 0) + 1 });
    });
  }
  const usefulTags = [...tagCounts.entries()]
    .filter(([, value]) => value.count >= 4)
    .map(([slug, value]) => ({ slug, ...value }))
    .sort((a, b) => b.count - a.count);

  const knownRoutes = new Set<string>([
    "/",
    "/search/",
    ...items.filter((item) => item.route !== "/").map((item) => item.route),
    ...categories.map((category) => `/category/${category.slug}/`),
    ...usefulTags.map((tag) => `/tag/${tag.slug}/`),
  ]);
  const allInternalLinkIssues = collectInternalLinks(items, knownRoutes);
  const removedRoutes = new Set(excludedPages.map((page) => page.route));
  const removedContentLinks = allInternalLinkIssues.filter((issue) => removedRoutes.has(normalizePathname(issue.href)) || isRemovedDestination(issue.href));
  const internalLinks = allInternalLinkIssues.filter((issue) => !removedRoutes.has(normalizePathname(issue.href)) && !isRemovedDestination(issue.href));
  for (const item of items) item.contentHtml = unlinkRemovedDestinations(item.contentHtml);

  await rm(contentDirectory, { recursive: true, force: true });
  await mkdir(path.join(contentDirectory, "posts"), { recursive: true });
  await mkdir(path.join(contentDirectory, "pages"), { recursive: true });
  await mkdir(migrationDirectory, { recursive: true });
  for (const item of items) {
    const folder = item.type === "post" ? "posts" : "pages";
    await writeFile(path.join(contentDirectory, folder, `${item.slug}.json`), json(item));
  }
  await writeFile(path.join(contentDirectory, "categories.json"), json(categories));
  await writeFile(path.join(contentDirectory, "tags.json"), json(usefulTags));

  const requiredUploads = collectRequiredUploads([items, categories]);
  for (const id of galleryIds) {
    const localPath = attachmentById.get(id)?.localPath;
    const relative = localPath ? uploadRelativePath(localPath) : undefined;
    if (relative) requiredUploads.add(relative);
  }
  const missingMedia = new Set<string>();
  for (const relative of requiredUploads) {
    if (!uploadResult.files.has(relative)) missingMedia.add(`/wp-content/uploads/${relative}`);
  }
  const mediaPruning = await pruneUnusedUploads(uploadResult.relativeFiles, requiredUploads);
  const mappedAttachments = parsed.attachments.map((attachment) => {
    const relative = attachment.localPath ? uploadRelativePath(attachment.localPath) : undefined;
    return {
      ...attachment,
      localPath: relative && requiredUploads.has(relative) && uploadResult.files.has(relative) ? attachment.localPath : undefined,
    };
  });
  const attachmentByRelativePath = new Map(
    parsed.attachments
      .filter((attachment) => attachment.localPath)
      .map((attachment) => [uploadRelativePath(attachment.localPath as string) as string, attachment]),
  );
  const mediaManifest: MediaManifestEntry[] = [...requiredUploads].sort().map((relative) => {
    const attachment = attachmentByRelativePath.get(relative);
    const migratedPath = `/wp-content/uploads/${relative}`;
    const contentReferences = items
      .filter((item) => item.contentHtml.toLowerCase().includes(migratedPath.toLowerCase()))
      .map((item) => item.route);
    const featuredImageReferences = items
      .filter((item) => uploadRelativePath(item.featuredImage || "") === relative)
      .map((item) => item.route);
    return {
      sourceUrl: attachment?.sourceUrl || `${siteUrl}${migratedPath}`,
      attachmentId: attachment?.id,
      localSourcePath: `uploads/${relative}`,
      contentReferences,
      featuredImageReferences,
      alt: attachment?.alt,
      migratedPath,
    };
  });
  await writeFile(path.join(migrationDirectory, "attachment-map.json"), json(mappedAttachments));
  await writeFile(path.join(migrationDirectory, "media-manifest.json"), json(mediaManifest));
  await writeFile(path.join(migrationDirectory, "internal-links.json"), json(internalLinks));
  await writeFile(path.join(migrationDirectory, "removed-content-links.json"), json(removedContentLinks));
  await writeFile(
    path.join(migrationDirectory, "url-map.json"),
    json([
      ...items.map((item) => ({ old_url: item.oldUrl, new_url: new URL(item.route, siteUrl).toString(), status: normalizePathname(item.oldUrl) === item.route ? "same" : "mapped" })),
      ...excludedPages.map((page) => ({ old_url: new URL(page.route, siteUrl).toString(), new_url: null, status: "intentionally_removed", reason: page.reason })),
    ]),
  );

  let oldUrls: string[] = [];
  let sitemapError: string | undefined;
  try {
    oldUrls = await fetchSitemapUrls();
  } catch (error) {
    sitemapError = error instanceof Error ? error.message : String(error);
  }
  const generatedUrls = unique([
    "/",
    ...items.filter((item) => item.route !== "/").map((item) => item.route),
    ...categories.map((category) => `/category/${category.slug}/`),
    ...usefulTags.map((tag) => `/tag/${tag.slug}/`),
    "/search/",
  ]).sort();
  const oldPaths = unique(oldUrls.map(normalizePathname)).sort();
  const generatedSet = new Set(generatedUrls);
  const oldSet = new Set(oldPaths);
  const removedReasonByRoute = new Map(excludedPages.map((page) => [page.route, page.reason]));
  const intentionallyRemovedUrls = oldPaths
    .filter((url) => !generatedSet.has(url))
    .map((url) => {
      const reason = removedReasonByRoute.get(url)
        || (url.startsWith("/tag/") ? "low-value tag archive" : undefined);
      return reason ? { url, reason } : undefined;
    })
    .filter((entry): entry is { url: string; reason: string } => Boolean(entry));
  const intentionallyRemovedSet = new Set(intentionallyRemovedUrls.map((entry) => entry.url));
  const urlAudit = {
    auditedAt: new Date().toISOString(),
    sitemapError,
    oldUrls: oldPaths,
    generatedUrls,
    intentionallyRemovedUrls,
    missingUrls: oldPaths.filter((url) => !generatedSet.has(url) && !intentionallyRemovedSet.has(url)),
    newOnlyUrls: generatedUrls.filter((url) => !oldSet.has(url)),
  };
  await writeFile(path.join(migrationDirectory, "url-audit.json"), json(urlAudit));

  const searchIndex = items
    .filter((item) => item.type === "post" || (item.type === "page" && item.route !== "/"))
    .map((item) => ({ title: item.title, slug: item.route, excerpt: item.excerpt, categories: item.categories, body: plainTextFromHtml(item.contentHtml) }));
  await mkdir(path.join(root, "public"), { recursive: true });
  await writeFile(path.join(root, "public", "search-index.json"), json(searchIndex));

  const report = {
    generatedAt: new Date().toISOString(),
    postsImported: items.filter((item) => item.type === "post").length,
    pagesImported: items.filter((item) => item.type === "page").length,
    categoriesImported: categories.length,
    usefulTagArchives: usefulTags.length,
    attachmentsInWxr: parsed.attachments.length,
    attachmentsMapped: mappedAttachments.filter((attachment) => attachment.localPath).length,
    mediaFilesExtracted: uploadResult.extracted,
    mediaFilesRetained: mediaPruning.retained,
    mediaFilesPruned: mediaPruning.removed,
    mediaRetainedBytes: mediaPruning.retainedBytes,
    mediaPrunedBytes: mediaPruning.removedBytes,
    missingMedia: [...missingMedia].sort(),
    unresolvedInternalLinks: internalLinks,
    linksToRemovedContent: removedContentLinks,
    wooCommerceItemsExcluded: parsed.sourceInventory.productItems,
    pagesIntentionallyExcluded: excludedPages,
    historicalComments: parsed.comments,
    functionalDependencies,
    removedShortcodes,
    sitemap: {
      oldUrlCount: oldPaths.length,
      generatedUrlCount: generatedUrls.length,
      missingUrlCount: urlAudit.missingUrls.length,
      intentionallyRemovedUrlCount: intentionallyRemovedUrls.length,
      newOnlyUrlCount: urlAudit.newOnlyUrls.length,
      error: sitemapError,
    },
  };
  await writeFile(path.join(migrationDirectory, "content-report.json"), json(report));

  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

