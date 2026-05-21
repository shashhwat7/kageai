import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cacheControl = headersList.get("cache-control") || "";
  const pragma = headersList.get("pragma") || "";
  const isHardRefresh = cacheControl.includes("no-cache") || pragma.includes("no-cache");

  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#060608] text-slate-200">
        {isHardRefresh && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__isHardRefresh = true;`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
