# BASTIKA PARFUM - Sistem POS & Manajemen Usaha Cloud

Sistem aplikasi POS (Point of Sale), manajemen inventori, penataan rak, penggajian karyawan, dan akuntansi keuangan profesional yang terintegrasi secara online menggunakan **React (Vite)**, **Tailwind CSS**, dan **Firebase (Cloud Firestore & Authentication)**.

Aplikasi ini didesain khusus untuk toko parfum **BASTIKA PARFUM** dengan arsitektur modern yang ringan, aman, serta mendukung fitur **Offline Caching (PWA)** agar tetap dapat digunakan tanpa koneksi internet.

---

## 🚀 Fitur Utama

1. **Sistem Rak Aroma (Shelves Management)**: Pemetaan letak rak parfum dengan pencarian cepat nama aroma dan harga per ml.
2. **Manajemen Stok Master**: Pencatatan persediaan bibit parfum (ml), alkohol pendukung (ml), dan persediaan botol kaca (unit: 30ml, 50ml, 100ml).
3. **Kasir Penjualan (POS)**: Form kasir dinamis dengan kalkulasi harga otomatis, pengurangan stok master real-time, dan pencatatan operator transaksi.
4. **Catat Belanja Stok**: Pembelian logistik toko (bibit/botol/alkohol) yang otomatis memotong saldo Kas Besar dan menambah stok inventori.
5. **Akuntansi Laba Bersih Otomatis**: Laporan keuangan yang memperhitungkan laba bersih usaha secara real-time berdasarkan formula: `Laba Bersih = Omset Kotor - Pembelian Stok - Beban Gaji`.
6. **Buku Kas Besar (Mutasi)**: Pencatatan mutasi kas (Debit/Kredit) terperinci dengan pencatatan saldo sebelum dan sesudah mutasi untuk transparansi penuh keuangan.
7. **Beban Gaji Karyawan**: Sistem master penggajian yang terintegrasi langsung ke pemotong kas besar dan perhitungan laba bersih.
8. **Manajemen Hak Akses (Whitelisting)**: Dua tingkat akses keamanan:
   - **Admin (Akses Penuh)**: Email utama `bastikacorp@gmail.com` dan admin yang disetujui dapat mengelola seluruh sistem termasuk data keuangan dan hak akses.
   - **Client (Akses Terbatas)**: Hanya dapat menggunakan kasir penjualan, melihat sistem rak, dan memantau stok bibit/botol.
9. **Koneksi Cloud & Offline Mode**: Sinkronisasi data real-time antar-perangkat menggunakan Firestore, dilengkapi caching lokal IndexedDB sehingga transaksi tetap lancar meski offline.

---

## 🛠️ Teknologi & Arsitektur

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS (v4), Lucide Icons, Motion.
- **Backend & Database**: Serverless Cloud Firestore (dengan aturan keamanan ketat `firestore.rules`).
- **Autentikasi**: Firebase Authentication (Google Sign-In).
- **Keamanan Data**: Firebase Security Rules yang melarang keras akun kasir (client) memodifikasi data sensitif seperti kas besar, gaji, dan laporan keuangan admin.
- **Aplikasi Mobile (PWA)**: Terkonfigurasi penuh dengan file `manifest.json` dan ikon launcher mewah 512x512 piksel sehingga dapat diinstal di HP Android langsung melalui Google Chrome.

---

## 📱 Panduan Instalasi di HP Android (PWA)

Sebagai pengganti file `.apk` konvensional yang sering diblokir Google Play Protect karena alasan keamanan, sistem ini menggunakan standar **PWA (Progressive Web App)** resmi dari Google:

1. Buka browser **Google Chrome** di HP Android Anda.
2. Akses tautan aplikasi Anda (contoh: Tautan Pengembangan atau Tautan Publik hasil Deploy).
3. Klik tombol **menu titik tiga (⋮)** di pojok kanan atas Chrome.
4. Pilih menu **"Tambahkan ke Layar Utama" (Add to Home Screen)** atau **"Instal Aplikasi"**.
5. Aplikasi **BASTIKA PARFUM** dengan ikon mewah akan terpasang di menu HP Android Anda dan dapat dibuka satu layar penuh tanpa bar pencarian browser.

---

## ⚙️ Cara Menjalankan Secara Lokal (Development)

Jika Anda ingin menjalankan aplikasi ini di komputer lokal Anda:

1. **Clone Repositori**:
   ```bash
   git clone <url-repositori-github-anda>
   cd bastika-parfum
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin file `.env.example` menjadi `.env` dan masukkan konfigurasi Firebase Anda jika diperlukan.

4. **Jalankan Server Lokal**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` pada browser Anda.

---

## 👥 Kontribusi & Lisensi

Aplikasi dikembangkan secara profesional untuk **BASTIKA PARFUM CORP**. Seluruh hak cipta dilindungi undang-undang.
