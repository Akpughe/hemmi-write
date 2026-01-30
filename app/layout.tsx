import type { Metadata } from "next";
import { Inter, Lora, Fraunces, Public_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { EditorProvider } from "@/lib/contexts/EditorContext";
import { ThemeProvider } from "@/app/components/theme-provider";
import SupabaseProvider from "@/lib/context/SupabaseContext";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import { Toaster } from "sonner";
import { MobileNotice } from "@/app/components/mobile-notice";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const siteConfig = {
  name: "Hemmi",
  title: "Hemmi - AI Writing Assistant for Research & Academic Writing",
  description:
    "Write research papers, essays, and reports 10x faster with AI assistance. Get high-quality, human-like content with proper citations and academic rigor.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://hemmi.app",
  ogImage: "https://ik.imagekit.io/r9a7zbqsf/og.png",
  creator: "Hemmi AI",
  keywords: [
    "AI writing assistant",
    "research paper writer",
    "essay writer",
    "academic writing tool",
    "AI content generator",
    "citation generator",
    "APA citation",
    "MLA citation",
    "research assistant",
    "thesis writer",
    "dissertation help",
    "academic AI",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  publisher: siteConfig.creator,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Hemmi - AI Writing Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@hemmi_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${lora.variable} ${fraunces.variable} ${publicSans.variable} ${dmSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}>
        <ReactQueryProvider>
          <SupabaseProvider>
            <EditorProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange>
                {children}
              </ThemeProvider>
            </EditorProvider>
          </SupabaseProvider>
        </ReactQueryProvider>
        <Toaster />
        <MobileNotice />
      </body>
    </html>
  );
}
