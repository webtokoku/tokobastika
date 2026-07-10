# Panduan Android & Arsitektur Sistem: BASTIKA PARFUM

Aplikasi **BASTIKA PARFUM** dirancang sebagai aplikasi manajemen usaha dan kasir (POS) profesional yang sepenuhnya terintegrasi. Meskipun platform ini berjalan di atas infrastruktur web (Cloud Run), aplikasi ini telah dilengkapi dengan teknologi **Progressive Web App (PWA)** sehingga dapat diinstal secara langsung di HP Android tanpa perlu melakukan sideloading file `.apk` manual yang sering kali dianggap tidak aman oleh Google Play Protect.

---

## 📱 Cara Instalasi di HP Android (Sebagai Pengganti APK)

Dengan fitur PWA, aplikasi ini akan berjalan di HP Android dengan performa tinggi, layar penuh (tanpa bar alamat browser), dan memiliki ikon launcher sendiri di layar utama.

### Langkah-langkah Instalasi:
1. **Pilih Tautan Aplikasi** yang ingin Anda gunakan di HP Android:
   - **Tautan Pengembangan (Aktif Sekarang):** `https://ais-dev-3kz3qaapjomppxbnx4smx2-989015153461.asia-southeast1.run.app` (Gunakan ini untuk langsung menguji dan menginstal aplikasi saat editor AI Studio sedang terbuka).
   - **Tautan Publik (Shared):** `https://ais-pre-3kz3qaapjomppxbnx4smx2-989015153461.asia-southeast1.run.app` (Tautan ini baru akan aktif setelah Anda menekan tombol **"Share"** atau **"Deploy"** di pojok kanan atas layar Google AI Studio Anda).
2. **Buka Tautan Tersebut** di browser **Google Chrome** di HP Android Anda.
3. Ketuk tombol **Menu titik tiga (⋮)** di pojok kanan atas Chrome.
4. Pilih menu **"Tambahkan ke Layar Utama" (Add to Home Screen)** atau **"Instal Aplikasi" (Install App)**.
5. Konfirmasi instalasi. Ikon mewah **BASTIKA PARFUM** akan muncul di menu aplikasi Android Anda!
6. Saat dibuka dari layar utama, aplikasi akan berjalan penuh dalam mode *standalone* layaknya aplikasi Android native (.apk).

---

## 🚀 Mengaktifkan Tautan Publik (Shared App)

Jika Anda mendapatkan pesan **"Page not found"** saat mengklik tautan publik (`ais-pre-...`), hal ini dikarenakan aplikasi belum di-publish secara publik melalui sistem Google AI Studio. 

Untuk mengaktifkannya:
1. Pergi ke halaman Google AI Studio tempat Anda melihat chat ini.
2. Di pojok kanan atas, temukan tombol **"Share"** atau **"Deploy"**.
3. Klik tombol tersebut untuk mempublikasikan versi terbaru aplikasi Anda ke server cloud.
4. Setelah proses selesai, tautan publik Anda (`https://ais-pre-...`) akan langsung aktif dan bisa diakses oleh siapapun (termasuk kasir Anda) kapan saja secara mandiri.

---

## 🛠️ Arsitektur Teknologi & Strategi Sinkronisasi

Aplikasi ini menggunakan perpaduan teknologi cloud mutakhir yang menjamin kecepatan, keandalan, dan keamanan data keuangan usaha Anda:

### 1. Database Cloud & Sinkronisasi Real-Time (Firebase Firestore)
- **Model Sinkronisasi:** Menggunakan listener real-time (`onSnapshot`) dari Firebase. Setiap ada input transaksi penjualan oleh kasir (Client), data stok bibit dan botol langsung terpotong secara otomatis di server dan langsung terlihat oleh Admin di perangkat lain dalam waktu kurang dari 1 detik.
- **Single Source of Truth:** Semua perangkat (HP Admin, HP Kasir/Client, PC Toko) menggunakan satu basis data yang sama yang tersinkronisasi secara dinamis.

### 2. Offline Mode & Caching Pintar (IndexedDB Persistence)
- **Logika Offline:** Kami telah mengaktifkan fitur `enableIndexedDbPersistence` pada Firestore SDK. 
- Jika toko sedang mati lampu atau tidak ada sinyal internet, aplikasi **tetap dapat melakukan transaksi kasir dan melihat data rak**.
- Semua data transaksi akan disimpan secara lokal di memori HP (offline cache).
- Begitu HP mendapatkan sinyal kembali, Firebase secara otomatis akan melakukan sinkronisasi (upload) ke cloud secara aman tanpa merusak konsistensi data.

### 3. Keamanan Data Finansial (Firebase Security Rules)
Untuk melindungi data kas besar, laba, dan penggajian karyawan agar tidak dimanipulasi secara sengaja atau tidak sengaja oleh Client (Kasir):
- **Akses Client Terbatas:** Akun bertipe `client` hanya diizinkan melakukan operasi baca pada sistem rak dan stok, serta hanya boleh menulis dokumen transaksi dengan tipe `sale` (penjualan).
- **Proteksi Kas Besar & Gaji:** Aturan keamanan (`firestore.rules`) melarang keras akses tulis maupun baca pada koleksi `salaries` (gaji) dan `cash_ledger` (kas besar) oleh akun kasir. Hanya Admin utama (`bastikacorp@gmail.com`) yang memiliki akses penuh terhadap data sensitif ini.

### 4. Cascade Update Harga Otomatis
- Jika harga jual per ml suatu aroma diubah di tabel Master Harga, sistem transaksi akan mendeteksi perubahan tersebut secara dinamis.
- Database relasional virtual menggunakan transaksi atomik (`runTransaction`) untuk menjamin bahwa saat harga master diperbarui, seluruh data harga di sistem rak yang terkait ikut terupdate secara konsisten dalam satu siklus penyimpanan (atomic write).

---

## 📊 Ringkasan Fitur yang Berhasil Diimplementasikan:
1. **Sistem Rak (Shelves):** Pemetaan posisi rak dengan aroma, dilengkapi fitur pencarian cepat.
2. **Manajemen Stok Master:** Manajemen volume bibit (ml), alkohol (ml), dan botol unit (30ml, 50ml, 100ml).
3. **Kasir Penjualan Real-Time:** Pengurangan stok otomatis, gratis biaya alkohol/bundling, kalkulasi total harga otomatis berdasarkan ukuran botol.
4. **Pencatatan Belanja Stok:** Mengurangi saldo kas besar dan menambah persediaan stok master.
5. **Akuntansi Laba Bersih:** Formula otomatis: `Laba Bersih = Omset Kotor - Pembelian Stok - Beban Gaji`.
6. **Buku Kas Besar (Mutasi):** Pencatatan aliran uang masuk (in) dan keluar (out) yang mendetail dengan histori saldo sebelum/sesudah mutasi.
7. **Penggajian Karyawan:** Terintegrasi langsung sebagai pengurang laba bersih dan pengurang kas besar.
8. **Manajemen Akses Whitelist:** Admin dapat menambah/menghapus email kasir (client) secara langsung di dalam aplikasi.
