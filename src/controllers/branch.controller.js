// Controller untuk branch
const { db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk mendapatkan semua branch
const getAllBranches = async (req, res, next) => {
    try {
        const branchesSnapshot = await db.collection('branches').get();

        const branches = [];
        branchesSnapshot.forEach(doc => {
            branches.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            count: branches.length,
            data: branches
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan branch berdasarkan ID
const getBranchById = async (req, res, next) => {
    try {
        const branchId = req.params.id;

        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        res.status(200).json({
            success: true,
            data: {
                id: branchDoc.id,
                ...branchDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk membuat branch baru (hanya owner dan super)
const createBranch = async (req, res, next) => {
    try {
        // Validasi role
        if (req.userData.role !== 'owner' && req.userData.role !== 'super') {
            throw new AppError('Akses ditolak', 403);
        }

        const { name, address, contactNumber, whatsappAdmin } = req.body;

        // Tambahkan branch baru
        const newBranchRef = db.collection('branches').doc();

        await newBranchRef.set({
            name,
            address,
            contactNumber,
            whatsappAdmin,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Ambil data branch yang baru dibuat
        const newBranchDoc = await newBranchRef.get();

        res.status(201).json({
            success: true,
            message: 'Branch berhasil dibuat',
            data: {
                id: newBranchDoc.id,
                ...newBranchDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate branch (hanya owner dan super)
const updateBranch = async (req, res, next) => {
    try {
        // Validasi role
        if (req.userData.role !== 'owner' && req.userData.role !== 'super') {
            throw new AppError('Akses ditolak', 403);
        }

        const branchId = req.params.id;
        const { name, address, contactNumber, whatsappAdmin } = req.body;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Data yang akan diupdate
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Tambahkan field yang akan diupdate
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (whatsappAdmin) updateData.whatsappAdmin = whatsappAdmin;

        // Update branch
        await db.collection('branches').doc(branchId).update(updateData);

        // Ambil data branch yang sudah diupdate
        const updatedBranchDoc = await db.collection('branches').doc(branchId).get();

        res.status(200).json({
            success: true,
            message: 'Branch berhasil diupdate',
            data: {
                id: updatedBranchDoc.id,
                ...updatedBranchDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk menghapus branch (hanya super)
const deleteBranch = async (req, res, next) => {
    try {
        // Validasi role
        if (req.userData.role !== 'super') {
            throw new AppError('Akses ditolak', 403);
        }

        const branchId = req.params.id;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah ada user yang terkait dengan branch
        const usersSnapshot = await db.collection('users')
            .where('branchId', '==', branchId)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
            throw new AppError('Tidak dapat menghapus branch karena masih ada user yang terkait', 400);
        }

        // Cek apakah ada produk di branch
        const productsSnapshot = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .limit(1)
            .get();

        if (!productsSnapshot.empty) {
            throw new AppError('Tidak dapat menghapus branch karena masih ada produk di branch ini', 400);
        }

        // Hapus branch
        await db.collection('branches').doc(branchId).delete();

        res.status(200).json({
            success: true,
            message: 'Branch berhasil dihapus',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan jumlah produk di branch tertentu
const getBranchProductCount = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        let count;
        try {
            // Coba gunakan count() jika tersedia (Firestore v9.6.0+)
            const productsSnapshot = await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .count()
                .get();
            count = productsSnapshot.data().count;
        } catch (error) {
            // Fallback jika count() tidak tersedia
            const productsSnapshot = await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .get();
            count = productsSnapshot.size;
        }

        res.status(200).json({
            success: true,
            data: {
                count
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan jumlah karyawan di branch tertentu
const getBranchEmployeeCount = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        let count;
        try {
            // Coba gunakan count() jika tersedia (Firestore v9.6.0+)
            const usersSnapshot = await db.collection('users')
                .where('branchId', '==', branchId)
                .where('role', 'in', ['admin', 'head'])
                .count()
                .get();
            count = usersSnapshot.data().count;
        } catch (error) {
            // Fallback jika count() tidak tersedia
            const usersSnapshot = await db.collection('users')
                .where('branchId', '==', branchId)
                .where('role', 'in', ['admin', 'head'])
                .get();
            count = usersSnapshot.size;
        }

        res.status(200).json({
            success: true,
            data: {
                count
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
    getBranchProductCount,
    getBranchEmployeeCount
}; 