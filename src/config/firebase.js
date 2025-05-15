// Konfigurasi Firebase Admin SDK
const admin = require('firebase-admin');
require('dotenv').config();

// Jika environment variable tidak tersedia, gunakan service account dari file
let firebaseConfig;

if (process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL) {
    // Gunakan environment variables
    firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
} else {
    try {
        // Gunakan service account dari file (untuk development)
        const serviceAccount = require('../../firebase-service-account.json');
        firebaseConfig = serviceAccount;
    } catch (error) {
        console.error('Firebase service account tidak ditemukan:', error.message);
        console.error('Pastikan file firebase-service-account.json ada atau environment variables diatur dengan benar');
        process.exit(1);
    }
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();
const auth = admin.auth();

console.log('Firebase Admin SDK berhasil diinisialisasi');

module.exports = {
    admin,
    db,
    auth
}; 