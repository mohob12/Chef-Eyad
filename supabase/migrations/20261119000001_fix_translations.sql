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
