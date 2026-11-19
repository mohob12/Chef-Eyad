-- Add branding (site logo, favicon) and hero banner customization (logo, tagline, status override) to restaurant_settings
alter table public.restaurant_settings
  add column if not exists site_logo_url text not null default '',
  add column if not exists favicon_url text not null default '',
  add column if not exists hero_logo_url text not null default '',
  add column if not exists hero_tagline_ar text not null default '',
  add column if not exists hero_tagline_fr text not null default '',
  add column if not exists hero_tagline_en text not null default '',
  add column if not exists hero_status_override_ar text not null default '',
  add column if not exists hero_status_override_fr text not null default '',
  add column if not exists hero_status_override_en text not null default '';
