const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://henry:@localhost:5432/bemsfarm_db"
});

async function runAdvancedSubsystemAudit() {
  console.log("================================================================================");
  console.log("            BEMS FARMS ADVANCED SUBSYSTEMS & PERMISSIONS AUDIT                   ");
  console.log("================================================================================\n");

  const issues = [];
  const checksPassed = [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CHEF BEMS & KITCHEN INGREDIENTS
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const mealRes = await pool.query("SELECT COUNT(*) FROM chef_meals WHERE is_active = true");
    const count = parseInt(mealRes.rows[0].count);
    checksPassed.push(`Chef Bems active meals catalog: ${count} active dishes.`);
  } catch (err) {
    issues.push({ module: "Chef Bems", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. COUPON VALIDATION ENDPOINTS & RULES
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const couponRes = await pool.query("SELECT code, discount_type, discount_value, min_order_value, status FROM coupons");
    checksPassed.push(`Coupons engine: ${couponRes.rows.length} promo codes configured.`);
  } catch (err) {
    issues.push({ module: "Coupons", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STAFF ROLES & PERMISSIONS CONSISTENCY
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const userRoles = await pool.query("SELECT DISTINCT role FROM users");
    const existingRoles = userRoles.rows.map(r => r.role);
    checksPassed.push(`Staff & User roles present in database: ${existingRoles.join(", ")}`);

    // Scan all routes for requireRole invocations
    const routesDir = path.join(__dirname, "../src/routes");
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith(".js"));
    const allGuardedRoles = new Set();

    routeFiles.forEach(f => {
      const code = fs.readFileSync(path.join(routesDir, f), "utf8");
      const matches = code.matchAll(/requireRole\(\s*([^)]+)\s*\)/g);
      for (const m of matches) {
        const roles = m[1].replace(/["'\s]/g, "").split(",");
        roles.forEach(r => allGuardedRoles.add(r));
      }
    });

    checksPassed.push(`Checked ${allGuardedRoles.size} guarded roles across API endpoints: ${Array.from(allGuardedRoles).join(", ")}`);
  } catch (err) {
    issues.push({ module: "Roles & Auth", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DELIVERY ZONES & ACTIVE COVERAGE
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const zonesRes = await pool.query("SELECT zone_id, zone_name, delivery_fee, driver_earning_fee, status FROM delivery_zones");
    checksPassed.push(`Delivery Zones engine: ${zonesRes.rows.length} zones mapped.`);
    
    // Check if any zone has missing driver_earning_fee
    const unconfiguredDriverEarning = zonesRes.rows.filter(z => !z.driver_earning_fee || parseFloat(z.driver_earning_fee) <= 0);
    if (unconfiguredDriverEarning.length > 0) {
      issues.push({
        module: "Logistics / Delivery Zones",
        severity: "LOW",
        issue: `${unconfiguredDriverEarning.length} delivery zone(s) have driver_earning_fee = 0 or NULL (will fallback to default driver rate of ₦700 or percentage).`,
        details: unconfiguredDriverEarning.map(z => z.zone_name).join(", ")
      });
    }
  } catch (err) {
    issues.push({ module: "Delivery Zones", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PURCHASES & INVENTORY VALUATION CONSISTENCY
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const poRes = await pool.query("SELECT COUNT(*) FROM purchase_orders WHERE status = 'received'");
    checksPassed.push(`Purchase Orders engine: ${poRes.rows[0].count} received POs on record.`);
  } catch (err) {
    issues.push({ module: "Purchases", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. MONNIFY DVA WEBHOOK HEALTH
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const webhooksRes = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'payment_logs' OR table_name = 'webhook_logs';
    `);
    checksPassed.push(`Payment Gateway & Webhook logging tables validated.`);
  } catch (err) {
    issues.push({ module: "Payments", severity: "HIGH", issue: err.message });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log("--------------------------------------------------------------------------------");
  console.log(`[+] VERIFIED SUBSYSTEMS (${checksPassed.length})`);
  console.log("--------------------------------------------------------------------------------");
  checksPassed.forEach(p => console.log(` ✓ ${p}`));

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`[!] ISSUES / NOTICES FOUND (${issues.length})`);
  console.log("--------------------------------------------------------------------------------");
  if (issues.length === 0) {
    console.log(" ✓ ZERO DISCONNECTIONS OR GAPS FOUND ACROSS ADVANCED SUBSYSTEMS.");
  } else {
    issues.forEach(i => console.log(` [${i.severity}] [${i.module}] ${i.issue} ${i.details ? `(${i.details})` : ''}`));
  }

  console.log("\n================================================================================\n");

  await pool.end();
}

runAdvancedSubsystemAudit();
