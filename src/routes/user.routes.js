// Route untuk user management
const express = require('express');
const router = express.Router();

// Import controllers
const {
    getAllUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,
    getUsersByBranch,
    resetPassword,
    getUserProfile,
    updateUserProfile
} = require('../controllers/user.controller');

// Import middlewares
const { verifyToken, checkRole, checkAdminAccess } = require('../middlewares/auth.middleware');

// Route untuk mendapatkan semua user (super)
router.get(
    '/',
    verifyToken,
    checkRole(['super']),
    getAllUsers
);

// Route untuk mendapatkan user berdasarkan branch (owner, super)
// Penting: Route spesifik harus didefinisikan sebelum route dengan parameter dinamis
router.get(
    '/branch/:branchId',
    verifyToken,
    checkRole(['owner', 'super']),
    getUsersByBranch
);

// Route untuk mendapatkan profil user sendiri (semua role)
router.get(
    '/:id/profile',
    verifyToken,
    checkAdminAccess,
    getUserProfile
);

// Route untuk mengupdate profil user sendiri (semua role)
router.put(
    '/:id/profile',
    verifyToken,
    checkAdminAccess,
    updateUserProfile
);

// Route untuk mendapatkan user berdasarkan ID (super)
router.get(
    '/:id',
    verifyToken,
    checkRole(['super']),
    getUserById
);

// Route untuk mengupdate user (super)
router.put(
    '/:id',
    verifyToken,
    checkRole(['super']),
    updateUser
);

// Route untuk mengupdate status user (super)
router.patch(
    '/:id/status',
    verifyToken,
    checkRole(['super']),
    updateUserStatus
);

// Route untuk menghapus user (super)
router.delete(
    '/:id',
    verifyToken,
    checkRole(['super']),
    deleteUser
);

// Route untuk reset password user (super)
router.post(
    '/:id/reset-password',
    verifyToken,
    checkRole(['super']),
    resetPassword
);

module.exports = router; 