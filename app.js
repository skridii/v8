'use strict';
/* IRONLOG v9
   Adatmodell: state.version 6
   - occurrences kulcs: "ciklus-hét-nap" (v5-ben "hét-nap" volt → migráció az 1. ciklusba)
   - layouts: "ciklus-hét" → 4 nap gyakorlatlistája; a módosítás attól a héttől érvényes
   - variantChoice: váltakozó gyakorlatoknál (pl. Bench / Incline) az adott heti választás
   Adatbázis neve, store, kulcs és a localStorage kulcsok változatlanok. */
const APP_VERSION = 'v9';

const DAYS = [
  { name: 'LOWER 1', subtitle: 'Deadlift & Quadriceps Focus' },
  { name: 'UPPER 1', subtitle: 'Chest & Back Thickness' },
  { name: 'LOWER 2', subtitle: 'Quadriceps, Hamstring & Soleus Focus' },
  { name: 'UPPER 2', subtitle: 'Shoulders & Lat Width Focus' }
];

const PROGRAM = [
{name:'LOWER 1',subtitle:'Deadlift & Quadriceps Focus',ex:[
['Conventional Deadlift','Sima Felhúzás','2 × 5–7'],['Hack Squat','Hack Guggolás Gépen','2 × 6–8'],['Machine Ab Crunch','Gépes hasprés gépen','2 × 10–15'],['Machine Hip Adduction','Csípő Addukció Gépen','2 × 10–12'],['Standing Calf Raise','Álló Vádli Gépen','2 × 8–10'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 1',subtitle:'Chest & Back Thickness',ex:[
['Bench Press','Fekvenyomás','2 × 6–8'],['Chest-Supported Row','Mellkassal támasztott Evezés','2 × 6–8'],['Straight-Arm Lat Pulldown','Egyeneskaros Lehúzás','2 × 8–10'],['Lateral Raise','Oldalemelés','2 × 10–12'],['Rear Delt Fly','Hátsó Váll Tárogatás','2 × 10–12'],['Scott Bench Preacher Curl','Scott Pados Bicepsz','2 × 8–10'],['Cable Rope Triceps Pushdown','Csigás Kötél Tricepsz','2 × 8–10']]},
{name:'LOWER 2',subtitle:'Quadriceps, Hamstring & Soleus Focus',ex:[
['Smith Machine Bulgarian Split Squat','Smith Bolgár Guggolás','2 × 8–10 / láb'],['Seated Hamstring Curl','Ülő Combhajlítás','2 × 8–10'],['Leg Extension','Láb Extenzió','2 × 10–12'],['Seated Calf Raise','Ülő Vádli Gépen','2 × 10–12'],['Hanging Leg Raise','Függeszkedős Has','2 × 10–12'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 2',subtitle:'Shoulders & Lat Width Focus',ex:[
['Smith Machine Overhead Shoulder Press','Smith Vállból Nyomás','2 × 6–8'],['Wide-Grip Lat Pulldown','Széles Lehúzás Csigán','2 × 8–10'],['Chest Fly','Mell Tárogatás / Pec Deck','2 × 8–10'],['High Row Machine','Gépes magas evezés / High Row','2 × 8–10'],['Alternating Dumbbell Biceps Curl','Váltott Karú Bicepsz','2 × 8–10'],['Single-Arm Overhead Cable Triceps Extension','1 Kezes Fejfeletti Tricepsz','2 × 8–10']]}
];
const INCLINE = { name: 'Incline Bench Press', hu: 'Ferde Fekvenyomás' };

// A legrégebbi (v1–v3, "logs" formátumú) mentések programja: ott a LOWER 1 3. gyakorlata
// Leg Extension, az UPPER 2 4. gyakorlata Cable Face Pull volt. Így ezek az adatok
// a saját nevük alatt maradnak, nem keverednek az Ab Crunch / High Row adataival.
const LEGACY_NAMES = PROGRAM.map(d => d.ex.map(x => x[0]));
LEGACY_NAMES[0][2] = 'Leg Extension';
LEGACY_NAMES[3][3] = 'Cable Face Pull';

const DBNAME = 'IRONLOG_DB_FINAL', STORE = 'state', KEY = 'main';
const LS_WRITE = ['ironlog-v5-backup', 'ironlog-v4-backup', 'ironlog-auto-backup'];
const LS_READ = ['ironlog-v5-backup', 'ironlog-auto-backup', 'ironlog-v4-backup', 'ironlog-v3-backup', 'ironlog-v2', 'ironlog-v1'];
const SNAP_PREFIX = 'ironlog-snap-';        // napi automatikus másolat (utolsó 7 nap)
const PRE_V6_KEY = 'ironlog-pre-v6-backup'; // a v9 frissítés előtti állapot, érintetlenül
const PRE_IMPORT_PREFIX = 'ironlog-preimport-';
const TIMER_KEY = 'ironlog-timer';
const KEEP_SNAPS = 7;

const $ = id => document.getElementById(id);
const weekGrid = $('weekGrid'), weekTitle = $('weekTitle'), dayTabs = $('dayTabs'), workout = $('workout'),
  cycleLabel = $('cycleLabel'), cyclePrev = $('cyclePrev'), cycleNext = $('cycleNext'), cycleBanner = $('cycleBanner'),
  timerExercise = $('timerExercise'), timerOverlay = $('timerOverlay'), timerValue = $('timerValue'),
  skipTimer = $('skipTimer'), add30 = $('add30'), installBtn = $('installBtn');

let db = null, ready = false, view = 'workout', saveChain = Promise.resolve(), saveWarned = false;
let timer = null, timerEnd = 0, timerKind = 'work', timerEx = '', seconds = 150;
let state = blankState();

/* ---------- segédfüggvények ---------- */
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const exId = name => norm(name);
const okey = (c, w, d) => `${c}-${w}-${d}`;
const lkey = (c, w) => `${c}-${w}`;
const pos = (c, w, d = 0) => ((c - 1) * 6 + (w - 1)) * 4 + d;
const clone = o => JSON.parse(JSON.stringify(o));
const emptySet = () => ({ weight: '', reps: '', done: false });
const cleanNum = v => String(v ?? '').trim().replace(/\s+/g, '').replace(',', '.');
const toNum = v => { const s = cleanNum(v); return s === '' ? NaN : Number(s); };
const positive = v => { const n = toNum(v); return Number.isFinite(n) && n > 0; };
const showNum = v => String(v ?? '').replace('.', ',');
const newUid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
function esc(v) { return String(v ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function prettyId(id) { return String(id).split('_').map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join(' '); }
function hasData(r) { if (!r) return false; return [r.warmup, ...(r.sets || [])].some(s => s && (String(s.weight ?? '') !== '' || String(s.reps ?? '') !== '' || s.done)); }
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }

/* ---------- program / layout ---------- */
function defaultLayout(exerciseNames = {}) {
  return PROGRAM.map((day, d) => day.ex.map((x, e) => {
    const custom = exerciseNames[`${d}-${e}`];
    const name = custom || x[0];
    const slot = { uid: `d${d}e${e}`, reps: x[2], variants: [{ name, hu: custom && custom !== x[0] ? '' : x[1] }] };
    if (name === 'Bench Press') slot.variants.push({ ...INCLINE });
    return slot;
  }));
}
function blankState() {
  return { version: 6, cycle: 1, maxCycle: 1, week: 1, day: 0, exercises: {}, layouts: { '1-1': defaultLayout() }, variantChoice: {}, names: {}, exerciseNames: {}, savedAt: 0 };
}
function layoutKeysSorted() {
  return Object.keys(state.layouts).map(k => { const [c, w] = k.split('-').map(Number); return { k, c, w, p: pos(c, w) }; }).sort((a, b) => a.p - b.p);
}
function layoutFor(c, w) {
  const keys = layoutKeysSorted();
  let best = keys[0];
  for (const x of keys) if (x.p <= pos(c, w)) best = x;
  return best ? state.layouts[best.k] : defaultLayout();
}
function curSlots() { return layoutFor(state.cycle, state.week)[state.day] || []; }
/* Módosítás a megadott héttől kezdve (a korábbi hetek változatlanok maradnak). */
function applyFrom(c, w, fn) {
  const k = lkey(c, w);
  if (!state.layouts[k]) state.layouts[k] = clone(layoutFor(c, w));
  for (const x of layoutKeysSorted()) if (x.p >= pos(c, w)) fn(state.layouts[x.k]);
  registerNames();
}
function registerNames() {
  state.names = state.names || {};
  for (const L of Object.values(state.layouts)) for (const day of L) for (const slot of day) for (const v of slot.variants) {
    const id = exId(v.name);
    if (!state.names[id]) state.names[id] = v.name;
  }
}
function nameOf(id) { return state.names?.[id] || prettyId(id); }

/* Váltakozó gyakorlat: az adott hét választása, alapból mindig az előző alkalom ellentéte. */
function variantIndex(c, w, d, slot) {
  if (!slot.variants || slot.variants.length < 2) return 0;
  const ch = state.variantChoice?.[`${c}-${w}-${slot.uid}`];
  if (ch === 0 || ch === 1) return ch;
  let bestP = -1, bestI = -1;
  slot.variants.forEach((v, i) => {
    for (const [k, r] of Object.entries(state.exercises[exId(v.name)]?.occurrences || {})) {
      const [cc, ww, dd] = k.split('-').map(Number), p = pos(cc, ww, dd);
      if (p < pos(c, w, d) && p > bestP && hasData(r)) { bestP = p; bestI = i; }
    }
  });
  return bestI === -1 ? 0 : 1 - bestI;
}
function slotName(c, w, d, slot) { return slot.variants[variantIndex(c, w, d, slot)].name; }
function lockVariant(slot) {
  if (slot.variants.length < 2) return;
  const k = `${state.cycle}-${state.week}-${slot.uid}`;
  if (state.variantChoice[k] === undefined) state.variantChoice[k] = variantIndex(state.cycle, state.week, state.day, slot);
}

/* ---------- rekordok ---------- */
function ensureExercise(id) { if (!state.exercises[id]) state.exercises[id] = { occurrences: {} }; return state.exercises[id]; }
function recordFor(c, w, d, name) { return state.exercises[exId(name)]?.occurrences?.[okey(c, w, d)] || null; }
function ensureRecord(c, w, d, name) {
  const id = exId(name), obj = ensureExercise(id), k = okey(c, w, d);
  if (!state.names[id]) state.names[id] = name;
  if (!obj.occurrences[k]) obj.occurrences[k] = { warmup: emptySet(), sets: [emptySet(), emptySet()], ts: Date.now() };
  const r = obj.occurrences[k];
  if (!r.warmup) r.warmup = emptySet();
  if (!Array.isArray(r.sets)) r.sets = [emptySet(), emptySet()];
  while (r.sets.length < 2) r.sets.push(emptySet());
  return r;
}
function latestBefore(c, w, d, name) {
  const obj = state.exercises[exId(name)]; if (!obj) return null;
  let best = null, bp = -1;
  for (const [k, v] of Object.entries(obj.occurrences || {})) {
    const [cc, ww, dd] = k.split('-').map(Number), p = pos(cc, ww, dd);
    if (p < pos(c, w, d) && p > bp && hasData(v)) { bp = p; best = { ...v, c: cc, w: ww, d: dd }; }
  }
  return best;
}
function personalBest(id) {
  let best = null;
  for (const [k, r] of Object.entries(state.exercises[id]?.occurrences || {})) {
    const [c, w] = k.split('-').map(Number);
    for (const s of (r.sets || [])) {
      if (!s || !s.done || !positive(s.weight) || !positive(s.reps)) continue;
      const wt = toNum(s.weight), reps = toNum(s.reps), score = wt * (1 + reps / 30);
      if (!best || score > best.score) best = { weight: wt, reps, score, c, w };
    }
  }
  return best;
}
function weekHasData(c, w) {
  return Object.values(state.exercises).some(x => Object.entries(x.occurrences || {}).some(([k, r]) => { const [cc, ww] = k.split('-').map(Number); return cc === c && ww === w && hasData(r); }));
}
const cycLabel = c => state.maxCycle > 1 ? `${c}. CIKLUS · ` : '';

/* ---------- migráció ---------- */
function normalizeRecord(r) {
  if (!r || typeof r !== 'object') return { warmup: emptySet(), sets: [emptySet(), emptySet()], ts: Date.now() };
  if (!r.warmup || typeof r.warmup !== 'object') r.warmup = emptySet();
  if (!Array.isArray(r.sets)) r.sets = [];
  while (r.sets.length < 2) r.sets.push(emptySet());
  for (const s of [r.warmup, ...r.sets]) {
    if (!s || typeof s !== 'object') continue;
    if (s.weight !== undefined && s.weight !== null) s.weight = cleanNum(s.weight);
    if (s.reps !== undefined && s.reps !== null) s.reps = cleanNum(s.reps);
  }
  return r;
}
function migrate(old) {
  if (!old || typeof old !== 'object') return blankState();
  let s;
  if (old.version === 6 && old.exercises && old.layouts) {
    s = { ...blankState(), ...old };
  } else if (old.exercises) {
    // v4 / v5: occurrence kulcs "hét-nap" → "1-hét-nap"
    const exercises = {};
    for (const [id, obj] of Object.entries(old.exercises || {})) {
      const occ = {};
      for (const [k, r] of Object.entries(obj?.occurrences || {})) {
        const p = k.split('-');
        occ[p.length === 2 ? `1-${p[0]}-${p[1]}` : k] = r;
      }
      exercises[id] = { ...obj, occurrences: occ };
    }
    s = { ...blankState(), ...old, version: 6, exercises, exerciseNames: old.exerciseNames || {} };
    s.layouts = { '1-1': defaultLayout(s.exerciseNames) };
    s.cycle = 1; s.maxCycle = 1; s.variantChoice = {}; s.names = {};
    // Kérés: a v9 utáni első UPPER 1 alkalom sima Bench Press legyen (utána váltakozik).
    const benchSlot = s.layouts['1-1'][1].find(x => x.variants.length > 1 && x.variants[0].name === 'Bench Press');
    if (benchSlot) {
      let lastW = 0;
      for (const k of Object.keys(exercises.bench_press?.occurrences || {})) {
        const [, w, d] = k.split('-').map(Number);
        if (d === 1 && hasData(exercises.bench_press.occurrences[k])) lastW = Math.max(lastW, w);
      }
      const target = lastW >= 6 ? '2-1' : `1-${lastW + 1}`;
      s.variantChoice[`${target}-${benchSlot.uid}`] = 0;
    }
  } else if (old.logs) {
    // v1–v3: logs["hét-nap-gyakorlat-szett"]
    s = blankState();
    s.week = old.week || 1; s.day = old.day || 0;
    for (const [k, v] of Object.entries(old.logs || {})) {
      const [w, d, e, si] = k.split('-').map(Number), name = LEGACY_NAMES[d]?.[e];
      if (!name || !w) continue;
      const id = exId(name), o = s.exercises[id] || (s.exercises[id] = { occurrences: {} }), ok = okey(1, w, d);
      if (!o.occurrences[ok]) o.occurrences[ok] = { warmup: emptySet(), sets: [emptySet(), emptySet()], ts: v?.ts || Date.now() };
      o.occurrences[ok].sets[si === 1 ? 1 : 0] = { weight: v?.weight || '', reps: v?.reps || '', done: !!v?.done, ts: v?.ts || Date.now() };
      s.names[id] = name;
    }
  } else return blankState();

  s.version = 6;
  s.exercises = s.exercises || {};
  s.variantChoice = s.variantChoice || {};
  s.names = s.names || {};
  s.exerciseNames = s.exerciseNames || {};
  if (!s.layouts || !Object.keys(s.layouts).length) s.layouts = { '1-1': defaultLayout(s.exerciseNames) };
  for (const obj of Object.values(s.exercises)) {
    if (!obj.occurrences) obj.occurrences = {};
    for (const k of Object.keys(obj.occurrences)) obj.occurrences[k] = normalizeRecord(obj.occurrences[k]);
  }
  let maxC = Number(s.maxCycle) || 1;
  for (const k of Object.keys(s.layouts)) maxC = Math.max(maxC, Number(k.split('-')[0]) || 1);
  for (const obj of Object.values(s.exercises)) for (const k of Object.keys(obj.occurrences)) maxC = Math.max(maxC, Number(k.split('-')[0]) || 1);
  s.maxCycle = maxC;
  s.cycle = Math.min(Math.max(Number(s.cycle) || 1, 1), maxC);
  s.week = Math.min(Math.max(Number(s.week) || 1, 1), 6);
  s.day = Math.min(Math.max(Number(s.day) || 0, 0), 3);

  const prev = state; state = s;
  try {
    registerNames();
    for (const day of PROGRAM) for (const x of day.ex) if (!s.names[exId(x[0])]) s.names[exId(x[0])] = x[0];
    for (const row of LEGACY_NAMES) for (const n of row) if (!s.names[exId(n)]) s.names[exId(n)] = n;
    // Váltakozó gyakorlatnál a már rögzített hetek választását rögzítjük, hogy ne ugráljon.
    for (const [id, obj] of Object.entries(s.exercises)) for (const [k, r] of Object.entries(obj.occurrences)) {
      if (!hasData(r)) continue;
      const [c, w, d] = k.split('-').map(Number);
      for (const slot of (layoutFor(c, w)[d] || [])) {
        if (slot.variants.length < 2) continue;
        const i = slot.variants.findIndex(v => exId(v.name) === id);
        const ck = `${c}-${w}-${slot.uid}`;
        if (i !== -1 && s.variantChoice[ck] === undefined) s.variantChoice[ck] = i;
      }
    }
  } finally { state = prev; }
  return s;
}

/* ---------- tárolás ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexeddb'));
    const r = indexedDB.open(DBNAME, 2);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => { db = r.result; resolve(); };
    r.onerror = () => reject(r.error);
  });
}
function readDB() { return new Promise((resolve, reject) => { const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY); r.onsuccess = () => resolve(r.result || null); r.onerror = () => reject(r.error); }); }
function writeDB(obj) { return new Promise((resolve, reject) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(obj, KEY); t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); }); }
function lsSet(k, v) {
  try { localStorage.setItem(k, v); return true; }
  catch (e) { pruneSnaps(2); try { localStorage.setItem(k, v); return true; } catch (e2) { return false; } }
}
function save() {
  if (!ready) return Promise.resolve(); // betöltés előtt soha nem írunk felül semmit
  state.version = 6; state.savedAt = Date.now();
  const raw = JSON.stringify(state);
  let ok = true;
  for (const k of LS_WRITE) ok = lsSet(k, raw) && ok;
  saveChain = saveChain.then(() => db ? writeDB(JSON.parse(raw)) : null).catch(() => { ok = false; warnSave(); });
  if (!ok) warnSave();
  return saveChain;
}
function warnSave() { if (saveWarned) return; saveWarned = true; toast('Figyelem: a mentés nem sikerült. Készíts biztonsági mentést fájlba!'); setTimeout(() => saveWarned = false, 30000); }
function snapKeys() { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith(SNAP_PREFIX) || k.startsWith(PRE_IMPORT_PREFIX) || k === PRE_V6_KEY)) out.push(k); } return out.sort().reverse(); }
function pruneSnaps(keep = KEEP_SNAPS) {
  try {
    const snaps = snapKeys().filter(k => k.startsWith(SNAP_PREFIX));
    snaps.slice(keep).forEach(k => localStorage.removeItem(k));
    const pre = snapKeys().filter(k => k.startsWith(PRE_IMPORT_PREFIX));
    pre.slice(3).forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}
function dailySnapshot() {
  try {
    const k = SNAP_PREFIX + today();
    if (!localStorage.getItem(k)) { lsSet(k, JSON.stringify(state)); pruneSnaps(); }
  } catch (e) {}
}
function parseSaved(raw) { try { const x = JSON.parse(raw); return x && typeof x === 'object' && (x.exercises || x.logs) ? x : null; } catch (e) { return null; } }
async function load() {
  let fromDB = null, fromLS = null;
  try { await withTimeout(openDB(), 3000); fromDB = await withTimeout(readDB(), 3000); } catch (e) {}
  for (const k of LS_READ) { let raw = null; try { raw = localStorage.getItem(k); } catch (e) {} if (raw) { fromLS = parseSaved(raw); if (fromLS) break; } }
  if (fromDB && !(fromDB.exercises || fromDB.logs)) fromDB = null;
  // Ha mindkettő megvan, a frissebb nyer (régi állapotoknál nincs savedAt → IndexedDB az elsődleges).
  let chosen = fromDB || fromLS;
  if (fromDB && fromLS && (Number(fromLS.savedAt) || 0) > (Number(fromDB.savedAt) || 0)) chosen = fromLS;
  if (chosen && chosen.version !== 6) { try { if (!localStorage.getItem(PRE_V6_KEY)) lsSet(PRE_V6_KEY, JSON.stringify(chosen)); } catch (e) {} }
  state = chosen ? migrate(chosen) : blankState();
  ready = true;
  dailySnapshot();
  await save();
  try { navigator.storage?.persist?.(); } catch (e) {}
}

/* ---------- megjelenítés ---------- */
function render() {
  renderWeeks(); renderTabs(); renderHistoryBtn(); renderBanner();
  if (view === 'history') renderHistory(); else renderWorkout();
}
function renderWeeks() {
  weekGrid.innerHTML = '';
  for (let w = 1; w <= 6; w++) {
    const b = document.createElement('button');
    b.className = 'week' + (w === state.week ? ' active' : '') + (weekHasData(state.cycle, w) ? ' done' : '');
    b.textContent = w;
    b.onclick = () => { if (!ready) return; state.week = w; save(); render(); };
    weekGrid.appendChild(b);
  }
  weekTitle.textContent = `WEEK ${state.week}`;
  cycleLabel.textContent = state.maxCycle > 1 ? `CYCLE ${state.cycle}/${state.maxCycle}` : 'CURRENT CYCLE';
  cyclePrev.classList.toggle('hidden', state.maxCycle < 2);
  cycleNext.classList.toggle('hidden', state.maxCycle < 2);
  cyclePrev.disabled = state.cycle <= 1;
  cycleNext.disabled = state.cycle >= state.maxCycle;
}
cyclePrev.onclick = () => { if (!ready || state.cycle <= 1) return; state.cycle--; save(); render(); };
cycleNext.onclick = () => { if (!ready || state.cycle >= state.maxCycle) return; state.cycle++; save(); render(); };
function renderTabs() {
  dayTabs.innerHTML = '';
  DAYS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === state.day && view === 'workout' ? ' active' : '');
    b.textContent = d.name;
    b.onclick = () => { if (!ready) return; state.day = i; view = 'workout'; save(); render(); };
    dayTabs.appendChild(b);
  });
}
function renderBanner() {
  if (ready && view === 'workout' && state.week === 6 && state.cycle === state.maxCycle) {
    cycleBanner.innerHTML = `<div class="cycle-banner"><span>A ${state.cycle}. ciklus utolsó hete. Ha végeztél, indíts újat – az eddigi eredmények megmaradnak.</span><button class="primary" id="newCycleBtn">ÚJ CIKLUS</button></div>`;
    $('newCycleBtn').onclick = startNewCycle;
  } else cycleBanner.innerHTML = '';
}
function renderHistoryBtn() {
  let b = $('historyBtn');
  if (!b) { b = document.createElement('button'); b.id = 'historyBtn'; b.className = 'ghost'; dayTabs.after(b); }
  b.textContent = view === 'history' ? '← EDZÉS' : '📈 FEJLŐDÉS';
  b.onclick = () => { if (!ready) return; view = view === 'history' ? 'workout' : 'history'; render(); window.scrollTo(0, 0); };
}
function startNewCycle() {
  const n = state.maxCycle + 1;
  if (!confirm(`Indul a ${n}. ciklus az 1. héttel.\n\nAz eddigi ciklus(ok) minden adata megmarad, és a ciklusváltó nyilakkal, illetve a FEJLŐDÉS oldalon visszanézhető.\n\nFolytatod?`)) return;
  lsSet(SNAP_PREFIX + today() + '-ciklus' + state.maxCycle, JSON.stringify(state));
  state.layouts[lkey(n, 1)] = clone(layoutFor(state.maxCycle, 6));
  state.maxCycle = n; state.cycle = n; state.week = 1; state.day = 0; view = 'workout';
  save(); render(); window.scrollTo(0, 0);
  toast(`${n}. ciklus elindult. Sok sikert!`);
}

