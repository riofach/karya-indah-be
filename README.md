# CatCo Paint Backend API

Backend API untuk aplikasi CatCo Paint menggunakan Node.js, Express, dan Firebase.

## Teknologi

- Node.js
- Express.js
- Firebase (Authentication & Firestore)
- ImageKit (untuk penyimpanan gambar)
- RajaOngkir API (untuk kalkulasi ongkos kirim)

## Struktur Folder

```
backend/
├── src/
│   ├── config/          # Konfigurasi Firebase, ImageKit, dll
│   ├── controllers/     # Controller untuk setiap route
│   ├── middlewares/     # Middleware untuk autentikasi, validasi, dll
│   ├── routes/          # Route untuk API
│   ├── utils/           # Utilitas dan helper function
│   └── index.js         # Entry point aplikasi
├── .env                 # Environment variables (jangan commit)
├── .env.example         # Contoh environment variables
└── package.json         # Dependency dan script
```

## Instalasi

1. Clone repository
2. Masuk ke folder backend: `cd backend`
3. Install dependency: `npm install`
4. Salin `.env.example` ke `.env` dan isi dengan konfigurasi yang sesuai
5. Jalankan server: `npm run dev`

## Konfigurasi Firebase

Untuk menggunakan Firebase Admin SDK, Anda perlu:

