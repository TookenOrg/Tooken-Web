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
    default: "Tooken — Real-world asset tokenization",
    template: "%s · Tooken",
  },
  description:
    "Infrastructure for real-world asset tokenization, verified investors and ownership management, built on ERC-3643.",
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
