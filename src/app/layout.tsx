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
  title: "OptixFlow — Options Strategy Visualizer",
  description:
    "A premium options strategy visualizer and educational finance platform. Interactive payoff graphs, real-time P&L modeling, and a sleek quant-terminal aesthetic.",
  keywords: ["options trading", "finance", "payoff diagram", "quant", "derivatives"],
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
