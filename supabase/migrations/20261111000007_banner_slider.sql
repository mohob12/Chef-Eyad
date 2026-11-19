-- Add banner_images to restaurant_settings for the hero carousel (up to 5 banners)
alter table public.restaurant_settings
  add column if not exists banner_images text[] not null default '{}';

comment on column public.restaurant_settings.banner_images is 'Array of image URLs (up to 5) displayed as a slider in the main hero banner.';
