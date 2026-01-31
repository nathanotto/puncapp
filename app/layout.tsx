import type { Metadata } from "next";
import { Merriweather, Source_Sans_3, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const merriweather = Merriweather({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PUNC Chapters",
  description: "Find your brotherhood. Project UNcivilized chapter management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${merriweather.variable} ${sourceSans.variable} ${ibmPlex.variable} antialiased`}
        style={{ fontFamily: 'var(--font-body, sans-serif)' }}
      >
        {children}
      </body>
    </html>
  );
}
