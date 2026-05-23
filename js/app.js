// ═══════════════════════════════════════════════════════
//  BuchSammler · App Logic
//  GitHub Pages + Supabase · Kein Server · Keine Domain
// ═══════════════════════════════════════════════════════

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const S = {
  station:    null,
  nick:       null,
  userId:     null,
  userXP:     0,
  userBadges: [],
  feedMode:   'all',
  rankMode:   'global',
};

let currentBook  = null;
let pendingAction = null;

// ── Boot ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  loadLocal();
  await detectStation();
  renderTopUI();
  loadAll();
  renderDeploySteps();
  renderSqlPreview();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});

function loadAll() {
  loadFeed(); loadBestand(); loadRank(); renderProfil();
  loadAdminStations(); renderQRList();
}

// ── LocalStorage ─────────────────────────────────────
function loadLocal() {
  try {
    const u = JSON.parse(localStorage.getItem('bs_user') || 'null');
    if (u) { S.nick = u.nick; S.userId = u.id; S.userXP = u.xp || 0; S.userBadges = u.badges || []; }
    else { S.userId = 'u_' + Math.random().toString(36).slice(2, 11); }
  } catch(_) { S.userId = 'u_' + Date.now(); }
}
function saveLocal() {
  localStorage.setItem('bs_user', JSON.stringify({ id: S.userId, nick: S.nick, xp: S.userXP, badges: S.userBadges }));
}

// ── Station aus URL ?station=ID ───────────────────────
async function detectStation() {
  const sid = new URLSearchParams(location.search).get('station');
  if (sid) {
    const { data } = await sb.from('stations').select('*').eq('id', sid).maybeSingle();
    if (data) { S.station = data; return; }
  }
  const { data } = await sb.from('stations').select('*').order('name').limit(1);
  if (data && data[0]) S.station = data[0];
}

// ── Top-UI ────────────────────────────────────────────
function renderTopUI() {
  document.getElementById('tb-station').textContent = S.station ? S.station.name : 'Alle Orte';
  document.getElementById('tb-xp').textContent = '⭐ ' + S.userXP + ' XP';
  const bw = document.getElementById('station-banner');
  if (S.station) {
    bw.innerHTML = '<div class="station-banner"><div class="station-dot"></div><div>' +
      '<div style="font-weight:600;font-size:14px">' + x(S.station.name) + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + x(S.station.location || '') + '</div>' +
      '</div></div>';
  }
  document.getElementById('nick-card').style.display = S.nick ? 'none' : 'block';
  document.getElementById('scan-main').style.display  = S.nick ? 'block' : 'none';
}

// ── Navigation ────────────────────────────────────────
function showSection(s) {
  ['scan','bestand','feed','rank','orte','profil','admin'].forEach(k => {
    const el = document.getElementById('sec-' + k);   if (el) el.className = 'section' + (k === s ? ' active' : '');
    const nb = document.getElementById('nb-'  + k);   if (nb) nb.className  = 'nb' + (k === s ? ' active' : '');
  });
  if (s === 'feed')    loadFeed();
  if (s === 'bestand') loadBestand();
  if (s === 'rank')    loadRank();
  if (s === 'profil')  renderProfil();
  if (s === 'orte')    loadOrte();
  if (s === 'admin')   { loadAdminStations(); renderQRList(); }
}

