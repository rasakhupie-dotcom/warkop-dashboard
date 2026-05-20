# Setup Sheet USERS untuk Multi-Device Login

## Langkah Cepat

### 1. Jalankan setupUsersSheet()
Di Apps Script editor:
- Pilih fungsi `setupUsersSheet` dari dropdown
- Klik **Run ▶**
- Sheet `USERS` otomatis dibuat dengan 2 akun default

### 2. Deploy ulang Apps Script (wajib!)
Karena ada fungsi baru (authLogin, getUsers, dll):
```
Deploy → Manage deployments → ✏️ Edit → New version → Deploy
```

### 3. Test di browser
Buka halaman login → perhatikan indikator di bawah form:
- 🟢 Hijau = Sheets terhubung (multi-device aktif)
- 🟡 Kuning = Sheets ada tapi tidak merespons
- ⚫ Abu = Mode lokal (offline)

## Struktur Sheet USERS

| Kolom | Isi |
|---|---|
| ID | USR-001 |
| Nama | Pemilik |
| Username | owner |
| PasswordHash | SHA-256 hash |
| Role | owner / karyawan |
| Aktif | TRUE / FALSE |
| MustChangePwd | TRUE / FALSE |
| CreatedAt | ISO timestamp |
| UpdatedAt | ISO timestamp |
| LastLoginAt | ISO timestamp |
| LastLoginDevice | User-agent browser |

## Default Akun
| Role | Username | Password |
|---|---|---|
| Owner | owner | owner123 |
| Karyawan | karyawan1 | karyawan123 |

⚠️ Ganti password segera setelah login pertama!

## Cara Kerja Multi-Device
```
Login di HP/Tablet/PC
       │
       ▼
auth.js → POST authLogin ke Apps Script
       │
       ├── Apps Script cek USERS sheet (hash SHA-256)
       │
       ├── Berhasil → session token dibuat di browser
       │
       └── Gagal → error "password salah"

Owner tambah karyawan baru:
auth.js → POST authAddUser → Apps Script → append baris di USERS sheet
→ Karyawan bisa langsung login dari device manapun
```
