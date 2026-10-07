import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return <main className="not-found shell reading-width"><p className="section-label">404</p><h1>This page is not in the archive.</h1><p>The article may have moved, or the address may be incomplete.</p><Link className="button" href="/">Return home</Link></main>;
}