// ── Nickname ──────────────────────────────────────────
function saveNick() {
  const v = document.getElementById('nick-inp').value.trim();
  if (!v || v.length < 2) { toast('Mindestens 2 Zeichen bitte'); return; }
  S.nick = v; saveLocal(); syncUser(); renderTopUI(); toast('Willkommen, ' + v + '! 🎉');
}
async function syncUser() {
  await sb.from('users').upsert(
    { id: S.userId, nick: S.nick, xp: S.userXP, badges: S.userBadges, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
}

// ── ISBN-Suche ────────────────────────────────────────
async function doSearch() {
  let isbn = document.getElementById('isbn-inp').value.trim().replace(/[^0-9X]/gi, '');
  if (isbn.length < 10) { toast('Bitte gültige ISBN eingeben'); return; }
  setSearchStatus('loading');
  document.getElementById('search-result').innerHTML = '';
  currentBook = null;
  try {
    const r = await fetch('https://openlibrary.org/isbn/' + isbn + '.json');
    if (!r.ok) throw new Error();
    const d = await r.json();
    let author = 'Unbekannter Autor';
    if (d.authors && d.authors[0]) {
      try { const ar = await fetch('https://openlibrary.org' + d.authors[0].key + '.json');
            const ad = await ar.json(); author = ad.name || ad.personal_name || author; } catch(_) {}
    }
    const cover = d.covers && d.covers[0] ? 'https://covers.openlibrary.org/b/id/' + d.covers[0] + '-M.jpg' : '';
    currentBook = { isbn, title: d.title || 'Unbekannter Titel', author, cover,
      year: d.publish_date || '', pages: d.number_of_pages || '' };
    setSearchStatus('');
    renderBookCard();
  } catch(_) {
    setSearchStatus('');
    document.getElementById('search-result').innerHTML =
      '<div class="card" style="text-align:center;padding:18px"><div style="font-size:28px;margin-bottom:8px">🔍</div>' +
      '<div style="color:var(--muted);font-size:13px">Kein Buch für <strong style="color:var(--text)">' + x(isbn) + '</strong> gefunden.</div></div>';
  }
}

function setSearchStatus(st) {
  document.getElementById('search-status').innerHTML = st === 'loading'
    ? '<div class="pulse"><span></span><span></span><span></span></div><span>Open Library wird durchsucht…</span>' : '';
}

function renderBookCard() {
  const b = currentBook;
  document.getElementById('search-result').innerHTML =
    '<div class="card"><div class="book-item" style="margin-bottom:12px">' +
    '<div class="book-thumb">' + (b.cover ? '<img src="' + x(b.cover) + '" onerror="this.parentElement.innerHTML=\'📖\'">' : '📖') + '</div>' +
    '<div style="flex:1;min-width:0"><div class="book-title">' + x(b.title) + '</div>' +
    '<div class="book-author">' + x(b.author) + '</div>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
    (b.year  ? '<span class="badge b-blue">' + x(String(b.year)) + '</span>' : '') +
    (b.pages ? '<span class="badge b-gray">' + b.pages + ' S.</span>' : '') + '</div></div></div><hr>' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--muted)">Was möchtest du tun?</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<button class="btn btn-success" onclick="openSheet(\'add\')">📗 Buch hier einstellen' +
      '<span style="margin-left:auto;background:var(--green-dim);color:var(--green);font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px">+' + XP.add + ' XP</span></button>' +
    '<button class="btn btn-danger" onclick="openSheet(\'remove\')">📤 Buch entnommen & melden' +
      '<span style="margin-left:auto;background:var(--red-dim);color:var(--red);font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px">+' + XP.remove + ' XP</span></button>' +
    '<button class="btn btn-outline" onclick="openSheet(\'reserve\')">🔖 Reservieren' +
      '<span style="margin-left:auto;background:var(--accent-dim);color:var(--accent);font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px">+' + XP.reserve + ' XP</span></button>' +
    '</div></div>';
}

// ── Action Sheet ──────────────────────────────────────
function openSheet(type) {
  if (!S.nick) { toast('Bitte zuerst Nickname eingeben'); return; }
  if (!currentBook) return;
  pendingAction = type;
  const b = currentBook;
  const titles = { add: 'Buch einstellen', remove: 'Entnahme melden', reserve: 'Reservieren' };
  const hints  = {
    add:    'Das Buch wird im Bestand dieser Sammelstelle eingetragen.',
    remove: 'Du bestätigst, dass du das Buch mitgenommen hast. So bleibt der Bestand aktuell.',
    reserve:'Du reservierst das Buch für max. 7 Tage.',
  };
  document.getElementById('sheet-body').innerHTML =
    '<div style="font-size:15px;font-weight:600;margin-bottom:12px">' + titles[type] + '</div>' +
    '<div class="book-item" style="margin-bottom:14px">' +
    '<div class="book-thumb">' + (b.cover ? '<img src="' + x(b.cover) + '" onerror="this.parentElement.innerHTML=\'📖\'">' : '📖') + '</div>' +
    '<div style="flex:1;min-width:0"><div class="book-title">' + x(b.title) + '</div>' +
    '<div class="book-author">' + x(b.author) + '</div>' +
    (S.station ? '<div style="font-size:11px;color:var(--muted);margin-top:3px">📍 ' + x(S.station.name) + '</div>' : '') +
    '</div></div><hr>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6">' + hints[type] + '</div>' +
    (type === 'add' ? '<label>Zustand</label><select id="sh-cond" class="mb10"><option>Sehr gut</option><option selected>Gut</option><option>Akzeptabel</option></select>' : '') +
    (type === 'reserve' ? '<label>Notiz (optional)</label><textarea id="sh-note" placeholder="z. B. Buch liegt oben links" class="mb10"></textarea>' : '') +
    '<button class="btn btn-primary" onclick="confirmAction()">✅ Bestätigen (+' + XP[type] + ' XP)</button>';
  document.getElementById('overlay').classList.add('open');
}

function closeSheet() { document.getElementById('overlay').classList.remove('open'); }

async function confirmAction() {
  if (!pendingAction || !currentBook) return;
  closeSheet();
  const type = pendingAction, b = currentBook;
  const sid  = S.station?.id || null;

  if (type === 'add') {
    await sb.from('books').upsert({
      isbn: b.isbn, title: b.title, author: b.author,
      cover: b.cover || null, year: String(b.year || ''),
      station_id: sid, condition: document.getElementById('sh-cond')?.value || 'Gut',
      added_by: S.nick, user_id: S.userId, available: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'isbn,station_id' });
  }
  if (type === 'remove') {
    await sb.from('books')
      .update({ available: false, removed_by: S.nick, removed_at: new Date().toISOString() })
      .eq('isbn', b.isbn).eq('station_id', sid);
  }
  if (type === 'reserve') {
    await sb.from('reservations').insert({
      isbn: b.isbn, title: b.title, station_id: sid,
      user_id: S.userId, nick: S.nick,
      note: document.getElementById('sh-note')?.value || null,
      status: 'aktiv', created_at: new Date().toISOString(),
    });
  }
  await sb.from('feed').insert({
    type, isbn: b.isbn, title: b.title,
    station_id: sid, station_name: S.station?.name || 'Unbekannt',
    nick: S.nick, user_id: S.userId, xp: XP[type],
    created_at: new Date().toISOString(),
  });

  grantXP(type);
  const msgs = { add: '📗 Eingestellt! +' + XP.add + ' XP', remove: '📤 Entnahme gemeldet! +' + XP.remove + ' XP', reserve: '🔖 Reserviert! +' + XP.reserve + ' XP' };
  toast(msgs[type]);
  document.getElementById('isbn-inp').value = '';
  document.getElementById('search-result').innerHTML = '';
  currentBook = null;
  loadAll();
}

// ── XP & Achievements ─────────────────────────────────
async function grantXP(type) {
  S.userXP += XP[type];
  document.getElementById('tb-xp').textContent = '⭐ ' + S.userXP + ' XP';
  saveLocal();
  await checkAchievements();
  syncUser();
}

async function checkAchievements() {
  const grant = async (id) => {
    if (S.userBadges.includes(id)) return;
    S.userBadges.push(id);
    const a = ACHIEVEMENTS.find(z => z.id === id);
    if (a) { S.userXP += a.xp; saveLocal(); document.getElementById('tb-xp').textContent = '⭐ ' + S.userXP + ' XP'; setTimeout(() => toast('🏆 ' + a.name + ' +' + a.xp + ' XP!'), 700); }
  };
  const { count: adds } = await sb.from('feed').select('*', { count: 'exact', head: true }).eq('user_id', S.userId).eq('type', 'add');
  if ((adds||0) >= 1)  await grant('first_add');
  if ((adds||0) >= 10) await grant('ten_books');
  const { count: rems } = await sb.from('feed').select('*', { count: 'exact', head: true }).eq('user_id', S.userId).eq('type', 'remove');
  if ((rems||0) >= 1)  await grant('first_remove');
  const { count: ress } = await sb.from('feed').select('*', { count: 'exact', head: true }).eq('user_id', S.userId).eq('type', 'reserve');
  if ((ress||0) >= 5)  await grant('reserv_5');
  const { data: sl } = await sb.from('feed').select('station_id').eq('user_id', S.userId);
  if (sl && new Set(sl.map(r => r.station_id)).size >= 2) await grant('multi_station');
}

// ── Bestand ───────────────────────────────────────────
async function loadBestand() {
  const q = (document.getElementById('bestand-search')?.value || '').toLowerCase();
  let query = sb.from('books').select('*').eq('available', true).order('updated_at', { ascending: false });
  if (S.station) query = query.eq('station_id', S.station.id);
  const { data: books } = await query;
  const filtered = (books || []).filter(b => !q || b.title.toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q));
  document.getElementById('bestand-count').textContent = filtered.length + ' Bücher';
  const el = document.getElementById('bestand-list');
  if (!filtered.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📚</span>' + (q ? 'Kein Treffer.' : 'Noch keine Bücher an diesem Ort.') + '</div>'; return; }
  el.innerHTML = filtered.map(b =>
    '<div class="card"><div class="book-item">' +
    '<div class="book-thumb">' + (b.cover ? '<img src="' + x(b.cover) + '" onerror="this.parentElement.innerHTML=\'📖\'">' : '📖') + '</div>' +
    '<div style="flex:1;min-width:0"><div class="book-title">' + x(b.title) + '</div><div class="book-author">' + x(b.author||'') + '</div>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">' +
    '<span class="badge b-green">Verfügbar</span>' +
    (b.condition ? '<span class="badge b-gray">' + x(b.condition) + '</span>' : '') +
    (b.year ? '<span class="badge b-blue">' + x(String(b.year)) + '</span>' : '') + '</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:4px">von ' + x(b.added_by||'?') + '</div>' +
    '</div></div></div>'
  ).join('');
}
function renderBestand() { loadBestand(); }

// ── Feed ──────────────────────────────────────────────
async function loadFeed() {
  let q = sb.from('feed').select('*').order('created_at', { ascending: false }).limit(40);
  if (S.feedMode === 'here' && S.station) q = q.eq('station_id', S.station.id);
  const { data } = await q;
  const el = document.getElementById('feed-list');
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📋</span>Noch keine Aktivitäten.</div>'; return; }
  const icons  = { add:'📗', remove:'📤', reserve:'🔖' };
  const labels = { add:'eingestellt', remove:'entnommen', reserve:'reserviert' };
  el.innerHTML = data.map(f =>
    '<div class="feed-row"><div class="feed-icon fi-' + f.type + '">' + (icons[f.type]||'📌') + '</div>' +
    '<div style="flex:1;min-width:0"><div class="feed-main"><strong>' + x(f.nick) + '</strong> hat „' + x(f.title) + '" ' + (labels[f.type]||f.type) + '</div>' +
    '<div class="feed-sub">📍 ' + x(f.station_name||'?') + ' · ' + relTime(f.created_at) + '</div></div>' +
    '<div class="xp-pop">+' + f.xp + ' XP</div></div>'
  ).join('');
}
function feedFilter(btn, mode) {
  S.feedMode = mode;
  btn.closest('.chip-row').querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on'); loadFeed();
}

// ── Rangliste ─────────────────────────────────────────
async function loadRank() {
  let q = sb.from('users').select('id,nick,xp,badges').order('xp', { ascending: false }).limit(20);
  if (S.rankMode === 'here' && S.station) {
    const { data: uids } = await sb.from('feed').select('user_id').eq('station_id', S.station.id);
    if (uids && uids.length) {
      const ids = [...new Set(uids.map(r => r.user_id))];
      q = sb.from('users').select('id,nick,xp,badges').in('id', ids).order('xp', { ascending: false }).limit(20);
    }
  }
  const { data } = await q;
  const el = document.getElementById('rank-list');
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">🏆</span>Noch keine Einträge.</div>'; return; }
  const medals = ['🥇','🥈','🥉'];
  const avCls  = ['av-gold','av-silver','av-bronze'];
  el.innerHTML = data.map((u, i) => {
    const lv = getLevel(u.xp||0);
    const isMe = u.id === S.userId;
    return '<div class="lb-row' + (isMe ? ' me' : '') + '">' +
      '<div style="font-size:18px;width:26px;text-align:center;flex-shrink:0">' + (medals[i]||'#'+(i+1)) + '</div>' +
      '<div class="avatar ' + (avCls[i]||'av-default') + '">' + initials(u.nick) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + x(u.nick) +
      (isMe ? ' <span style="color:var(--muted);font-size:11px;font-weight:400">(du)</span>' : '') + '</div>' +
      '<div class="lvl-pill" style="margin-top:3px">' + lv.icon + ' ' + lv.name + '</div></div>' +
      '<div style="text-align:right;flex-shrink:0"><div style="font-size:18px;font-weight:600;color:var(--amber)">' + (u.xp||0) + '</div>' +
      '<div style="font-size:10px;color:var(--muted)">XP</div></div></div>';
  }).join('');
}
function rankFilter(btn, mode) {
  S.rankMode = mode;
  btn.closest('.chip-row').querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on'); loadRank();
}

// ── Orte ──────────────────────────────────────────────
async function loadOrte() {
  const { data } = await sb.from('stations').select('*').order('name');
  const el = document.getElementById('orte-list');
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">🗺️</span>Noch keine Sammelstellen. Admin → Stationen.</div>'; return; }
  el.innerHTML = data.map(s => {
    const isActive = S.station?.id === s.id;
    return '<div class="station-card' + (isActive ? ' active' : '') + '" onclick="selectStation(\'' + s.id + '\')">' +
      '<div class="st-name">' + x(s.name) + '</div>' +
      '<div class="st-meta">📍 ' + x(s.location||'') + '</div>' +
      (isActive ? '<div style="margin-top:6px"><span class="badge b-green">Aktiv</span></div>' : '') +
      '</div>';
  }).join('');
}
async function selectStation(id) {
  const { data } = await sb.from('stations').select('*').eq('id', id).maybeSingle();
  if (data) { S.station = data; renderTopUI(); loadOrte(); loadBestand(); toast('Gewechselt: ' + data.name); showSection('scan'); }
}

// ── Profil ────────────────────────────────────────────
function renderProfil() {
  const el = document.getElementById('profil-content');
  if (!S.nick) {
    el.innerHTML = '<div class="card" style="text-align:center;padding:24px"><div style="font-size:40px;margin-bottom:12px">👤</div>' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:6px">Noch kein Profil</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">Gib einen Nickname ein um Punkte zu sammeln.</div>' +
      '<button class="btn btn-primary" onclick="showSection(\'scan\')">Nickname eingeben</button></div>'; return;
  }
  const lv   = getLevel(S.userXP);
  const next = LEVELS.slice().reverse().find(l => l.min > S.userXP);
  const pct  = next ? Math.min(100, Math.round(((S.userXP - lv.min) / (next.min - lv.min)) * 100)) : 100;
  el.innerHTML = '<div class="card">' +
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
    '<div class="avatar av-gold" style="width:52px;height:52px;font-size:20px">' + initials(S.nick) + '</div>' +
    '<div style="flex:1"><div style="font-size:18px;font-weight:600">' + x(S.nick) + '</div>' +
    '<div class="lvl-pill" style="margin-top:5px">' + lv.icon + ' ' + lv.name + '</div></div>' +
    '<button class="btn btn-outline btn-sm" onclick="S.nick=null;saveLocal();renderTopUI();showSection(\'scan\')" style="width:auto">✏️</button>' +
    '</div><div class="xp-bar-wrap" style="height:8px"><div class="xp-bar-fill" style="width:' + pct + '%"></div></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px">' +
    '<span>' + lv.icon + ' ' + lv.name + '</span>' +
    '<span>' + (next ? next.icon + ' ' + next.name + ' in ' + (next.min - S.userXP) + ' XP' : '🏆 Max-Level!') + '</span></div></div>' +
    '<div class="stats-grid">' +
    '<div class="stat-box"><div class="stat-n" style="color:var(--amber)">' + S.userXP + '</div><div class="stat-l">XP gesamt</div></div>' +
    '<div class="stat-box"><div class="stat-n" style="color:var(--accent)">' + S.userBadges.length + '</div><div class="stat-l">Auszeichnungen</div></div>' +
    '</div><div class="card"><div class="card-title">Auszeichnungen</div>' +
    ACHIEVEMENTS.map(a => {
      const earned = S.userBadges.includes(a.id);
      return '<div class="ach-row' + (earned ? '' : ' ach-locked') + '">' +
        '<div class="ach-icon">' + a.icon + '</div>' +
        '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + a.name + '</div>' +
        '<div style="font-size:11px;color:var(--muted)">' + a.desc + '</div></div>' +
        '<span class="badge ' + (earned ? 'b-amber' : 'b-gray') + '">+' + a.xp + ' XP</span></div>';
    }).join('') + '</div>';
}

// ── Admin: Stationen ──────────────────────────────────
async function loadAdminStations() {
  const { data } = await sb.from('stations').select('*').order('name');
  const el = document.getElementById('admin-station-list');
  if (!data || !data.length) { el.innerHTML = ''; return; }
  el.innerHTML = data.map(s => '<div class="card" style="margin-bottom:8px">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
    '<div><div style="font-weight:600;font-size:14px">' + x(s.name) + '</div>' +
    '<div style="font-size:12px;color:var(--muted)">' + x(s.location||'Kein Standort') + '</div>' +
    '<div style="margin-top:5px"><code style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(79,140,255,.12);color:var(--accent)">' + s.id + '</code></div></div>' +
    '<button class="btn btn-danger btn-sm" style="flex-shrink:0" onclick="deleteStation(\'' + s.id + '\')">🗑️</button>' +
    '</div></div>'
  ).join('');
}

async function addStation() {
  const name = document.getElementById('ns-name').value.trim();
  if (!name) { toast('Name ist erforderlich'); return; }
  const loc  = document.getElementById('ns-loc').value.trim();
  const { data, error } = await sb.from('stations').insert({ name, location: loc, created_at: new Date().toISOString() }).select().single();
  if (error) { toast('Fehler: ' + error.message); return; }
  document.getElementById('ns-name').value = '';
  document.getElementById('ns-loc').value  = '';
  toast('📍 ' + name + ' angelegt');
  loadAdminStations();
  renderQRList();
  adminTab(document.querySelectorAll('.admin-tab')[1], 'adm-qr');
}

async function deleteStation(id) {
  if (!confirm('Sammelstelle und alle zugehörigen Bücher löschen?')) return;
  await sb.from('stations').delete().eq('id', id);
  if (S.station?.id === id) S.station = null;
  loadAdminStations(); renderQRList(); loadOrte(); renderTopUI(); toast('Sammelstelle gelöscht');
}

// ── Admin: QR-Codes ───────────────────────────────────
async function renderQRList() {
  const { data } = await sb.from('stations').select('*').order('name');
  const el = document.getElementById('qr-list');
  if (!el) return;
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📍</span>Noch keine Sammelstellen angelegt.</div>'; return; }
  el.innerHTML = '';
  for (const s of data) {
    const url = BASE_URL + '/?station=' + encodeURIComponent(s.id);
    const wrap = document.createElement('div');
    wrap.className = 'card'; wrap.style.marginBottom = '12px';
    wrap.innerHTML =
      '<div style="font-weight:600;font-size:14px;margin-bottom:2px">' + x(s.name) + '</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">' + x(s.location||'') + '</div>' +
      '<canvas id="qrc-' + s.id + '" class="qr-canvas"></canvas>' +
      '<div style="font-size:10px;color:var(--muted);margin-top:6px;word-break:break-all">' + x(url) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<button class="btn btn-primary btn-sm" onclick="downloadQR(\'' + s.id + '\',\'' + x(s.name) + '\')">⬇ Als PNG herunterladen</button>' +
      '<button class="btn btn-outline btn-sm" onclick="copyUrl(\'' + url + '\')">📋 URL kopieren</button>' +
      '</div>';
    el.appendChild(wrap);
    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(document.getElementById('qrc-' + s.id), url, { width: 180, margin: 1, color: { dark: '#000', light: '#fff' } }, () => {});
    }
  }
}

function downloadQR(id, name) {
  const canvas = document.getElementById('qrc-' + id);
  if (!canvas) { toast('QR noch nicht geladen'); return; }
  const out = document.createElement('canvas');
  out.width = 420; out.height = 500;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 420, 500);
  ctx.drawImage(canvas, 30, 20, 360, 360);
  ctx.fillStyle = '#111'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('BuchSammler', 210, 410);
  ctx.font = '14px sans-serif'; ctx.fillStyle = '#555';
  ctx.fillText(name.length > 40 ? name.slice(0, 38) + '…' : name, 210, 434);
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#999';
  ctx.fillText('ISBN scannen · Buch einstellen oder abholen', 210, 456);
  const a = document.createElement('a');
  a.download = 'qr-' + name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
  a.href = out.toDataURL('image/png'); a.click();
  toast('QR-Code wird heruntergeladen');
}

