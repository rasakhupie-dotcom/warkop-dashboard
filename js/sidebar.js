/* ================================================================
   WARKOPPOS — sidebar.js
   Shared sidebar HTML + inject ke semua halaman
   Dipanggil sekali dari setiap halaman
   ================================================================ */

(function() {
  // Tentukan prefix path berdasarkan lokasi halaman
  const isPages = window.location.pathname.includes('/pages/');
  const pre     = isPages ? '../' : '';

  // Link aktif berdasarkan nama file
  const namaFile = window.location.pathname.split('/').pop() || 'index.html';
  const aktif = (href) => href.endsWith(namaFile) ? ' aktif' : '';

  const html = `
  <aside class="sidebar" id="sidebar">
    <div class="s-brand">
      <div class="s-ikon">☕</div>
      <div>
        <span class="s-nama">WarkopPOS</span>
        <span class="s-sub">Sistem Stok Opname</span>
      </div>
    </div>
    <div class="s-pengguna" id="rolePill">
      <span class="s-dot"></span>
      <span id="roleLabel">—</span>
    </div>
    <nav class="nav">
      <div class="nav-judul">Utama</div>
      <a href="${pre}index.html" class="nav-item${aktif('index.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>
        Dashboard
      </a>
      <a href="${pre}pages/pos.html" class="nav-item${aktif('pos.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
        Kasir POS
      </a>
      <a href="${pre}pages/opname.html" class="nav-item${aktif('opname.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clip-rule="evenodd"/></svg>
        Stok Opname
      </a>

      <div class="nav-judul">Manajemen</div>
      <a href="${pre}pages/menu-manager.html" class="nav-item owner-only${aktif('menu-manager.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        Kelola Menu
      </a>
      <a href="${pre}pages/barang.html" class="nav-item${aktif('barang.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clip-rule="evenodd"/></svg>
        Master Barang
      </a>
      <a href="${pre}pages/bom.html" class="nav-item owner-only${aktif('bom.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
        Bill of Material
      </a>
      <a href="${pre}pages/supplier.html" class="nav-item${aktif('supplier.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-1h2.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V8a1 1 0 00-.293-.707l-2-2A1 1 0 0017 5h-3a1 1 0 00-1 1v3H3V4z"/></svg>
        Supplier
      </a>

      <div class="nav-judul">Laporan</div>
      <a href="${pre}pages/reorder.html" class="nav-item${aktif('reorder.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"/></svg>
        Reorder Point
        <span class="nav-angka" id="navBadgeReorder" style="display:none;">!</span>
      </a>
      <a href="${pre}pages/pareto.html" class="nav-item owner-only${aktif('pareto.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
        Analisis Pareto
      </a>
      <a href="${pre}pages/laporan.html" class="nav-item owner-only${aktif('laporan.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clip-rule="evenodd"/></svg>
        Laporan Harian
      </a>

      <div class="nav-judul">Sistem</div>
      <a href="${pre}pages/users.html" class="nav-item owner-only${aktif('users.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
        Kelola Pengguna
      </a>
      <a href="${pre}pages/settings.html" class="nav-item${aktif('settings.html')}">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
        Pengaturan
      </a>
    </nav>
    <div class="s-bawah" id="sidebarBawah"></div>
  </aside>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;

  // Inject ke body sebelum <main>
  const main = document.querySelector('main');
  if (main) {
    main.insertAdjacentHTML('beforebegin', html);
  }

  // Overlay tutup sidebar
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sidebarOverlay')
      ?.addEventListener('click', () => window.App?.tutupSidebar());

    // Badge reorder jika ada barang kritis
    if (window.App?.state?.barang) {
      const kritis = window.App.state.barang.filter(b => {
        const r = (b.avg * b.lead) + b.safety;
        return b.stok <= r;
      }).length;
      const badge = document.getElementById('navBadgeReorder');
      if (badge && kritis > 0) {
        badge.textContent = kritis;
        badge.style.display = 'inline-flex';
      }
    }
  });
})();
