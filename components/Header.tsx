import Link from "next/link";

const links = [
  { href: "/category/ai-llms/", label: "AI & LLMs" },
  { href: "/category/excel-vba/", label: "Data & Power BI" },
  { href: "/category/global-business/", label: "Business" },
  { href: "/category/learning/", label: "Learning" },
  { href: "/category/seo/", label: "SEO" },
  { href: "/about/", label: "About" },
];

export function Header(): React.JSX.Element {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Business Online Mastery home"><span className="brand-mark">BOM</span><span><strong>Business Online Mastery</strong><small>Sharing The Experience</small></span></Link>
        <nav aria-label="Main navigation">{links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}<Link className="search-link" href="/search/" aria-label="Search the site">Search</Link></nav>
      </div>
    </header>
  );
}
