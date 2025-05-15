// Controller untuk user management
const { auth, db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk mendapatkan semua user (super)
const getAllUsers = async (req, res, next) => {
    try {
        // Ambil semua user dari Firestore
        const usersSnapshot = await db.collection('users').get();

        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan user berdasarkan ID (super)
const getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('User tidak ditemukan', 404);
        }

        res.status(200).json({
            success: true,
            data: {
                id: userDoc.id,
                ...userDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate user (super)
const updateUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { displayName, role, branchId, numberTelp } = req.body;

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('User tidak ditemukan', 404);
        }

        const userData = userDoc.data();

        // Validasi role
        const validRoles = ['customer', 'admin', 'head', 'owner', 'super'];
        if (role && !validRoles.includes(role)) {
            throw new AppError('Role tidak valid', 400);
        }

        // Validasi branchId untuk role admin dan head
        if ((role === 'admin' || role === 'head' || (userData.role === 'admin' || userData.role === 'head')) && branchId) {
            const branchDoc = await db.collection('branches').doc(branchId).get();
            if (!branchDoc.exists) {
                throw new AppError('Branch tidak ditemukan', 404);
            }
        }

        // Data yang akan diupdate
        const updateData = {};

        // Tambahkan field yang akan diupdate
        if (displayName) updateData.displayName = displayName;
        if (role) updateData.role = role;
        if (numberTelp) updateData.numberTelp = numberTelp;

        // Update branchId berdasarkan role
        if (role === 'admin' || role === 'head') {
            if (!branchId) {
                throw new AppError('BranchId diperlukan untuk role admin dan head', 400);
            }
            updateData.branchId = branchId;
        } else if (role && role !== 'admin' && role !== 'head') {
            // Hapus branchId jika role bukan admin atau head
            updateData.branchId = admin.firestore.FieldValue.delete();
        } else if (branchId) {
            // Jika role tidak berubah tapi branchId berubah
            updateData.branchId = branchId;
        }

        // Update user di Firestore
        await db.collection('users').doc(userId).update(updateData);

        // Update custom claims di Firebase Auth
        if (role) {
            await admin.auth().setCustomUserClaims(userId, { role });
        }

        // Ambil data user yang sudah diupdate
        const updatedUserDoc = await db.collection('users').doc(userId).get();

        res.status(200).json({
            success: true,
            message: 'User berhasil diupdate',
            data: {
                id: updatedUserDoc.id,
                ...updatedUserDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate status user (super)
const updateUserStatus = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;

        // Hanya superadmin yang bisa mengupdate status
        if (req.userData.role !== 'super') {
            throw new AppError('Akses ditolak, hanya Super Admin yang dapat mengubah status pengguna', 403);
        }

        // Validasi status
        const validStatus = ['active', 'inactive'];
        if (!status || !validStatus.includes(status)) {
            throw new AppError('Status tidak valid. Gunakan "active" atau "inactive"', 400);
        }

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('User tidak ditemukan', 404);
        }

        const userData = userDoc.data();

        // Cek apakah user yang akan diupdate adalah super admin
        if (userData.role === 'super') {
            throw new AppError('Tidak dapat mengubah status Super Admin', 400);
        }

        // Update status user di Firestore
        await db.collection('users').doc(userId).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Ambil data user yang sudah diupdate
        const updatedUserDoc = await db.collection('users').doc(userId).get();

        res.status(200).json({
            success: true,
            message: `Status user berhasil diubah menjadi ${status}`,
            data: {
                id: updatedUserDoc.id,
                ...updatedUserDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk menghapus user (super)
const deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('User tidak ditemukan', 404);
        }

        // Cek apakah user yang akan dihapus adalah super
        const userData = userDoc.data();
        if (userData.role === 'super') {
            // Hitung jumlah user dengan role super
            const superUsersSnapshot = await db.collection('users')
                .where('role', '==', 'super')
                .get();

            if (superUsersSnapshot.size <= 1) {
                throw new AppError('Tidak dapat menghapus user super terakhir', 400);
            }
        }

        // Hapus user dari Firebase Auth
        await admin.auth().deleteUser(userId);

        // Hapus user dari Firestore
        await db.collection('users').doc(userId).delete();

        res.status(200).json({
            success: true,
            message: 'User berhasil dihapus',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan user berdasarkan branch (owner, super)
const getUsersByBranch = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil semua user dengan branchId yang sesuai
        const usersSnapshot = await db.collection('users')
            .where('branchId', '==', branchId)
            .get();

        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk reset password user (super)
const resetPassword = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            throw new AppError('Password baru harus memiliki minimal 6 karakter', 400);
        }

        // Cek apakah user ada
        const userRecord = await admin.auth().getUser(userId).catch(() => null);

        if (!userRecord) {
            throw new AppError('User tidak ditemukan', 404);
        }

        // Reset password
        await admin.auth().updateUser(userId, {
            password: newPassword
        });

        res.status(200).json({
            success: true,
            message: 'Password berhasil direset',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan profil user sendiri (semua role)
const getUserProfile = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Periksa apakah user memiliki akses ke profil ini
        // Admin hanya bisa melihat profil dirinya sendiri
        if (req.userData.role !== 'super' && req.userData.role !== 'owner' && req.userData.id !== userId) {
            throw new AppError('Akses ditolak. Anda hanya dapat melihat profil Anda sendiri.', 403);
        }

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('Profil tidak ditemukan', 404);
        }

        // Ambil data cabang jika ada branchId
        const userData = userDoc.data();
        let branchData = null;

        if (userData.branchId) {
            const branchDoc = await db.collection('branches').doc(userData.branchId).get();
            if (branchDoc.exists) {
                branchData = {
                    id: branchDoc.id,
                    name: branchDoc.data().name,
                    address: branchDoc.data().address
                };
            }
        }

        // Format waktu bergabung dan login terakhir
        const joinDate = userData.createdAt ? userData.createdAt.toDate().toISOString() : null;
        const lastActive = userData.lastLogin ? userData.lastLogin.toDate().toISOString() : null;

        const profile = {
            id: userDoc.id,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            status: userData.status,
            branchId: userData.branchId,
            branchName: branchData ? branchData.name : null,
            branchAddress: branchData ? branchData.address : null,
            numberTelp: userData.numberTelp || null,
            joinDate,
            lastActive
        };

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk update profil user sendiri (semua role)
const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.params.id;

        // Validasi hanya dapat update profil sendiri kecuali super admin
        if (req.userData.role !== 'super' && req.userData.id !== userId) {
            throw new AppError('Akses ditolak. Anda hanya dapat mengupdate profil Anda sendiri.', 403);
        }

        const { displayName, numberTelp } = req.body;

        // Validasi input
        if (!displayName && !numberTelp) {
            throw new AppError('Tidak ada data yang diupdate', 400);
        }

        // Validasi format
        if (numberTelp && !/^[0-9+\-\s]+$/.test(numberTelp)) {
            throw new AppError('Format nomor telepon tidak valid', 400);
        }

        // Ambil user dari Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new AppError('User tidak ditemukan', 404);
        }

        // Data yang akan diupdate
        const updateData = {};

        if (displayName) {
            updateData.displayName = displayName;

            // Update juga displayName di Firebase Auth
            await admin.auth().updateUser(userId, {
                displayName
            });
        }

        if (numberTelp) {
            updateData.numberTelp = numberTelp;
        }

        // Tambahkan timestamp update
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update user di Firestore
        await db.collection('users').doc(userId).update(updateData);

        // Ambil data user yang sudah diupdate
        const updatedUserDoc = await db.collection('users').doc(userId).get();
        const updatedData = updatedUserDoc.data();

        // Tambahkan informasi cabang jika ada
        let branchData = null;
        if (updatedData.branchId) {
            const branchDoc = await db.collection('branches').doc(updatedData.branchId).get();
            if (branchDoc.exists) {
                branchData = {
                    id: branchDoc.id,
                    name: branchDoc.data().name
                };
            }
        }

        res.status(200).json({
            success: true,
            message: 'Profil berhasil diupdate',
            data: {
                id: updatedUserDoc.id,
                displayName: updatedData.displayName,
                email: updatedData.email,
                role: updatedData.role,
                branchId: updatedData.branchId,
                branchName: branchData ? branchData.name : null,
                numberTelp: updatedData.numberTelp || null
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,
    getUsersByBranch,
    resetPassword,
    getUserProfile,
    updateUserProfile
}; 