-- Chef Eyad: Full Menu Seed (Categories, Dishes, Variants, Extras, and Photos)

-- Clear any empty categories
delete from public.product_extras;
delete from public.product_variants;
delete from public.product_images;
delete from public.products;
delete from public.categories;

-- Mac Kiffan menu, imported from "Menu_MC_Kiffan_Organise.xlsx".
--
-- Price rules:
--   * a single price      -> one verified variant (عادي / Normal / Regular)
--   * explicit sizes       -> verified, named variants (M/L/XL, 50 g/100 g, Petite/Méga, P/G)
--   * bread choices        -> verified variants at the same price (customer picks the bread)
--   * "A DA / B DA" without a stated meaning -> unnamed variants, verification = 'pending'
--   * ranges ("550-600 DA") -> the lower bound, and every variant of that product stays
--     'pending' so the product is hidden until an admin confirms the real prices.
-- The "(Plats/Sandwiches)" cheese supplement is also offered as an optional extra on
-- those products, as stated in the sheet.

do $$
declare
  menu jsonb := $json$
[
 {"fr":"Entrées","ar":"المقبلات","en":"Starters","items":[
  {"fr":"Salade variée","ar":"سلطة متنوعة","en":"Mixed salad","img":"/images/demo/salade-composee.jpg","p":300},
  {"fr":"Salade de thon","ar":"سلطة التونة","en":"Tuna salad","img":"/images/demo/salade-thon.jpg","pending":[350,400]},
  {"fr":"Salade césar","ar":"سلطة سيزر","en":"Caesar salad","img":"/images/demo/salade-composee.jpg","p":500},
  {"fr":"Bourek","ar":"بوراك","en":"Bourek","d":["Prix à la pièce","السعر للقطعة الواحدة","Price per piece"],"p":100},
  {"fr":"Soupe de carotte","ar":"شوربة الجزر","en":"Carrot soup","p":300},
  {"fr":"Soupe de légumes","ar":"شوربة الخضار","en":"Vegetable soup","p":300},
  {"fr":"Soupe de poulet","ar":"شوربة الدجاج","en":"Chicken soup","p":300}
 ]},
 {"fr":"Gratins","ar":"الغراتان","en":"Gratins","items":[
  {"fr":"Gratin poulet","ar":"غراتان الدجاج","en":"Chicken gratin","pending":[300,400]},
  {"fr":"Gratin viande","ar":"غراتان اللحم","en":"Meat gratin","pending":[400,500]},
  {"fr":"Gratin de crevettes","ar":"غراتان الجمبري","en":"Shrimp gratin","img":"/images/demo/gratin-crevettes.jpg","pending":[500,600]}
 ]},
 {"fr":"Plats","ar":"الأطباق الرئيسية","en":"Main Dishes","items":[
  {"fr":"Poulet mariné","ar":"دجاج متبّل","en":"Marinated chicken","pending":[750,800],"cheese":true},
  {"fr":"Cuisse de Poulet rôtie","ar":"فخذ دجاج مشوي","en":"Roast chicken leg","p":800,"cheese":true},
  {"fr":"Cordon bleu","ar":"كوردون بلو","en":"Cordon bleu","pending":[800,1000],"cheese":true},
  {"fr":"Cuisse de poulet farcie","ar":"فخذ دجاج محشي","en":"Stuffed chicken leg","pending":[800,1000],"cheese":true},
  {"fr":"Escalope grillée","ar":"إسكالوب مشوي","en":"Grilled escalope","pending":[750,800],"cheese":true},
  {"fr":"Poulet pané","ar":"دجاج بانيه","en":"Breaded chicken","p":800,"cheese":true},
  {"fr":"Galette de viande","ar":"قرص لحم","en":"Meat patty","p":1100,"cheese":true},
  {"fr":"Sauté de veau","ar":"لحم عجل سوتيه","en":"Sautéed veal","pending":[900,1200],"cheese":true},
  {"fr":"Escalope à la crème","ar":"إسكالوب بالكريمة","en":"Escalope in cream sauce","pending":[800,900],"cheese":true},
  {"fr":"Steak haché","ar":"ستيك مفروم","en":"Minced steak","p":800,"cheese":true},
  {"fr":"Entrecôte","ar":"أنتريكوت","en":"Rib steak (entrecôte)","img":"/images/demo/steak-frites.jpg","p":1200,"cheese":true},
  {"fr":"Chiche kebab","ar":"شيش كباب","en":"Shish kebab","img":"/images/demo/brochettes.jpg","p":800,"cheese":true},
  {"fr":"Kebda m'chermla","ar":"كبدة مشرملة","en":"Kebda m'chermla (spiced liver)","p":800,"cheese":true},
  {"fr":"Dorade","ar":"سمك الدوراد","en":"Sea bream","p":1300,"cheese":true},
  {"fr":"Soufflé de viande","ar":"سوفليه اللحم","en":"Meat soufflé","p":1100,"cheese":true},
  {"fr":"Fried chicken","ar":"دجاج مقلي","en":"Fried chicken","p":800,"cheese":true},
  {"fr":"Roulé de viande","ar":"رولي اللحم","en":"Meat roll","p":900,"cheese":true},
  {"fr":"Plat du jour","ar":"طبق اليوم","en":"Dish of the day","pending":[1000,1500],"cheese":true},
  {"fr":"Kebba","ar":"كبة","en":"Kibbeh","p":150,"cheese":true}
 ]},
 {"fr":"Chawarma","ar":"الشاورما","en":"Shawarma","items":[
  {"fr":"Sandwich Chawarma","ar":"سندويتش شاورما","en":"Shawarma sandwich","img":"/images/demo/shawarma.jpg","bread":"chawarma","p":300,"cheese":true},
  {"fr":"Sandwich Chawarma + Kiri","ar":"سندويتش شاورما + كيري","en":"Shawarma sandwich + Kiri cheese","img":"/images/demo/shawarma.jpg","bread":"chawarma","p":350,"cheese":true},
  {"fr":"Sandwich Double Chawarma","ar":"سندويتش شاورما دوبل","en":"Double shawarma sandwich","img":"/images/demo/shawarma.jpg","bread":"chawarma","p":500,"cheese":true},
  {"fr":"Plat Chawarma arabe","ar":"طبق شاورما عربي","en":"Arabic shawarma plate","p":900,"cheese":true},
  {"fr":"Plat Chawarma à la braise","ar":"طبق شاورما على الجمر","en":"Charcoal shawarma plate","p":750,"cheese":true},
  {"fr":"Plat Double Chawarma","ar":"طبق شاورما دوبل","en":"Double shawarma plate","p":1000,"cheese":true}
 ]},
 {"fr":"Paninis","ar":"البانيني","en":"Paninis","items":[
  {"fr":"Panini Viande Hachée","ar":"بانيني باللحم المفروم","en":"Minced meat panini","img":"/images/demo/panini.jpg","p":250,"cheese":true},
  {"fr":"Panini au Thon","ar":"بانيني بالتونة","en":"Tuna panini","img":"/images/demo/panini.jpg","p":250,"cheese":true},
  {"fr":"Panini au Poulet","ar":"بانيني بالدجاج","en":"Chicken panini","img":"/images/demo/panini.jpg","p":250,"cheese":true},
  {"fr":"Panini aux 03 Fromages","ar":"بانيني بالأجبان الثلاثة","en":"Three-cheese panini","img":"/images/demo/panini.jpg","p":250,"cheese":true}
 ]},
 {"fr":"Tacos","ar":"التاكوس","en":"Tacos","items":[
  {"fr":"Tacos Poulet","ar":"تاكوس دجاج","en":"Chicken tacos","img":"/images/demo/tacos.jpg","sizes":"mlxl"},
  {"fr":"Tacos Viande hachée","ar":"تاكوس لحم مفروم","en":"Minced meat tacos","img":"/images/demo/tacos.jpg","sizes":"mlxl"},
  {"fr":"Tacos Mariné","ar":"تاكوس متبّل","en":"Marinated tacos","img":"/images/demo/tacos.jpg","sizes":"mlxl"},
  {"fr":"Tacos Mixte","ar":"تاكوس مشكّل","en":"Mixed tacos","img":"/images/demo/tacos.jpg","sizes":"mlxl"},
  {"fr":"Mini Tacos","ar":"ميني تاكوس","en":"Mini tacos","img":"/images/demo/tacos.jpg","p":250}
 ]},
 {"fr":"Sandwiches","ar":"السندويتشات","en":"Sandwiches","items":[
  {"fr":"Fajitas poulet","ar":"فاهيتا دجاج","en":"Chicken fajitas","bread":"sandwich","p":350,"cheese":true},
  {"fr":"Sandwich Poulet","ar":"سندويتش دجاج","en":"Chicken sandwich","bread":"sandwich","p":300,"cheese":true},
  {"fr":"Sandwich Viande","ar":"سندويتش لحم","en":"Meat sandwich","bread":"sandwich","p":300,"cheese":true},
  {"fr":"Sandwich Escalope","ar":"سندويتش إسكالوب","en":"Escalope sandwich","bread":"sandwich","p":300,"cheese":true},
  {"fr":"Sandwich Poulet mariné","ar":"سندويتش دجاج متبّل","en":"Marinated chicken sandwich","bread":"sandwich","p":300,"cheese":true},
  {"fr":"Sandwich Chicken Tikka","ar":"سندويتش تشيكن تكا","en":"Chicken tikka sandwich","bread":"sandwich","p":300,"cheese":true}
 ]},
 {"fr":"Burgers","ar":"البرغر","en":"Burgers","items":[
  {"fr":"Cheese Burger","ar":"تشيز برغر","en":"Cheeseburger","img":"/images/demo/cheeseburger.jpg","v":[["50 g","50 غ","50 g",200,true],["100 g","100 غ","100 g",300,true]]},
  {"fr":"Chicken Burger","ar":"تشيكن برغر","en":"Chicken burger","v":[["50 g","50 غ","50 g",200,true],["100 g","100 غ","100 g",350,true]]},
  {"fr":"Classic Burger","ar":"كلاسيك برغر","en":"Classic burger","img":"/images/demo/burger.jpg","d":["Steak haché 100 g","لحم مفروم 100 غ","100 g beef patty"],"p":300},
  {"fr":"Double Cheese","ar":"دبل تشيز","en":"Double cheese","img":"/images/demo/cheeseburger.jpg","d":["Steak haché 100 g, sauce roquefort","لحم مفروم 100 غ، صلصة الروكفور","100 g beef patty, Roquefort sauce"],"p":400},
  {"fr":"Twin burger","ar":"توين برغر","en":"Twin burger","img":"/images/demo/burger.jpg","d":["Steak haché 200 g, double fromage","لحم مفروم 200 غ، جبن مضاعف","200 g beef, double cheese"],"p":500},
  {"fr":"Triple burger","ar":"تريبل برغر","en":"Triple burger","img":"/images/demo/burger-menu.jpg","d":["Steak haché 300 g, triple fromage","لحم مفروم 300 غ، جبن ثلاثي","300 g beef, triple cheese"],"p":750}
 ]},
 {"fr":"Pizzas","ar":"البيتزا","en":"Pizzas","items":[
  {"fr":"Pizza Marguerite","ar":"بيتزا مارغريتا","en":"Margherita pizza","img":"/images/demo/pizza.jpg","pizza":[450,1300]},
  {"fr":"Pizza Végétarienne","ar":"بيتزا نباتية","en":"Vegetarian pizza","img":"/images/demo/pizza.jpg","pizza":[550,1800]},
  {"fr":"Pizza Chicken","ar":"بيتزا دجاج","en":"Chicken pizza","img":"/images/demo/pizza.jpg","pizza":[550,1800],"range":true},
  {"fr":"Pizza Thon","ar":"بيتزا التونة","en":"Tuna pizza","img":"/images/demo/pizza.jpg","pizza":[550,1800],"range":true},
  {"fr":"Pizza Viande","ar":"بيتزا اللحم","en":"Meat pizza","img":"/images/demo/pizza.jpg","pizza":[600,1800],"range":true},
  {"fr":"Pizza Algérienne","ar":"بيتزا جزائرية","en":"Algerian pizza","img":"/images/demo/pizza.jpg","pizza":[550,1800],"range":true},
  {"fr":"Pizza 03 Fromages","ar":"بيتزا الأجبان الثلاثة","en":"Three-cheese pizza","img":"/images/demo/pizza.jpg","pizza":[600,1800]},
  {"fr":"Pizza Crème Fraîche","ar":"بيتزا بالكريمة الطازجة","en":"Crème fraîche pizza","img":"/images/demo/pizza.jpg","pizza":[700,1800],"range":true},
  {"fr":"Pizza Boisée","ar":"بيتزا بوازي","en":"Boisée pizza","img":"/images/demo/pizza.jpg","pizza":[700,1800],"range":true},
  {"fr":"Pizza Poulet Fumé","ar":"بيتزا الدجاج المدخّن","en":"Smoked chicken pizza","img":"/images/demo/pizza.jpg","pizza":[800,2000]},
  {"fr":"Pizza Crevettes","ar":"بيتزا الجمبري","en":"Shrimp pizza","img":"/images/demo/pizza.jpg","pizza":[800,2000],"range":true},
  {"fr":"Pizza Fruits de mer","ar":"بيتزا ثمار البحر","en":"Seafood pizza","img":"/images/demo/pizza.jpg","pizza":[900,2400],"range":true},
  {"fr":"Pizza MC KIFFAN (Surprise)","ar":"بيتزا ماك كيفان (مفاجأة)","en":"Mac Kiffan pizza (surprise)","img":"/images/demo/pizza.jpg","pizza":[1000,3000]},
  {"fr":"Méga au choix","ar":"ميغا حسب اختيارك","en":"Mega of your choice","img":"/images/demo/pizza.jpg","d":["Pizza Méga au choix — précisez-la dans la remarque","بيتزا ميغا من اختيارك — اكتب نوعها في الملاحظة","Any Mega pizza — tell us which one in the note"],"p":2400}
 ]},
 {"fr":"Boissons fraîches","ar":"المشروبات الباردة","en":"Cold Drinks","items":[
  {"fr":"Eau Minérale PM","ar":"ماء معدني صغير","en":"Mineral water (small)","p":30},
  {"fr":"Eau Minérale GM","ar":"ماء معدني كبير","en":"Mineral water (large)","p":50},
  {"fr":"Soda PM","ar":"مشروب غازي صغير","en":"Soda (small)","img":"/images/demo/boissons.jpg","p":70},
  {"fr":"Boisson 1L","ar":"مشروب 1 لتر","en":"Soft drink 1 L","img":"/images/demo/boissons.jpg","p":150},
  {"fr":"Jus PM","ar":"عصير صغير","en":"Juice (small)","img":"/images/demo/jus.jpg","p":70},
  {"fr":"Jus en boîte PM","ar":"عصير علبة صغير","en":"Boxed juice (small)","img":"/images/demo/jus.jpg","p":40},
  {"fr":"Canette","ar":"مشروب غازي معلّب","en":"Can","img":"/images/demo/boissons.jpg","d":["33 cl","33 سل","33 cl"],"p":100}
 ]},
 {"fr":"Boissons chaudes","ar":"المشروبات الساخنة","en":"Hot Drinks","items":[
  {"fr":"Café au lait","ar":"قهوة بالحليب","en":"Café au lait","p":50},
  {"fr":"Nespresso","ar":"نسبريسو","en":"Nespresso","p":70},
  {"fr":"Thé Infusion","ar":"شاي / منقوع أعشاب","en":"Tea / herbal infusion","p":50}
 ]},
 {"fr":"Suppléments & Extras","ar":"الإضافات","en":"Sides & Extras","items":[
  {"fr":"Supplément fromage (Plats/Sandwiches)","ar":"جبن إضافي (أطباق/سندويتشات)","en":"Extra cheese (dishes/sandwiches)","p":200},
  {"fr":"Supplément fromage (Pizza)","ar":"جبن إضافي (بيتزا)","en":"Extra cheese (pizza)","pizza":[300,700]},
  {"fr":"Supplément poulet","ar":"دجاج إضافي","en":"Extra chicken","p":500},
  {"fr":"Supplément viande","ar":"لحم إضافي","en":"Extra meat","pending":[500,600]},
  {"fr":"Supplément riz","ar":"أرز إضافي","en":"Extra rice","v":[["Petit","صغير","Small",200,true],["Grand","كبير","Large",300,true]]},
  {"fr":"Barquette de frites","ar":"علبة بطاطا مقلية","en":"Fries","p":150},
  {"fr":"01 boule de riz","ar":"كرة أرز واحدة","en":"1 scoop of rice","p":150}
 ]}
]
$json$;
  breads jsonb := $json$
{
 "chawarma":[["Pain libanais","خبز لبناني","Lebanese bread"],["Pain tunisien","خبز تونسي","Tunisian bread"],["Pain normal","خبز عادي","Regular bread"]],
 "sandwich":[["Pain spécial","خبز خاص","Special bread"],["Pain aux olives","خبز بالزيتون","Olive bread"],["Chapata","شاباتا","Ciabatta"]]
}
$json$;
  cat jsonb;
  item jsonb;
  v jsonb;
  variants jsonb;
  cat_id uuid;
  prod_id uuid;
  c_idx int := 0;
  p_idx int;
  v_idx int;
