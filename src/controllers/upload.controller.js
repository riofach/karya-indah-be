// Controller untuk upload gambar
const { db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');
const imagekit = require('../config/imagekit');

// Fungsi untuk upload gambar produk (multiple, max 3)
const uploadProductImages = async (req, res, next) => {
    try {
        // Cek apakah ada file yang diupload
        if (!req.files || req.files.length === 0) {
            throw new AppError('Tidak ada file yang diupload', 400);
        }

        // Cek jumlah file (maksimal 3)
        if (req.files.length > 3) {
            throw new AppError('Maksimal 3 gambar produk yang diizinkan', 400);
        }

        const { branchId, productId } = req.params;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah produk ada
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .get();

        if (!productDoc.exists) {
            throw new AppError('Produk tidak ditemukan', 404);
        }

        // Cek apakah produk sudah memiliki gambar
        const productData = productDoc.data();
        let existingImageUrls = productData.imageUrls || [];

        // Jika jumlah gambar yang ada + yang akan diupload > 3, tolak
        if (existingImageUrls.length + req.files.length > 3) {
            throw new AppError(`Produk sudah memiliki ${existingImageUrls.length} gambar, maksimal total 3 gambar`, 400);
        }

        // Upload semua gambar ke ImageKit
        const uploadResults = [];
        const newImageUrls = [];

        for (const file of req.files) {
            const uploadResponse = await imagekit.upload({
                file: file.buffer.toString('base64'),
                fileName: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`,
                folder: 'product-ki'
            });

            uploadResults.push(uploadResponse);
            newImageUrls.push(uploadResponse.url);
        }

        // Gabungkan gambar yang ada dengan gambar baru
        const allImageUrls = [...existingImageUrls, ...newImageUrls];

        // Update produk dengan array URL gambar
        const updateData = {
            imageUrls: allImageUrls,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Jika belum ada gambar utama, gunakan gambar pertama
        if (!productData.imageUrl && allImageUrls.length > 0) {
            updateData.imageUrl = allImageUrls[0];
        }

        await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .update(updateData);

        res.status(200).json({
            success: true,
            message: `${uploadResults.length} gambar produk berhasil diupload`,
            data: {
                imageUrls: allImageUrls,
                imageUrl: updateData.imageUrl || productData.imageUrl,
                totalImages: allImageUrls.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk upload bukti pembayaran order
const uploadPaymentProof = async (req, res, next) => {
    try {
        // Cek apakah ada file yang diupload
        if (!req.file) {
            throw new AppError('Tidak ada file yang diupload', 400);
        }

        const { branchId, orderId } = req.params;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah order ada
        const orderDoc = await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc(orderId)
            .get();

        if (!orderDoc.exists) {
            throw new AppError('Order tidak ditemukan', 404);
        }

        // Cek apakah order milik customer yang sedang login
        const orderData = orderDoc.data();
        if (orderData.customerId !== req.userData.id && req.userData.role === 'customer') {
            throw new AppError('Anda tidak memiliki akses ke order ini', 403);
        }

        // Cek apakah status order adalah pending
        if (orderData.status !== 'pending') {
            throw new AppError('Bukti pembayaran hanya bisa diupload untuk order dengan status pending', 400);
        }

        // Cek apakah bukti pembayaran sudah pernah diupload
        if (orderData.imageUrl) {
            // Hapus gambar lama dari ImageKit
            try {
                const fileId = orderData.imageUrl.split('/').pop().split('.')[0];
                await imagekit.deleteFile(fileId);
            } catch (error) {
                console.error('Gagal menghapus gambar lama dari ImageKit:', error.message);
                // Lanjutkan meskipun gagal menghapus dari ImageKit
            }
        }

        // Upload gambar ke ImageKit
        const uploadResponse = await imagekit.upload({
            file: req.file.buffer.toString('base64'),
            fileName: `payment-${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`,
            folder: 'payment-ki'
        });

        // Update order dengan URL bukti pembayaran
        await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc(orderId)
            .update({
                imageUrl: uploadResponse.url,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        res.status(200).json({
            success: true,
            message: 'Bukti pembayaran berhasil diupload',
            data: {
                imageUrl: uploadResponse.url
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan semua gambar produk
const getProductImages = async (req, res, next) => {
    try {
        const { branchId, productId } = req.params;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah produk ada
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .get();

        if (!productDoc.exists) {
            throw new AppError('Produk tidak ditemukan', 404);
        }

        const productData = productDoc.data();

        // Ambil URL gambar
        const imageUrls = productData.imageUrls || [];
        const imageUrl = productData.imageUrl || null;

        // Jika hanya ada imageUrl tapi tidak ada imageUrls, tambahkan ke array
        if (imageUrl && imageUrls.length === 0) {
            imageUrls.push(imageUrl);
        }

        res.status(200).json({
            success: true,
            data: {
                imageUrls: imageUrls,
                imageUrl: imageUrl, // URL gambar utama
                totalImages: imageUrls.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk menghapus gambar produk
const deleteProductImage = async (req, res, next) => {
    try {
        const { branchId, productId } = req.params;
        const { imageUrl } = req.body;

        if (!imageUrl) {
            throw new AppError('URL gambar diperlukan', 400);
        }

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah produk ada
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .get();

        if (!productDoc.exists) {
            throw new AppError('Produk tidak ditemukan', 404);
        }

        const productData = productDoc.data();

        // Cek apakah gambar ada di produk
        const imageUrls = productData.imageUrls || [];
        if (!imageUrls.includes(imageUrl)) {
            throw new AppError('Gambar tidak ditemukan di produk ini', 404);
        }

        // Hapus gambar dari ImageKit
        try {
            // Ekstrak fileId dari URL
            const fileId = imageUrl.split('/').pop().split('.')[0];
            await imagekit.deleteFile(fileId);
        } catch (error) {
            console.error('Gagal menghapus gambar dari ImageKit:', error.message);
            // Lanjutkan meskipun gagal menghapus dari ImageKit
        }

        // Hapus URL dari array imageUrls
        const updatedImageUrls = imageUrls.filter(url => url !== imageUrl);

        // Update data produk
        const updateData = {
            imageUrls: updatedImageUrls,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Jika URL yang dihapus adalah imageUrl utama, update dengan URL pertama dari array yang tersisa
        if (productData.imageUrl === imageUrl) {
            updateData.imageUrl = updatedImageUrls.length > 0 ? updatedImageUrls[0] : null;
        }

        await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .update(updateData);

        res.status(200).json({
            success: true,
            message: 'Gambar produk berhasil dihapus',
            data: {
                imageUrls: updatedImageUrls,
                imageUrl: updateData.imageUrl || null,
                totalImages: updatedImageUrls.length
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadProductImages,
    uploadPaymentProof,
    getProductImages,
    deleteProductImage
}; 