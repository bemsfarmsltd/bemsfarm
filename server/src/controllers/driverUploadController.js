// server/src/controllers/driverUploadController.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/proofs");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `POD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage: storage,
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

// ── POST /api/driver/upload/proof ────────────────────────────────────
// Upload Proof of Delivery (POD) photo from mobile camera
const uploadProofPhoto = async (req, res, next) => {
  try {
    // 1. If multipart file was uploaded via multer
    if (req.file) {
      const baseUrl = process.env.SERVER_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${baseUrl}/uploads/proofs/${req.file.filename}`;

      return res.status(201).json({
        status: "success",
        message: "Proof photo uploaded successfully",
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
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
      const filePath = path.join(uploadDir, savedFilename);

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

module.exports = {
  upload,
  uploadProofPhoto
};
