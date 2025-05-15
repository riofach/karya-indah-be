// Controller untuk order
const { db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk mendapatkan semua order di branch tertentu
const getOrdersByBranch = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil semua order di branch
        const ordersSnapshot = await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .orderBy('createdAt', 'desc')
            .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan order berdasarkan ID
const getOrderById = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const orderId = req.params.id;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil order berdasarkan ID
        const orderDoc = await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc(orderId)
            .get();

        if (!orderDoc.exists) {
            throw new AppError('Order tidak ditemukan', 404);
        }

        res.status(200).json({
            success: true,
            data: {
                id: orderDoc.id,
                ...orderDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan order berdasarkan customer
const getOrdersByCustomer = async (req, res, next) => {
    try {
        const customerId = req.userData.id;

        // Dapatkan semua branch
        const branchesSnapshot = await db.collection('branches').get();

        const allOrders = [];

        // Untuk setiap branch, ambil order yang dimiliki customer
        for (const branchDoc of branchesSnapshot.docs) {
            const ordersSnapshot = await db.collection('branches')
                .doc(branchDoc.id)
                .collection('orders')
                .where('customerId', '==', customerId)
                .orderBy('createdAt', 'desc')
                .get();

            ordersSnapshot.forEach(orderDoc => {
                allOrders.push({
                    id: orderDoc.id,
                    branchId: branchDoc.id,
                    branchName: branchDoc.data().name,
                    ...orderDoc.data()
                });
            });
        }

        // Urutkan order berdasarkan waktu pembuatan (terbaru dulu)
        allOrders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt.toDate()) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt.toDate()) : new Date(0);
            return dateB - dateA;
        });

        res.status(200).json({
            success: true,
            count: allOrders.length,
            data: allOrders
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk membuat order baru (customer)
const createOrder = async (req, res, next) => {
    try {
        const { branchId, items, subtotal, shippingCost, total } = req.body;
        const customerId = req.userData.id;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Validasi items
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('Items tidak valid', 400);
        }

        // Verifikasi ketersediaan produk dan harga
        const orderItems = [];

        for (const item of items) {
            const productDoc = await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .doc(item.productId)
                .get();

            if (!productDoc.exists) {
                throw new AppError(`Produk dengan ID ${item.productId} tidak ditemukan`, 404);
            }

            const productData = productDoc.data();

            // Cek stok
            if (productData.stock < item.quantity) {
                throw new AppError(`Stok produk ${productData.name} tidak mencukupi`, 400);
            }

            // Tambahkan item ke orderItems dengan data lengkap
            orderItems.push({
                productId: item.productId,
                productName: productData.name,
                quantity: item.quantity,
                priceAtOrder: productData.price,
                imageUrl: productData.imageUrl || null
            });

            // Kurangi stok produk
            await db.collection('branches')
                .doc(branchId)
                .collection('products')
                .doc(item.productId)
                .update({
                    stock: admin.firestore.FieldValue.increment(-item.quantity),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
        }

        // Tambahkan order baru
        const newOrderRef = db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc();

        // Data order
        const orderData = {
            customerId,
            items: orderItems,
            subtotal,
            shippingCost,
            total,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await newOrderRef.set(orderData);

        // Ambil data order yang baru dibuat
        const newOrderDoc = await newOrderRef.get();

        res.status(201).json({
            success: true,
            message: 'Order berhasil dibuat',
            data: {
                id: newOrderDoc.id,
                ...newOrderDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate status order (admin, head, owner, super)
const updateOrderStatus = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const orderId = req.params.id;
        const { status } = req.body;

        // Validasi status
        const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new AppError('Status tidak valid', 400);
        }

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

        const orderData = orderDoc.data();

        // Jika status cancelled dan status sebelumnya bukan pending, kembalikan stok
        if (status === 'cancelled' && orderData.status !== 'cancelled') {
            // Kembalikan stok produk
            for (const item of orderData.items) {
                await db.collection('branches')
                    .doc(branchId)
                    .collection('products')
                    .doc(item.productId)
                    .update({
                        stock: admin.firestore.FieldValue.increment(item.quantity),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
            }
        }

        // Update status order
        const updateData = {
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Jika status paid, tambahkan approvedBy
        if (status === 'paid') {
            updateData.approvedBy = req.userData.id;
        }

        await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc(orderId)
            .update(updateData);

        // Ambil data order yang sudah diupdate
        const updatedOrderDoc = await db.collection('branches')
            .doc(branchId)
            .collection('orders')
            .doc(orderId)
            .get();

        res.status(200).json({
            success: true,
            message: 'Status order berhasil diupdate',
            data: {
                id: updatedOrderDoc.id,
                ...updatedOrderDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan laporan order (owner, super)
const getOrderReports = async (req, res, next) => {
    try {
        const { branchId, startDate, endDate } = req.query;

        let startTimestamp = null;
        let endTimestamp = null;

        if (startDate) {
            startTimestamp = new Date(startDate);
            if (isNaN(startTimestamp.getTime())) {
                throw new AppError('Format tanggal mulai tidak valid', 400);
            }
        }

        if (endDate) {
            endTimestamp = new Date(endDate);
            if (isNaN(endTimestamp.getTime())) {
                throw new AppError('Format tanggal akhir tidak valid', 400);
            }
            // Set endTimestamp ke akhir hari
            endTimestamp.setHours(23, 59, 59, 999);
        }

        // Jika branchId diberikan, ambil laporan untuk branch tertentu
        if (branchId) {
            // Cek apakah branch ada
            const branchDoc = await db.collection('branches').doc(branchId).get();

            if (!branchDoc.exists) {
                throw new AppError('Branch tidak ditemukan', 404);
            }

            let ordersQuery = db.collection('branches')
                .doc(branchId)
                .collection('orders')
                .where('status', 'in', ['paid', 'shipped', 'completed']);

            // Tambahkan filter tanggal jika ada
            if (startTimestamp) {
                ordersQuery = ordersQuery.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startTimestamp));
            }

            if (endTimestamp) {
                ordersQuery = ordersQuery.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endTimestamp));
            }

            const ordersSnapshot = await ordersQuery.get();

            const orders = [];
            let totalRevenue = 0;

            ordersSnapshot.forEach(doc => {
                const orderData = doc.data();
                totalRevenue += orderData.total || 0;

                orders.push({
                    id: doc.id,
                    ...orderData
                });
            });

            res.status(200).json({
                success: true,
                data: {
                    branchId,
                    branchName: branchDoc.data().name,
                    totalOrders: orders.length,
                    totalRevenue,
                    orders
                }
            });
        } else {
            // Ambil laporan untuk semua branch
            const branchesSnapshot = await db.collection('branches').get();

            const branchReports = [];
            let totalRevenue = 0;
            let totalOrders = 0;

            for (const branchDoc of branchesSnapshot.docs) {
                let ordersQuery = db.collection('branches')
                    .doc(branchDoc.id)
                    .collection('orders')
                    .where('status', 'in', ['paid', 'shipped', 'completed']);

                // Tambahkan filter tanggal jika ada
                if (startTimestamp) {
                    ordersQuery = ordersQuery.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startTimestamp));
                }

                if (endTimestamp) {
                    ordersQuery = ordersQuery.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endTimestamp));
                }

                const ordersSnapshot = await ordersQuery.get();

                const orders = [];
                let branchRevenue = 0;

                ordersSnapshot.forEach(doc => {
                    const orderData = doc.data();
                    branchRevenue += orderData.total || 0;

                    orders.push({
                        id: doc.id,
                        ...orderData
                    });
                });

                totalRevenue += branchRevenue;
                totalOrders += orders.length;

                branchReports.push({
                    branchId: branchDoc.id,
                    branchName: branchDoc.data().name,
                    totalOrders: orders.length,
                    totalRevenue: branchRevenue
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    totalOrders,
                    totalRevenue,
                    branches: branchReports
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrdersByBranch,
    getOrderById,
    getOrdersByCustomer,
    createOrder,
    updateOrderStatus,
    getOrderReports
}; 