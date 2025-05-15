// Route untuk RajaOngkir
const express = require('express');
const router = express.Router();

// Import utilitas RajaOngkir
const {
    getProvinces,
    getCities,
    calculateShipping
} = require('../utils/rajaongkir');

// Import middlewares
const { AppError } = require('../middlewares/error.middleware');

// Route untuk mendapatkan daftar provinsi
router.get('/provinces', async (req, res, next) => {
    try {
        const provinces = await getProvinces();

        res.status(200).json({
            success: true,
            count: provinces.length,
            data: provinces
        });
    } catch (error) {
        next(new AppError(error.message, 500));
    }
});

// Route untuk mendapatkan daftar kota/kabupaten
router.get('/cities', async (req, res, next) => {
    try {
        const { provinceId } = req.query;
        const cities = await getCities(provinceId);

        res.status(200).json({
            success: true,
            count: cities.length,
            data: cities
        });
    } catch (error) {
        next(new AppError(error.message, 500));
    }
});

// Route untuk menghitung ongkos kirim
router.post('/cost', async (req, res, next) => {
    try {
        const { origin, destination, weight, courier } = req.body;

        if (!origin || !destination || !weight) {
            throw new AppError('Origin, destination, dan weight diperlukan', 400);
        }

        const costs = await calculateShipping(origin, destination, weight, courier);

        res.status(200).json({
            success: true,
            data: costs
        });
    } catch (error) {
        next(new AppError(error.message, 500));
    }
});

module.exports = router; 