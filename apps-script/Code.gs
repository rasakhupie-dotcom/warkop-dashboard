// ═══════════════════════════════════════════════════════════════════════
// WARKOPPOS — Google Apps Script v3.0
// Backend API: GitHub Pages ↔ Google Sheets (baca & tulis 2 arah)
// Login multi-device, BOM otomatis, Email laporan harian
//
// CARA DEPLOY:
//   1. Paste file ini ke Apps Script Editor (Extensions → Apps Script)
//   2. Ganti CFG di bawah sesuai data warkop kamu
//   3. Deploy → New deployment → Web app
//      Execute as: Me | Who has access: Anyone
//   4. Jalankan setupAwal() SEKALI untuk buat sheet USERS & trigger email
// ═══════════════════════════════════════════════════════════════════════

// ── KONFIGURASI (WAJIB DIISI SEBELUM DEPLOY) ───────────────────────────
var CFG = {
  emailOwner:   'owner@gmail.com',   // ← Ganti email pemilik warkop
  namaWarkop:   'Warkop Saya',       // ← Ganti nama warkop
  jamLaporan:   21,                  // Jam kirim laporan otomatis (21 = 21.00 WIB)
  timezone:     'Asia/Jakarta',
  batasSelisih: 0.10,                // Alert jika selisih opname > 10%

  // Nama tab sheet — harus sama persis dengan file Excel yang diupload
  sheet: {
    barang:    'MASTER_BARANG',
    bom:       'BOM',
    opname:    'STOK_OPNAME',
    transaksi: 'TRANSAKSI_POS',
    stok:      'STOK_HARIAN',
    laporan:   'LAPORAN_HARIAN',
    users:     'USERS',
  }
};

// ── HELPER RESPONSE JSON ────────────────────────────────────────────────
function oke(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function gagal(pesan) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: pesan }))
    .setMimeType(ContentService.MimeType.JSON);
}
function getSheet(nama) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama);
  if (!s) throw new Error('Sheet "' + nama + '" tidak ditemukan. Jalankan setupAwal() dulu.');
  return s;
}