function renderWorkout() {
  if (!ready) { workout.innerHTML = '<div class="note">Adatok betöltése…</div>'; return; }
  const c = state.cycle, w = state.week, d = state.day, day = DAYS[d], slots = curSlots();
  let h = `<div class="eyebrow">${cycLabel(c)}DAY ${d + 1} · 2 WORKING SETS / EXERCISE</div><div class="day-name">${day.name}</div><div class="day-meta">${day.subtitle} · Failure / RIR 0–1</div>`;
  slots.forEach((slot, e) => {
    const vi = variantIndex(c, w, d, slot), v = slot.variants[vi], name = v.name, id = exId(name);
    const rec = recordFor(c, w, d, name), last = latestBefore(c, w, d, name);
    const sets = rec?.sets || [emptySet(), emptySet()], wu = rec?.warmup || emptySet(), pb = personalBest(id);
    h += `<article class="exercise"><div class="exercise-head"><div><div class="exercise-title">${esc(name)}</div>${v.hu ? `<div class="exercise-hu">${esc(v.hu)}</div>` : ''}<div class="prescribed">${esc(slot.reps)}</div></div><button class="swap-btn" data-swap data-e="${e}">CSERE</button></div>`;
    if (slot.variants.length > 1) {
      const other = slot.variants[1 - vi];
      h += `<div class="variant-row"><span class="variant-tag">VÁLTAKOZÓ</span><button class="variant-btn" data-variant data-e="${e}">↔ Ezen a héten inkább: ${esc(other.name)}</button></div>`;
    }
    if (pb) h += `<div class="record-badge">🏆 SZEMÉLYES REKORD · ${showNum(pb.weight)} kg × ${showNum(pb.reps)} · ${state.maxCycle > 1 ? pb.c + '. ciklus, ' : ''}${pb.w}. hét</div>`;
    if (last) h += `<div class="history"><div>LEGUTÓBBI ALKALOM · ${cycLabel(last.c)}${last.w}. HÉT · ${DAYS[last.d]?.name || ''}</div><strong>Warm-up: ${esc(showNum(last.warmup?.weight)) || '—'} kg × ${esc(showNum(last.warmup?.reps)) || '—'} · S1: ${esc(showNum(last.sets?.[0]?.weight)) || '—'} kg × ${esc(showNum(last.sets?.[0]?.reps)) || '—'} · S2: ${esc(showNum(last.sets?.[1]?.weight)) || '—'} kg × ${esc(showNum(last.sets?.[1]?.reps)) || '—'}</strong></div>`;
    h += `<div class="sets"><div class="set-labels"><span>SET</span><span>KG</span><span>REPS</span><span></span></div>`;
    h += setRowHtml('W', e, wu, 'warmup');
    for (let s = 0; s < 2; s++) h += setRowHtml(String(s + 1), e, sets[s] || emptySet(), 'work', s);
    h += `</div><div class="last">Bemelegítő szett után: <strong>1:00</strong> · Munkasorozat után: <strong>2:30</strong></div></article>`;
  });
  if (!slots.length) h += '<div class="note">Ezen a napon nincs gyakorlat. Adj hozzá egyet!</div>';
  h += '<button class="add-ex-btn" id="addExBtn">+ ÚJ GYAKORLAT HOZZÁADÁSA</button>';
  h += '<div class="note">A CSERE gombbal a gyakorlat ettől a héttől egy új gyakorlatra cserélhető, saját előzményekkel. A régi gyakorlat adatai megmaradnak a FEJLŐDÉS oldalon.</div>';
  workout.innerHTML = h;
  bindInputs();
}
function setRowHtml(label, e, v, kind, s = 0) {
  const wu = kind === 'warmup', done = !!v.done;
  return `<div class="set-row ${wu ? 'warmup-row' : ''}" data-e="${e}" data-s="${s}"><div class="set-num">${label}</div><input inputmode="decimal" data-type="weight" data-kind="${kind}" data-e="${e}" data-s="${s}" value="${esc(showNum(v.weight || ''))}" placeholder="kg" aria-label="${label} súly"><input inputmode="numeric" data-type="reps" data-kind="${kind}" data-e="${e}" data-s="${s}" value="${esc(showNum(v.reps || ''))}" placeholder="reps" aria-label="${label} ismétlés"><button class="complete ${done ? 'checked' : ''}" data-done data-kind="${kind}" data-e="${e}" data-s="${s}">${done ? '✓' : '○'}</button></div>`;
}
function bindInputs() {
  workout.querySelectorAll('.set-row input').forEach(inp => inp.oninput = () => {
    const slot = curSlots()[+inp.dataset.e]; if (!slot) return;
    lockVariant(slot);
    const s = +inp.dataset.s, r = ensureRecord(state.cycle, state.week, state.day, slotName(state.cycle, state.week, state.day, slot));
    const v = inp.dataset.kind === 'warmup' ? r.warmup : r.sets[s];
    v[inp.dataset.type] = cleanNum(inp.value); v.done = false; v.ts = Date.now(); r.ts = Date.now();
    if (positive(inp.value)) inp.classList.remove('invalid');
    const btn = inp.closest('.set-row').querySelector('[data-done]');
    btn.classList.remove('checked'); btn.textContent = '○';
    save();
  });
  workout.querySelectorAll('[data-done]').forEach(btn => btn.onclick = () => {
    unlockAudio();
    const slot = curSlots()[+btn.dataset.e]; if (!slot) return;
    const s = +btn.dataset.s, kind = btn.dataset.kind, name = slotName(state.cycle, state.week, state.day, slot);
    const ins = btn.closest('.set-row').querySelectorAll('input');
    const existing = recordFor(state.cycle, state.week, state.day, name);
    const cur = existing ? (kind === 'warmup' ? existing.warmup : existing.sets[s]) : null;
    if (cur?.done) { cur.done = false; save(); renderWorkout(); return; }
    let invalid = false;
    ins.forEach(inp => { if (!positive(inp.value)) { inp.classList.add('invalid'); invalid = true; } else inp.classList.remove('invalid'); });
    if (invalid) { toast('Add meg a súlyt és az ismétlésszámot pozitív számként!'); return; }
    lockVariant(slot);
    const r = ensureRecord(state.cycle, state.week, state.day, name), v = kind === 'warmup' ? r.warmup : r.sets[s];
    v.weight = cleanNum(ins[0].value); v.reps = cleanNum(ins[1].value); v.done = true; v.ts = Date.now(); r.ts = Date.now();
    save(); renderWorkout(); renderWeeks();
    startTimer(name, kind === 'warmup' ? 'warmup' : 'work');
  });
  workout.querySelectorAll('[data-variant]').forEach(btn => btn.onclick = () => {
    const slot = curSlots()[+btn.dataset.e]; if (!slot) return;
    const vi = variantIndex(state.cycle, state.week, state.day, slot);
    state.variantChoice[`${state.cycle}-${state.week}-${slot.uid}`] = 1 - vi;
    save(); renderWorkout();
    toast(`Ezen a héten: ${slot.variants[1 - vi].name}`);
  });
  workout.querySelectorAll('[data-swap]').forEach(btn => btn.onclick = () => openEditor('edit', +btn.dataset.e));
  $('addExBtn').onclick = () => openEditor('add');
}

