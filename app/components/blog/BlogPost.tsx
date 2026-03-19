"use client";

import Markdown from "marked-react";
import type { BlogPost as BlogPostType } from "@/lib/blog";

interface BlogPostProps {
  post: BlogPostType;
}

export function BlogPostContent({ post }: BlogPostProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8">
        {post.category && (
          <span className="mb-3 inline-block text-xs font-medium uppercase tracking-wider text-accent">
            {post.category}
          </span>
        )}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{post.author}</span>
          {date && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={post.published_at!}>{date}</time>
            </>
          )}
          {post.estimated_read_time && (
            <>
              <span aria-hidden="true">·</span>
              <span>{post.estimated_read_time} min read</span>
            </>
          )}
        </div>
      </header>

      {post.hero_image_url && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={post.hero_image_url}
            alt={post.hero_image_alt || post.title}
            className="w-full object-cover"
          />
        </div>
      )}

      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg">
        <Markdown>{post.content}</Markdown>
      </div>

      {post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