// ════════════════════════════════════════════════════════════════════════
// ROUTER GET — semua permintaan baca data
// ════════════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    var action = (e.parameter.action || '').trim();
    switch (action) {
      case 'ping':         return oke({ status: 'online', warkop: CFG.namaWarkop, waktu: new Date().toISOString() });
      case 'getBarang':    return oke(getBarang());
      case 'getBOM':       return oke(getBOM(e.parameter.menuId || null));
      case 'getStok':      return oke(getStokHarian());
      case 'getOpname':    return oke(getOpname(e.parameter.tanggal || null));
      case 'getTransaksi': return oke(getTransaksi(e.parameter.tanggal || null));
      case 'getReorder':   return oke(getReorder());
      case 'getSummary':   return oke(getSummaryDashboard());
      case 'getLaporan':   return oke(getLaporan(e.parameter.tanggal || null));
      case 'getUsers':     return oke(getUsersUntukOwner());
      case 'pingAuth':     return oke({ ok: true, sheet: CFG.sheet.users });
      default:             return gagal('Aksi tidak dikenal: ' + action);
    }
  } catch (err) {
    return gagal('[GET] ' + err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
// ROUTER POST — semua permintaan tulis data
// ════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = (body.action || '').trim();
    var data   = body.data || {};
    switch (action) {
      case 'saveOpname':          return oke(simpanOpname(data));
      case 'saveTransaksi':       return oke(simpanTransaksi(data));
      case 'updateStok':          return oke(updateStokByBarcode(data.barcode, data.stokBaru));
      case 'saveBarang':          return oke(simpanBarang(data));
      case 'updateBarang':        return oke(ubahBarang(data));
      case 'deleteBarang':        return oke(hapusBarang(data));
      case 'scanPDT':             return oke(scanBarcode(data.barcode || body.barcode || ''));
      case 'sendLaporan':         return oke(kirimLaporanHarian());
      case 'authLogin':           return oke(loginUser(data));
      case 'authAddUser':         return oke(tambahUser(data));
      case 'authChangePassword':  return oke(gantiPassword(data));
      case 'authResetPassword':   return oke(resetPasswordOwner(data));
      case 'authToggleUser':      return oke(toggleStatusUser(data));
      case 'authUpdateUser':      return oke(updateUser(data));
      default:                    return gagal('Aksi tidak dikenal: ' + action);
    }
  } catch (err) {
    return gagal('[POST] ' + err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
// BACA DATA
// ════════════════════════════════════════════════════════════════════════

// MASTER_BARANG — Kolom A-P
// A=ID B=Nama C=Kategori D=Supplier E=SatBesar F=SatKecil G=Konversi
// H=HargaBeli I=HargaJual J=Stok K=MinStok L=SafetyStock M=LeadTime
// N=AvgDaily O=ROP(formula) P=Status(formula)
// Baris 1=judul, Baris 2=header kolom, data mulai Baris 3
function getBarang() {
  var data = getSheet(CFG.sheet.barang).getDataRange().getValues();
  return data.slice(2).filter(function(r) { return r[0]; }).map(function(r) {
    return {
      id:      String(r[0]).trim(),
      nama:    r[1],  kat:     r[2],  supplier: r[3],
      satBesar:r[4],  sat:     r[5],  konversi: Number(r[6])  || 1,
      hBeli:   Number(r[7])  || 0,    hJual:    Number(r[8])  || 0,
      stok:    Number(r[9])  || 0,    min:      Number(r[10]) || 0,
      safety:  Number(r[11]) || 0,    lead:     Number(r[12]) || 1,
      avg:     Number(r[13]) || 0,    rop:      Number(r[14]) || 0,
      status:  r[15] || '',
    };
  });
}

// BOM — Kolom A-J
// A=KodeMenu B=NamaMenu C=HargaJual D=BarcodeB E=NamaBahan F=Satuan
// G=Qty H=HargaPerSatuan I=HPPBahan J=Keterangan
// Baris 1=judul, Baris 2=info, Baris 3=header, data mulai Baris 4
function getBOM(menuId) {
  var data = getSheet(CFG.sheet.bom).getDataRange().getValues();
  var rows = data.slice(3).filter(function(r) { return r[0]; });
  if (menuId) {
    rows = rows.filter(function(r) { return String(r[0]) === String(menuId); });
    return rows.map(function(r) {
      return { kodeMenu:r[0], namaMenu:r[1], hargaJual:Number(r[2])||0,
               barcode:String(r[3]).trim(), namaBahan:r[4], sat:r[5],
               qty:Number(r[6])||0, hargaSat:Number(r[7])||0, hpp:Number(r[8])||0 };
    });
  }
  var menus = {};
  rows.forEach(function(r) {
    var kode = String(r[0]);
    if (!menus[kode]) menus[kode] = { kodeMenu:kode, namaMenu:r[1], hargaJual:Number(r[2])||0, bom:[] };
    menus[kode].bom.push({ barcode:String(r[3]).trim(), namaBahan:r[4], sat:r[5],
                           qty:Number(r[6])||0, hpp:Number(r[8])||0 });
  });
  return Object.values(menus);
}

// STOK_HARIAN — Kolom A-I
// A=ID B=Nama C=Sat D=StokAwal E=Masuk F=Pemakaian G=Selisih H=StokAkhir I=Status
function getStokHarian() {
  var data = getSheet(CFG.sheet.stok).getDataRange().getValues();
  return data.slice(2).filter(function(r) { return r[0]; }).map(function(r) {
    return { id:String(r[0]).trim(), nama:r[1], sat:r[2],
             stokAwal:Number(r[3])||0, masuk:Number(r[4])||0,
             pakai:Number(r[5])||0,    selisih:Number(r[6])||0,
             stokAkhir:Number(r[7])||0, status:r[8]||'' };
  });
}

// STOK_OPNAME — Kolom A-L
// A=Tanggal B=Shift C=Petugas D=Barcode E=Nama F=Sat
// G=StokSistem H=StokFisik I=Selisih J=PctSelisih K=Ket L=Status
function getOpname(tanggal) {
  var data = getSheet(CFG.sheet.opname).getDataRange().getValues();
  var rows = data.slice(2).filter(function(r) { return r[0]; });
  if (tanggal) {
    rows = rows.filter(function(r) {
      var tgl = r[0] instanceof Date
        ? Utilities.formatDate(r[0], CFG.timezone, 'dd/MM/yyyy')
        : String(r[0]);
      return tgl.indexOf(String(tanggal)) !== -1;
    });
  }
  return rows.map(function(r) {
    return {
      tanggal:    r[0] instanceof Date ? Utilities.formatDate(r[0], CFG.timezone, 'dd/MM/yyyy') : String(r[0]),
      shift:r[1], petugas:r[2], barcode:String(r[3]).trim(), nama:r[4], sat:r[5],
      stokSistem:Number(r[6])||0, stokFisik:Number(r[7])||0,
      selisih:Number(r[8])||0, pctSelisih:Number(r[9])||0,
      ket:r[10]||'', status:r[11]||'',
    };
  });
}

// TRANSAKSI_POS — Kolom A-K
// A=NoTrx B=Tanggal C=Waktu D=Shift E=KodeMenu F=NamaMenu
// G=Tipe H=Qty I=HargaSat J=Total K=Kasir
function getTransaksi(tanggal) {
  var data = getSheet(CFG.sheet.transaksi).getDataRange().getValues();
  var rows = data.slice(2).filter(function(r) { return r[0]; });
  if (tanggal) {
    rows = rows.filter(function(r) {
      var tgl = r[1] instanceof Date
        ? Utilities.formatDate(r[1], CFG.timezone, 'dd/MM/yyyy')
        : String(r[1]);
      return tgl.indexOf(String(tanggal)) !== -1;
    });
  }
  return rows.map(function(r) {
    return {
      noTrx:r[0],
      tanggal: r[1] instanceof Date ? Utilities.formatDate(r[1], CFG.timezone, 'dd/MM/yyyy') : String(r[1]),
      waktu:r[2], shift:r[3], kodeMenu:r[4], namaMenu:r[5], tipe:r[6],
      qty:Number(r[7])||0, hargaSat:Number(r[8])||0, total:Number(r[9])||0, kasir:r[10]||'',
    };
  });
}

// Hitung Reorder Point semua barang
function getReorder() {
  return getBarang().map(function(b) {
    var rop     = (b.avg * b.lead) + b.safety;
    var selisih = b.stok - rop;
    var rekBeli = b.stok <= rop ? Math.max(0, (rop * 3) - b.stok) : 0;
    var status  = b.stok <= rop ? 'REORDER SEKARANG' : b.stok <= b.min ? 'SEGERA REORDER' : 'AMAN';
    return { id:b.id, nama:b.nama, sat:b.sat, avg:b.avg, lead:b.lead,
             safety:b.safety, rop:rop, stok:b.stok, selisih:selisih,
             rekBeli:rekBeli, status:status };
  });
}

// Ringkasan dashboard
function getSummaryDashboard() {
  var tgl      = Utilities.formatDate(new Date(), CFG.timezone, 'dd/MM/yyyy');
  var trxHari  = getTransaksi(tgl);
  var reorder  = getReorder();
  var totalJual= trxHari.reduce(function(s,t){ return s + t.total; }, 0);
  var menuMap  = {};
  trxHari.forEach(function(t) {
    if (!menuMap[t.namaMenu]) menuMap[t.namaMenu] = { nama:t.namaMenu, total:0, qty:0 };
    menuMap[t.namaMenu].total += t.total;
    menuMap[t.namaMenu].qty   += t.qty;
  });
  var topMenu = Object.values(menuMap).sort(function(a,b){ return b.total - a.total; }).slice(0,5);
  return {
    tanggal:   tgl,
    totalJual: totalJual,
    jumlahTrx: trxHari.length,
    kritis:    reorder.filter(function(r){ return r.status === 'REORDER SEKARANG'; }).length,
    hampir:    reorder.filter(function(r){ return r.status === 'SEGERA REORDER'; }).length,
    topMenu:   topMenu,
    stokKritis:reorder.filter(function(r){ return r.status === 'REORDER SEKARANG'; }),
  };
}

// Laporan harian lengkap
function getLaporan(tanggal) {
  var tgl     = tanggal || Utilities.formatDate(new Date(), CFG.timezone, 'dd/MM/yyyy');
  var summary = getSummaryDashboard();
  var opname  = getOpname(tgl);
  var selisih = opname.filter(function(o){ return Math.abs(o.pctSelisih) > CFG.batasSelisih; });
  var kesimpulan =
    'Tanggal ' + tgl + ': ' +
    (summary.kritis > 0 ? summary.kritis + ' bahan wajib reorder. ' : 'Stok aman. ') +
    (summary.topMenu.length > 0 ? summary.topMenu.slice(0,2).map(function(m){return m.nama;}).join(' & ') + ' menu terlaris. ' : '') +
    (selisih.length > 0 ? 'Selisih stok: ' + selisih.map(function(s){return s.nama;}).join(', ') + ' — perlu audit.' : 'Tidak ada selisih stok.');
  return { summary:summary, opname:opname, selisih:selisih, kesimpulan:kesimpulan };
}

// ════════════════════════════════════════════════════════════════════════
// TULIS DATA
// ════════════════════════════════════════════════════════════════════════

// Simpan opname + update stok + alert jika selisih besar
function simpanOpname(data) {
  var sheet   = getSheet(CFG.sheet.opname);
  var selisih = Number(data.stokFisik) - Number(data.stokSistem);
  var pct     = Number(data.stokSistem) > 0 ? selisih / Number(data.stokSistem) : 0;
  var status  = Math.abs(pct) > CFG.batasSelisih ? 'PERLU APPROVAL' : 'OK';
  var tgl     = data.tanggal || Utilities.formatDate(new Date(), CFG.timezone, 'dd/MM/yyyy');
  var baris   = sheet.getLastRow() + 1;
  sheet.getRange(baris, 1, 1, 12).setValues([[
    tgl, data.shift||'', data.petugas||'',
    String(data.barcode||'').trim(), data.nama||'', data.sat||'',
    Number(data.stokSistem)||0, Number(data.stokFisik)||0,
    selisih, pct, data.ket||'', status,
  ]]);
  if (selisih !== 0 && data.barcode) {
    updateStokByBarcode(data.barcode, Number(data.stokFisik));
  }
  if (Math.abs(pct) > CFG.batasSelisih) {
    kirimAlertSelisih(data.nama, data.stokSistem, data.stokFisik, pct);
  }
  return { baris:baris, selisih:selisih, status:status };
}

// Simpan transaksi POS + kurangi stok via BOM
// data = array: [{kodeMenu, namaMenu, harga, qty, tipe, kasir, bom:[{barcode|b, qty|q}]}]
function simpanTransaksi(data) {
  var sheet  = getSheet(CFG.sheet.transaksi);
  var items  = Array.isArray(data) ? data : [data];
  var now    = new Date();
  var noTrx  = 'TRX-' + now.getTime().toString().slice(-7);
  var waktu  = Utilities.formatDate(now, CFG.timezone, 'HH:mm:ss');
  var tgl    = Utilities.formatDate(now, CFG.timezone, 'dd/MM/yyyy');
  var jam    = Number(Utilities.formatDate(now, CFG.timezone, 'HH'));
  var shift  = jam < 14 ? 'Pagi' : jam < 22 ? 'Siang' : 'Malam';
  var baris  = sheet.getLastRow() + 1;
  var rows   = items.map(function(item) {
    return [noTrx, tgl, waktu, shift,
            item.kodeMenu||'', item.namaMenu||'',
            item.tipe||'Dine-in',
            Number(item.qty)||1, Number(item.harga)||0,
            (Number(item.qty)||1) * (Number(item.harga)||0),
            item.kasir||'Karyawan'];
  });
  if (rows.length > 0) sheet.getRange(baris, 1, rows.length, 11).setValues(rows);
  // Kurangi stok via BOM
  items.forEach(function(item) {
    if (!item.bom || !Array.isArray(item.bom)) return;
    item.bom.forEach(function(b) {
      var kode = String(b.barcode || b.b || '').trim();
      var qty  = Number(b.qty || b.q || 0) * Number(item.qty || 1);
      if (kode && qty > 0) kurangiStok(kode, qty);
    });
  });
  return { noTrx:noTrx, jumlahItem:items.length };
}

// Update stok satu barang berdasarkan barcode (kolom J)
function updateStokByBarcode(barcode, stokBaru) {
  var sheet = getSheet(CFG.sheet.barang);
  var data  = sheet.getDataRange().getValues();
  for (var i = 2; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(barcode).trim()) {
      sheet.getRange(i + 1, 10).setValue(Number(stokBaru) || 0);
      return { updated:true, baris:i+1, stokBaru:stokBaru };
    }
  }
  return { updated:false, error:'Barcode tidak ditemukan: ' + barcode };
}

// Kurangi stok bahan (dipanggil otomatis saat ada transaksi via BOM)
function kurangiStok(barcode, jumlah) {
  var sheet = getSheet(CFG.sheet.barang);
  var data  = sheet.getDataRange().getValues();
  for (var i = 2; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(barcode).trim()) {
      var stokLama = Number(data[i][9]) || 0;
      var stokBaru = Math.max(0, stokLama - jumlah);
      sheet.getRange(i + 1, 10).setValue(stokBaru);
      return { barcode:barcode, stokLama:stokLama, stokBaru:stokBaru, berkurang:jumlah };
    }
  }
  return { error:'Barcode tidak ditemukan: ' + barcode };
}

// Tambah barang baru (kolom A-N; O=ROP formula, P=Status formula — otomatis di sheet)
function simpanBarang(data) {
  var sheet = getSheet(CFG.sheet.barang);
  var baris = sheet.getLastRow() + 1;
  sheet.getRange(baris, 1, 1, 14).setValues([[
    String(data.id||'').toUpperCase().trim(), data.nama||'',
    data.kat||'Bahan Baku', data.supplier||'',
    data.satBesar||data.sat||'', data.sat||'',
    Number(data.konversi)||1,
    Number(data.hBeli)||0, Number(data.hJual)||0, Number(data.stok)||0,
    Number(data.min)||0, Number(data.safety)||0,
    Number(data.lead)||1, Number(data.avg)||0,
  ]]);
  // Salin formula ROP & Status dari baris sebelumnya
  if (baris > 3) {
    sheet.getRange(baris-1, 15, 1, 2).copyTo(sheet.getRange(baris, 15, 1, 2));
  }
  return { saved:true, baris:baris };
}

// Edit barang yang sudah ada
function ubahBarang(data) {
  var sheet = getSheet(CFG.sheet.barang);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 2; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.id||'').trim()) {
      sheet.getRange(i+1, 1, 1, 14).setValues([[
        String(data.id).toUpperCase().trim(), data.nama||rows[i][1],
        data.kat||rows[i][2], data.supplier||rows[i][3],
        data.satBesar||data.sat||rows[i][4], data.sat||rows[i][5],
        Number(data.konversi)||Number(rows[i][6])||1,
        Number(data.hBeli)||0, Number(data.hJual)||0, Number(data.stok)||0,
        Number(data.min)||0, Number(data.safety)||0,
        Number(data.lead)||1, Number(data.avg)||0,
      ]]);
      return { updated:true, baris:i+1 };
    }
  }
  return { updated:false, error:'ID tidak ditemukan: ' + data.id };
}

