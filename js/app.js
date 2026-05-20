/* ================================================================
   WARKOPPOS — app.js
   State global, utilitas, dan inisialisasi
   ================================================================ */

window.App = (() => {

  /* ── DATA MASTER ────────────────────────────────────────────── */
  const state = {
    barang: [
      { id:'WK-001', nama:'Kopi Bubuk',      kat:'Bahan Baku',  sat:'gram',   stok:1200, min:500,  safety:300, lead:1,   avg:200,  hBeli:120,   hJual:0     },
      { id:'WK-002', nama:'Susu Cair',        kat:'Bahan Baku',  sat:'ml',     stok:800,  min:1000, safety:500, lead:1,   avg:1500, hBeli:18,    hJual:0     },
      { id:'WK-003', nama:'Gula Pasir',       kat:'Bahan Baku',  sat:'gram',   stok:3000, min:1000, safety:500, lead:1,   avg:300,  hBeli:14,    hJual:0     },
      { id:'WK-004', nama:'Gula Aren Cair',   kat:'Bahan Baku',  sat:'ml',     stok:2100, min:1000, safety:600, lead:1,   avg:300,  hBeli:25,    hJual:0     },
      { id:'WK-005', nama:'Teh Celup',        kat:'Bahan Baku',  sat:'pcs',    stok:50,   min:25,   safety:10,  lead:2,   avg:5,    hBeli:320,   hJual:0     },
      { id:'WK-006', nama:'Matcha Powder',    kat:'Bahan Baku',  sat:'gram',   stok:500,  min:200,  safety:100, lead:3,   avg:50,   hBeli:180,   hJual:0     },
      { id:'WK-007', nama:'Creamer',          kat:'Bahan Baku',  sat:'gram',   stok:800,  min:300,  safety:150, lead:2,   avg:100,  hBeli:55,    hJual:0     },
      { id:'WK-008', nama:'Es Batu',          kat:'Bahan Baku',  sat:'bag',    stok:4,    min:5,    safety:3,   lead:0.5, avg:8,    hBeli:8000,  hJual:0     },
      { id:'WK-009', nama:'Indomie',          kat:'Bahan Baku',  sat:'pcs',    stok:80,   min:40,   safety:20,  lead:1,   avg:20,   hBeli:3000,  hJual:0     },
      { id:'WK-010', nama:'Telur Ayam',       kat:'Bahan Baku',  sat:'pcs',    stok:60,   min:30,   safety:15,  lead:1,   avg:20,   hBeli:2500,  hJual:0     },
      { id:'WK-011', nama:'Roti Tawar',       kat:'Bahan Baku',  sat:'lembar', stok:40,   min:20,   safety:10,  lead:1,   avg:20,   hBeli:1200,  hJual:0     },
      { id:'WK-012', nama:'Saus Sambal',      kat:'Bahan Baku',  sat:'sachet', stok:40,   min:20,   safety:10,  lead:2,   avg:10,   hBeli:750,   hJual:0     },
      { id:'WK-013', nama:'Minyak Goreng',    kat:'Bahan Baku',  sat:'ml',     stok:2000, min:1000, safety:500, lead:2,   avg:50,   hBeli:18,    hJual:0     },
      { id:'WK-020', nama:'Air Mineral 600ml',kat:'Barang Jual', sat:'pcs',    stok:48,   min:24,   safety:12,  lead:1,   avg:12,   hBeli:2500,  hJual:5000  },
      { id:'WK-021', nama:'Snack Chitato',    kat:'Barang Jual', sat:'pcs',    stok:20,   min:10,   safety:5,   lead:2,   avg:3,    hBeli:7000,  hJual:12000 },
      { id:'WK-030', nama:'Cup Plastik 22oz', kat:'Inventaris',  sat:'pcs',    stok:85,   min:100,  safety:50,  lead:2,   avg:80,   hBeli:500,   hJual:0     },
      { id:'WK-031', nama:'Sedotan',          kat:'Inventaris',  sat:'pcs',    stok:200,  min:100,  safety:50,  lead:2,   avg:150,  hBeli:200,   hJual:0     },
      { id:'WK-032', nama:'Gas LPG 3kg',      kat:'Inventaris',  sat:'tabung', stok:0.8,  min:1,    safety:1,   lead:0.1, avg:0.5,  hBeli:22000, hJual:0     },
      { id:'WK-033', nama:'Tisu',             kat:'Inventaris',  sat:'lembar', stok:400,  min:200,  safety:100, lead:3,   avg:100,  hBeli:300,   hJual:0     },
      { id:'WK-034', nama:'Gelas Plastik',    kat:'Inventaris',  sat:'pcs',    stok:120,  min:100,  safety:50,  lead:2,   avg:60,   hBeli:400,   hJual:0     },
    ],

    menus: [
      { id:'MN-001', nama:'Es Kopi Susu',  harga:18000, emoji:'☕',
        bom:[{b:'WK-001',q:20},{b:'WK-004',q:30},{b:'WK-002',q:100},{b:'WK-008',q:0.05},{b:'WK-030',q:1},{b:'WK-031',q:1}] },
      { id:'MN-002', nama:'Kopi Hitam',    harga:10000, emoji:'☕',
        bom:[{b:'WK-001',q:15},{b:'WK-003',q:10},{b:'WK-034',q:1}] },
      { id:'MN-003', nama:'Matcha Latte',  harga:22000, emoji:'🍵',
        bom:[{b:'WK-006',q:15},{b:'WK-002',q:150},{b:'WK-003',q:20},{b:'WK-008',q:0.05},{b:'WK-030',q:1}] },
      { id:'MN-004', nama:'Indomie Telur', harga:15000, emoji:'🍜',
        bom:[{b:'WK-009',q:1},{b:'WK-010',q:1},{b:'WK-013',q:10},{b:'WK-012',q:1},{b:'WK-032',q:0.02}] },
      { id:'MN-005', nama:'Roti Bakar',    harga:12000, emoji:'🍞',
        bom:[{b:'WK-011',q:4},{b:'WK-013',q:5},{b:'WK-003',q:15},{b:'WK-032',q:0.01}] },
      { id:'MN-006', nama:'Air Mineral',   harga:5000,  emoji:'💧',
        bom:[{b:'WK-020',q:1}] },
    ],

    supplier: [
      { nama:'CV Kopi Nusantara',   hp:'08123456789', barang:'Kopi Bubuk, Gula Aren', lead:'1 hari',   aktif:true },
      { nama:'Depot Susu Segar',    hp:'08234567890', barang:'Susu Cair, Creamer',    lead:'1 hari',   aktif:true },
      { nama:'Toko Gas Pak Budi',   hp:'08345678901', barang:'Gas LPG 3kg',           lead:'2 jam',    aktif:true },
      { nama:'Grosir Plastik Jaya', hp:'08456789012', barang:'Cup, Sedotan, Kantong', lead:'2 hari',   aktif:false },
      { nama:'Toko Sembako Jaya',   hp:'08567890123', barang:'Gula, Indomie, Saus',   lead:'1 hari',   aktif:true },
      { nama:'Pembuat Es Pak Ali',  hp:'08678901234', barang:'Es Batu',               lead:'30 menit', aktif:true },
    ],

    transaksi: [],
    role: 'owner',
  };

  /* ── FORMAT ANGKA ───────────────────────────────────────────── */
  function rp(n) {
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
  }

  function angka(n, desimal = 2) {
    const num = parseFloat(n) || 0;
    return num % 1 === 0 ? num.toLocaleString('id-ID') : num.toFixed(desimal);
  }

  /* ── HITUNG ROP ─────────────────────────────────────────────── */
  function rop(b) {
    return (b.avg * b.lead) + b.safety;
  }

  function statusStok(b) {
    const r = rop(b);
    if (b.stok <= r)   return 'reorder';
    if (b.stok <= b.min) return 'hampir';
    return 'aman';
  }

  /* ── HITUNG HPP MENU ────────────────────────────────────────── */
  function hpp(menuId) {
    const menu = state.menus.find(m => m.id === menuId);
    if (!menu) return 0;
    return menu.bom.reduce((total, item) => {
      const b = state.barang.find(x => x.id === item.b);
      return total + (b ? b.hBeli * item.q : 0);
    }, 0);
  }

  /* ── TOAST ──────────────────────────────────────────────────── */
  let _toastTimer;
  function toast(pesan, jenis = 'sukses') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = pesan;
    el.className = 'toast tampil ' + jenis;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('tampil'), 3000);
  }

  /* ── JAM ────────────────────────────────────────────────────── */
  function updateJam() {
    const el = document.getElementById('jam');
    if (!el) return;
    const n = new Date();
    el.textContent =
      n.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' }) +
      ' ' +
      n.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  /* ── SIDEBAR TOGGLE ─────────────────────────────────────────── */
  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    if (!sb) return;
    const buka = sb.classList.toggle('terbuka');
    if (ov) ov.classList.toggle('tampil', buka);
  }

  function tutupSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    if (sb) sb.classList.remove('terbuka');
    if (ov) ov.classList.remove('tampil');
  }

  /* ── SIMULASI SCAN PDT ──────────────────────────────────────── */
  let _scanIdx = 0;
  function scan() {
    const item = state.barang[_scanIdx % state.barang.length];
    _scanIdx++;
    return item;
  }

  /* ── ANIMASI MUNCUL ─────────────────────────────────────────── */
  function initAnimasi() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('tampil'); });
    }, { threshold: 0.05 });
    document.querySelectorAll('.muncul').forEach(el => obs.observe(el));
  }

  /* ── KIRIM LAPORAN ──────────────────────────────────────────── */
  function kirimLaporan() {
    toast('Laporan PDF terkirim ke email owner ✉', 'sukses');
  }

  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    updateJam();
    setInterval(updateJam, 1000);
    initAnimasi();

    // Tutup sidebar saat klik overlay di mobile
    const ov = document.getElementById('sidebarOverlay');
    if (ov) ov.addEventListener('click', tutupSidebar);

    // Sync role dari auth
    if (window.WarkopAuth) {
      const sess = window.WarkopAuth.getCurrentUser();
      if (sess) state.role = sess.role;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { state, rp, angka, rop, statusStok, hpp, toast, toggleSidebar, tutupSidebar, kirimLaporan, scan };
})();
