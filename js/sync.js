/* ═══════════════════════════════════════════════════════════════════════
   WARKOP POS — sync.js
   Manajemen sinkronisasi: online/offline, queue, auto-refresh
   ═══════════════════════════════════════════════════════════════════════ */

window.WarkopSync = (() => {

  // ─── OFFLINE QUEUE ───────────────────────────────────────────────────────
  // Simpan aksi yang gagal karena offline, kirim ulang saat online
  let _queue = JSON.parse(localStorage.getItem('warkop_sync_queue') || '[]');

  function _saveQueue() {
    localStorage.setItem('warkop_sync_queue', JSON.stringify(_queue));
  }

  function _enqueue(action, data) {
    _queue.push({ action, data, ts: Date.now() });
    _saveQueue();
    console.log('[WarkopSync] Queued offline:', action);
  }

  async function _flushQueue() {
    if (!_queue.length) return;
    const api = window.WarkopAPI;
    const toRetry = [..._queue];
    _queue = [];
    _saveQueue();

    let successCount = 0;
    for (const item of toRetry) {
      try {
        if (item.action === 'saveOpname')    await api.saveOpname(item.data);
        if (item.action === 'saveTransaksi') await api.saveTransaksi(item.data);
        if (item.action === 'updateStok')    await api.updateStok(item.data.barcode, item.data.stokBaru);
        if (item.action === 'saveBarang')    await api.saveBarang(item.data);
        if (item.action === 'updateBarang')  await api.updateBarang(item.data);
        if (item.action === 'deleteBarang')  await api.deleteBarang(item.data.id);
        successCount++;
      } catch (e) {
        // Re-enqueue jika masih gagal
        _queue.push(item);
      }
    }
    _saveQueue();

    if (successCount > 0) {
      window.WarkopApp?.toast(`✅ ${successCount} data offline berhasil disinkronkan ke Google Sheets!`, 'success');
    }
    if (_queue.length > 0) {
      window.WarkopApp?.toast(`⚠ ${_queue.length} data masih pending (koneksi bermasalah)`, 'warning');
    }
  }

  // ─── WRAPPER: SAFE POST ─────────────────────────────────────────────────
  // Gunakan ini untuk semua operasi tulis — otomatis fallback ke queue jika offline
  async function safePost(action, data) {
    const api = window.WarkopAPI;
    if (!api.isConfigured()) {
      // Mode offline total — simpan ke localStorage dulu
      _saveLocalFallback(action, data);
      return { offline: true, queued: false, saved: 'local' };
    }
    try {
      const result = await api[action]?.(data) || await api._post?.(action, data);
      return { ok: true, result };
    } catch (e) {
      _enqueue(action, data);
      _saveLocalFallback(action, data);
      window.WarkopApp?.toast('📶 Offline — data disimpan lokal & akan sync otomatis', 'warning');
      return { offline: true, queued: true };
    }
  }

  // ─── LOCAL FALLBACK ──────────────────────────────────────────────────────
  function _saveLocalFallback(action, data) {
    const key = 'warkop_local_' + action;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({ ...data, _savedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing.slice(-200))); // max 200 record
  }

  function getLocalData(action) {
    return JSON.parse(localStorage.getItem('warkop_local_' + action) || '[]');
  }

  // ─── AUTO REFRESH ────────────────────────────────────────────────────────
  let _refreshTimer = null;
  let _refreshCallbacks = [];

  function onRefresh(cb) {
    _refreshCallbacks.push(cb);
  }

  function startAutoRefresh(intervalMs = 60000) {
    stopAutoRefresh();
    _refreshTimer = setInterval(async () => {
      const api = window.WarkopAPI;
      if (!api.isConfigured()) return;
      try {
        // Flush offline queue dulu
        await _flushQueue();
        // Panggil semua callback refresh
        for (const cb of _refreshCallbacks) {
          try { await cb(); } catch(e) { /* lanjut */ }
        }
      } catch (e) { /* ignore */ }
    }, intervalMs);
    console.log('[WarkopSync] Auto-refresh setiap', intervalMs / 1000, 'detik');
  }

  function stopAutoRefresh() {
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  }

  // ─── SMART LOAD ──────────────────────────────────────────────────────────
  // Coba Sheets dulu, fallback ke state lokal, fallback ke localStorage
  async function smartLoad(sheetsFn, localKey, localStateFn) {
    const api = window.WarkopAPI;

    if (api.isConfigured()) {
      try {
        const data = await sheetsFn();
        if (data && data.length > 0) {
          // Sync ke state lokal
          if (localStateFn) localStateFn(data);
          return { source: 'sheets', data };
        }
      } catch (e) {
        console.warn('[WarkopSync] Sheets gagal, fallback lokal:', e.message);
      }
    }

    // Coba state lokal (in-memory)
    const app = window.WarkopApp;
    if (app?.state?.[localKey]?.length > 0) {
      return { source: 'memory', data: app.state[localKey] };
    }

    // Coba localStorage
    const local = getLocalData(localKey);
    if (local.length > 0) return { source: 'localStorage', data: local };

    return { source: 'empty', data: [] };
  }

  // ─── SETUP UI ────────────────────────────────────────────────────────────
  function injectSyncUI() {
    // Tambah sync status bar ke topbar
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('syncStatus')) return;

    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:2px;';
    div.innerHTML = `
      <span id="syncStatus" style="font-size:10px;font-weight:700;color:var(--accent-amber);cursor:pointer;"
        onclick="window.WarkopSync.showConfigModal()" title="Klik untuk konfigurasi">
        ○ Belum terhubung
      </span>
      <span id="lastSync" style="font-size:9px;color:var(--text-muted);font-family:var(--font-mono);">
        Klik untuk setup
      </span>
    `;
    topbarRight.insertBefore(div, topbarRight.firstChild);
  }

  // ─── CONFIG MODAL ────────────────────────────────────────────────────────
  function showConfigModal() {
    const existing = document.getElementById('syncConfigModal');
    if (existing) existing.remove();

    const api = window.WarkopAPI;
    const modal = document.createElement('div');
    modal.id = 'syncConfigModal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:500;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:var(--bg-surface);border:1px solid var(--border-strong);border-radius:var(--radius-lg);padding:28px;width:540px;max-width:100%;max-height:90vh;overflow-y:auto;">
        <h2 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">
          🔗 Konfigurasi Sinkronisasi Google Sheets
        </h2>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:20px;line-height:1.6;">
          Tempelkan URL Web App dari Google Apps Script untuk menghubungkan dashboard ini dengan Google Sheets kamu secara real-time.
        </p>

        <div style="background:var(--bg-elevated);border-radius:var(--radius);padding:14px;margin-bottom:16px;font-size:12px;color:var(--text-secondary);line-height:1.8;">
          <strong style="color:var(--text-primary);display:block;margin-bottom:8px;">Cara mendapatkan URL:</strong>
          <div style="counter-reset:step;">
            ${[
              'Buka file <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;">Warkop_Stok_Opname_System.xlsx</code> → Upload ke Google Drive → Buka sebagai Google Sheets',
              'Klik menu <strong>Extensions → Apps Script</strong>',
              'Hapus kode default, paste isi file <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;">Code.gs</code>',
              'Ganti <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;">ownerEmail</code> dengan email owner',
              'Klik <strong>Deploy → New deployment → Web App</strong>',
              'Execute as: <strong>Me</strong> | Who has access: <strong>Anyone</strong>',
              'Klik <strong>Deploy</strong> → Copy URL yang muncul → Tempel di bawah',
            ].map((s,i) => `<div style="display:flex;gap:10px;padding:4px 0;"><span style="background:var(--accent-green);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${i+1}</span><span>${s}</span></div>`).join('')}
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px;">URL Google Apps Script Web App</label>
          <input id="apiUrlInput" type="text"
            placeholder="https://script.google.com/macros/s/XXXXXXXX/exec"
            value="${api.getUrl()}"
            style="width:100%;font-size:12px;font-family:var(--font-mono);" />
          <div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Format: https://script.google.com/macros/s/.../exec</div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="window.WarkopSync.saveConfig()" class="btn btn-primary" style="font-size:13px;">
            💾 Simpan & Test Koneksi
          </button>
          <button onclick="window.WarkopSync.testConnection()" class="btn btn-outline" style="font-size:13px;">
            🔄 Test Koneksi
          </button>
          <button onclick="document.getElementById('syncConfigModal').remove()" class="btn btn-outline" style="font-size:13px;">
            Tutup
          </button>
        </div>

        <div id="syncTestResult" style="margin-top:12px;font-size:12px;display:none;"></div>

        <div style="margin-top:16px;padding:12px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:var(--radius);font-size:11px;color:var(--accent-blue);line-height:1.6;">
          <strong>Mode Offline:</strong> Jika koneksi terputus, semua data tetap tersimpan lokal dan akan otomatis sinkron ke Sheets saat koneksi kembali.
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  async function saveConfig() {
    const input = document.getElementById('apiUrlInput');
    if (!input) return;
    const url = input.value.trim();
    if (!url || !url.startsWith('https://script.google.com')) {
      showTestResult('error', '❌ URL tidak valid. Harus dimulai dengan https://script.google.com/macros/s/');
      return;
    }
    window.WarkopAPI.setUrl(url);
    await testConnection();
  }

  async function testConnection() {
    showTestResult('loading', '🔄 Menguji koneksi ke Google Sheets...');
    try {
      const api = window.WarkopAPI;
      const ok = await api.ping();
      if (ok) {
        showTestResult('success', '✅ Berhasil terhubung ke Google Sheets! Data akan disinkronkan otomatis.');
        // Langsung load data dari Sheets
        setTimeout(() => {
          document.getElementById('syncConfigModal')?.remove();
          window.WarkopApp?.toast('✅ Terhubung ke Google Sheets!', 'success');
          // Trigger refresh halaman saat ini
          _refreshCallbacks.forEach(cb => cb().catch(()=>{}));
        }, 1500);
      } else {
        showTestResult('error', '❌ Koneksi gagal. Pastikan URL benar dan Apps Script sudah di-deploy.');
      }
    } catch (e) {
      showTestResult('error', '❌ Error: ' + e.message);
    }
  }

  function showTestResult(type, msg) {
    const el = document.getElementById('syncTestResult');
    if (!el) return;
    el.style.display = 'block';
    const colors = { success: 'var(--accent-green)', error: 'var(--accent-red)', loading: 'var(--accent-amber)' };
    el.style.color = colors[type] || 'var(--text-primary)';
    el.innerHTML = msg;
  }

  // ─── INIT ────────────────────────────────────────────────────────────────
  function init() {
    injectSyncUI();
    // Cek koneksi saat halaman load
    const api = window.WarkopAPI;
    if (api.isConfigured()) {
      api.ping().then(ok => {
        if (ok) _flushQueue();
      });
    }
    // Auto-refresh setiap 60 detik
    startAutoRefresh(60000);
    // Deteksi online/offline
    window.addEventListener('online', () => {
      window.WarkopApp?.toast('📶 Koneksi kembali — menyinkronkan data...', 'success');
      _flushQueue();
    });
    window.addEventListener('offline', () => {
      window.WarkopApp?.toast('📴 Offline — data disimpan lokal', 'warning');
    });
  }

  return {
    init, safePost, smartLoad, getLocalData,
    showConfigModal, saveConfig, testConnection,
    onRefresh, startAutoRefresh, stopAutoRefresh,
  };
})();

// Auto-init saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  window.WarkopSync.init();
});
