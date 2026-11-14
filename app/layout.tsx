import type { Metadata, Viewport } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./bx.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

// Nagłówki i tekst — Host Grotesk: techniczny grotesk, czytelny także w małych stopniach
const sans = Host_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
// Etykiety, numery sekcji, dane z maszyny
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Warstwa — sieć drukarzy 3D", template: "%s · Warstwa" },
  description:
    "Marketplace druku 3D. Wyślij zapytanie do drukarza w swojej okolicy — przyjmie je, odrzuci albo poprosi innego drukarza o pomoc.",
};

export const viewport: Viewport = { themeColor: "#0a0a0b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="shell">
          <Nav />
          <main>{children}</main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
