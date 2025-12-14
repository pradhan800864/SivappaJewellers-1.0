#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();
const { Pool } = require('pg');
const { randomInt } = require('crypto');

/* ---------- SAME connection logic as your SQL runner ---------- */
function pick(...vals) { for (const v of vals) if (v !== undefined && v !== null && `${v}`.trim() !== '') return v; }
function resolveSsl() {
  const mode = (process.env.PGSSLMODE || '').toLowerCase();
  const flag = (process.env.PGSSL || '').toLowerCase();
  if (['require', 'verify-ca', 'verify-full'].includes(mode)) return { rejectUnauthorized: mode !== 'require' };
  if (['true', '1', 'require'].includes(flag)) return { rejectUnauthorized: false };
  return false;
}
function coercePassword(pw) { if (pw === undefined || pw === null || `${pw}`.trim() === '') return undefined; return String(pw); }

const connectionString = pick(process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_CONNECTION);
const ssl = resolveSsl();
const discreteCfg = {
  host: pick(process.env.DB_HOST, process.env.PGHOST, 'localhost'),
  port: Number(pick(process.env.DB_PORT, process.env.PGPORT, 5432)),
  user: pick(process.env.DB_USER, process.env.PGUSER),
  password: coercePassword(pick(process.env.DB_PASS, process.env.DB_PASSWORD, process.env.PGPASSWORD)),
  database: pick(process.env.DB_NAME, process.env.PGDATABASE),
  ssl,
};
const pool = connectionString ? new Pool({ connectionString, ssl }) : new Pool(discreteCfg);
const printCfg = () =>
  console.log('→ DB config:', connectionString ? { connectionString: '(redacted)', ssl: !!ssl } : { host: discreteCfg.host, port: discreteCfg.port, user: discreteCfg.user, database: discreteCfg.database, ssl: !!ssl });

/* ---------- SAFE random helpers (no crashes on empty arrays) ---------- */
const safeRandomInt = (min, maxExclusive) => {
  // If invalid bounds, return min to avoid throw
  if (!(Number.isFinite(min) && Number.isFinite(maxExclusive)) || maxExclusive <= min) return min;
  return randomInt(min, maxExclusive);
};
const choice = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr[safeRandomInt(0, arr.length)];
};
const chance = (p) => Math.random() < p;
const fixed = (n, d = 2) => Number(n).toFixed(d);
const amt = (min, max, d = 2) => fixed(min + Math.random() * Math.max(0, max - min), d);
const wordsSrc = ['Premium','Classic','Elegant','Regal','Heritage','Temple','Modern','Aura','Royal','Nova','Luxe','Ornate','Floral','Orbit','Ace','Charm','Glow','Shine','Twirl','Zen'];
const words = (n) => Array.from({ length: n }, () => choice(wordsSrc) || 'Elite').join(' ');
const paragraph = () => {
  const s = ['Crafted with precision for everyday elegance.','Inspired by traditional motifs and modern aesthetics.','Lightweight design with a premium finish.','Perfect for weddings, festive, and party wear.','Certified quality and hallmark purity.','Designed to stand out with subtle sophistication.','A timeless piece to elevate any outfit.'];
  const count = safeRandomInt(3, 6);
  return Array.from({ length: count }, () => choice(s) || 'Beautiful craftsmanship and quality.').join(' ');
};
const code = () => 'SJ' + Math.random().toString(36).slice(2, 8).toUpperCase();
const pickSome = (arr, max = 3, min = 1) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const a = [...arr].sort(() => Math.random() - 0.5);
  const upper = Math.min(max, a.length);
  const lower = Math.min(min, upper);                // ensure lower <= upper
  const count = upper <= 0 ? 0 : safeRandomInt(lower, upper + 1); // inclusive upper
  return a.slice(0, count);
};

/* ---------- constants ---------- */
const PURITIES = ['18K', '20K', '22K', '24K', '999'];
const HSN_CODES = ['71131120', '71131910', '71131920', '71131130', '71131190'];
const STONES_WEIGHTED = ['Diamond','Diamond','Diamond','Ruby','Emerald','Sapphire'];
const CERTS = ['IGI', 'SGL', 'GIA'];
const SAMPLE_IMAGES = ['/uploads/product-sample-1.jpg','/uploads/product-sample-2.jpg','/uploads/product-sample-3.jpg','/uploads/product-sample-4.jpg','/uploads/product-sample-5.jpg'];

