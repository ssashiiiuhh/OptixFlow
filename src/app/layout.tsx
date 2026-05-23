import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OptixFlow",
    template: "%s | OptixFlow"
  },
  description: "Probabilistic Market Intelligence & Derivatives Cognition Platform",
  keywords: ["options trading", "finance", "payoff diagram", "quant", "derivatives", "volatility skew", "greek exposure"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "OptixFlow",
    description: "Probabilistic Market Intelligence & Derivatives Cognition Platform",
    url: "https://optixflow.vercel.app",
    siteName: "OptixFlow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OptixFlow",
    description: "Probabilistic Market Intelligence & Derivatives Cognition Platform",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Force dark mode; OptixFlow is dark-only
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full overflow-hidden bg-[var(--ox-bg-void)]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
