// Middleware untuk error handling
const errorHandler = (err, req, res, next) => {
    // Hindari log informasi token atau data sensitif lainnya
    // Hanya log pesan error dan kode status
    const safeErr = {
        message: err.message,
        statusCode: err.statusCode || 500
    };

    // Log error tanpa stack trace di production
    if (process.env.NODE_ENV === 'production') {
        console.error(`Error: ${safeErr.statusCode} - ${safeErr.message}`);
    } else {
        // Di development log dengan stack trace, tapi tanpa detail sensitif
        console.error('Error details:', safeErr);
        console.error(err.stack);
    }

    // Response untuk client - hindari mengirim stack trace ke klien di production
    res.status(safeErr.statusCode).json({
        success: false,
        message: safeErr.message || 'Terjadi kesalahan pada server',
        // Hanya kirim stack di development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    errorHandler,
    AppError
}; 