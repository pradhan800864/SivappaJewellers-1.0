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


  router.post("/pincode/check", async (req, res) => {
    const { pincode } = req.body;
  
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: "Invalid pincode format" });
    }
  
    try {
      // Step 1: Check in shops
      const shopResult = await pool.query("SELECT * FROM shops WHERE pincode = $1", [pincode]);
      if (shopResult.rows.length > 0) {
        return res.json({
          nearestLocation: shopResult.rows[0].shop_name || "Shop",
          address: shopResult.rows[0].address,
          orderCode: `ORD-${Date.now()}`
        });
      }
  
      // Step 2: Check in owners
      const ownerResult = await pool.query("SELECT * FROM owner WHERE pincode = $1", [pincode]);
      if (ownerResult.rows.length > 0) {
        return res.json({
          nearestLocation: ownerResult.rows[0].username || "Owner",
          address: ownerResult.rows[0].address,
          orderCode: `ORD-${Date.now()}`
        });
      }
  
      // Step 3: Find nearest available pincode
      const allPincodes = await pool.query(`
        SELECT pincode FROM (
          SELECT pincode FROM shops
          UNION
          SELECT pincode FROM owner
        ) all_pincodes
      `);
  
      const nearest = allPincodes.rows
        .map((row) => ({
          pincode: row.pincode,
          distance: Math.abs(Number(row.pincode) - Number(pincode))
        }))
        .sort((a, b) => a.distance - b.distance)[0];
  
      if (nearest) {
        // Try to find address for the nearest pincode
        const shopNearest = await pool.query("SELECT * FROM shops WHERE pincode = $1", [nearest.pincode]);
        if (shopNearest.rows.length > 0) {
          return res.json({
            nearestLocation: shopNearest.rows[0].shop_name || "Shop",
            address: shopNearest.rows[0].address,
            orderCode: `ORD-${Date.now()}`
          });
        }
  
        const ownerNearest = await pool.query("SELECT * FROM owner WHERE pincode = $1", [nearest.pincode]);
        if (ownerNearest.rows.length > 0) {
          return res.json({
            nearestLocation: ownerNearest.rows[0].username || "Owner",
            address: ownerNearest.rows[0].address,
            orderCode: `ORD-${Date.now()}`
          });
        }
  
        // fallback: return nearest pincode without address
        return res.json({
          nearestLocation: `Closest available pincode: ${nearest.pincode}`,
          address: null,
          orderCode: `ORD-${Date.now()}`
        });
      }
  
      return res.status(404).json({ error: "No available delivery location found." });
  
    } catch (err) {
      console.error("Error in pincode check:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

module.exports = router;