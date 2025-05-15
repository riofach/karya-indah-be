// Utilitas untuk RajaOngkir API
const axios = require('axios');
require('dotenv').config();

// Konfigurasi RajaOngkir
const rajaongkirConfig = {
    baseURL: process.env.RAJAONGKIR_BASE_URL || 'https://api.rajaongkir.com/starter',
    headers: {
        'key': process.env.RAJAONGKIR_API_KEY,
        'content-type': 'application/x-www-form-urlencoded'
    }
};

// Fungsi untuk mendapatkan daftar provinsi
const getProvinces = async () => {
    try {
        const response = await axios.get('/province', {
            baseURL: rajaongkirConfig.baseURL,
            headers: rajaongkirConfig.headers
        });

        return response.data.rajaongkir.results;
    } catch (error) {
        console.error('Error fetching provinces:', error.message);
        throw new Error('Gagal mendapatkan daftar provinsi');
    }
};

// Fungsi untuk mendapatkan daftar kota/kabupaten
const getCities = async (provinceId) => {
    try {
        const url = provinceId ? `/city?province=${provinceId}` : '/city';

        const response = await axios.get(url, {
            baseURL: rajaongkirConfig.baseURL,
            headers: rajaongkirConfig.headers
        });

        return response.data.rajaongkir.results;
    } catch (error) {
        console.error('Error fetching cities:', error.message);
        throw new Error('Gagal mendapatkan daftar kota/kabupaten');
    }
};

// Fungsi untuk menghitung ongkos kirim
const calculateShipping = async (origin, destination, weight, courier) => {
    try {
        const response = await axios.post('/cost', {
            origin,
            destination,
            weight,
            courier: courier || 'jne'
        }, {
            baseURL: rajaongkirConfig.baseURL,
            headers: rajaongkirConfig.headers
        });

        return response.data.rajaongkir.results;
    } catch (error) {
        console.error('Error calculating shipping cost:', error.message);
        throw new Error('Gagal menghitung ongkos kirim');
    }
};

module.exports = {
    getProvinces,
    getCities,
    calculateShipping
}; 