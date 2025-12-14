-- ============================================================
-- Sivappa Jewellers — REFRESH SALES DATA (distinct products / order)
-- Uses metal_prices.price_inr matched ONLY by purity (latest by fetched_at)
-- to set order_items.metal_price_on_billing_day and unit_rate.
-- ============================================================

BEGIN;

-- 0) Ensure we have shops to pick from
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM shops) = 0 THEN
    RAISE EXCEPTION 'Cannot seed shop_id: shops table is empty.';
  END IF;
END$$;

-- 0.1) Assign random shop_id = 1..MAX(shops.id), evaluated PER ROW
WITH max_shop AS (
  SELECT MAX(id)::int AS max_id FROM shops
)
UPDATE order_history oh
SET shop_id   = (1 + floor(random() * ms.max_id))::int,
    updated_at = now()
FROM max_shop ms
WHERE oh.shop_id IS NULL;

-- 1) Wipe existing lines
DELETE FROM order_items;

-- 2) Decide how many items per order (1–5)
WITH orders AS (
  SELECT id AS order_id, created_at FROM order_history
),
item_plan AS (
  SELECT
    o.order_id,
    o.created_at AS order_created_at,
    (1 + floor(random()*5))::int AS item_count
  FROM orders o
),

-- 3) Rank ALL products per order by a per-order random order,
--    then take the first N (N = item_count) => ensures DISTINCT products per order
ranked_products AS (
  SELECT
    p.order_id,
    p.order_created_at,
    p.item_count,
    pr.id            AS product_id,
    pr.product_code,
    pr.name,
    pr.purity,
    pr.hsn_code,
    pr.has_stones,
    COALESCE(pr.net_weight::numeric, 0)    AS net_weight,
    COALESCE(pr.gross_weight::numeric, 0)  AS gross_weight,
    COALESCE(pr.wastage::numeric, 0)       AS wastage_pct,
    COALESCE(pr.making_charges::numeric,0) AS making_charges,
    COALESCE(pr.discount::numeric, 0)      AS discount_pct,
    COALESCE(pr.gst::numeric, 3)           AS gst_pct,
    COALESCE(pr.type_id, 1)                AS type_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.order_id
      ORDER BY random()
    ) AS rn
  FROM item_plan p
  JOIN products pr ON true
),

picked AS (
  SELECT
    order_id,
    order_created_at,
    product_id, product_code, name, purity, hsn_code, has_stones,
    net_weight, gross_weight, wastage_pct, making_charges, discount_pct, gst_pct, type_id,
    (1 + floor(random()*3))::int AS qty
  FROM ranked_products rp
  WHERE rp.rn <= rp.item_count
),

-- 4) Build a latest-price lookup by PURITY only (normalize both sides)
metal_price_by_purity AS (
  SELECT purity_norm, price_inr
  FROM (
    SELECT
      regexp_replace(upper(trim(purity)), '\s+', '', 'g') AS purity_norm,
      price_inr,
      fetched_at,
      ROW_NUMBER() OVER (
        PARTITION BY regexp_replace(upper(trim(purity)), '\s+', '', 'g')
        ORDER BY fetched_at DESC
      ) AS rn
    FROM metal_prices
  ) mp
  WHERE rn = 1
),

-- 5) Attach market price strictly by purity (normalized)
with_purity_price AS (
  SELECT
    d.*,
    mp.price_inr::numeric AS metal_price_on_billing_day,
    regexp_replace(upper(trim(d.purity)), '\s+', '', 'g') AS _purity_norm
  FROM picked d
  LEFT JOIN metal_price_by_purity mp
    ON mp.purity_norm = regexp_replace(upper(trim(d.purity)), '\s+', '', 'g')
),

-- 6) Fall back ONLY if no purity match (keep seeder robust).
--    If you want to force non-null, replace the fallback with RAISE EXCEPTION.
priced AS (
  SELECT
    w.*,
    COALESCE(
      w.metal_price_on_billing_day,
      1000 + floor(random()*9000)  -- fallback per-gram rate if no purity match found
    )::numeric AS unit_rate_applied
  FROM with_purity_price w
),

-- 7) Insert fresh items (timestamps match the order)
ins_items AS (
  INSERT INTO order_items (
    order_id, product_id, product_code, name, purity, hsn_code, has_stones,
    qty, net_weight, gross_weight, unit_rate, wastage_pct, making_charges,
    discount_pct, gst_pct, line_subtotal, line_tax, line_total, created_at,
    metal_price_on_billing_day
  )
  SELECT
    p.order_id,
    p.product_id,
    p.product_code,
    p.name,
    p.purity,
    p.hsn_code,
    p.has_stones,
    p.qty,
    p.net_weight,
    p.gross_weight,
    p.unit_rate_applied,         -- unit_rate = price matched by purity (or fallback)
    p.wastage_pct,
    p.making_charges,
    p.discount_pct,
    p.gst_pct,
    ((p.net_weight * p.unit_rate_applied + p.making_charges) * (1 - (p.discount_pct/100.0)) * p.qty)::numeric(14,2) AS line_subtotal,
    (((p.net_weight * p.unit_rate_applied + p.making_charges) * (1 - (p.discount_pct/100.0))) * (p.gst_pct/100.0) * p.qty)::numeric(14,2) AS line_tax,
    (((p.net_weight * p.unit_rate_applied + p.making_charges) * (1 - (p.discount_pct/100.0))) * (1 + (p.gst_pct/100.0)) * p.qty)::numeric(14,2) AS line_total,
    p.order_created_at AS created_at,
    p.metal_price_on_billing_day  -- directly from metal_prices by purity; may be NULL only if no match
  FROM priced p
  RETURNING order_id, line_total
),

-- 8) Aggregate totals per order
totals AS (
  SELECT order_id, SUM(line_total)::numeric(14,2) AS subtotal
  FROM ins_items
  GROUP BY order_id
)

-- 9) Update order_history subtotals
UPDATE order_history oh
SET subtotal = t.subtotal, updated_at = now()
FROM totals t
WHERE t.order_id = oh.id;

COMMIT;


---node utils/runSqlFile.js dbscripts/2025-10-20_seed_sales.sql