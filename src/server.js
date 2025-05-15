// Server aplikasi Karya Indah Paint
const app = require('./index');
require('dotenv').config();

// Setup port
const PORT = process.env.PORT || 5000;

// Mulai server
app.listen(PORT, () => {
    const startMessage = `Server berjalan di ${process.env.NODE_ENV === 'production' ? 'produksi' : 'development'} mode pada port ${PORT}`;
    app.locals.logger.info(startMessage);
});

// Handle unhandled Promise rejections
process.on('unhandledRejection', (err) => {
    app.locals.logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    app.locals.logger.error(`${err.name}: ${err.message}`);

    // Dalam produksi, log hanya informasi penting, bukan stack trace lengkap
    if (process.env.NODE_ENV !== 'production') {
        app.locals.logger.error(err.stack);
    }

    // Tutup server dan keluar dari proses
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    app.locals.logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    app.locals.logger.error(`${err.name}: ${err.message}`);

    // Dalam produksi, log hanya informasi penting, bukan stack trace lengkap
    if (process.env.NODE_ENV !== 'production') {
        app.locals.logger.error(err.stack);
    }

    process.exit(1);
}); 