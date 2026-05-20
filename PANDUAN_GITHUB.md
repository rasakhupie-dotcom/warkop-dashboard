# 📘 PANDUAN LENGKAP — Upload & Deploy WarkopPOS ke GitHub

Panduan ini dirancang khusus untuk pemula yang belum pernah pakai GitHub.

---

## BAGIAN 1 — Daftar & Login GitHub

1. Buka **https://github.com**
2. Klik **"Sign up"** (daftar) atau **"Sign in"** (login)
3. Isi email, password, username
4. Verifikasi email → selesai

---

## BAGIAN 2 — Buat Repository Baru

```
1. Setelah login → klik tombol hijau "New" di sebelah kiri
   ATAU klik ikon "+" di pojok kanan atas → "New repository"

2. Isi form:
   Repository name  : warkop-dashboard
   Description      : Sistem Stok Opname UMKM Warkop
   Visibility       : ● Public   ← wajib Public agar bisa GitHub Pages gratis
   
3. Klik "Create repository" (tombol hijau)
```

---

## BAGIAN 3 — Upload File (Cara Termudah)

```
1. Setelah repository dibuat, kamu akan melihat halaman kosong
2. Klik link "uploading an existing file"
   (tertulis: "...or upload existing files")

3. Buka Windows Explorer / Finder di komputermu
4. Buka folder "warkop-dashboard"
5. Pilih SEMUA file dan folder di dalamnya:
   - Ctrl+A (Windows) atau Cmd+A (Mac) untuk select all
   - Drag & drop ke area upload di GitHub

   ⚠️ PENTING: Upload ISI folder, bukan folder itu sendiri!
   Yang diupload: index.html, css/, js/, pages/, .nojekyll, 404.html, README.md

6. Tunggu semua file ter-upload (ada progress bar)

7. Scroll ke bawah → kolom "Commit changes":
   Biarkan default atau isi: "Upload WarkopPOS system"
   
8. Klik tombol hijau "Commit changes"
```

---

## BAGIAN 4 — Aktifkan GitHub Pages

```
1. Di halaman repository → klik tab "Settings" (ikon gear ⚙️)

2. Di sidebar kiri, scroll ke bawah → klik "Pages"

3. Di bagian "Build and deployment":
   Source: pilih "Deploy from a branch"
   
4. Di bagian "Branch":
   Branch dropdown: pilih "main"
   Folder dropdown: pilih "/ (root)"
   
5. Klik tombol "Save"

6. Halaman akan reload → muncul banner hijau:
   "Your site is live at https://USERNAME.github.io/warkop-dashboard"
   
7. Klik link tersebut → website WarkopPOS kamu sudah online! ✅
```

> ⏱️ Biasanya butuh 2-5 menit sampai website bisa diakses pertama kali.

---

## BAGIAN 5 — Cek Website Berhasil

Buka browser → ketik:
```
https://USERNAME.github.io/warkop-dashboard
```
*(ganti USERNAME dengan username GitHub kamu)*

Jika muncul dashboard WarkopPOS → **BERHASIL!** 🎉

---

## BAGIAN 6 — Update File (Kalau Ada Perubahan)

```
1. Buka repository di GitHub
2. Navigasi ke file yang ingin diubah
3. Klik ikon pensil ✏️ (Edit this file)
4. Ubah isi file
5. Klik "Commit changes"
6. Website otomatis update dalam 1-2 menit
```

Atau untuk upload file baru/update banyak file:
```
1. Di halaman repository → klik "Add file" → "Upload files"
2. Drag file baru ke area upload
3. Commit changes
```

---

## BAGIAN 7 — Bagikan Link ke Karyawan

Setelah website live, kamu bisa bagikan link ke semua karyawan:

```
Link untuk Owner    : https://USERNAME.github.io/warkop-dashboard
Link untuk Karyawan : https://USERNAME.github.io/warkop-dashboard

(Link sama, role dipilih via dropdown di dalam website)
```

Bisa dibuka di:
- ✅ Laptop / PC (Chrome, Firefox, Edge, Safari)
- ✅ HP Android (Chrome Mobile)
- ✅ iPhone (Safari)
- ✅ Tablet

---

## BAGIAN 8 — Troubleshooting

### Website tidak muncul setelah 10 menit?
```
→ Cek Settings → Pages → pastikan Source = "Deploy from a branch"
→ Pastikan ada file index.html di root repository (bukan dalam subfolder)
→ Coba hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### Error 404 di halaman tertentu?
```
→ Pastikan file .nojekyll ada di root repository
→ Cek nama file sama persis (case-sensitive): pos.html bukan Pos.html
→ Cek path di HTML: href="../pages/pos.html" bukan href="pages/pos.html"
```

### File tidak ter-upload?
```
→ Jangan upload folder .github secara manual, buat dulu via GitHub web
→ File mulai titik (.nojekyll) → pastikan "show hidden files" aktif di OS
→ Coba upload per-folder jika upload semua sekaligus gagal
```

### Scan PDT tidak masuk ke input field?
```
→ Pastikan kursor aktif di field input (klik dulu pada field)
→ Cek setting PDT: mode USB HID, suffix Enter
→ Coba di browser Chrome (paling compatible dengan HID devices)
```

---

## BAGIAN 9 — Link Penting

| Resource | URL |
|---|---|
| Repository kamu | `https://github.com/USERNAME/warkop-dashboard` |
| Website live | `https://USERNAME.github.io/warkop-dashboard` |
| GitHub Pages docs | `https://docs.github.com/pages` |
| Kasir POS | `.../warkop-dashboard/pages/pos.html` |
| Stok Opname | `.../warkop-dashboard/pages/opname.html` |
| Reorder Point | `.../warkop-dashboard/pages/reorder.html` |

---

*Simpan panduan ini di tempat yang mudah ditemukan* ☕
