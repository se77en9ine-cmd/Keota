import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/products');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `prod-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed'));
  }
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const CUSTOMER_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/customers');
if (!fs.existsSync(CUSTOMER_UPLOAD_DIR)) {
  fs.mkdirSync(CUSTOMER_UPLOAD_DIR, { recursive: true });
}

const customerStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(CUSTOMER_UPLOAD_DIR)) {
      fs.mkdirSync(CUSTOMER_UPLOAD_DIR, { recursive: true });
    }
    cb(null, CUSTOMER_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `cust-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

export const uploadCustomerAvatar = multer({
  storage: customerStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const SUPPLIER_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/suppliers');
if (!fs.existsSync(SUPPLIER_UPLOAD_DIR)) {
  fs.mkdirSync(SUPPLIER_UPLOAD_DIR, { recursive: true });
}

const supplierStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(SUPPLIER_UPLOAD_DIR)) {
      fs.mkdirSync(SUPPLIER_UPLOAD_DIR, { recursive: true });
    }
    cb(null, SUPPLIER_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `sup-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

export const uploadSupplierLogo = multer({
  storage: supplierStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const PLATFORM_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/platforms');
if (!fs.existsSync(PLATFORM_UPLOAD_DIR)) {
  fs.mkdirSync(PLATFORM_UPLOAD_DIR, { recursive: true });
}

const platformStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(PLATFORM_UPLOAD_DIR)) {
      fs.mkdirSync(PLATFORM_UPLOAD_DIR, { recursive: true });
    }
    cb(null, PLATFORM_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `plt-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

export const uploadPlatformLogo = multer({
  storage: platformStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const USER_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/users');
if (!fs.existsSync(USER_UPLOAD_DIR)) {
  fs.mkdirSync(USER_UPLOAD_DIR, { recursive: true });
}

const userStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    if (!fs.existsSync(USER_UPLOAD_DIR)) {
      fs.mkdirSync(USER_UPLOAD_DIR, { recursive: true });
    }
    cb(null, USER_UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `user-${cleanName}-${uniqueSuffix}${ext}`);
  },
});

export const uploadUserAvatar = multer({
  storage: userStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});



