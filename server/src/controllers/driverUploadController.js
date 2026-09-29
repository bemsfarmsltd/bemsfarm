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
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);
const ALLOWED_DOC_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"]);
const ALLOWED_DOC_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

// Configure multer storage for Proof of Delivery
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, proofUploadDir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const ext = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : ".jpg";
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
    const ext = ALLOWED_DOC_EXTS.has(rawExt) ? rawExt : (file.mimetype === "application/pdf" ? ".pdf" : ".jpg");
    const docType = (req.body.doc_type || req.query.type || "DOC").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const unique = `${docType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_IMAGE_EXTS.has(rawExt) && ALLOWED_IMAGE_MIMES.has(mime)) {
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
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_DOC_EXTS.has(rawExt) && ALLOWED_DOC_MIMES.has(mime)) {
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
    const { image_base64, filename } = req.body;
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

// ── POST /api/driver/upload/kyc & /api/driver/upload/document ─────────
// Upload Driver License, NIN slip, Vehicle Registration, or Guarantor document
const uploadKYCDocument = async (req, res, next) => {
  try {
    const docType = (req.body.doc_type || req.query.type || "document").toLowerCase();

    // 1. Multipart file upload
    if (req.file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

      return res.status(201).json({
        status: "success",
        message: "KYC document uploaded successfully",
        doc_type: docType,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }

    // 2. Base64 file upload
    const { file_base64, image_base64, filename } = req.body;
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
      const fileUrl = `${baseUrl}/uploads/documents/${savedFilename}`;

      return res.status(201).json({
        status: "success",
        message: "KYC document saved successfully",
        doc_type: docType,
        url: fileUrl,
        filename: savedFilename,
        size: buffer.length,
        mimetype: mime
      });
    }

    return res.status(400).json({
      status: "error",
      message: "No document file or base64 data provided in request"
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
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_IMAGE_EXTS.has(rawExt) && ALLOWED_IMAGE_MIMES.has(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, HEIC) are permitted for profile photo"));
    }
  }
});

// ── POST /api/driver/upload/avatar & /api/driver/upload/profile-photo ─
// Upload Driver Avatar / Profile picture
const uploadProfilePhoto = async (req, res, next) => {
  try {
    const driverId = req.driver?.id;
    let fileUrl = null;

    if (req.file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      fileUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
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

module.exports = {
  upload,
  uploadDoc,
  uploadAvatar,
  uploadProofPhoto,
  uploadKYCDocument,
  uploadProfilePhoto,
};