function copyUrl(url) {
  navigator.clipboard ? navigator.clipboard.writeText(url).then(() => toast('URL kopiert!')) : toast('Kopieren nicht verfügbar');
}

// ── Admin: GitHub-User ────────────────────────────────
function saveGhUser() {
  const v = document.getElementById('gh-user-inp').value.trim();
  if (!v) { toast('Bitte GitHub-Name eingeben'); return; }
  document.getElementById('gh-url-preview').innerHTML =
    'Deine App-URL: <code>https://' + x(v) + '.github.io/buchsammler/</code><br>' +
    'Trage <code>' + x(v) + '</code> auch in <code>js/config.js</code> bei <code>GITHUB_USER</code> ein.';
  renderQRList(); toast('GitHub-Name gespeichert');
}

// ── Admin Tabs ────────────────────────────────────────
function adminTab(btn, id) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.adm-panel').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  if (id === 'adm-qr') renderQRList();
}

// ── Deploy-Anleitung ──────────────────────────────────
function renderDeploySteps() {
  const steps = [
    { icon: '🐙', title: 'GitHub-Account erstellen', desc: 'Kostenlos auf github.com registrieren – falls noch nicht vorhanden.' },
    { icon: '📁', title: 'Repository "buchsammler" anlegen', desc: 'Neues Repository erstellen, als Public markieren. Name genau so: buchsammler' },
    { icon: '📤', title: 'Dateien hochladen', desc: 'Alle Dateien aus dem ZIP per Drag-and-Drop in das Repository laden. Alternativ: GitHub Desktop verwenden.' },
    { icon: '⚙️', title: 'GitHub Pages aktivieren', desc: 'Repository → Settings → Pages → Source: "Deploy from branch" → Branch: main → Speichern. App ist in ca. 2 Min. erreichbar.' },
    { icon: '🗄️', title: 'Supabase einrichten', desc: 'Projekt auf supabase.com anlegen → SQL aus diesem Bereich ausführen → URL + Key in js/config.js eintragen → Datei neu hochladen.' },
    { icon: '📲', title: 'QR-Codes drucken', desc: 'Sammelstellen anlegen → QR-Code herunterladen → ausdrucken, laminieren, aufhängen. Fertig!' },
  ];
  const el = document.getElementById('deploy-steps');
  if (!el) return;
  el.innerHTML = steps.map((s, i) =>
    '<div class="step-row">' +
    '<div class="step-num todo">' + (i + 1) + '</div>' +
    '<div><div class="step-title">' + s.icon + ' ' + s.title + '</div>' +
    '<div class="step-desc">' + s.desc + '</div></div></div>'
  ).join('');
}

