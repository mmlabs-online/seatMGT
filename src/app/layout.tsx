import type { Metadata } from "next";
import { Manrope, Poppins } from "next/font/google";
import "./globals.css";

// Primary UI face (Gilroy stand-in; also used for tabular metric numerals).
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
// Second fallback / heading character.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SeatMap — Seat & Device Tracker",
  description: "Track seats, network ports and equipment across the campus.",
};

/**
 * Kept thin on purpose: `/login` renders under here too, and shouldn't need a
 * session or seeded app data. The authenticated shell (AppStoreProvider +
 * AppShell) lives in `(app)/layout.tsx`.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${manrope.variable} ${poppins.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Icon font is intentionally global here (App Router root layout loads it for every route). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
