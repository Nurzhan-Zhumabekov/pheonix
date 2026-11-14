import Link from "next/link";
import { site } from "@/config/site";
import styles from "@/app/marketing.module.css";

export function Footer() {
  return (
    <footer className={styles.siteFooter}>
      <div className={styles.container + " " + styles.navRow}>
        <span>{site.name} · {new Date().getFullYear()}</span>
        <nav aria-label="Footer" className={styles.nav}>
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