# 🔗 PANDUAN INTEGRASI — GitHub Pages ↔ Google Sheets

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        ALUR DATA                                 │
│                                                                   │
│  PDT Scanner DC-108                                              │
│       │ scan barcode                                             │
│       ▼                                                           │
│  Dashboard (GitHub Pages)  ←──────────────────────────────────┐ │
│       │                                                         │ │
│       │ fetch / POST (HTTPS)                                    │ │
│       ▼                                                         │ │
│  Google Apps Script (Web App API)                               │ │
│       │                                                         │ │
│       ├── Read  → Google Sheets (ambil data master, stok dll)   │ │
│       └── Write → Google Sheets (simpan opname, transaksi dll) ─┘ │
│                                                                   │
│  Google Sheets ←→ Email Otomatis (laporan harian 21.00 WIB)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## BAGIAN 1 — Setup Google Apps Script (Backend API)

### Langkah 1.1 — Siapkan Google Sheets

1. Buka **Google Drive** → Upload file `Warkop_Stok_Opname_System.xlsx`
2. Klik kanan → **"Open with → Google Sheets"**
3. Pastikan nama tab sheet sesuai:
   - `MASTER_BARANG`
   - `BOM`
   - `STOK_OPNAME`
   - `TRANSAKSI_POS`
   - `STOK_HARIAN`
   - `REORDER_POINT`
   - `LAPORAN_HARIAN`

### Langkah 1.2 — Buat Apps Script

1. Di Google Sheets → klik menu **Extensions → Apps Script**
2. Halaman editor akan terbuka di tab baru
3. **Hapus** semua kode default (`function myFunction() {...}`)
4. **Copy-paste** seluruh isi file `Code.gs` ke editor
5. Ganti konfigurasi di bagian atas:

```javascript
const CONFIG = {
  ownerEmail: 'EMAIL_OWNER_KAMU@gmail.com',  // ← WAJIB diisi
  warkopNama: 'Warkop Nama Kamu',             // ← Ganti nama
  jamLaporan: 21,                              // Jam kirim email (21 = 21.00 WIB)
  // ... sisanya biarkan
};
```

6. Klik **💾 Save** (Ctrl+S)

### Langkah 1.3 — Deploy sebagai Web App

```
1. Klik "Deploy" (pojok kanan atas) → "New deployment"

2. Klik ikon ⚙️ gear di sebelah "Select type" → pilih "Web app"

3. Isi form:
   Description   : WarkopPOS API v1
   Execute as    : Me (your@gmail.com)        ← WAJIB pilih "Me"
   Who has access: Anyone                     ← WAJIB pilih "Anyone"

4. Klik "Deploy"

5. Muncul popup "Authorization required" → klik "Authorize access"
   → Pilih akun Google kamu
   → Klik "Advanced" → "Go to WarkopPOS (unsafe)"  ← ini normal
   → Klik "Allow"

6. Setelah authorized → muncul URL seperti ini:
   https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXX/exec

7. COPY URL ini → simpan baik-baik!
```

> ⚠️ **Penting:** Setiap kali kamu edit Code.gs, kamu HARUS deploy ulang
> (**Deploy → Manage deployments → Edit → New version → Deploy**)

### Langkah 1.4 — Aktifkan Trigger Email

```
1. Di editor Apps Script → klik ikon jam ⏰ (Triggers) di sidebar kiri

2. Klik "Add Trigger" (pojok kanan bawah)

3. Isi:
   Function to run : kirimLaporanHarian
   Event source    : Time-driven
   Type            : Day timer
   Time of day     : 9pm to 10pm   (= jam 21.00 WIB)

4. Klik "Save"

--- ATAU ---

Jalankan fungsi setupTrigger() sekali:
1. Di editor → pilih fungsi "setupTrigger" dari dropdown
2. Klik Run ▶
3. Authorize jika diminta
```

---

## BAGIAN 2 — Hubungkan Dashboard GitHub Pages ke API

### Langkah 2.1 — Tambah file api.js dan sync.js

Copy file-file berikut ke folder `js/` di project GitHub Pages kamu:
- `js/api.js` ← connector ke Apps Script
- `js/sync.js` ← sync engine + offline queue

