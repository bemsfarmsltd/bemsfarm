const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../db/pool");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getAppVersionConfig, updateAppVersionConfig } = require("../config/appVersion");
const { recordAudit } = require("../services/auditService");
const { notifyAdmin } = require("../services/notificationService");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "Unknown IP";
}

// Persistent storage directory that survives Hostinger ephemeral hbuilds deployments
function getStorageDir() {
  const hostingerHome = "/home/u649760923";
  if (fs.existsSync(hostingerHome)) {
    const p = path.join(hostingerHome, "storage", "app_releases");
    if (!fs.existsSync(p)) {
      try {
        fs.mkdirSync(p, { recursive: true });
        console.log("✅ Created persistent Hostinger app_releases storage:", p);
      } catch (e) {
        console.warn("Could not create persistent storage:", e.message);
      }
    }
    return p;
  }
  // Local development / generic fallback
  const localDir = path.resolve(__dirname, "../../downloads");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

const downloadsDir = getStorageDir();

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
    const dir = getStorageDir();
    cb(null, dir);
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

// Helper to copy file to persistent storage, public_html/downloads, and client/dist/downloads
function syncApkCopies(sourcePath, standardName) {
  const rootDir = path.resolve(__dirname, "../../..");
  const targets = [
    path.join(downloadsDir, standardName),
    "/home/u649760923/domains/bemsfarms.com/public_html/downloads/" + standardName,
    path.join(rootDir, "client", "public", "downloads", standardName),
    path.join(rootDir, "client", "dist", "downloads", standardName),
    path.join(rootDir, "public_html", "downloads", standardName),
    path.resolve(__dirname, "../../downloads", standardName),
  ];

  targets.forEach((target) => {
    try {
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(sourcePath, target);
      console.log(`[app_releases] Synced APK to: ${target}`);
    } catch (e) {
      // quiet non-existent paths
    }
  });
}

// Helper to locate an APK file on disk given a release record
function resolveApkFilePath(release, appType) {
  const standardName = appType === "driver" ? "BemsDriver.apk" : "BemsCustomer.apk";

  const searchDirs = [
    downloadsDir,
    "/home/u649760923/storage/app_releases",
    "/home/u649760923/domains/bemsfarms.com/public_html/downloads",
    path.resolve(__dirname, "../../downloads"),
    path.resolve(__dirname, "../../../public_html/downloads"),
    path.resolve(__dirname, "../../../client/public/downloads"),
  ];

  // 1. Check stored_filename in search dirs
  if (release && release.stored_filename) {
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const p = path.join(dir, release.stored_filename);
        if (fs.existsSync(p)) return p;
      }
    }
  }

  // 2. Scan searchDirs for any Bems_${appType}_*.apk
  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const prefix = `bems_${appType}_`;
        const matching = files
          .filter((f) => f.toLowerCase().startsWith(prefix) && f.toLowerCase().endsWith(".apk"))
          .map((f) => ({
            name: f,
            path: path.join(dir, f),
            stat: fs.statSync(path.join(dir, f)),
          }));

        if (release && release.file_size_bytes) {
          const expectedBytes = parseInt(release.file_size_bytes, 10);
          const matchBySize = matching.find(
            (m) => Math.abs(m.stat.size - expectedBytes) < 2048
          );
          if (matchBySize) return matchBySize.path;
        }

        if (matching.length > 0) {
          matching.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
          return matching[0].path;
        }
      }
    } catch (e) {
      // ignore scan errors
    }
  }

  // 3. Fall back to standard name in searchDirs
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const stdPath = path.join(dir, standardName);
      if (fs.existsSync(stdPath)) return stdPath;
    }
  }

  return null;
}

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

// GET /api/admin/app-releases/version-config
router.get("/version-config", protect, async (req, res) => {
  try {
    const config = getAppVersionConfig();
    res.json({ success: true, config });
  } catch (err) {
    console.error("Error fetching app version config:", err);
    res.status(500).json({ success: false, error: "Failed to fetch version configuration" });
  }
});

