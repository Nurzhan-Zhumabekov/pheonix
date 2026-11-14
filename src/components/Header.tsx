import Link from "next/link";
import { site } from "@/config/site";
import styles from "@/app/marketing.module.css";

export function Header() {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.container + " " + styles.navRow}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">✓</span>
          {site.name}
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={site.cta.href} className={styles.primary + " " + styles.navCta}>
            {site.cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}