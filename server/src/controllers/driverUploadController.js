// server/src/controllers/driverUploadController.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const pool = require("../db/pool");

// Ensure upload directories exist
const proofUploadDir = path.join(__dirname, "../../uploads/proofs");
if (!fs.existsSync(proofUploadDir)) {
  fs.mkdirSync(proofUploadDir, { recursive: true });
}

const docUploadDir = path.join(__dirname, "../../uploads/documents");
if (!fs.existsSync(docUploadDir)) {
  fs.mkdirSync(docUploadDir, { recursive: true });
}

const avatarUploadDir = path.join(__dirname, "../../uploads/avatars");
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// Whitelisted file types and extensions
const ALLOWED_IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".bmp",
  ".gif"
]);
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/jfif",
  "image/pjpeg",
  "image/pjp",
  "image/x-png",
  "image/bmp",
  "image/gif"
]);
const ALLOWED_DOC_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".jfif",
  ".pdf"
]);
const ALLOWED_DOC_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/jfif",
  "application/pdf"
]);

// Helper to determine if file is acceptable image
function isAcceptableImage(originalname, mimetype) {
  const rawExt = path.extname(originalname || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();
  return (
    mime.startsWith("image/") ||
    ALLOWED_IMAGE_MIMES.has(mime) ||
    ALLOWED_IMAGE_EXTS.has(rawExt) ||
    ((mime === "application/octet-stream" || !mime) && ALLOWED_IMAGE_EXTS.has(rawExt))
  );
}

// Helper to determine if file is acceptable doc
function isAcceptableDoc(originalname, mimetype) {
  const rawExt = path.extname(originalname || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    ALLOWED_DOC_MIMES.has(mime) ||
    ALLOWED_DOC_EXTS.has(rawExt) ||
    ((mime === "application/octet-stream" || !mime) && ALLOWED_DOC_EXTS.has(rawExt))
  );
}

// Configure multer storage for Proof of Delivery
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, proofUploadDir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    let ext = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : "";
    if (!ext) {
      const mime = (file.mimetype || "").toLowerCase();
      if (mime.includes("png")) ext = ".png";
      else if (mime.includes("webp")) ext = ".webp";
      else if (mime.includes("heic") || mime.includes("heif")) ext = ".heic";
      else ext = ".jpg";
    }
    const unique = `POD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

// Configure multer storage for KYC Documents (NIN, License, Vehicle, Guarantor)
const docStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, docUploadDir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    let ext = ALLOWED_DOC_EXTS.has(rawExt) ? rawExt : "";
    if (!ext) {
      const mime = (file.mimetype || "").toLowerCase();
      if (mime === "application/pdf") ext = ".pdf";
      else if (mime.includes("png")) ext = ".png";
      else if (mime.includes("webp")) ext = ".webp";
      else if (mime.includes("heic") || mime.includes("heif")) ext = ".heic";
      else ext = ".jpg";
    }
    const docType = ((req.body && req.body.doc_type) || (req.query && req.query.type) || "DOC").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const unique = `${docType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (isAcceptableImage(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, HEIC) are permitted"));
    }
  }
});

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: function (req, file, cb) {
    if (isAcceptableDoc(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, HEIC) or PDF documents are permitted"));
    }
  }
});

