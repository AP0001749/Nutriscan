// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { ToastContainer } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "NutriScan - Vibrant Food Intelligence",
  description: "Scan food with pure accuracy. Get instant ingredient breakdowns, nutrition facts, and vibrant health insights powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} antialiased`}>
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        
        <SessionProvider>
          <Navigation />
          <main id="main-content" className="min-h-screen container py-8">
            {children}
          </main>
          <Footer />
          <ToastContainer />
        </SessionProvider>
      </body>
    </html>
  );
}