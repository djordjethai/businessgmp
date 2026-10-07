import Link from "next/link";
import { EmailLink, SocialLinks } from "@/components/SocialLinks";

export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer"><div className="shell footer-grid"><div><p className="footer-kicker">Business Online Mastery</p><h2>Experience is most valuable when it is shared.</h2></div><div><p className="section-label">Explore</p><Link href="/category/ai-llms/">AI & LLMs</Link><Link href="/category/excel-vba/">Data & Power BI</Link><Link href="/category/global-business/">Business</Link><Link href="/search/">Search</Link></div><div><p className="section-label">Connect</p><EmailLink /><SocialLinks /></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Business Online Mastery</span><span><Link href="/privacy-policy/">Privacy</Link><Link href="/terms-of-use/">Terms</Link><Link href="/contact-us/">Contact</Link></span></div></footer>
  );
}
