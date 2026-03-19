import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog";
import { BlogPostContent } from "@/app/components/blog/BlogPost";
import { BlogHeader } from "@/app/components/blog/BlogHeader";
import { ArticleJsonLd } from "@/app/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/app/components/seo/JsonLd";
import Link from "next/link";

export const revalidate = 3600;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hemmi.app";

  return {
    title: post.title,
    description: post.meta_description,
    keywords: [post.primary_keyword, ...post.secondary_keywords],
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: "article",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: [post.author],
      tags: post.tags,
      images: post.hero_image_url
        ? [{ url: post.hero_image_url, alt: post.hero_image_alt || post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.meta_description,
      images: post.hero_image_url ? [post.hero_image_url] : undefined,
    },
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hemmi.app";

  return (
    <>
      <BlogHeader />
      <main className="px-4 py-12 sm:px-6">
        <ArticleJsonLd
          title={post.title}
          description={post.meta_description}
          url={`${baseUrl}/blog/${post.slug}`}
          imageUrl={post.hero_image_url || `${baseUrl}/og.png`}
          datePublished={post.published_at || post.created_at}
          dateModified={post.updated_at}
          authorName={post.author}
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: baseUrl },
            { name: "Blog", url: `${baseUrl}/blog` },
            { name: post.title, url: `${baseUrl}/blog/${post.slug}` },
          ]}
        />
        <BlogPostContent post={post} />
        <div className="mx-auto mt-12 max-w-3xl border-t border-border pt-8">
          <Link
            href="/blog"
            className="text-sm text-accent transition-opacity hover:opacity-80"
          >
            ← Back to all posts
          </Link>
        </div>
      </main>
    </>
  );
}
