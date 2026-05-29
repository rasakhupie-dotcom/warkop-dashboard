/* ================================================================
   WARKOPPOS — app.js v3.1
   - Menu bisa ditambah/hapus dari dashboard
   - Data otomatis sync dari Google Sheets
   - State tersimpan di localStorage sebagai cache offline
   ================================================================ */

window.App = (() => {

  // ── STATE — diisi dari localStorage, di-refresh dari Sheets ────
  const state = {
    barang: _loadLocal('warkop_barang') || _defaultBarang(),
    menus:  _loadLocal('warkop_menus')  || _defaultMenus(),
    supplier: _loadLocal('warkop_supplier') || _defaultSupplier(),
    transaksi: [],
    role: 'owner',
  };

  // ── UTILS ───────────────────────────────────────────────────────
  function rp(n) {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  }
  function angka(n) {
    const num = parseFloat(n) || 0;
    return num % 1 === 0 ? num.toLocaleString('id-ID') : num.toFixed(2);
  }
  function rop(b) { return (b.avg * b.lead) + b.safety; }
  function statusStok(b) {
    const r = rop(b);
    if (b.stok <= r)    return 'reorder';
    if (b.stok <= b.min) return 'hampir';
    return 'aman';
  }
  function hpp(menuId) {
    const menu = state.menus.find(m => m.id === menuId);
    if (!menu) return 0;
    return menu.bom.reduce((t, item) => {
      const b = state.barang.find(x => x.id === item.b);
      return t + (b ? b.hBeli * item.q : 0);
    }, 0);
  }

  // ── LOCAL STORAGE ───────────────────────────────────────────────
  function _loadLocal(key) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; }
    catch(e) { return null; }
  }
  function saveLocal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  }
  function saveBarang()   { saveLocal('warkop_barang',    state.barang); }
  function saveMenus()    { saveLocal('warkop_menus',     state.menus); }
  function saveSupplier() { saveLocal('warkop_supplier',  state.supplier); }

  // ── SYNC DARI GOOGLE SHEETS ────────────────────────────────────
  // Dipanggil saat halaman load — ambil data terbaru dari Sheets
  async function syncFromSheets() {
    const api = window.WarkopAPI;
    if (!api || !api.isConfigured()) return false;
    try {
      // Ambil barang terbaru
      const barang = await api.getBarang();
      if (Array.isArray(barang) && barang.length > 0) {
        state.barang = barang;
        saveBarang();
      }
      // Ambil BOM/menu terbaru
      const bom = await api.getBOM();
      if (Array.isArray(bom) && bom.length > 0) {
        // Konversi format Sheets → format state
        state.menus = bom.map(m => ({
          id:    m.kodeMenu,
          nama:  m.namaMenu,
          harga: m.hargaJual || 0,
          emoji: _emojiMenu(m.namaMenu),
          aktif: true,
          bom:   (m.bom || []).map(b => ({
            b: b.barcode || b.b,
            q: b.qty || b.q || 0,
          })),
        }));
        saveMenus();
      }
      _updateSyncBadge(true);
      return true;
    } catch(e) {
      console.warn('[App] Sync Sheets gagal:', e.message);
      _updateSyncBadge(false);
      return false;
    }
  }

  function _emojiMenu(nama) {
    const n = (nama || '').toLowerCase();
    if (n.includes('kopi') || n.includes('coffee')) return '☕';
    if (n.includes('teh') || n.includes('tea'))     return '🍵';
    if (n.includes('matcha'))  return '🍵';
    if (n.includes('susu') || n.includes('milk'))   return '🥛';
    if (n.includes('indomie') || n.includes('mie'))  return '🍜';
    if (n.includes('roti') || n.includes('toast'))   return '🍞';
    if (n.includes('air') || n.includes('water'))    return '💧';
    if (n.includes('jus') || n.includes('juice'))    return '🍹';
    if (n.includes('es'))      return '🧊';
    if (n.includes('snack') || n.includes('cemilan')) return '🍟';
    return '🍽';
  }

  function _updateSyncBadge(ok) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = ok ? '● Sheets' : '○ Lokal';
    el.style.color = ok ? 'var(--hijau)' : 'var(--kuning)';
  }

  // ── MENU MANAGEMENT ────────────────────────────────────────────
  function tambahMenu(data) {
    // data: { nama, harga, emoji, bom:[{b,q}] }
    const id = 'MN-' + Date.now();
    const menu = {
      id,
      nama:  data.nama,
      harga: Number(data.harga) || 0,
      emoji: data.emoji || _emojiMenu(data.nama),
      aktif: true,
      bom:   data.bom || [],
    };
    state.menus.push(menu);
    saveMenus();
    return menu;
  }

  function hapusMenu(menuId) {
    const idx = state.menus.findIndex(m => m.id === menuId);
    if (idx < 0) return false;
    state.menus.splice(idx, 1);
    saveMenus();
    return true;
  }

  function ubahMenu(menuId, data) {
    const menu = state.menus.find(m => m.id === menuId);
    if (!menu) return false;
    if (data.nama)   menu.nama   = data.nama;
    if (data.harga !== undefined) menu.harga = Number(data.harga) || 0;
    if (data.emoji)  menu.emoji  = data.emoji;
    if (data.aktif !== undefined) menu.aktif = data.aktif;
    if (data.bom)    menu.bom    = data.bom;
    saveMenus();
    return true;
  }

  function toggleAktifMenu(menuId) {
    const menu = state.menus.find(m => m.id === menuId);
    if (!menu) return false;
    menu.aktif = !menu.aktif;
    saveMenus();
    return menu.aktif;
  }

  // ── TOAST ───────────────────────────────────────────────────────
  let _toastTimer;
  function toast(pesan, jenis = 'sukses') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = pesan;
    el.className = 'toast tampil ' + jenis;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('tampil'), 3200);
  }

  // ── JAM ─────────────────────────────────────────────────────────
  function updateJam() {
    const el = document.getElementById('jam');
    if (!el) return;
    const n = new Date();
    el.textContent =
      n.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' }) +
      ' ' + n.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  // ── SIDEBAR ─────────────────────────────────────────────────────
  function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('terbuka');
    document.getElementById('sidebarOverlay')?.classList.toggle('tampil');
  }
  function tutupSidebar() {
    document.getElementById('sidebar')?.classList.remove('terbuka');
    document.getElementById('sidebarOverlay')?.classList.remove('tampil');
  }

  // ── SCAN SIMULASI ────────────────────────────────────────────────
  let _scanIdx = 0;
  function scan() {
    const item = state.barang[_scanIdx % state.barang.length];
    _scanIdx++;
    return item;
  }

  // ── DOWNLOAD EXCEL ───────────────────────────────────────────────
  // Buat file Excel dari data state + transaksi hari ini
  function downloadExcel() {
    // Gunakan library SheetJS yang diload via CDN
    if (typeof XLSX === 'undefined') {
      toast('Memuat library Excel...', 'peringatan');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => _buatExcel();
      document.head.appendChild(script);
      return;
    }
    _buatExcel();
  }

  function _buatExcel() {
    const wb = XLSX.utils.book_new();
    const tgl = new Date().toLocaleDateString('id-ID');

    // Sheet 1: Ringkasan
    const ringkasan = [
      ['LAPORAN HARIAN WARKOPPOS'],
      ['Tanggal', tgl],
      [''],
      ['RINGKASAN PENJUALAN'],
      ['Total Penjualan', state.transaksi.reduce((s,t)=>s+t.total,0)],
      ['Jumlah Transaksi', state.transaksi.length],
      [''],
      ['STATUS STOK KRITIS'],
      ['Barang', 'Stok Sekarang', 'Minimal', 'Status'],
      ...state.barang
        .filter(b => statusStok(b) !== 'aman')
        .map(b => [b.nama, angka(b.stok), angka(b.min), statusStok(b) === 'reorder' ? 'REORDER!' : 'Hampir Habis']),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');

    // Sheet 2: Master Barang
    const headerBarang = ['Kode','Nama','Kategori','Satuan','Stok','Min Stok','Safety Stock','Lead Time','Pakai/Hari','Harga Beli','Harga Jual','ROP','Status'];
    const dataBarang = state.barang.map(b => [
      b.id, b.nama, b.kat, b.sat,
      b.stok, b.min, b.safety, b.lead, b.avg,
      b.hBeli, b.hJual || 0,
      rop(b).toFixed(1),
      statusStok(b) === 'reorder' ? 'REORDER!' : statusStok(b) === 'hampir' ? 'Hampir Habis' : 'Aman',
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headerBarang, ...dataBarang]), 'Master Barang');

    // Sheet 3: Daftar Menu
    const headerMenu = ['Kode Menu','Nama Menu','Harga Jual','HPP','Margin','Status'];
    const dataMenu = state.menus.map(m => {
      const h = hpp(m.id);
      const margin = m.harga > 0 ? ((m.harga - h)/m.harga*100).toFixed(1) + '%' : '—';
      return [m.id, m.nama, m.harga, h, margin, m.aktif ? 'Aktif' : 'Nonaktif'];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headerMenu, ...dataMenu]), 'Daftar Menu');

    // Sheet 4: Transaksi Hari Ini
    if (state.transaksi.length > 0) {
      const headerTrx = ['Waktu','Menu','Qty','Total','Tipe'];
      const dataTrx = state.transaksi.map(t => [t.waktu, t.menu, t.qty, t.total, t.tipe]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headerTrx, ...dataTrx]), 'Transaksi Hari Ini');
    }

    // Download
    XLSX.writeFile(wb, 'Laporan_WarkopPOS_' + tgl.replace(/\//g,'-') + '.xlsx');
    toast('✅ File Excel berhasil diunduh!', 'sukses');
  }

  // ── DOWNLOAD PDF ─────────────────────────────────────────────────
  // Buka window cetak browser sebagai PDF
  function downloadPDF() {
    // Buat halaman laporan khusus untuk dicetak
    const tgl = new Date().toLocaleDateString('id-ID', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
    const totalJual = state.transaksi.reduce((s,t) => s+t.total, 0);
    const kritis = state.barang.filter(b => statusStok(b) !== 'aman');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan WarkopPOS</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; color: #333; padding: 20px; font-size: 12px; }
  h1 { font-size: 18px; color: #1D9E75; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #888; margin-bottom: 20px; }
  h2 { font-size: 13px; font-weight: bold; color: #1D9E75; margin: 16px 0 8px;
       padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd; }
  td { padding: 6px 8px; border: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge-merah { color: #DC2626; font-weight: bold; }
  .badge-kuning { color: #D97706; font-weight: bold; }
  .badge-hijau  { color: #1D9E75; font-weight: bold; }
  .ringkasan-box { background: #E1F5EE; border: 1px solid #9FE1CB; border-radius: 6px;
    padding: 14px; margin-bottom: 16px; }
  .ringkasan-box p { margin-bottom: 6px; }
  .kesimpulan { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px;
    padding: 14px; font-size: 12px; line-height: 1.6; }
  @media print {
    body { padding: 10px; }
    button { display: none; }
  }
</style>
</head>
<body>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
  <span style="font-size:28px;">☕</span>
  <div>
    <h1>WarkopPOS — Laporan Harian</h1>
    <div class="sub">${tgl}</div>
  </div>
</div>

<h2>📊 Ringkasan Penjualan</h2>
<div class="ringkasan-box">
  <p><strong>Total Penjualan:</strong> <span style="color:#1D9E75;font-size:16px;font-weight:bold;">Rp ${totalJual.toLocaleString('id-ID')}</span></p>
  <p><strong>Jumlah Transaksi:</strong> ${state.transaksi.length} transaksi</p>
  <p><strong>Rata-rata per Transaksi:</strong> Rp ${state.transaksi.length > 0 ? Math.round(totalJual/state.transaksi.length).toLocaleString('id-ID') : 0}</p>
</div>

${state.transaksi.length > 0 ? `
<h2>🧾 Detail Transaksi</h2>
<table>
  <thead><tr><th>Waktu</th><th>Menu</th><th>Qty</th><th>Total</th><th>Tipe</th></tr></thead>
  <tbody>
    ${state.transaksi.map(t => `
    <tr>
      <td>${t.waktu}</td>
      <td>${t.menu}</td>
      <td>${t.qty}</td>
      <td>Rp ${t.total.toLocaleString('id-ID')}</td>
      <td>${t.tipe}</td>
    </tr>`).join('')}
  </tbody>
</table>` : '<p style="color:#888;margin-bottom:16px;">Belum ada transaksi hari ini.</p>'}

<h2>📦 Status Stok Bahan Baku</h2>
<table>
  <thead><tr><th>Nama Barang</th><th>Stok Sekarang</th><th>Minimal</th><th>ROP</th><th>Status</th></tr></thead>
  <tbody>
    ${state.barang.slice(0, 20).map(b => {
      const st = statusStok(b);
      const warna = st === 'reorder' ? 'badge-merah' : st === 'hampir' ? 'badge-kuning' : 'badge-hijau';
      const lbl   = st === 'reorder' ? '⚠ REORDER!' : st === 'hampir' ? '⚡ Hampir Habis' : '✓ Aman';
      return `<tr>
        <td><strong>${b.nama}</strong></td>
        <td>${b.stok} ${b.sat}</td>
        <td>${b.min} ${b.sat}</td>
        <td>${rop(b).toFixed(1)} ${b.sat}</td>
        <td class="${warna}">${lbl}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<h2>🍽 Daftar Menu</h2>
<table>
  <thead><tr><th>Menu</th><th>Harga Jual</th><th>Biaya Produksi</th><th>Margin</th><th>Status</th></tr></thead>
  <tbody>
    ${state.menus.map(m => {
      const h = hpp(m.id);
      const margin = m.harga > 0 ? ((m.harga - h)/m.harga*100).toFixed(1) + '%' : '—';
      return `<tr>
        <td>${m.emoji} <strong>${m.nama}</strong></td>
        <td>Rp ${m.harga.toLocaleString('id-ID')}</td>
        <td>Rp ${Math.round(h).toLocaleString('id-ID')}</td>
        <td style="font-weight:bold;color:#1D9E75;">${margin}</td>
        <td>${m.aktif ? '<span style="color:#1D9E75;">✓ Aktif</span>' : '<span style="color:#DC2626;">✗ Nonaktif</span>'}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="kesimpulan">
  <strong>📝 Kesimpulan:</strong><br/>
  Total penjualan hari ini Rp ${totalJual.toLocaleString('id-ID')} dari ${state.transaksi.length} transaksi.
  ${kritis.length > 0
    ? kritis.length + ' bahan baku perlu perhatian: ' + kritis.slice(0,3).map(b=>b.nama).join(', ') + '.'
    : 'Semua stok bahan baku dalam kondisi aman.'}
  Laporan dibuat otomatis oleh WarkopPOS pada ${new Date().toLocaleString('id-ID')}.
</div>

<div style="text-align:center;margin-top:20px;">
  <button onclick="window.print()" style="padding:10px 24px;background:#1D9E75;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">
    🖨️ Cetak / Simpan sebagai PDF
  </button>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      toast('Popup diblokir browser. Izinkan popup untuk mengunduh PDF.', 'galat');
      return;
    }
    win.document.write(html);
    win.document.close();
    // Otomatis buka dialog cetak setelah halaman loaded
    win.onload = () => setTimeout(() => win.print(), 300);
    toast('✅ Halaman laporan dibuka. Pilih "Save as PDF" di dialog cetak.', 'sukses');
  }

  // ── KIRIM LAPORAN EMAIL ──────────────────────────────────────────
  async function kirimLaporan() {
    const api = window.WarkopAPI;
    if (api && api.isConfigured()) {
      try {
        await api.sendLaporan();
        toast('✅ Laporan dikirim ke email owner!', 'sukses');
        return;
      } catch(e) {
        console.warn('Kirim laporan gagal:', e.message);
      }
    }
    toast('Laporan harian dijadwalkan dikirim pukul 21.00 WIB ✉', 'sukses');
  }

  // ── ANIMASI ──────────────────────────────────────────────────────
  function initAnimasi() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('tampil'); });
    }, { threshold: 0.05 });
    document.querySelectorAll('.muncul').forEach(el => obs.observe(el));
  }

  // ── INIT ─────────────────────────────────────────────────────────
  function init() {
    updateJam();
    setInterval(updateJam, 1000);
    initAnimasi();

    // Tutup sidebar saat klik overlay
    document.getElementById('sidebarOverlay')?.addEventListener('click', tutupSidebar);

    // Sync role dari auth
    const sess = window.WarkopAuth?.getCurrentUser();
    if (sess) state.role = sess.role;

    // Sync data dari Sheets di background
    if (window.WarkopAPI) {
      syncFromSheets().then(ok => {
        if (ok) toast('Data tersinkronisasi dari Google Sheets ✓', 'sukses');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  // ── DEFAULT DATA ─────────────────────────────────────────────────
  function _defaultBarang() {
    return [
      { id:'WK-001', nama:'Kopi Bubuk',      kat:'Bahan Baku',  sat:'gram',   stok:1200, min:500,  safety:300, lead:1,   avg:200,  hBeli:120,   hJual:0,     barcodeAsli:'' },
      { id:'WK-002', nama:'Susu Cair',        kat:'Bahan Baku',  sat:'ml',     stok:800,  min:1000, safety:500, lead:1,   avg:1500, hBeli:18,    hJual:0,     barcodeAsli:'' },
      { id:'WK-003', nama:'Gula Pasir',       kat:'Bahan Baku',  sat:'gram',   stok:3000, min:1000, safety:500, lead:1,   avg:300,  hBeli:14,    hJual:0,     barcodeAsli:'' },
      { id:'WK-004', nama:'Gula Aren Cair',   kat:'Bahan Baku',  sat:'ml',     stok:2100, min:1000, safety:600, lead:1,   avg:300,  hBeli:25,    hJual:0,     barcodeAsli:'' },
      { id:'WK-005', nama:'Teh Celup',        kat:'Bahan Baku',  sat:'pcs',    stok:50,   min:25,   safety:10,  lead:2,   avg:5,    hBeli:320,   hJual:0,     barcodeAsli:'' },
      { id:'WK-006', nama:'Matcha Powder',    kat:'Bahan Baku',  sat:'gram',   stok:500,  min:200,  safety:100, lead:3,   avg:50,   hBeli:180,   hJual:0,     barcodeAsli:'' },
      { id:'WK-007', nama:'Creamer',          kat:'Bahan Baku',  sat:'gram',   stok:800,  min:300,  safety:150, lead:2,   avg:100,  hBeli:55,    hJual:0,     barcodeAsli:'' },
      { id:'WK-008', nama:'Es Batu',          kat:'Bahan Baku',  sat:'bag',    stok:4,    min:5,    safety:3,   lead:0.5, avg:8,    hBeli:8000,  hJual:0,     barcodeAsli:'' },
      { id:'WK-009', nama:'Indomie',          kat:'Bahan Baku',  sat:'pcs',    stok:80,   min:40,   safety:20,  lead:1,   avg:20,   hBeli:3000,  hJual:0,     barcodeAsli:'8992388108614' },
      { id:'WK-010', nama:'Telur Ayam',       kat:'Bahan Baku',  sat:'pcs',    stok:60,   min:30,   safety:15,  lead:1,   avg:20,   hBeli:2500,  hJual:0,     barcodeAsli:'' },
      { id:'WK-011', nama:'Roti Tawar',       kat:'Bahan Baku',  sat:'lembar', stok:40,   min:20,   safety:10,  lead:1,   avg:20,   hBeli:1200,  hJual:0,     barcodeAsli:'' },
      { id:'WK-012', nama:'Saus Sambal',      kat:'Bahan Baku',  sat:'sachet', stok:40,   min:20,   safety:10,  lead:2,   avg:10,   hBeli:750,   hJual:0,     barcodeAsli:'' },
      { id:'WK-013', nama:'Minyak Goreng',    kat:'Bahan Baku',  sat:'ml',     stok:2000, min:1000, safety:500, lead:2,   avg:50,   hBeli:18,    hJual:0,     barcodeAsli:'' },
      { id:'WK-020', nama:'Air Mineral 600ml',kat:'Barang Jual', sat:'pcs',    stok:48,   min:24,   safety:12,  lead:1,   avg:12,   hBeli:2500,  hJual:5000,  barcodeAsli:'8886010100369' },
      { id:'WK-021', nama:'Snack Chitato',    kat:'Barang Jual', sat:'pcs',    stok:20,   min:10,   safety:5,   lead:2,   avg:3,    hBeli:7000,  hJual:12000, barcodeAsli:'8999999221034' },
      { id:'WK-030', nama:'Cup Plastik 22oz', kat:'Inventaris',  sat:'pcs',    stok:85,   min:100,  safety:50,  lead:2,   avg:80,   hBeli:500,   hJual:0,     barcodeAsli:'' },
      { id:'WK-031', nama:'Sedotan',          kat:'Inventaris',  sat:'pcs',    stok:200,  min:100,  safety:50,  lead:2,   avg:150,  hBeli:200,   hJual:0,     barcodeAsli:'' },
      { id:'WK-032', nama:'Gas LPG 3kg',      kat:'Inventaris',  sat:'tabung', stok:0.8,  min:1,    safety:1,   lead:0.1, avg:0.5,  hBeli:22000, hJual:0,     barcodeAsli:'' },
      { id:'WK-033', nama:'Tisu',             kat:'Inventaris',  sat:'lembar', stok:400,  min:200,  safety:100, lead:3,   avg:100,  hBeli:300,   hJual:0,     barcodeAsli:'' },
      { id:'WK-034', nama:'Gelas Plastik',    kat:'Inventaris',  sat:'pcs',    stok:120,  min:100,  safety:50,  lead:2,   avg:60,   hBeli:400,   hJual:0,     barcodeAsli:'' },
    ];
  }

  function _defaultMenus() {
    return [
      { id:'MN-001', nama:'Es Kopi Susu',  harga:18000, emoji:'☕', aktif:true,
        bom:[{b:'WK-001',q:20},{b:'WK-004',q:30},{b:'WK-002',q:100},{b:'WK-008',q:0.05},{b:'WK-030',q:1},{b:'WK-031',q:1}] },
      { id:'MN-002', nama:'Kopi Hitam',    harga:10000, emoji:'☕', aktif:true,
        bom:[{b:'WK-001',q:15},{b:'WK-003',q:10},{b:'WK-034',q:1}] },
      { id:'MN-003', nama:'Matcha Latte',  harga:22000, emoji:'🍵', aktif:true,
        bom:[{b:'WK-006',q:15},{b:'WK-002',q:150},{b:'WK-003',q:20},{b:'WK-008',q:0.05},{b:'WK-030',q:1}] },
      { id:'MN-004', nama:'Indomie Telur', harga:15000, emoji:'🍜', aktif:true,
        bom:[{b:'WK-009',q:1},{b:'WK-010',q:1},{b:'WK-013',q:10},{b:'WK-012',q:1},{b:'WK-032',q:0.02}] },
      { id:'MN-005', nama:'Roti Bakar',    harga:12000, emoji:'🍞', aktif:true,
        bom:[{b:'WK-011',q:4},{b:'WK-013',q:5},{b:'WK-003',q:15},{b:'WK-032',q:0.01}] },
      { id:'MN-006', nama:'Air Mineral',   harga:5000,  emoji:'💧', aktif:true,
        bom:[{b:'WK-020',q:1}] },
    ];
  }

  function _defaultSupplier() {
    return [
      { nama:'CV Kopi Nusantara',   hp:'08123456789', barang:'Kopi Bubuk, Gula Aren', lead:'1 hari',   aktif:true },
      { nama:'Depot Susu Segar',    hp:'08234567890', barang:'Susu Cair, Creamer',    lead:'1 hari',   aktif:true },
      { nama:'Toko Gas Pak Budi',   hp:'08345678901', barang:'Gas LPG 3kg',           lead:'2 jam',    aktif:true },
      { nama:'Grosir Plastik Jaya', hp:'08456789012', barang:'Cup, Sedotan',          lead:'2 hari',   aktif:false },
      { nama:'Toko Sembako Jaya',   hp:'08567890123', barang:'Gula, Indomie, Saus',   lead:'1 hari',   aktif:true },
      { nama:'Pembuat Es Pak Ali',  hp:'08678901234', barang:'Es Batu',               lead:'30 menit', aktif:true },
    ];
  }

  return {
    state,
    rp, angka, rop, statusStok, hpp,
    saveBarang, saveMenus, saveSupplier,
    tambahMenu, hapusMenu, ubahMenu, toggleAktifMenu,
    syncFromSheets,
    toast, toggleSidebar, tutupSidebar, scan,
    downloadExcel, downloadPDF, kirimLaporan,
  };
})();
