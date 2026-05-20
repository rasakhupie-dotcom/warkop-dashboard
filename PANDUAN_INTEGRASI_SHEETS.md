# 📊 Panduan Integrasi Google Sheets ↔ WarkopPOS

## Gambaran Sistem

```
HP Karyawan / PC Kasir / Tablet
        │
        │ (scan barcode / input data)
        ▼
  Dashboard WarkopPOS
  (GitHub Pages — gratis)
        │
        │ HTTPS fetch
        ▼
  Google Apps Script
  (backend API gratis)
        │
        ├── Baca → Google Sheets (stok, BOM, transaksi)
        └── Tulis → Google Sheets (opname, transaksi, user)
                │
                └── Email Laporan → Pemilik Warkop (pukul 21.00)
```

---

## Bagian 1 — Persiapan Google Sheets

### Langkah 1 — Upload File Excel ke Google Drive

1. Buka **drive.google.com** → Login dengan akun Google
2. Klik tombol **"+ Baru"** → **"Upload file"**
3. Pilih file **`Warkop_Stok_Opname_System.xlsx`**
4. Setelah upload selesai → klik kanan file → **"Buka dengan Google Sheets"**
5. Pastikan nama tab sheet di bagian bawah sudah ada:
   - `MASTER_BARANG`
   - `BOM`
   - `STOK_OPNAME`
   - `TRANSAKSI_POS`
   - `STOK_HARIAN`
   - `LAPORAN_HARIAN`

> ⚠️ Nama tab harus **SAMA PERSIS** (huruf kapital, tanpa spasi lebih)

---

## Bagian 2 — Setup Google Apps Script

### Langkah 2 — Buka Editor Apps Script

1. Di Google Sheets → klik menu **Extensions** (Ekstensi)
2. Klik **"Apps Script"**
3. Halaman editor akan terbuka di tab baru

### Langkah 3 — Paste Kode Backend

1. Di editor → **hapus semua kode** yang ada (biasanya `function myFunction() {}`)
2. Buka file `apps-script/Code.gs` dari folder yang kamu download
3. **Copy semua isinya** → **Paste** ke editor Apps Script
4. Klik **💾 Save** (atau tekan `Ctrl+S`)

### Langkah 4 — Sesuaikan Konfigurasi

Di baris paling atas `Code.gs`, ubah bagian `CFG`:

```javascript
var CFG = {
  emailOwner: 'EMAIL_KAMU@gmail.com',  // ← Ganti ini!
  namaWarkop: 'Warkop Pak Budi',       // ← Ganti ini!
  jamLaporan: 21,                       // Jam kirim laporan (21 = 21.00 WIB)
  // ... sisanya biarkan
};
```

Klik **💾 Save** lagi setelah mengubah.

### Langkah 5 — Update appsscript.json (untuk izin Gmail)

1. Di editor → klik ikon **⚙️ Project Settings** di sidebar kiri
2. Centang **"Show appsscript.json manifest file in editor"**
3. Kembali ke editor → klik file **`appsscript.json`**
4. **Hapus semua isinya** → paste ini:

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

5. Klik **💾 Save**

### Langkah 6 — Deploy sebagai Web App

```
1. Klik tombol "Deploy" (pojok kanan atas editor)
2. Pilih "New deployment" (Deployment baru)
3. Klik ikon ⚙️ di sebelah "Select type" → pilih "Web app"
4. Isi form:
   - Description     : WarkopPOS API v3
   - Execute as      : Me (nama kamu)       ← WAJIB pilih "Me"
   - Who has access  : Anyone               ← WAJIB pilih "Anyone"
5. Klik "Deploy"
```

**Saat pertama kali deploy, muncul popup "Authorization required":**
```
→ Klik "Authorize access"
→ Pilih akun Google kamu
→ Klik "Advanced" → "Go to WarkopPOS API v3 (unsafe)"  ← ini normal!
→ Klik "Allow" / "Izinkan"
```

6. Setelah selesai, muncul **URL Web App** seperti ini:
   ```
   https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXX/exec
   ```
7. **COPY URL ini** — akan dipakai di langkah selanjutnya!

---

## Bagian 3 — Setup Awal (Buat Sheet USERS & Trigger Email)

### Langkah 7 — Jalankan setupAwal()

1. Di editor Apps Script → klik **dropdown fungsi** (sebelah tombol Run ▶)
2. Pilih **`setupAwal`** dari daftar
3. Klik **▶ Run**
4. Tunggu hingga muncul popup:
   ```
   ✅ Setup WarkopPOS selesai!
   Sheet USERS dibuat dengan 2 akun default...
   ```
5. Klik **OK**

Sekarang di Google Sheets sudah ada tab baru bernama `USERS` dengan 2 akun login default.

---

## Bagian 4 — Hubungkan Dashboard ke Google Sheets

### Langkah 8 — Konfigurasi URL di Dashboard

