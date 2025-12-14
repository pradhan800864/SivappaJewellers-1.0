const express = require("express");
const router = express.Router();
const pool = require("../db");

// (optional) in-memory cache for 5 minutes
let cache = { data: null, ts: 0 };
const TTL_MS = 5 * 60 * 1000;

router.get("/api/taxonomy", async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.ts < TTL_MS) {
      return res.json(cache.data);
    }

    const typesQ = await pool.query(`
      SELECT id, name
      FROM product_types
      ORDER BY name
    `);

    const catsQ = await pool.query(`
      SELECT pc.id, pc.name, pc.type_id, pt.name AS type_name
      FROM product_categories pc
      JOIN product_types pt ON pt.id = pc.type_id
      ORDER BY pt.name, pc.name
    `);

    const subsQ = await pool.query(`
      SELECT spc.id, spc.name, spc.category_id
      FROM sub_product_categories spc
      ORDER BY spc.name
    `);

    // optional facets derived from products table (no separate tables exist)
    const puritiesQ = await pool.query(`
      SELECT DISTINCT purity AS label
      FROM products
      WHERE purity IS NOT NULL AND TRIM(purity) <> ''
      ORDER BY purity DESC
    `);

    const stoneTypesQ = await pool.query(`
      SELECT DISTINCT stone_type AS label
      FROM products
      WHERE stone_type IS NOT NULL AND TRIM(stone_type) <> ''
      ORDER BY stone_type
    `);

    // Build productTypes
    const productTypes = typesQ.rows.map(r => ({ id: r.id, label: r.name }));

    // Build categoriesByType: { [typeLabel]: [{label}] }
    const categoriesByType = {};
    for (const t of productTypes) {
      categoriesByType[t.label] = [];
    }
    catsQ.rows.forEach(c => {
      const typeLabel = c.type_name;
      (categoriesByType[typeLabel] ??= []).push({ id: c.id, label: c.name });
    });

    // Map: category_id -> subcats [{label}]
    const subByCatId = {};
    subsQ.rows.forEach(s => {
      (subByCatId[s.category_id] ??= []).push({ id: s.id, label: s.name });
    });

    // Build subCategoriesByCategory keyed by category label (not id)
    // Note: your seeder created one category row per type; labels repeat across types.
    // For filters we only need the label->labels mapping, so we can merge duplicates.
    const subCategoriesByCategory = {};
    catsQ.rows.forEach(c => {
      const catLabel = c.name;
      const list = subByCatId[c.id] ?? [];
      if (!subCategoriesByCategory[catLabel]) {
        subCategoriesByCategory[catLabel] = list.map(s => ({ label: s.label }));
      }
    });

    const purities = puritiesQ.rows.map(r => ({ label: r.label }));
    const stoneTypes = stoneTypesQ.rows.map(r => ({ label: r.label }));

    const payload = {
      productTypes,                 // [{id,label}]
      categoriesByType,             // { [typeLabel]: [{id,label}] }
      subCategoriesByCategory,      // { [categoryLabel]: [{label}] }
      purities,                     // [{label}]
      stoneTypes,                   // [{label}]
    };

    cache = { data: payload, ts: Date.now() };
    res.json(payload);
  } catch (e) {
    console.error("taxonomy error", e);
    res.status(500).json({ error: "Failed to load taxonomy" });
  }
});

module.exports = router;
