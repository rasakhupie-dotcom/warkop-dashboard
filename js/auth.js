/* ═══════════════════════════════════════════════════════════════════════
   WARKOP POS — auth.js v2.0
   Multi-device login via Google Sheets (Apps Script)
   Fallback ke localStorage jika offline / API belum dikonfigurasi
   ═══════════════════════════════════════════════════════════════════════ */

window.WarkopAuth = (() => {

  const SESSION_KEY = 'warkop_session';
  const USERS_KEY   = 'warkop_users';
  const TIMEOUT_MS  = 8 * 60 * 60 * 1000; // 8 jam

  const DEFAULT_USERS = [
    { id:'USR-001', nama:'Pemilik',    username:'owner',     passwordHash:'43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9', role:'owner',    aktif:true, mustChangePwd:true,  createdAt: new Date().toISOString() },
    { id:'USR-002', nama:'Karyawan 1', username:'karyawan1', passwordHash:'4b544df5bd793515057a6ae1e49a44c57f038333dcd9a1e6af0d6cca04e1fac3', role:'karyawan', aktif:true, mustChangePwd:true,  createdAt: new Date().toISOString() },
  ];

  // ── HASH ─────────────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // ── API HELPERS ───────────────────────────────────────────────────────────
  function _apiUrl() { return localStorage.getItem('warkop_api_url') || ''; }
  function _sheetsAvailable() { return !!_apiUrl(); }

  async function _sheetsPost(action, data) {
    const res = await fetch(_apiUrl(), {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, data }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  async function _sheetsGet(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${_apiUrl()}?${qs}`, { redirect: 'follow' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  // ── LOCAL USER STORE ──────────────────────────────────────────────────────
  function _getLocalUsers() {
    const s = localStorage.getItem(USERS_KEY);
    if (!s) { _saveLocalUsers(DEFAULT_USERS); return DEFAULT_USERS; }
    return JSON.parse(s);
  }
  function _saveLocalUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function _findLocalUser(username) {
    return _getLocalUsers().find(u => u.username === username.toLowerCase().trim());
  }

  // ── SESSION ───────────────────────────────────────────────────────────────
  function _createSession(user) {
    const s = {
      userId: user.id, username: user.username, nama: user.nama,
      role: user.role, loginAt: Date.now(),
      expiresAt: Date.now() + TIMEOUT_MS,
      token: Math.random().toString(36).slice(2) + Date.now().toString(36),
      source: user._source || 'local',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { sessionStorage.removeItem(SESSION_KEY); return null; }
    s.expiresAt = Date.now() + TIMEOUT_MS;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  function isLoggedIn()     { return !!getSession(); }
  function getCurrentUser() { return getSession(); }
  function getRole()        { return getSession()?.role || null; }
  function isOwner()        { return getRole() === 'owner'; }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = _loginPath();
  }

  // ── BRUTE FORCE ───────────────────────────────────────────────────────────
  function _logFail(u) {
    const k = 'wf_' + u, d = JSON.parse(sessionStorage.getItem(k)||'{"c":0,"t":0}');
    d.c++; d.t = Date.now(); sessionStorage.setItem(k, JSON.stringify(d));
  }
  function isLockedOut(u) {
    const d = JSON.parse(sessionStorage.getItem('wf_' + u)||'{"c":0,"t":0}');
    if (d.c >= 5) {
      const left = 5*60*1000 - (Date.now() - d.t);
      if (left > 0) return Math.ceil(left/1000);
      sessionStorage.removeItem('wf_' + u);
    }
    return 0;
  }
  function resetFailedAttempts(u) { sessionStorage.removeItem('wf_' + u); }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  async function login(username, password) {
    username = username.toLowerCase().trim();
    const hash = await hashPassword(password);

    // Coba Sheets dulu
    if (_sheetsAvailable()) {
      try {
        const res = await _sheetsPost('authLogin', {
          username, passwordHash: hash,
          device: navigator.userAgent.substring(0, 80),
        });
        if (res.ok === false || res.error) {
          _logFail(username);
          return { ok: false, error: res.error || 'Login gagal.' };
        }
        _syncUserToLocal(res.user);
        const session = _createSession({ ...res.user, _source: 'sheets' });
        return { ok: true, session, mustChangePassword: res.user.mustChangePwd, user: res.user, source: 'sheets' };
      } catch(e) {
        console.warn('[Auth] Sheets gagal, fallback lokal:', e.message);
      }
    }

    // Fallback lokal
    const user = _findLocalUser(username);
    if (!user)       { _logFail(username); return { ok: false, error: 'Username tidak ditemukan.' }; }
    if (!user.aktif) { return { ok: false, error: 'Akun dinonaktifkan. Hubungi owner.' }; }
    if (hash !== user.passwordHash) { _logFail(username); return { ok: false, error: 'Password salah.' }; }
    const session = _createSession({ ...user, _source: 'local' });
    return { ok: true, session, mustChangePassword: user.mustChangePwd, user, source: 'local' };
  }

  function _syncUserToLocal(su) {
    const users = _getLocalUsers();
    const idx = users.findIndex(u => u.username === su.username);
    const updated = { id:su.id, nama:su.nama, username:su.username, role:su.role,
      aktif:true, mustChangePwd:su.mustChangePwd,
      passwordHash: users[idx]?.passwordHash || '' };
    if (idx >= 0) users[idx] = { ...users[idx], ...updated };
    else users.push(updated);
    _saveLocalUsers(users);
  }

  // ── GET USERS ─────────────────────────────────────────────────────────────
  async function getUsers() {
    if (_sheetsAvailable()) {
      try {
        const list = await _sheetsGet('getUsers');
        if (Array.isArray(list) && list.length > 0) {
          // Merge ke lokal (jaga passwordHash lokal)
          const local = _getLocalUsers();
          list.forEach(su => {
            const idx = local.findIndex(u => u.username === su.username);
            if (idx >= 0) local[idx] = { ...local[idx], ...su, passwordHash: local[idx].passwordHash };
          });
          _saveLocalUsers(local);
          return list;
        }
      } catch(e) { console.warn('[Auth] getUsers fallback lokal:', e.message); }
    }
    return _getLocalUsers().map(({ passwordHash, ...u }) => u);
  }

  // ── ADD USER ──────────────────────────────────────────────────────────────
  async function addUser(data) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    const username = data.username.toLowerCase().trim();
    if (_findLocalUser(username)) return { ok: false, error: 'Username sudah digunakan.' };
    const hash = await hashPassword(data.password);
    const payload = { nama: data.nama, username, passwordHash: hash, role: data.role || 'karyawan' };

    let newId = 'USR-' + Date.now();
    if (_sheetsAvailable()) {
      try {
        const res = await _sheetsPost('authAddUser', payload);
        if (res.error) return { ok: false, error: res.error };
        if (res.id) newId = res.id;
      } catch(e) { console.warn('[Auth] addUser Sheets:', e.message); }
    }

    const newUser = { id: newId, ...payload, aktif: true, mustChangePwd: true, createdAt: new Date().toISOString() };
    const users = _getLocalUsers(); users.push(newUser); _saveLocalUsers(users);
    return { ok: true, user: newUser };
  }

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
  async function changePassword(username, oldPassword, newPassword) {
    if (newPassword.length < 6) return { ok: false, error: 'Min. 6 karakter.' };
    const oldHash = await hashPassword(oldPassword);
    const newHash = await hashPassword(newPassword);

    const localUser = _findLocalUser(username);
    if (localUser?.passwordHash && localUser.passwordHash !== oldHash)
      return { ok: false, error: 'Password lama salah.' };

    if (_sheetsAvailable()) {
      try {
        const res = await _sheetsPost('authChangePassword', { username, oldHash, newHash });
        if (res.error) return { ok: false, error: res.error };
      } catch(e) { console.warn('[Auth] changePassword Sheets:', e.message); }
    }

    const users = _getLocalUsers();
    const idx = users.findIndex(u => u.username === username.toLowerCase());
    if (idx >= 0) { users[idx].passwordHash = newHash; users[idx].mustChangePwd = false; _saveLocalUsers(users); }
    const sess = getSession();
    if (sess) { sess.mustChangePwd = false; sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess)); }
    return { ok: true };
  }

  // ── RESET PASSWORD (owner) ────────────────────────────────────────────────
  async function resetPasswordByOwner(targetUsername, newPassword) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    if (newPassword.length < 6) return { ok: false, error: 'Min. 6 karakter.' };
    const newHash = await hashPassword(newPassword);

    if (_sheetsAvailable()) {
      try { await _sheetsPost('authResetPassword', { targetUsername, newHash }); }
      catch(e) { console.warn('[Auth] resetPassword Sheets:', e.message); }
    }

    const users = _getLocalUsers();
    const idx = users.findIndex(u => u.username === targetUsername.toLowerCase());
    if (idx >= 0) { users[idx].passwordHash = newHash; users[idx].mustChangePwd = true; _saveLocalUsers(users); }
    return { ok: true };
  }

  // ── TOGGLE STATUS ─────────────────────────────────────────────────────────
  async function toggleUserStatus(userId) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    const session = getSession();

    if (_sheetsAvailable()) {
      try { await _sheetsPost('authToggleUser', { userId }); }
      catch(e) { console.warn('[Auth] toggleUser Sheets:', e.message); }
    }

    const users = _getLocalUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return { ok: false, error: 'User tidak ditemukan.' };
    if (users[idx].username === session?.username) return { ok: false, error: 'Tidak bisa nonaktifkan diri sendiri.' };
    users[idx].aktif = !users[idx].aktif;
    _saveLocalUsers(users);
    return { ok: true, aktif: users[idx].aktif };
  }

  // ── UPDATE USER ───────────────────────────────────────────────────────────
  async function updateUser(userId, updates) {
    if (!isOwner()) return { ok: false, error: 'Hanya owner.' };
    if (_sheetsAvailable()) {
      try { await _sheetsPost('authUpdateUser', { userId, ...updates }); }
      catch(e) { console.warn('[Auth] updateUser Sheets:', e.message); }
    }
    const users = _getLocalUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      const { passwordHash, username, ...safe } = updates;
      users[idx] = { ...users[idx], ...safe }; _saveLocalUsers(users);
    }
    return { ok: true };
  }

  // ── AUTH GUARD ────────────────────────────────────────────────────────────
  function guard(requiredRole = null) {
    const session = getSession();
    if (!session) { window.location.href = _loginPath(); return false; }
    if (requiredRole && session.role !== requiredRole) { window.location.href = _dashPath(); return false; }
    return true;
  }

  function _loginPath() { return window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html'; }
  function _dashPath()  { return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html'; }

  // ── INJECT UI ─────────────────────────────────────────────────────────────
  function injectUserBadge() {
    const session = getSession();
    if (!session) return;

    const roleLabel = document.getElementById('roleLabel');
    const rolePill  = document.getElementById('rolePill');
    if (roleLabel) roleLabel.textContent = session.nama;
    if (rolePill) {
      const dot = rolePill.querySelector('.role-dot');
      if (dot) dot.style.background = session.role === 'owner' ? 'var(--accent-green)' : '#93C5FD';
      rolePill.style.color = session.role === 'owner' ? 'var(--accent-green)' : '#93C5FD';
    }

    const sw = document.getElementById('roleSwitch');
    if (sw?.parentElement) sw.parentElement.style.display = 'none';

    const footer = document.querySelector('.sidebar-footer');
    if (footer && !document.getElementById('logoutBtn')) {
      const isPages = window.location.pathname.includes('/pages/');
      const usersHref = isPages ? 'users.html' : 'pages/users.html';
      const srcBadge = session.source === 'sheets'
        ? '<span style="font-size:9px;background:rgba(29,158,117,.2);color:#5AC99A;padding:2px 6px;border-radius:999px;">● Sheets</span>'
        : '<span style="font-size:9px;background:rgba(255,255,255,.07);color:#8C8880;padding:2px 6px;border-radius:999px;">○ Lokal</span>';

      const div = document.createElement('div');
      div.style.cssText = 'padding:8px 12px;';
      div.innerHTML = `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:7px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          <span style="font-family:var(--font-mono)">${session.username}</span>
          <span style="color:var(--border-strong)">·</span>
          <span>${session.role}</span>
          ${srcBadge}
        </div>
        <div style="display:flex;gap:6px;">
          <a href="${usersHref}" class="owner-only"
            style="flex:1;padding:7px 6px;background:rgba(255,255,255,.05);border:1px solid var(--border-strong);
            border-radius:6px;color:var(--text-secondary);font-size:11px;font-weight:600;text-align:center;text-decoration:none;
            transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.09)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">
            👥 Users
          </a>
          <button id="logoutBtn" onclick="window.WarkopAuth.logout()"
            style="flex:1;padding:7px 6px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.25);
            border-radius:6px;color:#F87171;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font-sans);
            transition:background .15s;" onmouseover="this.style.background='rgba(220,38,38,.2)'" onmouseout="this.style.background='rgba(220,38,38,.1)'">
            ⏏ Logout
          </button>
        </div>`;
      footer.appendChild(div);
    }
    applyRoleRestrictions(session.role);
    if (window.WarkopApp?.state) window.WarkopApp.state.role = session.role;
  }

  function applyRoleRestrictions(role) {
    if (role === 'owner') return;
    document.querySelectorAll('.owner-only').forEach(el => {
      if (el.tagName === 'A') { el.style.pointerEvents = 'none'; el.style.opacity = '.3'; }
      else el.style.display = 'none';
    });
  }

  function init() {
    _getLocalUsers();
    injectUserBadge();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    login, logout, isLoggedIn, getCurrentUser, getRole, isOwner,
    guard, init, hashPassword,
    getUsers, addUser, updateUser, toggleUserStatus,
    changePassword, resetPasswordByOwner,
    isLockedOut, resetFailedAttempts,
  };
})();