(async () => {
  const target = Number(process.argv[2] || 600);
  console.log(`→ Seeding ${target} products…`);
  printCfg();

  const client = await pool.connect();
  try {
    const types = (await client.query('SELECT id, name FROM product_types')).rows;
    const cats  = (await client.query('SELECT id, type_id, name FROM product_categories')).rows;
    const subs  = (await client.query('SELECT id, category_id, name FROM sub_product_categories')).rows;

    if (!types.length || !cats.length || !subs.length) {
      throw new Error('Seed taxonomy first (types/categories/subcategories are empty).');
    }

    await client.query('BEGIN');

    for (let i = 0; i < target; i++) {
      // Choose a type; fallbacks ensure non-empty choices
      const type = choice(types) || types[0];

      // Choose category for this type; fallback to any category if none match
      let catsForType = cats.filter((c) => c.type_id === type.id);
      if (catsForType.length === 0) catsForType = cats;
      const cat = choice(catsForType) || cats[0];

      // Choose subcategory for this category; fallback to any sub if none match
      let subsForCat = subs.filter((s) => s.category_id === cat.id);
      if (subsForCat.length === 0) subsForCat = subs;
      const sub = choice(subsForCat) || subs[0];

      const isGroup = chance(0.10);
      const hasStones = chance(0.65);

      const purity = choice(PURITIES) || '22K';
      const hsn_code = choice(HSN_CODES) || '71131120';

      // Singles vs Group weights
      const net_weight  = isGroup ? null : amt(1.5, 180, 2);
      const gross_weight = isGroup ? null : amt(Number(net_weight || 0) + 0.05, Number(net_weight || 0) + 15, 2);

      const wastage = chance(0.25) ? amt(0, 8, 2) : '0.00';
      const making_charges = chance(0.10) ? '0.00' : amt(150, 45000, 2);
      const discount = chance(0.15) ? amt(0, 35, 2) : amt(0, 15, 2);
      const gst = '3.00';

      // Stones
      const stone_type = hasStones ? (choice(STONES_WEIGHTED) || 'Diamond') : null;
      const stone_count = hasStones ? safeRandomInt(1, 30) : 0;
      const stone_weight = hasStones ? amt(0.05, 12, 2) : '0.00';
      const stone_certification = hasStones ? (choice(CERTS) || 'IGI') : null;
      const stone_price = hasStones ? amt(500, 15000, 2) : '0.00';

      // Group info
      const group_pieces_count = isGroup ? safeRandomInt(2, 40) : null;
      const group_weight_total = isGroup ? amt(30, 5000, 3) : null;
      const avg_piece_weight   = isGroup && group_pieces_count > 0 ? (Number(group_weight_total) / group_pieces_count).toFixed(3) : null;
      const group_total_price  = isGroup ? amt(30000, 1000000, 2) : null;

      const image_urls = pickSome(SAMPLE_IMAGES, 4, 1);

      // Labels include sub type + weights + purity + stone flags + variety
      const baseLabels = [
        (type.name || 'type').toLowerCase(),
        (cat.name || 'category').toLowerCase(),
        (sub.name || 'sub-unknown').toLowerCase(),
        `nw:${net_weight ?? '-' }g`,
        `gw:${gross_weight ?? '-' }g`,
        `purity:${purity.toLowerCase()}`,
        hasStones ? 'has-stones' : 'plain',
        stone_type ? stone_type.toLowerCase() : 'no-stone',
      ];
      if (stone_type === 'Diamond') baseLabels.push('diamond');
      const extraLabelsPool = ['limited edition','trending','new arrival','festival','bridal','daily wear','lightweight','heavy','temple','antique','premium','budget'];
      const labels = [...new Set([...baseLabels, ...pickSome(extraLabelsPool, 3, 0)])];

      const name = `${type.name} ${cat.name} ${words(1)}`.trim();
      const short_description = `${words(1)} ${cat.name} — ${paragraph().slice(0, 120)}`;
      const full_description = paragraph() + ' ' + paragraph();

      await client.query(
        `
        INSERT INTO products (
          product_code, name, purity, net_weight, gross_weight, wastage, making_charges, discount, gst,
          type_id, category_id, sub_category_id, hsn_code, has_stones,
          stone_type, stone_count, stone_weight, stone_certification,
          image_urls, labels, short_description, full_description,
          stone_price, is_group, group_pieces_count, group_weight_total, avg_piece_weight, group_total_price
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,
          $15,$16,$17,$18,
          $19,$20,$21,$22,
          $23,$24,$25,$26,$27,$28
        )
        ON CONFLICT (product_code) DO NOTHING
        `,
        [
          code(),
          name,
          purity,
          net_weight,
          gross_weight,
          wastage,
          making_charges,
          discount,
          gst,
          type.id,
          cat.id,
          sub.id,
          hsn_code,
          hasStones,
          stone_type,
          stone_count,
          stone_weight,
          stone_certification,
          image_urls,
          labels,
          short_description,
          full_description,
          stone_price,
          isGroup,
          group_pieces_count,
          group_weight_total,
          avg_piece_weight,
          group_total_price,
        ]
      );

      if ((i + 1) % 100 === 0) console.log(`  …inserted ${i + 1}/${target}`);
    }

    await client.query('COMMIT');
    console.log(`✅ Inserted ~${target} products with rich labels & variations.`);
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Seeding failed:', err.message);
  } finally {
    pool.end().catch(() => {});
  }
})();
