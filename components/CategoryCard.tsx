import Link from "next/link";
import type { Category } from "@/lib/types";

const categoryNotes: Record<string, string> = {
  "ai-llms": "Applied AI, agents, models, interfaces, and the decisions behind useful systems.",
  "excel-vba": "Data analysis, Excel automation, Power BI, reporting, and clearer decisions.",
  "global-business": "Experience from entrepreneurship, online work, marketing, and international business.",
  learning: "Teaching, learning online, professional growth, and practical skill-building.",
  seo: "Search strategy, content, WordPress history, and visibility in the AI-search era.",
};

export function CategoryCard({ category, count }: { category: Category; count: number }): React.JSX.Element {
  return (
    <Link className={`category-card category-${category.slug}`} href={`/category/${category.slug}/`}>
      <span className="category-index" aria-hidden="true">{String(count).padStart(2, "0")}</span>
      <div><h3>{category.name}</h3><p>{categoryNotes[category.slug] || category.seoDescription}</p></div>
      <span className="category-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
