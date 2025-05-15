// Controller untuk autentikasi
const { auth, db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk register customer
const register = async (req, res, next) => {
    try {
        const { email, password, displayName } = req.body;

        // Hindari log email lengkap untuk keamanan
        const maskedEmail = email ?
            `${email.substring(0, 3)}***@${email.split('@')[1]}` :
            'unknown';

        // Cek apakah email sudah terdaftar
        const userRecord = await admin.auth().getUserByEmail(email).catch((err) => {
            if (err.code !== 'auth/user-not-found') {
                // Hanya log kode error, bukan detail sensitif
                req.app.locals.logger?.warn(`Auth error code: ${err.code || 'unknown'}`);
            }
            return null;
        });

        if (userRecord) {
            throw new AppError('Email sudah terdaftar', 400);
        }

        // Buat user di Firebase Auth
        const newUser = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        // Set custom claims untuk role
        await admin.auth().setCustomUserClaims(newUser.uid, { role: 'customer' });

        // Simpan data user di Firestore
        const userData = {
            email,
            displayName,
            role: 'customer',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(newUser.uid).set(userData);

        // Buat token untuk user baru
        const token = await admin.auth().createCustomToken(newUser.uid);

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            data: {
                uid: newUser.uid,
                email: newUser.email,
                displayName: newUser.displayName,
                role: 'customer',
                status: 'active',
                token
            }
        });
    } catch (error) {
        // Hindari log error sensitif
        if (error instanceof AppError) {
            next(error);
        } else if (error.code) {
            // Hanya log kode error, bukan detail lengkap
            req.app.locals.logger?.error(`Firebase error: ${error.code}`);

            // Konversi kode error Firebase menjadi pesan AppError yang lebih user-friendly
            if (error.code === 'auth/email-already-exists') {
                next(new AppError('Email sudah terdaftar', 400));
            } else if (error.code === 'auth/invalid-email') {
                next(new AppError('Format email tidak valid', 400));
            } else if (error.code === 'auth/weak-password') {
                next(new AppError('Password terlalu lemah', 400));
            } else {
                next(new AppError('Registrasi gagal', 400));
            }
        } else {
            next(new AppError('Registrasi gagal', 400));
        }
    }
};

// Fungsi untuk login - hanya untuk keperluan API docs, login dilakukan via Firebase Auth SDK di client
const login = async (req, res, next) => {
    res.status(400).json({
        success: false,
        message: 'Login hanya dapat dilakukan melalui Firebase Auth di frontend'
    });
};

// Fungsi untuk mendapatkan data user dari token
const getMe = async (req, res, next) => {
    try {
        if (!req.userData) {
            throw new AppError('User tidak ditemukan', 404);
        }

        res.status(200).json({
            success: true,
            data: req.userData
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk membuat user baru (admin, head, owner, super) oleh superadmin
const createUser = async (req, res, next) => {
    try {
        const { email, password, displayName, role, branchId, numberTelp } = req.body;

        // Hanya superadmin yang bisa membuat user admin, head, owner, dan super
        if (req.userData.role !== 'super') {
            throw new AppError('Akses ditolak', 403);
        }

        // Validasi role
        const validRoles = ['admin', 'head', 'owner', 'super'];
        if (!validRoles.includes(role)) {
            throw new AppError('Role tidak valid', 400);
        }

        // Validasi branchId untuk role admin dan head
        if ((role === 'admin' || role === 'head') && !branchId) {
            throw new AppError('BranchId diperlukan untuk role admin dan head', 400);
        }

        // Cek apakah branch ada
        if (branchId) {
            const branchDoc = await db.collection('branches').doc(branchId).get();
            if (!branchDoc.exists) {
                throw new AppError('Branch tidak ditemukan', 404);
            }
        }

        // Cek apakah email sudah terdaftar
        const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);

        if (userRecord) {
            throw new AppError('Email sudah terdaftar', 400);
        }

        // Buat user di Firebase Auth
        const newUser = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        // Set custom claims untuk role
        await admin.auth().setCustomUserClaims(newUser.uid, { role });

        // Data user untuk Firestore
        const userData = {
            email,
            displayName,
            role,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        };

        // Tambahkan numberTelp jika ada
        if (numberTelp) {
            userData.numberTelp = numberTelp;
        }

        // Tambahkan branchId jika role adalah admin atau head
        if (role === 'admin' || role === 'head') {
            userData.branchId = branchId;
        }

        // Simpan data user di Firestore
        await db.collection('users').doc(newUser.uid).set(userData);

        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            data: {
                uid: newUser.uid,
                ...userData
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error.code) {
            // Konversi kode error Firebase menjadi pesan AppError
            if (error.code === 'auth/email-already-exists') {
                next(new AppError('Email sudah terdaftar', 400));
            } else if (error.code === 'auth/invalid-email') {
                next(new AppError('Format email tidak valid', 400));
            } else if (error.code === 'auth/weak-password') {
                next(new AppError('Password terlalu lemah', 400));
            } else {
                next(new AppError('Gagal membuat user', 400));
            }
        } else {
            next(new AppError('Gagal membuat user', 400));
        }
    }
};

module.exports = {
    register,
    login,
    getMe,
    createUser
}; 