import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// Tekst i etykiety — Figtree: duża wysokość x, otwarte kształty, czytelna w małych rozmiarach
const sans = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
// Nagłówki i logo — Outfit: geometryczny krój w duchu Pantona
const display = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});
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
    <html lang="pl" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
