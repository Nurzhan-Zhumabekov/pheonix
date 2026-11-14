import Link from "next/link";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <span>
          {site.name} · {new Date().getFullYear()}
        </span>
        <nav aria-label="Footer" className="nav">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
