// Middleware untuk autentikasi dan otorisasi
const { auth, db } = require('../config/firebase');
const { AppError } = require('./error.middleware');
const admin = require('firebase-admin');

// Middleware untuk memverifikasi token Firebase
const verifyToken = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith('Bearer ')) {
            throw new AppError('Token tidak ditemukan', 401);
        }

        token = token.split(' ')[1];

        // Verifikasi token dengan Firebase Auth
        const decodedToken = await auth.verifyIdToken(token);

        // Sembunyi info sensitif di log
        const safeUserId = decodedToken.uid ? `${decodedToken.uid.substring(0, 5)}...` : 'unknown';

        // Tambahkan user ke request
        req.user = decodedToken;

        // Ambil data user dari Firestore
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            // Log dengan informasi terbatas untuk keamanan

            // Coba dapatkan informasi user dari Firebase Auth
            try {
                const userAuth = await admin.auth().getUser(decodedToken.uid);

                // Info email disensor untuk keamanan di log
                const maskedEmail = userAuth.email ?
                    `${userAuth.email.substring(0, 3)}***@${userAuth.email.split('@')[1]}` :
                    'unknown';

                // Jika user tidak ada di Firestore tetapi ada di Firebase Auth
                // Mungkin terjadi karena register tidak berhasil menyimpan ke Firestore
                // Buat dokumen user baru di Firestore
                const userData = {
                    email: userAuth.email,
                    displayName: userAuth.displayName || 'User',
                    role: decodedToken.role || 'customer',
                    status: 'active',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastLogin: admin.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('users').doc(decodedToken.uid).set(userData);

                // Ambil ulang data user dari Firestore
                const newUserDoc = await db.collection('users').doc(decodedToken.uid).get();

                if (!newUserDoc.exists) {
                    throw new AppError('Gagal membuat user di Firestore', 500);
                }

                const newUserData = newUserDoc.data();

                // Validasi akses berdasarkan role - segera setelah pembuatan user
                if (newUserData.role === 'customer') {
                    throw new AppError('Akses ditolak: Aplikasi admin hanya untuk staf Karya Indah', 403);
                }

                // Validasi status user untuk semua role admin
                if (newUserData.status === 'inactive') {
                    throw new AppError('Akun Anda tidak aktif. Hubungi administrator untuk aktivasi', 403);
                }

                req.userData = {
                    id: newUserDoc.id,
                    ...newUserData
                };

                return next();
            } catch (authError) {
                // Jika error adalah AppError, gunakan error tersebut
                if (authError instanceof AppError) {
                    throw authError;
                }
                throw new AppError('User tidak ditemukan', 404);
            }
        }

        const userData = userDoc.data();

        // Validasi akses berdasarkan role - hanya admin, head, owner, dan super yang diizinkan
        if (userData.role === 'customer') {
            throw new AppError('Akses ditolak: Aplikasi admin hanya untuk staf Karya Indah', 403);
        }

        // Validasi status user untuk semua role admin
        if (userData.status === 'inactive') {
            throw new AppError('Akun Anda tidak aktif. Hubungi administrator untuk aktivasi', 403);
        }

        // Tambahkan data user ke request
        req.userData = {
            id: userDoc.id,
            ...userData
        };

        // Update lastLogin
        await db.collection('users').doc(userDoc.id).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }).catch(err => {
            // Log error tapi jangan gagalkan request
            console.warn(`Failed to update lastLogin for user ${safeUserId}`);
        });

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            // Jangan tampilkan detail sensitif error
            next(new AppError('Token tidak valid', 401));
        }
    }
};

// Middleware untuk memeriksa role
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.userData || !req.userData.role) {
                throw new AppError('Akses ditolak: Data user tidak lengkap', 403);
            }

            const { role } = req.userData;

            if (!allowedRoles.includes(role)) {
                throw new AppError(`Akses ditolak: Role ${role} tidak diizinkan`, 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Middleware untuk memeriksa akses ke aplikasi admin
const checkAdminAccess = (req, res, next) => {
    try {
        if (!req.userData || !req.userData.role) {
            throw new AppError('Akses ditolak: Data user tidak lengkap', 403);
        }

        const { role } = req.userData;
        const adminRoles = ['admin', 'head', 'owner', 'super'];

        if (!adminRoles.includes(role)) {
            throw new AppError('Akses ditolak: Aplikasi admin hanya untuk staf Karya Indah', 403);
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware untuk memeriksa akses ke cabang tertentu
const checkBranchAccess = () => {
    return async (req, res, next) => {
        try {
            // Skip untuk role owner dan super yang memiliki akses ke semua cabang
            if (req.userData.role === 'owner' || req.userData.role === 'super') {
                return next();
            }

            // Customer tidak perlu memiliki branchId
            if (req.userData.role === 'customer') {
                return next();
            }

            // Untuk role admin dan head, periksa apakah mereka memiliki akses ke cabang yang diminta
            const requestedBranchId = req.params.branchId || req.body.branchId;

            if (!requestedBranchId) {
                throw new AppError('ID cabang tidak ditemukan dalam request', 400);
            }

            if (!req.userData.branchId) {
                throw new AppError('User tidak memiliki akses ke cabang manapun', 403);
            }

            if (req.userData.branchId !== requestedBranchId) {
                throw new AppError('Akses ditolak: User tidak memiliki akses ke cabang ini', 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    verifyToken,
    checkRole,
    checkAdminAccess,
    checkBranchAccess
}; 