#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sivappa Jewellers — Sales Seeder (~700 invoices by default)
 * Usage:
 *   node dbscripts/seedSales.js [COUNT]
 */

require('dotenv').config();
const { Pool } = require('pg');
const { randomInt } = require('crypto');

/* ---------- connection logic (no shell exports needed) ---------- */
function pick(...vals) { for (const v of vals) if (v !== undefined && v !== null && `${v}`.trim() !== '') return v; }
function resolveSsl() {
  const mode = (process.env.PGSSLMODE || '').toLowerCase();
  const flag = (process.env.PGSSL || '').toLowerCase();
  if (['require','verify-ca','verify-full'].includes(mode)) return { rejectUnauthorized: mode !== 'require' };
  if (['true','1','require'].includes(flag)) return { rejectUnauthorized: false };
  return false;
}
function coercePassword(pw) { if (pw === undefined || pw === null || `${pw}`.trim() === '') return undefined; return String(pw); }

// accept many typical env names (whatever your routes use)
const connectionString =
  pick(
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DB_URL,
    process.env.PGURL,
    process.env.PG_URL
  )
  // LAST RESORT fallback so you can just run the script without exports
  || 'postgres://postgres@localhost:5432/gold_ecommerce';

const ssl = resolveSsl();

const discreteCfg = {
  host: pick(process.env.DB_HOST, process.env.PGHOST, 'localhost'),
  port: Number(pick(process.env.DB_PORT, process.env.PGPORT, 5432)),
  user: pick(process.env.DB_USER, process.env.PGUSER, 'postgres'),
  password: coercePassword(pick(process.env.DB_PASS, process.env.DB_PASSWORD, process.env.PGPASSWORD)),
  database: pick(process.env.DB_NAME, process.env.PGDATABASE, 'gold_ecommerce'),
  ssl,
};

const pool = connectionString
  ? new Pool({ connectionString, ssl })
  : new Pool(discreteCfg);

const showCfg = () => {
  console.log('→ DB config:', connectionString
    ? { connectionString: '(redacted)', ssl: !!ssl }
    : { host: discreteCfg.host, port: discreteCfg.port, user: discreteCfg.user, database: discreteCfg.database, ssl: !!ssl });
};

/* ---------- helpers ---------- */
const choice = (arr) => arr.length ? arr[randomInt(0, arr.length)] : undefined;
const chance = (p) => Math.random() < p;
const round2 = (n) => Number(n.toFixed(2));
const now = new Date();

function metalRateFor(typeName = '') {
  const t = typeName.toLowerCase();
  if (t.includes('gold') || t.includes('diamond') || t.includes('antique') || t.includes('imitation')) return randomInt(6500, 10200);
  if (t.includes('platinum')) return randomInt(3500, 5200);
  if (t.includes('silver')) return randomInt(80, 220);
  if (t.includes('gem')) return randomInt(2000, 6000);
  return randomInt(3000, 8000);
}
function betweenDaysAgo(maxDays = 365) {
  const days = randomInt(0, Math.max(1, maxDays));
  const dt = new Date(now.getTime() - days * 24 * 3600 * 1000);
  dt.setHours(randomInt(9, 21), randomInt(0, 60), randomInt(0, 60), 0);
  return dt;
}