1. Buat project di [Firebase Console](https://console.firebase.google.com/)
2. Generate service account key di Project Settings > Service Accounts
3. Simpan file JSON di root folder backend dengan nama `firebase-service-account.json`
4. Atau, atur environment variables di `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

## Konfigurasi ImageKit

1. Buat akun di [ImageKit](https://imagekit.io/)
2. Dapatkan API key dari dashboard
3. Atur environment variables di `.env`:
   - `IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`
   - `IMAGEKIT_URL_ENDPOINT`

## Konfigurasi RajaOngkir

1. Daftar dan dapatkan API key dari [RajaOngkir](https://rajaongkir.com/)
2. Atur environment variables di `.env`:
   - `RAJAONGKIR_API_KEY`
   - `RAJAONGKIR_BASE_URL`

## Endpoint API

### Autentikasi

- `POST /api/auth/register` - Registrasi customer baru
- `POST /api/auth/login` - Login (catatan: dilakukan di client-side dengan Firebase Auth SDK)
- `GET /api/auth/me` - Mendapatkan data user dari token
- `POST /api/auth/users` - Membuat user baru (admin, head, owner, super) oleh superadmin

### Branch

- `GET /api/branches` - Mendapatkan semua branch
- `GET /api/branches/:id` - Mendapatkan branch berdasarkan ID
- `GET /api/branches/:branchId/products/count` - Mendapatkan jumlah produk di branch tertentu
- `GET /api/branches/:branchId/employees/count` - Mendapatkan jumlah karyawan (admin dan head) di branch tertentu
- `POST /api/branches` - Membuat branch baru (owner, super)
- `PUT /api/branches/:id` - Mengupdate branch (owner, super)
- `DELETE /api/branches/:id` - Menghapus branch (super)

### Product

- `GET /api/products/branch/:branchId` - Mendapatkan semua produk di branch tertentu
- `GET /api/products/branch/:branchId/:id` - Mendapatkan produk berdasarkan ID
- `POST /api/products` - Membuat produk baru (head, owner, super)
- `PUT /api/products/branch/:branchId/:id` - Mengupdate produk (head, owner, super)
- `DELETE /api/products/branch/:branchId/:id` - Menghapus produk (head, owner, super)

### Order

- `GET /api/orders/branch/:branchId` - Mendapatkan semua order di branch tertentu (admin, head, owner, super)
- `GET /api/orders/branch/:branchId/:id` - Mendapatkan order berdasarkan ID (admin, head, owner, super, customer)
- `GET /api/orders/my-orders` - Mendapatkan order berdasarkan customer (customer)
- `POST /api/orders` - Membuat order baru (customer)
- `PATCH /api/orders/branch/:branchId/:id/status` - Mengupdate status order (admin, head, owner, super)
- `GET /api/orders/reports` - Mendapatkan laporan order (owner, super)

### Stock Request

- `GET /api/stock-requests/branch/:branchId` - Mendapatkan semua stock request di branch tertentu (admin, head, owner, super)
- `GET /api/stock-requests/branch/:branchId/:id` - Mendapatkan stock request berdasarkan ID (admin, head, owner, super)
- `POST /api/stock-requests` - Membuat stock request baru (admin)
- `PATCH /api/stock-requests/branch/:branchId/:id/status` - Mengupdate status stock request (head, owner, super)
- `GET /api/stock-requests/pending` - Mendapatkan stock request yang membutuhkan persetujuan (head, owner, super)

### User Management

- `GET /api/users` - Mendapatkan semua user (super)
- `GET /api/users/branch/:branchId` - Mendapatkan user berdasarkan branch (owner, super)
- `GET /api/users/:id` - Mendapatkan user berdasarkan ID (super)
- `PUT /api/users/:id` - Mengupdate user (super)
- `PATCH /api/users/:id/status` - Mengupdate status user (active/inactive) (super)
- `DELETE /api/users/:id` - Menghapus user (super)
- `POST /api/users/:id/reset-password` - Reset password user (super)

### RajaOngkir

- `GET /api/rajaongkir/provinces` - Mendapatkan daftar provinsi
- `GET /api/rajaongkir/cities` - Mendapatkan daftar kota/kabupaten
- `POST /api/rajaongkir/cost` - Menghitung ongkos kirim

### Upload Gambar

### Endpoint untuk upload gambar produk

- `POST /api/uploads/product/:branchId/:productId` - Upload gambar produk (multiple, maksimal 3)
- `GET /api/uploads/product/:branchId/:productId` - Mendapatkan semua gambar produk
- `DELETE /api/uploads/product/:branchId/:productId` - Menghapus gambar produk

### Endpoint untuk upload bukti pembayaran

- `POST /api/uploads/payment/:branchId/:orderId` - Upload bukti pembayaran untuk pesanan

## Batasan Upload Gambar

Sistem memiliki batasan untuk upload gambar sebagai berikut:

### Gambar Produk

- Maksimal 3 gambar per produk
- Ukuran file maksimal 5MB per gambar
- Format yang didukung: JPEG, JPG, PNG, WEBP

### Bukti Pembayaran

- Ukuran file maksimal 2MB
- Format yang didukung: JPEG, JPG, PNG, WEBP
- Hanya dapat diupload pada order dengan status "pending"

## Role dan Hak Akses

- `customer` - Dapat memesan produk, melihat status pesanannya, dan upload bukti pembayaran
- `admin` - Dapat mengelola pesanan dan membuat permintaan stok
- `head` - Dapat mengelola produk, menyetujui permintaan stok, dan mengelola pesanan
- `owner` - Dapat mengelola cabang, melihat laporan, dan memiliki akses ke semua fitur admin dan head
- `super` - Administrator sistem dengan akses penuh ke semua fitur

## Validasi Status Pengguna

Sistem memiliki validasi status pengguna untuk meningkatkan keamanan:

- Setiap pengguna memiliki field `status` dengan nilai `active` atau `inactive`
- Pengguna dengan status `inactive` tidak dapat login ke sistem
- Super Admin dapat mengubah status pengguna melalui endpoint `PATCH /api/users/:id/status`
- Validasi dilakukan pada saat autentikasi token (middleware)
- Hanya berlaku untuk role admin dan head (Admin Toko dan Kepala Toko)

## Postman Collection

Untuk memudahkan pengujian API, kami telah menyediakan Postman Collection yang dapat diimpor ke aplikasi Postman.

### Cara menggunakan Postman Collection:

1. Download [Postman](https://www.postman.com/downloads/)
2. Buka Postman dan klik tombol "Import"
3. Upload file `postman-collection.json` dari direktori backend
4. Setelah diimpor, Anda akan melihat collection "Karya Indah API"
5. Sebelum menjalankan request, atur variabel environment:
   - `base_url`: URL server API, misalnya `http://localhost:5000`
   - `auth_token`: Token otentikasi yang didapatkan setelah login
   - `branch_id`: ID cabang yang digunakan
   - `product_id`: ID produk yang digunakan
   - `order_id`: ID pesanan yang digunakan
   - `request_id`: ID permintaan stok yang digunakan

### Fitur Postman Collection:

- Semua endpoint API yang tersedia
- Contoh request body untuk setiap endpoint
- Deskripsi untuk setiap endpoint
- Variabel environment untuk memudahkan pengujian

Dengan Postman Collection ini, Anda dapat dengan mudah menguji seluruh fungsionalitas API tanpa perlu menulis kode tambahan.
