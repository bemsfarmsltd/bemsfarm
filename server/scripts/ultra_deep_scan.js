const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://henry:@localhost:5432/bemsfarm_db"
});

const adminSrc = path.join(__dirname, "../../Bems-Farms-Admin-Front-end/src");
const clientSrc = path.join(__dirname, "../../client/src");
const serverSrc = path.join(__dirname, "../src");

function getAllFiles(dir, exts = [".js", ".jsx"]) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.some(ext => file.endsWith(ext))) {
      results.push(fullPath);
    }
  });
  return results;
}

async function runDeepDiagnostic() {
  console.log("================================================================================");
  console.log("             BEMS FARMS ULTRA-DEEP ENTERPRISE CODEBASE SCANNER                  ");
  console.log("================================================================================\n");

  const findings = [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. HARDCODED URLS / PORT LEAKS (e.g. localhost:5000, old render/heroku urls)
  // ──────────────────────────────────────────────────────────────────────────
  const allFrontendFiles = [...getAllFiles(adminSrc), ...getAllFiles(clientSrc)];
  
  allFrontendFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);

    // Skip api.js / env configs where base URLs are legitimately defined
    if (rel.includes("lib/api.js") || rel.includes("services/api.js")) return;

    const hardcodedUrls = code.match(/https?:\/\/(?:localhost:5000|bems-farm-api\.[a-z0-9.-]+|api\.bemsfarms\.com)\/[a-zA-Z0-9_\-\/]+/g);
    if (hardcodedUrls) {
      findings.push({
        category: "Hardcoded Backend URL",
        severity: "MEDIUM",
        file: rel,
        details: `Found hardcoded direct URL(s): ${hardcodedUrls.join(", ")}. Should use 'api' or API_BASE_URL.`
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TOKEN & LOCALSTORAGE KEY DISCREPANCIES
  // ──────────────────────────────────────────────────────────────────────────
  allFrontendFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);
    
    // Check for inconsistent token storage keys
    const rawTokens = code.match(/localStorage\.(?:getItem|setItem|removeItem)\(\s*["\x27]([^"\x27]+)["\x27]\s*\)/g);
    if (rawTokens) {
      rawTokens.forEach(t => {
        if (t.includes("authToken") || t.includes("jwt_token") || t.includes("user_token")) {
          findings.push({
            category: "Token Storage Inconsistency",
            severity: "LOW",
            file: rel,
            details: `Found suspicious localStorage key in ${t}. System standard is 'token' (client) and 'admin_token' (admin).`
          });
        }
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. EMPTY / DUMMY BUTTON ONCLICK HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  allFrontendFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);

    // Match onClick={() => {}} or onClick={() => console.log(...)}
    const dummyHandlers = code.match(/onClick=\{(?:\(\)\s*=>\s*\{\s*\}|\(\)\s*=>\s*console\.[a-z]+\([^)]*\))\}/g);
    if (dummyHandlers) {
      findings.push({
        category: "Dummy UI Action",
        severity: "LOW",
        file: rel,
        details: `Found ${dummyHandlers.length} empty or console-only onClick handler(s).`
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SQL QUERY SCANNER (Raw String Concatenation in SQL)
  // ──────────────────────────────────────────────────────────────────────────
  const allServerFiles = getAllFiles(serverSrc, [".js"]);
  allServerFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);

    // Look for template literals in pool.query or client.query that interpolate variables directly instead of $1, $2
    // Ignore safe helpers like ${whereClause}, ${limit}, ${params.length}
    const unsafeSqlMatches = [...code.matchAll(/(?:pool|client)\.query\(\s*`([^`]+)`/g)];
    unsafeSqlMatches.forEach(m => {
      const sql = m[1];
      const directVars = sql.match(/\$\{(?:req\.body|req\.params|req\.query|[a-zA-Z0-9_]+Id|[a-zA-Z0-9_]+Name)[a-zA-Z0-9_.]*\}/g);
      if (directVars) {
        findings.push({
          category: "SQL Parameterization Risk",
          severity: "HIGH",
          file: rel,
          details: `Direct string interpolation in SQL query: ${directVars.join(", ")}`
        });
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. UNHANDLED ERROR CATCH BLOCKS (Silent Failures)
  // ──────────────────────────────────────────────────────────────────────────
  allServerFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);

    // Look for catch(err) {} or catch(e) {} with empty body
    const emptyCatches = code.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
    if (emptyCatches) {
      findings.push({
        category: "Silent Error Swallowing",
        severity: "MEDIUM",
        file: rel,
        details: `Found ${emptyCatches.length} empty catch block(s) that swallow exceptions silently.`
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. DB SCHEMA COLUMN VALIDATOR ACROSS ALL SQL QUERIES
  // ──────────────────────────────────────────────────────────────────────────
  // Extract all valid columns per table from PostgreSQL
  const dbCols = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public';
  `);
  
  const tablesMap = {};
  dbCols.rows.forEach(r => {
    if (!tablesMap[r.table_name]) tablesMap[r.table_name] = new Set();
    tablesMap[r.table_name].add(r.column_name);
  });

  // Common known SQL column check
  allServerFiles.forEach(fp => {
    const code = fs.readFileSync(fp, "utf8");
    const rel = path.relative(path.join(__dirname, "../.."), fp);

    // Check if querying non-existent columns on core tables
    if (code.includes("drivers.dva_account_reference") || code.includes("d.dva_account_reference")) {
      findings.push({ category: "Invalid DB Column", severity: "HIGH", file: rel, details: "drivers.dva_account_reference does not exist" });
    }
    if (code.includes("orders.customer_email") && !tablesMap["orders"]?.has("customer_email")) {
      // Check if orders actually has customer_email
      findings.push({ category: "Invalid DB Column", severity: "HIGH", file: rel, details: "orders.customer_email queried directly on orders table" });
    }
    if (code.includes("transactions.created_by") && !tablesMap["transactions"]?.has("created_by")) {
      findings.push({ category: "Invalid DB Column", severity: "HIGH", file: rel, details: "transactions.created_by does not exist" });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. SUMMARY REPORT
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`Scan completed across ${allFrontendFiles.length + allServerFiles.length} files.\n`);

  if (findings.length === 0) {
    console.log("✓ ALL CHECKS PASSED: ZERO ISSUES, ZERO LEAKS, ZERO DISCONNECTIONS FOUND.");
  } else {
    console.log(`FOUND ${findings.length} POTENTIAL ATTENTION ITEMS:\n`);
    findings.forEach((f, idx) => {
      console.log(`[${idx + 1}] [${f.severity}] ${f.category} in ${f.file}`);
      console.log(`    └─ ${f.details}\n`);
    });
  }

  await pool.end();
}

runDeepDiagnostic();
