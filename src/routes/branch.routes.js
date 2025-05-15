// Route untuk branch
const express = require('express');
const router = express.Router();

// Import controllers
const {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchProductCount,
    getBranchEmployeeCount
} = require('../controllers/branch.controller');

// Import middlewares
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validate, branchSchema } = require('../middlewares/validation.middleware');

// Route untuk mendapatkan semua branch (public)
router.get('/', getAllBranches);

// Route untuk mendapatkan branch berdasarkan ID (public)
router.get('/:id', getBranchById);

// Route untuk mendapatkan jumlah produk di branch (public)
router.get('/:branchId/products/count', getBranchProductCount);

// Route untuk mendapatkan jumlah karyawan di branch (public)
router.get('/:branchId/employees/count', getBranchEmployeeCount);

// Route untuk membuat branch baru (hanya owner dan super)
router.post('/', verifyToken, checkRole(['owner', 'super']), validate(branchSchema), createBranch);

// Route untuk mengupdate branch (hanya owner dan super)
router.put('/:id', verifyToken, checkRole(['owner', 'super']), validate(branchSchema), updateBranch);

// Route untuk menghapus branch (hanya super)
router.delete('/:id', verifyToken, checkRole(['super']), deleteBranch);

module.exports = router; 