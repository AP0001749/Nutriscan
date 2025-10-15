// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ClientClerkProvider from '@/components/ClientClerkProvider';

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
  // Log client-visible Clerk env vars for debugging (safe: only publishable key / frontend api)
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  console.debug('Client Clerk env:', { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKey, NEXT_PUBLIC_CLERK_FRONTEND_API: clerkFrontendApi });

  // Build props for ClerkProvider. Clerk accepts either a frontendApi or a publishableKey for client init.
  const clerkProps: Record<string, string> = {};
  if (clerkFrontendApi) clerkProps.frontendApi = clerkFrontendApi;
  if (clerkPublishableKey) clerkProps.publishableKey = clerkPublishableKey;
  if (!clerkFrontendApi && !clerkPublishableKey && process.env.NODE_ENV === 'development') {
    console.warn('Clerk client not configured: NEXT_PUBLIC_CLERK_FRONTEND_API and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are both missing. Authentication UI will be disabled.');
  }

  return (
    <ClientClerkProvider frontendApi={clerkProps.frontendApi} publishableKey={clerkProps.publishableKey}>
      <html lang="en" suppressHydrationWarning>
        <body className={`font-sans ${inter.variable} antialiased`}>
            <Navigation />
            <main className="min-h-screen container py-8">
              {children}
            </main>
            <Footer />
        </body>
      </html>
    </ClientClerkProvider>
  );
}