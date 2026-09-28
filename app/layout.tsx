import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/session-provider";
import { PWARegister, PWAInstallPrompt } from "@/components/pwa/pwa-register";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';

// Geist fonts are loaded via CDN in globals.css
// Newsreader serif for editorial emphasis
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ['normal', 'italic'],
  weight: ['400', '500'],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BATT-X | EV Battery Safety Monitor",
  description:
    "Real-time IoT dashboard for monitoring electric vehicle battery safety and charging health",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BATT-X",
  },
  applicationName: "BATT-X",
  keywords: [
    "EV",
    "battery",
    "IoT",
    "safety",
    "monitoring",
    "electric vehicle",
    "sustainability",
  ],
  authors: [{ name: "BATT-X" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn(newsreader.variable, "font-sans antialiased")}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <PWARegister />
              <PWAInstallPrompt />
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
