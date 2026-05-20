# ☕ WarkopPOS — Sistem Stok Opname UMKM

> Dashboard stok opname terintegrasi untuk Warung Kopi — PDT Scanner DC-108, POS Kasir, BOM, Reorder Point, Laporan Harian otomatis. Hosting **gratis** di GitHub Pages.

![Status](https://img.shields.io/badge/Status-Ready%20to%20Deploy-brightgreen)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-222?logo=github)
![License](https://img.shields.io/badge/License-MIT-1D9E75)

---

## 🌐 Live Demo
**→ `https://USERNAME.github.io/warkop-dashboard`**

---

## ✨ Fitur

| Modul | Fungsi | Owner | Karyawan |
|---|---|:---:|:---:|
| Dashboard | Ringkasan stok, penjualan, alert | ✅ | ✅ |
| Kasir POS | Transaksi, cart, BOM otomatis | ✅ | ✅ |
| Stok Opname | Scan PDT DC-108, selisih, approval | ✅ | ✅ |
| Master Barang | CRUD barang, 3 kategori, ROP | ✅ | 👁️ |
| Bill of Material | HPP per menu, margin | ✅ | ❌ |
| Supplier | Data supplier, lead time | ✅ | 👁️ |
| Reorder Point | ROP = (Daily × Lead) + Safety | ✅ | ✅ |
| Analisis Pareto | Top 20% produk, fast/slow moving | ✅ | ❌ |
| Laporan Harian | Ringkasan + kesimpulan + email | ✅ | ❌ |

---

## 🚀 Deploy ke GitHub Pages (10 Menit)

### 1. Buat Repository
Buka github.com → **New Repository** → nama: `warkop-dashboard` → Public → Create

### 2. Upload File
**Cara mudah (drag & drop):**
1. Buka repo baru di GitHub
2. Klik **"uploading an existing file"**
3. Drag seluruh isi folder `warkop-dashboard/`
4. Klik **"Commit changes"**

**Cara Git (terminal):**
```bash
cd warkop-dashboard
git init
git add .
git commit -m "feat: WarkopPOS initial deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/warkop-dashboard.git
git push -u origin main
```

### 3. Aktifkan GitHub Pages
```
Settings → Pages → Source: Deploy from a branch
Branch: main / (root) → Save
```
Tunggu 2-5 menit → website live di `https://USERNAME.github.io/warkop-dashboard`

---

## 📱 PDT Scanner DC-108

| Setting | Nilai |
|---|---|
| Mode output | USB HID (seperti keyboard) |
| Suffix | Enter (CR/LF) |
| Code type | Code128 / QR |

**Cara pakai:** Buka halaman Stok Opname → klik kolom Barcode → scan produk → data terisi otomatis.

---

## 📊 Integrasi Google Sheets + Email Otomatis

1. Upload `Warkop_Stok_Opname_System.xlsx` ke Google Drive → buka sebagai Sheets
2. **Extensions → Apps Script** → paste isi sheet `GAS_SCRIPT`
3. Ganti `ownerEmail` → jalankan `setupTrigger()` sekali
4. ✅ Laporan PDF dikirim otomatis ke email owner **setiap pukul 21.00 WIB**

---

## 📐 Rumus ROP

```
ROP = (Rata-rata Pemakaian Harian × Lead Time) + Safety Stock

Contoh — Susu Cair:
ROP = (1.500 ml × 1 hari) + 500 ml = 2.000 ml
→ Stok ≤ 2.000 ml → REORDER SEKARANG!
```

---

## 🛠️ Kustomisasi

Edit `js/app.js` → array `menus` untuk tambah menu, array `barang` untuk tambah barang.
Edit `css/main.css` → CSS variables untuk ubah warna tema.

---

## 🗂️ Struktur File

```
warkop-dashboard/
├── index.html          ← Dashboard
├── 404.html            ← Error page
├── .nojekyll           ← GitHub Pages config
├── css/main.css        ← Stylesheet
├── js/
│   ├── app.js          ← State global & utils
│   └── dashboard.js    ← Chart
├── pages/
│   ├── pos.html        ← Kasir POS
│   ├── opname.html     ← Stok Opname
│   ├── barang.html     ← Master Barang
│   ├── bom.html        ← Bill of Material
│   ├── supplier.html   ← Supplier
│   ├── reorder.html    ← Reorder Point
│   ├── pareto.html     ← Pareto
│   └── laporan.html    ← Laporan Harian
└── .github/workflows/deploy.yml  ← Auto-deploy
```

---

## 🏗️ Tech Stack

**HTML5 · CSS3 · Vanilla JavaScript · GitHub Pages**

Tidak ada framework, tidak ada npm, tidak ada build step — langsung buka di browser!

---

MIT License — bebas digunakan untuk kebutuhan UMKM 🇮🇩
