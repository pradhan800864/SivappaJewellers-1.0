#!/usr/bin/env node
/* eslint-disable no-console */
// Usage:
//   node utils/runSqlFile.js path/to/file.sql
//   node utils/runSqlFile.js path/to/file.sql --dry
//
// Mirrors backend pg config, fixes "client password must be a string" by coercing
// only when provided, and supports DATABASE_URL/POSTGRES_URL or DB_* / PG* vars.

require('dotenv').config(); // <- match backend behavior if you use .env

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// ---- args ----
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('-')) {
  console.error('Usage: node utils/runSqlFile.js <file.sql> [--dry]');
  process.exit(1);
}
const filePath = path.resolve(process.cwd(), args[0]);
const DRY_RUN = args.includes('--dry');

if (!fs.existsSync(filePath)) {
  console.error(`Error: file not found: ${filePath}`);
  process.exit(1);
}
const sql = fs.readFileSync(filePath, 'utf8');

// detect file-managed transaction
const normalized = sql.replace(/--.*$/gm, '');
const fileManagesTx = /\bBEGIN\b/i.test(normalized) && /\bCOMMIT\b/i.test(normalized);

// ---- build pg config exactly like backend (robust fallbacks) ----
function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && `${v}`.trim() !== '') return v;
  return undefined;
}

const connectionString = pick(
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,         // sometimes used in hosted envs
  process.env.POSTGRES_CONNECTION   // any custom fallback you might have
);

// SSL handling similar to typical backends:
// - PGSSLMODE=require | verify-ca | verify-full -> enable ssl
// - PGSSL=true|1|require -> enable ssl
function resolveSsl() {
  const mode = (process.env.PGSSLMODE || '').toLowerCase();
  const flag = (process.env.PGSSL || '').toLowerCase();
  if (['require', 'verify-ca', 'verify-full'].includes(mode)) {
    return { rejectUnauthorized: mode !== 'require' ? true : false };
  }
  if (['true', '1', 'require'].includes(flag)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const ssl = resolveSsl();

// Coerce password to string ONLY if provided, otherwise leave undefined
function coercePassword(pw) {
  if (pw === undefined || pw === null || `${pw}`.trim() === '') return undefined;
  return String(pw);
}

const discreteCfg = {
  host: pick(process.env.DB_HOST, process.env.PGHOST, 'localhost'),
  port: Number(pick(process.env.DB_PORT, process.env.PGPORT, 5432)),
  user: pick(process.env.DB_USER, process.env.PGUSER),
  password: coercePassword(pick(process.env.DB_PASS, process.env.DB_PASSWORD, process.env.PGPASSWORD)),
  database: pick(process.env.DB_NAME, process.env.PGDATABASE),
  ssl,
};

const client = connectionString
  ? new Client({ connectionString, ssl })
  : new Client(discreteCfg);

// ---- helpers ----
function locatePosition(text, positionStr) {
  const pos = Number(positionStr);
  if (!pos || Number.isNaN(pos)) return null;
  const upto = text.slice(0, pos - 1);
  const lines = upto.split(/\r?\n/);
  return { line: lines.length, col: (lines[lines.length - 1] || '').length + 1 };
}

function redactedConfigSummary() {
  const cfg = connectionString
    ? { connectionString: '(redacted, using DATABASE_URL/POSTGRES_URL)', ssl: !!ssl }
    : {
        host: discreteCfg.host,
        port: discreteCfg.port,
        user: discreteCfg.user,
        database: discreteCfg.database,
        ssl: !!ssl,
      };
  console.log('→ DB config:', cfg);
}

// ---- run ----
(async () => {
  console.log(`→ File: ${filePath}`);
  console.log(`→ Tx mode: ${fileManagesTx ? 'file-managed' : 'wrapped by script'}`);
  console.log(`→ Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
  redactedConfigSummary();

  if (DRY_RUN) {
    console.log('Dry run complete.');
    process.exit(0);
  }

  try {
    await client.connect();

    if (!fileManagesTx) await client.query('BEGIN');
    await client.query(sql);
    if (!fileManagesTx) await client.query('COMMIT');

    console.log('✅ Done.');
    process.exit(0);
  } catch (err) {
    try {
      if (!fileManagesTx) await client.query('ROLLBACK');
    } catch (_) {}
    console.error('❌ Execution failed.');
    if (err.position) {
      const loc = locatePosition(sql, err.position);
      if (loc) {
        console.error(`   at ${path.basename(filePath)}:${loc.line}:${loc.col}`);
        const lines = sql.split(/\r?\n/);
        const context = lines[loc.line - 1];
        if (context != null) console.error(`   > ${context}`);
      }
    }
    console.error(`   ${err.message}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
})();