const SQL_TEXT = `-- BuchSammler · Supabase Setup
-- Einmalig im SQL-Editor ausführen

CREATE TABLE stations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  isbn TEXT NOT NULL,
  title TEXT, author TEXT, cover TEXT, year TEXT,
  station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
  condition TEXT DEFAULT 'Gut',
  available BOOLEAN DEFAULT true,
  added_by TEXT, user_id TEXT,
  removed_by TEXT, removed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(isbn, station_id)
);

CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  isbn TEXT, title TEXT,
  station_id TEXT REFERENCES stations(id) ON DELETE CASCADE,
  user_id TEXT, nick TEXT, note TEXT,
  status TEXT DEFAULT 'aktiv',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  nick TEXT, xp INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feed (
  id BIGSERIAL PRIMARY KEY,
  type TEXT, isbn TEXT, title TEXT,
  station_id TEXT, station_name TEXT,
  nick TEXT, user_id TEXT, xp INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE books       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON stations     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON books        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON feed         FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_books_station ON books(station_id, available);
CREATE INDEX idx_feed_station  ON feed(station_id, created_at DESC);
CREATE INDEX idx_users_xp      ON users(xp DESC);`;

function renderSqlPreview() {
  const el = document.getElementById('sql-preview');
  if (el) el.textContent = SQL_TEXT;
}
function copySql() {
  navigator.clipboard ? navigator.clipboard.writeText(SQL_TEXT).then(() => toast('SQL kopiert!')) : toast('Kopieren nicht verfügbar');
}

