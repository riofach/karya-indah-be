// Controller untuk product
const { db, admin } = require('../config/firebase');
const { AppError } = require('../middlewares/error.middleware');

// Fungsi untuk mendapatkan semua produk di branch tertentu
const getProductsByBranch = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil semua produk di branch
        const productsSnapshot = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .get();

        const products = [];
        productsSnapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mendapatkan produk berdasarkan ID
const getProductById = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const productId = req.params.id;

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Ambil produk berdasarkan ID
        const productDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .get();

        if (!productDoc.exists) {
            throw new AppError('Produk tidak ditemukan', 404);
        }

        res.status(200).json({
            success: true,
            data: {
                id: productDoc.id,
                ...productDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk membuat produk baru (hanya head, owner, super)
const createProduct = async (req, res, next) => {
    try {
        const { branchId, name, description, category, price, weight, stock, minStock, status } = req.body;

        // Validasi role dan akses branch
        if (req.userData.role === 'head' && req.userData.branchId !== branchId) {
            throw new AppError('Kepala toko hanya dapat menambahkan produk ke cabang mereka sendiri', 403);
        }

        // Cek apakah branch ada
        const branchDoc = await db.collection('branches').doc(branchId).get();

        if (!branchDoc.exists) {
            throw new AppError('Branch tidak ditemukan', 404);
        }

        // Tambahkan produk baru
        const newProductRef = db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc();

        // Data produk
        const productData = {
            name,
            description,
            category,
            price,
            weight,
            stock,
            minStock,
            status: status || (stock <= minStock ? (stock === 0 ? 'out_of_stock' : 'low_stock') : 'available'),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Tambahkan imageUrl jika ada
        if (req.fileUrl) {
            productData.imageUrl = req.fileUrl;
        }

        await newProductRef.set(productData);

        // Ambil data produk yang baru dibuat
        const newProductDoc = await newProductRef.get();

        res.status(201).json({
            success: true,
            message: 'Produk berhasil dibuat',
            data: {
                id: newProductDoc.id,
                ...newProductDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk mengupdate produk (hanya head, owner, super)
const updateProduct = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const productId = req.params.id;
        const { name, description, category, price, weight, stock, minStock, status } = req.body;

        // Validasi role dan akses branch
        if (req.userData.role === 'head' && req.userData.branchId !== branchId) {
            throw new AppError('Kepala toko hanya dapat mengupdate produk di cabang mereka sendiri', 403);
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

        // Data yang akan diupdate
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Tambahkan field yang akan diupdate
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (price !== undefined) updateData.price = price;
        if (weight !== undefined) updateData.weight = weight;
        if (stock !== undefined) updateData.stock = stock;
        if (minStock !== undefined) updateData.minStock = minStock;

        // Update status berdasarkan stock atau status yang diberikan
        if (status) {
            updateData.status = status;
        } else if (stock !== undefined && minStock !== undefined) {
            updateData.status = stock <= minStock ? (stock === 0 ? 'out_of_stock' : 'low_stock') : 'available';
        }

        // Tambahkan imageUrl jika ada
        if (req.fileUrl) {
            updateData.imageUrl = req.fileUrl;
        }

        // Update produk
        await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .update(updateData);

        // Ambil data produk yang sudah diupdate
        const updatedProductDoc = await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .get();

        res.status(200).json({
            success: true,
            message: 'Produk berhasil diupdate',
            data: {
                id: updatedProductDoc.id,
                ...updatedProductDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Fungsi untuk menghapus produk (hanya head, owner, super)
const deleteProduct = async (req, res, next) => {
    try {
        const branchId = req.params.branchId;
        const productId = req.params.id;

        // Validasi role dan akses branch
        if (req.userData.role === 'head' && req.userData.branchId !== branchId) {
            throw new AppError('Kepala toko hanya dapat menghapus produk di cabang mereka sendiri', 403);
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

        // Hapus produk
        await db.collection('branches')
            .doc(branchId)
            .collection('products')
            .doc(productId)
            .delete();

        res.status(200).json({
            success: true,
            message: 'Produk berhasil dihapus',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProductsByBranch,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
}; 