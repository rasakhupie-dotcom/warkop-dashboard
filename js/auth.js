/* ================================================================
   WARKOPPOS — auth.js (FIXED v3.1)
   Perbaikan:
   1. Hash SHA-256 yang benar untuk password default
   2. Path redirect login yang benar untuk GitHub Pages
   3. Guard tidak memblokir halaman login sendiri
   4. Session check lebih robust
   ================================================================ */

window.WarkopAuth = (() => {

  const SESSION_KEY = 'warkop_session';
  const USERS_KEY   = 'warkop_users';
  const TIMEOUT_MS  = 8 * 60 * 60 * 1000; // 8 jam

  // Hash SHA-256 yang BENAR untuk password default
  // Diverifikasi: owner123 & karyawan123
  const DEFAULT_USERS = [
    {
      id: 'USR-001',
      nama: 'Pemilik',
      username: 'owner',
      passwordHash: '43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9',
      role: 'owner',
      aktif: true,
      mustChangePwd: false, // ← false agar tidak paksa ganti password dulu
      createdAt: new Date().toISOString(),
    },
    {
      id: 'USR-002',
      nama: 'Karyawan 1',
      username: 'karyawan1',
      passwordHash: '4b544df5bd793515057a6ae1e49a44c57f038333dcd9a1e6af0d6cca04e1fac3',
      role: 'karyawan',
      aktif: true,
      mustChangePwd: false,
      createdAt: new Date().toISOString(),
    },
  ];

  // ── HASH ─────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(password)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ── LOCAL USER STORE ──────────────────────────────────────────────
  function _getUsers() {
    try {
      const s = localStorage.getItem(USERS_KEY);
      if (!s) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(s);
    } catch(e) {
      return DEFAULT_USERS;
    }
  }

  function _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function _findUser(username) {
    return _getUsers().find(
      u => u.username === String(username).toLowerCase().trim()
    );
  }

  // ── API SHEETS ────────────────────────────────────────────────────
  function _apiUrl() {
    return localStorage.getItem('warkop_api_url') || '';
  }

  async function _sheetsPost(action, data) {
    const url = _apiUrl();
    if (!url) throw new Error('API belum dikonfigurasi');
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, data }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  async function _sheetsGet(action, params = {}) {
    const url = _apiUrl();
    if (!url) throw new Error('API belum dikonfigurasi');
    const qs  = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${url}?${qs}`, { redirect: 'follow' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  // ── SESSION ───────────────────────────────────────────────────────
  function _createSession(user, source) {
    const s = {
      userId:    user.id,
      username:  user.username,
      nama:      user.nama,
      role:      user.role,
      loginAt:   Date.now(),
      expiresAt: Date.now() + TIMEOUT_MS,
      token:     Math.random().toString(36).slice(2) + Date.now().toString(36),
      source:    source || 'local',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() > s.expiresAt) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      // Perpanjang session tiap aktivitas
      s.expiresAt = Date.now() + TIMEOUT_MS;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    } catch(e) {
      return null;
    }
  }

  function isLoggedIn()     { return !!getSession(); }
  function getCurrentUser() { return getSession(); }
  function getRole()        { return getSession()?.role || null; }
  function isOwner()        { return getRole() === 'owner'; }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = _loginPath();
  }

  // ── PATH HELPER ───────────────────────────────────────────────────
  // Deteksi otomatis apakah halaman ada di /pages/ atau di root
  function _loginPath() {
    const path = window.location.pathname;
    // Jika ada /pages/ di path → naik satu level
    if (path.includes('/pages/')) return '../login.html';
    return 'login.html';
  }

  function _dashPath() {
    const path = window.location.pathname;
    if (path.includes('/pages/')) return '../index.html';
    return 'index.html';
  }

  // ── BRUTE FORCE PROTECTION ────────────────────────────────────────
  function _logFail(username) {
    const k = 'wf_' + username;
    const d = JSON.parse(sessionStorage.getItem(k) || '{"c":0,"t":0}');
    d.c++;
    d.t = Date.now();
    sessionStorage.setItem(k, JSON.stringify(d));
  }

  function isLockedOut(username) {
    const d = JSON.parse(sessionStorage.getItem('wf_' + username) || '{"c":0,"t":0}');
    if (d.c >= 5) {
      const sisa = 5 * 60 * 1000 - (Date.now() - d.t);
      if (sisa > 0) return Math.ceil(sisa / 1000);
      sessionStorage.removeItem('wf_' + username);
    }
    return 0;
  }

  function resetFailedAttempts(username) {
    sessionStorage.removeItem('wf_' + username);
  }

  // ── LOGIN ─────────────────────────────────────────────────────────
  async function login(username, password) {
    username = String(username).toLowerCase().trim();
    const hash = await hashPassword(password);

    // Coba Sheets dulu jika tersedia
    if (_apiUrl()) {
      try {
        const res = await _sheetsPost('authLogin', {
          username,
          passwordHash: hash,
          device: navigator.userAgent.substring(0, 80),
        });
        if (res.ok === false || res.error) {
          _logFail(username);
          return { ok: false, error: res.error || 'Login gagal.' };
        }
        // Sync ke lokal
        _syncUserToLocal(res.user);
        const session = _createSession(res.user, 'sheets');
        return {
          ok: true,
          session,
          mustChangePassword: res.user.mustChangePwd || false,
          user: res.user,
          source: 'sheets',
        };
      } catch(e) {
        console.warn('[Auth] Sheets gagal, fallback lokal:', e.message);
      }
    }

    // Fallback lokal
    const user = _findUser(username);
    if (!user)        { _logFail(username); return { ok: false, error: 'Username tidak ditemukan.' }; }
    if (!user.aktif)  { return { ok: false, error: 'Akun dinonaktifkan. Hubungi pemilik.' }; }
    if (hash !== user.passwordHash) {
      _logFail(username);
      return { ok: false, error: 'Password salah.' };
    }

    const session = _createSession(user, 'local');
    return {
      ok: true,
      session,
      mustChangePassword: user.mustChangePwd || false,
      user,
      source: 'local',
    };
  }

  function _syncUserToLocal(sheetsUser) {
    const users = _getUsers();
    const idx   = users.findIndex(u => u.username === sheetsUser.username);
    const upd   = {
      id: sheetsUser.id,
      nama: sheetsUser.nama,
      username: sheetsUser.username,
      role: sheetsUser.role,
      aktif: true,
      mustChangePwd: sheetsUser.mustChangePwd || false,
      passwordHash: users[idx]?.passwordHash || '',
    };
    if (idx >= 0) users[idx] = { ...users[idx], ...upd };
    else users.push(upd);
    _saveUsers(users);
  }

  // ── USER MANAGEMENT ───────────────────────────────────────────────
  async function getUsers() {
    if (_apiUrl()) {
      try {
        const list = await _sheetsGet('getUsers');
        if (Array.isArray(list) && list.length > 0) {
          const local = _getUsers();
          list.forEach(su => {
            const idx = local.findIndex(u => u.username === su.username);
            if (idx >= 0) local[idx] = { ...local[idx], ...su, passwordHash: local[idx].passwordHash };
          });
          _saveUsers(local);
          return list;
        }
      } catch(e) { console.warn('[Auth] getUsers fallback lokal'); }
    }
    return _getUsers().map(({ passwordHash, ...u }) => u);
  }

  async function addUser(data) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    const username = String(data.username).toLowerCase().trim();
    if (_findUser(username)) return { ok: false, error: 'Username sudah digunakan.' };
    const hash = await hashPassword(data.password);
    const payload = { nama: data.nama, username, passwordHash: hash, role: data.role || 'karyawan' };
    let newId = 'USR-' + Date.now();
    if (_apiUrl()) {
      try {
        const res = await _sheetsPost('authAddUser', payload);
        if (res?.id) newId = res.id;
      } catch(e) { console.warn('[Auth] addUser Sheets gagal'); }
    }
    const newUser = { id: newId, ...payload, aktif: true, mustChangePwd: true, createdAt: new Date().toISOString() };
    const users = _getUsers();
    users.push(newUser);
    _saveUsers(users);
    return { ok: true, user: newUser };
  }

  async function changePassword(username, oldPassword, newPassword) {
    if (newPassword.length < 6) return { ok: false, error: 'Min. 6 karakter.' };
    const oldHash = await hashPassword(oldPassword);
    const newHash = await hashPassword(newPassword);
    const localUser = _findUser(username);
    if (localUser?.passwordHash && localUser.passwordHash !== oldHash) {
      return { ok: false, error: 'Password lama salah.' };
    }
    if (_apiUrl()) {
      try { await _sheetsPost('authChangePassword', { username, oldHash, newHash }); }
      catch(e) { console.warn('[Auth] changePassword Sheets gagal'); }
    }
    const users = _getUsers();
    const idx = users.findIndex(u => u.username === username.toLowerCase());
    if (idx >= 0) { users[idx].passwordHash = newHash; users[idx].mustChangePwd = false; _saveUsers(users); }
    return { ok: true };
  }

  async function resetPasswordByOwner(targetUsername, newPassword) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    if (newPassword.length < 6) return { ok: false, error: 'Min. 6 karakter.' };
    const newHash = await hashPassword(newPassword);
    if (_apiUrl()) {
      try { await _sheetsPost('authResetPassword', { targetUsername, newHash }); }
      catch(e) { console.warn('[Auth] resetPassword Sheets gagal'); }
    }
    const users = _getUsers();
    const idx = users.findIndex(u => u.username === targetUsername.toLowerCase());
    if (idx >= 0) { users[idx].passwordHash = newHash; users[idx].mustChangePwd = true; _saveUsers(users); }
    return { ok: true };
  }

  async function toggleUserStatus(userId) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    const session = getSession();
    if (_apiUrl()) {
      try { await _sheetsPost('authToggleUser', { userId }); }
      catch(e) { console.warn('[Auth] toggleUser Sheets gagal'); }
    }
    const users = _getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return { ok: false, error: 'User tidak ditemukan.' };
    if (users[idx].username === session?.username) return { ok: false, error: 'Tidak bisa nonaktifkan diri sendiri.' };
    users[idx].aktif = !users[idx].aktif;
    _saveUsers(users);
    return { ok: true, aktif: users[idx].aktif };
  }

  // ── AUTH GUARD ────────────────────────────────────────────────────
  // Panggil di setiap halaman yang perlu proteksi (bukan login.html)
  function guard(requiredRole = null) {
    const session = getSession();
    if (!session) {
      window.location.href = _loginPath();
      return false;
    }
    if (requiredRole && session.role !== requiredRole) {
      window.location.href = _dashPath();
      return false;
    }
    return true;
  }

  // ── INJECT UI SIDEBAR ─────────────────────────────────────────────
  function injectSidebarFooter() {
    const session = getSession();
    if (!session) return;

    // Update label nama di sidebar
    const roleLabel = document.getElementById('roleLabel');
    if (roleLabel) roleLabel.textContent = session.nama;
    const rolePill = document.getElementById('rolePill');
    if (rolePill) {
      const dot = rolePill.querySelector('.s-dot');
      if (dot) dot.style.background = session.role === 'owner' ? 'var(--hijau)' : '#93C5FD';
      rolePill.style.color = session.role === 'owner' ? 'var(--hijau)' : '#93C5FD';
    }

    // Sembunyikan dropdown role switch jika ada
    const sw = document.getElementById('roleSwitch');
    if (sw?.parentElement) sw.parentElement.style.display = 'none';

    // Inject tombol logout & info user
    const footer = document.getElementById('sidebarBawah');
    if (footer && !document.getElementById('btnLogout')) {
      const isPages  = window.location.pathname.includes('/pages/');
      const usersHref = isPages ? 'users.html' : 'pages/users.html';
      const srcBadge  = session.source === 'sheets'
        ? '<span style="font-size:9px;background:rgba(29,158,117,.2);color:#5AC99A;padding:2px 6px;border-radius:999px;">● Sheets</span>'
        : '<span style="font-size:9px;background:rgba(255,255,255,.06);color:#5C5850;padding:2px 6px;border-radius:999px;">○ Lokal</span>';

      footer.innerHTML = `
        <div style="font-size:11px;color:var(--teks-redup,#5C5850);margin-bottom:7px;
          display:flex;align-items:center;flex-wrap:wrap;gap:3px;font-family:var(--mono,'Courier New');">
          <span>${session.username}</span>
          <span style="opacity:.4">·</span>
          <span>${session.role}</span>
          ${srcBadge}
        </div>
        <div style="display:flex;gap:6px;">
          ${session.role === 'owner' ? `
          <a href="${usersHref}"
            style="flex:1;padding:7px 6px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.13);border-radius:6px;
            color:#9C9890;font-size:11px;font-weight:600;text-align:center;text-decoration:none;">
            👥 User
          </a>` : ''}
          <button id="btnLogout" onclick="WarkopAuth.logout()"
            style="flex:1;padding:7px 6px;background:rgba(220,38,38,.1);
            border:1px solid rgba(220,38,38,.2);border-radius:6px;
            color:#F87171;font-size:11px;font-weight:600;
            cursor:pointer;font-family:inherit;">
            ⏏ Keluar
          </button>
        </div>`;
    }

    // Sembunyikan elemen owner-only jika karyawan
    if (session.role !== 'owner') {
      document.querySelectorAll('.owner-only').forEach(el => {
        if (el.tagName === 'A') {
          el.style.opacity = '.3';
          el.style.pointerEvents = 'none';
        } else {
          el.style.display = 'none';
        }
      });
    }

    // Sync ke WarkopApp state jika ada
    if (window.App?.state) window.App.state.role = session.role;
  }

  // ── INIT ──────────────────────────────────────────────────────────
  function init() {
    _getUsers(); // Pastikan default users ada di localStorage
    injectSidebarFooter();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    login, logout, isLoggedIn, getCurrentUser, getRole, isOwner,
    guard, init, hashPassword, injectSidebarFooter,
    getUsers, addUser, changePassword, resetPasswordByOwner, toggleUserStatus,
    isLockedOut, resetFailedAttempts,
  };
})();
