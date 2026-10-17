import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import AIAssistantWidget from "@/components/AIAssistantWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Gujarat Weekend | Verified Stays, Private Villas, Resorts & Escapes",
  description:
    "Discover and book verified private pool villas, orchard farmhouses, riverside resorts, desert glamping, and curated outdoor activities across Gujarat.",
  keywords: [
    "Gujarat weekend booking",
    "Saputara villa",
    "Polo forest resort",
    "Sasan gir farmhouse",
    "Ekta nagar cottage",
    "Kutch desert camping",
    "Gujarat homestay",
    "Sanand private pool"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-stone-50 text-stone-900 pb-20 md:pb-0 overflow-x-hidden w-full">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <MobileNav />
          <AIAssistantWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
