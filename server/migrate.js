const fs = require("fs");
const path = require("path");
const db = require("./db");

const migrationsDir = path.join(__dirname, "migrations");
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

(async () => {
  console.log(`Running ${files.length} migration file(s)...`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
    console.log(`  ✓ ${file}`);
  }
  console.log("Migrations complete. Connected to:", require("./config").DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
  await db.pool.end();
})().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
