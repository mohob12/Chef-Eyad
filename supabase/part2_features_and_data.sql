-- ---------------------------------------------------------------------------
-- Storage for product photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
-- Expose when the order last changed status so the customer tracker can show "since HH:MM".
create or replace function public.get_order_public(p_reference text, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', o.reference,
    'order_type', o.order_type,
    'status', o.status,
    'status_changed_at', o.status_changed_at,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'table_number', o.table_number,
    'delivery_address', o.delivery_address,
    'notes', o.notes,
    'payment_method', o.payment_method,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'delivery_fee_status', o.delivery_fee_status,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name_ar', i.product_name_ar, 'product_name_fr', i.product_name_fr, 'product_name_en', i.product_name_en,
        'variant_name_ar', i.variant_name_ar, 'variant_name_fr', i.variant_name_fr, 'variant_name_en', i.variant_name_en,
        'unit_price', i.unit_price, 'extras_unit_total', i.extras_unit_total,
        'quantity', i.quantity, 'line_total', i.line_total,
        'extras', coalesce((
          select jsonb_agg(jsonb_build_object('name_ar', e.name_ar, 'name_fr', e.name_fr, 'name_en', e.name_en, 'price', e.price))
            from public.order_item_extras e where e.order_item_id = i.id
        ), '[]'::jsonb)
      ) order by i.sort_order)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.reference = p_reference and o.access_token = p_token;
$$;

revoke all on function public.get_order_public(text, uuid) from public;
grant execute on function public.get_order_public(text, uuid) to anon, authenticated;
-- Photos for products that had none (sourced from Wikimedia Commons; see src/data/photoCredits.json
-- and the /credits page for authors and licenses). Only fills products without an image.
insert into public.product_images (product_id, url, sort_order)
select p.id, m.u, 0
from jsonb_to_recordset($json$
[{"p":"Bourek","u":"/images/menu/bourek.jpg"},{"p":"Soupe de carotte","u":"/images/menu/soupe-de-carotte.jpg"},{"p":"Soupe de légumes","u":"/images/menu/soupe-de-legumes.jpg"},{"p":"Soupe de poulet","u":"/images/menu/soupe-de-poulet.jpg"},{"p":"Gratin poulet","u":"/images/menu/gratin-poulet.jpg"},{"p":"Gratin viande","u":"/images/menu/gratin-viande.jpg"},{"p":"Poulet mariné","u":"/images/menu/poulet-marine.jpg"},{"p":"Cuisse de Poulet rôtie","u":"/images/menu/cuisse-de-poulet-rotie.jpg"},{"p":"Cordon bleu","u":"/images/menu/cordon-bleu.jpg"},{"p":"Cuisse de poulet farcie","u":"/images/menu/cuisse-de-poulet-farcie.jpg"},{"p":"Escalope grillée","u":"/images/menu/escalope-grillee.jpg"},{"p":"Poulet pané","u":"/images/menu/poulet-pane.jpg"},{"p":"Galette de viande","u":"/images/menu/galette-de-viande.jpg"},{"p":"Sauté de veau","u":"/images/menu/saute-de-veau.jpg"},{"p":"Escalope à la crème","u":"/images/menu/escalope-a-la-creme.jpg"},{"p":"Steak haché","u":"/images/menu/steak-hache.jpg"},{"p":"Kebda m'chermla","u":"/images/menu/kebda-m-chermla.jpg"},{"p":"Dorade","u":"/images/menu/dorade.jpg"},{"p":"Soufflé de viande","u":"/images/menu/souffle-de-viande.jpg"},{"p":"Fried chicken","u":"/images/menu/fried-chicken.jpg"},{"p":"Roulé de viande","u":"/images/menu/roule-de-viande.jpg"},{"p":"Plat du jour","u":"/images/menu/plat-du-jour.jpg"},{"p":"Kebba","u":"/images/menu/kebba.jpg"},{"p":"Plat Chawarma arabica","u":"/images/menu/plat-chawarma-arabica.jpg"},{"p":"Plat Chawarma à la braise","u":"/images/menu/plat-chawarma-a-la-braise.jpg"},{"p":"Plat Doublé Chawarma","u":"/images/menu/plat-double-chawarma.jpg"},{"p":"Fajitas poulet","u":"/images/menu/fajitas-poulet.jpg"},{"p":"Sandwich Poulet","u":"/images/menu/sandwich-poulet.jpg"},{"p":"Sandwich Viande","u":"/images/menu/sandwich-viande.jpg"},{"p":"Sandwich Escalope","u":"/images/menu/sandwich-escalope.jpg"},{"p":"Sandwich Poulet mariné","u":"/images/menu/sandwich-poulet-marine.jpg"},{"p":"Sandwich Chicken Tika","u":"/images/menu/sandwich-chicken-tika.jpg"},{"p":"Chicken Burger","u":"/images/menu/chicken-burger.jpg"},{"p":"Eau Minérale PM","u":"/images/menu/eau-minerale-pm.jpg"},{"p":"Eau Minérale GM","u":"/images/menu/eau-minerale-gm.jpg"},{"p":"Café au lait","u":"/images/menu/cafe-au-lait.jpg"},{"p":"Nespresso","u":"/images/menu/nespresso.jpg"},{"p":"Thé Infusion","u":"/images/menu/the-infusion.jpg"},{"p":"Supplément fromage (Plats/Sandwiches)","u":"/images/menu/supplement-fromage-plats-sandwiches.jpg"},{"p":"Supplément fromage (Pizza)","u":"/images/menu/supplement-fromage-pizza.jpg"},{"p":"Supplément poulet","u":"/images/menu/supplement-poulet.jpg"},{"p":"Supplément viande","u":"/images/menu/supplement-viande.jpg"},{"p":"Supplément riz","u":"/images/menu/supplement-riz.jpg"},{"p":"Barquette de frites","u":"/images/menu/barquette-de-frites.jpg"},{"p":"01 boule de riz","u":"/images/menu/01-boule-de-riz.jpg"}]
$json$::jsonb) as m(p text, u text)
join public.products p on p.name_fr = m.p
where not exists (select 1 from public.product_images i where i.product_id = p.id);
-- Structured daily hours (drive the "open now / closed" badge) and social media links.
alter table public.restaurant_settings
  add column opens_at time,
  add column closes_at time,
  add column facebook_url text not null default '',
  add column instagram_url text not null default '',
  add column tiktok_url text not null default '',
  -- Only https links: these are rendered as <a href> on the public site.
  add constraint restaurant_settings_social_https check (
    (facebook_url = '' or facebook_url ~* '^https://[^\s<>"]+$') and
    (instagram_url = '' or instagram_url ~* '^https://[^\s<>"]+$') and
    (tiktok_url = '' or tiktok_url ~* '^https://[^\s<>"]+$')
  );

