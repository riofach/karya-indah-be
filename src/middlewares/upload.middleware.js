// Middleware untuk upload gambar dengan multer dan imagekit
const multer = require('multer');
const imagekit = require('../config/imagekit');
const { AppError } = require('./error.middleware');
const path = require('path');

// Konfigurasi penyimpanan multer (memory storage)
const storage = multer.memoryStorage();

// Filter file untuk memastikan hanya gambar yang diupload
const fileFilter = (req, file, cb) => {
    // Daftar tipe file yang diizinkan
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Format file tidak didukung. Gunakan JPEG, JPG, PNG, atau WEBP', 400), false);
    }
};

// Konfigurasi multer untuk upload produk (8MB)
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB
    }
});

// Konfigurasi multer untuk upload bukti pembayaran (2MB)
const uploadPayment = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

// Middleware untuk upload ke ImageKit
const uploadToImageKit = (folderPath) => {
    return async (req, res, next) => {
        try {
            if (!req.file) {
                return next();
            }

            // Generate unique filename
            const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;

            // Upload file ke ImageKit
            const uploadResponse = await imagekit.upload({
                file: req.file.buffer.toString('base64'),
                fileName: uniqueFilename,
                folder: folderPath || 'catco-paint'
            });

            // Tambahkan URL gambar ke request
            req.fileUrl = uploadResponse.url;
            req.fileId = uploadResponse.fileId;

            next();
        } catch (error) {
            next(new AppError(`Gagal mengupload gambar: ${error.message}`, 500));
        }
    };
};

// Middleware untuk upload multiple file ke ImageKit
// Catatan: Middleware ini tidak langsung mengupload ke ImageKit
// Upload akan ditangani oleh controller
const validateMultipleFiles = (fieldName, maxCount) => {
    return (req, res, next) => {
        return upload.array(fieldName, maxCount)(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new AppError(`Maksimal ${maxCount} file yang diizinkan`, 400));
                }
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('Ukuran file terlalu besar (maksimal 8MB)', 400));
                }
                return next(new AppError(`Error upload: ${err.message}`, 400));
            } else if (err) {
                return next(err);
            }
            next();
        });
    };
};

// Middleware untuk memvalidasi ukuran file bukti pembayaran
const validatePaymentFile = (fieldName) => {
    return (req, res, next) => {
        return uploadPayment.single(fieldName)(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('Ukuran file bukti pembayaran terlalu besar (maksimal 2MB)', 400));
                }
                return next(new AppError(`Error upload: ${err.message}`, 400));
            } else if (err) {
                return next(err);
            }
            next();
        });
    };
};

module.exports = {
    upload,
    uploadPayment,
    uploadToImageKit,
    validateMultipleFiles,
    validatePaymentFile
}; 