const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

const getUserIdFromToken = (req) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return Number(payload.id ?? payload.user_id ?? payload.sub);
  } catch (e) {
    return null;
  }
};

router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        pt.name                                  AS product_type,           -- ← metal type via FK
        p.image_urls[1]                          AS image_url,
        mp.price_inr                             AS metal_rate,
        (p.net_weight * mp.price_inr)            AS net_price,
        p.making_charges                         AS making_charges,
        p.stone_price                            AS stone_price,
        (p.net_weight * mp.price_inr
         + p.making_charges
         + p.stone_price)                        AS final_price
      FROM products p
      JOIN product_types pt
        ON pt.id = p.type_id                     -- ← pull the type (gold/silver/…)
      LEFT JOIN LATERAL (
        SELECT price_inr
        FROM metal_prices
        WHERE LOWER(metal_type) = LOWER(pt.name) -- ← use product’s type
          AND purity = p.purity                  -- (keep same purity match as before)
        ORDER BY fetched_at DESC
        LIMIT 1
      ) mp ON TRUE
      ORDER BY p.name
    `);

    const productsWithFullImgUrl = result.rows.map(product => ({
      ...product,
      frontImg: `http://localhost:4998${product.image_url}`,
      backImg:  `http://localhost:4998${product.image_url}`, // same as before
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
    const userId = Number(req.params.userId);
    const limit = Math.min(Number(req.query.limit || 5), 50);
  
    try {
      const result = await pool.query(
        `
        SELECT 
          wt.coins,
          wt.type,
          wt.source,
          wt.note,
          wt.created_at,
          wt.invoice_number,
          u.username AS invoice_user
        FROM wallet_transactions wt
        LEFT JOIN order_history oh
          ON oh.invoice_number = wt.invoice_number
        LEFT JOIN users u
          ON u.id = oh.user_id
        WHERE wt.user_id = $1
        ORDER BY wt.created_at DESC
        LIMIT $2
        `,
        [userId, limit]
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching wallet history:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
router.get('/health', async(req, res) => {
  res.status(200).json({message: "success"})
});

  // server/routes/referrals.js
router.get("/tree", async (req, res) => {
  const focusUserId = Number(req.query.rootUserId || req.user.id);
  const includeParent = String(req.query.includeParent || "0") === "1";
  const withCoins = String(req.query.withCoins || "0") === "1";

  const SOURCES = ['referral_commission','referral-bonus','referral']; // tweak if needed

  const colExists = async (table, column) => {
    const q = `
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
      LIMIT 1
    `;
    const r = await pool.query(q, [table, column]);
    return r.rowCount > 0;
  };

  try {
    // 1) Figure out root (parent if requested)
    const { rows: focusRows } = await pool.query(
      `SELECT id, username, referrer_id FROM users WHERE id = $1`,
      [focusUserId]
    );
    if (focusRows.length === 0) return res.json(null);

    const focus = focusRows[0];
    const rootId = includeParent && focus.referrer_id ? focus.referrer_id : focusUserId;

    // 2) Build the referral tree from root
    const treeSql = `
      WITH RECURSIVE referral_tree AS (
        SELECT id, username, referrer_id
        FROM users
        WHERE id = $1
        UNION ALL
        SELECT u.id, u.username, u.referrer_id
        FROM users u
        JOIN referral_tree rt ON u.referrer_id = rt.id
      )
      SELECT id, username, referrer_id FROM referral_tree;
    `;
    const { rows } = await pool.query(treeSql, [rootId]);

    const byId = new Map(rows.map(r => [r.id, { ...r, children: [] }]));
    rows.forEach(r => {
      if (r.referrer_id && byId.has(r.referrer_id)) {
        byId.get(r.referrer_id).children.push(byId.get(r.id));
      }
    });
    const root = byId.get(rootId);

    const result = { root, focusUserId };

    // 3) Coins generated for the focus user by their direct children
    if (withCoins) {
      const hasMeta = await colExists('wallet_transactions', 'meta');          // JSONB
      const hasChildId = await colExists('wallet_transactions', 'child_id');   // INT
      // If your column is named "remarks" or "note", change this:
      const hasDescription = await colExists('wallet_transactions', 'description'); // TEXT

      let perChild = [];
      if (hasMeta) {
        // JSONB: meta->>'child_id'
        const q = `
          SELECT (meta->>'child_id')::int AS child_id, SUM(coins)::int AS coins
          FROM wallet_transactions
          WHERE user_id = $1
            AND type = 'credit'
            AND source = ANY($2)
            AND meta ? 'child_id'
          GROUP BY 1
        `;
        const { rows: r1 } = await pool.query(q, [focusUserId, SOURCES]);
        perChild = r1;
      } else if (hasChildId) {
        // Dedicated child_id column
        const q = `
          SELECT child_id::int AS child_id, SUM(coins)::int AS coins
          FROM wallet_transactions
          WHERE user_id = $1
            AND type = 'credit'
            AND source = ANY($2)
            AND child_id IS NOT NULL
          GROUP BY 1
        `;
        const { rows: r2 } = await pool.query(q, [focusUserId, SOURCES]);
        perChild = r2;
      } else if (hasDescription) {
        // Parse "child_id=123" from a text column with regex
        const q = `
          SELECT (regexp_matches(description, 'child_id=(\\d+)', 'i'))[1]::int AS child_id,
                 SUM(coins)::int AS coins
          FROM wallet_transactions
          WHERE user_id = $1
            AND type = 'credit'
            AND source = ANY($2)
            AND description ~* 'child_id=\\d+'
          GROUP BY 1
        `;
        const { rows: r3 } = await pool.query(q, [focusUserId, SOURCES]);
        perChild = r3;
      } else {
        // No way to attribute per child → only total from referral credits
        const q = `
          SELECT COALESCE(SUM(coins),0)::int AS total
          FROM wallet_transactions
          WHERE user_id = $1
            AND type = 'credit'
            AND source = ANY($2)
        `;
        const { rows: r4 } = await pool.query(q, [focusUserId, SOURCES]);
        result.coins = { totalFromChildren: Number(r4[0]?.total || 0), perChild: [] };
        return res.json(result);
      }

      const totalFromChildren = perChild.reduce((a, b) => a + Number(b.coins || 0), 0);
      result.coins = { totalFromChildren, perChild };
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/referral-branch  → parent -> you -> your direct children (no siblings/grandchildren)
// routes/referrals.js (Router mounted at /api)
router.get('/referral-branch', async (req, res) => {
  try {
    const focusUserId =
      Number(req.query.focusUserId) ||
      (req.user && Number(req.user.id));

    if (!focusUserId) {
      return res.status(400).json({ error: 'focusUserId is required' });
    }

    // You
    const meQ = await pool.query(
      'SELECT id, username, referrer_id, mobile_number, wallet FROM users WHERE id = $1',
      [focusUserId]
    );
    const me = meQ.rows[0];
    if (!me) return res.status(404).json({ error: 'User not found' });

    // Parent
    let parent = null;
    if (me.referrer_id) {
      const pQ = await pool.query(
        'SELECT id, username, referrer_id, mobile_number, wallet FROM users WHERE id = $1',
        [me.referrer_id]
      );
      parent = pQ.rows[0] || null;
    }

    // Children (level 2)
    const kidsQ = await pool.query(
      'SELECT id, username, referrer_id, mobile_number, wallet FROM users WHERE referrer_id = $1',
      [focusUserId]
    );
    const children = kidsQ.rows.map(c => ({ ...c, children: [] }));

    // Grandchildren (level 3) — children of my children
    if (children.length) {
      const childIds = children.map(c => c.id);
      const gcQ = await pool.query(
        'SELECT id, username, referrer_id, mobile_number, wallet FROM users WHERE referrer_id = ANY($1::int[])',
        [childIds]
      );
      const byParent = new Map(); // referrer_id -> []
      gcQ.rows.forEach(gc => {
        const arr = byParent.get(gc.referrer_id) || [];
        arr.push({ ...gc, children: [] }); // we stop at level 3
        byParent.set(gc.referrer_id, arr);
      });
      // attach to each child
      children.forEach(c => {
        c.children = byParent.get(c.id) || [];
      });
    }

    const youNode = {
      id: me.id,
      username: me.username,
      referrer_id: me.referrer_id,
      mobile_number: me.mobile_number,
      wallet: me.wallet,
      children
    };

    const root = parent
      ? {
          id: parent.id,
          username: parent.username,
          referrer_id: parent.referrer_id,
          mobile_number: parent.mobile_number,
          wallet: parent.wallet,
          children: [youNode] // no siblings
        }
      : youNode;

    return res.json(root);
  } catch (err) {
    console.error('Error building referral branch:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// GET /api/referral-tree  (same as admin app)
router.get('/referral-tree', async (req, res) => {
  try {
    // If your customer API is protected, uncomment the token read & pass header check
    // const user = req.user; // from your auth middleware, if any

    const result = await pool.query(
      'SELECT id, username, referrer_id, mobile_number, wallet FROM users'
    );
    const users = result.rows;

    // Build map of users by id
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, { ...u, children: [] }));

    let root = null;

    // Build tree structure (single "Company" root expected)
    users.forEach(user => {
      if (user.referrer_id) {
        const parent = userMap.get(user.referrer_id);
        if (parent) parent.children.push(userMap.get(user.id));
      } else {
        // user with no referrer_id is the root
        root = userMap.get(user.id);
      }
    });

    res.json(root);
  } catch (err) {
    console.error('Error building referral tree:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // GET /api/metal-rate?metal=silver&purity=999
  router.get("/metal-rate", async (req, res) => {
    try {
      const { metal, purity } = req.query;
  
      if (!metal) {
        return res.status(400).json({ error: "Query param 'metal' is required" });
      }
  
      const result = await pool.query(
        `
        SELECT price_inr, metal_type, purity, fetched_at
        FROM metal_prices
        WHERE LOWER(metal_type) = LOWER($1)
          AND ($2::text IS NULL OR purity = $2)
        ORDER BY fetched_at DESC
        LIMIT 1
        `,
        [metal, purity || null]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No metal rate found" });
      }
  
      return res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching metal rate:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  // ------------------------------------------------------------------
// GET /api/products/taxonomy
// Returns productTypes, categoriesByType, subCategoriesByCategory,
// plus distinct purities & stoneTypes from products table.
// No counts. Safe to call from your Filter component.
// ------------------------------------------------------------------
let _taxonomyCache = null;
let _taxonomyCacheTs = 0;
const TAXONOMY_TTL_MS = 5 * 60 * 1000; // 5 min cache (optional)

router.get("/taxonomy", async (req, res) => {
  try {
    if (_taxonomyCache && Date.now() - _taxonomyCacheTs < TAXONOMY_TTL_MS) {
      return res.json(_taxonomyCache);
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

    // If you keep purities/stone_type on products, expose them too (optional)
    const puritiesQ = await pool.query(`
      SELECT DISTINCT TRIM(purity) AS label
      FROM products
      WHERE purity IS NOT NULL AND TRIM(purity) <> ''
      ORDER BY label DESC
    `);

    const stoneTypesQ = await pool.query(`
      SELECT DISTINCT TRIM(stone_type) AS label
      FROM products
      WHERE stone_type IS NOT NULL AND TRIM(stone_type) <> ''
      ORDER BY label
    `);

    // Build productTypes -> [{id,label}]
    const productTypes = typesQ.rows.map((r) => ({ id: r.id, label: r.name }));

    // Build categoriesByType: { [typeLabel]: [{id,label}] }
    const categoriesByType = {};
    for (const t of productTypes) categoriesByType[t.label] = [];
    for (const c of catsQ.rows) {
      (categoriesByType[c.type_name] ??= []).push({ id: c.id, label: c.name });
    }

    // Build subCategoriesByCategory keyed by category label (merge duplicates across types)
    const subsByCatId = subsQ.rows.reduce((acc, s) => {
      (acc[s.category_id] ??= []).push({ id: s.id, label: s.name });
      return acc;
    }, {});
    const subCategoriesByCategory = {};
    for (const c of catsQ.rows) {
      if (!subCategoriesByCategory[c.name]) {
        subCategoriesByCategory[c.name] = (subsByCatId[c.id] || []).map((s) => ({
          label: s.label,
        }));
      }
    }

    const purities = puritiesQ.rows.map((r) => ({ label: r.label }));
    const stoneTypes = stoneTypesQ.rows.map((r) => ({ label: r.label }));

    const payload = {
      productTypes,                // [{ id, label }]
      categoriesByType,            // { [typeLabel]: [{ id, label }] }
      subCategoriesByCategory,     // { [categoryLabel]: [{ label }] }
      purities,                    // [{ label }]
      stoneTypes,                  // [{ label }]
    };

    _taxonomyCache = payload;
    _taxonomyCacheTs = Date.now();

    res.json(payload);
  } catch (err) {
    console.error("GET /api/products/taxonomy failed:", err);
    res.status(500).json({ error: "Failed to load taxonomy" });
  }
});


router.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Product + joined names
    const { rows } = await pool.query(
      `
      SELECT
        p.*,
        pt.name  AS type_name,
        pc.name  AS category_name,
        spc.name AS sub_category_name
      FROM products p
      LEFT JOIN product_types pt            ON pt.id  = p.type_id
      LEFT JOIN product_categories pc       ON pc.id  = p.category_id
      LEFT JOIN sub_product_categories spc  ON spc.id = p.sub_category_id
      WHERE p.id = $1
      `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const row = rows[0];

    // 2) Price per gram lookup (use metal_type first, then fallback to type_name)
    const metalTypeRaw = (row.metal_type || row.type_name || "").trim();
    const purityRaw    = (row.purity || "").trim();

    // Normalize purity "22K" vs "22" vs "999" etc.
    // We match either exact (case-insensitive) or "remove 'k'" forms.
    const metalRes = await pool.query(
      `
      SELECT price_inr
      FROM metal_prices
      WHERE LOWER(metal_type) = LOWER($1)
        AND (
             LOWER(purity) = LOWER($2)
          OR REPLACE(LOWER(purity), 'k', '') = REPLACE(LOWER($2), 'k', '')
        )
      ORDER BY fetched_at DESC
      LIMIT 1
      `,
      [metalTypeRaw, purityRaw]
    );

    const pricePerGram = Number(metalRes.rows[0]?.price_inr || 0);

    // 3) Breakdown (includes making charges)
    const netWeight      = Number(row.net_weight ?? 0);
    const stonePrice     = Number(row.stone_price ?? 0);
    const makingCharges  = Number(row.making_charges ?? row.making_charger ?? 0);

    const metalAmount = netWeight * pricePerGram;
    const subtotal    = metalAmount + stonePrice + makingCharges;
    const gst         = subtotal * 0.03;
    const finalPrice  = subtotal + gst;

    // 4) Attach computed fields to response
    row.metal_price_per_gram = Number(pricePerGram.toFixed(2));
    row.metal_amount         = Number(metalAmount.toFixed(2));
    row.stone_amount         = Number(stonePrice.toFixed(2));
    row.making_charges_amt   = Number(makingCharges.toFixed(2));
    row.subtotal             = Number(subtotal.toFixed(2));
    row.gst_amount           = Number(gst.toFixed(2));
    row.final_price          = Number(finalPrice.toFixed(2));

    // 5) Normalize image URLs
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const toPublic = (u) => {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;
      return `${base}/${String(u).replace(/^\/+/, "")}`;
    };

    let images = [];
    const raw = row.image_urls;

    if (Array.isArray(raw)) {
      images = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        images = trimmed
          .slice(1, -1)
          .split(",")
          .map((s) => s.replace(/^"(.*)"$/, "$1").trim())
          .filter(Boolean);
      } else if (trimmed.includes(",")) {
        images = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        images = [trimmed];
      }
    }

    row.images = Array.from(new Set(images.map(toPublic).filter(Boolean)));

    res.json(row);
  } catch (err) {
    console.error("🔥 GET /api/products/:id failed:", err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

/**
 * GET /api/order-history/my?page=&limit=
 * Returns paginated orders for the logged-in user from order_history
 */
router.get("/order-history/my", async (req, res) => {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 5))); // default 5, max 50
  const offset = (page - 1) * limit;

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM order_history
        WHERE user_id = $1`,
      [userId]
    );
    const total = totalRes.rows[0]?.total || 0;

    const ordersRes = await pool.query(
      `
      SELECT
        oh.id,
        oh.invoice_number,
        oh.subtotal,
        oh.created_at,
        oh.shop_id,
        (
          SELECT COUNT(*)::int
          FROM order_items oi
          WHERE oi.order_id = oh.id
        ) AS items_count
      FROM order_history oh
      WHERE oh.user_id = $1
      ORDER BY oh.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );
    

    return res.json({
      orders: ordersRes.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("GET /api/order-history/my error:", err);
    return res.status(500).json({ error: "Failed to load orders" });
  }
});




// GET /api/products/:id/related?limit=20
router.get("/products/:id/related", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const { rows } = await pool.query(
      `
      WITH cur AS (
        SELECT COALESCE(labels, ARRAY[]::text[]) AS labels
        FROM products
        WHERE id = $1
      )
      SELECT
        p.id,
        p.name,
        p.purity,
        p.net_weight,
        p.stone_price,
        p.making_charges,
        p.image_urls,
        pt.name AS type_name,

        /* Count overlap between p.labels and cur.labels */
        (
          SELECT COUNT(*)
          FROM unnest(COALESCE(p.labels, ARRAY[]::text[])) AS l(lbl)
          WHERE l.lbl = ANY(
            ARRAY(
              SELECT unnest(c.labels)
              FROM cur c
            )
          )
        ) AS label_hits,

        /* Latest metal price per gram for the product's metal+pct */
        (
          SELECT mp.price_inr
          FROM metal_prices mp
          WHERE LOWER(mp.metal_type) = LOWER(pt.name)
            AND LOWER(mp.purity)     = LOWER(p.purity)
          ORDER BY mp.fetched_at DESC
          LIMIT 1
        ) AS price_per_gram

      FROM products p
      LEFT JOIN product_types pt ON pt.id = p.type_id
      WHERE p.id <> $1
      ORDER BY label_hits DESC, RANDOM()
      LIMIT $2
      `,
      [id, limit]
    );

    // Build absolute image URLs + compute price like the PDP route
    const base =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const toPublic = (u) => {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;
      return `${base}/${String(u).replace(/^\/+/, "")}`;
    };

    const out = rows.map((r) => {
      // Parse images from text[] or string
      let images = [];
      const raw = r.image_urls;
      if (Array.isArray(raw)) images = raw;
      else if (typeof raw === "string" && raw.trim()) {
        const s = raw.trim();
        if (s.startsWith("{") && s.endsWith("}")) {
          images = s
            .slice(1, -1)
            .split(",")
            .map((x) => x.replace(/^"(.*)"$/, "$1").trim())
            .filter(Boolean);
        } else if (s.includes(",")) {
          images = s.split(",").map((x) => x.trim()).filter(Boolean);
        } else {
          images = [s];
        }
      }
      images = Array.from(new Set(images.map(toPublic).filter(Boolean)));

      const pricePerGram = Number(r.price_per_gram || 0);
      const netWeight    = Number(r.net_weight || 0);
      const stonePrice   = Number(r.stone_price || 0);
      const making       = Number(r.making_charges || 0);

      const subtotal = netWeight * pricePerGram + stonePrice + making;
      const gst      = subtotal * 0.03;
      const final    = subtotal + gst;

      return {
        id: r.id,
        name: r.name,
        type_name: r.type_name,
        final_price: final.toFixed(2),
        images,
        frontImg: images[0] || null,
        backImg: images[1] || images[0] || null,
      };
    });

    res.json(out);
  } catch (err) {
    console.error("GET /api/products/:id/related failed:", err);
    res.status(500).json({ error: "Failed to load related products" });
  }
});

// ... your existing product routes here (list, details, etc.)
module.exports = router;