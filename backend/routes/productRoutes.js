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
          storeId: shopResult.rows[0].id,
          nearestLocation: shopResult.rows[0].shop_name || "Shop",
          address: shopResult.rows[0].address,
          orderCode: `ORD-${Date.now()}`
        });
      }
  
      // Step 2: Check in owners
      const ownerResult = await pool.query("SELECT * FROM owner WHERE pincode = $1", [pincode]);
      if (ownerResult.rows.length > 0) {
        return res.json({
          storeId: ownerResult.rows[0].id,
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
            orderCode: `ORD-${Date.now()}`,
            storeId: shopNearest.rows[0].id
          });
        }
  
        const ownerNearest = await pool.query("SELECT * FROM owner WHERE pincode = $1", [nearest.pincode]);
        if (ownerNearest.rows.length > 0) {
          return res.json({
            nearestLocation: ownerNearest.rows[0].username || "Owner",
            address: ownerNearest.rows[0].address,
            orderCode: `ORD-${Date.now()}`,
            storeId: ownerNearest.rows[0].id
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
  
  router.post("/place-order", async (req, res) => {
    const { userId, storeId, pincode, products } = req.body;
  
    if (!userId || !storeId || !pincode || !products || products.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    const orderId = `ORD-${Date.now()}`;
    const orderStatus = "Pending";
  
    try {
      await pool.query(
        `INSERT INTO customer_orders (user_id, order_id, store_id, pincode, products, order_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, orderId, storeId, pincode, JSON.stringify(products), orderStatus]
      );
  
      return res.json({ success: true, message: "Order placed successfully", orderId });
    } catch (err) {
      console.error("Error placing order:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });


  router.get('/wallet/history/:userId', async (req, res) => {
    const userId = req.params.userId;
    const limit = req.query.limit || 5;
  
    try {
      const result = await pool.query(
        `SELECT coins, type, source, note, created_at 
         FROM wallet_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching wallet history:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

module.exports = router;