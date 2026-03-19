import { createClient } from "@supabase/supabase-js";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  primary_keyword: string;
  secondary_keywords: string[];
  content: string;
  excerpt: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  estimated_read_time: number | null;
  word_count: number | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  category: string | null;
  tags: string[];
  author: string;
  created_at: string;
  updated_at: string;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getPublishedPosts(
  page = 1,
  perPage = 12
): Promise<{ posts: BlogPost[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { posts: (data as BlogPost[]) || [], total: count || 0 };
}

export async function getPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) return null;
  return data as BlogPost;
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  if (error) return [];
  return (data || []).map((p) => p.slug);
}

export async function getPostsByCategory(
  category: string,
  limit = 6
): Promise<BlogPost[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as BlogPost[]) || [];
}