// Hapus barang
function hapusBarang(data) {
  var sheet = getSheet(CFG.sheet.barang);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 2; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.id||'').trim()) {
      sheet.deleteRow(i + 1);
      return { deleted:true, baris:i+1 };
    }
  }
  return { deleted:false, error:'ID tidak ditemukan: ' + data.id };
}

// Scan barcode PDT — lookup ke MASTER_BARANG
function scanBarcode(barcode) {
  barcode = String(barcode||'').trim().toUpperCase();
  if (!barcode) return { found:false, error:'Barcode kosong' };
  var item = getBarang().filter(function(b){ return b.id === barcode; })[0];
  if (!item) return { found:false, barcode:barcode, error:'Barcode tidak ditemukan' };
  var rop = (item.avg * item.lead) + item.safety;
  return {
    found:true, id:item.id, nama:item.nama, sat:item.sat,
    stok:item.stok, min:item.min, safety:item.safety, rop:rop,
    status: item.stok <= rop ? 'Reorder!' : item.stok <= item.min ? 'Hampir Habis' : 'Aman',
  };
}

// ════════════════════════════════════════════════════════════════════════
// EMAIL & NOTIFIKASI
// ════════════════════════════════════════════════════════════════════════

function kirimAlertSelisih(nama, sistem, fisik, pct) {
  var pctStr = (pct * 100).toFixed(1) + '%';
  try {
    GmailApp.sendEmail(CFG.emailOwner,
      '[ALERT ' + CFG.namaWarkop + '] Selisih stok ' + nama + ' = ' + pctStr,
      'Selisih stok melebihi batas!\nBarang: ' + nama + '\nSistem: ' + sistem + '\nFisik: ' + fisik + '\nSelisih: ' + pctStr,
      { htmlBody:
        '<div style="font-family:Arial;max-width:500px">' +
        '<div style="background:#DC2626;color:#fff;padding:12px;border-radius:8px 8px 0 0"><strong>⚠ Alert Selisih Stok — ' + CFG.namaWarkop + '</strong></div>' +
        '<div style="border:1px solid #eee;border-top:none;padding:14px;border-radius:0 0 8px 8px">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #eee">Barang</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">' + nama + '</td></tr>' +
        '<tr><td style="padding:8px;border:1px solid #eee">Stok Sistem</td><td style="padding:8px;border:1px solid #eee">' + sistem + '</td></tr>' +
        '<tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #eee">Stok Fisik</td><td style="padding:8px;border:1px solid #eee">' + fisik + '</td></tr>' +
        '<tr style="background:#FCEBEB"><td style="padding:8px;border:1px solid #eee;color:#DC2626;font-weight:bold">Selisih</td><td style="padding:8px;border:1px solid #eee;color:#DC2626;font-weight:bold">' + pctStr + '</td></tr>' +
        '</table><p style="margin-top:12px;font-size:12px;color:#666">Mohon lakukan audit internal.</p>' +
        '</div></div>'
      }
    );
  } catch(e) { Logger.log('Email alert gagal: ' + e.message); }
}

