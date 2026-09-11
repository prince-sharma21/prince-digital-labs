const db = require("./db");
const config = require("./config");
const { hashPassword } = require("./lib/hash");

async function resetAdmin() {
  console.log("Admin password update ho raha hai...");
  try {
    // .env se naya password le kar usko encrypt kar rahe hain
    const hash = await hashPassword(config.ADMIN_PASSWORD);
    
    // Database me purane admin ki details update kar rahe hain
    await db.prepare(`UPDATE users SET email = ?, password_hash = ? WHERE role = 'owner'`).run(
      config.ADMIN_EMAIL.toLowerCase(),
      hash
    );
    
    console.log("✅ Admin details successfully update ho gayi hain!");
    console.log("👉 Naya Email: ", config.ADMIN_EMAIL);
    console.log("👉 Naya Password: ", config.ADMIN_PASSWORD);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    if(db.pool) db.pool.end();
  }
}

resetAdmin();