### Langkah 2.2 — Tambahkan script ke setiap HTML

Di setiap file `.html`, tambahkan sebelum `</body>`:

```html
<!-- Tambahkan SETELAH app.js, SEBELUM script lainnya -->
<script src="../js/api.js"></script>
<script src="../js/sync.js"></script>
```

Untuk `index.html` (root):
```html
<script src="js/api.js"></script>
<script src="js/sync.js"></script>
```

### Langkah 2.3 — Konfigurasi URL di Dashboard

1. Buka website WarkopPOS kamu
2. Klik indikator **"○ Belum terhubung"** di pojok kanan atas topbar
3. Modal konfigurasi akan terbuka
4. Tempel URL Apps Script di kolom input
5. Klik **"Simpan & Test Koneksi"**
6. Jika berhasil → indikator berubah jadi **"● Terhubung Sheets"**

URL tersimpan di browser (localStorage) — tidak perlu isi ulang setiap buka.

---

## BAGIAN 3 — Integrasi PDT Scanner DC-108 ke Sheets

### Cara Kerja Scan

```
Scan barcode ──► Input field (HID keyboard) ──► lookupBarcode() ──► Google Sheets
                                               ──► (offline) lokal state
```

### Update Kode Opname untuk Konek ke Sheets

Di halaman `pages/opname.html`, update fungsi `lookupBarcode`:

```javascript
async function lookupBarcode(val) {
  if (!val || val.length < 3) return;
  
  const app = window.WarkopApp;
  
  // Coba dari Google Sheets dulu
  if (window.WarkopAPI?.isConfigured()) {
    try {
      const item = await window.WarkopAPI.lookupBarcode(val.trim());
      if (item) {
        document.getElementById('namaInput').value = item.nama;
        document.getElementById('stokSistemInput').value = item.stok;
        document.getElementById('stokFisikInput').value = '';
        document.getElementById('selisihInput').value = '';
        app.toast(`✅ Sheets: ${item.nama} — Stok: ${item.stok} ${item.satuan}`, 'success');
        return;
      }
    } catch(e) { /* fallback ke lokal */ }
  }
  
  // Fallback ke data lokal
  const item = app.state.barang.find(b => b.id === val.trim().toUpperCase());
  if (item) {
    document.getElementById('namaInput').value = item.nama;
    document.getElementById('stokSistemInput').value = item.stok;
    app.toast(`📱 Lokal: ${item.nama}`, 'warning');
  } else {
    app.toast('❌ Barcode tidak ditemukan!', 'error');
  }
}
```

### Update Fungsi Simpan Opname

```javascript
async function saveOpname() {
  const app = window.WarkopApp;
  const barcode = document.getElementById('barcodeInput').value;
  const nama = document.getElementById('namaInput').value;
  const sistem = parseFloat(document.getElementById('stokSistemInput').value) || 0;
  const fisik = parseFloat(document.getElementById('stokFisikInput').value);
  if (!nama || isNaN(fisik)) { app.toast('Lengkapi data!', 'error'); return; }
  
  const data = {
    tanggal: new Date().toLocaleDateString('id-ID'),
    shift: document.getElementById('shiftInput').value,
    petugas: document.getElementById('petugasInput').value,
    barcode, nama,
    satuan: app.state.barang.find(b=>b.id===barcode)?.satuan || '',
    stokSistem: sistem,
    stokFisik: fisik,
    keterangan: document.getElementById('keteranganInput').value
  };
  
  // Simpan ke Sheets (dengan offline fallback)
  const result = await window.WarkopSync.safePost('saveOpname', data);
  
  const selisih = fisik - sistem;
  const pct = sistem > 0 ? Math.abs(selisih/sistem) : 0;
  app.toast(
    result.offline
      ? `💾 Disimpan lokal (akan sync saat online)`
      : `✅ Opname ${nama} tersimpan ke Sheets!`,
    result.offline ? 'warning' : 'success'
  );
  resetForm();
  renderOpname();
}
```

### Update Fungsi Checkout POS

