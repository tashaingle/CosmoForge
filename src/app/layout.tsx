import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { EphemerisProvider } from "@/components/ephemeris/EphemerisProvider";
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
  title: "CosmoForge — Your ship in today’s solar system",
  description:
    "Launch a probe in one tap into a real-ish solar system. It keeps flying offline. Check in, finish goals, share a mission link — design is optional.",
  openGraph: {
    title: "CosmoForge",
    description:
      "Your probe is still flying in today’s solar system. Launch, command, share.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "CosmoForge",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col bg-slate-950 text-slate-100">
        <AuthProvider>
          <EphemerisProvider>{children}</EphemerisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
