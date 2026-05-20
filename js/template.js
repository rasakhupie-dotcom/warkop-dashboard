/* ================================================================
   WARKOPPOS — template.js
   Fungsi pembantu: sidebar HTML, auth guard, jam, dll.
   Dipakai oleh semua halaman pages/*.html
   ================================================================ */

// Auth guard — redirect ke login jika belum login
(function() {
  const s = sessionStorage.getItem('warkop_session');
  if (!s) { window.location.href = '../login.html'; return; }
  try {
    const sess = JSON.parse(s);
    if (Date.now() > sess.expiresAt) {
      sessionStorage.removeItem('warkop_session');
      window.location.href = '../login.html';
    }
  } catch(e) { window.location.href = '../login.html'; }
})();
