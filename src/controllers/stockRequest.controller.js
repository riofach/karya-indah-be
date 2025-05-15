// Controller untuk stock request
const { db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk mendapatkan semua stock request di branch tertentu
const getStockRequestsByBranch = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil semua stock request di branch
        const stockRequestsSnapshot = await db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .orderBy('createdAt', 'desc')
            .get();

        const stockRequests = [];

        // Untuk setiap stock request, ambil data produk
        for (const doc of stockRequestsSnapshot.docs) {
            const stockRequestData = doc.data();

            // Ambil data produk
            const productDoc = await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .doc(stockRequestData.productId)
                .get();

            // Tambahkan data produk ke stock request
            stockRequests.push({
                id: doc.id,
                ...stockRequestData,
                product: productDoc.exists ? {
                    id: productDoc.id,
                    name: productDoc.data().name,
                    imageUrl: productDoc.data().imageUrl || null,
                    currentStock: productDoc.data().stock,
                    minStock: productDoc.data().minStock
                } : null
            });
        }

        res.status(200).json({
            success: true,
            count: stockRequests.length,
            data: stockRequests
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan stock request berdasarkan ID
const getStockRequestById = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const requestId = req.params.id;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil stock request berdasarkan ID
        const stockRequestDoc = await db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .doc(requestId)
            .get();

        if (!stockRequestDoc.exists) {
            throw new AppError('Stock request tidak ditemukan', 404);
        }

        const stockRequestData = stockRequestDoc.data();

        // Ambil data produk
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(stockRequestData.productId)
            .get();

        res.status(200).json({
            success: true,
            data: {
                id: stockRequestDoc.id,
                ...stockRequestData,
                product: productDoc.exists ? {
                    id: productDoc.id,
                    name: productDoc.data().name,
                    imageUrl: productDoc.data().imageUrl || null,
                    currentStock: productDoc.data().stock,
                    minStock: productDoc.data().minStock
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk membuat stock request baru (admin)
const createStockRequest = async (req, res, next) => {
    try {
        const { branchId, productId, quantity } = req.body;
        const requestedBy = req.userData.id;

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

        // Tambahkan stock request baru
        const newStockRequestRef = db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .doc();

        // Data stock request
        const stockRequestData = {
            productId,
            requestedBy,
            quantity,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await newStockRequestRef.set(stockRequestData);

        // Ambil data stock request yang baru dibuat
        const newStockRequestDoc = await newStockRequestRef.get();

        res.status(201).json({
            success: true,
            message: 'Stock request berhasil dibuat',
            data: {
                id: newStockRequestDoc.id,
                ...newStockRequestDoc.data(),
                product: {
                    id: productDoc.id,
                    name: productDoc.data().name,
                    imageUrl: productDoc.data().imageUrl || null,
                    currentStock: productDoc.data().stock,
                    minStock: productDoc.data().minStock
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate status stock request (head, owner, super)
const updateStockRequestStatus = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const requestId = req.params.id;
        const { status } = req.body;

        // Validasi status
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new AppError('Status tidak valid', 400);
        }

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Cek apakah stock request ada
        const stockRequestDoc = await db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .doc(requestId)
            .get();

        if (!stockRequestDoc.exists) {
            throw new AppError('Stock request tidak ditemukan', 404);
        }

        const stockRequestData = stockRequestDoc.data();

        // Jika status sudah diupdate sebelumnya, tolak
        if (stockRequestData.status !== 'pending') {
            throw new AppError('Stock request sudah diproses sebelumnya', 400);
        }

        // Update status stock request
        const updateData = {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy: req.userData.id
        };

        await db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .doc(requestId)
            .update(updateData);

        // Jika status approved, update stok produk
        if (status === 'approved') {
            await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .doc(stockRequestData.productId)
                .update({
                    stock: admin.firestore.FieldValue.increment(stockRequestData.quantity),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
        }

        // Ambil data stock request yang sudah diupdate
        const updatedStockRequestDoc = await db.collection('branches')
            .doc(branchId)
            .collection('stock_requests')
            .doc(requestId)
            .get();

        // Ambil data produk
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(stockRequestData.productId)
            .get();

        res.status(200).json({
            success: true,
            message: `Stock request berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
            data: {
                id: updatedStockRequestDoc.id,
                ...updatedStockRequestDoc.data(),
                product: productDoc.exists ? {
                    id: productDoc.id,
                    name: productDoc.data().name,
                    imageUrl: productDoc.data().imageUrl || null,
                    currentStock: productDoc.data().stock,
                    minStock: productDoc.data().minStock
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan stock request yang membutuhkan persetujuan (head, owner, super)
const getPendingStockRequests = async (req, res, next) => {
    try {
        // Jika user adalah head, hanya ambil stock request di branch-nya
        if (req.userData.role === 'head') {
            const branchId = req.userData.branchId;

            // Ambil semua stock request dengan status pending di branch
            const stockRequestsSnapshot = await db.collection('branches')
                .doc(branchId)
                .collection('stock_requests')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();

            const stockRequests = [];

            // Untuk setiap stock request, ambil data produk
            for (const doc of stockRequestsSnapshot.docs) {
                const stockRequestData = doc.data();

                // Ambil data produk
                const productDoc = await db.collection('branches')
                    .doc(branchId)
                    .collection('products')
                    .doc(stockRequestData.productId)
                    .get();

                // Tambahkan data produk ke stock request
                stockRequests.push({
                    id: doc.id,
                    ...stockRequestData,
                    product: productDoc.exists ? {
                        id: productDoc.id,
                        name: productDoc.data().name,
                        imageUrl: productDoc.data().imageUrl || null,
                        currentStock: productDoc.data().stock,
                        minStock: productDoc.data().minStock
                    } : null
                });
            }

            res.status(200).json({
                success: true,
                count: stockRequests.length,
                data: stockRequests
            });
        } else {
            // Untuk owner dan super, ambil semua stock request dengan status pending di semua branch
            const branchesSnapshot = await db.collection('branches').get();

            const allStockRequests = [];

            for (const branchDoc of branchesSnapshot.docs) {
                const branchId = branchDoc.id;

                // Ambil semua stock request dengan status pending di branch
                const stockRequestsSnapshot = await db.collection('branches')
                    .doc(branchId)
                    .collection('stock_requests')
                    .where('status', '==', 'pending')
                    .orderBy('createdAt', 'desc')
                    .get();

                // Untuk setiap stock request, ambil data produk
                for (const doc of stockRequestsSnapshot.docs) {
                    const stockRequestData = doc.data();

                    // Ambil data produk
                    const productDoc = await db.collection('branches')
                        .doc(branchId)
                        .collection('products')
                        .doc(stockRequestData.productId)
                        .get();

                    // Tambahkan data produk ke stock request
                    allStockRequests.push({
                        id: doc.id,
                        branchId,
                        branchName: branchDoc.data().name,
                        ...stockRequestData,
                        product: productDoc.exists ? {
                            id: productDoc.id,
                            name: productDoc.data().name,
                            imageUrl: productDoc.data().imageUrl || null,
                            currentStock: productDoc.data().stock,
                            minStock: productDoc.data().minStock
                        } : null
                    });
                }
            }

            // Urutkan stock request berdasarkan waktu pembuatan (terbaru dulu)
            allStockRequests.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt.toDate()) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt.toDate()) : new Date(0);
                return dateB - dateA;
            });

            res.status(200).json({
                success: true,
                count: allStockRequests.length,
                data: allStockRequests
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStockRequestsByBranch,
    getStockRequestById,
    createStockRequest,
    updateStockRequestStatus,
    getPendingStockRequests
}; 