// ── POST /api/driver/upload/proof ────────────────────────────────────
// Upload Proof of Delivery (POD) photo from mobile camera
const uploadProofPhoto = async (req, res, next) => {
  try {
    // 1. If multipart file was uploaded via multer (accepts 'photo', 'image', 'file', 'proof', etc.)
    const file = req.file || (Array.isArray(req.files) && (req.files.find(f => ['photo', 'image', 'file', 'proof', 'proof_photo'].includes(f.fieldname)) || req.files[0])) || null;
    if (file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/uploads/proofs/${file.filename}`;

      return res.status(201).json({
        status: "success",
        success: true,
        message: "Proof photo uploaded successfully",
        url: fileUrl,
        photo_url: fileUrl,
        photoUrl: fileUrl,
        data: {
          url: fileUrl,
          photo_url: fileUrl,
          photoUrl: fileUrl,
          filename: file.filename,
        },
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    // 2. If base64 data was sent in JSON body { image_base64: "data:image/jpeg;base64,..." }
    const { image_base64, filename } = req.body || {};
    if (image_base64 && typeof image_base64 === "string") {
      const matches = image_base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      let ext = ".jpg";
      let base64Data = image_base64;

      if (matches && matches.length === 3) {
        ext = `.${matches[1].toLowerCase()}`;
        base64Data = matches[2];
      }

      const buffer = Buffer.from(base64Data, "base64");
      const savedFilename = filename || `POD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const filePath = path.join(proofUploadDir, savedFilename);

      fs.writeFileSync(filePath, buffer);

      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/uploads/proofs/${savedFilename}`;

      return res.status(201).json({
        status: "success",
        success: true,
        message: "Proof photo saved successfully",
        url: fileUrl,
        photo_url: fileUrl,
        photoUrl: fileUrl,
        data: {
          url: fileUrl,
          photo_url: fileUrl,
          photoUrl: fileUrl,
          filename: savedFilename,
        },
        filename: savedFilename,
        size: buffer.length,
        mimetype: `image/${ext.replace(".", "")}`
      });
    }

    return res.status(400).json({
      status: "error",
      message: "No image file or image_base64 data provided in request"
    });
  } catch (err) {
    console.error("uploadProofPhoto error:", err.message);
    next(err);
  }
};

// Helper to normalize document field key
function normalizeDocKey(rawKey) {
  const k = String(rawKey || "").toLowerCase().trim();
  if (k.includes("license_back")) return "driver_license_back";
  if (k.includes("license_front")) return "driver_license_front";
  if (k.includes("license") || k.includes("driving")) return "driver_license";
  if (k.includes("vehicle") || k.includes("reg") || k.includes("car")) return "vehicle_registration";
  if (k.includes("passport") || k.includes("avatar") || k.includes("profile") || k.includes("photo")) return "passport_photo";
  if (k.includes("nin") || k.includes("national_id")) return "nin_slip";
  if (k.includes("guarantor")) return "guarantor_form";
  return k || "document";
}

// Helper to persist document to driver DB record
async function persistDriverDocument(driverId, docType, fileUrl, extraBody = {}) {
  if (!driverId) return null;
  try {
    const dRes = await pool.query(
      "SELECT id, documents, avatar_url, license_number, nin_number, vehicle_plate, vehicle_type FROM drivers WHERE id = $1",
      [driverId]
    );
    if (dRes.rows.length === 0) return null;

    const currentDriver = dRes.rows[0];
    let currentDocs = {};
    if (typeof currentDriver.documents === "object" && currentDriver.documents !== null) {
      currentDocs = { ...currentDriver.documents };
    } else if (typeof currentDriver.documents === "string") {
      try { currentDocs = JSON.parse(currentDriver.documents); } catch (e) { currentDocs = {}; }
    }

    const normKey = normalizeDocKey(docType);
    currentDocs[normKey] = fileUrl;
    if (normKey === "driver_license" && !currentDocs.driver_license_front) {
      currentDocs.driver_license_front = fileUrl;
    }

    const updateFields = ["documents = $1::jsonb", "updated_at = NOW()"];
    const updateParams = [JSON.stringify(currentDocs)];

    if (normKey === "passport_photo") {
      updateParams.push(fileUrl);
      updateFields.push(`avatar_url = $${updateParams.length}`);
    }
    if (extraBody.license_number) {
      updateParams.push(extraBody.license_number);
      updateFields.push(`license_number = $${updateParams.length}`);
    }
    if (extraBody.nin_number) {
      updateParams.push(extraBody.nin_number);
      updateFields.push(`nin_number = $${updateParams.length}`);
    }
    if (extraBody.vehicle_plate) {
      updateParams.push(extraBody.vehicle_plate);
      updateFields.push(`vehicle_plate = $${updateParams.length}`);
    }

    // Check completeness
    const hasLicense = Boolean(currentDocs.driver_license || currentDocs.driver_license_front || currentDriver.license_number || extraBody.license_number);
    const hasVeh = Boolean(currentDocs.vehicle_registration || (currentDriver.vehicle_type && (currentDriver.vehicle_plate || extraBody.vehicle_plate)));
    const hasPassport = Boolean(currentDocs.passport_photo || currentDriver.avatar_url || normKey === "passport_photo");
    const hasNin = Boolean(currentDocs.nin_slip || currentDriver.nin_number || extraBody.nin_number);
    const hasGuarantor = Boolean(currentDocs.guarantor_form);

    if (hasLicense && hasVeh && hasPassport && hasNin && hasGuarantor) {
      updateFields.push("onboarding_status = 'documents_submitted'");
    }

    updateParams.push(driverId);
    await pool.query(
      `UPDATE drivers SET ${updateFields.join(", ")} WHERE id = $${updateParams.length}::bigint`,
      updateParams
    );

    return {
      documents: currentDocs,
      checklist: {
        driver_license: hasLicense,
        vehicle_registration: hasVeh,
        passport_photo: hasPassport,
        nin_slip: hasNin,
        guarantor_form: hasGuarantor
      }
    };
  } catch (err) {
    console.warn("persistDriverDocument error:", err.message);
    return null;
  }
}

// ── GET /api/driver/documents & /api/driver/upload/document ───────────
// Retrieve driver compliance documents, upload statuses, and verification checklist
const getDriverDocuments = async (req, res, next) => {
  try {
    let driverId = req.driver?.id;

    // Support query lookup if driver_id / id / phone is passed
    if (!driverId && (req.query?.driver_id || req.query?.driverId || req.query?.id || req.query?.phone)) {
      const lookupParam = req.query.driver_id || req.query.driverId || req.query.id || req.query.phone;
      const lookupCol = req.query.phone ? "phone" : "id";
      const lookupResult = await pool.query(
        `SELECT id, name, email, phone, avatar_url, vehicle_type, vehicle_plate, license_number, nin_number, status, onboarding_status, documents, compliance_notes FROM drivers WHERE ${lookupCol} = $1`,
        [lookupParam]
      );
      if (lookupResult.rows.length > 0) {
        req.driver = lookupResult.rows[0];
        driverId = lookupResult.rows[0].id;
      }
    }

    if (!driverId) {
      return res.status(401).json({
        status: "error",
        success: false,
        message: "Driver authorization required. Please provide Bearer token in Authorization header, ?token= query parameter, or ?driver_id= query parameter."
      });
    }

    const driverResult = await pool.query(
      `SELECT id, name, email, phone, avatar_url, vehicle_type, vehicle_plate, license_number, nin_number, status, onboarding_status, documents, compliance_notes FROM drivers WHERE id = $1`,
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        success: false,
        message: "Driver account not found"
      });
    }

    const driver = driverResult.rows[0];
    let docs = {};
    if (typeof driver.documents === "object" && driver.documents !== null) {
      docs = { ...driver.documents };
    } else if (typeof driver.documents === "string") {
      try { docs = JSON.parse(driver.documents); } catch (e) { docs = {}; }
    }

    const driverLicenseUrl = docs.driver_license || docs.driver_license_front || docs.license || null;
    const vehicleRegUrl = docs.vehicle_registration || docs.vehicle_reg || docs.vehicle || null;
    const passportPhotoUrl = docs.passport_photo || docs.avatar_url || driver.avatar_url || null;
    const ninSlipUrl = docs.nin_slip || docs.nin || null;
    const guarantorFormUrl = docs.guarantor_form || docs.guarantor || null;

    const checklist = {
      driver_license: Boolean(driverLicenseUrl || driver.license_number),
      vehicle_registration: Boolean(vehicleRegUrl || (driver.vehicle_type && driver.vehicle_plate)),
      passport_photo: Boolean(passportPhotoUrl),
      nin_slip: Boolean(ninSlipUrl || driver.nin_number),
      guarantor_form: Boolean(guarantorFormUrl)
    };

    const documentsList = [
      {
        key: "driver_license",
        title: "Driver's License",
        category: "Identification",
        status: checklist.driver_license ? "uploaded" : "missing",
        url: driverLicenseUrl,
        number: driver.license_number || null,
        front_url: docs.driver_license_front || driverLicenseUrl,
        back_url: docs.driver_license_back || null,
        required: true
      },
      {
        key: "vehicle_registration",
        title: "Vehicle Registration",
        category: "Vehicle Compliance",
        status: checklist.vehicle_registration ? "uploaded" : "missing",
        url: vehicleRegUrl,
        plate_number: driver.vehicle_plate || null,
        vehicle_type: driver.vehicle_type || null,
        required: true
      },
      {
        key: "passport_photo",
        title: "Passport Photo / Profile Picture",
        category: "Identification",
        status: checklist.passport_photo ? "uploaded" : "missing",
        url: passportPhotoUrl,
        required: true
      },
      {
        key: "nin_slip",
        title: "National Identity Number (NIN) Slip",
        category: "Government ID",
        status: checklist.nin_slip ? "uploaded" : "missing",
        url: ninSlipUrl,
        nin_number: driver.nin_number || null,
        required: true
      },
      {
        key: "guarantor_form",
        title: "Guarantor Form",
        category: "Verification",
        status: checklist.guarantor_form ? "uploaded" : "missing",
        url: guarantorFormUrl,
        required: true
      }
    ];

    const missingDocuments = documentsList
      .filter(d => d.required && d.status === "missing")
      .map(d => d.key);

    const isComplete = missingDocuments.length === 0;

    const consolidatedDocs = {
      driver_license: driverLicenseUrl,
      driver_license_front: docs.driver_license_front || driverLicenseUrl,
      driver_license_back: docs.driver_license_back || null,
      vehicle_registration: vehicleRegUrl,
      passport_photo: passportPhotoUrl,
      nin_slip: ninSlipUrl,
      guarantor_form: guarantorFormUrl,
      ...docs
    };

    const responseData = {
      driver_id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      avatar_url: passportPhotoUrl,
      status: driver.status,
      onboarding_status: driver.onboarding_status,
      is_verified: driver.status === "active",
      license_number: driver.license_number,
      nin_number: driver.nin_number,
      vehicle_type: driver.vehicle_type,
      vehicle_plate: driver.vehicle_plate,
      documents: consolidatedDocs,
      documents_list: documentsList,
      checklist,
      missing_documents: missingDocuments,
      total_required: documentsList.filter(d => d.required).length,
      uploaded_count: documentsList.filter(d => d.required && d.status === "uploaded").length,
      is_complete: isComplete,
      compliance_notes: driver.compliance_notes || null
    };

    return res.status(200).json({
      status: "success",
      success: true,
      message: isComplete
        ? "All compliance documents have been uploaded."
        : `Pending ${missingDocuments.length} document(s): ${missingDocuments.join(", ")}.`,
      data: responseData,
      documents: consolidatedDocs,
      checklist,
      missing_documents: missingDocuments
    });
  } catch (err) {
    console.error("getDriverDocuments error:", err.message);
    next(err);
  }
};

// ── POST /api/driver/upload/kyc & /api/driver/upload/document ─────────
// Upload Driver License, NIN slip, Vehicle Registration, or Guarantor document
const uploadKYCDocument = async (req, res, next) => {
  try {
    const docType = ((req.body && req.body.doc_type) || (req.query && req.query.type) || "document").toLowerCase();
    const targetDriverId = req.driver?.id || req.body?.driver_id || req.query?.driver_id || req.body?.driverId || req.query?.driverId || null;

    // 1. Multipart file upload
    const file = req.file || (Array.isArray(req.files) && (req.files.find(f => ['document', 'file', 'image', 'kyc'].includes(f.fieldname)) || req.files[0])) || null;
    if (file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/api/driver/documents/file/${file.filename}`;

      // Persist to driver DB record if driver is identified
      const persistResult = await persistDriverDocument(targetDriverId, docType, fileUrl, req.body || {});

      return res.status(201).json({
        status: "success",
        success: true,
        message: "KYC document uploaded successfully",
        doc_type: docType,
        url: fileUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        documents: persistResult?.documents || null,
        checklist: persistResult?.checklist || null,
        data: {
          url: fileUrl,
          doc_type: docType,
          filename: file.filename,
          documents: persistResult?.documents || null,
          checklist: persistResult?.checklist || null
        }
      });
    }

    // 2. Base64 file upload
    const { file_base64, image_base64, filename } = req.body || {};
    const rawBase64 = file_base64 || image_base64;

    if (rawBase64 && typeof rawBase64 === "string") {
      const matches = rawBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      let ext = ".jpg";
      let base64Data = rawBase64;
      let mime = "image/jpeg";

      if (matches && matches.length === 3) {
        mime = matches[1].toLowerCase();
        base64Data = matches[2];
        if (mime.includes("pdf")) ext = ".pdf";
        else if (mime.includes("png")) ext = ".png";
        else if (mime.includes("webp")) ext = ".webp";
      }

      const buffer = Buffer.from(base64Data, "base64");
      const savedFilename = filename || `${docType.toUpperCase()}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const filePath = path.join(docUploadDir, savedFilename);

      fs.writeFileSync(filePath, buffer);

      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/api/driver/documents/file/${savedFilename}`;

      // Persist to driver DB record if driver is identified
      const persistResult = await persistDriverDocument(targetDriverId, docType, fileUrl, req.body || {});

      return res.status(201).json({
        status: "success",
        success: true,
        message: "KYC document saved successfully",
        doc_type: docType,
        url: fileUrl,
        filename: savedFilename,
        size: buffer.length,
        mimetype: mime,
        documents: persistResult?.documents || null,
        checklist: persistResult?.checklist || null,
        data: {
          url: fileUrl,
          doc_type: docType,
          filename: savedFilename,
          documents: persistResult?.documents || null,
          checklist: persistResult?.checklist || null
        }
      });
    }

    return res.status(400).json({
      status: "error",
      success: false,
      message: "No document file or base64 data provided in request. Please upload a file via multipart form-data or pass file_base64 in JSON."
    });
  } catch (err) {
    console.error("uploadKYCDocument error:", err.message);
    next(err);
  }
};

