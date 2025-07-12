const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/products", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          p.*,
          p.image_urls[1]                          AS image_url,
          mp.price_inr                             AS metal_rate,
          (p.net_weight * mp.price_inr)            AS net_price,
          p.making_charges                         AS making_charges,
          p.stone_price                            AS stone_price,
          (
            p.net_weight * mp.price_inr
            + p.making_charges
            + p.stone_price
          )                                        AS final_price
        FROM products p
        LEFT JOIN LATERAL (
          SELECT price_inr
          FROM metal_prices
          WHERE metal_type = 'gold'
            AND purity    = p.purity
          ORDER BY fetched_at DESC
          LIMIT 1
        ) mp ON TRUE
        ORDER BY p.name
      `);
  
      const productsWithFullImgUrl = result.rows.map(product => ({
        ...product,
        frontImg: `http://localhost:4998${product.image_url}`,
        backImg: `http://localhost:4998${product.image_url}` // Optional: update if you want different back image
      }));
  
      res.json(productsWithFullImgUrl);
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

module.exports = router;