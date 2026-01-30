import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans",
  description:
    "Choose the perfect plan for your writing needs. Get AI-powered research, unlimited documents, and premium features starting at affordable rates.",
  openGraph: {
    title: "Pricing Plans | Hemmi",
    description:
      "Choose the perfect plan for your writing needs. Get AI-powered research, unlimited documents, and premium features.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing Plans | Hemmi",
    description:
      "Choose the perfect plan for your writing needs. AI-powered research and premium features.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
