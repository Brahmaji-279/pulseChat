import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

// Ensure upload directory exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

const storage = multer.memoryStorage();

export const uploadMemory = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export const attachmentUploadMemory = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 + 16,
  },
});

function verifyMagicBytes(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

export async function processSecureUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const secureFilename = `${crypto.randomUUID()}.${verifiedExt}`;
    const destinationPath = path.join(ENV.UPLOAD_DIR, secureFilename);

    await fs.promises.writeFile(destinationPath, req.file.buffer);

    // Save relative public path onto request object
    (req as Request & { savedFileUrl?: string }).savedFileUrl = `/uploads/${secureFilename}`;
    next();
  } catch (err) {
    next(err);
  }
}

export async function processAttachmentUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const unsafeExtensions = new Set([
      '.bat', '.cmd', '.com', '.cpl', '.dll', '.exe', '.hta', '.html', '.htm',
      '.jar', '.js', '.jse', '.mjs', '.msi', '.php', '.ps1', '.py', '.rb',
      '.scr', '.sh', '.svg', '.vbs', '.wsf', '.xhtml',
    ]);
    if (unsafeExtensions.has(extension)) {
      res.status(400).json({ success: false, error: 'This file type cannot be shared' });
      return;
    }

    const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
    const secureFilename = `${crypto.randomUUID()}${safeExtension}`;
    const destinationPath = path.join(ENV.UPLOAD_DIR, secureFilename);
    await fs.promises.writeFile(destinationPath, req.file.buffer);

    (req as Request & { savedFileUrl?: string }).savedFileUrl = `/uploads/${secureFilename}`;
    next();
  } catch (err) {
    next(err);
  }
}