// ── Kamera ────────────────────────────────────────────
async function startCamera() {
  const video  = document.getElementById('cam-video');
  const status = document.getElementById('cam-status');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream; video.play(); video.style.display = 'block';
    status.textContent = 'Kamera aktiv – halte den Barcode ins Bild…';
    if ('BarcodeDetector' in window) {
      const det = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128'] });
      const tick = async () => {
        try {
          const codes = await det.detect(video);
          if (codes.length) {
            const val = codes[0].rawValue.replace(/[^0-9X]/gi, '');
            if (/^\d{10,13}$/.test(val)) {
              stream.getTracks().forEach(t => t.stop());
              video.style.display = 'none'; status.textContent = '';
              document.getElementById('isbn-inp').value = val;
              toast('📷 ' + val + ' erkannt'); doSearch(); return;
            }
          }
        } catch(_) {}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      status.innerHTML = '<span style="color:var(--amber)">⚠️ BarcodeDetector nur in Chrome/Android verfügbar. ISBN bitte manuell eingeben.</span>';
    }
  } catch(_) { status.innerHTML = '<span style="color:var(--red)">Kamerazugriff verweigert.</span>'; }
}

// ── Helpers ───────────────────────────────────────────
function getLevel(xp) { return LEVELS.slice().reverse().find(l => xp >= l.min) || LEVELS[0]; }
function initials(n)  { return (n||'?').trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase(); }
function x(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function relTime(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'gerade eben';
  if (d < 3600)  return Math.floor(d/60) + ' Min.';
  if (d < 86400) return Math.floor(d/3600) + ' Std.';
  return Math.floor(d/86400) + ' Tage';
}
let _tt;
function toast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), dur);
}
document.getElementById('isbn-inp').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