comment on column public.restaurant_settings.opens_at is 'Daily opening time (Africa/Algiers).';
comment on column public.restaurant_settings.closes_at is 'Daily closing time (Africa/Algiers); earlier than opens_at means after midnight, 00:00 = midnight.';

-- The owner confirmed closing at midnight; opening time is editable in Settings.
update public.restaurant_settings set opens_at = '11:00', closes_at = '00:00' where id = 1 and opens_at is null;
-- Allow authenticated admins to delete orders and their cascade items

grant delete on public.orders to authenticated;
grant delete on public.order_items to authenticated;
grant delete on public.order_item_extras to authenticated;

drop policy if exists "admins delete orders" on public.orders;
create policy "admins delete orders" on public.orders for delete to authenticated
  using (public.is_admin());

drop policy if exists "admins delete order items" on public.order_items;
create policy "admins delete order items" on public.order_items for delete to authenticated
  using (public.is_admin());

drop policy if exists "admins delete order extras" on public.order_item_extras;
create policy "admins delete order extras" on public.order_item_extras for delete to authenticated
  using (public.is_admin());

-- RPC helper for bulk deletion
create or replace function public.delete_orders_admin(order_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if order_ids is null or array_length(order_ids, 1) is null then
    delete from public.orders;
    get diagnostics deleted_count = row_count;
  else
    delete from public.orders where id = any(order_ids);
    get diagnostics deleted_count = row_count;
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.delete_orders_admin(uuid[]) from public, anon;
grant execute on function public.delete_orders_admin(uuid[]) to authenticated;
-- Add banner_images to restaurant_settings for the hero carousel (up to 5 banners)
alter table public.restaurant_settings
  add column if not exists banner_images text[] not null default '{}';

comment on column public.restaurant_settings.banner_images is 'Array of image URLs (up to 5) displayed as a slider in the main hero banner.';
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
-- Add google_maps_review_url to restaurant_settings with direct Google review dialog URL
alter table public.restaurant_settings
  add column if not exists google_maps_review_url text not null default 'https://www.google.com/maps/place//data=!4m3!3m2!1s0x128e4f5c91f0b36d:0x69fcaca4dcd6d35b!12e1?source=g.page.m.nr._&laa=nmx-review-solicitation-recommendation-card';
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
-- Migration: Fix category and product translations
-- Corrects typos (الكراتان -> الغراتان), removes redundant 'Nos' prefixes in French categories,
-- standardizes English category titles, and fixes specific dish names.

-- 1. Categories
update public.categories set name_ar = 'الأطباق الرئيسية', name_fr = 'Plats', name_en = 'Main Dishes' where name_fr in ('Nos Plats', 'Plats');
update public.categories set name_ar = 'المقبلات', name_fr = 'Entrées', name_en = 'Starters' where name_fr in ('Nos Entrées', 'Entrées');
update public.categories set name_ar = 'الغراتان', name_fr = 'Gratins', name_en = 'Gratins' where name_fr in ('Nos Gratins', 'Gratins') or name_ar in ('الكراتان', 'الغراتان');
update public.categories set name_ar = 'الشاورما', name_fr = 'Chawarma', name_en = 'Shawarma' where name_en = 'Shawarma';
update public.categories set name_ar = 'البرغر', name_fr = 'Burgers', name_en = 'Burgers' where name_fr in ('Nos Burgers', 'Burgers');
update public.categories set name_ar = 'التاكوس', name_fr = 'Tacos', name_en = 'Tacos' where name_fr in ('Nos Tacos', 'Tacos');
update public.categories set name_ar = 'السندويتشات', name_fr = 'Sandwiches', name_en = 'Sandwiches' where name_fr in ('Nos Sandwiches', 'Sandwiches');
update public.categories set name_ar = 'البانيني', name_fr = 'Paninis', name_en = 'Paninis' where name_fr in ('Nos Paninis', 'Paninis');
update public.categories set name_ar = 'البيتزا', name_fr = 'Pizzas', name_en = 'Pizzas' where name_fr in ('Nos Pizzas', 'Pizzas');
update public.categories set name_ar = 'المشروبات الباردة', name_fr = 'Boissons fraîches', name_en = 'Cold Drinks' where name_fr in ('Nos Boissons Fraîches', 'Boissons fraîches');
update public.categories set name_ar = 'المشروبات الساخنة', name_fr = 'Boissons chaudes', name_en = 'Hot Drinks' where name_fr in ('Nos Boissons Chaudes', 'Boissons chaudes');
update public.categories set name_ar = 'الإضافات', name_fr = 'Suppléments & Extras', name_en = 'Sides & Extras' where name_en in ('Sides & extras', 'Sides & Extras');

-- 2. Products
update public.products set name_ar = 'غراتان الدجاج' where name_ar = 'كراتان الدجاج';
update public.products set name_ar = 'غراتان اللحم' where name_ar = 'كراتان اللحم';
update public.products set name_ar = 'غراتان الجمبري' where name_ar = 'كراتان الجمبري';
update public.products set name_fr = 'Sandwich Double Chawarma' where name_fr = 'Sandwich Doublé Chawarma';
update public.products set name_fr = 'Plat Double Chawarma' where name_fr = 'Plat Doublé Chawarma';
update public.products set name_fr = 'Plat Chawarma arabe' where name_fr = 'Plat Chawarma arabica';
update public.products set name_fr = 'Sandwich Chicken Tikka', name_en = 'Chicken Tikka sandwich' where name_fr = 'Sandwich Chicken Tika';
update public.products set name_fr = 'Jus en boîte PM' where name_fr = 'Jus en boite PM';
update public.products set name_fr = 'Méga au choix' where name_fr = 'MEGA AU CHOIX';
update public.products set name_fr = 'Sandwich Chawarma + Kiri' where name_fr = 'Sandwich Chawarma + kiri';

-- 3. Initial Categories for Chef Eyad
insert into public.categories (name_ar, name_fr, name_en, sort_order)
values
  ('الأطباق الرئيسية', 'Plats', 'Main Dishes', 1),
  ('المقبلات', 'Entrées', 'Starters', 2),
  ('الغراتان', 'Gratins', 'Gratins', 3),
  ('الشاورما', 'Chawarma', 'Shawarma', 4),
  ('البرغر', 'Burgers', 'Burgers', 5),
  ('التاكوس', 'Tacos', 'Tacos', 6),
  ('السندويتشات', 'Sandwiches', 'Sandwiches', 7),
  ('البانيني', 'Paninis', 'Paninis', 8),
  ('البيتزا', 'Pizzas', 'Pizzas', 9),
  ('المشروبات الباردة', 'Boissons fraîches', 'Cold Drinks', 10),
  ('المشروبات الساخنة', 'Boissons chaudes', 'Hot Drinks', 11),
  ('الإضافات', 'Suppléments & Extras', 'Sides & Extras', 12)
on conflict do nothing;

-- 4. Initial Restaurant Settings for Chef Eyad
update public.restaurant_settings set
  name = 'Chef Eyad',
  hero_title_ar = 'شيف إياد',
  hero_title_fr = 'Chef Eyad',
  hero_title_en = 'Chef Eyad',
  phone = '0555000000',
  address_ar = 'الجزائر العاصمة',
  address_fr = 'Alger',
  address_en = 'Algiers',
  opening_hours_ar = 'يومياً من 11:00 صباحاً إلى 00:00 منتصف الليل',
  opening_hours_fr = 'Tous les jours de 11h à minuit',
  opening_hours_en = 'Every day from 11:00 AM to Midnight',
  opens_at = '11:00',
  closes_at = '00:00'
where id = 1;