function kirimLaporanHarian() {
  var lap = getLaporan();
  var s   = lap.summary;
  var tgl = s.tanggal;

  var htmlBody =
    '<div style="font-family:Arial;max-width:600px;color:#333">' +
    '<div style="background:#1D9E75;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">' +
    '<h2 style="margin:0;font-size:18px">☕ ' + CFG.namaWarkop + '</h2>' +
    '<div style="font-size:12px;opacity:.8;margin-top:3px">Laporan Harian — ' + tgl + '</div></div>' +
    '<div style="border:1px solid #e5e5e5;border-top:none;padding:16px;border-radius:0 0 8px 8px">' +
    '<h3 style="color:#1D9E75;font-size:14px;margin-bottom:8px">📊 Ringkasan Penjualan</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #eee">Total Penjualan</td>' +
    '<td style="padding:8px;border:1px solid #eee;font-weight:bold;color:#1D9E75">Rp ' + s.totalJual.toLocaleString('id-ID') + '</td></tr>' +
    '<tr><td style="padding:8px;border:1px solid #eee">Jumlah Transaksi</td>' +
    '<td style="padding:8px;border:1px solid #eee">' + s.jumlahTrx + '</td></tr>' +
    '<tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #eee">Barang Wajib Reorder</td>' +
    '<td style="padding:8px;border:1px solid #eee;color:#DC2626;font-weight:bold">' + s.kritis + ' item</td></tr>' +
    '</table>';

  if (s.topMenu.length > 0) {
    htmlBody += '<h3 style="color:#1D9E75;font-size:14px;margin:14px 0 8px">🏆 Menu Terlaris</h3>';
    s.topMenu.forEach(function(m, i) {
      htmlBody += '<div style="display:flex;justify-content:space-between;padding:6px 10px;background:' +
        (i%2 ? '#f9f9f9':'#fff') + ';border-radius:4px;font-size:12px">' +
        '<span>' + (i+1) + '. ' + m.nama + '</span>' +
        '<span style="font-weight:bold">Rp ' + m.total.toLocaleString('id-ID') + ' (' + m.qty + ' pcs)</span></div>';
    });
  }
  if (s.stokKritis.length > 0) {
    htmlBody += '<h3 style="color:#DC2626;font-size:14px;margin:14px 0 8px">⚠ Wajib Reorder</h3>';
    s.stokKritis.forEach(function(b) {
      htmlBody += '<div style="padding:7px 10px;background:#FCEBEB;border-radius:4px;font-size:12px;margin-bottom:4px">' +
        '<strong>' + b.nama + '</strong> — Stok: ' + b.stok + ' ' + b.sat + ' | Batas: ' + b.rop.toFixed(1) + '</div>';
    });
  }
  htmlBody +=
    '<div style="margin-top:14px;padding:12px;background:#E1F5EE;border-radius:6px;font-size:12px;line-height:1.6;color:#0F6E56">' +
    '<strong>Kesimpulan:</strong> ' + lap.kesimpulan + '</div>' +
    '<div style="margin-top:10px;font-size:10px;color:#999;text-align:center">Dikirim otomatis · ' +
    Utilities.formatDate(new Date(), CFG.timezone, 'dd/MM/yyyy HH:mm') + ' WIB</div>' +
    '</div></div>';

  var lampiran = [];
  try {
    var gid    = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.sheet.laporan).getSheetId();
    var pdfUrl = 'https://docs.google.com/spreadsheets/d/' +
                 SpreadsheetApp.getActiveSpreadsheet().getId() +
                 '/export?format=pdf&gid=' + gid + '&portrait=true&fitw=true&size=A4';
    var pdf    = UrlFetchApp.fetch(pdfUrl, {
      headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }
    }).getBlob().setName('Laporan_' + tgl.replace(/\//g,'-') + '.pdf');
    lampiran = [pdf];
  } catch(e) { Logger.log('PDF gagal: ' + e.message); }

  GmailApp.sendEmail(
    CFG.emailOwner,
    '[WarkopPOS] Laporan ' + tgl + ' — Rp ' + s.totalJual.toLocaleString('id-ID'),
    lap.kesimpulan,
    { htmlBody:htmlBody, attachments:lampiran }
  );
  return { terkirim:true, ke:CFG.emailOwner, tanggal:tgl };
}

