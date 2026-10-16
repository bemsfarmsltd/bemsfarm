const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");

// Ensure downloads directory exists
const downloadsDir = path.resolve(__dirname, "../../downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Format file size in readable format
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Idempotent migration for app_releases table
let schemaReady = false;
async function initSchema() {
  if (schemaReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_releases (
        id SERIAL PRIMARY KEY,
        app_type VARCHAR(50) NOT NULL, -- 'customer' | 'driver'
        app_name VARCHAR(120) NOT NULL,
        package_name VARCHAR(120) NOT NULL,
        version_name VARCHAR(50) NOT NULL,
        version_code INTEGER NOT NULL,
        min_android VARCHAR(50) DEFAULT 'Android 8.0+',
        file_size VARCHAR(50),
        file_size_bytes BIGINT,
        file_name VARCHAR(120) NOT NULL,
        download_url TEXT NOT NULL,
        release_notes TEXT,
        is_active BOOLEAN DEFAULT true,
        uploaded_by INTEGER,
        uploaded_by_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed defaults if empty
    const check = await pool.query("SELECT COUNT(*) FROM app_releases");
    if (parseInt(check.rows[0].count, 10) === 0) {
      const origin = process.env.BASE_URL || "https://bemsfarms.com";
      await pool.query(
        `INSERT INTO app_releases 
          (app_type, app_name, package_name, version_name, version_code, min_android, file_size, file_size_bytes, file_name, download_url, release_notes, is_active, uploaded_by_email)
         VALUES 
          ('customer', 'BemsFarms Customer App', 'com.bemsfarms.customer', '2.4.1', 241, 'Android 8.0+', '18.4 MB', 19293798, 'BemsCustomer.apk', $1, 'Official release with 1-tap reorders, Chef Bems AI, and real-time live order tracking.', true, 'system@bemsfarms.com'),
          ('driver', 'BemsFarms Driver App', 'com.bemsfarms.driver', '2.3.0', 230, 'Android 8.0+', '16.8 MB', 17616076, 'BemsDriver.apk', $2, 'Official logistics dispatch release with auto-dispatch, route bundling, and mandatory photo proof.', true, 'system@bemsfarms.com')`,
        [`${origin}/downloads/BemsCustomer.apk`, `${origin}/downloads/BemsDriver.apk`]
      );
      console.log("✅ Seeded initial app releases into database.");
    }
    schemaReady = true;
  } catch (err) {
    console.warn("[app_releases] Schema init notice:", err.message);
  }
}

// Run schema setup
initSchema();

// Configure Multer storage for APK files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, downloadsDir);
  },
  filename: (req, file, cb) => {
    const appType = req.body.appType === "driver" ? "driver" : "customer";
    const timestamp = Date.now();
    const cleanExt = path.extname(file.originalname).toLowerCase() || ".apk";
    cb(null, `Bems_${appType}_${timestamp}${cleanExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".apk") {
      return cb(new Error("Only Android application packages (.apk) are accepted"));
    }
    cb(null, true);
  },
});

// Helper to copy file to client/public/downloads, client/dist/downloads, and public_html/downloads
function syncApkCopies(sourcePath, standardName) {
  const rootDir = path.resolve(__dirname, "../../..");
  const targets = [
    path.join(downloadsDir, standardName),
    path.join(rootDir, "client", "public", "downloads", standardName),
    path.join(rootDir, "client", "dist", "downloads", standardName),
    path.join(rootDir, "public_html", "downloads", standardName),
  ];

  targets.forEach((target) => {
    try {
      const dir = path.dirname(target);
      if (fs.existsSync(dir)) {
        fs.copyFileSync(sourcePath, target);
        console.log(`[app_releases] Synced APK to: ${target}`);
      }
    } catch (e) {
      console.warn(`[app_releases] Failed copying to ${target}:`, e.message);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS: Used by Landing Page & Mobile Launchers
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/app-releases/latest OR GET /api/app-releases
router.get(["/", "/latest"], async (req, res) => {
  await initSchema();
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (app_type)
        id, app_type, app_name, package_name, version_name, version_code,
        min_android, file_size, file_size_bytes, file_name, download_url,
        release_notes, is_active, updated_at
      FROM app_releases
      WHERE is_active = true
      ORDER BY app_type, id DESC
    `);

    const formatted = {
      customer: null,
      driver: null,
    };

    result.rows.forEach((row) => {
      formatted[row.app_type] = row;
    });

    // Provide safe defaults if no rows exist
    const origin =
      req.get("origin") || `${req.protocol}://${req.get("host")}` || "https://bemsfarms.com";

    if (!formatted.customer) {
      formatted.customer = {
        app_type: "customer",
        app_name: "BemsFarms Customer App",
        package_name: "com.bemsfarms.customer",
        version_name: "2.4.1",
        version_code: 241,
        min_android: "Android 8.0+",
        file_size: "18.4 MB",
        file_name: "BemsCustomer.apk",
        download_url: `${origin}/downloads/BemsCustomer.apk`,
        release_notes: "Fresh produce 1-tap reorders and Chef Bems AI meal planning.",
      };
    }

    if (!formatted.driver) {
      formatted.driver = {
        app_type: "driver",
        app_name: "BemsFarms Driver App",
        package_name: "com.bemsfarms.driver",
        version_name: "2.3.0",
        version_code: 230,
        min_android: "Android 8.0+",
        file_size: "16.8 MB",
        file_name: "BemsDriver.apk",
        download_url: `${origin}/downloads/BemsDriver.apk`,
        release_notes: "Live proximity auto-dispatch, route bundling, and photo delivery proof.",
      };
    }

    res.json({ success: true, releases: formatted });
  } catch (err) {
    console.error("Error fetching latest app releases:", err);
    res.status(500).json({ error: "Failed to fetch app release information" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS: Used by Admin Dashboard
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/app-releases/history
router.get("/history", protect, async (req, res) => {
  await initSchema();
  try {
    const { appType } = req.query;
    let query = "SELECT * FROM app_releases";
    const params = [];

    if (appType) {
      query += " WHERE app_type = $1";
      params.push(appType);
    }
    query += " ORDER BY id DESC LIMIT 50";

    const result = await pool.query(query, params);
    res.json({ success: true, history: result.rows });
  } catch (err) {
    console.error("Error fetching release history:", err);
    res.status(500).json({ error: "Failed to fetch release history" });
  }
});

// POST /api/admin/app-releases/upload
// Handles uploading a new build for Customer App or Driver App
router.post(
  "/upload",
  protect,
  requireRole(["superadmin", "admin", "manager"]),
  (req, res, next) => {
    upload.single("apk")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    await initSchema();
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please select an APK file to upload" });
      }

      const {
        appType,
        minAndroid = "Android 8.0+",
        releaseNotes = "",
      } = req.body;

      const versionName = (req.body.versionName && req.body.versionName.trim()) || "latest";
      const versionCode = parseInt(req.body.versionCode, 10) || Math.floor(Date.now() / 1000);

      if (!appType || (appType !== "customer" && appType !== "driver")) {
        return res.status(400).json({ error: "appType must be either 'customer' or 'driver'" });
      }

      const isCustomer = appType === "customer";
      const standardFileName = isCustomer ? "BemsCustomer.apk" : "BemsDriver.apk";
      const appName = isCustomer ? "BemsFarms Customer App" : "BemsFarms Driver App";
      const packageName = isCustomer ? "com.bemsfarms.customer" : "com.bemsfarms.driver";

      const uploadedPath = req.file.path;
      const fileSizeBytes = req.file.size;
      const fileSize = formatBytes(fileSizeBytes);

      // Copy uploaded file to the standard BemsCustomer.apk / BemsDriver.apk locations
      syncApkCopies(uploadedPath, standardFileName);

      const origin =
        process.env.FRONTEND_URL ||
        process.env.BASE_URL ||
        req.get("origin") ||
        `${req.protocol}://${req.get("host")}` ||
        "https://bemsfarms.com";

      const downloadUrl = `${origin.replace(/\/$/, "")}/downloads/${standardFileName}`;

      // Mark previous releases of this app type as inactive
      await pool.query(
        "UPDATE app_releases SET is_active = false, updated_at = NOW() WHERE app_type = $1",
        [appType]
      );

      // Insert new active release
      const insertResult = await pool.query(
        `INSERT INTO app_releases
          (app_type, app_name, package_name, version_name, version_code, min_android, file_size, file_size_bytes, file_name, download_url, release_notes, is_active, uploaded_by, uploaded_by_email)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13)
         RETURNING *`,
        [
          appType,
          appName,
          packageName,
          versionName.trim(),
          parseInt(versionCode, 10),
          minAndroid.trim(),
          fileSize,
          fileSizeBytes,
          standardFileName,
          downloadUrl,
          releaseNotes.trim(),
          req.user?.id || null,
          req.user?.email || "admin@bemsfarms.com",
        ]
      );

      const savedRelease = insertResult.rows[0];

      res.status(201).json({
        success: true,
        message: `Successfully published ${appName} (${versionName})! Available immediately for download on the landing page.`,
        release: savedRelease,
      });
    } catch (err) {
      console.error("Error processing app release upload:", err);
      res.status(500).json({ error: "Failed to publish app release: " + err.message });
    }
  }
);

module.exports = router;
