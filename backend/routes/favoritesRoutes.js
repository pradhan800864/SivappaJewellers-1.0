// backend/routes/favorites.js
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const router = express.Router();

/**
 * ✅ Auth middleware
 * Expects: Authorization: Bearer <token>
 * Puts user id into req.user.id
 */
function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // expecting payload contains user id as `id` (or `user_id`)
    req.user = { id: payload.id ?? payload.user_id };
    if (!req.user.id) return res.status(401).json({ error: "Unauthorized" });

    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

  /**
   * 1) GET /api/favorites
   * Returns list of product_ids favorited by the logged-in user
   */
  router.get("/", requireAuth, async (req, res) => {
    const userId = Number(req.user.id);

    try {
      const q = await pool.query(
        `SELECT product_id, created_at
           FROM favorites
          WHERE user_id = $1
          ORDER BY created_at DESC`,
        [userId]
      );
      return res.json({ favorites: q.rows }); // [{product_id, created_at}, ...]
    } catch (err) {
      console.error("GET /api/favorites error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * 2) POST /api/favorites
   * Body: { product_id }
   * Adds favorite for logged-in user.
   * If already exists -> no error (idempotent).
   */
  router.post("/", requireAuth, async (req, res) => {
    const userId = Number(req.user.id);
    const productId = Number(req.body.product_id);

    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ error: "product_id is required" });
    }

    try {
      // Optional: validate product exists (recommended)
      const p = await pool.query(`SELECT id FROM products WHERE id = $1`, [productId]);
      if (p.rowCount === 0) return res.status(404).json({ error: "Product not found" });

      const ins = await pool.query(
        `INSERT INTO favorites (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO NOTHING
         RETURNING id, user_id, product_id, created_at`,
        [userId, productId]
      );

      // if already existed, return a consistent success response
      if (ins.rowCount === 0) {
        return res.status(200).json({ ok: true, already_favorited: true });
      }

      return res.status(201).json({ ok: true, favorite: ins.rows[0] });
    } catch (err) {
      console.error("POST /api/favorites error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * 3) DELETE /api/favorites/:productId
   * Removes favorite for logged-in user (idempotent).
   */
  router.delete("/:productId", requireAuth, async (req, res) => {
    const userId = Number(req.user.id);
    const productId = Number(req.params.productId);

    if (!Number.isFinite(productId) || productId <= 0) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    try {
      const del = await pool.query(
        `DELETE FROM favorites
          WHERE user_id = $1 AND product_id = $2`,
        [userId, productId]
      );

      return res.json({ ok: true, removed: del.rowCount > 0 });
    } catch (err) {
      console.error("DELETE /api/favorites/:productId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

/**
 * GET /api/favorites/products
 * Returns full product details for user's favorites
 */
router.get("/products", requireAuth, async (req, res) => {
  const userId = Number(req.user.id);

  try {
    const q = await pool.query(
      `
      SELECT p.*
      FROM favorites f
      JOIN products p ON p.id = f.product_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    return res.json({ products: q.rows });
  } catch (err) {
    console.error("GET /api/favorites/products error:", err);
    return res.status(500).json({ error: "Failed to fetch favorite products" });
  }
});


  module.exports = router;