import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog";
import { BlogCard } from "@/app/components/blog/BlogCard";
import { BlogHeader } from "@/app/components/blog/BlogHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, guides, and insights on academic writing, AI tools, research papers, citations, and student productivity from the Hemmi team.",
  openGraph: {
    title: "Blog | Hemmi",
    description:
      "Tips, guides, and insights on academic writing, AI tools, research papers, citations, and student productivity.",
    type: "website",
  },
};

export const revalidate = 3600; // revalidate every hour

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const perPage = 12;
  const { posts, total } = await getPublishedPosts(page, perPage);
  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <BlogHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Blog
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Guides and insights on academic writing, AI tools, and research.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet. Check back soon!</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}`}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}`}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