/* ---------- gyakorlat csere / új gyakorlat ---------- */
let editCtx = null;
function openEditor(mode, e) {
  const slot = mode === 'edit' ? curSlots()[e] : null;
  if (mode === 'edit' && !slot) return;
  editCtx = { mode, uid: slot?.uid, c: state.cycle, w: state.week, d: state.day };
  $('editEyebrow').textContent = mode === 'edit' ? 'GYAKORLAT CSERE' : 'ÚJ GYAKORLAT';
  $('editTitle').textContent = `${DAYS[state.day].name} · ${cycLabel(state.cycle)}${state.week}. héttől`;
  $('editName').value = slot ? slot.variants[0].name : '';
  $('editHu').value = slot ? (slot.variants[0].hu || '') : '';
  $('editReps').value = slot ? slot.reps : '2 × 8–10';
  $('editAlt').value = slot?.variants[1]?.name || '';
  $('editHelp').textContent = mode === 'edit'
    ? 'Új név = új gyakorlat, saját, üres előzményekkel. A régi gyakorlat eddigi adatai megmaradnak és a FEJLŐDÉS oldalon visszanézhetők. A változás ettől a héttől érvényes, a korábbi hetek nem változnak, és a többi edzésnapot sem érinti.'
    : 'A gyakorlat ettől a héttől kerül be erre az edzésnapra. Ha egy már létező nevet adsz meg, annak előzményeit folytatja.';
  $('editRemove').classList.toggle('hidden', mode !== 'edit');
  $('editOverlay').classList.remove('hidden');
}
function closeEditor() { $('editOverlay').classList.add('hidden'); editCtx = null; }
$('editCancel').onclick = closeEditor;
$('editForm').onsubmit = ev => {
  ev.preventDefault();
  if (!editCtx || !ready) return;
  const name = $('editName').value.trim().replace(/\s+/g, ' '), hu = $('editHu').value.trim(), reps = $('editReps').value.trim() || '2 × 8–10', alt = $('editAlt').value.trim().replace(/\s+/g, ' ');
  if (!name || !exId(name)) { $('editName').classList.add('invalid'); toast('A gyakorlat neve nem lehet üres.'); return; }
  if (alt && exId(alt) === exId(name)) { toast('A váltakozó gyakorlat neve legyen más.'); return; }
  const { mode, uid, c, w, d } = editCtx;
  const variants = [{ name, hu }];
  if (alt) {
    const prevAlt = mode === 'edit' ? layoutFor(c, w)[d].find(s => s.uid === uid)?.variants[1] : null;
    variants.push({ name: alt, hu: prevAlt && exId(prevAlt.name) === exId(alt) ? prevAlt.hu : (exId(alt) === exId(INCLINE.name) ? INCLINE.hu : '') });
  }
  if (mode === 'add') {
    const nu = newUid();
    applyFrom(c, w, L => { L[d].push({ uid: nu, reps, variants: clone(variants) }); });
  } else {
    applyFrom(c, w, L => { const s = L[d].find(x => x.uid === uid); if (s) { s.variants = clone(variants); s.reps = reps; } });
  }
  closeEditor(); save(); render();
  toast(mode === 'add' ? 'Új gyakorlat hozzáadva.' : 'Gyakorlatcsere elmentve. A korábbi adatok megmaradtak.');
};
$('editRemove').onclick = () => {
  if (!editCtx) return;
  const { uid, c, w, d } = editCtx;
  if (!confirm(`Eltávolítod ezt a gyakorlatot a(z) ${DAYS[d].name} napról a ${w}. héttől?\n\nAz eddigi adatai nem törlődnek, a FEJLŐDÉS oldalon megmaradnak.`)) return;
  applyFrom(c, w, L => { L[d] = L[d].filter(x => x.uid !== uid); });
  closeEditor(); save(); render();
  toast('Gyakorlat eltávolítva erről a napról.');
};

