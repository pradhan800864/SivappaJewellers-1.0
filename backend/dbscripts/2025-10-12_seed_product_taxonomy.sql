-- ============================================================
-- Sivappa Jewellers — Product Taxonomy Seeder (PostgreSQL)
-- Creates: product_types, product_categories, sub_product_categories data
-- Safe to run multiple times (idempotent)
-- ============================================================

BEGIN;

-- 0) Ensure unique indexes exist so ON CONFLICT works (skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_product_types_name'
  ) THEN
    CREATE UNIQUE INDEX ux_product_types_name ON product_types (name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_product_categories_type_name'
  ) THEN
    CREATE UNIQUE INDEX ux_product_categories_type_name ON product_categories (type_id, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_sub_product_categories_cat_name'
  ) THEN
    CREATE UNIQUE INDEX ux_sub_product_categories_cat_name ON sub_product_categories (category_id, name);
  END IF;
END $$;

-- 1) PRODUCT TYPES (Top-level)
INSERT INTO product_types (name)
VALUES
  ('Gold'),
  ('Silver'),
  ('Platinum'),
  ('Diamond'),
  ('Gemstone'),
  ('Antique / Temple'),
  ('Imitation / Fashion')
ON CONFLICT (name) DO NOTHING;

-- 2) PRODUCT CATEGORIES (common across all types)
WITH t AS (
  SELECT id FROM product_types
),
cats(name) AS (
  VALUES
    ('Chain'),
    ('Necklace'),
    ('Pendant'),
    ('Bracelet'),
    ('Ring'),
    ('Bangle'),
    ('Earring'),
    ('Anklet'),
    ('Toe Ring'),
    ('Coin'),
    ('Pendant Set'),
    ('Nose Pin'),
    ('Mangalsutra'),
    ('Brooch'),
    ('Watch')
)
INSERT INTO product_categories (type_id, name)
SELECT t.id, cats.name
FROM t CROSS JOIN cats
ON CONFLICT (type_id, name) DO NOTHING;

-- 3) SUB PRODUCT CATEGORIES (specific to each category; applied under every type’s category)

-- CHAIN
WITH c AS (SELECT id FROM product_categories WHERE name='Chain')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Small Chain'),
  ('Neck Chain'),
  ('Long Chain'),
  ('Box Chain'),
  ('Rope Chain'),
  ('Figaro Chain'),
  ('Curb Chain'),
  ('Cable Chain'),
  ('Fancy Chain')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- NECKLACE
WITH c AS (SELECT id FROM product_categories WHERE name='Necklace')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Choker Necklace'),
  ('Bridal Necklace'),
  ('Temple Necklace'),
  ('Collar Necklace'),
  ('Bib Necklace'),
  ('Beaded Necklace'),
  ('Short Necklace'),
  ('Long Necklace (Haar)')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- PENDANT
WITH c AS (SELECT id FROM product_categories WHERE name='Pendant')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Religious Pendant'),
  ('Initial/Name Pendant'),
  ('Heart Pendant'),
  ('Solitaire Pendant'),
  ('Gemstone Pendant'),
  ('Coin Pendant'),
  ('Lockets')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- BRACELET
WITH c AS (SELECT id FROM product_categories WHERE name='Bracelet')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Men Bracelet'),
  ('Women Bracelet'),
  ('Kids Bracelet'),
  ('Couple Bracelet'),
  ('Kada Bracelet'),
  ('Tennis Bracelet'),
  ('Charm Bracelet')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- RING
WITH c AS (SELECT id FROM product_categories WHERE name='Ring')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Engagement Ring'),
  ('Wedding Ring'),
  ('Solitaire Ring'),
  ('Casual Ring'),
  ('Couple Ring'),
  ('Small Ring'),
  ('Big Ring'),
  ('Adjustable Ring'),
  ('Birthstone Ring')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- BANGLE
WITH c AS (SELECT id FROM product_categories WHERE name='Bangle')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Single Bangle'),
  ('Pair Bangles'),
  ('Kada'),
  ('Antique Bangle'),
  ('Temple Bangle'),
  ('Thread Bangle'),
  ('Daily Wear Bangle'),
  ('Stone Studded Bangle'),
  ('Flexible/Expandable Bangle')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- EARRING
WITH c AS (SELECT id FROM product_categories WHERE name='Earring')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Stud Earring'),
  ('Drop Earring'),
  ('Hoop Earring'),
  ('Jhumka'),
  ('Chandbali'),
  ('Ear Cuff'),
  ('Huggies'),
  ('Danglers')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- ANKLET
WITH c AS (SELECT id FROM product_categories WHERE name='Anklet')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Light Anklet'),
  ('Heavy Anklet'),
  ('Beaded Anklet'),
  ('Oxidized Anklet'),
  ('Designer Anklet')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- TOE RING
WITH c AS (SELECT id FROM product_categories WHERE name='Toe Ring')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Plain Toe Ring'),
  ('Stone Toe Ring'),
  ('Oxidized Toe Ring'),
  ('Adjustable Toe Ring')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- COIN
WITH c AS (SELECT id FROM product_categories WHERE name='Coin')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('1g Coin'),
  ('2g Coin'),
  ('5g Coin'),
  ('8g Coin'),
  ('10g Coin'),
  ('20g Coin'),
  ('Custom Embossed Coin'),
  ('Laxmi Coin')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- PENDANT SET
WITH c AS (SELECT id FROM product_categories WHERE name='Pendant Set')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Pendant with Earrings'),
  ('Pendant with Chain'),
  ('Lightweight Pendant Set'),
  ('Bridal Pendant Set')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- NOSE PIN
WITH c AS (SELECT id FROM product_categories WHERE name='Nose Pin')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Nose Stud'),
  ('Nath'),
  ('Clip Nose Pin'),
  ('Stone Nose Pin'),
  ('Daily Wear Nose Pin')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- MANGALSUTRA
WITH c AS (SELECT id FROM product_categories WHERE name='Mangalsutra')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Single Chain Mangalsutra'),
  ('Double Chain Mangalsutra'),
  ('Daily Wear Mangalsutra'),
  ('Lightweight Mangalsutra'),
  ('Long Mangalsutra'),
  ('Pendant Mangalsutra')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- BROOCH
WITH c AS (SELECT id FROM product_categories WHERE name='Brooch')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Saree Brooch'),
  ('Kurta Brooch'),
  ('Jacket Brooch'),
  ('Bridal Brooch')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

-- WATCH (optional, keep for completeness)
WITH c AS (SELECT id FROM product_categories WHERE name='Watch')
INSERT INTO sub_product_categories (category_id, name)
SELECT c.id, s.name FROM c CROSS JOIN (VALUES
  ('Gold Watch'),
  ('Silver Watch'),
  ('Couple Watch'),
  ('Bracelet Watch')
) AS s(name)
ON CONFLICT (category_id, name) DO NOTHING;

COMMIT;

-- ============================================================
-- Optional sanity checks:
-- SELECT * FROM product_types ORDER BY id;
-- SELECT pt.name AS type, pc.name AS category
--   FROM product_categories pc JOIN product_types pt ON pt.id = pc.type_id
--   ORDER BY pt.name, pc.name;
-- SELECT pt.name AS type, pc.name AS category, spc.name AS sub_category
--   FROM sub_product_categories spc
--   JOIN product_categories pc ON pc.id = spc.category_id
--   JOIN product_types pt ON pt.id = pc.type_id
--   ORDER BY pt.name, pc.name, spc.name;
-- ============================================================
