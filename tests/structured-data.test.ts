import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentStructuredData, homeStructuredData, PUBLIC_AUTHOR_NAME } from "../lib/structured-data";
import type { ContentItem } from "../lib/types";

const root = process.cwd();

function content(relativePath: string): ContentItem {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as ContentItem;
}

describe("structured data", () => {
  it("describes posts as BlogPosting with the public author and publisher", () => {
    const data = contentStructuredData(content("content/posts/ai-agents.json"));
    expect(data["@graph"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ "@type": "BlogPosting", headline: "AI Agents", datePublished: expect.any(String), dateModified: expect.any(String), image: expect.arrayContaining([expect.stringMatching(/^https:\/\//)]) }),
      expect.objectContaining({ "@type": "Person", name: PUBLIC_AUTHOR_NAME }),
      expect.objectContaining({ "@type": "Organization", name: "Business Online Mastery" }),
      expect.objectContaining({ "@type": "BreadcrumbList" }),
    ]));
  });

  it("describes the About page and its public identity", () => {
    const about = content("content/pages/about.json");
    const data = contentStructuredData(about);
    expect(about.contentHtml).toContain(PUBLIC_AUTHOR_NAME);
    expect(data["@graph"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ "@type": "AboutPage", about: expect.arrayContaining([expect.objectContaining({ "@id": expect.stringContaining("#person") })]) }),
    ]));
  });

  it("describes the homepage, website, and publishing organization", () => {
    const data = homeStructuredData("Business Online Mastery description");
    expect(data["@graph"]).toEqual(expect.arrayContaining([
      expect.objectContaining({ "@type": "WebSite", name: "Business Online Mastery" }),
      expect.objectContaining({ "@type": "Organization", name: "Business Online Mastery" }),
      expect.objectContaining({ "@type": "WebPage" }),
    ]));
  });
});