function cekStokKritis() {
  var kritis = getReorder().filter(function(r){ return r.status === 'REORDER SEKARANG'; });
  if (kritis.length === 0) return;
  var daftar = kritis.map(function(r){
    return '• ' + r.nama + ': stok ' + r.stok + ' ' + r.sat + ', batas ' + r.rop.toFixed(1);
  }).join('\n');
  GmailApp.sendEmail(
    CFG.emailOwner,
    '[ALERT] ' + kritis.length + ' bahan wajib reorder — ' + CFG.namaWarkop,
    kritis.length + ' bahan wajib dipesan:\n\n' + daftar,
    { htmlBody:
      '<div style="font-family:Arial;max-width:500px">' +
      '<h3 style="color:#DC2626">⚠ ' + kritis.length + ' Bahan Wajib Reorder!</h3>' +
      kritis.map(function(r){
        return '<div style="padding:8px;background:#FCEBEB;margin:4px 0;border-radius:4px;font-size:13px">' +
               '<strong>' + r.nama + '</strong> — Stok: ' + r.stok + ' ' + r.sat + ' | Batas: ' + r.rop.toFixed(1) + '</div>';
      }).join('') + '</div>'
    }
  );
}

// ════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT — Login Multi-Device
// USERS sheet: ID|Nama|Username|PasswordHash|Role|Aktif|MustChangePwd|CreatedAt|UpdatedAt|LastLoginAt|LastLoginDevice
// ════════════════════════════════════════════════════════════════════════

