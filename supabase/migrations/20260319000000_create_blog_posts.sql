-- Blog posts table for SEO content
CREATE TABLE public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  excerpt TEXT,
  hero_image_url TEXT,
  hero_image_alt TEXT,
  estimated_read_time INTEGER,
  word_count INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TIMESTAMPTZ,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  author TEXT DEFAULT 'Hemmi Team',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups and listing
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);

-- RLS: public read for published posts, no client writes
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_posts_updated_at();
