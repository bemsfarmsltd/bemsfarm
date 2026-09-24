// server/src/controllers/driverUploadController.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

// Ensure upload directories exist
const proofUploadDir = path.join(__dirname, "../../uploads/proofs");
if (!fs.existsSync(proofUploadDir)) {
  fs.mkdirSync(proofUploadDir, { recursive: true });
}

const docUploadDir = path.join(__dirname, "../../uploads/documents");
if (!fs.existsSync(docUploadDir)) {
  fs.mkdirSync(docUploadDir, { recursive: true });
}

// Configure multer storage for Proof of Delivery
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, proofUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
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
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const docType = (req.body.doc_type || req.query.type || "DOC").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const unique = `${docType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) || allowed.test(mime)) {
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
    const allowed = /jpeg|jpg|png|webp|heic|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) || allowed.test(mime) || mime === "application/pdf") {
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
        message: "Proof photo uploaded successfully",
        url: fileUrl,
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
        message: "Proof photo saved successfully",
        url: fileUrl,
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

module.exports = {
  upload,
  uploadDoc,
  uploadProofPhoto,
  uploadKYCDocument
};