begin
  for cat in select * from jsonb_array_elements(menu) loop
    c_idx := c_idx + 1;
    insert into public.categories (name_fr, name_ar, name_en, sort_order)
    values (cat->>'fr', cat->>'ar', cat->>'en', c_idx)
    returning id into cat_id;

    p_idx := 0;
    for item in select * from jsonb_array_elements(cat->'items') loop
      p_idx := p_idx + 1;
      insert into public.products (category_id, name_fr, name_ar, name_en, description_fr, description_ar, description_en, sort_order)
      values (cat_id, item->>'fr', item->>'ar', item->>'en',
              coalesce(item->'d'->>0, ''), coalesce(item->'d'->>1, ''), coalesce(item->'d'->>2, ''), p_idx)
      returning id into prod_id;

      if item ? 'img' then
        insert into public.product_images (product_id, url, sort_order) values (prod_id, item->>'img', 0);
      end if;

      -- Normalise every price rule to [name_fr, name_ar, name_en, price, verified].
      variants := case
        when item ? 'v' then item->'v'
        when item ? 'bread' then (
          select jsonb_agg(jsonb_build_array(b->>0, b->>1, b->>2, (item->>'p')::int, true))
          from jsonb_array_elements(breads->(item->>'bread')) b)
        when item ? 'sizes' then
          '[["M","M","M",500,true],["L","L","L",700,true],["XL","XL","XL",900,true]]'::jsonb
        when item ? 'pizza' then jsonb_build_array(
          jsonb_build_array('Petite', 'صغيرة', 'Small', (item->'pizza'->>0)::int, not coalesce((item->>'range')::boolean, false)),
          jsonb_build_array('Méga', 'ميغا', 'Mega', (item->'pizza'->>1)::int, not coalesce((item->>'range')::boolean, false)))
        when item ? 'pending' then (
          select jsonb_agg(jsonb_build_array('', '', '', x::int, false))
          from jsonb_array_elements_text(item->'pending') x)
        else jsonb_build_array(jsonb_build_array('Normal', 'عادي', 'Regular', (item->>'p')::int, true))
      end;

      v_idx := 0;
      for v in select * from jsonb_array_elements(variants) loop
        v_idx := v_idx + 1;
        insert into public.product_variants (product_id, name_fr, name_ar, name_en, price, verification, sort_order)
        values (prod_id, v->>0, v->>1, v->>2, (v->>3)::int,
                case when (v->>4)::boolean then 'verified' else 'pending' end::public.verification_status, v_idx);
      end loop;

      if coalesce((item->>'cheese')::boolean, false) then
        insert into public.product_extras (product_id, name_fr, name_ar, name_en, price, sort_order)
        values (prod_id, 'Supplément fromage', 'جبن إضافي', 'Extra cheese', 200, 1);
      end if;
    end loop;
  end loop;
