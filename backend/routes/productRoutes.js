const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");

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

const mapStoreRow = (row) => ({
  id: row.id,
  shopName: row.shop_name || "Store",
  address: row.address || "",
  stateName: row.state_name || "",
  pincode: row.pincode || null,
  code: row.code || null,
});

router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        pt.name                                  AS product_type,
        p.image_urls[1]                          AS image_url,

        COALESCE(mp.price_inr, 0)                AS metal_rate,

        -- metal value (based on purity + latest rate)
        (COALESCE(p.net_weight, 0) * COALESCE(mp.price_inr, 0)) AS metal_value,

        -- vadd amount = metal_value * (vadd%)
        (
          (COALESCE(p.net_weight, 0) * COALESCE(mp.price_inr, 0))
          * (COALESCE(p.vadd, 0) / 100.0)
        ) AS vadd_amount,

        -- ✅ final price rounded to whole rupees (no decimals)
        ROUND(
          (COALESCE(p.net_weight, 0) * COALESCE(mp.price_inr, 0))
          + (
              (COALESCE(p.net_weight, 0) * COALESCE(mp.price_inr, 0))
              * (COALESCE(p.vadd, 0) / 100.0)
            )
          + COALESCE(p.stone_price, 0)
        ) AS final_price

      FROM products p
      JOIN product_types pt
        ON pt.id = p.type_id

      LEFT JOIN LATERAL (
        SELECT price_inr
        FROM metal_prices
        WHERE LOWER(metal_type) = LOWER(pt.name)
          AND purity = p.purity
        ORDER BY fetched_at DESC
        LIMIT 1
      ) mp ON TRUE

      ORDER BY p.name
    `);

    // inside router.get("/products", async (req, res) => { ... })

    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

    // where uploads are served publicly (your nginx already supports /uploads)
    const uploadsPublic = (process.env.UPLOADS_PUBLIC || "/uploads").replace(/\/+$/, "");

    const toPublic = (u) => {
      if (!u) return null;
      if (/^https?:\/\//i.test(u)) return u;

      // normalize: remove any leading slashes
      let path = String(u).replace(/^\/+/, "");

      // normalize: if DB stored "uploads/xxx" OR "/uploads/xxx", keep it as "/uploads/xxx"
      if (path.startsWith("uploads/")) path = path; // ok
      else if (!path.startsWith("uploads/")) path = `uploads/${path}`;

      return `${base}${uploadsPublic}/${path.replace(/^uploads\//, "")}`;
    };

    const productsWithFullImgUrl = result.rows.map((product) => ({
      ...product,
      // product.image_url comes from p.image_urls[1]
      frontImg: toPublic(product.image_url),
      backImg: toPublic(product.image_url),
    }));

    res.json(productsWithFullImgUrl);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/stores", async (req, res) => {
  const search = String(req.query.search || "").trim();

  try {
    let result;

    if (search) {
      const fuzzyPattern = `%${search.replace(/\s+/g, "%")}%`;
      const prefixPattern = `${search}%`;

      result = await pool.query(
        `
          SELECT id, shop_name, address, state_name, code, pincode
          FROM shops
          WHERE COALESCE(shop_name, '') ILIKE $1
             OR COALESCE(address, '') ILIKE $1
             OR COALESCE(state_name, '') ILIKE $1
          ORDER BY
            CASE
              WHEN COALESCE(shop_name, '') ILIKE $2 THEN 0
              WHEN COALESCE(address, '') ILIKE $2 THEN 1
              WHEN COALESCE(state_name, '') ILIKE $2 THEN 2
              ELSE 3
            END,
            shop_name ASC,
            id ASC
        `,
        [fuzzyPattern, prefixPattern]
      );
    } else {
      result = await pool.query(
        `
          SELECT id, shop_name, address, state_name, code, pincode
          FROM shops
          ORDER BY shop_name ASC, id ASC
        `
      );
    }

    return res.json({ stores: result.rows.map(mapStoreRow) });
  } catch (err) {
    console.error("Error fetching stores:", err);
    return res.status(500).json({ error: "Internal Server Error" });
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
    const { userId, storeId, products } = req.body;
  
    if (!userId || !storeId || !products || products.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    const orderId = `ORD-${Date.now()}`;
    const orderStatus = "Pending";
  
    try {
      const storeResult = await pool.query(
        `SELECT id, shop_name, address, pincode FROM shops WHERE id = $1 LIMIT 1`,
        [storeId]
      );

      if (storeResult.rows.length === 0) {
        return res.status(404).json({ error: "Selected store not found" });
      }

      const selectedStore = storeResult.rows[0];

      await pool.query(
        `INSERT INTO customer_orders (user_id, order_id, store_id, pincode, products, order_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          orderId,
          storeId,
          selectedStore.pincode || "",
          JSON.stringify(products),
          orderStatus,
        ]
      );
  
      return res.json({
        success: true,
        message: "Order placed successfully",
        orderId,
        store: mapStoreRow(selectedStore),
      });
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

// GET /api/referral-branch  → you -> your children -> your grandchildren
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

    return res.json(youNode);
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

    // 2) Latest metal rate lookup (same matching logic)
    const metalTypeRaw = (row.metal_type || row.type_name || "").trim();
    const purityRaw = (row.purity || "").trim();

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

    // 3) ✅ Latest breakdown (VADD only)
    const netWeight = Number(row.net_weight ?? 0);
    const stonePrice = Number(row.stone_price ?? 0);
    const vaddPct = Number(row.vadd ?? 0);

    const metalAmount = netWeight * pricePerGram;
    const vaddAmount = (metalAmount * vaddPct) / 100;

    // ✅ final = metal + vadd (+ stone if you want it included)
    const subtotal = metalAmount + vaddAmount + stonePrice;

    // ✅ Rounded to whole rupees (no decimals anywhere)
    const finalPrice = Math.round(subtotal);

    // 4) Attach computed fields to response (keep names consistent)
    row.metal_rate = pricePerGram;                 // to match /products route naming
    row.metal_price_per_gram = pricePerGram;       // keep old field too if UI uses it
    row.metal_amount = metalAmount;
    row.vadd_amount = vaddAmount;
    row.stone_amount = stonePrice;
    row.subtotal = subtotal;
    row.final_price = finalPrice;

    // old fields set to 0 to avoid UI confusion if referenced
    row.making_charges_amt = 0;
    row.gst_amount = 0;

    // 5) Normalize image URLs
    const base =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

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

/**
 * GET /api/order-history/my/:invoiceNumber
 * Returns invoice header + items for the logged-in user only
 */
router.get("/order-history/my/:invoiceNumber", async (req, res) => {
  const userId = getUserIdFromToken(req);
  const invoiceNumber = String(req.params.invoiceNumber || "").trim();

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!invoiceNumber) return res.status(400).json({ error: "invoiceNumber is required" });

  try {
    const headRes = await pool.query(
      `SELECT oh.*
         FROM order_history oh
        WHERE oh.invoice_number = $1
          AND oh.user_id = $2
        LIMIT 1`,
      [invoiceNumber, userId]
    );

    if (!headRes.rowCount) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const invoice = headRes.rows[0];

    const userRes = await pool.query(
      `SELECT id, username, email, mobile_number, address, state
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );

    const itemsRes = await pool.query(
      `SELECT oi.*
         FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.id ASC`,
      [invoice.id]
    );

    const items = itemsRes.rows || [];

    const calc = items.reduce(
      (acc, it) => {
        const lineSubtotal = Number(it.line_subtotal ?? 0);
        const lineTax = Number(it.line_tax ?? 0);
        const lineTotal =
          Number(it.line_total ?? 0) || Number((lineSubtotal + lineTax).toFixed(2));

        acc.subtotal += lineSubtotal;
        acc.gst += lineTax;
        acc.total += lineTotal;
        return acc;
      },
      { subtotal: 0, gst: 0, total: 0 }
    );

    const commissionRes = await pool.query(
      `SELECT
         wt.id,
         wt.user_id,
         wt.coins,
         wt.type,
         wt.source,
         wt.note,
         wt.billing_user,
         wt.created_at,
         u.username
       FROM wallet_transactions wt
       LEFT JOIN users u ON u.id = wt.user_id
       WHERE wt.invoice_number = $1
         AND wt.user_id = $2
       ORDER BY wt.created_at ASC, wt.id ASC`,
      [invoiceNumber, userId]
    );

    const commissionRows = commissionRes.rows || [];
    const commissionSummary = commissionRows.reduce(
      (acc, r) => {
        const coins = Number(r.coins || 0);
        if ((r.type || "").toLowerCase() === "credit") acc.credited_coins += coins;
        if ((r.type || "").toLowerCase() === "debit") acc.debited_coins += coins;
        return acc;
      },
      { credited_coins: 0, debited_coins: 0 }
    );

    return res.json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        created_at: invoice.created_at,
        payment_mode: invoice.payment_mode || null,
        payment_note: invoice.payment_note || null,
        subtotal: Number(invoice.subtotal ?? calc.subtotal ?? 0),
        seller_shop_name: invoice.seller_shop_name || null,
        seller_address: invoice.seller_address || null,
        seller_gstin: invoice.seller_gstin || null,
        seller_state_name: invoice.seller_state_name || null,
        seller_state_code: invoice.seller_state_code || null,
        seller_email: invoice.seller_email || null,
        seller_phone: invoice.seller_phone || null,
      },
      customer: userRes.rows[0] || null,
      items,
      totals: {
        subtotal: Number((calc.subtotal || invoice.subtotal || 0).toFixed(2)),
        gst: Number((calc.gst || 0).toFixed(2)),
        total: Number((calc.total || invoice.subtotal || 0).toFixed(2)),
      },
      commission: {
        summary: {
          credited_coins: Number(commissionSummary.credited_coins.toFixed(2)),
          debited_coins: Number(commissionSummary.debited_coins.toFixed(2)),
          net_coins: Number(
            (commissionSummary.credited_coins - commissionSummary.debited_coins).toFixed(2)
          ),
        },
        rows: commissionRows,
      },
    });
  } catch (err) {
    console.error("GET /api/order-history/my/:invoiceNumber error:", err);
    return res.status(500).json({ error: "Failed to load invoice details" });
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
        p.vadd,
        p.image_urls,
        pt.name AS type_name,

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

        (
          SELECT mp.price_inr
          FROM metal_prices mp
          WHERE LOWER(mp.metal_type) = LOWER(pt.name)
            AND (
                 LOWER(mp.purity) = LOWER(p.purity)
              OR REPLACE(LOWER(mp.purity), 'k', '') = REPLACE(LOWER(p.purity), 'k', '')
            )
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
      const netWeight = Number(r.net_weight || 0);
      const stonePrice = Number(r.stone_price || 0);
      const vaddPct = Number(r.vadd || 0);

      const metalAmount = netWeight * pricePerGram;
      const vaddAmount = (metalAmount * vaddPct) / 100;

      // ✅ latest formula (NO GST, NO making charges) + whole rupees
      const final = Math.round(metalAmount + stonePrice + vaddAmount);

      return {
        id: r.id,
        name: r.name,
        type_name: r.type_name,
        final_price: final, // ✅ number, no decimals
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

// GET /api/referrals/level-commission/:userId
// returns: [{ level: 1, coins: 200, tx_count: 3 }, ...]
// GET /api/referrals/level-commission/:userId
router.get("/referrals/level-commission/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  const client = await pool.connect();
  try {
    const sql = `
      WITH RECURSIVE downline AS (
        SELECT id, username, 1 AS level
        FROM users
        WHERE referrer_id = $1

        UNION ALL

        SELECT u.id, u.username, d.level + 1
        FROM users u
        JOIN downline d ON u.referrer_id = d.id
        WHERE d.level < 20
      )
      SELECT
        d.level,
        COALESCE(SUM(wt.coins), 0) AS coins,
        COUNT(*) AS tx_count
      FROM wallet_transactions wt
      JOIN order_history oh
        ON oh.invoice_number = wt.invoice_number
      JOIN downline d
        ON d.id = oh.user_id
      WHERE wt.user_id = $1
        AND COALESCE(wt.coins, 0) > 0
        AND LOWER(COALESCE(wt.source, '')) IN ('referral', 'referral-edit', 'return-recalc')
      GROUP BY d.level
      ORDER BY d.level;
    `;

    const { rows } = await client.query(sql, [userId]);

    let best = null;
    for (const r of rows) {
      const c = Number(r.coins || 0);
      if (!best || c > Number(best.coins || 0)) best = r;
    }

    res.json({
      levels: rows,
      best_level: best?.level ?? null,
      best_coins: best?.coins ?? 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch level-wise commissions" });
  } finally {
    client.release();
  }
});

router.get("/referrals/level-commission-excel/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  const client = await pool.connect();
  try {
    /**
     * Logic:
     * - downline: builds referral tree under current user, assigns each downline user a level
     * - wallet_transactions: coins credited to current user (wt.user_id = $1) from referral sources
     * - order_history: invoice details (invoice_number -> who purchased, subtotal, payment mode)
     * - join downline with order_history.user_id to get level
     */
    const sql = `
      WITH RECURSIVE downline AS (
        SELECT id, username, 1 AS level
        FROM users
        WHERE referrer_id = $1

        UNION ALL

        SELECT u.id, u.username, d.level + 1
        FROM users u
        JOIN downline d ON u.referrer_id = d.id
        WHERE d.level < 20
      )
      SELECT
        d.level,
        wt.invoice_number,
        oh.user_id AS invoice_user_id,
        u.username AS invoice_username,
        COALESCE(wt.coins, 0) AS coins,
        COALESCE(wt.source, '') AS source,
        wt.created_at AS commission_created_at,
        oh.subtotal,
        oh.payment_mode,
        oh.created_at AS invoice_created_at
      FROM wallet_transactions wt
      JOIN order_history oh
        ON oh.invoice_number = wt.invoice_number
      JOIN downline d
        ON d.id = oh.user_id
      LEFT JOIN users u
        ON u.id = oh.user_id
      WHERE wt.user_id = $1
        AND COALESCE(wt.coins, 0) > 0
        AND LOWER(COALESCE(wt.source, '')) IN ('referral', 'referral-edit', 'return-recalc')
      ORDER BY d.level, wt.created_at DESC, wt.invoice_number;
    `;

    const { rows } = await client.query(sql, [userId]);

    // Create workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Referral Commissions");

    ws.columns = [
      { header: "Level", key: "level", width: 10 },
      { header: "Invoice Number", key: "invoice_number", width: 22 },
      { header: "Invoice User", key: "invoice_username", width: 22 },
      { header: "Coins", key: "coins", width: 12 },
      { header: "Source", key: "source", width: 16 },
      { header: "Commission Date", key: "commission_created_at", width: 22 },
      { header: "Invoice Subtotal", key: "subtotal", width: 16 },
      { header: "Payment Mode", key: "payment_mode", width: 14 },
      { header: "Invoice Date", key: "invoice_created_at", width: 22 },
    ];

    // Header style
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: "middle", horizontal: "left" };

    // Rows
    for (const r of rows) {
      ws.addRow({
        level: r.level,
        invoice_number: r.invoice_number,
        invoice_username: r.invoice_username || "",
        coins: Number(r.coins || 0),
        source: r.source || "",
        commission_created_at: r.commission_created_at
          ? new Date(r.commission_created_at)
          : "",
        subtotal: r.subtotal != null ? Number(r.subtotal) : "",
        payment_mode: r.payment_mode || "",
        invoice_created_at: r.invoice_created_at ? new Date(r.invoice_created_at) : "",
      });
    }

    // Number formats
    ws.getColumn("coins").numFmt = "0.00";
    ws.getColumn("subtotal").numFmt = "0.00";
    ws.getColumn("commission_created_at").numFmt = "yyyy-mm-dd hh:mm";
    ws.getColumn("invoice_created_at").numFmt = "yyyy-mm-dd hh:mm";

    // Send as file
    const filename = `level_commission_invoices_user_${userId}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to download referral commission report" });
  } finally {
    client.release();
  }
});


// ... your existing product routes here (list, details, etc.)
module.exports = router;
