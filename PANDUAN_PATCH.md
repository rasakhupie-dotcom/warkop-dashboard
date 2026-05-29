# 📦 WarkopPOS — Panduan Update Patch v3.1

## File yang Perlu Diganti/Ditambah di GitHub

### 1. GANTI file yang sudah ada:
```
login.html              ← Ganti versi lama (fix login tidak bisa masuk)
js/auth.js              ← Ganti versi lama (fix hash password)
js/app.js               ← Ganti versi lama (tambah fitur menu + download)
pages/laporan.html      ← Ganti versi lama (download PDF & Excel berfungsi)
```

### 2. TAMBAH file baru:
```
pages/menu-manager.html ← Halaman kelola menu Kasir POS (baru)
```

---

## Kenapa Login Tidak Bisa Masuk? (Penyebab & Fix)

### Penyebab 1: Hash password salah
Hash SHA-256 untuk `owner123` di versi lama **tidak cocok** dengan yang
dihasilkan browser saat login. Ini menyebabkan password selalu dianggap salah.

**Fix di auth.js baru:**
```
owner123    → 43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9
karyawan123 → 4b544df5bd793515057a6ae1e49a44c57f038333dcd9a1e6af0d6cca04e1fac3
```

### Penyebab 2: mustChangePwd = true memblokir masuk
Versi lama memaksa ganti password dulu sebelum bisa masuk, tapi
proses ganti passwordnya ada bug sehingga tidak pernah bisa selesai.

**Fix:** `mustChangePwd` diset `false` untuk akun default — bisa langsung masuk.

### Penyebab 3: Path redirect salah
Guard di `index.html` mengarah ke `login.html` tapi di beberapa
konfigurasi GitHub Pages path-nya tidak tepat.

**Fix:** Deteksi otomatis apakah halaman ada di `/pages/` atau root.

---

## Cara Update di GitHub

### Cara Cepat (Upload Ulang)

1. Buka repository GitHub kamu
2. Klik file yang mau diganti (misal `login.html`)
3. Klik tombol ✏️ (Edit/pensil) atau **"Upload files"**
4. Upload file baru dari patch ini
5. Klik **"Commit changes"**
6. Ulangi untuk setiap file

### Cara Sekaligus (Drag & Drop)

1. Buka repository GitHub
2. Klik **"Add file" → "Upload files"**
3. Drag semua file dari folder patch ini ke area upload:
   - `login.html` → ke root repository
   - `js/auth.js` → ke folder `js/`
   - `js/app.js` → ke folder `js/`
   - `pages/laporan.html` → ke folder `pages/`
   - `pages/menu-manager.html` → ke folder `pages/`
4. Klik **"Commit changes"**

> ⚠️ Pastikan file masuk ke folder yang BENAR!
> `login.html` → root (sejajar dengan `index.html`)
> `js/*.js` → dalam folder `js/`
> `pages/*.html` → dalam folder `pages/`

---

## Cara Pakai Menu Manager (Fitur Baru)

Setelah upload, menu Kasir POS bisa dikelola dari halaman baru:

**Akses:** Login sebagai Owner → Sidebar → "Kelola Menu"
**URL:** `https://USERNAME.github.io/warkop-dashboard/pages/menu-manager.html`

### Tambah Menu Baru:
1. Klik tombol **"+ Tambah Menu"**
2. Pilih emoji ikon menu
3. Isi nama menu dan harga jual
4. Klik **"+ Tambah Bahan"** → pilih bahan dari Master Barang → isi jumlah
5. Lihat preview HPP dan margin keuntungan secara real-time
6. Klik **"Simpan Menu"**
7. Menu langsung muncul di halaman Kasir POS ✅

### Hapus / Nonaktifkan Menu:
- **Nonaktifkan** → menu hilang dari kasir tapi data tersimpan (bisa diaktifkan lagi)
- **Hapus** → menu dihapus permanen (perlu konfirmasi)

### Sinkronisasi dari Google Sheets:
- Jika sudah terhubung ke Sheets, menu otomatis diambil dari sheet BOM
- Perubahan di Sheets akan sinkron ke dashboard saat halaman dibuka

---

## Download PDF & Excel (Fitur yang Diperbaiki)

### Di halaman Laporan Harian:

**Unduh Excel (.xlsx):**
- Klik tombol **"📊 Unduh Excel"**
- File langsung terunduh ke folder Downloads
- Berisi 4 sheet: Ringkasan, Transaksi, Status Stok, Daftar Menu

**Unduh PDF:**
- Klik tombol **"📄 Unduh PDF"**
- Halaman laporan terbuka di tab baru
- Klik **"🖨️ Cetak / Simpan PDF"**
- Di dialog cetak → pilih printer **"Save as PDF"**
- Klik Save → pilih lokasi simpan

> 💡 Jika PDF tidak terbuka: Browser mungkin memblokir popup.
> Klik ikon 🔒 di address bar → izinkan popup dari halaman ini.

---

## Sinkronisasi Otomatis dari Google Sheets

Setelah update, perubahan data di Google Sheets akan otomatis muncul
di dashboard dengan cara:

1. **Saat halaman dibuka** → dashboard ambil data terbaru dari Sheets
2. **Status** ditunjukkan di topbar: `● Sheets` (online) atau `○ Lokal` (offline)
3. **Data yang disinkronkan:**
   - Master Barang → stok, harga, status ROP
   - BOM/Menu → daftar menu, komposisi bahan, harga
   - Jika Sheets tidak terhubung → pakai data lokal (localStorage)

---

## Default Login Setelah Patch

| Role | Username | Password |
|---|---|---|
| Pemilik | `owner` | `owner123` |
| Karyawan | `karyawan1` | `karyawan123` |

Setelah berhasil masuk, ganti password di **Kelola Pengguna → Ganti Password Saya**.
