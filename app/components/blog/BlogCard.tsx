import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-accent/40 hover:shadow-md">
        {post.hero_image_url && (
          <div className="mb-4 overflow-hidden rounded-lg">
            <img
              src={post.hero_image_url}
              alt={post.hero_image_alt || post.title}
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col">
          {post.category && (
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">
              {post.category}
            </span>
          )}
          <h2 className="mb-2 text-lg font-semibold leading-snug text-foreground group-hover:text-accent transition-colors">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {date && <time dateTime={post.published_at!}>{date}</time>}
            {post.estimated_read_time && (
              <>
                <span aria-hidden="true">·</span>
                <span>{post.estimated_read_time} min read</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
