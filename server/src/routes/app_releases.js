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
        stored_filename VARCHAR(255),
        download_url TEXT NOT NULL,
        release_notes TEXT,
        is_active BOOLEAN DEFAULT true,
        uploaded_by INTEGER,
        uploaded_by_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE app_releases ADD COLUMN IF NOT EXISTS stored_filename VARCHAR(255);
    `);

    // Seed defaults if empty
    const check = await pool.query("SELECT COUNT(*) FROM app_releases");
    if (parseInt(check.rows[0].count, 10) === 0) {
      const origin = process.env.BASE_URL || "https://bemsfarms.com";
      await pool.query(
        `INSERT INTO app_releases 
          (app_type, app_name, package_name, version_name, version_code, min_android, file_size, file_size_bytes, file_name, stored_filename, download_url, release_notes, is_active, uploaded_by_email)
         VALUES 
          ('customer', 'BemsFarms Customer App', 'com.bemsfarms.customer', '2.4.1', 241, 'Android 8.0+', '18.4 MB', 19293798, 'BemsCustomer.apk', 'BemsCustomer.apk', $1, 'Official release with 1-tap reorders, Chef Bems AI, and real-time live order tracking.', true, 'system@bemsfarms.com'),
          ('driver', 'BemsFarms Driver App', 'com.bemsfarms.driver', '2.3.0', 230, 'Android 8.0+', '16.8 MB', 17616076, 'BemsDriver.apk', 'BemsDriver.apk', $2, 'Official logistics dispatch release with auto-dispatch, route bundling, and mandatory photo proof.', true, 'system@bemsfarms.com')`,
        [`https://api.bemsfarms.com/api/app-releases/download/customer`, `https://api.bemsfarms.com/api/app-releases/download/driver`]
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

// Helper to locate an APK file on disk given a release record
function resolveApkFilePath(release, appType) {
  const standardName = appType === "driver" ? "BemsDriver.apk" : "BemsCustomer.apk";

  // 1. Check stored_filename if set
  if (release && release.stored_filename) {
    const p = path.join(downloadsDir, release.stored_filename);
    if (fs.existsSync(p)) return p;
  }

  // 2. Scan downloadsDir for any Bems_${appType}_*.apk
  try {
    if (fs.existsSync(downloadsDir)) {
      const files = fs.readdirSync(downloadsDir);
      const prefix = `bems_${appType}_`;
      const matching = files
        .filter((f) => f.toLowerCase().startsWith(prefix) && f.toLowerCase().endsWith(".apk"))
        .map((f) => ({
          name: f,
          path: path.join(downloadsDir, f),
          stat: fs.statSync(path.join(downloadsDir, f)),
        }));

      // If we have an expected size, prioritize closest match
      if (release && release.file_size_bytes) {
        const expectedBytes = parseInt(release.file_size_bytes, 10);
        const matchBySize = matching.find(
          (m) => Math.abs(m.stat.size - expectedBytes) < 2048
        );
        if (matchBySize) return matchBySize.path;
      }

      // Otherwise take newest
      if (matching.length > 0) {
        matching.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
        return matching[0].path;
      }
    }
  } catch (e) {
    console.warn("[app_releases] Error scanning downloadsDir:", e.message);
  }

  // 3. Fall back to standard name in downloadsDir
  const stdPath = path.join(downloadsDir, standardName);
  if (fs.existsSync(stdPath)) return stdPath;

  // 4. Fall back to public_html/downloads
  const rootDir = path.resolve(__dirname, "../../..");
  const publicPath = path.join(rootDir, "public_html", "downloads", standardName);
  if (fs.existsSync(publicPath)) return publicPath;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS: Used by Landing Page & Mobile Launchers
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/app-releases/download/:appType (e.g. 'customer' | 'driver')
// Streams the actual uploaded APK file directly to the visitor
router.get("/download/:appType", async (req, res) => {
  await initSchema();
  try {
    const { appType } = req.params;
    if (appType !== "customer" && appType !== "driver") {
      return res.status(400).send("Invalid app type. Must be 'customer' or 'driver'.");
    }

    const result = await pool.query(
      `SELECT * FROM app_releases WHERE app_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1`,
      [appType]
    );

    const release = result.rows[0];
    const standardName = appType === "driver" ? "BemsDriver.apk" : "BemsCustomer.apk";
    const filePath = resolveApkFilePath(release, appType);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send(`APK file for ${appType} is not currently available on the server.`);
    }

    const stat = fs.statSync(filePath);
    console.log(`[download] Serving ${appType} APK: ${filePath} (${stat.size} bytes)`);

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${standardName}"`);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error("Error serving APK download:", err);
    res.status(500).send("Server error while preparing download.");
  }
});

