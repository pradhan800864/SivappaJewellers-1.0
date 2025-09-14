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





module.exports = router;