import Link from "next/link";
import type { ContentItem } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function ArticleCard({ article, featured = false }: { article: ContentItem; featured?: boolean }): React.JSX.Element {
  return (
    <article className={`article-card${featured ? " article-card-featured" : ""}`}>
      {article.featuredImage ? (
        <Link className="card-image" href={article.route} tabIndex={-1} aria-hidden="true">
          <img src={article.featuredImage} alt={article.featuredImageAlt || ""} loading="lazy" decoding="async" />
        </Link>
      ) : <div className="card-image card-image-placeholder" aria-hidden="true"><span>BO</span><span>M</span></div>}
      <div className="card-copy">
        <p className="meta-line"><span>{article.categories[0] || "Insights"}</span><time dateTime={article.date}>{dateFormatter.format(new Date(article.date))}</time></p>
        <h3><Link href={article.route}>{article.title}</Link></h3>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
        <Link className="text-link" href={article.route}>Read article <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
