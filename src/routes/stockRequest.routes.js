// Route untuk stock request
const express = require('express');
const router = express.Router();

// Import controllers
const {
    getStockRequestsByBranch,
    getStockRequestById,
    createStockRequest,
    updateStockRequestStatus,
    getPendingStockRequests
} = require('../controllers/stockRequest.controller');

// Import middlewares
const { verifyToken, checkRole, checkBranchAccess } = require('../middlewares/auth.middleware');
const { validate, stockRequestSchema } = require('../middlewares/validation.middleware');

// Route untuk mendapatkan semua stock request di branch tertentu (admin, head, owner, super)
router.get(
    '/branch/:branchId',
    verifyToken,
    checkRole(['admin', 'head', 'owner', 'super']),
    checkBranchAccess(),
    getStockRequestsByBranch
);

// Route untuk mendapatkan stock request berdasarkan ID (admin, head, owner, super)
router.get(
    '/branch/:branchId/:id',
    verifyToken,
    checkRole(['admin', 'head', 'owner', 'super']),
    checkBranchAccess(),
    getStockRequestById
);

// Route untuk membuat stock request baru (admin)
router.post(
    '/',
    verifyToken,
    checkRole(['admin']),
    validate(stockRequestSchema),
    createStockRequest
);

// Route untuk mengupdate status stock request (head, owner, super)
router.patch(
    '/branch/:branchId/:id/status',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    checkBranchAccess(),
    updateStockRequestStatus
);

// Route untuk mendapatkan stock request yang membutuhkan persetujuan (head, owner, super)
router.get(
    '/pending',
    verifyToken,
    checkRole(['head', 'owner', 'super']),
    getPendingStockRequests
);

module.exports = router; 