// Configure multer storage for Driver Profile Photo / Avatar
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const ext = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : ".jpg";
    const driverId = req.driver?.id || "DRV";
    const unique = `AVATAR_${driverId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB limit
  fileFilter: function (req, file, cb) {
    if (isAcceptableImage(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, HEIC) are permitted for profile photo"));
    }
  }
});

// Middleware wrappers that intercept Multer errors and return clean HTTP 400 responses
const handleMulter = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: "error",
            success: false,
            message: "File exceeds the allowed size limit. Please upload a smaller file.",
          });
        }
        return res.status(400).json({
          status: "error",
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      return res.status(400).json({
        status: "error",
        success: false,
        message: err.message || "Invalid file format.",
      });
    }
    next();
  });
};

const proofUploadMiddleware = handleMulter(upload.any());
const docUploadMiddleware = handleMulter(uploadDoc.any());
const avatarUploadMiddleware = handleMulter(uploadAvatar.any());

// ── POST /api/driver/upload/avatar & /api/driver/upload/profile-photo ─
// Upload Driver Avatar / Profile picture
const uploadProfilePhoto = async (req, res, next) => {
  try {
    const driverId = req.driver?.id;
    let fileUrl = null;

    const file = req.file || (Array.isArray(req.files) && req.files[0]) || null;
    if (file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      fileUrl = `${baseUrl}/uploads/avatars/${file.filename}`;
    } else {
      const { image, photo, avatar, file_base64, image_base64 } = req.body || {};
      const rawBase64 = image || photo || avatar || file_base64 || image_base64;
      if (rawBase64 && typeof rawBase64 === "string") {
        const matches = rawBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        let ext = ".jpg";
        let base64Data = rawBase64;
        let mime = "image/jpeg";
        if (matches && matches.length === 3) {
          mime = matches[1].toLowerCase();
          base64Data = matches[2];
          if (mime.includes("png")) ext = ".png";
          else if (mime.includes("webp")) ext = ".webp";
        }
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `AVATAR_${driverId || "DRV"}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}${ext}`;
        const filePath = path.join(avatarUploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
        fileUrl = `${baseUrl}/uploads/avatars/${filename}`;
      }
    }

    if (!fileUrl) {
      return res.status(400).json({ status: "error", message: "No photo file or base64 image provided" });
    }

    if (driverId) {
      await pool.query(
        "UPDATE drivers SET avatar_url = $1, updated_at = NOW() WHERE id = $2",
        [fileUrl, driverId]
      );
    }

    res.json({
      status: "success",
      success: true,
      message: "Profile photo updated successfully",
      avatar_url: fileUrl,
      photo_url: fileUrl,
      url: fileUrl,
    });
  } catch (err) {
    console.error("uploadProfilePhoto error:", err.message);
    next(err);
  }
};

// ── GET /api/driver/documents/file/:filename & /api/driver/file/:filename ──
// Serves uploaded driver documents with cross-origin access and robust fallback search
const serveDocumentFile = (req, res) => {
  const rawFile = req.params.filename || req.params[0] || req.query.file || "";
  const filename = path.basename(rawFile);
  if (!filename || filename === "." || filename === "/") {
    return res.status(400).json({ status: "error", message: "Invalid document filename" });
  }

  const searchDirs = [
    path.join(__dirname, "../../uploads/documents"),
    path.join(__dirname, "../../uploads/avatars"),
    path.join(__dirname, "../../uploads/proofs"),
    path.join(__dirname, "../../uploads"),
  ];

  for (const dir of searchDirs) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(candidate);
    }
  }

  return res.status(404).json({ status: "error", message: `Document file '${filename}' not found` });
};

module.exports = {
  upload,
  uploadDoc,
  uploadAvatar,
  proofUploadMiddleware,
  docUploadMiddleware,
  avatarUploadMiddleware,
  uploadProofPhoto,
  uploadKYCDocument,
  uploadProfilePhoto,
  getDriverDocuments,
  serveDocumentFile,
};

