import type { ContentItem } from "@/lib/types";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/site";
import { absoluteUrl, SITE_NAME, SITE_SUBTITLE, SITE_URL, stripSeoVariables } from "@/lib/seo";

type SchemaNode = Record<string, unknown>;

export type StructuredData = {
  "@context": "https://schema.org";
  "@graph": SchemaNode[];
};

export const PUBLIC_AUTHOR_NAME = "George M. Posi";

const WEBSITE_ID = `${SITE_URL}/#website`;
const PUBLISHER_ID = `${SITE_URL}/#organization`;
const AUTHOR_URL = absoluteUrl("/about/");
const AUTHOR_ID = `${AUTHOR_URL}#person`;

function graph(nodes: SchemaNode[]): StructuredData {
  return { "@context": "https://schema.org", "@graph": nodes };
}

function website(): SchemaNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_SUBTITLE,
    inLanguage: "en",
    publisher: { "@id": PUBLISHER_ID },
  };
}

function publisher(): SchemaNode {
  return {
    "@type": "Organization",
    "@id": PUBLISHER_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    email: CONTACT_EMAIL,
    founder: { "@id": AUTHOR_ID },
  };
}

function author(): SchemaNode {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: PUBLIC_AUTHOR_NAME,
    url: AUTHOR_URL,
    email: `mailto:${CONTACT_EMAIL}`,
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
}

function breadcrumb(canonical: string, title: string, category?: { name: string; slug: string }): SchemaNode {
  const items: SchemaNode[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
  ];
  if (category) {
    items.push({ "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(`/category/${category.slug}/`) });
  }
  items.push({ "@type": "ListItem", position: items.length + 1, name: title, item: canonical });
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement: items,
  };
}

function pageType(item: ContentItem): string {
  if (item.slug === "about") return "AboutPage";
  if (item.slug === "contact-us") return "ContactPage";
  return "WebPage";
}

export function homeStructuredData(description: string): StructuredData {
  const canonical = `${SITE_URL}/`;
  return graph([
    website(),
    publisher(),
    author(),
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: `${SITE_NAME} — ${SITE_SUBTITLE}`,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": PUBLISHER_ID },
      inLanguage: "en",
    },
  ]);
}

export function contentStructuredData(item: ContentItem): StructuredData {
  const canonical = item.canonical || absoluteUrl(item.route);
  const title = stripSeoVariables(item.seoTitle, item.title);
  const description = item.seoDescription || item.excerpt || SITE_SUBTITLE;
  const image = item.featuredImage ? absoluteUrl(item.featuredImage) : undefined;
  const category = item.type === "post" && item.categories[0] && item.categorySlugs[0]
    ? { name: item.categories[0], slug: item.categorySlugs[0] }
    : undefined;
  const page: SchemaNode = {
    "@type": pageType(item),
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: { "@id": `${canonical}#breadcrumb` },
    primaryImageOfPage: image ? { "@type": "ImageObject", url: image } : undefined,
    datePublished: item.date,
    dateModified: item.modified || item.date,
    inLanguage: "en",
  };
  if (item.slug === "about") page.about = [{ "@id": PUBLISHER_ID }, { "@id": AUTHOR_ID }];

  const nodes = [website(), publisher(), author(), breadcrumb(canonical, item.title, category), page];
  if (item.type === "post") {
    nodes.push({
      "@type": "BlogPosting",
      "@id": `${canonical}#article`,
      url: canonical,
      mainEntityOfPage: { "@id": `${canonical}#webpage` },
      headline: item.title,
      description,
      image: image ? [image] : undefined,
      datePublished: item.date,
      dateModified: item.modified || item.date,
      author: { "@id": AUTHOR_ID },
      publisher: { "@id": PUBLISHER_ID },
      articleSection: item.categories,
      keywords: item.tags,
      inLanguage: "en",
    });
  }
  return graph(nodes);
}

export function archiveStructuredData({
  title,
  description,
  route,
  posts,
}: {
  title: string;
  description: string;
  route: string;
  posts: ContentItem[];
}): StructuredData {
  const canonical = absoluteUrl(route);
  return graph([
    website(),
    publisher(),
    author(),
    breadcrumb(canonical, title),
    {
      "@type": "CollectionPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${canonical}#breadcrumb` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: post.title,
          url: absoluteUrl(post.route),
        })),
      },
      inLanguage: "en",
    },
  ]);
}

export function searchStructuredData(description: string): StructuredData {
  const canonical = absoluteUrl("/search/");
  return graph([
    website(),
    publisher(),
    author(),
    breadcrumb(canonical, "Search"),
    {
      "@type": "SearchResultsPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: "Search",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${canonical}#breadcrumb` },
      inLanguage: "en",
    },
  ]);
}