// GET /api/app-releases/download-file/:id
// Downloads any specific release by ID (used by Admin History table)
router.get("/download-file/:id", async (req, res) => {
  await initSchema();
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM app_releases WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Release record not found.");
    }

    const release = result.rows[0];
    const standardName = release.app_type === "driver" ? "BemsDriver.apk" : "BemsCustomer.apk";
    const filePath = resolveApkFilePath(release, release.app_type);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("APK file not found on server.");
    }

    const stat = fs.statSync(filePath);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${release.file_name || standardName}"`);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error("Error serving release file by id:", err);
    res.status(500).send("Server error while preparing download.");
  }
});

// GET /api/app-releases/latest OR GET /api/app-releases
router.get(["/", "/latest"], async (req, res) => {
  await initSchema();
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (app_type)
        id, app_type, app_name, package_name, version_name, version_code,
        min_android, file_size, file_size_bytes, file_name, stored_filename, download_url,
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
      // Ensure download_url points directly to the live streaming download endpoint
      const host = req.get("host") || "api.bemsfarms.com";
      const proto = req.protocol || "https";
      const apiBase = `${proto}://${host}`;
      row.download_url = `${apiBase}/api/app-releases/download/${row.app_type}`;
      formatted[row.app_type] = row;
    });

    const apiBase = "https://api.bemsfarms.com";

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
        download_url: `${apiBase}/api/app-releases/download/customer`,
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
        download_url: `${apiBase}/api/app-releases/download/driver`,
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
    
    // Ensure download_url in history items links to download-file/:id
    const rows = result.rows.map(row => ({
      ...row,
      download_url: `https://api.bemsfarms.com/api/app-releases/download-file/${row.id}`
    }));

    res.json({ success: true, history: rows });
  } catch (err) {
    console.error("Error fetching release history:", err);
    res.status(500).json({ error: "Failed to fetch release history" });
  }
});

// DELETE /api/admin/app-releases/:id
// Allows admins to delete old test releases or seeded placeholders
router.delete(
  "/:id",
  protect,
  requireRole("superadmin", "admin", "manager"),
  async (req, res) => {
    await initSchema();
    try {
      const { id } = req.params;
      const findRes = await pool.query("SELECT * FROM app_releases WHERE id = $1", [id]);
      if (findRes.rows.length === 0) {
        return res.status(404).json({ error: "Release not found" });
      }

      const release = findRes.rows[0];
      await pool.query("DELETE FROM app_releases WHERE id = $1", [id]);

      // If this was active, activate the next most recent release of this appType
      if (release.is_active) {
        await pool.query(`
          UPDATE app_releases
          SET is_active = true
          WHERE id = (
            SELECT id FROM app_releases
            WHERE app_type = $1
            ORDER BY id DESC
            LIMIT 1
          )
        `, [release.app_type]);
      }

      res.json({ success: true, message: "Release record deleted successfully" });
    } catch (err) {
      console.error("Error deleting release:", err);
      res.status(500).json({ error: "Failed to delete release: " + err.message });
    }
  }
);

// POST /api/admin/app-releases/upload
// Handles uploading a new build for Customer App or Driver App
router.post(
  "/upload",
  protect,
  requireRole("superadmin", "admin", "manager"),
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
      const storedFilename = req.file.filename;
      const fileSizeBytes = req.file.size;
      const fileSize = formatBytes(fileSizeBytes);

      // Copy uploaded file to the standard BemsCustomer.apk / BemsDriver.apk locations
      syncApkCopies(uploadedPath, standardFileName);

      const downloadUrl = `https://api.bemsfarms.com/api/app-releases/download/${appType}`;

      // Mark previous releases of this app type as inactive
      await pool.query(
        "UPDATE app_releases SET is_active = false, updated_at = NOW() WHERE app_type = $1",
        [appType]
      );

      // Insert new active release
      const insertResult = await pool.query(
        `INSERT INTO app_releases
          (app_type, app_name, package_name, version_name, version_code, min_android, file_size, file_size_bytes, file_name, stored_filename, download_url, release_notes, is_active, uploaded_by, uploaded_by_email)
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
          storedFilename,
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
