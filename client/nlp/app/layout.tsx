import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  weight: ["300", "400", "600"],
  variable: "--font-space-grotesk", // keeping variable name to avoid refactoring whole CSS
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-jetbrains-mono", // keeping variable name to avoid refactoring whole CSS
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kage.ai - Meeting Intelligence",
  description: "Intelligence in the Shadows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0A0A0C] text-slate-200">{children}</body>
    </html>
  );
}
