// Route untuk product
const express = require('express');
const router = express.Router();

// Import controllers
const {
    getProductsByBranch,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/product.controller');

// Import middlewares
const { verifyToken, checkRole, checkBranchAccess } = require('../middlewares/auth.middleware');
const { validate, productSchema } = require('../middlewares/validation.middleware');
const { upload, uploadToImageKit } = require('../middlewares/upload.middleware');

// Route untuk mendapatkan semua produk di branch tertentu (public)
router.get('/branch/:branchId', getProductsByBranch);

// Route untuk mendapatkan produk berdasarkan ID (public)
router.get('/branch/:branchId/:id', getProductById);

// Route untuk membuat produk baru (hanya head, owner, super)
router.post(
    '/',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    upload.single('image'),
    uploadToImageKit('products'),
    validate(productSchema),
    createProduct
);

// Route untuk mengupdate produk (hanya head, owner, super)
router.put(
    '/branch/:branchId/:id',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    upload.single('image'),
    uploadToImageKit('products'),
    updateProduct
);

// Route untuk menghapus produk (hanya head, owner, super)
router.delete(
    '/branch/:branchId/:id',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    deleteProduct
);

module.exports = router; 