// PUT /api/admin/app-releases/version-config
router.put(
  "/version-config",
  protect,
  requireRole("superadmin", "admin", "manager", "app_developer"),
  async (req, res) => {
    try {
      const { customer, driver } = req.body || {};

      if (!customer || !driver) {
        return res.status(400).json({
          success: false,
          error: "Payload must contain both 'customer' and 'driver' configuration objects."
        });
      }

      // Merge and clean incoming configuration
      const current = getAppVersionConfig();
      const updatedConfig = {
        customer: {
          minimum_version: String(customer.minimum_version || current.customer?.minimum_version || '1.0.1').trim(),
          latest_version: String(customer.latest_version || current.customer?.latest_version || '1.0.1').trim(),
          download_url: String(customer.download_url || current.customer?.download_url || 'https://bemsfarms.com/download/customer-app.apk').trim(),
          force_update: Boolean(customer.force_update !== false),
          release_notes: String(customer.release_notes || current.customer?.release_notes || '').trim()
        },
        driver: {
          minimum_version: String(driver.minimum_version || current.driver?.minimum_version || '1.0.1').trim(),
          latest_version: String(driver.latest_version || current.driver?.latest_version || '1.0.1').trim(),
          download_url: String(driver.download_url || current.driver?.download_url || 'https://bemsfarms.com/download/driver-app.apk').trim(),
          force_update: Boolean(driver.force_update !== false),
          release_notes: String(driver.release_notes || current.driver?.release_notes || '').trim()
        }
      };

      await updateAppVersionConfig(updatedConfig, pool);

      console.log('✅ Updated app version gate config from Admin Portal:', updatedConfig);

      // 1. Record in God Eye System Log (system_audit_events)
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "Unknown";
      const performerName = req.user?.name || req.user?.first_name || "Staff Member";
      const performerEmail = req.user?.email || "Unknown Email";
      const performerRole = req.user?.role || "staff";

      recordAudit({
        source: "admin",
        action: "MOBILE_APP_VERSION_GATE_UPDATE",
        category: "system",
        severity: "warning",
        outcome: "success",
        actor_id: req.user?.id || null,
        actor_name: `${performerName} (${performerEmail})`,
        actor_role: performerRole,
        ip_address: clientIp,
        user_agent: userAgent,
        resource: "/settings/mobile-apps",
        entity_type: "app_version_gate",
        entity_id: "version_config",
        old_value: current,
        new_value: updatedConfig,
        details: {
          event: "Mobile App Version Gates & Upgrade Rules Modified",
          customer_min_version: updatedConfig.customer.minimum_version,
          customer_latest_version: updatedConfig.customer.latest_version,
          customer_force_update: updatedConfig.customer.force_update,
          driver_min_version: updatedConfig.driver.minimum_version,
          driver_latest_version: updatedConfig.driver.latest_version,
          driver_force_update: updatedConfig.driver.force_update,
          performed_by: `${performerName} (${performerEmail})`,
          role: performerRole,
          ip_address: clientIp,
          user_agent: userAgent,
          occurred_at: new Date().toISOString(),
        },
      }).catch((err) => console.warn("[app_releases] Audit log error:", err.message));

      // 2. Dispatch real-time system notification and email alert to Administrators
      notifyAdmin({
        type: "mobile_app_action",
        title: `⚙️ Mobile App Version Gates Modified by ${performerName}`,
        message: `${performerName} (${performerEmail}, role: ${performerRole}) updated the live upgrade rules & version threshold gates for Customer and Driver mobile apps.`,
        link: "/settings/mobile-apps",
        actor: {
          id: req.user?.id,
          name: performerName,
          email: performerEmail,
          role: performerRole,
        },
        data: {
          action: "App Version Rules & Forced Upgrade Gates Updated",
          customer_app_rule: `Min: ${updatedConfig.customer.minimum_version} | Latest: ${updatedConfig.customer.latest_version} (Force Update: ${updatedConfig.customer.force_update ? "Active" : "Off"})`,
          driver_app_rule: `Min: ${updatedConfig.driver.minimum_version} | Latest: ${updatedConfig.driver.latest_version} (Force Update: ${updatedConfig.driver.force_update ? "Active" : "Off"})`,
          performed_by: `${performerName} (${performerEmail})`,
          user_role: performerRole,
          date_and_time: `${new Date().toUTCString()} (Local: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })})`,
          ip_address: clientIp,
          user_agent: userAgent,
        },
      }).catch((err) => console.warn("[app_releases] Notification dispatch error:", err.message));

      res.json({
        success: true,
        message: "Mobile app version gate configuration updated successfully. All incoming requests will immediately use the new rules.",
        config: updatedConfig
      });
    } catch (err) {
      console.error("Error updating app version config:", err);
      res.status(500).json({ success: false, error: "Failed to update version configuration: " + err.message });
    }
  }
);

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
  requireRole("superadmin", "admin", "manager", "app_developer"),
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

      // 1. Record in God Eye System Log (system_audit_events)
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "Unknown";
      const performerName = req.user?.name || req.user?.first_name || "Staff Member";
      const performerEmail = req.user?.email || "Unknown Email";
      const performerRole = req.user?.role || "staff";

      recordAudit({
        source: "admin",
        action: "MOBILE_APP_RELEASE_DELETE",
        category: "system",
        severity: "warning",
        outcome: "success",
        actor_id: req.user?.id || null,
        actor_name: `${performerName} (${performerEmail})`,
        actor_role: performerRole,
        ip_address: clientIp,
        user_agent: userAgent,
        resource: "/settings/mobile-apps",
        entity_type: "app_releases",
        entity_id: String(release.id),
        old_value: release,
        details: {
          event: "Mobile App Release Record Deleted",
          deleted_release_id: release.id,
          app_type: release.app_type,
          app_name: release.app_name,
          version_name: release.version_name,
          version_code: release.version_code,
          file_name: release.file_name,
          performed_by: `${performerName} (${performerEmail})`,
          role: performerRole,
          ip_address: clientIp,
          user_agent: userAgent,
          occurred_at: new Date().toISOString(),
        },
      }).catch((err) => console.warn("[app_releases] Audit log error:", err.message));

      // 2. Dispatch real-time system notification and email alert to Administrators
      notifyAdmin({
        type: "mobile_app_action",
        title: `🗑️ Mobile App Release Deleted: ${release.app_name || release.app_type} (v${release.version_name})`,
        message: `${performerName} (${performerEmail}, role: ${performerRole}) deleted release record #${release.id} for ${release.app_name || release.app_type} (v${release.version_name}, file: ${release.file_name}) from the mobile release repository.`,
        link: "/settings/mobile-apps",
        actor: {
          id: req.user?.id,
          name: performerName,
          email: performerEmail,
          role: performerRole,
        },
        data: {
          action: "Mobile App Release Record Deleted",
          deleted_release_id: release.id,
          app_name: release.app_name,
          app_type: release.app_type,
          version_name: release.version_name,
          file_name: release.file_name,
          performed_by: `${performerName} (${performerEmail})`,
          user_role: performerRole,
          date_and_time: `${new Date().toUTCString()} (Local: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })})`,
          ip_address: clientIp,
          user_agent: userAgent,
        },
      }).catch((err) => console.warn("[app_releases] Notification dispatch error:", err.message));

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
  requireRole("superadmin", "admin", "manager", "app_developer"),
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

      let detectedVersion = null;
      if (req.file.originalname) {
        const fnMatch = req.file.originalname.match(/v?(\d+\.\d+(\.\d+)?)/i);
        if (fnMatch) detectedVersion = fnMatch[1];
      }

      const versionName = (req.body.versionName && req.body.versionName.trim()) || detectedVersion || "1.0.1";
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

      // Insert new active release (15 columns : 15 values)
      const insertResult = await pool.query(
        `INSERT INTO app_releases
          (app_type, app_name, package_name, version_name, version_code, min_android, file_size, file_size_bytes, file_name, stored_filename, download_url, release_notes, is_active, uploaded_by, uploaded_by_email)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14)
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

      // Keep app_version.json in sync with latest deployed version
      try {
        const { getAppVersionConfig, updateAppVersionConfig } = require("../config/appVersion");
        const currentCfg = getAppVersionConfig();
        const typeKey = appType === "driver" ? "driver" : "customer";
        if (currentCfg && currentCfg[typeKey]) {
          if (versionName && versionName !== "latest" && /^\d+(\.\d+)*$/.test(versionName.trim())) {
            currentCfg[typeKey].latest_version = versionName.trim();
          }
          if (releaseNotes && releaseNotes.trim()) {
            currentCfg[typeKey].release_notes = releaseNotes.trim();
          }
          updateAppVersionConfig(currentCfg);
        }
      } catch (syncErr) {
        console.warn("[app_releases] Notice: could not sync app_version config:", syncErr.message);
      }

      // 1. Record in God Eye System Log (system_audit_events)
      const clientIp = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "Unknown";
      const performerName = req.user?.name || req.user?.first_name || "Staff Member";
      const performerEmail = req.user?.email || "Unknown Email";
      const performerRole = req.user?.role || "staff";

      recordAudit({
        source: "admin",
        action: "MOBILE_APP_UPLOAD",
        category: "system",
        severity: "info",
        outcome: "success",
        actor_id: req.user?.id || null,
        actor_name: `${performerName} (${performerEmail})`,
        actor_role: performerRole,
        ip_address: clientIp,
        user_agent: userAgent,
        resource: "/settings/mobile-apps",
        entity_type: "app_releases",
        entity_id: String(savedRelease.id),
        new_value: {
          app_type: appType,
          app_name: appName,
          version_name: versionName,
          version_code: versionCode,
          file_size: fileSize,
          file_name: standardFileName,
          stored_filename: storedFilename,
        },
        details: {
          event: "Mobile APK Build Published",
          app_type: appType,
          app_name: appName,
          package_name: packageName,
          version_name: versionName,
          version_code: versionCode,
          file_size: fileSize,
          min_android: minAndroid,
          release_notes: releaseNotes,
          performed_by: `${performerName} (${performerEmail})`,
          role: performerRole,
          ip_address: clientIp,
          user_agent: userAgent,
          occurred_at: new Date().toISOString(),
        },
      }).catch((err) => console.warn("[app_releases] Audit log error:", err.message));

      // 2. Dispatch real-time system notification and email alert to Administrators
      notifyAdmin({
        type: "mobile_app_action",
        title: `📱 New Mobile APK Uploaded: ${appName} (v${versionName})`,
        message: `${performerName} (${performerEmail}, role: ${performerRole}) successfully uploaded and published a new build for ${appName} (version ${versionName}, build code ${versionCode}, ${fileSize}).`,
        link: "/settings/mobile-apps",
        actor: {
          id: req.user?.id,
          name: performerName,
          email: performerEmail,
          role: performerRole,
        },
        data: {
          action: "New Mobile APK Uploaded & Published",
          app_name: appName,
          app_type: appType,
          version_name: versionName,
          version_code: versionCode,
          file_size: fileSize,
          minimum_android: minAndroid,
          release_notes: releaseNotes || "N/A",
          performed_by: `${performerName} (${performerEmail})`,
          user_role: performerRole,
          date_and_time: `${new Date().toUTCString()} (Local: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })})`,
          ip_address: clientIp,
          user_agent: userAgent,
        },
      }).catch((err) => console.warn("[app_releases] Notification dispatch error:", err.message));

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