1. Buka website WarkopPOS kamu di browser:
   ```
   https://USERNAME.github.io/warkop-dashboard
   ```
2. Login dengan akun owner (username: `owner`, password: `owner123`)
3. Di sidebar kiri → klik **"Pengaturan"**
4. Di kolom **"URL Google Apps Script"** → paste URL yang di-copy tadi
5. Klik **"Simpan & Test"**
6. Tunggu beberapa detik → muncul pesan:
   ```
   ✅ Berhasil terhubung ke Google Sheets!
   ```
7. Indikator di topbar berubah menjadi **● Sheets** warna hijau

---

## Bagian 5 — Verifikasi Semua Fitur Berjalan

### Checklist setelah setup:

```
□ 1. Buka halaman login → indikator berubah hijau "Google Sheets terhubung"
□ 2. Login sebagai owner → berhasil masuk dashboard
□ 3. Buka Pengaturan → Test Koneksi → "✅ Berhasil"
□ 4. Klik "Sync Semua" → semua data dapat dari Sheets
□ 5. Buka Stok Opname → scan barcode simulasi → nama barang terisi otomatis
□ 6. Buat transaksi di Kasir POS → cek sheet TRANSAKSI_POS di Google Sheets
□ 7. Simpan opname → cek sheet STOK_OPNAME di Google Sheets
□ 8. Klik "Test Kirim Email" di Laporan → cek email owner
```

### Test Manual di Apps Script:

```
1. Di editor → pilih fungsi "testSemua" dari dropdown
2. Klik ▶ Run
3. Klik "Execution log" di bawah untuk lihat hasilnya
4. Semua test harus menampilkan ✅
```

---

## Bagian 6 — Update Apps Script (Jika Ada Perubahan)

Setiap kali kamu mengedit `Code.gs`, **WAJIB deploy ulang**:

```
Deploy → Manage deployments → ✏️ Edit (klik ikon pensil)
→ Version: pilih "New version"
→ Klik "Deploy"
```

Jika tidak deploy ulang, perubahan kode tidak akan berlaku!

---

## Cara Kerja Multi-Device

```
HP Karyawan A               Tablet Karyawan B            PC Owner
      │                            │                         │
      │ login karyawan1            │ login karyawan2         │ login owner
      ▼                            ▼                         ▼
 Apps Script → cek USERS sheet → ✅ hash password cocok → buat session
      │
      └── Semua transaksi & opname masuk ke Google Sheets yang SAMA
          Owner bisa monitor real-time dari HP manapun!
```

---

## Mode Offline (Jika Internet Mati)

WarkopPOS tetap bisa dipakai walau internet mati:

1. Data login tersimpan di browser (localStorage)
2. Transaksi & opname tersimpan lokal sementara
3. Saat internet kembali → data otomatis sync ke Google Sheets
4. Indikator di topbar berubah dari `○ Offline` ke `● Sheets`

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| "URL belum dikonfigurasi" | URL belum diisi | Buka Pengaturan → isi URL |
| "CORS error" di console browser | Apps Script belum deploy ulang | Deploy → New version |
| Sheet tidak ditemukan | Nama tab salah | Cek nama tab di Sheets = persis `MASTER_BARANG` dll |
| Email tidak terkirim | Trigger belum dibuat | Jalankan `setupAwal()` lagi |
| Login gagal lewat Sheets | Hash tidak cocok | Pastikan password lama benar |
| Scan PDT tidak terdeteksi | PDT mode salah | Set PDT ke USB HID, suffix = Enter |
| Data lama muncul | Cache browser | Buka Pengaturan → Sync Semua |

---

## Ringkasan Nama Action (API)

| Action (api.js) | Fungsi (Code.gs) | Keterangan |
|---|---|---|
| `getBarang` | `getBarang()` | Ambil semua barang |
| `getBOM` | `getBOM()` | Ambil BOM semua/satu menu |
| `getStok` | `getStokHarian()` | Ambil saldo stok harian |
| `getOpname` | `getOpname()` | Ambil data opname |
| `getTransaksi` | `getTransaksi()` | Ambil transaksi POS |
| `getReorder` | `getReorder()` | Hitung ROP semua barang |
| `getSummary` | `getSummaryDashboard()` | Ringkasan dashboard |
| `getLaporan` | `getLaporan()` | Laporan lengkap |
| `getUsers` | `getUsersUntukOwner()` | Daftar pengguna |
| `saveOpname` | `simpanOpname()` | Simpan hasil opname |
| `saveTransaksi` | `simpanTransaksi()` | Simpan transaksi + kurangi stok |
| `scanPDT` | `scanBarcode()` | Lookup barcode PDT |
| `authLogin` | `loginUser()` | Verifikasi login |
| `authAddUser` | `tambahUser()` | Tambah pengguna baru |
| `sendLaporan` | `kirimLaporanHarian()` | Kirim email laporan |

---

*Panduan ini berlaku untuk WarkopPOS v3.0 dengan Code.gs v3.0*
