import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daybook",
  description: "Notes on building software.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">Daybook</Link>
          <nav>
            <Link href="/about">About</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">© Daybook</footer>
      </body>
    </html>
  );
}
