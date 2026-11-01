import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Road to Jan 16 - Cutting & PPL Tracker",
  description:
    "Personal fitness, intermittent fasting, and nutrition tracker designed for a 2-month cutting phase leading to wedding date January 16, 2027.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Road to Jan 16",
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-slate-950">
        <AppProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