```javascript
async function checkout() {
  const app = window.WarkopApp;
  if (!cart.length) { app.toast('Keranjang kosong!', 'error'); return; }
  
  // Siapkan data transaksi dengan BOM
  const items = cart.map(ci => {
    const menu = app.state.menus.find(m => m.id === ci.id);
    return {
      kodeMenu: ci.id,
      namaMenu: ci.nama,
      harga: ci.harga,
      qty: ci.qty,
      tipe,
      kasir: document.getElementById('roleLabel')?.textContent || 'Karyawan',
      bom: menu?.bom.map(b => ({ barcode: b.barang, qty: b.qty })) || []
    };
  });
  
  // Kirim ke Sheets (dengan offline fallback)
  const result = await window.WarkopSync.safePost('saveTransaksi', items);
  
  // Update stok lokal juga
  cart.forEach(ci => {
    const menu = app.state.menus.find(m => m.id === ci.id);
    menu?.bom.forEach(b => {
      const item = app.state.barang.find(i => i.id === b.barang);
      if (item) item.stok = Math.max(0, item.stok - b.qty * ci.qty);
    });
    app.state.transaksi.push({
      no: 'TRX-' + Date.now(), waktu: new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),
      menu: ci.nama, qty: ci.qty, total: ci.harga * ci.qty, tipe
    });
  });
  
  cart = [];
  renderCart();
  renderHistory();
  app.toast(result.offline ? '💾 Transaksi disimpan lokal (akan sync)' : '✅ Transaksi tersimpan ke Sheets!', result.offline ? 'warning' : 'success');
}
```

---

## BAGIAN 4 — Test & Verifikasi

### Checklist setelah setup:

```
□ 1. Apps Script URL sudah di-paste di modal konfigurasi dashboard
□ 2. Klik "Test Koneksi" → muncul "✅ Berhasil terhubung"
□ 3. Indikator di topbar berubah jadi "● Terhubung Sheets"
□ 4. Buka Google Sheets → scan barcode di opname → data masuk ke sheet STOK_OPNAME
□ 5. Buat transaksi di POS → data masuk ke sheet TRANSAKSI_POS
□ 6. Stok di MASTER_BARANG berkurang sesuai BOM
□ 7. Jalankan setupTrigger() → cek email jam 21.00 WIB
```

### Test Manual di Apps Script Editor:

```javascript
// Jalankan di editor untuk test:
function testManual() {
  // Test lookup barcode
  Logger.log(handleScanPDT('WK-001'));
  
  // Test simpan opname
  Logger.log(saveOpname({
    tanggal: '06/05/2026',
    shift: 'Pagi',
    petugas: 'Test User',
    barcode: 'WK-001',
    nama: 'Kopi Bubuk',
    satuan: 'gram',
    stokSistem: 1200,
    stokFisik: 1150,
    keterangan: 'Test'
  }));
  
  // Test dashboard summary
  Logger.log(getDashboardSummary());
}
```

---

## BAGIAN 5 — Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| "CORS error" di browser | Apps Script belum deploy ulang setelah edit | Deploy → Manage → New version |
| "API URL belum dikonfigurasi" | URL belum diisi di modal | Klik indikator → isi URL |
| Data tidak masuk ke Sheets | Nama sheet salah | Cek nama tab di Sheets = persis `MASTER_BARANG` dll |
| Email tidak terkirim | Trigger belum dibuat | Jalankan `setupTrigger()` |
| "Authorization required" loop | Scope tidak cukup | Di script editor → klik kanan project → Edit manifest → tambah scope Gmail |
| Scan PDT tidak terdeteksi | PDT tidak mode HID | Set PDT ke USB HID mode, suffix = Enter |

---

## Ringkasan File yang Perlu Ditambahkan ke GitHub

```
warkop-dashboard/
├── js/
│   ├── app.js          ← sudah ada
│   ├── dashboard.js    ← sudah ada
│   ├── api.js          ← BARU: tambahkan ini
│   └── sync.js         ← BARU: tambahkan ini
└── ... (file lainnya tetap sama)
```

Setelah upload ke GitHub → update setiap HTML dengan:
```html
<script src="js/api.js"></script>    <!-- atau ../js/api.js di pages/ -->
<script src="js/sync.js"></script>
```

---

*Dengan setup ini, satu orang scan di warkop → data langsung masuk Google Sheets → owner bisa monitor dari HP di mana saja* ☕
