/* ================================================================
   WARKOPPOS — api.js v2.0
   Connector: Dashboard (GitHub Pages) ↔ Apps Script ↔ Google Sheets
   Semua nama action sesuai persis dengan Code.gs v3.0
   ================================================================ */

window.WarkopAPI = (() => {

  // ── URL KONFIGURASI ─────────────────────────────────────────────
  // URL Apps Script disimpan di localStorage agar tidak hilang saat refresh
  let _url = localStorage.getItem('warkop_api_url') || '';

  // Cache sederhana — data GET disimpan 30 detik untuk mengurangi request
  const _cache = {};
  const CACHE_TTL = 30000; // 30 detik

  // ── STATUS KONEKSI ───────────────────────────────────────────────
  let _online   = false;
  let _lastSync = null;

  // ── REQUEST GET ──────────────────────────────────────────────────
  async function _get(action, params = {}) {
    if (!_url) throw new Error('URL Apps Script belum dikonfigurasi. Buka menu Pengaturan.');

    const cacheKey = action + JSON.stringify(params);
    const cached   = _cache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    const qs  = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${_url}?${qs}`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Respons tidak OK dari Apps Script');

    _cache[cacheKey] = { data: json.data, ts: Date.now() };
    _online   = true;
    _lastSync = new Date();
    _updateIndikator(true);
    return json.data;
  }

  // ── REQUEST POST ─────────────────────────────────────────────────
  async function _post(action, data = {}) {
    if (!_url) throw new Error('URL Apps Script belum dikonfigurasi.');

    // Apps Script Web App memerlukan Content-Type: text/plain untuk CORS
    const res = await fetch(_url, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify({ action, data }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Respons tidak OK dari Apps Script');

    // Hapus cache agar data fresh setelah tulis
    Object.keys(_cache).forEach(k => delete _cache[k]);
    _online   = true;
    _lastSync = new Date();
    _updateIndikator(true);
    return json.data;
  }

  // ── INDIKATOR KONEKSI DI TOPBAR ─────────────────────────────────
  function _updateIndikator(online) {
    const el   = document.getElementById('syncStatus');
    const el2  = document.getElementById('lastSync');
    if (!el) return;
    if (online) {
      el.textContent = '● Sheets';
      el.style.color = 'var(--hijau)';
    } else {
      el.textContent = '○ Offline';
      el.style.color = 'var(--kuning)';
    }
    if (el2 && _lastSync) {
      el2.textContent = _lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PUBLIC API — nama action sesuai persis Code.gs v3.0
  // ════════════════════════════════════════════════════════════════

  // Cek koneksi ke Apps Script
  async function ping() {
    try {
      await _get('ping');
      _online = true;
      return true;
    } catch(e) {
      _online = false;
      _updateIndikator(false);
      return false;
    }
  }

  // ── BACA DATA ────────────────────────────────────────────────────
  const getBarang     = () => _get('getBarang');
  const getBOM        = (menuId = null) => _get('getBOM', menuId ? { menuId } : {});
  const getStok       = () => _get('getStok');        // ← 'getStok' (bukan getStokHarian)
  const getOpname     = (tanggal = null) => _get('getOpname',    tanggal ? { tanggal } : {});
  const getTransaksi  = (tanggal = null) => _get('getTransaksi', tanggal ? { tanggal } : {});
  const getReorder    = () => _get('getReorder');
  const getSummary    = () => _get('getSummary');
  const getLaporan    = (tanggal = null) => _get('getLaporan',   tanggal ? { tanggal } : {});
  const getUsers      = () => _get('getUsers');

  // ── TULIS DATA ───────────────────────────────────────────────────
  const saveOpname    = (data)           => _post('saveOpname',    data);
  const saveTransaksi = (items)          => _post('saveTransaksi', items);
  const updateStok    = (barcode, stokBaru) => _post('updateStok', { barcode, stokBaru });
  const saveBarang    = (data)           => _post('saveBarang',    data);
  const updateBarang  = (data)           => _post('updateBarang',  data);
  const deleteBarang  = (id)             => _post('deleteBarang',  { id });
  const sendLaporan   = ()               => _post('sendLaporan',   {});

  // ── SCAN PDT ─────────────────────────────────────────────────────
  // Kirim barcode ke Apps Script → lookup ke MASTER_BARANG → balik data lengkap
  async function scanPDT(barcode) {
    return _post('scanPDT', { barcode: String(barcode).trim().toUpperCase() });
  }

  // Lookup barcode lokal sebagai fallback saat offline
  function lookupLokal(barcode) {
    if (!window.App?.state?.barang) return null;
    return window.App.state.barang.find(b =>
      b.id === String(barcode).trim().toUpperCase()
    ) || null;
  }

  // ── AUTH (USER MANAGEMENT) ───────────────────────────────────────
  const authLogin          = (data)   => _post('authLogin',          data);
  const authAddUser        = (data)   => _post('authAddUser',        data);
  const authChangePassword = (data)   => _post('authChangePassword', data);
  const authResetPassword  = (data)   => _post('authResetPassword',  data);
  const authToggleUser     = (data)   => _post('authToggleUser',     data);
  const authUpdateUser     = (data)   => _post('authUpdateUser',     data);
  const pingAuth           = ()       => _get('pingAuth');

  // ── KONFIGURASI URL ──────────────────────────────────────────────
  function setUrl(url) {
    _url = (url || '').trim();
    localStorage.setItem('warkop_api_url', _url);
    // Reset cache setelah ganti URL
    Object.keys(_cache).forEach(k => delete _cache[k]);
    _online = false;
  }

  function getUrl()       { return _url; }
  function isConfigured() { return !!_url; }
  function isOnline()     { return _online; }
  function getLastSync()  { return _lastSync; }

  return {
    // Koneksi
    ping, pingAuth, isConfigured, isOnline, getUrl, setUrl, getLastSync,
    // Baca
    getBarang, getBOM, getStok, getOpname, getTransaksi,
    getReorder, getSummary, getLaporan, getUsers,
    // Tulis
    saveOpname, saveTransaksi, updateStok,
    saveBarang, updateBarang, deleteBarang, sendLaporan,
    // Scan
    scanPDT, lookupLokal,
    // Auth
    authLogin, authAddUser, authChangePassword,
    authResetPassword, authToggleUser, authUpdateUser,
  };
})();
