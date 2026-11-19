-- Add hero title & subtitle custom text to restaurant_settings
alter table public.restaurant_settings
  add column if not exists hero_title_ar text not null default '',
  add column if not exists hero_title_fr text not null default '',
  add column if not exists hero_title_en text not null default '',
  add column if not exists hero_subtitle_ar text not null default '',
  add column if not exists hero_subtitle_fr text not null default '',
  add column if not exists hero_subtitle_en text not null default '';

-- Add images array to customer_reviews
alter table public.customer_reviews
  add column if not exists images text[] not null default '{}';

-- Allow public to upload review images in product-images bucket under reviews/ folder
drop policy if exists "public upload review images" on storage.objects;
create policy "public upload review images" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = 'reviews');
