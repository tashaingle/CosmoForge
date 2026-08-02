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
  title: "CosmoForge — Little ships with big personalities",
  description:
    "Launch weird little probes into a real-ish solar system. They fly offline, send odd pings, come back changed — and the real game is the debrief.",
  openGraph: {
    title: "CosmoForge",
    description:
      "Slightly unhinged mission control. Probes with personalities. The fun starts when they return.",
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
