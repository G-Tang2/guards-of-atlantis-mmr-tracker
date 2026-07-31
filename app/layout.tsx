import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Cinzel, Crimson_Pro } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guards of Atlantis MMR Tracker",
  description: "Track match results and MMR for Guards of Atlantis II.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GoA MMR Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1a14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${crimsonPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="app-root">{children}</div>
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
