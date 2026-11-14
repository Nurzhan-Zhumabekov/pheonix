import Link from "next/link";
import { site } from "@/config/site";

export function Header() {
  return (
    <header className="header">
      <div className="container header-row">
        <Link href="/" className="brand">
          {site.name}
        </Link>
        <nav aria-label="Main" className="nav">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={site.cta.href} className="button button-small">
            {site.cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
