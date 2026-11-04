import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, REM } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
    default: "Tooken — Tokenized real estate",
    template: "%s · Tooken",
  },
  description:
    "Institutional-grade platform to tokenize, distribute and settle real estate securities on-chain.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#2d2b3d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rem.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
