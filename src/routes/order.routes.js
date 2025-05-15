// Route untuk order
const express = require('express');
const router = express.Router();

// Import controllers
const {
    getOrdersByBranch,
    getOrderById,
    getOrdersByCustomer,
    createOrder,
    updateOrderStatus,
    getOrderReports
} = require('../controllers/order.controller');

// Import middlewares
const { verifyToken, checkRole, checkBranchAccess } = require('../middlewares/auth.middleware');
const { validate, orderSchema } = require('../middlewares/validation.middleware');

// Route untuk mendapatkan semua order di branch tertentu (admin, head, owner, super)
router.get(
    '/branch/:branchId',
    verifyToken,
    checkRole(['admin', 'head', 'owner', 'super']),
    checkBranchAccess(),
    getOrdersByBranch
);

// Route untuk mendapatkan order berdasarkan ID (admin, head, owner, super, customer)
router.get(
    '/branch/:branchId/:id',
    verifyToken,
    checkBranchAccess(),
    getOrderById
);

// Route untuk mendapatkan order berdasarkan customer (customer)
router.get(
    '/my-orders',
    verifyToken,
    checkRole(['customer']),
    getOrdersByCustomer
);

// Route untuk membuat order baru (customer)
router.post(
    '/',
    verifyToken,
    checkRole(['customer']),
    validate(orderSchema),
    createOrder
);

// Route untuk mengupdate status order (admin, head, owner, super)
router.patch(
    '/branch/:branchId/:id/status',
    verifyToken,
    checkRole(['admin', 'head', 'owner', 'super']),
    checkBranchAccess(),
    updateOrderStatus
);

// Route untuk mendapatkan laporan order (owner, super)
router.get(
    '/reports',
    verifyToken,
    checkRole(['owner', 'super']),
    getOrderReports
);

module.exports = router; 