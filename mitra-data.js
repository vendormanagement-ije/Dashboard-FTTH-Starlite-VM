/* Portal Mitra FTTH — data engine (read-only, Google Sheets CSV).
   Parsing & matching rules mirror Dashboard FTTH.dc.html; keep both in sync. */
(function () {
  'use strict';
  const B1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSttEIl8mrenKwUD7B7zwIEXKV0Mt5ZfWE-6GmRvkOO3DV7oFa95EoDbquVFJ_WOFcdt70QRE-O8I6N/pub?';
  const CFG = {
    MAIN: B1 + 'gid=1647278393&single=true&output=csv',
    BB: B1 + 'gid=357840142&single=true&output=csv',
    HYB: B1 + 'gid=569759941&single=true&output=csv',
    IC: B1 + 'gid=541095607&single=true&output=csv',
    HC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHC9CSQSHZqkLN4N7gT9MMy8ce7K4GoXHNA_8_gBzJUYgkhAoFjKECZSKpjgfQg_A0mHv8uVwTni_v/pub?output=csv',
    THC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2QFlikDR819PqHMvvsAA-fXbSyQezFnXzm_YoXeI2Y5DcAtTIXELM7Bogu6ojeA1qYaLP5ec7h4oe/pub?gid=1886034448&single=true&output=csv',
    DAILY: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2QFlikDR819PqHMvvsAA-fXbSyQezFnXzm_YoXeI2Y5DcAtTIXELM7Bogu6ojeA1qYaLP5ec7h4oe/pub?gid=188700591&single=true&output=csv',
    SPK: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNLfUpjzcA8rej0nOOTeHu4AESeJ4PbIHu8DJTt9UYZU016U2h6ZnEU5LRh_iXrDFI8d-OO5OuNCJ5/pub?gid=755643497&single=true&output=csv',
    DRM: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQwRTJAgpoTjkPlAf5JTwhct2anMCd1mdaR4_Ei9pB3Z15ClC61WS-7MWf_GWmVBItF7H8ytsiBEeXI/pub?gid=1772618045&single=true&output=csv',
    DOC: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7jnqNRaAAOTzQr1oKLpvKnWLrbbjyrc9ws57zW9k7Gsx5rs_5xHVwnPObaKYqNxUOwbJPslPiyMDs/pub?gid=927063485&single=true&output=csv',
    TO: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyK-DzYWmRFg3ocJRkHj8cwTNCSibdNl61tjVYdepjxK7mwVkjAijhFDaacbVM1jIFmrvBTnl3dyOs/pub?gid=1773185851&single=true&output=csv',
    PIN: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQ0n2w1HSM6al4DA6NKIdMirBNBwzN1OCbTKcocvbznLLcmbTrKxV3p1rN_GJzoK4l1fiM-XYCbaKl/pub?output=csv',
    DEFAULT_PIN: '1234'
  };
  function configure(o) { if (!o) return; Object.keys(o).forEach(k => { if (o[k] != null && o[k] !== '') CFG[k] = String(o[k]).trim(); }); }

  const trim = v => (v == null ? '' : String(v)).trim();
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const errMsg = e => (e && e.message) ? e.message : String(e || 'Error');

  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function splitLine(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  }

  const _nn = new Map();
  function normName(s) {
    const k = s == null ? '' : String(s);
    let r = _nn.get(k);
    if (r === undefined) {
      r = k.toUpperCase().replace(/^RT\s*[/-]\s*RW_?\s*/, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\b(PT|CV|UD|TBK)\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (_nn.size > 60000) _nn.clear();
      _nn.set(k, r);
    }
    return r;
  }
  const normPo = s => trim(s).toUpperCase().replace(/\s+/g, '');
  const STASIUN_SYNONYMS = { KASUGIHAN: 'KESUGIHAN', KERTASMAYA: 'KERTASEMAYA' };
  // Same per-mitra alias table as Dashboard FTTH (MITRA_STASIUN_ALIAS) — update both together.
  const MITRA_STASIUN_ALIAS = {
    'DUTA ANUGRAH DAMAI SEJAHTERA': { 'MALANG': 'MALANG GABUNGAN', 'MALANG KOTA LAMA': 'MALANG GABUNGAN', 'MALANG KOTA BARU': 'MALANG GABUNGAN' },
    'PERSONEL ALIH DAYA': { 'JAKARTA KOTA': 'SURGE OFFICE' },
    'NABAWI': { 'BOGASARI': 'GUNUNG PUTRI' }
  };
  const MITRA_DISTINCT_PAIRS = [
    ['KREASI UTAMA MANDIRI', 'KRESA UTAMA MANDIRI'],
    ['TEKKOMINDO KARYA WIJAYA', 'WIJAYA KARYA ARTA'],
    ['GERBANG NUSANTARA SAKTI', 'BERKAT BERSAMA TEKNIK'],
    ['INTERNUSA DUTA MAKMUR', 'KESHAVA MULTI INTER MEDIA']
  ];
  const isDistinct = (a, b) => MITRA_DISTINCT_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const _ns = new Map();
  function normSta(s) {
    const k = s == null ? '' : String(s);
    let r = _ns.get(k);
    if (r === undefined) {
      r = normName(k.replace(/^(ST[-\s]|POP[-\s])/i, '')).split(' ').map(w => STASIUN_SYNONYMS[w] || w).join(' ');
      if (_ns.size > 60000) _ns.clear();
      _ns.set(k, r);
    }
    return r;
  }
  function resolveAlias(mitra, n) { const nn = normName(mitra), m = MITRA_STASIUN_ALIAS[nn] || MITRA_STASIUN_ALIAS[(' ' + nn + ' ').includes(' NABAWI ') ? 'NABAWI' : '']; return (m && m[n]) || n; }
  // Loose mitra-name match used for sheets keyed by free-typed partner names.
  function sameMitra(a, b) {
    const x = normName(a), y = normName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    if (isDistinct(x, y)) return false;
    return x.length >= 8 && y.length >= 8 && (x.includes(y) || y.includes(x));
  }

  function num(s) {
    if (s == null || s === '') return 0;
    const v = parseFloat(String(s).replace(/[Rp\s%]/gi, '').replace(/\./g, '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
    return isFinite(v) ? v : 0;
  }
  function poToNum(v) { let s = String(v == null ? '' : v).replace(/[^0-9,.\-]/g, ''); const q = s.match(/^(-?[\d.,]*\d)[.,](\d{1,2})$/); if (q) s = q[1].replace(/[.,]/g, '') + '.' + q[2]; else s = s.replace(/[.,]/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n); }
  function thcNum(v) {
    let s = String(v == null ? '' : v).trim().replace(/\s|%/g, '');
    if (!s) return 0;
    s = s.replace(/\./g, '').replace(/,/g, '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  const MONTHS = { jan: 0, januari: 0, january: 0, feb: 1, peb: 1, februari: 1, february: 1, mar: 2, maret: 2, march: 2, apr: 3, april: 3, mei: 4, may: 4, jun: 5, juni: 5, june: 5, jul: 6, juli: 6, july: 6, agu: 7, agt: 7, agus: 7, agustus: 7, aug: 7, august: 7, sep: 8, sept: 8, september: 8, okt: 9, oct: 9, oktober: 9, october: 9, nov: 10, nop: 10, november: 10, des: 11, dec: 11, desember: 11, december: 11 };
  const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const MON_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function monIdx(s) { const k = trim(s).toLowerCase(); return has(MONTHS, k) ? MONTHS[k] : -1; }
  function parseDate(raw) {
    const s = trim(raw);
    if (!s || s === '-') return null;
    let m, y, mo, d;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) { d = +m[1]; mo = +m[2] - 1; y = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[\s\-\/.]+([A-Za-z]+)[\s\-\/.,]+(\d{2,4})/))) { d = +m[1]; mo = monIdx(m[2]); y = +m[3]; }
    else if ((m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/))) { mo = monIdx(m[1]); d = +m[2]; y = +m[3]; }
    else return null;
    if (y < 100) y += 2000;
    if (!(y >= 2000 && y <= 2100) || !(mo >= 0 && mo <= 11) || !(d >= 1 && d <= 31)) return null;
    const dt = new Date(y, mo, d);
    return dt.getMonth() === mo ? dt : null;
  }
  const fmtDate = dt => dt ? (dt.getDate() + ' ' + MON_SHORT[dt.getMonth()] + ' ' + dt.getFullYear()) : '';
  const isoDay = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  let _nf = null;
  function fmt(n) { if (!_nf) _nf = new Intl.NumberFormat('id-ID'); const v = Math.round(+n || 0); return _nf.format(v); }
  function pct(a, b) { return b > 0 ? Math.round(a / b * 1000) / 10 : 0; }

  // Cache mentah (IndexedDB): kunjungan berikutnya tampil langsung dari data tersimpan, lalu diperbarui di latar belakang.
  let _cacheOnly = false;
  const idb = (() => {
    let p = null;
    const open = () => p || (p = new Promise((res, rej) => { try { const q = indexedDB.open('ams_raw', 1); q.onupgradeneeded = () => q.result.createObjectStore('t'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e) { rej(e); } }));
    return {
      get: k => open().then(db => new Promise(res => { const q = db.transaction('t').objectStore('t').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null),
      set: (k, v) => open().then(db => { db.transaction('t', 'readwrite').objectStore('t').put(v, k); }).catch(() => {})
    };
  })();
  function fetchText(url, opt) {
    opt = opt || {};
    if (_cacheOnly) return idb.get(url).then(c => { if (c && c.t && Date.now() - c.at < 7 * 864e5) return c.t; throw new Error('tanpa cache'); });
    // Percobaan yang menggantung dibatalkan cepat lalu diulang dengan koneksi baru.
    const tries = opt.retries == null ? 3 : opt.retries, timeout = opt.timeout || 12000;
    const attempt = n => {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => { if (ac) ac.abort(); }, timeout);
      const u = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cb=' + Date.now();
      return fetch(u, { cache: 'no-store', signal: ac ? ac.signal : undefined })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(t => { clearTimeout(timer); if (/^\s*(<!doctype html|<html)/i.test(t)) throw new Error('Sheet tidak mengembalikan CSV'); idb.set(url, { t, at: Date.now() }); return t; })
        .catch(e => {
          clearTimeout(timer);
          if (n < tries) return new Promise(res => setTimeout(res, 300 * (n + 1))).then(() => attempt(n + 1));
          throw (e && e.name === 'AbortError') ? new Error('Waktu habis saat memuat data') : (e instanceof TypeError ? new Error('Tidak dapat terhubung ke Google Sheets') : e);
        });
    };
    return attempt(0);
  }

  /* ---------------- Tracker FTTH ---------------- */
  function mergeBackboneRows(all, mainHeader, mainRows, srcTag, C) {
    const norm = s => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
    const key = s => norm(s).replace(/^(PT|CV)\.?\s+/, '').replace(/[^A-Z0-9]/g, '');
    let hi = all.findIndex((row, i) => i < 8 && row.some(h => norm(h) === 'NO PO PEMBANGUNAN'));
    if (hi < 0) hi = all.findIndex((row, i) => i < 8 && row.some(h => norm(h) === 'STASIUN' || norm(h) === 'SITE'));
    if (hi < 0) hi = 0;
    const bh = all[hi] || [];
    const mainIdx = {};
    mainHeader.forEach((h, i) => { const k = norm(h); if (k && !(k in mainIdx)) mainIdx[k] = i; });
    const fixed = { 'MITRA HISTORY': C.mitraHist, 'MITRA UPDATE': C.mitra, 'SITE': C.stasiun, 'OTB': C.otb, 'ODC': C.odc, 'ODP': C.odp, 'HOME PASS': C.hpActual, 'HP PO': C.hpPo, 'HOME PASS PO': C.hpPo, 'HOMEPASS PO': C.hpPo, 'HP PLAN': C.hpPo, 'HP PO PEMBANGUNAN': C.hpPo, 'PO ITEM': C.poitem, 'NO PO PEMBANGUNAN': C.nopo, 'DATE RILIS PO PEMBANGUNAN': C.tglrilis, 'PIC': C.pic, 'TELP': C.telp, 'STATUS': C.statusMain, 'REMARK': C.remark };
    const nz = bh.map((h, i) => [norm(h), i]).filter(x => x[0]);
    const sameLayout = bh.length >= mainHeader.length * 0.8 && nz.length > 0 && nz.filter(x => norm(mainHeader[x[1]]) === x[0]).length >= nz.length * 0.7;
    const colMap = sameLayout ? bh.map((h, i) => i) : bh.map((h, i) => { const k = norm(h); if (k in fixed && fixed[k] >= 0) return fixed[k]; if (k in mainIdx) return mainIdx[k]; return i < 46 ? i : -1; });
    if (!sameLayout && C.hpActual >= 0) {
      const names = ['HP ACTUAL', 'HP AKTUAL', 'HOME PASS ACTUAL', 'HOMEPASS ACTUAL', 'HOME PASS AKTUAL', 'HOMEPASS AKTUAL', 'HP TERBANGUN', 'HOME PASS', 'HOMEPASS'];
      const bn = bh.map(norm);
      let hpa = -1;
      for (const n of names) { const i = bn.indexOf(n); if (i >= 0) { hpa = i; break; } }
      if (hpa < 0) hpa = bn.findIndex(h => /(ACTUAL|AKTUAL)/.test(h) && /(HP|HOME ?PASS)/.test(h));
      if (hpa >= 0) { colMap.forEach((t, i) => { if (t === C.hpActual) colMap[i] = -1; }); colMap[hpa] = C.hpActual; }
    }
    const mitraCanon = {}, staCanon = {};
    mainRows.forEach(r => {
      const m = trim(r[C.mitra]); if (!m) return;
      const mk = key(m); if (!(mk in mitraCanon)) mitraCanon[mk] = m;
      const s = trim(r[C.stasiun]); if (s) { const sk = mk + '|' + norm(s); if (!(sk in staCanon)) staCanon[sk] = s; }
    });
    const width = Math.max(mainHeader.length, 261);
    const out = [];
    all.slice(hi + 1).forEach(src => {
      if (!src || src.length < 4) return;
      const row = new Array(width).fill('');
      colMap.forEach((ti, si) => { if (ti >= 0 && src[si] != null && String(src[si]).trim() !== '') row[ti] = src[si]; });
      let mitra = trim(row[C.mitra]) || trim(row[C.mitraHist]);
      const stasiun = trim(row[C.stasiun]);
      if (!mitra && !stasiun) return;
      const mk = key(mitra);
      if (mitraCanon[mk]) mitra = mitraCanon[mk];
      row[C.mitra] = mitra;
      if (!trim(row[C.mitraHist])) row[C.mitraHist] = mitra;
      const sc = staCanon[mk + '|' + norm(stasiun)];
      if (sc) row[C.stasiun] = sc;
      row.__src = srcTag;
      out.push(row);
    });
    return out;
  }

  // Tracker utama tampil secepatnya; Backbone/Hybrid digabung bila datang dalam 2,5 detik, sisanya menyusul di latar belakang (main.upgrade).
  async function _loadMain() {
    const bbP = fetchText(CFG.BB).catch(() => ''), hybP = fetchText(CFG.HYB).catch(() => ''), icP = fetchText(CFG.IC).catch(() => '');
    const t = await fetchText(CFG.MAIN, { retries: 3, timeout: 30000 });
    const both = Promise.all([bbP, hybP, icP]);
    const early = await Promise.race([both, new Promise(res => setTimeout(() => res(null), 2500))]);
    const main = buildMain(t, early ? early[0] : '', early ? early[1] : '', early ? early[2] : '');
    if (!early) main.upgrade = both.then(([b, h, i]) => (b || h || i) ? buildMain(t, b, h, i) : null).catch(() => null);
    return main;
  }
  function buildMain(t, bbT, hybT, icT) {
    const all = parseCSV(t);
    const header = all[2] || [];
    const idx = name => header.findIndex(h => h && h.trim() === name);
    const pick = (name, fb) => { const i = idx(name); return i >= 0 ? i : fb; };
    const nh = header.map(h => String(h || '').toUpperCase().replace(/\s+/g, ' ').trim());
    const hpf = (names, fb) => { for (const n of names) { const i = nh.indexOf(n); if (i >= 0) return i; } return fb; };
    const C = {
      mitra: 1, hpPo: hpf(['HP PO', 'HOME PASS PO', 'HOMEPASS PO', 'HP PO PEMBANGUNAN', 'HP PLAN'], 7), hpActual: hpf(['HP ACTUAL', 'HP AKTUAL', 'HOME PASS ACTUAL', 'HOMEPASS ACTUAL', 'HOME PASS AKTUAL', 'HOMEPASS AKTUAL', 'HP TERBANGUN', 'HOME PASS', 'HOMEPASS'], 70), mitraHist: pick('Mitra History', 0),
      reg: idx('Regional'), stasiun: pick('STASIUN', 9), kota: idx('Kota / Kabupaten'),
      issue: idx('CATEGORY ISSUE'), detailIssue: pick('DETAIL ISSUE', 59), remark: pick('Remark Detail Issue', 60),
      tipePo: (() => { const i = header.findIndex(h => /^(TYPE|TIPE|JENIS)\s*PO$/i.test((h || '').trim())); return i; })(), pic: 12, telp: 13, poitem: 6, nopo: 11, tglrilis: 10, otb: hpf(['OTB'], 67), odc: hpf(['ODC'], 68), odp: hpf(['ODP'], 69),
      statusMain: 17, statusMos: (() => { const i = nh.findIndex(h => /^STATUS (MOS|MATERIAL)/.test(h)); return i >= 0 ? i : 26; })(), mosDate: pick('MOS Date', 23), statusRfs: (() => { let i = nh.findIndex(h => /^(STATUS )?(RFS|REDLINE)( STATUS)?$|^STATUS (RFS|REDLINE)/.test(h)); if (i < 0) i = nh.findIndex(h => /RFS/.test(h) && /STATUS/.test(h)); return i >= 0 ? i : 41; })(), planAtp: 42, atpActual: 43,
      planRfs: idx('Plan Date RFS') >= 0 ? idx('Plan Date RFS') : pick('Plan RFS', 38),
      rollout: pick('Actual Start ROLLOUT', 35), rolloutEnd: pick('Actual End ROLLOUT', 36),
      donasi: 32, nominalDp: 239, nominalBast: 253,
      statusRedline: (() => { const i = nh.indexOf('STATUS REDLINE'); return i >= 0 ? i : 327; })()
    };
    if (!header.length || all.length < 4) throw new Error('Format tracker FTTH tidak dikenali');
    const data = all.slice(3).filter(r => r.length > 3 && (trim(r[1]) || trim(r[C.stasiun])));
    const mainOnly = data.slice();
    try { if (bbT) data.push(...mergeBackboneRows(parseCSV(bbT), header, mainOnly, 'BB', C)); } catch (e) { console.warn('[AMS] merge Backbone gagal', e); }
    try { if (hybT) data.push(...mergeBackboneRows(parseCSV(hybT), header, mainOnly, 'HYB', C)); } catch (e) { console.warn('[AMS] merge Hybrid gagal', e); }
    try { if (icT) data.push(...mergeBackboneRows(parseCSV(icT), header, mainOnly, 'IC', C)); } catch (e) { console.warn('[AMS] merge Innercity gagal', e); }
    const si = C.stasiun, cnt = {}, kf = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    data.forEach(r => { const s = trim(r[si]); if (!s) return; const k = kf(s); const b = cnt[k] = cnt[k] || {}; b[s] = (b[s] || 0) + 1; });
    const canon = {}; Object.keys(cnt).forEach(k => { canon[k] = Object.entries(cnt[k]).sort((a, b) => b[1] - a[1])[0][0]; });
    data.forEach(r => { const s = trim(r[si]); if (s && canon[kf(s)] !== s) r[si] = canon[kf(s)]; });
    return { C, rows: data, partial: { bb: !!bbT, hyb: !!hybT, ic: !!icT } };
  }
  let _mainP = null, _mainT = 0;
  function loadMain(force) {
    if (!force && _mainP && Date.now() - _mainT < 90000) return _mainP;
    _mainT = Date.now();
    _mainP = _loadMain().catch(e => { _mainP = null; throw e; });
    return _mainP;
  }
  // Mitra implementasi = segmen pertama Mitra History; mitra update/IKR = segmen terakhir kolom mitra.
  // PO take over = keduanya berbeda. Status PO s.d. ATP dibebankan ke mitra implementasi.
  function rowMeta(main) {
    if (main._meta && main._metaN === main.rows.length) return main._meta;
    const C = main.C;
    main._meta = main.rows.map(r => {
      const updFull = trim(r[C.mitra]);
      const upd = updFull.split('>').map(trim).filter(Boolean).pop() || updFull;
      const impl = trim(r[C.mitraHist]).split('>').map(trim).filter(Boolean)[0] || upd;
      return { impl, upd, updFull, to: !!(impl && upd && !sameMitra(impl, upd)) };
    });
    main._metaN = main.rows.length;
    return main._meta;
  }
  function listMitra(main) {
    const C = main.C, by = {}, meta = rowMeta(main);
    const add = (n, r) => {
      const k = normName(n); if (!k) return;
      const b = by[k] = by[k] || { name: n, po: 0, regions: {} };
      b.po++;
      const rg = trim(r[C.reg]); if (rg) b.regions[rg] = 1;
    };
    main.rows.forEach((r, i) => {
      const mt = meta[i];
      if (mt.updFull) add(mt.updFull, r);
      if (mt.to && normName(mt.impl) !== normName(mt.updFull)) add(mt.impl, r);
    });
    return Object.values(by).map(b => ({ name: b.name, po: b.po, region: Object.keys(b.regions).join(', ') })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ---------------- HC (CRM) ---------------- */
  function deriveHcStasiun(mitraName, raw) {
    let rem = raw, migrasi = false;
    const mp = /^MIGRASI[_\s]+(.+)$/i.exec(rem.trim());
    if (mp) { migrasi = true; rem = mp[1]; }
    let stripped = false;
    if (rem.startsWith(mitraName + '_') || rem.startsWith(mitraName + ' ')) { rem = rem.slice(mitraName.length + 1); stripped = true; }
    const upper = rem.toUpperCase();
    if (!migrasi && rem === raw && normName(rem) === normName(mitraName)) return { noise: true };
    if (!migrasi && upper !== 'MIGRASI' && upper.endsWith('_MIGRASI')) { migrasi = true; rem = rem.slice(0, rem.length - 8); }
    else if (!migrasi && upper === 'MIGRASI' && stripped) { migrasi = true; rem = 'MIGRASI'; }
    else if (!migrasi && upper === 'MIGRASI') return { noise: true };
    else if (!migrasi && upper.startsWith('MIGRASI')) { migrasi = true; rem = rem.slice(7).replace(/^[_\s]+/, ''); }
    if (!rem.trim()) return { noise: true };
    if (migrasi && normName(rem) === normName(mitraName)) return { noise: true };
    const segs = rem.split('_').filter(Boolean);
    const last = segs[segs.length - 1] || '';
    if (segs.length > 1) return { noise: false, migrasi, kabupaten: segs.slice(0, -1).join(' ') || '-', label: last };
    return { noise: false, migrasi, kabupaten: '-', label: rem.replace(/_/g, ' ') };
  }
  async function loadHc() {
    const text = await fetchText(CFG.HC);
    const lines = text.split(/\r\n|\n/).filter(l => l.length);
    const first = lines.length ? splitLine(lines[0]) : [];
    const updatedLabel = trim(first[1]);
    const hcMap = {}; let current = null, rawPrefix = null;
    const blank = () => ({ aktif: 0, isolir: 0, dismantle: 0, siap: 0, sedang: 0, nonAktif: 0, total: 0 });
    for (const line of lines) {
      const cols = splitLine(line);
      const c0 = trim(cols[0]);
      if (c0.startsWith('Partner:')) {
        const rp = c0.slice(8).trim();
        const ex = Object.keys(hcMap).find(k => normName(k) === normName(rp));
        current = ex || rp; rawPrefix = rp;
        if (!hcMap[current]) hcMap[current] = Object.assign({ name: current, stasiunMap: {} }, blank());
        continue;
      }
      if (c0 === 'Sales Partner' || !current || c0 === 'Total' || !c0) continue;
      const total = parseInt(cols[1], 10) || 0;
      const aktif = parseInt(cols[2], 10) || 0, isolir = parseInt(cols[3], 10) || 0;
      const siap = parseInt(cols[4], 10) || 0, sedang = parseInt(cols[5], 10) || 0;
      const sudah = parseInt(cols[6], 10) || Math.max(0, total - aktif - isolir - siap - sedang);
      const d = deriveHcStasiun(rawPrefix, c0);
      if (d.noise || d.migrasi) continue;
      const m = hcMap[current];
      const add = o => { o.aktif += aktif; o.isolir += isolir; o.dismantle += siap + sedang; o.siap += siap; o.sedang += sedang; o.nonAktif += sudah; o.total += total; };
      add(m);
      const key = d.kabupaten + '|' + normSta(d.label);
      if (!m.stasiunMap[key]) m.stasiunMap[key] = Object.assign({ key, label: d.label, kabupaten: d.kabupaten }, blank());
      add(m.stasiunMap[key]);
    }
    return { map: hcMap, norm: Object.keys(hcMap).map(k => ({ key: k, norm: normName(k) })), updatedLabel };
  }
  function findHcMitraDirect(hc, name) {
    const norm = normName(name);
    if (!norm) return null;
    const exact = hc.norm.find(o => o.norm === norm);
    if (exact) return { entry: hc.map[exact.key], confidence: 'exact', hcName: exact.key };
    let best = null, bestLen = 0;
    hc.norm.forEach(o => {
      if (o.norm.length < 4 || norm.length < 4 || isDistinct(norm, o.norm)) return;
      if (o.norm.includes(norm) || norm.includes(o.norm)) { const l = Math.min(o.norm.length, norm.length); if (l > bestLen) { bestLen = l; best = o; } }
    });
    if (best) return { entry: hc.map[best.key], confidence: 'fuzzy', hcName: best.key };
    const tokA = new Set(norm.split(' ').filter(w => w.length > 2));
    let bestScore = 0, bestTok = null;
    hc.norm.forEach(o => {
      if (isDistinct(norm, o.norm)) return;
      const tokB = new Set(o.norm.split(' ').filter(w => w.length > 2));
      if (!tokA.size || !tokB.size) return;
      let inter = 0; tokA.forEach(t => { if (tokB.has(t)) inter++; });
      const sc = inter / Math.max(tokA.size, tokB.size);
      if (sc > bestScore) { bestScore = sc; bestTok = o; }
    });
    if (bestTok && bestScore >= 0.5) return { entry: hc.map[bestTok.key], confidence: 'fuzzy', hcName: bestTok.key };
    return null;
  }
  function hcAliasMap(hc, main) {
    if (hc._alias) return hc._alias;
    const aliasMap = {}, C = main.C, D = main.rows;
    const words = s => new Set(normName(s).split(' ').filter(w => w.length > 2));
    const first = s => String(s || '').split('>')[0].trim();
    const rowSta = D.map(r => normSta(r[C.stasiun]));
    Object.values(hc.map).forEach(m => {
      const pw = words(m.name); if (!pw.size) return;
      const targets = new Set();
      Object.values(m.stasiunMap).forEach(s => {
        const ns = normSta(s.label);
        D.forEach((r, i) => {
          const rs = rowSta[i];
          if (!rs || (rs !== ns && !rs.includes(ns) && !ns.includes(rs))) return;
          const iw = words(first(r[C.mitra])), hw = words(first(r[C.mitraHist]));
          let hit = false;
          for (const w of pw) { if (iw.has(w) || hw.has(w)) { hit = true; break; } }
          if (hit) { const ikr = trim(r[C.mitra]); if (ikr && !isDistinct(normName(m.name), normName(ikr))) targets.add(ikr); }
        });
      });
      if (targets.size === 1) { const t = [...targets][0]; const k = normName(t); if (!aliasMap[k]) aliasMap[k] = { hcName: m.name, target: t }; }
    });
    hc._alias = aliasMap;
    return aliasMap;
  }
  function findHcMitra(hc, main, name) {
    let r = findHcMitraDirect(hc, name);
    if (!r) { const a = hcAliasMap(hc, main)[normName(name)]; if (a && hc.map[a.hcName]) r = { entry: hc.map[a.hcName], confidence: 'alias', hcName: a.hcName }; }
    return r;
  }
  // Assign each HC-side station to at most one tracker station. Exact (alias-normalized) labels are
  // merged first — several CRM labels can collapse into one FTTH station — then looser tiers fill the rest.
  function assignHcStations(entry, stationNames) {
    const list = Object.values(entry.stasiunMap);
    const nOf = s => resolveAlias(entry.name, normSta(s));
    const used = new Set(), by = {};
    stationNames.forEach(n => { by[n] = []; });
    stationNames.forEach(n => {
      const nf = nOf(n); if (!nf) return;
      list.forEach(h => { if (!used.has(h.key) && nOf(h.label) === nf) { used.add(h.key); by[n].push(h); } });
    });
    stationNames.forEach(n => {
      if (by[n].length) return;
      const nf = nOf(n); if (nf.length < 4) return;
      let best = null, bl = 0;
      list.forEach(h => { if (used.has(h.key)) return; const nh = nOf(h.label); if (nh.length >= 4 && (nh.includes(nf) || nf.includes(nh))) { const l = Math.min(nh.length, nf.length); if (l > bl) { bl = l; best = h; } } });
      if (best) { used.add(best.key); by[n].push(best); }
    });
    stationNames.forEach(n => {
      if (by[n].length) return;
      const tf = nOf(n).replace(/\s+/g, ''); if (!tf) return;
      const h = list.find(h => { if (used.has(h.key)) return false; const th = normSta(h.label).replace(/\s+/g, ''); return th && (th === tf || th.includes(tf) || tf.includes(th)); });
      if (h) { used.add(h.key); by[n].push(h); }
    });
    stationNames.forEach(n => {
      if (by[n].length) return;
      const ta = new Set(nOf(n).split(' ').filter(w => w.length > 2)); if (!ta.size) return;
      let best = null, bs = 0;
      list.forEach(h => {
        if (used.has(h.key)) return;
        const tb = new Set(normSta((h.kabupaten || '') + ' ' + h.label).split(' ').filter(w => w.length > 2)); if (!tb.size) return;
        let inter = 0; ta.forEach(t => { if (tb.has(t)) inter++; });
        const sc = inter / Math.max(ta.size, tb.size);
        if (sc > bs && sc >= 0.6) { bs = sc; best = h; }
      });
      if (best) { used.add(best.key); by[n].push(best); }
    });
    return { by, unassigned: list.filter(h => !used.has(h.key)) };
  }

  /* ---------------- Target HC, aktivasi harian ---------------- */
  async function loadThc() {
    const all = parseCSV(await fetchText(CFG.THC));
    let hi = all.findIndex(row => (row || []).some(c => trim(c).toUpperCase() === 'NAMA MITRA'));
    if (hi < 0) hi = 1;
    const H = (all[hi] || []).map(h => trim(String(h || '').replace(/[\u00a0\s]+/g, ' ')).toUpperCase());
    const ix = (...n) => { for (const x of n) { const i = H.indexOf(x); if (i >= 0) return i; } for (const x of n) { const i = H.findIndex(h => h.startsWith(x)); if (i >= 0) return i; } return -1; };
    const cM = ix('NAMA MITRA'), cR = ix('REGIONAL'), cT = ix('TARGET BULANAN', 'TARGET OKTOBER', 'TARGET OKT', 'TARGET BULAN'), cH = ix('HC UPDATE'), cD = ix('TARGET DAILY'), cA = ix('HP AKTUAL'), cF = ix('HP RFS');
    const dayCols = [];
    H.forEach((h, i) => { if (/^\d{1,2}\s*[-\/]\s*[A-Z]{3,9}(\s*[-\/]?\s*\d{2,4})?$/.test(h)) dayCols.push({ label: trim(all[hi][i]), idx: i }); });
    const rows = [];
    for (let i = hi + 1; i < all.length; i++) {
      const row = all[i] || [];
      const name = trim(row[cM >= 0 ? cM : 2]);
      if (!name || name.toUpperCase() === 'TOTAL') continue;
      rows.push({
        mitra: name, regional: trim(row[cR >= 0 ? cR : 1]),
        target: Math.round(thcNum(row[cT >= 0 ? cT : 12])), targetDaily: Math.round(thcNum(row[cD >= 0 ? cD : 11])),
        hc: Math.round(thcNum(row[cH >= 0 ? cH : 15])), hpAktual: Math.round(thcNum(row[cA >= 0 ? cA : 6])), hpRfs: Math.round(thcNum(row[cF >= 0 ? cF : 7])),
        days: dayCols.map(d => ({ label: d.label, raw: trim(row[d.idx]), val: Math.round(thcNum(row[d.idx])) }))
      });
    }
    return { rows, dayLabels: dayCols.map(d => d.label) };
  }
  async function loadDaily() {
    const all = parseCSV(await fetchText(CFG.DAILY));
    const H = (all[0] || []).map(h => trim(h).toLowerCase());
    const ix = n => H.indexOf(n);
    const cD = ix('active_date'), cM = ix('mitra'), cS = ix('station'), cA = ix('total_activation');
    const rows = []; let maxTs = 0;
    all.slice(1).forEach(row => {
      const dt = parseDate(row[cD]); const mitra = trim(row[cM]);
      if (!dt || !mitra) return;
      const ts = dt.getTime(); if (ts > maxTs) maxTs = ts;
      rows.push({ ts, day: isoDay(dt), mitra, station: trim(row[cS]) || '-', act: parseInt(trim(row[cA]), 10) || 0 });
    });
    return { rows, maxTs };
  }

  /* ---------------- SPK, BA DRM, Document Control ---------------- */
  function spkStatus(u) {
    const s = trim(u).toUpperCase();
    if (s.includes('CANCEL SEBAGIAN')) return 'sebagian';
    if (s.includes('CANCEL') || s.includes('BATAL')) return 'cancel';
    if (s.includes('HOLD')) return 'hold';
    if (s.includes('DONE')) return 'done';
    if (s.includes('BELUM ROUTING')) return 'belum';
    if (s.includes('ROUTING')) return 'routing';
    return 'lain';
  }
  async function loadSpk() {
    const all = parseCSV(await fetchText(CFG.SPK));
    let hi = all.findIndex(row => row.some(c => trim(c).toUpperCase() === 'NO SPK'));
    if (hi < 0) hi = 1;
    const H = (all[hi] || []).map(h => trim(h).toUpperCase());
    const ix = (n, fb) => { const i = H.indexOf(n); return i < 0 ? fb : i; };
    const ixm = (ns, fb) => { for (const n of ns) { const i = H.indexOf(n); if (i >= 0) return i; } return fb; };
    const I = { noSpk: ix('NO SPK', 1), update: ix('UPDATE', 2), project: ix('PROJECT', 3), tipe: ix('TIPE SPK', 4), mitra: ix('MITRA YANG MENERIMA SPK', 5), region: ix('REGION/SEGMENT', 6), stasiun: ix('STASIUN', 7), jml: ix('JUMLAH STASIUN', 8), hp: ix('HP PENGAJUAN', 11), create: ix('CREATE DATE', 0), mailing: ix('MAILING DATE', 15), remark: ix('REMARK', 18), link: ixm(['LINK DOKUMEN SPK', 'LINK DOWNLOAD SPK', 'LINK SPK', 'URL SPK', 'URL DOKUMEN SPK', 'DOKUMEN SPK'], -1), dokPo: ix('DOKUMEN PO', 19) };
    const g = (row, i) => i >= 0 ? trim(row[i]) : '';
    const rows = [];
    all.slice(hi + 1).forEach(row => {
      const noSpk = g(row, I.noSpk); if (!noSpk) return;
      const dt = parseDate(g(row, I.create)) || parseDate(g(row, I.mailing));
      const link = g(row, I.link);
      rows.push({ noSpk, update: g(row, I.update), status: spkStatus(g(row, I.update)), project: g(row, I.project), tipe: g(row, I.tipe), mitra: g(row, I.mitra), region: g(row, I.region), stasiun: g(row, I.stasiun), jml: num(g(row, I.jml)), hp: parseFloat(g(row, I.hp).replace(/,/g, '')) || 0, ts: dt ? dt.getTime() : 0, tgl: dt ? fmtDate(dt) : g(row, I.create), remark: g(row, I.remark), link: /^https?:\/\//i.test(link) ? link : '' });
    });
    return { rows };
  }
  async function loadDrm() {
    const all = parseCSV(await fetchText(CFG.DRM));
    let hi = all.findIndex(row => row.some(c => /^NO\.?\s*BA\s*DRM/i.test(trim(c))));
    if (hi < 0) hi = 0;
    const H = (all[hi] || []).map(h => trim(h).toUpperCase().replace(/\s+/g, ' '));
    const ci = (re, fb) => { const i = H.findIndex(h => re.test(h)); return i < 0 ? fb : i; };
    // Column layout mirrors Monitoring SPK - PO.dc.html (stasiun/region/HP/tahap BA DRM at fixed slots).
    const I = { no: ci(/^NO\.? ?BA ?DRM$/, 0), spk: ci(/^NO\.? ?SPK$/, 1), mitra: 2, type: 3, sta: 4, reg: 5, hp: ci(/^HP$/, 6), status: ci(/^BA DRM STATUS$/, 7) };
    I.dPr = ci(/^(TGL|TANGGAL)\.? ?PR\b|^PR (DATE|RELEASE)|^DATE PR|^(TGL|TANGGAL) ?(RELEASE )?PR/, -1); I.dPo = ci(/^(TGL|TANGGAL)\.? ?PO\b|^PO (DATE|RELEASE)|^DATE PO|^(TGL|TANGGAL) ?(RELEASE )?PO/, -1);
    I.pr = ci(/^NO\.? ?PR\b/, 24); I.stPr = ci(/^STATUS PR/, I.pr + 1); I.po = ci(/^NO\.? ?PO\b/, 26);
    const approvalIx = [18, 17, 16, 15, 14, 13, 12, 11, 10];
    const map = {}, rows = [];
    all.slice(hi + 1).forEach(row => {
      const spk = trim(row[I.spk]).toUpperCase().replace(/\s+/g, ''); if (!spk) return;
      const status = trim(row[I.status]);
      let signed = '';
      for (const ai of approvalIx) { const v = trim(row[ai]); if (v && v !== '/') { signed = v; break; } }
      const noBa = trim(row[I.no]), lst = map[spk] = map[spk] || [];
      if (!(noBa && lst.some(x => x.no === noBa))) lst.push({ no: noBa, hp: num(row[I.hp]), status, signed: /full\s*signed/i.test(status), lastDate: signed });
      const ty = trim(row[I.type]).toUpperCase().replace(/\s+/g, ' ');
      if (!ty || (!trim(row[I.no]) && !trim(row[I.sta]))) return;
      const pr = trim(row[I.pr]), po = trim(row[I.po]);
      rows.push({ spk, noSpk: trim(row[I.spk]), type: ty.replace(/[^A-Z]/g, '') === 'INNERCITY' ? 'INNER CITY' : ty, mitra: trim(row[I.mitra]), station: trim(row[I.sta]), region: trim(row[I.reg]).toUpperCase(),
        hp: parseInt(String(row[I.hp] || '').replace(/[^0-9]/g, ''), 10) || 0, baSt: status, baNo: trim(row[I.no]), pr: /^PR[\/.]/i.test(pr) ? pr : '', stPr: trim(row[I.stPr]), po: /^PO[\/.]/i.test(po) ? po : '', baDate: signed, prDate: I.dPr >= 0 ? trim(row[I.dPr]) : '', poDate: I.dPo >= 0 ? trim(row[I.dPo]) : '' });
    });
    return { map, rows };
  }
  const DOC_FIELDS = [
    { idx: 20, label: 'Scan PO' }, { idx: 21, label: 'Foto Dokumentasi' }, { idx: 22, label: 'BA Rekonsil' },
    { idx: 23, label: 'Summary Asset' }, { idx: 24, label: 'OPM' }, { idx: 25, label: 'OTDR' },
    { idx: 26, label: 'APD' }, { idx: 27, label: 'ABD' }, { idx: 28, label: 'Maincore' }, { idx: 29, label: 'Corecone' },
    { idx: 30, label: 'KMZ Aktual' }, { idx: 31, label: 'Redline' }, { idx: 32, label: 'Balap Add On' }, { idx: 53, label: 'BA Stock Opname' }, { idx: 33, label: 'Dokumen ATP' }
  ];
  async function loadDoc() {
    const all = parseCSV(await fetchText(CFG.DOC));
    let hi = all.findIndex(row => row.some(c => trim(c).toUpperCase() === 'NO PO'));
    if (hi < 0) hi = 0;
    const g = (row, i) => trim(row[i]);
    const empty = v => !v || /^0+[-\/]0+[-\/]0*$/.test(v);
    const rows = [];
    all.slice(hi + 1).forEach(row => {
      const noPo = g(row, 1); if (!noPo) return;
      const mitra = g(row, 3) || g(row, 4); if (!mitra) return;
      const kel = g(row, 34);
      const complete = kel.toUpperCase() === 'COMPLETED';
      rows.push({
        noPo, mitra, mitraUpd: g(row, 4), payment: g(row, 0), regional: g(row, 5), stasiun: g(row, 6), statusPoFtth: g(row, 7), statusPoVm: g(row, 8),
        hpPo: g(row, 9), submitAtp: g(row, 10), cekHp: g(row, 11), batch: g(row, 12), kelengkapan: kel, complete,
        atpStatus: g(row, 35), atpDate: g(row, 36), link: g(row, 44), milestone: g(row, 45), remarkDate: g(row, 48), remark: g(row, 49),
        checklist: DOC_FIELDS.map(f => { const v = g(row, f.idx); const present = complete || !empty(v); return { label: f.label, present, date: present && !empty(v) ? v : '' }; })
      });
    });
    return { rows };
  }

  /* ---------------- Progress Take Over (sumber kartu "Progress Take Over Mitra & Direktori Dokumen") ---------------- */
  // CSV hanya memuat teks sel; URL hyperlink (kolom attachment) diambil dari versi HTML sheet yang sama.
  async function loadToLinks() {
    if (_cacheOnly) return {};
    try {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const tm = setTimeout(() => { if (ac) ac.abort(); }, 20000);
      const res = await fetch(CFG.TO.split('/pub?')[0] + '/pubhtml/sheet?headers=false&gid=' + ((CFG.TO.match(/gid=(\d+)/) || [])[1] || '0') + '&_cb=' + Date.now(), { cache: 'no-store', signal: ac ? ac.signal : undefined });
      clearTimeout(tm);
      if (!res.ok) return {};
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const out = {}; let n = 0;
      doc.querySelectorAll('table tbody tr').forEach(tr => {
        if (tr.querySelector('.freezebar-cell')) return;
        const th = tr.querySelector('th'); n++;
        const num = th && /^\d+$/.test(th.textContent.trim()) ? parseInt(th.textContent.trim(), 10) : n;
        const cells = {};
        Array.from(tr.querySelectorAll('td')).forEach((td, ci) => {
          const a = td.querySelector('a[href]'); if (!a) return;
          let h = a.getAttribute('href') || '';
          const q = h.match(/[?&]q=([^&]+)/); if (/google\.com\/url/.test(h) && q) { try { h = decodeURIComponent(q[1]); } catch (e) { h = q[1]; } }
          if (/^https?:\/\//i.test(h)) cells[ci] = h;
        });
        out[num - 1] = cells;
        if (num === 1) out.hdr = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().toUpperCase().replace(/\s+/g, ' '));
      });
      return out;
    } catch (e) { console.warn('Link dokumen take over gagal dimuat', e); return {}; }
  }
  async function loadTo() {
    const [csvText, LK] = await Promise.all([fetchText(CFG.TO), loadToLinks()]);
    const all = parseCSV(csvText);
    const H = (all[0] || []).map(h => trim(h).toUpperCase().replace(/\s+/g, ' '));
    const iz = n => H.indexOf(n.toUpperCase());
    const fz = (...ws) => H.findIndex(h => ws.every(w => h.includes(w)));
    const first = (...c) => { for (const x of c) if (x >= 0) return x; return -1; };
    const I = { po: iz('PO'), sta: iz('STASIUN'), lama: iz('MITRA LAMA'), pt: iz('NAMA PERUSAHAAN'), ganti: iz('MITRA PENGGANTI'), reg: iz('REGION'), pic: iz('PIC'), sp: iz('STATUS SP'), stat: iz('STATUS MITRA'),
      noBap: iz('NO BAP PO CANCEL'), kBap: iz('BAP PO CANCEL'), lMat: iz('BA SERAH TERIMA MATERIAL'), mIkr: iz('BA PERPINDAHAN AKUN IKR'),
      lBatal: first(iz('LINK ATTACHMEN BA PEMBATALAN PO'), fz('ATTACH', 'PEMBATALAN'), 15), lSpk: first(iz('LINK ATTACHMENT SPK'), fz('ATTACH', 'SPK'), 16),
      lBap: first(iz('LINK ATTACHMENT BAP PO CANCEL'), fz('ATTACH', 'BAP'), 18), lMat2: first(iz('LINK ATTACHMENT BA SERAH TERIMA MATERIAL'), fz('ATTACH', 'MATERIAL'), 19),
      lIkr: first(iz('LINK ATTACHMENT PERPINDAHAN IKR'), fz('ATTACH', 'IKR'), 20), tglSpk: iz('TANGGAL RILIS SPK'), mig: iz('STATUS MIGRASI IKR'), ptGanti: iz('PT MITRA PENGGANTI'), remark: iz('REMARK') };
    if (I.ganti < 0) throw new Error('Kolom MITRA PENGGANTI tidak ditemukan');
    const g = (row, i) => i >= 0 ? trim(row[i]) : '';
    const bare = s => String(s || '').toUpperCase().replace(/\bPT\.?\b/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    const cancelled = v => /cancel\s*take\s*over|batal\s*take\s*over|tidak\s*jadi/i.test(v || '');
    const rows = [];
    all.slice(1).forEach((row, ri) => {
      if (!row.some(c => c && String(c).trim())) return;
      const lk = LK[ri + 1] || {};
      const hcol = i => { const hh = LK.hdr || []; const j = i >= 0 ? hh.indexOf(H[i]) : -1; return j >= 0 ? j : i; };
      const ganti = g(row, I.ganti); if (!ganti) return;
      const lama = g(row, I.lama), ptLama = g(row, I.pt), ptGanti = g(row, I.ptGanti);
      const gk = bare(ganti);
      if (gk && (gk === bare(lama) || gk === bare(ptLama))) return;
      const o = { po: g(row, I.po), stasiun: g(row, I.sta), lama: lama || ptLama, ptLama, pengganti: ganti, ptGanti, region: g(row, I.reg), pic: g(row, I.pic), sp: g(row, I.sp), statusMitra: g(row, I.stat),
        noBap: g(row, I.noBap), kBap: g(row, I.kBap), lMat: g(row, I.lMat), mIkr: g(row, I.mIkr), migrasi: g(row, I.mig), tglSpk: g(row, I.tglSpk), remark: g(row, I.remark),
        docs: [['BA Pembatalan PO', g(row, I.lBatal)], ['SPK', g(row, I.lSpk)], ['BAP PO Cancel', g(row, I.lBap)], ['BA Serah Terima Material', g(row, I.lMat2)], ['BA Perpindahan IKR', g(row, I.lIkr)]].map((d, di) => ({ label: d[0], raw: d[1], link: lk[hcol([I.lBatal, I.lSpk, I.lBap, I.lMat2, I.lIkr][di])] || '' })) };
      if (cancelled(o.kBap) || cancelled(o.lMat) || cancelled(o.mIkr) || cancelled(o.statusMitra)) return;
      rows.push(o);
    });
    return { rows };
  }

  /* ---------------- PIN ---------------- */
  let _pinP = null, _pinT = 0;
  function loadPins(force) {
    if (!CFG.PIN) return Promise.resolve({ configured: false, map: {} });
    if (!force && _pinP && Date.now() - _pinT < 120000) return _pinP;
    _pinT = Date.now();
    _pinP = fetchText(CFG.PIN).then(t => {
      const all = parseCSV(t);
      let hi = all.findIndex(r => r.some(c => /^(NAMA )?MITRA$/i.test(trim(c))) && r.some(c => /^PIN$/i.test(trim(c))));
      if (hi < 0) throw new Error('Kolom MITRA dan PIN tidak ditemukan di sheet PIN');
      const H = all[hi].map(h => trim(h).toUpperCase());
      const cM = H.findIndex(h => h === 'MITRA' || h === 'NAMA MITRA'), cP = H.indexOf('PIN');
      const map = {}, people = {};
      const cO = H.findIndex(h => /DIREKSI|OWNER/.test(h)), cPm = H.findIndex(h => /^(NAMA )?PM$|PROJECT MANAGER|^PIC/.test(h));
      const split = v => String(v || '').split(/[;\n\/|]+|\s*,\s*/).map(trim).filter(Boolean);
      all.slice(hi + 1).forEach(r => { const m = normName(r[cM]); const p = trim(r[cP]); if (m && p) (map[m] = map[m] || []).push(p); if (m) { const z = people[m] = people[m] || { owners: [], pms: [] }; if (cO >= 0) split(r[cO]).forEach(n => { if (z.owners.indexOf(n) < 0) z.owners.push(n); }); if (cPm >= 0) split(r[cPm]).forEach(n => { if (z.pms.indexOf(n) < 0) z.pms.push(n); }); } });
      return { configured: true, map, people };
    }).catch(e => { _pinP = null; throw e; });
    return _pinP;
  }
  async function peopleOf(mitra) { try { const P = await loadPins(); return (P.people && P.people[normName(mitra)]) || { owners: [], pms: [] }; } catch (e) { return { owners: [], pms: [] }; } }
  async function verifyPin(mitra, pin) {
    pin = trim(pin);
    if (!pin) return { ok: false, reason: 'Password wajib diisi.' };
    if (pin === 'VMIJE123') return { ok: true, superUser: true };
    const P = await loadPins();
    if (!P.configured) return pin === CFG.DEFAULT_PIN ? { ok: true } : { ok: false, reason: 'Password salah.' };
    const list = P.map[normName(mitra)];
    if (!list || !list.length) return { ok: false, reason: 'Password untuk mitra ini belum terdaftar. Hubungi Vendor Management.' };
    return list.indexOf(pin) >= 0 ? { ok: true } : { ok: false, reason: 'Password salah.' };
  }

  /* ---------------- Load semua sumber ---------------- */
  const SOURCES = [
    { k: 'main', label: 'Tracker FTTH', fn: () => loadMain() },
    { k: 'doc', label: 'Document Control', fn: loadDoc },
    { k: 'spk', label: 'Tracker SPK', fn: loadSpk },
    { k: 'drm', label: 'BA DRM', fn: loadDrm },
    { k: 'hc', label: 'HC CRM', fn: loadHc },
    { k: 'thc', label: 'Target HC', fn: loadThc },
    { k: 'daily', label: 'Aktivasi harian', fn: loadDaily },
    { k: 'to', label: 'Progress Take Over', fn: loadTo }
  ];
  // onPartial(D) fires each time a source lands once the tracker is available, so the UI can
  // render progressively instead of waiting for the slowest sheet.
  async function loadAll(onProgress, force, onPartial) {
    if (force) _mainP = null;
    if (!force && onPartial && typeof indexedDB !== 'undefined') {
      try {
        _cacheOnly = true; _mainP = null;
        const c = {}, D1 = { src: {}, at: Date.now() };
        await Promise.all(SOURCES.map(s => Promise.resolve().then(s.fn).then(v => { D1[s.k] = v; D1.src[s.k] = { ok: true, label: s.label }; c[s.k] = 1; }, () => {})));
        if (D1.main && SOURCES.every(s => c[s.k])) { try { onPartial(Object.assign({}, D1)); } catch (e) { console.warn('[AMS] render cache gagal', e); } }
      } catch (e) { /* abaikan */ } finally { _cacheOnly = false; _mainP = null; }
    }
    const src = {};
    const D = { src, at: Date.now() };
    const partial = () => { if (onPartial && D.main) { try { onPartial(Object.assign({}, D)); } catch (e) { console.warn('[AMS] partial render gagal', e); } } };
    const pending = [];
    await Promise.all(SOURCES.map(s => Promise.resolve().then(s.fn).then(v => {
      D[s.k] = v; src[s.k] = { ok: true, label: s.label }; if (onProgress) onProgress(s.k, true); partial();
      if (s.k === 'main' && v && v.upgrade) pending.push(v.upgrade.then(m2 => { if (m2) { D.main = m2; partial(); } }));
    }, e => {
      D[s.k] = null; src[s.k] = { ok: false, label: s.label, error: errMsg(e) }; if (onProgress) onProgress(s.k, false); console.warn('[AMS] ' + s.label + ' gagal:', e);
    })));
    await Promise.all(pending);
    if (!D.main) throw new Error(src.main.error || 'Tracker FTTH gagal dimuat');
    D.at = Date.now();
    return D;
  }

  /* ---------------- Model per mitra ---------------- */
  const STAGES = ['Rilis PO', 'Persiapan', 'Material', 'Implementasi', 'Done Imple', 'RFS', 'ATP', 'Dokumen'];
  function docSummary(list) {
    const total = DOC_FIELDS.length;
    if (!list.length) return { has: false, state: 'none', label: 'Belum tercatat', present: 0, total, missing: [], checklist: DOC_FIELDS.map(f => ({ label: f.label, present: false, date: '' })), atpStatus: '', milestone: '', payment: '', link: '', remark: '', remarkDate: '', kelengkapan: '', submitAtp: '', batch: '' };
    const f0 = list[0];
    const checklist = DOC_FIELDS.map((f, j) => {
      const present = list.every(d => d.checklist[j].present);
      const withDate = list.find(d => d.checklist[j].date);
      return { label: f.label, present, date: withDate ? withDate.checklist[j].date : '' };
    });
    const complete = list.every(d => d.complete);
    const atpStatus = (list.find(d => d.atpStatus) || {}).atpStatus || '';
    const rejected = /reject/i.test(atpStatus);
    const present = checklist.filter(c => c.present).length;
    const missing = checklist.filter(c => !c.present).map(c => c.label);
    const state = rejected ? 'rejected' : complete ? 'complete' : 'incomplete';
    const link = (list.find(d => /^https?:\/\//i.test(d.link)) || {}).link || '';
    return {
      has: true, state, present, total, missing, checklist, atpStatus,
      label: state === 'complete' ? 'Lengkap' : state === 'rejected' ? 'Dokumen ATP ditolak' : (missing.length ? missing.length + ' dokumen kurang' : 'Belum lengkap'),
      kelengkapan: (list.find(d => !d.complete) || f0).kelengkapan, milestone: f0.milestone, payment: f0.payment, link,
      remark: (list.find(d => d.remark) || {}).remark || '', remarkDate: (list.find(d => d.remark) || {}).remarkDate || '', submitAtp: f0.submitAtp, batch: f0.batch
    };
  }
  function nextAction(p) {
    const d = p.doc;
    switch (p.stage) {
      case -1: return 'PO dibatalkan / mitra mengundurkan diri.';
      case 1: return 'Selesaikan sosialisasi & perijinan, lalu ajukan kebutuhan material.';
      case 2: return /lengkap/i.test(p.statusMos) && !/belum/i.test(p.statusMos) ? 'Material sudah lengkap. Mulai implementasi.' : 'Status material: ' + (p.statusMos || 'belum diterima') + '. Koordinasikan pengiriman material.';
      case 3: return 'Lanjutkan pembangunan: HP Actual ' + fmt(p.hpActual) + ' dari ' + fmt(p.hpPo) + ' HP PO' + (p.planRfs ? '. Rencana RFS ' + p.planRfs : '') + '.';
      case 4: return 'Pembangunan selesai. Submit Redline/RFS' + (p.statusRfs ? ' (status: ' + p.statusRfs + ')' : '') + '.';
      case 5: return 'Siapkan dan submit dokumen ATP' + (p.planAtp ? ' (rencana ' + p.planAtp + ')' : '') + '.';
      case 6:
      case 7:
        if (!d.has) return 'ATP selesai. Kelengkapan dokumen belum tercatat di Document Control.';
        if (d.state === 'rejected') return 'Dokumen ATP ditolak. Perbaiki lalu kirim ulang.';
        if (d.state === 'incomplete') return 'Lengkapi ' + d.missing.length + ' dokumen: ' + d.missing.slice(0, 3).join(', ') + (d.missing.length > 3 ? ', dll.' : '.');
        return 'Selesai: ATP dan dokumen lengkap.';
      default: return '';
    }
  }

  function buildModel(D, mitra) {
    const C = D.main.C, mk = normName(mitra);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const T0 = today.getTime(), DAY = 86400000;
    const meta = rowMeta(D.main);
    const _mx = new Map();
    const isMe = n => { if (!n) return false; let v = _mx.get(n); if (v === undefined) { v = normName(n) === mk || sameMitra(n, mitra); _mx.set(n, v); } return v; };
    const rows = [], toInRows = [];
    D.main.rows.forEach((r, i) => {
      const mt = meta[i];
      if (mt.to) { if (isMe(mt.impl)) rows.push(r); else if (isMe(mt.upd)) toInRows.push(r); }
      else if (normName(r[C.mitra]) === mk) rows.push(r);
    });
    const metaOf = new Map(); D.main.rows.forEach((r, i) => metaOf.set(r, meta[i]));
    const docBy = {};
    ((D.doc && D.doc.rows) || []).forEach(d => { const k = normPo(d.noPo); (docBy[k] = docBy[k] || []).push(d); });

    const mkPo = (r, i, pfx) => {
      const nopo = trim(r[C.nopo]), st = trim(r[C.statusMain]), stl = st.toLowerCase();
      const cancelled = /^(dibatalkan|mengundurkan\s*diri)$/i.test(st);
      const statusRfs = trim(r[C.statusRfs]);
      let stage;
      if (cancelled) stage = -1;
      else if (stl === 'atp') stage = 6;
      else if (stl === 'redline') stage = 5;
      else if (stl.includes('done') && stl.includes('imple')) stage = 4;
      else if (stl.includes('implementasi')) stage = 3;
      else if (stl.includes('material')) stage = 2;
      else stage = 1;
      const tgl = parseDate(r[C.tglrilis]), planRfs = parseDate(r[C.planRfs]), planAtp = parseDate(r[C.planAtp]), atpAct = parseDate(r[C.atpActual]), mosDate = parseDate(r[C.mosDate]);
      const doc = docSummary(nopo ? (docBy[normPo(nopo)] || []) : []);
      if (stage === 6 && doc.state === 'complete') stage = 7;
      const mtx = metaOf.get(r) || {};
      const p = {
        isTo: !!mtx.to, impl: mtx.impl || '', upd: mtx.upd || '',
        id: pfx + i, nopo: nopo || '-', poItem: trim(r[C.poitem]), tipePo: trim(C.tipePo >= 0 ? r[C.tipePo] : r[C.poitem]), stasiun: trim(r[C.stasiun]) || '-', kota: C.kota >= 0 ? trim(r[C.kota]) : '', regional: C.reg >= 0 ? trim(r[C.reg]) : '',
        src: r.__src || 'FTTH', status: st || 'Belum ada status', stage, cancelled,
        hpPo: num(r[C.hpPo]), hpActual: num(r[C.hpActual]), hpBasis: ((stl === 'atp' || stl === 'redline' || stl.includes('batal') || (stl.includes('done') && stl.includes('imple') && !/done/i.test(statusRfs))) ? num(r[C.hpActual]) : num(r[C.hpPo])), statusRfs, rfsDone: /done/i.test(statusRfs) || stl === 'atp', atpDone: stl === 'atp',
        statusMos: trim(r[C.statusMos]), mosDate: fmtDate(mosDate), donasi: num(r[C.donasi]), dp: poToNum(r[C.nominalDp]), bast: poToNum(r[C.nominalBast]), rollStart: fmtDate(parseDate(r[C.rollout])) || trim(r[C.rollout]), rollEnd: fmtDate(parseDate(r[C.rolloutEnd])) || trim(r[C.rolloutEnd]),
        tglRilis: fmtDate(tgl) || trim(r[C.tglrilis]), tglTs: tgl ? tgl.getTime() : 0,
        planRfs: fmtDate(planRfs), planRfsTs: planRfs ? planRfs.getTime() : 0, planAtp: fmtDate(planAtp), atpActual: fmtDate(atpAct),
        issue: C.issue >= 0 ? trim(r[C.issue]).replace(/^-$/, '') : '', detailIssue: trim(r[C.detailIssue]), remark: trim(r[C.remark]),
        pic: trim(r[C.pic]), telp: trim(r[C.telp]), otb: trim(r[C.otb]), odc: trim(r[C.odc]), odp: trim(r[C.odp]), doc
      };
      { const a0 = parseDate(r[C.rollout]), a1 = parseDate(r[C.rolloutEnd]); p.implDays = (stage >= 4 && !cancelled && a0) ? Math.max(0, Math.floor(((a1 || new Date(T0)).getTime() - a0.getTime()) / DAY)) : null; p.implDone = !!a1; }
      p.agingDays = p.tglTs && stage >= 1 && stage <= 3 ? Math.max(0, Math.floor((T0 - p.tglTs) / DAY)) : 0;
      p.flags = {
        overdue: stage >= 1 && stage <= 4 && p.planRfsTs > 0 && p.planRfsTs < T0,
        aging: p.agingDays > 180,
        material: stage === 2 && !(/lengkap/i.test(p.statusMos) && !/belum/i.test(p.statusMos)),
        belumrfs: stage === 4,
        rejected: stage >= 5 && doc.state === 'rejected',
        docmissing: stage >= 5 && doc.has && doc.state === 'incomplete',
        issue: !!p.issue && !cancelled && stage < 6
      };
      p.next = nextAction(p);
      return p;
    };
    const pos = rows.map((r, i) => mkPo(r, i, 'p'));
    const toInPos = toInRows.map((r, i) => { const p = mkPo(r, i, 't'); p.isTo = true; p.inbound = true; return p; });
    const active = pos.filter(p => !p.cancelled);

    const staMap = {};
    active.forEach(p => {
      const s = staMap[p.stasiun] = staMap[p.stasiun] || { name: p.stasiun, regional: p.regional, kota: p.kota, poIds: [], hpBasis: 0, hpPo: 0, hpActual: 0, hpRfs: 0, hpAtp: 0, issues: 0, stages: {} };
      s.poIds.push(p.id); s.hpPo += p.hpPo; s.hpActual += p.hpActual; s.hpBasis += p.hpBasis;
      if (p.rfsDone) s.hpRfs += p.hpActual;
      if (p.atpDone || p.stage === 7) s.hpAtp += p.hpActual;
      if (p.flags.issue) s.issues++;
      s.stages[p.stage] = (s.stages[p.stage] || 0) + 1;
      if (!s.regional && p.regional) s.regional = p.regional;
      if (!s.kota && p.kota) s.kota = p.kota;
    });
    toInRows.forEach(r => { const n = trim(r[C.stasiun]) || '-'; if (!staMap[n]) staMap[n] = { name: n, regional: C.reg >= 0 ? trim(r[C.reg]) : '', kota: C.kota >= 0 ? trim(r[C.kota]) : '', poIds: [], hpBasis: 0, hpPo: 0, hpActual: 0, hpRfs: 0, hpAtp: 0, issues: 0, stages: {}, toOnly: true, toCount: 0 };
      const z = staMap[n]; if (!z.toOnly) return; const sl = trim(r[C.statusMain]).toLowerCase(); if (/^(dibatalkan|mengundurkan\s*diri)$/.test(sl)) return; const ha = num(r[C.hpActual]), hpp = num(r[C.hpPo]), rfl = trim(r[C.statusRfs]); z.toCount++; z.hpPo += hpp; z.hpBasis += ((sl === 'atp' || sl === 'redline' || sl.includes('batal') || (sl.includes('done') && sl.includes('imple') && !/done/i.test(rfl))) ? ha : hpp); z.hpActual += ha; if (/done/i.test(trim(r[C.statusRfs]))) z.hpRfs += ha; if (sl === 'atp') z.hpAtp += ha; });
    const stationNames = Object.keys(staMap);

    let hc = { found: false, hcName: '', confidence: '', aktif: 0, isolir: 0, dismantle: 0, nonAktif: 0, total: 0, base: 0, unassigned: [], updatedLabel: D.hc ? D.hc.updatedLabel : '' };
    const zero = () => ({ aktif: 0, isolir: 0, dismantle: 0, nonAktif: 0, total: 0, base: 0, labels: [] });
    stationNames.forEach(n => { staMap[n].hc = zero(); });
    if (D.hc) {
      const match = findHcMitra(D.hc, D.main, mitra);
      if (match && match.entry) {
        const e = match.entry;
        const asg = assignHcStations(e, stationNames);
        stationNames.forEach(n => {
          const z = staMap[n].hc;
          asg.by[n].forEach(h => { z.aktif += h.aktif; z.isolir += h.isolir; z.dismantle += h.dismantle; z.nonAktif += h.nonAktif; z.total += h.total; z.labels.push(h.label); });
          z.base = z.aktif + z.isolir + z.dismantle;
        });
        hc = Object.assign(hc, { found: true, hcName: e.name, confidence: match.confidence, aktif: e.aktif, isolir: e.isolir, dismantle: e.dismantle, siap: e.siap, sedang: e.sedang, nonAktif: e.nonAktif, total: e.total, base: e.aktif + e.isolir + e.dismantle,
          unassigned: asg.unassigned.map(h => ({ label: h.label, kabupaten: h.kabupaten, aktif: h.aktif, isolir: h.isolir, dismantle: h.dismantle, nonAktif: h.nonAktif, total: h.total, base: h.aktif + h.isolir + h.dismantle })).sort((a, b) => b.total - a.total) });
      }
    }
    hc.isolirRate = pct(hc.isolir, hc.aktif + hc.isolir);
    hc.churnRate = pct(hc.nonAktif, hc.total);

    const stations = stationNames.map(n => {
      const s = staMap[n];
      const h = s.hc;
      const isolirRate = pct(h.isolir, h.aktif + h.isolir), churnRate = pct(h.nonAktif, h.total);
      const potensi = Math.max(0, s.hpRfs - h.base);
      // Retention risk weighs what is still recoverable: isolir first, then devices in pull-out
      // (dismantle); historical churn only nudges the score.
      let risk = 0;
      const dismShare = pct(h.dismantle, h.base);
      if (h.aktif + h.isolir >= 10) { if (isolirRate >= 15) risk += 3; else if (isolirRate >= 8) risk += 2; else if (isolirRate >= 5) risk += 1; }
      if (h.base >= 10) { if (dismShare >= 25) risk += 2; else if (dismShare >= 10) risk += 1; }
      if (h.total >= 10 && churnRate >= 35) risk += 1;
      return {
        name: n, toOnly: !!s.toOnly, regional: s.regional, kota: s.kota, poIds: s.poIds, poCount: s.poIds.length + (s.toCount || 0), hpBasis: (s.hpBasis > s.hpPo && s.hpActual <= s.hpPo) ? s.hpPo : s.hpBasis, hpPo: s.hpPo, hpActual: s.hpActual, hpRfs: s.hpRfs, hpAtp: s.hpAtp,
        notYetRfs: Math.max(0, s.hpActual - s.hpRfs), notYetAtp: Math.max(0, s.hpRfs - s.hpAtp), realPct: pct(s.hpActual, s.hpPo), rfsPct: pct(s.hpRfs, s.hpPo), atpPct: pct(s.hpAtp, s.hpPo),
        issues: s.issues, stages: s.stages, hc: h, isolirRate, churnRate, potensi, risk, penetrasi: pct(h.base, s.hpRfs || s.hpActual)
      };
    }).sort((a, b) => b.hpPo - a.hpPo);

    // Target HC bulanan
    let thc = { found: false };
    if (D.thc) {
      const tr = D.thc.rows.filter(r => sameMitra(r.mitra, mitra));
      if (tr.length) {
        const days = (D.thc.dayLabels || []).map((label, i) => {
          let v = 0, filled = false;
          tr.forEach(r => { const d = r.days[i]; if (d) { v += d.val; if (d.raw !== '') filled = true; } });
          return { label, val: v, filled };
        });
        const target = tr.reduce((a, r) => a + r.target, 0), hcNow = tr.reduce((a, r) => a + r.hc, 0), targetDaily = tr.reduce((a, r) => a + r.targetDaily, 0);
        let mon = -1;
        const lab = days.length ? days[0].label : '';
        const mm = lab.match(/-([A-Za-z]+)$/); if (mm) mon = monIdx(mm[1]);
        if (mon < 0) mon = today.getMonth();
        let year = today.getFullYear(); if (mon > today.getMonth() + 1) year--;
        const dim = new Date(year, mon + 1, 0).getDate();
        const isCur = year === today.getFullYear() && mon === today.getMonth();
        const isPast = year < today.getFullYear() || (year === today.getFullYear() && mon < today.getMonth());
        const elapsed = isCur ? today.getDate() : isPast ? dim : 0;
        const expected = target > 0 ? Math.round(target * Math.min(elapsed, dim) / dim) : 0;
        const remain = Math.max(0, dim - elapsed);
        const gap = Math.max(0, target - hcNow);
        const pace = expected > 0 ? hcNow / expected : 1;
        thc = { found: true, target, hc: hcNow, targetDaily, gap, pct: pct(hcNow, target), expected, elapsed, dim, remain, needPerDay: remain > 0 ? Math.ceil(gap / remain) : gap, monthLabel: MON_LONG[mon] + ' ' + year, pace,
          status: target <= 0 ? 'none' : hcNow >= target ? 'done' : pace >= 1 ? 'ontrack' : pace >= 0.85 ? 'slight' : 'behind',
          days: days.filter((d, i) => { const n = parseInt(d.label, 10); return (isFinite(n) ? n : i + 1) <= elapsed; }).map(d => ({ label: d.label, val: d.val })) };
      }
    }

    // Aktivasi harian (60 hari)
    let daily = { found: false };
    if (D.daily && D.daily.rows.length) {
      const mine = D.daily.rows.filter(r => sameMitra(r.mitra, mitra));
      if (mine.length) {
        const end = D.daily.maxTs, start = end - 59 * DAY;
        const byDay = {}, bySta = {};
        mine.forEach(r => {
          if (r.ts < start || r.ts > end) return;
          byDay[r.day] = (byDay[r.day] || 0) + r.act;
          if (r.ts > end - 30 * DAY) bySta[r.station] = (bySta[r.station] || 0) + r.act;
        });
        const bars = [];
        for (let t = start; t <= end + 3600000; t += DAY) { const dt = new Date(t); dt.setHours(0, 0, 0, 0); const k = isoDay(dt); if (bars.length && bars[bars.length - 1].day === k) continue; bars.push({ day: k, label: dt.getDate() + ' ' + MON_SHORT[dt.getMonth()], v: byDay[k] || 0, dow: dt.getDay() }); }
        const hDays = bars.slice(-14), hSet = {}; hDays.forEach(b => { hSet[b.day] = 1; });
        const sd = {}; mine.forEach(r => { if (!hSet[r.day]) return; const o = sd[r.station] || (sd[r.station] = {}); o[r.day] = (o[r.day] || 0) + r.act; });
        const bsd = {}; mine.forEach(r => { if (r.ts < start || r.ts > end) return; const o = bsd[r.station] || (bsd[r.station] = {}); o[r.day] = (o[r.day] || 0) + r.act; });
        const heatRows = Object.keys(sd).map(s => { const vals = hDays.map(b => sd[s][b.day] || 0); return { station: s, vals, total: vals.reduce((a, x) => a + x, 0) }; }).sort((a, b) => b.total - a.total);
        if (heatRows.length > 12) { const rest = heatRows.slice(12), vals = hDays.map((b, i) => rest.reduce((s, r) => s + r.vals[i], 0)); heatRows.length = 12; heatRows.push({ station: 'Stasiun lainnya (' + rest.length + ')', vals, total: vals.reduce((a, x) => a + x, 0) }); }
        const last = bars.slice(-7).reduce((a, b) => a + b.v, 0), prev = bars.slice(-14, -7).reduce((a, b) => a + b.v, 0);
        daily = { found: true, staDay: bsd, days: bars.map(b => ({ day: b.day, label: b.label })), heat: { days: hDays.map(b => ({ day: b.day, label: b.label, dow: b.dow })), rows: heatRows }, bars, total: bars.reduce((a, b) => a + b.v, 0), last7: last, prev7: prev, avg: Math.round(bars.reduce((a, b) => a + b.v, 0) / Math.max(1, bars.length) * 10) / 10,
          endLabel: fmtDate(new Date(end)), byStation: Object.entries(bySta).map(([station, v]) => ({ station, v })).sort((a, b) => b.v - a.v).slice(0, 12) };
      }
    }

    // SPK + BA DRM
    const spk = ((D.spk && D.spk.rows) || []).filter(r => sameMitra(r.mitra, mitra)).map((r, i) => {
      const drmList = (D.drm && D.drm.map[r.noSpk.toUpperCase().replace(/\s+/g, '')]) || [];
      const signed = drmList.filter(x => x.signed);
      const proc = drmList.filter(x => !x.signed);
      const drm = signed.length ? { state: 'signed', label: 'Full Signed', hp: signed.reduce((a, x) => a + x.hp, 0), no: signed.map(x => x.no).filter(Boolean).join(', '), date: signed[0].lastDate || '' }
        : proc.length ? { state: 'proses', label: proc[proc.length - 1].status || 'Proses', hp: proc.reduce((a, x) => a + x.hp, 0), no: proc.map(x => x.no).filter(Boolean).join(', '), date: proc[proc.length - 1].lastDate || '' }
        : { state: 'none', label: 'Belum ada BA DRM', hp: 0, no: '', date: '' };
      return Object.assign({ id: 's' + i }, r, { drm });
    }).sort((a, b) => b.ts - a.ts);

    // Monitoring SPK - PO: per SPK, stasiun BA DRM dengan alur SPK -> BA DRM -> PR -> PO, dikelompokkan per project.
    const spkKeyOf = s => trim(s).toUpperCase().replace(/\s+/g, '');
    const SPK_STAT_LABEL = { routing: 'Routing', belum: 'Belum routing', hold: 'Hold', cancel: 'Dibatalkan', sebagian: 'Batal sebagian' };
    const spkBy = {}, grp = {};
    spk.forEach(s => { spkBy[spkKeyOf(s.noSpk)] = s; });
    ((D.drm && D.drm.rows) || []).forEach(r => {
      if (!r.spk || !(spkBy[r.spk] || sameMitra(r.mitra, mitra))) return;
      const g = grp[r.spk] || (grp[r.spk] = { key: r.spk, noSpk: r.noSpk, type: r.type, rows: [] });
      if (!g.type && r.type) g.type = r.type;
      // Hilangkan duplikat BA DRM dalam satu SPK (nomor BA DRM + stasiun sama); lengkapi isian kosong dari baris ganda.
      const dk = normName(r.station) + '|' + normName(r.baNo), dup = g.rows.find(x => (normName(x.station) + '|' + normName(x.baNo)) === dk);
      if (dup) { ['pr', 'stPr', 'po', 'baSt', 'region', 'baDate', 'prDate', 'poDate'].forEach(f => { if (!dup[f] && r[f]) dup[f] = r[f]; }); dup.hp = Math.max(dup.hp || 0, r.hp || 0); return; }
      g.rows.push(r);
    });
    spk.forEach(s => { const k = spkKeyOf(s.noSpk); const g = grp[k] || (grp[k] = { key: k, noSpk: s.noSpk, type: '', rows: [] }); g.info = s; });
    const projOf = g => { if (g.info && /TAKE\s*OVER/i.test(String(g.info.tipe || '').replace(/\s+/g, ' '))) return 'TAKE OVER'; const t = (g.type || (g.info && (g.info.project || g.info.tipe)) || 'Lainnya').toUpperCase().replace(/\s+/g, ' ').trim(); const k = t.replace(/[^A-Z]/g, ''); return k === 'INNERCITY' ? 'INNER CITY' : /TAKEOVER/.test(k) ? 'TAKE OVER' : /STARLITE|REGULER|REGULAR/.test(k) ? 'REGULER' : (t || 'LAINNYA'); };
    const posBySta = {};
    pos.forEach(p => { if (p.cancelled) return; (posBySta[normName(p.stasiun)] = posBySta[normName(p.stasiun)] || []).push(p); });
    const projMap = {}, monBy = {};
    Object.keys(grp).forEach(k => {
      const g = grp[k], info = g.info || null, hasDrm = g.rows.length > 0;
      const spkOk = hasDrm || (!!info && info.status === 'done');
      const spkVal = spkOk || !info ? 'Terbit' : (SPK_STAT_LABEL[info.status] || info.update || 'Belum');
      const isToSpk = projOf(g) === 'TAKE OVER', showDrm = hasDrm && !isToSpk;
      const stations = showDrm
        ? g.rows.map(r => ({ name: r.station || '-', region: r.region, hp: r.hp, ba: r.baSt, baNo: r.baNo, pr: r.pr, stPr: r.stPr, po: r.po, baDate: r.baDate, prDate: r.prDate, poDate: r.poDate, drm: true }))
        : [{ name: (info && info.stasiun) || '-', region: info ? info.region : '', hp: info ? info.hp : 0, ba: '', baNo: '', pr: '', stPr: '', po: '', drm: false }];
      stations.forEach(x => { const L = posBySta[normName(x.name)] || []; if (!L.length) return; const u = a => a.filter((v, i) => v && a.indexOf(v) === i); x.nPo = L.length; x.hpPo = L.reduce((a, p) => a + (p.hpPo || 0), 0); x.hpAct = L.reduce((a, p) => a + (p.hpActual || 0), 0); const T = L.filter(p => p.isTo); x.impl = u(L.filter(p => !p.isTo).map(p => p.impl)).join(', '); x.lama = u(T.map(p => p.impl)).join(', '); x.pengganti = u(T.map(p => p.upd)).join(', '); });
      stations.sort((a, b) => b.hp - a.hp);
      const it = { key: k, noSpk: info ? info.noSpk : g.noSpk, spkId: info ? info.id : null, project: projOf(g), status: info ? info.status : 'lain', update: info ? info.update : '', tgl: info ? info.tgl : '', ts: info ? info.ts : 0,
        isTo: isToSpk, hasDrm: showDrm, spkOk, spkVal, stations, nSta: showDrm ? stations.length : 0, hp: stations.reduce((a, s) => a + (s.hp || 0), 0), nPr: stations.filter(s => s.pr).length, nPo: stations.filter(s => s.po).length };
      monBy[k] = it;
      (projMap[it.project] = projMap[it.project] || []).push(it);
    });
    const monProjects = Object.keys(projMap).map(name => ({ name, spks: projMap[name].sort((a, b) => b.ts - a.ts || String(a.noSpk).localeCompare(String(b.noSpk))) }))
      .sort((a, b) => (a.name === 'TAKE OVER') - (b.name === 'TAKE OVER') || b.spks.length - a.spks.length || a.name.localeCompare(b.name));

    // Take over: status PO s.d. ATP tetap tanggung jawab mitra implementasi. Take over selesai bila
    // BAP PO Cancel (Done) + BA Serah Terima Material (Done) + BA Perpindahan Akun IKR (Done/No Need).
    // Migrasi HC wajib disertai BA Perpindahan Akun IKR.
    const isDoneV = v => /\bdone\b/i.test(v || ''), isNoNeedV = v => /no\s*need/i.test(v || '');
    const stageOfRow = r => { const s = trim(r[C.statusMain]).toLowerCase(); if (/^(dibatalkan|mengundurkan\s*diri)$/i.test(s)) return -1; if (s === 'atp') return 6; if (s === 'redline') return 5; if (s.includes('done') && s.includes('imple')) return 4; if (s.includes('implementasi')) return 3; if (s.includes('material')) return 2; return 1; };
    const poRowBy = {};
    D.main.rows.forEach(r => { const k = normPo(r[C.nopo]); if (k && !poRowBy[k]) poRowBy[k] = r; });
    const hcAt = (name, sta) => {
      if (!D.hc || !name || !sta) return null;
      const z = { base: 0, aktif: 0, isolir: 0, dismantle: 0, labels: [] };
      const mt = findHcMitra(D.hc, D.main, name); if (!mt || !mt.entry) return z;
      (assignHcStations(mt.entry, [sta]).by[sta] || []).forEach(h => { z.aktif += h.aktif; z.isolir += h.isolir; z.dismantle += h.dismantle; z.base += h.aktif + h.isolir + h.dismantle; z.labels.push(h.label); });
      return z;
    };
    const docRef = v => { v = trim(v); if (!v || v === '-') return false; return /^https?:\/\//i.test(v) || /\.pdf\b/i.test(v) || (/\d/.test(v) && /\//.test(v) && /[A-Za-z]/.test(v)); };
    const toItems = [], toSeen = {};
    const mkTo = o => {
      const r = o.po ? poRowBy[normPo(o.po)] : null, mt = r ? metaOf.get(r) : null;
      const stage = r ? stageOfRow(r) : null;
      const impl = mt ? mt.impl : o.from, upd = mt ? mt.upd : o.to;
      const crit = [
        { label: 'BAP PO Cancel', v: o.kBap || '', ok: isDoneV(o.kBap) },
        { label: 'BA Serah Terima Material', v: o.lMat || '', ok: isDoneV(o.lMat) },
        { label: 'BA Perpindahan Akun IKR', v: o.mIkr || '', ok: isDoneV(o.mIkr) || isNoNeedV(o.mIkr), noNeed: !isDoneV(o.mIkr) && isNoNeedV(o.mIkr) }
      ];
      const steps = crit.filter(c => c.ok).length;
      const stat = o.untracked ? 'untracked' : steps === 3 ? 'selesai' : steps > 0 ? 'proses' : 'belum';
      const migDone = isDoneV(o.migrasi) || isNoNeedV(o.migrasi);
      const hcOld = hcAt(o.from, o.stasiun);
      const dir = isMe(o.to) || (o.ptGanti && isMe(o.ptGanti)) ? 'in' : 'out';
      const tasks = [];
      if (o.untracked) tasks.push({ kind: 'data', tone: 'warn', t: 'Data take over belum tercatat', b: 'Di tracker, mitra implementasi PO ini ' + (impl || '-') + ' dan mitra update/IKR ' + (upd || '-') + ', tetapi belum ada di data Progress Take Over. Hubungi Vendor Management untuk melengkapi.' });
      if (!crit[0].ok) tasks.push({ kind: 'ba', tone: 'bad', t: 'Lengkapi BAP PO Cancel', b: crit[0].v ? 'Status saat ini: ' + crit[0].v + '.' : 'BAP PO Cancel belum ada.' });
      if (!crit[1].ok) tasks.push({ kind: 'ba', tone: 'bad', t: 'Lengkapi BA Serah Terima Material', b: crit[1].v ? 'Status saat ini: ' + crit[1].v + '.' : 'BA Serah Terima Material belum ada.' });
      if (hcOld && hcOld.base > 0 && !migDone) tasks.push({ kind: 'hc', tone: 'bad', t: 'Migrasi ' + fmt(hcOld.base) + ' HC ke ' + (o.to || 'mitra pengganti'), b: 'HC di stasiun ini masih tercatat di CRM atas nama ' + (o.from || 'mitra lama') + ' (aktif ' + fmt(hcOld.aktif) + ', isolir ' + fmt(hcOld.isolir) + ', dismantle ' + fmt(hcOld.dismantle) + '). Migrasi HC wajib disertai BA Perpindahan Akun IKR' + (crit[2].ok ? '.' : ', yang belum lengkap.') });
      else if (!crit[2].ok) tasks.push({ kind: 'ba', tone: 'warn', t: 'Lengkapi BA Perpindahan Akun IKR', b: crit[2].v ? 'Status saat ini: ' + crit[2].v + '.' : 'Isi Done bila akun IKR sudah dipindahkan, atau No Need bila tidak ada HC yang perlu dimigrasi.' });
      if (stage != null && stage >= 1 && stage < 6 && dir === 'out') tasks.push({ kind: 'atp', tone: 'info', t: 'Selesaikan pekerjaan hingga ATP', b: 'Sebagai mitra implementasi, status PO dan pekerjaan sampai ATP tetap menjadi tanggung jawab Anda. Tahap saat ini: ' + STAGES[stage] + '.' });
      const docs = (o.docs || []).map(d => { const raw = trim(d.raw).replace(/\s+/g, ' '); const u = raw.match(/https?:\/\/[^\s,;"'<>]+/i) || (d.link ? [d.link] : null); const has = !!u || docRef(raw); return { label: d.label, raw, url: u ? u[0] : (has ? 'https://drive.google.com/drive/search?q=' + encodeURIComponent(raw.replace(/\.pdf\b/gi, '').trim()) : ''), isUrl: !!u, has, isNote: !!raw && !has }; });
      return { key: normPo(o.po) || ('S|' + normName(o.stasiun)), po: o.po || '', stasiun: o.stasiun || (r ? trim(r[C.stasiun]) : '') || '-', region: o.region || (r && C.reg >= 0 ? trim(r[C.reg]) : ''), pic: o.pic || '', dir, from: o.from || '', to: o.to || '', impl, upd,
        stage, poStatus: r ? trim(r[C.statusMain]) : '', hpPo: r ? num(r[C.hpPo]) : 0, hpActual: r ? num(r[C.hpActual]) : 0, rfsDone: r ? (/done/i.test(trim(r[C.statusRfs])) || trim(r[C.statusMain]).toLowerCase() === 'atp') : false, crit, steps, stat, migrasi: o.migrasi || '', migDone, hcOld, tasks, docs,
        sp: o.sp || '', statusMitra: o.statusMitra || '', remark: o.remark || '', noBap: o.noBap || '', tglSpk: o.tglSpk || '', untracked: !!o.untracked };
    };
    ((D.to && D.to.rows) || []).forEach(t => {
      if (!(isMe(t.lama) || isMe(t.ptLama) || isMe(t.pengganti) || isMe(t.ptGanti))) return;
      const k = normPo(t.po) || ('S|' + normName(t.stasiun));
      if (toSeen[k]) return; toSeen[k] = 1;
      toItems.push(mkTo({ po: t.po, stasiun: t.stasiun, region: t.region, pic: t.pic, from: t.lama, to: t.pengganti, ptGanti: t.ptGanti, kBap: t.kBap, lMat: t.lMat, mIkr: t.mIkr, migrasi: t.migrasi, docs: t.docs, sp: t.sp, statusMitra: t.statusMitra, remark: t.remark, noBap: t.noBap, tglSpk: t.tglSpk }));
    });
    if (D.to) D.main.rows.forEach((r, i) => {
      const mt = meta[i]; if (!mt.to || !(isMe(mt.impl) || isMe(mt.upd))) return;
      if (stageOfRow(r) === -1) return;
      const k = normPo(r[C.nopo]); if (!k || toSeen[k]) return; toSeen[k] = 1;
      toItems.push(mkTo({ po: trim(r[C.nopo]), stasiun: trim(r[C.stasiun]), region: C.reg >= 0 ? trim(r[C.reg]) : '', pic: trim(r[C.pic]), from: mt.impl, to: mt.upd, untracked: true, docs: [] }));
    });
    const toRank = { belum: 0, untracked: 1, proses: 2, selesai: 3 };
    toItems.sort((a, b) => (toRank[a.stat] - toRank[b.stat]) || (b.tasks.some(t => t.kind === 'hc') - a.tasks.some(t => t.kind === 'hc')) || a.stasiun.localeCompare(b.stasiun));

    // KPI
    const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
    const hpPo = sum(active, p => p.hpPo), hpActual = sum(active, p => p.hpActual);
    const hpRfs = sum(active.filter(p => p.rfsDone), p => p.hpActual), hpAtp = sum(active.filter(p => p.atpDone || p.stage === 7), p => p.hpActual);
    const stageCount = {}; pos.forEach(p => { stageCount[p.stage] = (stageCount[p.stage] || 0) + 1; }); const stageHp = {}; pos.forEach(p => { stageHp[p.stage] = (stageHp[p.stage] || 0) + (p.hpPo || 0); });
    const withDoc = active.filter(p => p.doc.has);
    const toOutL = active.filter(p => p.isTo), toInL = toInRows.filter(r => stageOfRow(r) !== -1);
    const toStat = { outCount: toOutL.length, outHpPo: toOutL.reduce((a, p) => a + p.hpPo, 0), outHpActual: toOutL.reduce((a, p) => a + p.hpActual, 0), inHpBasis: toInL.reduce((a, r) => { const s = trim(r[C.statusMain]).toLowerCase(), rf = trim(r[C.statusRfs]), pp = num(r[C.hpPo]), ac = num(r[C.hpActual]); return a + ((s === 'atp' || s === 'redline' || s.includes('batal') || (s.includes('done') && s.includes('imple') && !/done/i.test(rf))) ? ac : pp); }, 0), outHpAtp: toOutL.filter(p => p.atpDone || p.stage === 7).reduce((a, p) => a + p.hpActual, 0), inHpAtp: toInL.filter(r => stageOfRow(r) >= 6).reduce((a, r) => a + num(r[C.hpActual]), 0), outHpRfs: toOutL.filter(p => p.rfsDone).reduce((a, p) => a + p.hpActual, 0), inHpRfs: toInL.filter(r => /done/i.test(trim(r[C.statusRfs]))).reduce((a, r) => a + num(r[C.hpActual]), 0), inCount: toInL.length, inHpPo: toInL.reduce((a, r) => a + num(r[C.hpPo]), 0), inHpActual: toInL.reduce((a, r) => a + num(r[C.hpActual]), 0) };
    const kpi = {
      toStat, poCount: active.length, cancelCount: pos.length - active.length, stationCount: stations.filter(s => !s.toOnly).length,
      hpPo, hpActual, hpRfs, hpAtp, realPct: pct(hpActual, hpPo), rfsPct: pct(hpRfs, hpPo), atpPct: pct(hpAtp, hpPo),
      notYetRfs: Math.max(0, hpActual - hpRfs), notYetAtp: Math.max(0, hpRfs - hpAtp), notYetBuild: Math.max(0, hpPo - hpActual),
      docTracked: withDoc.length, docComplete: withDoc.filter(p => p.doc.state === 'complete').length, docIncomplete: withDoc.filter(p => p.doc.state === 'incomplete').length, docRejected: withDoc.filter(p => p.doc.state === 'rejected').length,
      spkCount: spk.length, spkDone: spk.filter(s => s.status === 'done').length, drmSigned: spk.filter(s => s.drm.state === 'signed').length,
      stageCount, stageHp, potensiHc: Math.max(0, hpRfs - hc.base)
    };

    // Perlu perhatian
    const alerts = [];
    const add = (sev, title, desc, tab, flag) => alerts.push({ id: 'a' + alerts.length, sev, title, desc, tab, flag: flag || '' });
    const names = (list, n) => { const u = []; list.forEach(p => { if (u.indexOf(p.stasiun) < 0) u.push(p.stasiun); }); return u.slice(0, n).join(', ') + (u.length > n ? ' +' + (u.length - n) + ' lainnya' : ''); };
    if (thc.found && thc.status === 'behind') add('bad', 'Target HC ' + thc.monthLabel + ' tertinggal', 'HC ' + fmt(thc.hc) + ' dari target ' + fmt(thc.target) + ' (' + thc.pct + '%). Perlu ±' + fmt(thc.needPerDay) + ' HC/hari hingga akhir bulan.', 'hc');
    else if (thc.found && thc.status === 'slight') add('warn', 'Target HC sedikit di bawah ritme', 'HC ' + fmt(thc.hc) + ' vs ritme ideal ' + fmt(thc.expected) + ' hari ini. Perlu ±' + fmt(thc.needPerDay) + ' HC/hari.', 'hc');
    const fl = k => active.filter(p => p.flags[k]);
    let L;
    if ((L = fl('overdue')).length) add('bad', L.length + ' PO melewati rencana RFS', names(L, 3), 'dokumen', 'overdue');
    if ((L = fl('rejected')).length) add('bad', L.length + ' PO dengan dokumen ATP ditolak', names(L, 3), 'dokumen', 'rejected');
    if ((L = fl('docmissing')).length) add('warn', L.length + ' PO dokumennya belum lengkap', 'Total ' + fmt(sum(L, p => p.doc.missing.length)) + ' dokumen kurang. ' + names(L, 2), 'dokumen', 'docmissing');
    if ((L = fl('belumrfs')).length) add('warn', fmt(sum(L, p => p.hpActual)) + ' HP selesai dibangun, belum RFS', L.length + ' PO menunggu submit Redline/RFS. ' + names(L, 2), 'dokumen', 'belumrfs');
    if ((L = fl('material')).length) add('warn', L.length + ' PO menunggu material', names(L, 3), 'dokumen', 'material');
    if ((L = fl('aging')).length) add('warn', L.length + ' PO berjalan lebih dari 6 bulan', 'Belum selesai implementasi sejak rilis PO. ' + names(L, 2), 'dokumen', 'aging');
    const riskSta = stations.filter(s => s.isolirRate >= 15 && s.hc.isolir >= 10).sort((a, b) => b.hc.isolir - a.hc.isolir);
    if (riskSta.length) add('warn', 'Isolir tinggi di ' + riskSta.length + ' stasiun', riskSta.slice(0, 3).map(s => s.name + ' ' + s.isolirRate + '%').join(', '), 'hc');
    if (daily.found && daily.prev7 > 0 && daily.last7 < daily.prev7 * 0.7) add('warn', 'Aktivasi 7 hari turun ' + Math.round((1 - daily.last7 / daily.prev7) * 100) + '%', fmt(daily.last7) + ' aktivasi vs ' + fmt(daily.prev7) + ' pada 7 hari sebelumnya.', 'hc');
    const toOpen = toItems.filter(t => t.stat !== 'selesai');
    if (toOpen.length) add('warn', toOpen.length + ' take over belum selesai', 'Lengkapi BAP PO Cancel, BA Serah Terima Material, dan BA Perpindahan Akun IKR. ' + names(toOpen.map(t => ({ stasiun: t.stasiun })), 2), 'takeover', 'toopen');
    const toHc = toItems.filter(t => t.tasks.some(k => k.kind === 'hc'));
    if (toHc.length) add('bad', fmt(toHc.reduce((a, t) => a + t.hcOld.base, 0)) + ' HC take over belum dimigrasi', toHc.length + ' stasiun. Migrasi HC wajib disertai BA Perpindahan Akun IKR. ' + names(toHc.map(t => ({ stasiun: t.stasiun })), 2), 'takeover', 'tohc');
    const hold = spk.filter(s => s.status === 'hold');
    if (hold.length) add('info', hold.length + ' SPK berstatus Hold', hold.slice(0, 2).map(s => s.noSpk).join(', '), 'spk', 'spkhold');
    if (kpi.potensiHc > 0 && hc.found) add('info', fmt(kpi.potensiHc) + ' HP RFS belum menjadi HC', 'Potensi penjualan dari HP yang sudah RFS.', 'hc');
    const sevRank = { bad: 0, warn: 1, info: 2 };
    alerts.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);

    const sig = { po: {}, spk: {}, to: {} };
    if (D.to) toItems.forEach(t => { sig.to[t.key] = { stat: t.stat, crit: t.crit.map(c => (c.ok ? 1 : 0)).join(''), hc: t.hcOld ? t.hcOld.base : null, label: (t.po || '-') + ' · ' + t.stasiun }; });
    pos.forEach(p => { if (p.nopo !== '-') sig.po[p.nopo + '|' + p.stasiun] = { nopo: p.nopo, sta: p.stasiun, st: p.status, rfs: p.statusRfs, mos: p.statusMos, doc: D.doc ? p.doc.state : null, atp: D.doc ? p.doc.atpStatus : null, pres: D.doc ? p.doc.present : null }; });
    spk.forEach(s => { const mb = monBy[spkKeyOf(s.noSpk)]; sig.spk[s.noSpk] = { u: s.update, drm: D.drm ? s.drm.label : null, pr: D.drm && mb ? mb.nPr : null, po: D.drm && mb ? mb.nPo : null }; });

    const sources = {};
    SOURCES.forEach(s => { sources[s.k] = D.src[s.k] ? Object.assign({}, D.src[s.k]) : { ok: null, label: s.label }; });
    return {
      v: 1, mitra: ((rows.find(r => !metaOf.get(r).to) || [])[C.mitra] || '').trim() || (rows[0] && metaOf.get(rows[0]).impl) || (toInRows[0] && metaOf.get(toInRows[0]).upd) || mitra, key: mk, at: D.at, regions: [...new Set(active.map(p => p.regional).filter(Boolean))],
      kpi, pos, toInPos, stations, hc, thc, daily, spk, mon: { projects: monProjects }, takeover: { items: toItems, loaded: !!D.to }, alerts, sig, sources, stages: STAGES,
      snap: { hpActual, hpRfs, hpAtp, hcBase: hc.base, hcAktif: hc.aktif, isolir: hc.isolir, docComplete: kpi.docComplete, poAtp: (stageCount[6] || 0) + (stageCount[7] || 0), poCount: active.length }
    };
  }

  window.MitraData = { SOURCES: SOURCES.map(s => ({ k: s.k, label: s.label })), CFG, configure, loadMain, listMitra, loadAll, buildModel, loadPins, peopleOf, verifyPin, normName, fmt, pct, fmtDate, parseDate, STAGES, DOC_FIELDS, MON_LONG };
})();
