// Konfigurasi ImageKit
const ImageKit = require('imagekit');
require('dotenv').config();

// Validasi environment variables
if (!process.env.IMAGEKIT_PUBLIC_KEY ||
    !process.env.IMAGEKIT_PRIVATE_KEY ||
    !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.error('ImageKit configuration is missing. Please check your .env file.');
}

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

console.log('ImageKit berhasil diinisialisasi');

module.exports = imagekit; 