function sha256(teks) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, teks, Utilities.Charset.UTF_8);
  return bytes.map(function(b){ return ('0' + (b < 0 ? b+256 : b).toString(16)).slice(-2); }).join('');
}

function getUsersUntukOwner() {
  var data = getSheet(CFG.sheet.users).getDataRange().getValues();
  return data.slice(1).filter(function(r){ return r[0]; }).map(function(r){
    return { id:String(r[0]), nama:r[1], username:String(r[2]).toLowerCase(),
             role:r[4], aktif:String(r[5]).toUpperCase()==='TRUE',
             mustChangePwd:String(r[6]).toUpperCase()==='TRUE',
             createdAt:r[7], lastLoginAt:r[9], lastLoginDevice:r[10]||'' };
  });
}

function cariBasisUsername(username) {
  var data = getSheet(CFG.sheet.users).getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase() === String(username).toLowerCase().trim()) {
      return { baris:i+1, data:data[i] };
    }
  }
  return null;
}

function loginUser(data) {
  var username = String(data.username||'').toLowerCase().trim();
  var hash     = String(data.passwordHash||'');
  var device   = String(data.device||'web').substring(0,100);
  if (!username || !hash) return { ok:false, error:'Username atau password kosong.' };
  var found = cariBasisUsername(username);
  if (!found) return { ok:false, error:'Username tidak ditemukan.' };
  var row = found.data;
  if (String(row[5]).toUpperCase() !== 'TRUE') return { ok:false, error:'Akun dinonaktifkan. Hubungi pemilik.' };
  if (String(row[3]) !== hash) return { ok:false, error:'Password salah.' };
  var sheet = getSheet(CFG.sheet.users);
  sheet.getRange(found.baris, 10).setValue(new Date().toISOString());
  sheet.getRange(found.baris, 11).setValue(device);
  return { ok:true, user:{ id:String(row[0]), nama:row[1], username:String(row[2]).toLowerCase(),
    role:row[4], mustChangePwd:String(row[6]).toUpperCase()==='TRUE' } };
}

