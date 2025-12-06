import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { EditorProvider } from "@/lib/contexts/EditorContext";
import { ThemeProvider } from "@/app/components/theme-provider";
import SupabaseProvider from "@/lib/context/SupabaseContext";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";

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

export const metadata: Metadata = {
  title: "Write Nuton - AI Writing Assistant",
  description:
    "A powerful writing application with AI assistance and rich text editing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${lora.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}>
        <ReactQueryProvider>
          <SupabaseProvider>
            <EditorProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange>
                {children}
              </ThemeProvider>
            </EditorProvider>
          </SupabaseProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
