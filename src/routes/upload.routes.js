// Route untuk upload gambar
const express = require('express');
const router = express.Router();

// Import controllers
const {
    uploadProductImages,
    uploadPaymentProof,
    getProductImages,
    deleteProductImage
} = require('../controllers/upload.controller');

// Import middlewares
const { verifyToken, checkRole, checkBranchAccess } = require('../middlewares/auth.middleware');
const { validateMultipleFiles, validatePaymentFile } = require('../middlewares/upload.middleware');

// Route untuk upload gambar produk (multiple, max 3)
router.post(
    '/product/:branchId/:productId',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    validateMultipleFiles('images', 3),
    uploadProductImages
);

// Route untuk mendapatkan semua gambar produk
router.get(
    '/product/:branchId/:productId',
    getProductImages
);

// Route untuk menghapus gambar produk
router.delete(
    '/product/:branchId/:productId',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    deleteProductImage
);

// Route untuk upload bukti pembayaran order
router.post(
    '/payment/:branchId/:orderId',
    verifyToken,
    validatePaymentFile('image'),
    uploadPaymentProof
);

module.exports = router; 