function tambahUser(data) {
  var username = String(data.username||'').toLowerCase().trim();
  if (!username || !data.nama || !data.passwordHash) return { ok:false, error:'Data tidak lengkap.' };
  if (cariBasisUsername(username)) return { ok:false, error:'Username sudah digunakan.' };
  var now   = new Date().toISOString();
  var newId = 'USR-' + new Date().getTime();
  getSheet(CFG.sheet.users).appendRow([newId, data.nama, username, data.passwordHash, data.role||'karyawan', 'TRUE', 'TRUE', now, now, '', '']);
  return { ok:true, id:newId };
}

function gantiPassword(data) {
  var username = String(data.username||'').toLowerCase().trim();
  if (!username || !data.oldHash || !data.newHash) return { ok:false, error:'Data tidak lengkap.' };
  var found = cariBasisUsername(username);
  if (!found) return { ok:false, error:'User tidak ditemukan.' };
  if (String(found.data[3]) !== data.oldHash) return { ok:false, error:'Password lama salah.' };
  var sheet = getSheet(CFG.sheet.users);
  sheet.getRange(found.baris, 4).setValue(data.newHash);
  sheet.getRange(found.baris, 7).setValue('FALSE');
  sheet.getRange(found.baris, 9).setValue(new Date().toISOString());
  return { ok:true };
}