/* ---------- fejlődés ---------- */
function renderHistory() {
  const c = state.cycle, w = state.week, L = layoutFor(c, w);
  let h = `<div class="eyebrow">PROGRESS & WEEKLY SUMMARY</div><div class="day-name">FEJLŐDÉS</div><div class="day-meta">Személyes rekordok, heti teljesítés és gyakorlatonkénti előzmények.</div>`;
  const rows = DAYS.map((day, d) => {
    let done = 0; const total = (L[d] || []).length * 2;
    for (const slot of (L[d] || [])) { const r = recordFor(c, w, d, slotName(c, w, d, slot)); done += (r?.sets || []).slice(0, 2).filter(s => s?.done).length; }
    return { name: day.name, done, total };
  });
  const started = rows.filter(x => x.done > 0).length, finished = rows.filter(x => x.total > 0 && x.done >= x.total).length;
  const doneSets = rows.reduce((a, x) => a + x.done, 0), allSets = rows.reduce((a, x) => a + x.total, 0);
  h += `<section class="summary-card"><div class="summary-title">${cycLabel(c)}${w}. HÉT ÖSSZESÍTŐ</div><div class="summary-stats three"><div><strong>${started}/4</strong><span>edzésnap elkezdve</span></div><div><strong>${finished}/4</strong><span>edzésnap kész</span></div><div><strong>${doneSets}/${allSets}</strong><span>munkasorozat kész</span></div></div>${rows.map(x => `<div class="summary-row"><span>${x.name}</span><b>${x.done}/${x.total} szett${x.total && x.done >= x.total ? ' ✓' : ''}</b></div>`).join('')}</section>`;

  const active = [];
  L.forEach(day => day.forEach(slot => slot.variants.forEach(v => { const id = exId(v.name); if (!active.includes(id)) active.push(id); })));
  const archived = Object.keys(state.exercises).filter(id => !active.includes(id) && Object.values(state.exercises[id].occurrences || {}).some(hasData)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  h += `<div class="history-section">JELENLEGI GYAKORLATOK</div>` + active.map(historyGroup).join('');
  if (archived.length) h += `<div class="history-section">LECSERÉLT / KORÁBBI GYAKORLATOK</div>` + archived.map(historyGroup).join('');

  h += `<div class="history-section">CIKLUS</div><div class="cycle-banner"><span>${state.maxCycle > 1 ? `${state.maxCycle} ciklus rögzítve. Váltás a fenti ‹ › nyilakkal.` : 'Új 6 hetes ciklus indításakor a mostani eredmények megmaradnak.'}</span><button class="primary" id="newCycleBtn2">ÚJ CIKLUS</button></div>`;
  h += '<div class="history-actions"><button id="exportBtn" class="secondary">BIZTONSÁGI MENTÉS FÁJLBA</button><label class="secondary import-label">MENTÉS BETÖLTÉSE<input id="importInput" type="file" accept=".json,application/json" hidden></label></div>';
  const snaps = snapKeys();
  if (snaps.length) {
    h += `<details class="history-group"><summary>Automatikus helyi másolatok (${snaps.length})</summary><div class="progress-ex">${snaps.map(k => `<div class="snap-row"><span>${esc(snapLabel(k))}</span><button class="secondary" data-snap="${esc(k)}">LETÖLTÉS</button></div>`).join('')}<div class="empty">A letöltött fájl a MENTÉS BETÖLTÉSE gombbal visszatölthető.</div></div></details>`;
  }
  h += `<div class="note">Az alkalmazás minden változást azonnal ment, és naponta külön helyi másolatot is készít. A fájlba mentés külön, letölthető másolatot ad. IRONLOG ${APP_VERSION}</div>`;
  workout.innerHTML = h;
  $('exportBtn').onclick = () => exportData(state, `ironlog-backup-${today()}.json`);
  $('importInput').onchange = e => importData(e.target.files[0]);
  $('newCycleBtn2').onclick = startNewCycle;
  workout.querySelectorAll('[data-snap]').forEach(b => b.onclick = () => { try { const raw = localStorage.getItem(b.dataset.snap); if (raw) exportData(JSON.parse(raw), `${b.dataset.snap}.json`); } catch (e) { toast('A másolat nem olvasható.'); } });
}
function snapLabel(k) {
  if (k === PRE_V6_KEY) return 'A v9 frissítés előtti állapot';
  if (k.startsWith(PRE_IMPORT_PREFIX)) return 'Betöltés előtti állapot · ' + k.slice(PRE_IMPORT_PREFIX.length);
  return 'Napi másolat · ' + k.slice(SNAP_PREFIX.length);
}
function historyGroup(id) {
  const pb = personalBest(id);
  const rows = Object.entries(state.exercises[id]?.occurrences || {}).filter(([, r]) => hasData(r)).map(([k, r]) => { const [c, w, d] = k.split('-').map(Number); return { c, w, d, r, p: pos(c, w, d) }; }).sort((a, b) => a.p - b.p);
  let h = `<details class="history-group"><summary>${esc(nameOf(id))} ${pb ? `<span class="small-record">🏆 ${showNum(pb.weight)} kg × ${showNum(pb.reps)}</span>` : ''}</summary><div class="progress-ex">`;
  if (!rows.length) h += '<div class="empty">Még nincs adat.</div>';
  for (const { c, w, d, r } of rows) {
    const f = s => `${esc(showNum(s?.weight)) || '—'} × ${esc(showNum(s?.reps)) || '—'}`;
    h += `<div class="progress-row four"><b>${state.maxCycle > 1 ? `C${c} ` : ''}W${w} ${(DAYS[d]?.name || '').replace('UPPER ', 'U').replace('LOWER ', 'L')}</b><span>WU: ${f(r.warmup)}</span><span>S1: ${f(r.sets?.[0])}</span><span>S2: ${f(r.sets?.[1])}</span></div>`;
  }
  return h + '</div></details>';
}

/* ---------- export / import ---------- */
function exportData(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Biztonsági mentés letöltése elindult.');
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = async () => {
    let x; try { x = JSON.parse(r.result); } catch (e) { toast('Érvénytelen mentési fájl.'); return; }
    if (!x || (!x.logs && !x.exercises)) { toast('Érvénytelen mentési fájl.'); return; }
    if (!confirm('A betöltés lecseréli a jelenlegi adatokat.\n\nA mostani állapotról automatikus helyi másolat készül (FEJLŐDÉS → Automatikus helyi másolatok), így visszahozható.\n\nFolytatod?')) return;
    try {
      lsSet(PRE_IMPORT_PREFIX + new Date().toISOString().slice(0, 19).replace('T', ' '), JSON.stringify(state)); pruneSnaps();
      state = migrate(x); await save(); view = 'workout'; render(); toast('Adatok sikeresen importálva.');
    } catch (e) { toast('A betöltés nem sikerült, az adataid változatlanok.'); }
  };
  r.readAsText(file);
}

/* ---------- pihenőidőzítő ---------- */
let actx = null, wakeLock = null;
function unlockAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!actx && AC) actx = new AC(); if (actx?.state === 'suspended') actx.resume(); } catch (e) {}
}
function beep() {
  try {
    if (!actx) return; if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + 0.05;
    [0, 0.28, 0.56].forEach((o, i) => {
      const osc = actx.createOscillator(), g = actx.createGain();
      osc.type = 'sine'; osc.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t + o); g.gain.exponentialRampToValueAtTime(0.5, t + o + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.22);
      osc.connect(g); g.connect(actx.destination); osc.start(t + o); osc.stop(t + o + 0.25);
    });
  } catch (e) {}
}
async function requestWake() { try { if ('wakeLock' in navigator && !wakeLock && !document.hidden) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; } }
function releaseWake() { try { wakeLock?.release(); } catch (e) {} wakeLock = null; }
function persistTimer() { try { if (timerEnd) localStorage.setItem(TIMER_KEY, JSON.stringify({ end: timerEnd, kind: timerKind, ex: timerEx })); else localStorage.removeItem(TIMER_KEY); } catch (e) {} }
function startTimer(ex, kind = 'work') {
  timerKind = kind; timerEx = ex;
  timerEnd = Date.now() + (kind === 'warmup' ? 60 : 150) * 1000;
  persistTimer(); showTimer();
}
function showTimer() {
  timerExercise.textContent = `${timerEx} · ${timerKind === 'warmup' ? 'bemelegítő szett után' : 'következő munkasorozat előtt'}`;
  timerOverlay.classList.remove('hidden');
  clearInterval(timer); tickTimer(); timer = setInterval(tickTimer, 250);
  requestWake();
}
function tickTimer() {
  if (!timerEnd) return;
  seconds = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  updateTimer();
  if (seconds <= 0) finishTimer(true);
}
function finishTimer(notify) {
  clearInterval(timer); timer = null; timerEnd = 0; persistTimer();
  timerOverlay.classList.add('hidden'); releaseWake();
  if (notify) { beep(); try { navigator.vibrate?.([300, 150, 300]); } catch (e) {} toast('Pihenő vége — mehet a következő szett!'); }
}
function updateTimer() { timerValue.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function restoreTimer() {
  try {
    const t = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null');
    if (!t || !t.end) return;
    if (t.end > Date.now()) { timerEnd = t.end; timerKind = t.kind || 'work'; timerEx = t.ex || ''; showTimer(); }
    else { localStorage.removeItem(TIMER_KEY); if (Date.now() - t.end < 15 * 60 * 1000) toast('A pihenőidő lejárt, amíg nem voltál itt.'); }
  } catch (e) {}
}
skipTimer.onclick = () => finishTimer(false);
add30.onclick = () => { if (!timerEnd) return; timerEnd += 30000; persistTimer(); tickTimer(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && timerEnd) { unlockAudio(); tickTimer(); if (timerEnd) requestWake(); } });
window.addEventListener('pageshow', () => { if (timerEnd) tickTimer(); });

/* ---------- egyéb ---------- */
let toastTimer = null;
function toast(t) { const x = $('toast'); x.textContent = t; x.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => x.classList.remove('show'), 2600); }
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden'); });
installBtn.onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.classList.add('hidden'); } };
window.addEventListener('error', () => { try { toast('Hiba történt. Ha valami nem jelenik meg, indítsd újra az alkalmazást.'); } catch (e) {} });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
load().then(() => { render(); restoreTimer(); }).catch(() => {
  // Ha a betöltés váratlanul elakad, NEM írunk felül semmit (ready=false marad).
  workout.innerHTML = '<div class="note">Az adatok betöltése nem sikerült. Zárd be teljesen az alkalmazást, és nyisd meg újra. Az adataid nem törlődtek.</div>';
});
