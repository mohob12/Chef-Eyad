-- Add google_maps_review_url to restaurant_settings with direct Google review dialog URL
alter table public.restaurant_settings
  add column if not exists google_maps_review_url text not null default 'https://www.google.com/maps/place//data=!4m3!3m2!1s0x128e4f5c91f0b36d:0x69fcaca4dcd6d35b!12e1?source=g.page.m.nr._&laa=nmx-review-solicitation-recommendation-card';