function resetPasswordOwner(data) {
  var target = String(data.targetUsername||'').toLowerCase().trim();
  if (!target || !data.newHash) return { ok:false, error:'Data tidak lengkap.' };
  var found = cariBasisUsername(target);
  if (!found) return { ok:false, error:'User tidak ditemukan.' };
  var sheet = getSheet(CFG.sheet.users);
  sheet.getRange(found.baris, 4).setValue(data.newHash);
  sheet.getRange(found.baris, 7).setValue('TRUE');
  sheet.getRange(found.baris, 9).setValue(new Date().toISOString());
  return { ok:true };
}

function toggleStatusUser(data) {
  var userId = String(data.userId||'');
  var sheet  = getSheet(CFG.sheet.users);
  var rows   = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === userId) {
      var aktif = String(rows[i][5]).toUpperCase() === 'TRUE';
      sheet.getRange(i+1, 6).setValue(aktif ? 'FALSE' : 'TRUE');
      sheet.getRange(i+1, 9).setValue(new Date().toISOString());
      return { ok:true, aktif:!aktif };
    }
  }
  return { ok:false, error:'User tidak ditemukan.' };
}

function updateUser(data) {
  var userId = String(data.userId||'');
  var sheet  = getSheet(CFG.sheet.users);
  var rows   = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === userId) {
      if (data.nama) sheet.getRange(i+1, 2).setValue(data.nama);
      if (data.role) sheet.getRange(i+1, 5).setValue(data.role);
      sheet.getRange(i+1, 9).setValue(new Date().toISOString());
      return { ok:true };
    }
  }
  return { ok:false, error:'User tidak ditemukan.' };
}

// ════════════════════════════════════════════════════════════════════════
// SETUP — Jalankan SEKALI setelah upload spreadsheet
// ════════════════════════════════════════════════════════════════════════

function setupAwal() {
  buatSheetUsers();
  setupTrigger();
  SpreadsheetApp.getUi().alert(
    '✅ Setup WarkopPOS selesai!\n\n' +
    'Sheet USERS dibuat dengan 2 akun default:\n' +
    '  Pemilik    → username: owner     / password: owner123\n' +
    '  Karyawan   → username: karyawan1 / password: karyawan123\n\n' +
    'Trigger email laporan aktif pukul ' + CFG.jamLaporan + '.00 WIB setiap hari.\n\n' +
    'PENTING: Segera ganti password setelah login pertama!'
  );
}

function buatSheetUsers() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.sheet.users);
  if (sheet) { Logger.log('Sheet USERS sudah ada.'); return; }
  sheet = ss.insertSheet(CFG.sheet.users);
  var header = ['ID','Nama','Username','PasswordHash','Role','Aktif','MustChangePwd','CreatedAt','UpdatedAt','LastLoginAt','LastLoginDevice'];
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  var now = new Date().toISOString();
  sheet.getRange(2, 1, 2, 11).setValues([
    ['USR-001','Pemilik',   'owner',     sha256('owner123'),    'owner',    'TRUE','TRUE',now,now,'','init'],
    ['USR-002','Karyawan 1','karyawan1', sha256('karyawan123'), 'karyawan', 'TRUE','TRUE',now,now,'','init'],
  ]);
  Logger.log('✅ Sheet USERS dibuat dengan 2 akun default.');
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('kirimLaporanHarian').timeBased().atHour(CFG.jamLaporan).everyDays(1).inTimezone(CFG.timezone).create();
  ScriptApp.newTrigger('cekStokKritis').timeBased().everyHours(6).create();
  Logger.log('✅ Trigger laporan & cek stok aktif.');
}

// Test cepat — jalankan dari editor untuk memastikan semua berjalan
function testSemua() {
  Logger.log('=== TEST PING ===');
  Logger.log('Warkop: ' + CFG.namaWarkop);
  Logger.log('Email : ' + CFG.emailOwner);

  Logger.log('\n=== TEST SCAN PDT ===');
  Logger.log(JSON.stringify(scanBarcode('WK-001')));

  Logger.log('\n=== TEST REORDER ===');
  var rop = getReorder();
  Logger.log('Total barang : ' + rop.length);
  Logger.log('Kritis       : ' + rop.filter(function(r){return r.status==='REORDER SEKARANG';}).length);

  Logger.log('\n=== TEST SUMMARY ===');
  var sum = getSummaryDashboard();
  Logger.log('Total jual : Rp ' + sum.totalJual);
  Logger.log('Transaksi  : ' + sum.jumlahTrx);

  Logger.log('\n=== TEST LOGIN USER ===');
  var hasil = loginUser({ username:'owner', passwordHash:sha256('owner123'), device:'test' });
  Logger.log(JSON.stringify(hasil));

  Logger.log('\n✅ Semua test selesai!');
}
