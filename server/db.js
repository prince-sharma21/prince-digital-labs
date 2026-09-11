const { Pool } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");
const config = require("./config");

/**
 * NOTE ON PORTABILITY (see DOCUMENTATION.md):
 * This file used to wrap better-sqlite3 (fully synchronous). It now wraps
 * `pg` (Postgres), which is inherently asynchronous over the network — so
 * every route now does `await db.prepare(sql).get/.all/.run(...)` instead
 * of the old synchronous call. To keep the ~180 call sites elsewhere in
 * the app unchanged in *shape*, this wrapper transparently handles the
 * SQLite -> Postgres differences that would otherwise require touching
 * every query:
 *   - `?` placeholders are auto-translated to Postgres's `$1, $2, ...`
 *   - `datetime('now')` in SQL text is auto-translated to `now()`
 *   - `.run()` still returns `{ lastInsertRowid, changes }` — a
 *     `RETURNING id` clause is auto-appended to plain INSERT statements
 *     so lastInsertRowid keeps working exactly like it did with SQLite
 *   - `db.transaction(fn)` still exists and makes every query inside
 *     `fn` (including ones from statements prepared outside it) run on
 *     one shared client inside BEGIN/COMMIT/ROLLBACK, via AsyncLocalStorage
 *   - `db.pragma()` is a harmless no-op (Postgres always enforces FKs)
 */

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_URL && config.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  // Free-tier Postgres (e.g. Neon) can take a few seconds to "wake up"
  // after being idle — give it real room before giving up, rather than
  // the driver's default of waiting forever on a stalled connection.
  connectionTimeoutMillis: 10000,
});

// Tracks the active transaction client (if any) for the current async
// call chain, so statements prepared elsewhere still join the transaction.
const txContext = new AsyncLocalStorage();

function activeExecutor() {
  return txContext.getStore() || pool;
}

function translateSql(sql) {
  // datetime('now') -> now()  (SQLite -> Postgres time default/expression)
  let out = sql.replace(/datetime\(\s*'now'\s*\)/gi, "now()");

  // Named parameters: @slug, @name, ... (better-sqlite3 style) -> $1, $2, ...
  // Each unique name gets one positional slot; repeats of the same name
  // reuse that same $N (valid in Postgres, and matches better-sqlite3
  // semantics where one bound value can appear in the SQL more than once).
  const namedMatches = out.match(/@[a-zA-Z_][a-zA-Z0-9_]*/g);
  if (namedMatches) {
    const order = [];
    for (const m of namedMatches) {
      const name = m.slice(1);
      if (!order.includes(name)) order.push(name);
    }
    out = out.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => `$${order.indexOf(name) + 1}`);
    return { sql: out, namedOrder: order };
  }

  // Positional parameters: ? -> $1, $2, $3 ...
  let i = 0;
  out = out.replace(/\?/g, () => `$${++i}`);
  return { sql: out, namedOrder: null };
}

// These tables use a primary key that isn't called "id" (or have no
// single-row identity concept useful as lastInsertRowid) — never
// auto-append RETURNING id for inserts into them.
const NO_ID_PK_TABLES = ["site_settings", "sessions", "password_reset_tokens", "blog_post_tags"];

function isPlainInsert(sql) {
  if (!/^\s*INSERT\s+INTO/i.test(sql) || /RETURNING/i.test(sql)) return false;
  const m = sql.match(/^\s*INSERT\s+INTO\s+["`]?(\w+)["`]?/i);
  const table = m ? m[1].toLowerCase() : "";
  return !NO_ID_PK_TABLES.includes(table);
}

function addReturningId(sql) {
  // Safe because every table in this schema that relies on lastInsertRowid
  // uses "id" as its primary key.
  return sql.replace(/;?\s*$/, " RETURNING id;");
}

function toParamsArray(namedOrder, args) {
  if (!namedOrder) return args; // plain positional call, e.g. .get(id) or .run(a, b, c)
  // Named-parameter call: exactly one object argument, e.g. .run({ slug, name, ... })
  const obj = args[0] || {};
  return namedOrder.map(name => (obj[name] === undefined ? null : obj[name]));
}

function prepare(rawSql) {
  const { sql: pgSql, namedOrder } = translateSql(rawSql);
  const insertWithReturning = isPlainInsert(rawSql) ? addReturningId(pgSql) : null;

  async function run(...args) {
    const executor = activeExecutor();
    const useSql = insertWithReturning || pgSql;
    const params = toParamsArray(namedOrder, args);
    const result = await executor.query(useSql, params);
    const lastInsertRowid = result.rows && result.rows[0] ? result.rows[0].id : undefined;
    return { changes: result.rowCount, lastInsertRowid };
  }

  async function get(...args) {
    const executor = activeExecutor();
    const params = toParamsArray(namedOrder, args);
    const result = await executor.query(pgSql, params);
    return result.rows[0];
  }

  async function all(...args) {
    const executor = activeExecutor();
    const params = toParamsArray(namedOrder, args);
    const result = await executor.query(pgSql, params);
    return result.rows;
  }

  return { run, get, all };
}

function pragma() {
  // No-op: Postgres always enforces foreign keys; WAL mode has no
  // Postgres equivalent needed here.
}

async function exec(sql) {
  const executor = activeExecutor();
  await executor.query(sql);
}

function transaction(fn) {
  return async function (...args) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await txContext.run(client, () => fn(...args));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };
}

module.exports = { prepare, pragma, exec, transaction, pool };