(async () => {
  const target = Number(process.argv[2] || 700);
  console.log(`→ Seeding ~${target} invoices...`);
  showCfg();

  const client = await pool.connect();
  try {
    const products = (await client.query(`
      SELECT id, type_id, name, purity,
             COALESCE(NULLIF(net_weight::text,''), NULL)::numeric AS net_weight,
             COALESCE(NULLIF(making_charges::text,''), '0')::numeric AS making_charges,
             COALESCE(NULLIF(discount::text,''), '0')::numeric AS discount_pct,
             COALESCE(NULLIF(gst::text,''), '3')::numeric AS gst_pct,
             COALESCE(NULLIF(stone_price::text,''), '0')::numeric AS stone_price
      FROM products
    `)).rows;
    if (!products.length) throw new Error('No products found. Seed products first.');

    const typeNames = (await client.query('SELECT id, name FROM product_types')).rows;
    const typeNameMap = new Map(typeNames.map(r => [r.id, r.name]));

    let users = [];
    try {
      users = (await client.query('SELECT id FROM users ORDER BY id LIMIT 10000')).rows.map(r => r.id);
    } catch (_) {}
    const userPicker = users.length ? () => users[randomInt(0, users.length)] : () => 1;

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_order_history_invoice_number'
        ) THEN
          CREATE UNIQUE INDEX ux_order_history_invoice_number ON order_history (invoice_number);
        END IF;
      END $$;
    `);

    await client.query('BEGIN');

    for (let i = 0; i < target; i++) {
      const createdAt = betweenDaysAgo(365);
      const invoiceNo = `INV-${createdAt.getFullYear()}-${String(createdAt.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(6,'0')}`;
      const userId = userPicker();
      const status = choice(['Pending','Paid','Cancelled','Refunded','Partially Paid']);
      const payment_mode = choice(['Cash','Card','UPI','Razorpay','BankTransfer']);

      const itemCount = randomInt(1, 6);
      const picked = Array.from({ length: itemCount }, () => products[randomInt(0, products.length)]);

      let subtotal = 0, totalGst = 0, totalDiscount = 0;

      const ohRes = await client.query(
        `INSERT INTO order_history (
           invoice_number, user_id, subtotal, gst, discount, grand_total, status, payment_mode, created_at, updated_at
         ) VALUES ($1,$2,0,0,0,0,$3,$4,$5,$5)
         ON CONFLICT (invoice_number) DO NOTHING
         RETURNING id`,
        [invoiceNo, userId, status, payment_mode, createdAt]
      );
      if (!ohRes.rows.length) continue; // already exists; skip

      const orderId = ohRes.rows[0].id;

      for (const p of picked) {
        const typeName = typeNameMap.get(p.type_id) || '';
        const metalRate = metalRateFor(typeName);
        const qty = randomInt(1, 4);

        const weightPart = (p.net_weight || 0) * metalRate;
        const base = weightPart + Number(p.stone_price || 0) + Number(p.making_charges || 0);

        const discountPct = Number(p.discount_pct || 0);
        const afterDiscount = base * (1 - discountPct / 100);

        const gstPct = Number(p.gst_pct || 0);
        const withGst = afterDiscount * (1 + gstPct / 100);

        const unit_price = round2(Math.max(100, Math.min(withGst, 2_000_000)));
        const line_discount_amount = round2(base * (discountPct / 100));
        const line_gst_amount = round2(afterDiscount * (gstPct / 100));
        const line_total = round2(unit_price * qty);

        subtotal += round2(afterDiscount * qty);
        totalGst += round2(line_gst_amount * qty);
        totalDiscount += round2(line_discount_amount * qty);

        await client.query(
          `INSERT INTO order_items (
             order_id, product_id, quantity, unit_price, gst, discount, line_total
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, p.id, qty, unit_price, line_gst_amount, line_discount_amount, line_total]
        );
      }

      const grand_total = round2(subtotal + totalGst);
      await client.query(
        `UPDATE order_history
           SET subtotal = $1, gst = $2, discount = $3, grand_total = $4, updated_at = $5
         WHERE id = $6`,
        [round2(subtotal), round2(totalGst), round2(totalDiscount), grand_total, new Date(), orderId]
      );

      if ((i+1) % 100 === 0) console.log(`  …inserted invoices: ${i+1}/${target}`);
    }

    await client.query('COMMIT');
    console.log(`✅ Done. Inserted ~${target} invoices with items.`);
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Sales seeding failed:', err.message);
  } finally {
    pool.end().catch(() => {});
  }
})();
