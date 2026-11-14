import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carepath: a clear plan from hospital discharge papers",
  description:
    "Upload a parent's discharge papers and get a day-by-day plan with medication times, appointments, warning signs and a calendar file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