end;
$$;


-- Photos for products that had none (sourced from Wikimedia Commons; see src/data/photoCredits.json
-- and the /credits page for authors and licenses). Only fills products without an image.
insert into public.product_images (product_id, url, sort_order)
select p.id, m.u, 0
from jsonb_to_recordset($json$
[{"p":"Bourek","u":"/images/menu/bourek.jpg"},{"p":"Soupe de carotte","u":"/images/menu/soupe-de-carotte.jpg"},{"p":"Soupe de légumes","u":"/images/menu/soupe-de-legumes.jpg"},{"p":"Soupe de poulet","u":"/images/menu/soupe-de-poulet.jpg"},{"p":"Gratin poulet","u":"/images/menu/gratin-poulet.jpg"},{"p":"Gratin viande","u":"/images/menu/gratin-viande.jpg"},{"p":"Poulet mariné","u":"/images/menu/poulet-marine.jpg"},{"p":"Cuisse de Poulet rôtie","u":"/images/menu/cuisse-de-poulet-rotie.jpg"},{"p":"Cordon bleu","u":"/images/menu/cordon-bleu.jpg"},{"p":"Cuisse de poulet farcie","u":"/images/menu/cuisse-de-poulet-farcie.jpg"},{"p":"Escalope grillée","u":"/images/menu/escalope-grillee.jpg"},{"p":"Poulet pané","u":"/images/menu/poulet-pane.jpg"},{"p":"Galette de viande","u":"/images/menu/galette-de-viande.jpg"},{"p":"Sauté de veau","u":"/images/menu/saute-de-veau.jpg"},{"p":"Escalope à la crème","u":"/images/menu/escalope-a-la-creme.jpg"},{"p":"Steak haché","u":"/images/menu/steak-hache.jpg"},{"p":"Kebda m'chermla","u":"/images/menu/kebda-m-chermla.jpg"},{"p":"Dorade","u":"/images/menu/dorade.jpg"},{"p":"Soufflé de viande","u":"/images/menu/souffle-de-viande.jpg"},{"p":"Fried chicken","u":"/images/menu/fried-chicken.jpg"},{"p":"Roulé de viande","u":"/images/menu/roule-de-viande.jpg"},{"p":"Plat du jour","u":"/images/menu/plat-du-jour.jpg"},{"p":"Kebba","u":"/images/menu/kebba.jpg"},{"p":"Plat Chawarma arabe","u":"/images/menu/plat-chawarma-arabica.jpg"},{"p":"Plat Chawarma à la braise","u":"/images/menu/plat-chawarma-a-la-braise.jpg"},{"p":"Plat Double Chawarma","u":"/images/menu/plat-double-chawarma.jpg"},{"p":"Fajitas poulet","u":"/images/menu/fajitas-poulet.jpg"},{"p":"Sandwich Poulet","u":"/images/menu/sandwich-poulet.jpg"},{"p":"Sandwich Viande","u":"/images/menu/sandwich-viande.jpg"},{"p":"Sandwich Escalope","u":"/images/menu/sandwich-escalope.jpg"},{"p":"Sandwich Poulet mariné","u":"/images/menu/sandwich-poulet-marine.jpg"},{"p":"Sandwich Chicken Tikka","u":"/images/menu/sandwich-chicken-tika.jpg"},{"p":"Chicken Burger","u":"/images/menu/chicken-burger.jpg"},{"p":"Eau Minérale PM","u":"/images/menu/eau-minerale-pm.jpg"},{"p":"Eau Minérale GM","u":"/images/menu/eau-minerale-gm.jpg"},{"p":"Café au lait","u":"/images/menu/cafe-au-lait.jpg"},{"p":"Nespresso","u":"/images/menu/nespresso.jpg"},{"p":"Thé Infusion","u":"/images/menu/the-infusion.jpg"},{"p":"Supplément fromage (Plats/Sandwiches)","u":"/images/menu/supplement-fromage-plats-sandwiches.jpg"},{"p":"Supplément fromage (Pizza)","u":"/images/menu/supplement-fromage-pizza.jpg"},{"p":"Supplément poulet","u":"/images/menu/supplement-poulet.jpg"},{"p":"Supplément viande","u":"/images/menu/supplement-viande.jpg"},{"p":"Supplément riz","u":"/images/menu/supplement-riz.jpg"},{"p":"Barquette de frites","u":"/images/menu/barquette-de-frites.jpg"},{"p":"01 boule de riz","u":"/images/menu/01-boule-de-riz.jpg"}]
$json$::jsonb) as m(p text, u text)
join public.products p on p.name_fr = m.p
where not exists (select 1 from public.product_images i where i.product_id = p.id);

