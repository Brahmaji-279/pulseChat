"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMemory = void 0;
exports.processSecureUpload = processSecureUpload;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const env_js_1 = require("../config/env.js");
// Ensure upload directory exists
if (!fs_1.default.existsSync(env_js_1.ENV.UPLOAD_DIR)) {
    fs_1.default.mkdirSync(env_js_1.ENV.UPLOAD_DIR, { recursive: true });
}
const storage = multer_1.default.memoryStorage();
exports.uploadMemory = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});
function verifyMagicBytes(buffer) {
    if (buffer.length < 12)
        return null;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47) {
        return 'png';
    }
    // WEBP: RIFF .... WEBP
    if (buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50) {
        return 'webp';
    }
    return null;
}
async function processSecureUpload(req, res, next) {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No file uploaded' });
            return;
        }
        const verifiedExt = verifyMagicBytes(req.file.buffer);
        if (!verifiedExt) {
            res.status(400).json({
                success: false,
                error: 'File signature does not match a valid image format',
            });
            return;
        }
        const secureFilename = `${crypto_1.default.randomUUID()}.${verifiedExt}`;
        const destinationPath = path_1.default.join(env_js_1.ENV.UPLOAD_DIR, secureFilename);
        await fs_1.default.promises.writeFile(destinationPath, req.file.buffer);
        // Save relative public path onto request object
        req.savedFileUrl = `/uploads/${secureFilename}`;
        next();
    }
    catch (err) {
        next(err);
    }
}
