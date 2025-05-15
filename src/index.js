// Main entry point aplikasi backend
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/error.middleware');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const branchRoutes = require('./routes/branch.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const stockRequestRoutes = require('./routes/stockRequest.routes');
const uploadRoutes = require('./routes/upload.routes');
const rajaongkirRoutes = require('./routes/rajaongkir.routes');

// Inisialisasi aplikasi Express
const app = express();

// Setup logger sederhana untuk produksi yang menghilangkan informasi sensitif
const logger = {
    info: (message) => {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[INFO] ${message}`);
        }
    },
    warn: (message) => {
        if (process.env.NODE_ENV !== 'test') {
            console.warn(`[WARN] ${message}`);
        }
    },
    error: (message) => {
        if (process.env.NODE_ENV !== 'test') {
            console.error(`[ERROR] ${message}`);
        }
    }
};

// Simpan logger di app.locals untuk digunakan di controller
app.locals.logger = logger;

// Middleware
app.use(cors());

// Meningkatkan batas ukuran payload untuk JSON dan form data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log requests hanya di development, tanpa menampilkan data sensitif
if (process.env.NODE_ENV === 'development') {
    // Format morgan yang menyembunyikan token authorization
    app.use(morgan(':method :url :status :response-time ms - :remote-addr', {
        skip: (req) => req.originalUrl.includes('/api/auth')
    }));
}

// Security headers untuk mencegah berbagai serangan
app.use((req, res, next) => {
    // Disable X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Menetapkan security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');

    next();
});

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock-requests', stockRequestRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/rajaongkir', rajaongkirRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'Selamat datang di API Karya Indah Paint',
        version: '1.0.0'
    });
});

// Error handling middleware
app.use(errorHandler);

// Export aplikasi untuk server.js
module.exports = app; 