// Route untuk autentikasi
const express = require('express');
const router = express.Router();

// Import controllers
const {
    register,
    login,
    getMe,
    createUser
} = require('../controllers/auth.controller');

// Import middlewares
const { verifyToken, checkRole, checkAdminAccess } = require('../middlewares/auth.middleware');
const { validate, registerSchema, loginSchema, userSchema } = require('../middlewares/validation.middleware');

// Route untuk register customer
router.post('/register', validate(registerSchema), register);

// Route untuk login
router.post('/login', validate(loginSchema), login);

// Route untuk mendapatkan data user dari token (hanya untuk admin, head, owner, super)
router.get('/me', verifyToken, checkAdminAccess, getMe);

// Route untuk membuat user baru (admin, head, owner, super) oleh superadmin
router.post('/users', verifyToken, checkRole(['super']), validate(userSchema), createUser);

module.exports = router; 