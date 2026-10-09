import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { CategoryCard } from "@/components/CategoryCard";
import { JsonLd } from "@/components/JsonLd";
import { getCategories, getPosts, getPostsByCategory } from "@/lib/content";
import { SITE_NAME, SITE_SUBTITLE, SITE_URL } from "@/lib/seo";
import { homeStructuredData } from "@/lib/structured-data";

const description = "Practical writing about AI and LLMs, data and Power BI, global business, learning, and SEO.";

export const metadata: Metadata = { title: { absolute: `${SITE_NAME} — ${SITE_SUBTITLE}` }, description, alternates: { canonical: SITE_URL }, openGraph: { title: SITE_NAME, description: SITE_SUBTITLE, url: SITE_URL } };

export default function HomePage(): React.JSX.Element {
  const posts = getPosts();
  const categories = getCategories();
  const aiPosts = getPostsByCategory("ai-llms").slice(0, 3);
  const lead = posts[0];
  return (
    <main>
      <JsonLd data={homeStructuredData(description)} />
      <section className="home-hero"><div className="shell hero-grid"><div><p className="hero-code">INSIGHT / EXPERIENCE / PRACTICE</p><h1>Business<br /><span>Online</span> Mastery</h1><p className="hero-intro">Sharing more than 30 years of experience at the intersection of technology, data, business, and continuous learning.</p><div className="hero-actions"><Link className="button" href={lead?.route || "/search/"}>Read the latest article</Link><Link className="text-link" href="/about/">About this archive <span>↗</span></Link></div></div><div className="hero-panel" aria-hidden="true"><span>01</span><div><b>AI</b><b>DATA</b><b>BUSINESS</b></div><span>97 ARTICLES</span></div></div></section>
      {lead ? <section className="section shell"><div className="section-heading"><div><p className="section-label">Latest thinking</p><h2>New from the archive</h2></div><p>Current perspectives on how technology changes the way we build, decide, and work.</p></div><ArticleCard article={lead} featured /></section> : null}
      <section className="section topic-section"><div className="shell"><div className="section-heading"><div><p className="section-label">Five fields</p><h2>Explore by topic</h2></div></div><div className="category-list">{categories.map((category) => <CategoryCard category={category} count={getPostsByCategory(category.slug).length} key={category.slug} />)}</div></div></section>
      {aiPosts.length ? <section className="section shell"><div className="section-heading"><div><p className="section-label">In focus</p><h2>AI & LLMs</h2></div><Link className="text-link" href="/category/ai-llms/">View all AI articles <span>↗</span></Link></div><div className="article-grid">{aiPosts.map((post) => <ArticleCard article={post} key={post.id} />)}</div></section> : null}
      <section className="section archive-cta"><div className="shell"><p className="section-label">The complete collection</p><h2>Ideas compound.<br />The archive keeps them connected.</h2><p>Search across every published article, from early lessons in SEO and global business to current work with AI agents and LLM applications.</p><Link className="button button-light" href="/search/">Search the archive</Link></div></section>
    </main>
  );
}
