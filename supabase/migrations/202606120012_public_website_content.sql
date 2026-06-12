-- Public website content: hero banner carousel, social media links, and
-- service images for the Enterprise public clinic site (/c/[clinicSlug]).

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS hero_image_urls jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS facebook_url  text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url    text,
  ADD COLUMN IF NOT EXISTS youtube_url   text;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_url text;
