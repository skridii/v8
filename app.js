'use strict';
/* IRONLOG v9
   Adatmodell: state.version 6
   - occurrences kulcs: "ciklus-hét-nap" (v5-ben "hét-nap" volt → migráció az 1. ciklusba)
   - layouts: "ciklus-hét" → 4 nap gyakorlatlistája; a módosítás attól a héttől érvényes
   - variantChoice: váltakozó gyakorlatoknál (pl. Bench / Incline) az adott heti választás
   Adatbázis neve, store, kulcs és a localStorage kulcsok változatlanok. */
const APP_VERSION = 'v35';

const DAYS = [
  { name: 'LOWER 1', subtitle: 'Deadlift & Quadriceps Focus' },
  { name: 'UPPER 1', subtitle: 'Chest & Back Thickness' },
  { name: 'LOWER 2', subtitle: 'Quadriceps, Hamstring & Soleus Focus' },
  { name: 'UPPER 2', subtitle: 'Shoulders & Lat Width Focus' }
];

/* A régi (v9 előtti) alapprogram – csak a régi mentések átalakításához kell (indexek szerinti névpárosítás). NE módosítsd! */
const LEGACY_PROGRAM = [
{name:'LOWER 1',subtitle:'Deadlift & Quadriceps Focus',ex:[
['Conventional Deadlift','Sima Felhúzás','2 × 5–7'],['Hack Squat','Hack Guggolás Gépen','2 × 6–8'],['Machine Ab Crunch','Gépes hasprés gépen','2 × 10–15'],['Machine Hip Adduction','Csípő Addukció Gépen','2 × 10–12'],['Standing Calf Raise','Álló Vádli Gépen','2 × 8–10'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 1',subtitle:'Chest & Back Thickness',ex:[
['Bench Press','Fekvenyomás','2 × 6–8'],['Chest-Supported Row','Mellkassal támasztott Evezés','2 × 6–8'],['Straight-Arm Lat Pulldown','Egyeneskaros Lehúzás','2 × 8–10'],['Lateral Raise','Oldalemelés','2 × 10–12'],['Rear Delt Fly','Hátsó Váll Tárogatás','2 × 10–12'],['Scott Bench Preacher Curl','Scott Pados Bicepsz','2 × 8–10'],['Cable Rope Triceps Pushdown','Csigás Kötél Tricepsz','2 × 8–10']]},
{name:'LOWER 2',subtitle:'Quadriceps, Hamstring & Soleus Focus',ex:[
['Smith Machine Bulgarian Split Squat','Smith Bolgár Guggolás','2 × 8–10 / láb'],['Seated Hamstring Curl','Ülő Combhajlítás','2 × 8–10'],['Leg Extension','Láb Extenzió','2 × 10–12'],['Seated Calf Raise','Ülő Vádli Gépen','2 × 10–12'],['Hanging Leg Raise','Függeszkedős Has','2 × 10–12'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 2',subtitle:'Shoulders & Lat Width Focus',ex:[
['Smith Machine Overhead Shoulder Press','Smith Vállból Nyomás','2 × 6–8'],['Wide-Grip Lat Pulldown','Széles Lehúzás Csigán','2 × 8–10'],['Chest Fly','Mell Tárogatás / Pec Deck','2 × 8–10'],['High Row Machine','Gépes magas evezés / High Row','2 × 8–10'],['Alternating Dumbbell Biceps Curl','Váltott Karú Bicepsz','2 × 8–10'],['Single-Arm Overhead Cable Triceps Extension','1 Kezes Fejfeletti Tricepsz','2 × 8–10']]}
];
/* Alap edzésterv az új felhasználóknak (v31-től: Ádám 2026-11 programja).
   [név, magyar név, ismétlés, szettszám]. A meglévő felhasználók saját tervét NEM érinti. */
const PROGRAM = [
{name:'LOWER 1',subtitle:'Deadlift & Quadriceps Focus',ex:[
['Conventional Deadlift','Sima Felhúzás','2 × 5–7',2],['Hack Squat','Hack Guggolás Gépen','2 × 6–8',2],['Machine Ab Crunch','Gépes hasprés gépen','1 × 10–15',1],['Machine Hip Adduction','Csípő Addukció Gépen','2 × 10–12',2],['Standing Calf Raise','Álló Vádli Gépen','2 × 8–10',2],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15',2],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15',2]]},
{name:'UPPER 1',subtitle:'Chest & Back Thickness',ex:[
['Bench Press','Fekvenyomás','2 × 6–8',2],['Chest-Supported Row','Mellkassal támasztott evezés – csípő felé húzva','2 × 6–8',2],['Machine Lateral Raise','Gépes Oldalemelés','2 × 10–12',2],['Reverse Pec Deck','Hátsó Váll Pec Deck Gépen','2 × 10–12',2],['Machine Preacher Curl','Gépes Scott Bicepsz (csigás)','2 × 8–10',2],['Cable Rope Triceps Pushdown','Csigás Kötél Tricepsz','2 × 8–10',2],['Single-Arm Sagittal Pulldown','Szagittális Lehúzás Egy Kézzel Gépen','1 × 8–10',1]]},
{name:'LOWER 2',subtitle:'Quadriceps, Hamstring & Soleus Focus',ex:[
['Smith Machine Bulgarian Split Squat','Smith Bolgár Guggolás','2 × 8–10 / láb',2],['Lying Hamstring Curl','Fekvő Combhajlítás','2 × 8–10',2],['Leg Extension','Láb Extenzió','2 × 10–12',2],['Seated Calf Raise','Ülő Vádli Gépen','2 × 10–12',2],['Hanging Oblique Leg Raise','Függeszkedős Oldalsó Lábemelés (oldalanként)','2 × 10–12',2],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15',2],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15',2]]},
{name:'UPPER 2',subtitle:'Shoulders & Lat Width Focus',ex:[
['Smith Machine Overhead Shoulder Press','Smith Vállból Nyomás','2 × 6–8',2],['Pull Up','Húzódzkodás','2 × 8–10',2],['Chest Fly','Mell Tárogatás / Pec Deck','2 × 8–10',2],['Cable High Row','Magas Evezés Csigán','2 × 8–10',2],['Alternating Dumbbell Biceps Curl','Váltott Karú Bicepsz','2 × 8–10',2],['Overhead Cable Triceps Extension','Fejfeletti Tricepsz Csigán (2 kézzel)','2 × 8–10',2]]}
];
const INCLINE = { name: 'Incline Bench Press', hu: 'Ferde Fekvenyomás' };

// A legrégebbi (v1–v3, "logs" formátumú) mentések programja: ott a LOWER 1 3. gyakorlata
// Leg Extension, az UPPER 2 4. gyakorlata Cable Face Pull volt. Így ezek az adatok
// a saját nevük alatt maradnak, nem keverednek az Ab Crunch / High Row adataival.
const LEGACY_NAMES = LEGACY_PROGRAM.map(d => d.ex.map(x => x[0]));
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
const slotSets = slot => Math.max(1, Number(slot?.sets) || 2);
/* Hány munkasorozat látszik/számít: a beállított szám, vagy több, ha ténylegesen beírtál több szettet.
   Az üres (csak kitöltő) szettek nem számítanak – így a „− SZETT” újraindítás után is megmarad. */
const setFilled = x => !!x && (x.done || cleanNum(x.weight ?? '') !== '' || cleanNum(x.reps ?? '') !== '');
function setCount(slot, r) { let n = 0; (r?.sets || []).forEach((x, i) => { if (setFilled(x)) n = i + 1; }); return Math.max(slotSets(slot), n); }
const showReps = slot => String(slot?.reps || '').replace(/^\s*\d+\s*×/, `${slotSets(slot)} ×`);
function padSets(r, n) { while (r.sets.length < n) r.sets.push(emptySet()); return r; }
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
/* Új felhasználó: az aktuális alapterv. Régi mentés átalakítása (legacy = true): a régi program, mert ott
   az egyedi nevek („nap-sorszám”) a régi sorrendre hivatkoznak. */
function defaultLayout(exerciseNames = {}, legacy = false) {
  return (legacy ? LEGACY_PROGRAM : PROGRAM).map((day, d) => day.ex.map((x, e) => {
    const custom = exerciseNames[`${d}-${e}`];
    const name = custom || x[0];
    const slot = { uid: `d${d}e${e}`, reps: x[2], variants: [{ name, hu: custom && custom !== x[0] ? '' : x[1] }] };
    if (x[3] && x[3] !== 2) slot.sets = x[3];
    if (name === 'Bench Press') slot.variants.push({ ...INCLINE });
    return slot;
  }));
}
function blankState() {
  return { version: 6, cycle: 1, maxCycle: 1, week: 1, day: 0, exercises: {}, layouts: { '1-1': defaultLayout() }, variantChoice: {}, names: {}, library: {}, exerciseNames: {}, savedAt: 0 };
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
  state.library = state.library || {};
  for (const L of Object.values(state.layouts)) for (const day of L) for (const slot of day) for (const v of slot.variants) {
    const id = exId(v.name);
    if (!state.names[id]) state.names[id] = v.name;
    if (!state.library[id]) state.library[id] = { name: v.name, hu: v.hu || '', reps: slot.reps || '2 × 8–10' };
  }
}
/* Gyakorlatlista: minden gyakorlat, ami valaha a programban volt, amit hozzáadtál, vagy amihez adat tartozik. */
function libraryIds() {
  const ids = new Set(Object.keys(state.library || {}));
  for (const [id, obj] of Object.entries(state.exercises)) if (Object.values(obj.occurrences || {}).some(hasData)) ids.add(id);
  return [...ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'hu'));
}
function libMeta(id) { const m = state.library?.[id]; return { name: m?.name || nameOf(id), hu: m?.hu || '', reps: m?.reps || '2 × 8–10' }; }
/* Időrend: az számít, MIKOR csináltad (első készre jelölés ideje), nem a hét/nap sorrendje.
   Így ha felcserélődik két edzés, a „legutóbbi” mindig a ténylegesen utoljára elvégzett. */
function sessionTime(r) {
  if (!r) return 0;
  if (r.doneAt) return r.doneAt;
  const ts = [r.warmup, ...(r.sets || [])].filter(x => x?.done && x.ts > 1e12).map(x => x.ts);
  return ts.length ? Math.min(...ts) : (r.ts > 1e12 ? r.ts : 0);
}
const anyDone = r => !!r && (r.warmup?.done || (r.sets || []).some(s => s?.done));
function sessionsOf(id) {
  return Object.entries(state.exercises[id]?.occurrences || {}).filter(([, r]) => hasData(r)).map(([k, r]) => {
    const [c, w, d] = k.split('-').map(Number);
    return { k, r, c, w, d, p: pos(c, w, d), t: sessionTime(r) };
  }).sort((a, b) => (a.t - b.t) || (a.p - b.p));
}
const later = (a, b) => (a.t - b.t) || (a.p - b.p);
function lastDone(id) {
  const list = sessionsOf(id).filter(x => anyDone(x.r));
  const x = list[list.length - 1];
  return x ? { ...x.r, c: x.c, w: x.w, d: x.d, t: x.t } : null;
}
/* Hevy-ből importált edzések a 0. „ciklusban” vannak (kulcs: 0-sorszám-0) – ezeket dátummal jelöljük, nem héttel. */
const isImported = c => Number(c) === 0;
function weekShort(c, w, t) { return isImported(c) ? `Hevy${t ? ', ' + fmtDate(t) : ''}` : `${cycLabel(c).toLowerCase()}${w}. hét`; }
function sessLabel(c, w, d, r) { return isImported(c) ? `HEVY${r?.title ? ' · ' + r.title : ''}` : `${cycLabel(c)}${w}. HÉT · ${DAYS[d]?.name || ''}`; }
function setsText(r, sep = ' · ', withKg = true) {
  const f = s => s && (s.weight || s.reps) ? `${showNum(s.weight) || '—'}${withKg ? ' kg' : ''} × ${showNum(s.reps) || '—'}` : '—';
  return (r?.sets || []).map((x, i) => [x, i]).filter(([x]) => setFilled(x)).map(([x, i]) => `S${i + 1} ${f(x)}`).join(sep) || '—';
}
function lastSummary(id) {
  const l = lastDone(id); if (!l) return 'Még nincs rögzített adat';
  const f = s => s?.done ? `${showNum(s.weight)} kg × ${showNum(s.reps)}` : '—';
  return `Legutóbb (${weekShort(l.c, l.w, l.t)}): ${(l.sets || []).map((x, i) => [x, i]).filter(([x]) => setFilled(x)).map(([x, i]) => `S${i + 1} ${f(x)}`).join(' · ') || '—'}`;
}
function daysWith(id, c, w) { return layoutFor(c, w).map((day, d) => day.some(s => s.variants.some(v => exId(v.name) === id)) ? DAYS[d].name : null).filter(Boolean); }
/* Napi megmozgatott súly: minden kész szett súly × ismétlés az adott edzésnapon. */
function dayVolume(c, w, d) {
  let work = 0, warm = 0; const k = okey(c, w, d);
  for (const obj of Object.values(state.exercises)) {
    const r = obj.occurrences?.[k]; if (!r) continue;
    if (r.warmup?.done && positive(r.warmup.weight) && positive(r.warmup.reps)) warm += toNum(r.warmup.weight) * toNum(r.warmup.reps);
    for (const s of (r.sets || [])) if (s?.done && positive(s.weight) && positive(s.reps)) work += toNum(s.weight) * toNum(s.reps);
  }
  return { work, warm, total: work + warm };
}
function prevDayVolume(c, w, d) {
  for (let p = pos(c, w) - 4; p >= 0; p -= 4) {
    const cc = Math.floor(p / 24) + 1, ww = Math.floor((p % 24) / 4) + 1, v = dayVolume(cc, ww, d);
    if (v.total > 0) return { ...v, c: cc, w: ww };
  }
  return null;
}
const kg = n => (Math.round(n * 10) / 10).toLocaleString('hu-HU').replace(/[\u00a0\u202f]/g, ' ');
function nameOf(id) { return state.names?.[id] || prettyId(id); }

/* Váltakozó gyakorlat: az adott hét választása, alapból mindig az előző alkalom ellentéte. */
function variantIndex(c, w, d, slot) {
  if (!slot.variants || slot.variants.length < 2) return 0;
  const ch = state.variantChoice?.[`${c}-${w}-${slot.uid}`];
  if (ch === 0 || ch === 1) return ch;
  let best = null, bestI = -1;
  slot.variants.forEach((v, i) => {
    for (const x of sessionsOf(exId(v.name))) {
      if (x.k === okey(c, w, d) || !anyDone(x.r)) continue;
      if (!best || later(x, best) > 0) { best = x; bestI = i; }
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
  const k = okey(c, w, d), list = sessionsOf(exId(name));
  const cur = list.find(x => x.k === k);
  // Ha ezt az alkalmat már elkezdted, az ennél korábbi a „legutóbbi”; ha még nem, akkor a legfrissebb.
  const ref = cur && anyDone(cur.r) ? cur : null;
  let best = null;
  for (const x of list) {
    if (x.k === k || !anyDone(x.r)) continue;
    if (ref && later(x, ref) >= 0) continue;
    if (!best || later(x, best) > 0) best = x;
  }
  return best ? { ...best.r, c: best.c, w: best.w, d: best.d, t: best.t } : null;
}
function heavierSet(r) {
  let b = null;
  for (const [i, s] of (r?.sets || []).entries()) {
    if (!s?.done || !(toNum(s.weight) >= 0) || !positive(s.reps)) continue;
    const wt = toNum(s.weight), rp = toNum(s.reps);
    if (!b || wt > b.weight || (wt === b.weight && rp > b.reps)) b = { weight: wt, reps: rp, i };
  }
  return b;
}
const fmtDate = t => t > 1e12 ? new Date(t).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) : '';
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
    s.layouts = { '1-1': defaultLayout(s.exerciseNames, true) };
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
  if (!s.layouts || !Object.keys(s.layouts).length) s.layouts = { '1-1': defaultLayout(s.exerciseNames, true) };
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
    for (const day of [...LEGACY_PROGRAM, ...PROGRAM]) for (const x of day.ex) if (!s.names[exId(x[0])]) s.names[exId(x[0])] = x[0];
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
  if (!ready || stateSwapped) return Promise.resolve(); // betöltés előtt / barát adatainak nézésekor soha nem írunk
  state.version = 6; state.savedAt = Date.now();
  const raw = JSON.stringify(state);
  let ok = true;
  for (const k of LS_WRITE) ok = lsSet(k, raw) && ok;
  saveChain = saveChain.then(() => db ? writeDB(JSON.parse(raw)) : null).catch(() => { ok = false; warnSave(); });
  if (!ok) warnSave();
  scheduleSync();
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
  // Kötelező regisztráció / belépés és testsúly: amíg nincs meg, csak a belépő képernyő (és az INFÓ) érhető el.
  // Első indításkor kötelező az INFÓ elolvasása (eszközönként egyszer), utána belépés + testsúly.
  const mustRead = ready && !infoRead();
  const gated = ready && (mustRead || !auth || !bodyWeight());
  document.body.classList.toggle('gated', gated);
  document.body.classList.toggle('must-read', mustRead);
  if (mustRead) view = 'info';
  if (!gated) { renderWeeks(); renderTabs(); renderHistoryBtn(); renderBanner(); }
  if (gated && view !== 'info') renderGate();
  else if (view === 'history') renderHistory(); else if (view === 'social') renderSocial(); else if (view === 'ranks') renderRanks(); else if (view === 'info') renderInfo(); else renderWorkout();
  const ib = $('infoBtn'); if (ib) { ib.textContent = view === 'info' ? '← EDZÉS' : 'ℹ️ INFÓ'; ib.onclick = () => { if (!ready) return; view = view === 'info' ? 'workout' : 'info'; render(); window.scrollTo(0, 0); }; }
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
/* Ádám programjának pontosítása (amit valójában csinál) – csak az admin fióknál jelenik meg, egyszer.
   Átnevezés MINDEN héten, az eddigi adatok az új név alá kerülnek (ugyanaz a gyakorlat volt, csak más néven). */
const PROGRAM_FIXES = [{ id: 'program2026', items: [
  ['Single-Arm Overhead Cable Triceps Extension', 'Overhead Cable Triceps Extension', 'Fejfeletti Tricepsz Csigán (2 kézzel)'],
  ['Chest-Supported Row', 'Chest-Supported Row', 'Mellkassal támasztott evezés – csípő felé húzva'],
  ['Lateral Raise', 'Machine Lateral Raise', 'Gépes Oldalemelés'],
  ['Scott Bench Preacher Curl', 'Machine Preacher Curl', 'Gépes Scott Bicepsz (csigás)'],
  ['Seated Hamstring Curl', 'Lying Hamstring Curl', 'Fekvő Combhajlítás'],
  ['Hanging Leg Raise', 'Hanging Oblique Leg Raise', 'Függeszkedős Oldalsó Lábemelés (oldalanként)']
] }, { id: 'program2026b', items: [
  ['High Row Machine', 'Cable High Row', 'Magas Evezés Csigán']
] }, { id: 'program2026c', items: [
  ['Rear Delt Fly', 'Reverse Pec Deck', 'Hátsó Váll Pec Deck Gépen'],
  [/s(z)?agit/, 'Single-Arm Sagittal Pulldown', 'Szagittális Lehúzás Egy Kézzel Gépen']   // a saját elnevezésed (pl. „Sagital”)
] }];
// Egy javítás-tétel illeszkedik-e egy gyakorlatnévre (szöveg = pontos név, RegExp = minta a névazonosítóra)
const fixMatch = (x, name) => x[0] instanceof RegExp ? (x[0].test(exId(name)) && exId(name) !== exId(x[1])) : exId(x[0]) === exId(name) && (x[0] !== x[1] || true);
const fixNeeded = (x, v) => x[0] instanceof RegExp ? fixMatch(x, v.name) : (exId(x[0]) === exId(v.name) && (x[0] !== x[1] || v.hu !== x[2]));
const allVariants = () => Object.values(state.layouts).flatMap(L => L.flatMap(day => day.flatMap(sl => sl.variants)));
const pendingFixes = () => PROGRAM_FIXES.filter(f => !state.fixes?.[f.id] && allVariants().some(v => f.items.some(x => fixNeeded(x, v))));
const fixLabel = x => x[0] instanceof RegExp ? `${[...new Set(allVariants().filter(v => fixMatch(x, v.name)).map(v => v.name))].join(', ') || x[1]} → ${x[1]}` : (x[0] === x[1] ? `${x[0]}: ${x[2]}` : `${x[0]} → ${x[1]}`);
function programFixNeeded() {
  return !!me?.is_admin && pendingFixes().length > 0;
}
function renameEverywhere(oldName, newName, hu) {
  const o = exId(oldName), n = exId(newName);
  for (const L of Object.values(state.layouts)) for (const day of L) for (const sl of day) for (const v of sl.variants) if (exId(v.name) === o) { v.name = newName; v.hu = hu; }
  if (o !== n) {
    const src = state.exercises[o];
    if (src) {
      const dst = ensureExercise(n);
      for (const [k, r] of Object.entries(src.occurrences || {})) if (!dst.occurrences[k] || !hasData(dst.occurrences[k])) dst.occurrences[k] = r;
      delete state.exercises[o];
    }
    if (state.rankMap?.[o] !== undefined) { state.rankMap[n] = state.rankMap[n] ?? state.rankMap[o]; delete state.rankMap[o]; }
    if (state.library?.[o]) delete state.library[o];
  }
  state.library = state.library || {};
  state.library[n] = { ...(state.library[n] || {}), name: newName, hu, reps: state.library[n]?.reps || RANK_DB[n]?.reps || '2 × 8–10' };
  state.names[n] = newName;
}
function applyProgramFix(silent) {
  const fixes = pendingFixes(), items = fixes.flatMap(f => f.items);
  if (!items.length) return;
  const list = items.map(x => '• ' + fixLabel(x)).join('\n');
  if (silent !== true && !confirm(`A programod gyakorlatai átnevezésre kerülnek arra, amit valójában csinálsz:\n\n${list}\n\nAz eddigi adataid az új név alá kerülnek (minden héten), semmi nem vész el. Előtte automatikus helyi másolat készül.\n\nMehet?`)) return;
  lsSet(PRE_IMPORT_PREFIX + new Date().toISOString().slice(0, 19).replace('T', ' ') + ' program', JSON.stringify(state)); pruneSnaps();
  for (const x of items) {
    if (x[0] instanceof RegExp) { for (const nm of [...new Set(allVariants().filter(v => fixMatch(x, v.name)).map(v => v.name))]) renameEverywhere(nm, x[1], x[2]); }
    else renameEverywhere(x[0], x[1], x[2]);
  }
  state.fixes = { ...(state.fixes || {}) }; for (const f of fixes) state.fixes[f.id] = Date.now();
  save(); render(); toast('A programod frissítve, az adatok megmaradtak.');
}
function backupDue() {
  try {
    let t = Number(localStorage.getItem(LAST_EXPORT_KEY) || 0);
    if (!t) { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); return 0; }
    const days = Math.floor((Date.now() - t) / 864e5);
    return days >= 7 && !localHasData(state) === false ? days : 0;
  } catch (e) { return 0; }
}
function monthBannerDue() {
  if (new Date().getDate() > 5) return false;
  const pm = monthKey(Date.now()) - 1;
  try { if (Number(localStorage.getItem('ironlog-month-seen')) === pm) return false; } catch (e) {}
  return monthSummary(pm).workouts > 0;
}
function renderBanner() {
  const due = ready && view === 'workout' ? backupDue() : 0;
  if (due && !programFixNeeded()) {
    cycleBanner.innerHTML = `<div class="cycle-banner"><span>💾 ${due} napja nem készült biztonsági mentés fájlba. Egy koppintás, és megvan.</span><button class="primary" id="backupNowBtn">MENTÉS</button></div>`;
    $('backupNowBtn').onclick = () => { exportData(state, `ironlog-backup-${today()}.json`); renderBanner(); };
  } else if (ready && view === 'workout' && programFixNeeded()) {
    cycleBanner.innerHTML = `<div class="cycle-banner"><span>A programod gyakorlatai frissíthetők arra, amit valójában csinálsz (${esc(pendingFixes().flatMap(f => f.items).map(x => x[1]).join(', '))}). Az adatok megmaradnak.</span><button class="primary" id="progFixBtn">FRISSÍTÉS</button></div>`;
    $('progFixBtn').onclick = applyProgramFix;
  } else if (ready && view === 'workout' && monthBannerDue()) {
    const pm = monthKey(Date.now()) - 1;
    cycleBanner.innerHTML = `<div class="cycle-banner"><span>📅 Elkészült a ${HU_MONTHS[pm % 12]}i összefoglalód: ${monthSummary(pm).workouts} edzés, ${kg(monthSummary(pm).vol)} kg.</span><button class="primary" id="monthBtn">MEGNÉZEM</button></div>`;
    $('monthBtn').onclick = () => { try { localStorage.setItem('ironlog-month-seen', String(pm)); } catch (e) {} monthSel = pm; view = 'history'; render(); window.scrollTo(0, 0); };
  } else if (ready && view === 'workout' && state.week === 6 && state.cycle === state.maxCycle) {
    cycleBanner.innerHTML = `<div class="cycle-banner"><span>A ${state.cycle}. ciklus utolsó hete. Ha végeztél, indíts újat – az eddigi eredmények megmaradnak.</span><button class="primary" id="newCycleBtn">ÚJ CIKLUS</button></div>`;
    $('newCycleBtn').onclick = startNewCycle;
  } else cycleBanner.innerHTML = '';
}
function renderHistoryBtn() {
  let row = $('navRow');
  if (!row) {
    row = document.createElement('div'); row.id = 'navRow'; row.className = 'nav-row';
    row.innerHTML = '<button id="historyBtn" class="ghost"></button><button id="ranksBtn" class="ghost"></button><button id="socialBtn" class="ghost"></button>';
    dayTabs.after(row);
  }
  const b = $('historyBtn'), sb = $('socialBtn'), rb = $('ranksBtn');
  b.textContent = view === 'history' ? '← EDZÉS' : '📈 FEJLŐDÉS';
  sb.textContent = view === 'social' ? '← EDZÉS' : '👥 BARÁTOK';
  rb.textContent = view === 'ranks' ? '← EDZÉS' : '🏅 RANGOK';
  rb.onclick = () => { if (!ready) return; view = view === 'ranks' ? 'workout' : 'ranks'; render(); window.scrollTo(0, 0); };
  b.onclick = () => { if (!ready) return; view = view === 'history' ? 'workout' : 'history'; render(); window.scrollTo(0, 0); };
  sb.onclick = () => { if (!ready) return; view = view === 'social' ? 'workout' : 'social'; socialFriend = null; render(); window.scrollTo(0, 0); };
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
  const vol = dayVolume(c, w, d), pv = prevDayVolume(c, w, d);
  h += `<section class="volume-card"><div><div class="eyebrow">MEGMOZGATOTT SÚLY · ${day.name}</div><div class="volume-big">${kg(vol.total)} <small>kg</small></div><div class="volume-sub">Munkasorozatok: ${kg(vol.work)} kg · Bemelegítés: ${kg(vol.warm)} kg</div></div>${pv ? `<div class="volume-prev"><span>Előző ${day.name}</span><b>${kg(pv.total)} kg</b><span>${cycLabel(pv.c).toLowerCase()}${pv.w}. hét</span></div>` : ''}</section>`;
  slots.forEach((slot, e) => {
    const vi = variantIndex(c, w, d, slot), v = slot.variants[vi], name = v.name, id = exId(name);
    const rec = recordFor(c, w, d, name), last = latestBefore(c, w, d, name);
    const sets = rec?.sets || [emptySet(), emptySet()], wu = rec?.warmup || emptySet(), pb = personalBest(id);
    h += `<article class="exercise"><div class="exercise-head"><button class="ex-thumb" data-info="${esc(id)}" data-iname="${esc(name)}" data-ihu="${esc(v.hu || '')}" aria-label="${esc(name)}: animáció és útmutató">${(typeof ANIM3D !== 'undefined' && ANIM3D.thumbHtml(id)) || (typeof ANIM !== 'undefined' ? ANIM.thumb(id) : '?')}</button><div class="ex-main"><button class="exercise-title ex-link" data-stats="${esc(id)}">${esc(name)}</button>${v.hu ? `<div class="exercise-hu">${esc(v.hu)}</div>` : ''}<div class="prescribed">${esc(showReps(slot))}</div></div><div class="head-btns"><button class="swap-btn" data-swap data-e="${e}">CSERE</button></div></div>`;
    const note = state.notes?.[id] || '';
    h += `<button class="ex-note${note ? '' : ' empty-note'}" data-note="${esc(id)}">📝 ${note ? esc(note) : 'Jegyzet a géphez (pl. ülés 4-es, támla 2. lyuk)'}</button>`;
    if (slot.variants.length > 1) {
      const other = slot.variants[1 - vi];
      h += `<div class="variant-row"><span class="variant-tag">VÁLTAKOZÓ</span><button class="variant-btn" data-variant data-e="${e}">↔ Ezen a héten inkább: ${esc(other.name)}</button></div>`;
    }
    const rk = rankOf(id);
    if (rk && rk.pts !== undefined) { h += `<button class="rank-line${flashRankId === id ? ' flash' : ''}" data-stats="${esc(id)}" style="--rc:${rk.color}">${rankBadge(rk)}<div><div class="rl-top"><b style="color:${rk.color}">${esc(rk.label)}</b><em>${esc(oneRmText(rk))}</em></div><div class="rr-bar"><i style="width:${Math.round(rk.pct * 100)}%;background:${rk.color}"></i></div><span>${esc(rankNeedText(rk))}</span></div></button>`; if (flashRankId === id) flashRankId = null; }
    else if (rk?.needBw) h += `<div class="rank-line muted">🏅 Add meg a testsúlyodat a RANGOK fülön, és itt látod a rangodat.</div>`;
    if (pb) h += `<div class="record-badge">🏆 SZEMÉLYES REKORD · ${showNum(pb.weight)} kg × ${showNum(pb.reps)} · ${isImported(pb.c) ? 'Hevy' : (state.maxCycle > 1 ? pb.c + '. ciklus, ' : '') + pb.w + '. hét'}</div>`;
    if (last) h += `<div class="history"><div>LEGUTÓBBI ALKALOM · ${esc(sessLabel(last.c, last.w, last.d, last))}${isImported(last.c) && last.t ? ' · ' + esc(fmtDate(last.t)) : ''}</div><strong>Warm-up: ${esc(showNum(last.warmup?.weight)) || '—'} kg × ${esc(showNum(last.warmup?.reps)) || '—'} · ${esc(setsText(last))}</strong></div>`;
    h += `<div class="sets"><div class="set-labels"><span>SET</span><span>KG</span><span>REPS</span><span></span></div>`;
    const bwx = isBwExercise(name);
    h += setRowHtml('W', e, wu, 'warmup', 0, bwx);
    const nSets = setCount(slot, rec);
    for (let s = 0; s < nSets; s++) h += setRowHtml(String(s + 1), e, sets[s] || emptySet(), 'work', s, bwx);
    h += `<div class="set-tools"><button class="set-tool" data-addset data-e="${e}">+ SZETT</button>${nSets > 1 ? `<button class="set-tool minus" data-delset data-e="${e}">− SZETT</button>` : ''}</div>`;
    h += `</div><div class="last">Bemelegítő szett után: <strong>1:00</strong> · Munkasorozat után: <strong>2:30</strong></div></article>`;
  });
  if (!slots.length) h += '<div class="note">Ezen a napon nincs gyakorlat. Adj hozzá egyet!</div>';
  h += '<button class="add-ex-btn" id="addExBtn">+ ÚJ GYAKORLAT HOZZÁADÁSA</button>';
  h += '<div class="note">Hozzáadáskor a gyakorlatlistából is választhatsz: a korábbi gyakorlatok a legutóbbi súlyaikkal és előzményeikkel együtt térnek vissza.</div>';
  workout.innerHTML = h;
  bindInputs();
}
function isBwExercise(name) { const k = rankKeyFor(exId(name)); return !!k && RANK_DB[k].type === 'r'; }
function setRowHtml(label, e, v, kind, s = 0, bw = false) {
  const wu = kind === 'warmup', done = !!v.done;
  return `<div class="set-row ${wu ? 'warmup-row' : ''}" data-e="${e}" data-s="${s}"><div class="set-num">${label}</div><input inputmode="decimal" data-type="weight" data-kind="${kind}" data-e="${e}" data-s="${s}" value="${esc(showNum(v.weight || ''))}" placeholder="${bw ? '0 kg' : 'kg'}" aria-label="${label} súly"><input inputmode="numeric" data-type="reps" data-kind="${kind}" data-e="${e}" data-s="${s}" value="${esc(showNum(v.reps || ''))}" placeholder="reps" aria-label="${label} ismétlés"><button class="complete ${done ? 'checked' : ''}" data-done data-kind="${kind}" data-e="${e}" data-s="${s}">${done ? '✓' : '○'}</button></div>`;
}
function bindInputs() {
  workout.querySelectorAll('.set-row input').forEach(inp => inp.oninput = () => {
    const slot = curSlots()[+inp.dataset.e]; if (!slot) return;
    lockVariant(slot);
    const s = +inp.dataset.s, r = ensureRecord(state.cycle, state.week, state.day, slotName(state.cycle, state.week, state.day, slot));
    padSets(r, s + 1);
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
    // Saját testsúlyos gyakorlatnál (húzódzkodás, lábemelés…) a súly lehet 0 vagy üres.
    const bw = isBwExercise(name);
    if (bw && cleanNum(ins[0].value) === '') ins[0].value = '0';
    let invalid = false;
    ins.forEach((inp, j) => { const okv = (bw && j === 0) ? toNum(inp.value) >= 0 : positive(inp.value); if (!okv) { inp.classList.add('invalid'); invalid = true; } else inp.classList.remove('invalid'); });
    if (invalid) { toast(bw ? 'Add meg az ismétlésszámot (a súly lehet 0)!' : 'Add meg a súlyt és az ismétlésszámot pozitív számként!'); return; }
    lockVariant(slot);
    const rid = exId(name), rkBefore = rankOf(rid), ovBefore = overallRank();
    const r = padSets(ensureRecord(state.cycle, state.week, state.day, name), s + 1), v = kind === 'warmup' ? r.warmup : r.sets[s];
    v.weight = cleanNum(ins[0].value); v.reps = cleanNum(ins[1].value); v.done = true; v.ts = Date.now(); r.ts = Date.now();
    if (!r.doneAt) r.doneAt = Date.now();
    save();
    const rkAfter = kind === 'warmup' ? null : rankOf(rid), rankUp = rankLvl(rkAfter) > rankLvl(rkBefore) && rankLvl(rkAfter) >= 0;
    if (rankUp) flashRankId = rid;
    renderWorkout(); renderWeeks();
    startTimer(name, kind === 'warmup' ? 'warmup' : 'work', { e: +btn.dataset.e, kind, s });
    if (rankUp) showRankUp(rid, rkBefore, rkAfter, ovBefore, overallRank());
  });
  workout.querySelectorAll('[data-variant]').forEach(btn => btn.onclick = () => {
    const slot = curSlots()[+btn.dataset.e]; if (!slot) return;
    const vi = variantIndex(state.cycle, state.week, state.day, slot);
    state.variantChoice[`${state.cycle}-${state.week}-${slot.uid}`] = 1 - vi;
    save(); renderWorkout();
    toast(`Ezen a héten: ${slot.variants[1 - vi].name}`);
  });
  workout.querySelectorAll('[data-swap]').forEach(btn => btn.onclick = () => openEditor('edit', +btn.dataset.e));
  workout.querySelectorAll('[data-addset]').forEach(btn => btn.onclick = () => {
    const slot = curSlots()[+btn.dataset.e]; if (!slot) return;
    // A szett a gyakorlathoz rögzül: ettől a héttől minden edzésen ennyi szett lesz.
    const n = slotSets(slot) + 1, uid = slot.uid;
    applyFrom(state.cycle, state.week, L => { for (const day of L) for (const sl of day) if (sl.uid === uid) sl.sets = n; });
    save(); renderWorkout(); toast(`Mostantól ${n} munkasorozat ennél a gyakorlatnál.`);
  });
  workout.querySelectorAll('[data-delset]').forEach(btn => btn.onclick = () => {
    const slot = curSlots()[+btn.dataset.e]; if (!slot) return;
    const r = recordFor(state.cycle, state.week, state.day, slotName(state.cycle, state.week, state.day, slot));
    const cur = setCount(slot, r); if (cur <= 1) return;
    const last = r?.sets?.[cur - 1];
    if (last && (last.done || last.weight || last.reps) && !confirm(`Törlöd a ${cur}. szettet (${showNum(last.weight) || '—'} kg × ${showNum(last.reps) || '—'})?`)) return;
    if (r && r.sets.length >= cur) r.sets.length = Math.max(1, cur - 1);
    if (r) r.ts = Date.now();
    const n = Math.max(1, cur - 1), uid = slot.uid;
    applyFrom(state.cycle, state.week, L => { for (const day of L) for (const sl of day) if (sl.uid === uid) sl.sets = n; });
    save(); renderWorkout(); toast(`Mostantól ${n} munkasorozat ennél a gyakorlatnál.`);
  });
  workout.querySelectorAll('[data-stats]').forEach(btn => btn.onclick = () => openStats(btn.dataset.stats));
  workout.querySelectorAll('[data-info]').forEach(btn => btn.onclick = () => openExInfo(btn.dataset.info, btn.dataset.iname, btn.dataset.ihu));
  if (typeof ANIM3D !== 'undefined') ANIM3D.fillThumbs(workout);
  workout.querySelectorAll('[data-note]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.note, cur = state.notes?.[id] || '';
    const v = prompt(`Jegyzet – ${nameOf(id)}\n(gépbeállítás, fogás, bármi, ami segít; minden héten látszik)`, cur);
    if (v === null) return;
    state.notes = state.notes || {};
    if (v.trim()) state.notes[id] = v.trim().slice(0, 200); else delete state.notes[id];
    save(); renderWorkout();
  });
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
  $('editRemoveAll').classList.toggle('hidden', mode !== 'edit');
  $('libSearch').value = '';
  const curId = slot ? exId(slot.variants[0].name) : null, cm = curId ? state.rankMap?.[curId] : null;
  $('editRank').innerHTML = `<option value="auto">Automatikus (név alapján)</option><option value="none">Nincs rang</option>` + RANK_DB_RAW.map(x => `<option value="${esc(exId(x[0]))}">${esc(x[0])}${x[3] === 'machine' ? ' ⚙️' : ''}</option>`).join('');
  $('editRank').value = cm || 'auto';
  renderLibrary();
  $('editOverlay').classList.remove('hidden');
  $('editOverlay').scrollTop = 0;
}
function renderLibrary() {
  if (!editCtx) return;
  const { c, w, d, uid } = editCtx, q = norm($('libSearch').value);
  const onThisDay = new Set((layoutFor(c, w)[d] || []).filter(s => s.uid !== uid).flatMap(s => s.variants.map(v => exId(v.name))));
  const lib = libraryIds();
  const match = (name, hu) => !q || exId(name).includes(q) || norm(hu || '').includes(q);
  const ids = lib.filter(id => !onThisDay.has(id) && match(nameOf(id), libMeta(id).hu));
  const dbItems = RANK_DB_RAW.filter(x => { const k = exId(x[0]); return !lib.includes(k) && !onThisDay.has(k) && match(x[0], x[1]); });
  let h = `<div class="lib-sub">SAJÁT GYAKORLATAIM</div>` + (ids.length ? ids.map(id => {
    const m = libMeta(id), where = daysWith(id, c, w), rk = rankOf(id);
    return `<button type="button" class="lib-item" data-lib="${esc(id)}"><span class="lib-name">${esc(m.name)}${where.length ? ` <em>${esc(where.join(', '))}</em>` : ' <em class="off">nincs a programban</em>'}</span><span class="lib-last">${esc(lastSummary(id))}${rk?.label ? ' · 🏅 ' + esc(rk.label) : ''}</span></button>`;
  }).join('') : '<div class="empty">Nincs találat.</div>');
  h += `<div class="lib-sub">GYAKORLAT-ADATBÁZIS · MINDEGYIKHEZ VAN RANG</div>` + (dbItems.length ? dbItems.map(x => `<button type="button" class="lib-item db" data-db="${esc(exId(x[0]))}"><span class="lib-name">${esc(x[0])} ${x[3] === 'machine' ? '<em class="off">⚙️ gépes</em>' : x[3] === 'bw' ? '<em class="off">saját testsúly</em>' : ''}</span><span class="lib-last">${esc(x[1])} · ${esc(x[5])}</span></button>`).join('') : '<div class="empty">Nincs találat. Lent saját gyakorlatot is létrehozhatsz.</div>');
  $('libList').innerHTML = h;
  $('libList').querySelectorAll('[data-db]').forEach(b => b.onclick = () => {
    const d = RANK_DB[b.dataset.db];
    $('editName').value = d.name; $('editHu').value = d.hu; $('editReps').value = d.reps; $('editAlt').value = ''; $('editRank').value = 'auto';
    $('libList').querySelectorAll('.lib-item').forEach(x => x.classList.toggle('selected', x === b));
    toast(`Kiválasztva: ${d.name} – nyomd meg a MENTÉS gombot.`);
  });
  $('libList').querySelectorAll('[data-lib]').forEach(b => b.onclick = () => {
    const m = libMeta(b.dataset.lib);
    $('editRank').value = state.rankMap?.[b.dataset.lib] || 'auto';
    $('editName').value = m.name; $('editHu').value = m.hu; $('editReps').value = m.reps;
    $('editAlt').value = '';
    $('libList').querySelectorAll('.lib-item').forEach(x => x.classList.toggle('selected', x === b));
    $('editName').classList.remove('invalid');
    toast(`Kiválasztva: ${m.name} – nyomd meg a MENTÉS gombot.`);
  });
}
$('libSearch').oninput = renderLibrary;
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
  state.library = state.library || {};
  state.library[exId(name)] = { name, hu, reps };
  state.rankMap = state.rankMap || {};
  const rsel = $('editRank').value;
  if (rsel === 'auto') delete state.rankMap[exId(name)]; else state.rankMap[exId(name)] = rsel;
  if (alt && !state.library[exId(alt)]) state.library[exId(alt)] = { name: alt, hu: variants[1].hu, reps };
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
$('editRemoveAll').onclick = () => {
  if (!editCtx) return;
  const { uid, c, w, d } = editCtx, slot = layoutFor(c, w)[d].find(x => x.uid === uid); if (!slot) return;
  const ids = slot.variants.map(v => exId(v.name)), names = slot.variants.map(v => v.name).join(' / ');
  const where = [...new Set(ids.flatMap(id => daysWith(id, c, w)))];
  if (!confirm(`${names}\n\nEltávolítod MINDEN edzésnapról (${where.join(', ')}) a ${cycLabel(c).toLowerCase()}${w}. héttől?\n\nA gyakorlat a listában marad, az adatai megmaradnak. Ha később visszaadod a listából, onnan folytatod, ahol abbahagytad.`)) return;
  applyFrom(c, w, L => { for (let i = 0; i < L.length; i++) L[i] = L[i].map(s => ({ ...s, variants: s.variants.filter(v => !ids.includes(exId(v.name))) })).filter(s => s.variants.length); });
  closeEditor(); save(); render();
  toast('Eltávolítva minden edzésnapról. A gyakorlatlistában megmaradt.');
};

/* ---------- fejlődés ---------- */
/* Havi összefoglaló: edzések, megmozgatott kg, szettek, és ahol erősödtél (becsült 1RM a hónap előtti legjobbhoz képest). */
let monthSel = null;
const HU_MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
function monthKey(t) { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); }
function monthSummary(mk) {
  const start = new Date(Math.floor(mk / 12), mk % 12, 1).getTime(), end = new Date(Math.floor(mk / 12), mk % 12 + 1, 1).getTime();
  const sessions = new Map(); let sets = 0;
  const best = {}, before = {};
  for (const [id, obj] of Object.entries(state.exercises)) for (const [k, r] of Object.entries(obj.occurrences || {})) {
    if (!anyDone(r)) continue;
    const t = sessionTime(r); if (!t) continue;
    let top = 0;
    for (const x of (r.sets || [])) if (x?.done && positive(x.weight) && positive(x.reps)) top = Math.max(top, toNum(x.weight) * (1 + Math.min(toNum(x.reps), 12) / 30));
    if (t < start) { before[id] = Math.max(before[id] || 0, top); continue; }
    if (t >= end) continue;
    sessions.set(k, Math.min(sessions.get(k) ?? Infinity, t));
    sets += (r.sets || []).filter(x => x?.done).length;
    best[id] = Math.max(best[id] || 0, top);
  }
  let vol = 0; for (const k of sessions.keys()) { const [c, w, d] = k.split('-').map(Number); vol += dayVolume(c, w, d).total; }
  const ups = Object.keys(best).filter(id => before[id] > 0 && best[id] > before[id] * 1.001).map(id => ({ id, pct: (best[id] / before[id] - 1) * 100 })).sort((a, b) => b.pct - a.pct);
  return { workouts: sessions.size, vol, sets, ups, label: `${Math.floor(mk / 12)}. ${HU_MONTHS[mk % 12]}` };
}
/* ---------- v35: heti izomtérkép – melyik izom hányszor volt megcélozva a héten ---------- */
let muscleMode = 'done';      // 'done' = az elvégzett szettek, 'plan' = a heti terv (ha mindent megcsinálsz)
function weekMuscles(c, w, plan) {
  const M = {}, L = layoutFor(c, w);
  DAYS.forEach((day, d) => {
    for (const slot of (L[d] || [])) {
      const name = slotName(c, w, d, slot), r = recordFor(c, w, d, name), info = exInfoFor(exId(name)); if (!info) continue;
      const n = plan ? setCount(slot, r) : (r?.sets || []).filter(x => x?.done).length; if (!n) continue;
      for (const [k, lv] of Object.entries(info.m)) (M[k] || (M[k] = [])).push({ name, lv, n, d });
    }
  });
  return M;
}
function weekMuscleHtml() {
  const c = state.cycle, w = state.week, plan = muscleMode === 'plan', M = weekMuscles(c, w, plan), lv = {}, cnt = [0, 0, 0, 0];
  let rows = '';
  for (const k of Object.keys(MUSCLES)) {
    const ex = M[k] || [], days3 = new Set(ex.filter(x => x.lv === 3).map(x => x.d)).size, days2 = new Set(ex.filter(x => x.lv >= 2).map(x => x.d)).size;
    const sets3 = ex.filter(x => x.lv === 3).reduce((a, x) => a + x.n, 0), sets2 = ex.filter(x => x.lv === 2).reduce((a, x) => a + x.n, 0);
    const L = days3 >= 2 ? 3 : days3 === 1 || days2 >= 2 ? 2 : ex.length ? 1 : 0;
    if (L) lv[k] = L; cnt[L]++;
    const status = L === 3 ? '2× megvolt' : L === 2 ? (days3 ? '1× célzottan' : '2× másodlagosan') : L === 1 ? (sets2 ? '1× másodlagosan' : 'csak segített') : 'kimaradt';
    const parts = []; if (sets3) parts.push(`célzottan ${days3} nap · ${sets3} szett`); if (sets2) parts.push(`másodlagosan ${sets2} szett`); if (!sets3 && !sets2 && ex.length) parts.push('csak segítő izomként dolgozott');
    const names = [...new Set(ex.filter(x => x.lv >= 2).sort((a, b) => b.lv - a.lv || a.d - b.d).map(x => x.name))];
    rows += `<div class="wm-row s${L}"><i></i><div><b>${esc(MUSCLES[k])}</b><span>${parts.length ? esc(parts.join(' · ')) : (plan ? 'nincs rá gyakorlat a heti tervben' : 'ezen a héten még nem dolgozott')}</span>${names.length ? `<span class="wm-ex">${esc(names.join(' · '))}</span>` : ''}</div><em>${status}</em></div>`;
  }
  let fig = '';
  if (typeof ANIM3D !== 'undefined') { try { const a = ANIM3D.figure(lv, -14), b = ANIM3D.figure(lv, 166); if (a && b) fig = `<div class="wm-fig"><figure><img src="${a}" alt="Izomtérkép elölről"><figcaption>ELÖL</figcaption></figure><figure><img src="${b}" alt="Izomtérkép hátulról"><figcaption>HÁTUL</figcaption></figure></div>`; } catch (e) { fig = ''; } }
  if (!fig) fig = muscleMapSvg(lv);
  return `<section class="summary-card wm-card"><div class="summary-title">💪 HETI IZOMTÉRKÉP · ${cycLabel(c)}${w}. HÉT</div>
  <div class="wm-tabs"><button data-mm="done" class="${plan ? '' : 'on'}">ELVÉGZETT</button><button data-mm="plan" class="${plan ? 'on' : ''}">TERV SZERINT</button></div>
  <div class="bw-note">${plan ? 'Ezt edzi meg a heti terved, ha minden szettet megcsinálsz.' : 'A héten eddig kipipált munkasorozatok alapján.'} Cél: minden izom hetente 2× legyen célzottan megdolgoztatva.</div>
  ${fig}
  <div class="wm-legend"><span class="s3"><i></i>2× megvolt</span><span class="s2"><i></i>1× célzottan</span><span class="s1"><i></i>alig dolgozott</span><span class="s0"><i></i>kimaradt</span></div>
  <div class="summary-stats three"><div><strong>${cnt[3]}</strong><span>izom 2× megvolt</span></div><div><strong>${cnt[2]}</strong><span>izom csak 1× célzottan</span></div><div><strong>${cnt[1] + cnt[0]}</strong><span>izom alig vagy nem dolgozott</span></div></div>
  <div class="wm-list">${rows}</div></section>`;
}
function monthHtml() {
  const now = monthKey(Date.now()), mk = monthSel ?? now, m = monthSummary(mk);
  let h = `<section class="summary-card month-card"><div class="month-nav"><button class="cycle-btn" id="monthPrev">‹</button><div class="summary-title">HAVI ÖSSZEFOGLALÓ · ${esc(m.label.toUpperCase())}</div><button class="cycle-btn" id="monthNext" ${mk >= now ? 'disabled' : ''}>›</button></div>`;
  h += `<div class="summary-stats three"><div><strong>${m.workouts}</strong><span>edzés</span></div><div><strong>${m.sets}</strong><span>kész szett</span></div><div><strong>${kg(m.vol)}</strong><span>kg megmozgatva</span></div></div>`;
  if (m.ups.length) h += `<div class="month-ups"><b>💪 Itt erősödtél (becsült 1RM):</b>${m.ups.slice(0, 5).map(u => `<div class="summary-row"><span>${esc(nameOf(u.id))}</span><b>+${showNum(Math.round(u.pct * 10) / 10)}%</b></div>`).join('')}</div>`;
  else if (m.workouts) h += '<div class="month-ups muted">Ebben a hónapban nem dőlt meg korábbi csúcs – a következőben jön!</div>';
  else h += '<div class="month-ups muted">Ebben a hónapban még nincs rögzített edzés.</div>';
  return h + '</section>';
}
function renderHistory() {
  const c = state.cycle, w = state.week, L = layoutFor(c, w);
  let h = `<div class="eyebrow">PROGRESS & WEEKLY SUMMARY</div><div class="day-name">FEJLŐDÉS</div><div class="day-meta">Személyes rekordok, heti teljesítés és gyakorlatonkénti előzmények.</div>`;
  h += `<section class="social-card hevy-card"><div class="eyebrow">📥 ADATOK ÁTHOZÁSA A HEVY APPBÓL</div><div class="bw-note">Ha eddig a Hevy appban vezetted az edzéseidet, itt áthozhatod őket. A Hevy-ben: <b>Profile → Settings → Export & Import Data → Export Data → Export Workouts</b>. A kapott CSV-fájlt töltsd be itt – az edzéseid dátummal bekerülnek az előzményekbe, a rangok és a görbék is számolnak velük.${state.hevyImported ? ` Eddig importálva: ${Object.keys(state.hevyImported).length} edzés.` : ''}</div><label class="primary import-label hevy-btn">HEVY ADATOK BETÖLTÉSE<input id="hevyInput" type="file" accept=".csv,text/csv,text/plain" hidden></label></section>`;
  const rows = DAYS.map((day, d) => {
    let done = 0, total = 0;
    for (const slot of (L[d] || [])) { const r = recordFor(c, w, d, slotName(c, w, d, slot)); total += setCount(slot, r); done += (r?.sets || []).filter(s => s?.done).length; }
    return { name: day.name, done, total, vol: dayVolume(c, w, d).total };
  });
  const started = rows.filter(x => x.done > 0).length, finished = rows.filter(x => x.total > 0 && x.done >= x.total).length;
  const doneSets = rows.reduce((a, x) => a + x.done, 0), allSets = rows.reduce((a, x) => a + x.total, 0);
  h += `<section class="summary-card"><div class="summary-title">${cycLabel(c)}${w}. HÉT ÖSSZESÍTŐ</div><div class="summary-stats three"><div><strong>${started}/4</strong><span>edzésnap elkezdve</span></div><div><strong>${finished}/4</strong><span>edzésnap kész</span></div><div><strong>${doneSets}/${allSets}</strong><span>munkasorozat kész</span></div></div><div class="summary-row total"><span>Heti megmozgatott súly</span><b>${kg(rows.reduce((a, x) => a + x.vol, 0))} kg</b></div>${rows.map(x => `<div class="summary-row"><span>${x.name}</span><b>${x.done}/${x.total} szett · ${kg(x.vol)} kg${x.total && x.done >= x.total ? ' ✓' : ''}</b></div>`).join('')}</section>`;

  h += weekMuscleHtml();
  h += monthHtml();
  h += recentRankUpsHtml();
  const active = [];
  L.forEach(day => day.forEach(slot => slot.variants.forEach(v => { const id = exId(v.name); if (!active.includes(id)) active.push(id); })));
  const archived = Object.keys(state.exercises).filter(id => !active.includes(id) && Object.values(state.exercises[id].occurrences || {}).some(hasData)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  h += `<input id="histSearch" class="lib-search hist-search" placeholder="🔍 Gyakorlat keresése…" autocomplete="off" value="${esc(histQuery)}">`;
  h += `<div class="hist-block"><div class="history-section">JELENLEGI GYAKORLATOK</div>` + active.map(historyGroup).join('') + '</div>';
  if (archived.length) h += `<div class="hist-block"><div class="history-section">LECSERÉLT / KORÁBBI GYAKORLATOK</div>` + archived.map(historyGroup).join('') + '</div>';
  h += '<div class="empty hidden" id="histNone">Nincs ilyen nevű gyakorlat.</div>';

  h += `<div class="history-section">CIKLUS</div><div class="cycle-banner"><span>${state.maxCycle > 1 ? `${state.maxCycle} ciklus rögzítve. Váltás a fenti ‹ › nyilakkal.` : 'Új 6 hetes ciklus indításakor a mostani eredmények megmaradnak.'}</span><button class="primary" id="newCycleBtn2">ÚJ CIKLUS</button></div>`;
  h += '<div class="history-actions"><button id="exportBtn" class="secondary">BIZTONSÁGI MENTÉS FÁJLBA</button><label class="secondary import-label">MENTÉS BETÖLTÉSE<input id="importInput" type="file" accept=".json,application/json" hidden></label></div>';

  const snaps = snapKeys();
  if (snaps.length) {
    h += `<details class="history-group"><summary>Automatikus helyi másolatok (${snaps.length})</summary><div class="progress-ex">${snaps.map(k => `<div class="snap-row"><span>${esc(snapLabel(k))}</span><button class="secondary" data-snap="${esc(k)}">LETÖLTÉS</button></div>`).join('')}<div class="empty">A letöltött fájl a MENTÉS BETÖLTÉSE gombbal visszatölthető.</div></div></details>`;
  }
  h += `<div class="note">Az alkalmazás minden változást azonnal ment, és naponta külön helyi másolatot is készít. A fájlba mentés külön, letölthető másolatot ad. IRONLOG ${APP_VERSION}</div>`;
  workout.innerHTML = h;
  $('histSearch').oninput = e => { histQuery = e.target.value; filterHistory(); };
  workout.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { muscleMode = b.dataset.mm; renderHistory(); });
  workout.querySelectorAll('.ru-row[data-rstats]').forEach(b => b.onclick = () => openStats(b.dataset.rstats));
  $('monthPrev').onclick = () => { monthSel = (monthSel ?? monthKey(Date.now())) - 1; renderHistory(); };
  $('monthNext').onclick = () => { monthSel = Math.min(monthKey(Date.now()), (monthSel ?? monthKey(Date.now())) + 1); renderHistory(); };
  workout.querySelectorAll('details[data-gid]').forEach(dt => dt.addEventListener('toggle', () => {
    const box = dt.querySelector('.progress-ex');
    if (dt.open && !box.dataset.filled) { box.innerHTML = statsHtml(dt.dataset.gid); box.dataset.filled = '1'; bindCharts(box); }
  }));
  filterHistory();
  $('exportBtn').onclick = () => exportData(state, `ironlog-backup-${today()}.json`);
  $('importInput').onchange = e => importData(e.target.files[0]);
  $('hevyInput').onchange = e => { importHevy(e.target.files[0]); e.target.value = ''; };
  $('newCycleBtn2').onclick = startNewCycle;
  workout.querySelectorAll('[data-snap]').forEach(b => b.onclick = () => { try { const raw = localStorage.getItem(b.dataset.snap); if (raw) exportData(JSON.parse(raw), `${b.dataset.snap}.json`); } catch (e) { toast('A másolat nem olvasható.'); } });
}
let histQuery = '';
function filterHistory() {
  const q = norm(histQuery); let any = false;
  workout.querySelectorAll('.hist-block').forEach(b => {
    let vis = 0;
    b.querySelectorAll('[data-hname]').forEach(g => { const show = !q || g.dataset.hname.includes(q); g.classList.toggle('hidden', !show); if (show) vis++; });
    b.classList.toggle('hidden', !vis); if (vis) any = true;
  });
  $('histNone')?.classList.toggle('hidden', any);
}
function snapLabel(k) {
  if (k === PRE_V6_KEY) return 'A v9 frissítés előtti állapot';
  if (k.startsWith(PRE_IMPORT_PREFIX)) return 'Betöltés előtti állapot · ' + k.slice(PRE_IMPORT_PREFIX.length);
  return 'Napi másolat · ' + k.slice(SNAP_PREFIX.length);
}
function historyGroup(id) {
  const pb = personalBest(id);
  let h = `<details class="history-group" data-hname="${esc(norm(nameOf(id)) + ' ' + norm(libMeta(id).hu))}" data-gid="${esc(id)}"><summary>${rankBadge(rankOf(id))} ${esc(nameOf(id))} ${pb ? `<span class="small-record">🏆 ${showNum(pb.weight)} kg × ${showNum(pb.reps)}</span>` : ''}</summary><div class="progress-ex"></div></details>`;
  return h;
}
/* Egy gyakorlat teljes statisztikája: görbe + minden alkalom (legújabb felül). */
function statsHtml(id) {
  const rows = sessionsOf(id);
  if (!rows.length) return '<div class="empty">Még nincs adat ehhez a gyakorlathoz.</div>';
  const rh = {}; for (const x of rankHistory(id)) rh[x.x.k] = x;
  const cur = rankOf(id);
  let h = cur?.pts !== undefined ? `<div class="stats-rank" style="--rc:${cur.color}">${rankBadge(cur, true)}<div><div class="eyebrow">MOSTANI RANG</div><b style="color:${cur.color}">${esc(cur.label)}</b><span>${esc(oneRmText(cur))}</span><span>${esc(rankNeedText(cur))}</span></div></div>` : '';
  h += chartHtml(id) + rankChartHtml(id) + rankLadderHtml(id);
  h += '<div class="stats-list">';
  for (const { k, c, w, d, r, t } of [...rows].reverse()) {
    const rx = rh[k];
    const f = s => s && (s.weight || s.reps) ? `${esc(showNum(s.weight)) || '—'} × ${esc(showNum(s.reps)) || '—'}${s.done ? '' : ' <i>(nincs kész)</i>'}` : '—';
    const hs = heavierSet(r);
    h += `<div class="stats-row"><div class="stats-when"><b>${isImported(c) ? esc('Hevy' + (r.title ? ' · ' + r.title : '')) : `${cycLabel(c)}${w}. hét · ${DAYS[d]?.name || ''}`}</b><span>${fmtDate(t)}</span></div><div class="stats-sets"><span>WU ${f(r.warmup)}</span>${(r.sets || []).map((x, i) => [x, i]).filter(([x]) => setFilled(x)).map(([x, i]) => `<span>S${i + 1} ${f(x)}</span>`).join('')}</div>${hs ? `<div class="stats-top">${showNum(hs.weight)} kg</div>` : ''}${rx ? `<div class="stats-rk${rx.up ? ' up' : ''}" style="--rc:${rx.rk.color}">${rx.up ? '⬆ RANGLÉPÉS: ' : ''}${esc(rx.rk.label)} · ${esc(oneRmText(rx.rk))}</div>` : ''}</div>`;
  }
  return h + '</div>';
}
function chartPoints(id) {
  return sessionsOf(id).map(x => ({ x, hs: heavierSet(x.r) })).filter(o => o.hs).map(({ x, hs }) => ({ wt: hs.weight, reps: hs.reps, set: hs.i + 1, lab: isImported(x.c) ? 'Hevy' : `${state.maxCycle > 1 ? 'C' + x.c + ' ' : ''}W${x.w} ${(DAYS[x.d]?.name || '').replace('UPPER ', 'U').replace('LOWER ', 'L')}`, date: fmtDate(x.t) }));
}
function chartHtml(id) {
  const pts = chartPoints(id).map(p => ({ ...p, read: [`${showNum(p.wt)} kg × ${showNum(p.reps)}`, ` · ${p.set}. szett · ${p.lab}${p.date ? ' · ' + p.date : ''}`] }));
  if (!pts.length) return '<div class="empty">A görbéhez legalább egy kész munkasorozat kell.</div>';
  return lineChart(pts, 'Legnehezebb munkasorozat edzésenként', 'Súlyfejlődés', true);
}
function bwChartHtml() {
  const hist = (state.body?.history || []).filter(x => x.kg > 0);
  if (hist.length < 2) return '';
  const pts = hist.map(x => ({ wt: x.kg, lab: fmtDate(x.t), read: [`${showNum(x.kg)} kg`, ` · ${new Date(x.t).toLocaleDateString('hu-HU')}`] }));
  return lineChart(pts, 'Testsúly változása', 'Testsúly', false);
}
function lineChart(pts, title, aria, upGood) {
  const W = 320, H = 150, L = 36, R = 14, T = 20, B = 24;
  const ws = pts.map(p => p.wt); let lo = Math.min(...ws), hi = Math.max(...ws);
  if (hi - lo < 4) { lo -= 2; hi += 2; }
  const pad = (hi - lo) * 0.12; lo = Math.max(0, Math.floor(lo - pad)); hi = Math.ceil(hi + pad);
  const X = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const Y = v => T + (hi - v) * (H - T - B) / (hi - lo);
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="ch-grid"/><text x="${L - 6}" y="${(Y(v) + 3).toFixed(1)}" class="ch-axis" text-anchor="end">${showNum(Math.round(v * 10) / 10)}</text>`).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.wt).toFixed(1)}`).join(' ');
  const maxI = ws.indexOf(Math.max(...ws)), lastI = pts.length - 1;
  const lbl = i => `<text x="${X(i).toFixed(1)}" y="${(Y(pts[i].wt) - 9).toFixed(1)}" class="ch-lbl" text-anchor="${i === 0 && pts.length > 1 ? 'start' : i === lastI && pts.length > 1 ? 'end' : 'middle'}">${showNum(pts[i].wt)}</text>`;
  const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.wt).toFixed(1)}" r="4" class="ch-dot"/>`).join('');
  const first = pts[0].wt, last = pts[lastI].wt, diff = Math.round((last - first) * 10) / 10;
  return `<div class="chart-wrap" data-pts="${esc(JSON.stringify(pts.map((p, i) => ({ ...p, cx: X(i), cy: Y(p.wt) }))))}">
  <div class="chart-head"><span>${esc(title)}</span><b class="${diff > 0 && upGood ? 'up' : ''}">${pts.length > 1 ? (diff > 0 ? '+' : '') + showNum(diff) + ' kg' : ''}</b></div>
  <div class="chart-read"></div>
  <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(aria)}: ${showNum(first)} kg-tól ${showNum(last)} kg-ig, ${pts.length} edzés">${grid}<line class="ch-cross" y1="${T - 6}" y2="${H - B}" x1="-10" x2="-10"/><path d="${path}" class="ch-line"/>${dots}${lbl(lastI)}${maxI !== lastI ? lbl(maxI) : ''}<text x="${L}" y="${H - 6}" class="ch-axis">${esc(pts[0].lab)}</text>${pts.length > 1 ? `<text x="${W - R}" y="${H - 6}" class="ch-axis" text-anchor="end">${esc(pts[lastI].lab)}</text>` : ''}<rect x="0" y="0" width="${W}" height="${H}" fill="transparent" class="ch-hit"/></svg></div>`;
}
function bindCharts(root) {
  root.querySelectorAll('.chart-wrap').forEach(wrap => {
    let pts; try { pts = JSON.parse(wrap.dataset.pts); } catch (e) { return; }
    const svg = wrap.querySelector('svg'), cross = wrap.querySelector('.ch-cross'), read = wrap.querySelector('.chart-read');
    const show = i => {
      const p = pts[i]; if (!p) return;
      cross.setAttribute('x1', p.cx); cross.setAttribute('x2', p.cx);
      svg.querySelectorAll('.ch-dot').forEach((c, j) => c.classList.toggle('on', j === i));
      read.textContent = '';
      const b = document.createElement('b'); b.textContent = p.read?.[0] || `${showNum(p.wt)} kg`;
      const sp = document.createElement('span'); sp.textContent = p.read?.[1] || '';
      read.append(b, sp);
    };
    const pick = ev => {
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * 320 / r.width;
      let bi = 0; pts.forEach((p, i) => { if (Math.abs(p.cx - x) < Math.abs(pts[bi].cx - x)) bi = i; });
      show(bi);
    };
    svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', ev => { if (ev.buttons || ev.pointerType === 'mouse') pick(ev); });
    show(pts.length - 1);
  });
}


/* ---------- RANGOK ----------
   Rang = a legjobb becsült 1RM (súly × (1 + ismétlés/30)) a testsúlyhoz igazítva.
   A küszöbök egy 80 kg-os férfira vonatkoznak (IRONLOG saját skála: a hobbi edzők körében elterjedt arányokhoz igazítva, pl. fekvenyomásban középhaladó ≈ 1× testsúly),
   más testsúlynál (testsúly/80)^0,67 arányban skálázódnak – így a könnyebb és nehezebb lifterek igazságosan összemérhetők.
   Ismétlés alapú (saját testsúlyos) gyakorlatoknál a legtöbb ismétlés számít. */
const RANKS = [
  // Vicces magyar rangnevek (a színek és a számítás változatlan; régi nevek: Vas, Bronz, Ezüst, Arany, Platina, Gyémánt, Bajnok, Legenda)
  { n: '🍮 Puding', c: '#8b939c' }, { n: '🥣 Menzás főzelék', c: '#cd7f32' }, { n: '🦵 Lábnap-kerülő', c: '#c9d1d9' }, { n: '🥤 Tápos shake-ivó', c: '#f2c94c' },
  { n: '💥 Bedurranás-maxoló', c: '#56d6c9' }, { n: '🚪 Szekrény', c: '#7cc4ff' }, { n: '🚪🚪 Kétajtós szekrény', c: '#ff5fa2' }, { n: '🏛️ Görög isten', c: '#b98cff' }
];
const MAX_PTS = RANKS.length * 3 - 1;
const ROMAN = ['I', 'II', 'III'];
// [név, magyar név, típus (w = súly, r = ismétlés), eszköz (free / machine / bw), [kezdő, újonc, középhaladó, haladó, elit] 80 kg-ra, alap ismétlés, más nevek]
const RANK_DB_RAW = [
  ['Conventional Deadlift', 'Sima Felhúzás', 'w', 'free', [80, 108, 140, 176, 216], '2 × 5–7', ['Deadlift']],
  ['Romanian Deadlift', 'Román Felhúzás', 'w', 'free', [60, 85, 112, 142, 175], '2 × 8–10', ['RDL']],
  ['Back Squat', 'Guggolás Rúddal', 'w', 'free', [64, 88, 112, 148, 184], '2 × 6–8', ['Squat', 'Barbell Squat']],
  ['Front Squat', 'Elöl Tartott Guggolás', 'w', 'free', [52, 72, 92, 120, 150], '2 × 6–8', []],
  ['Bench Press', 'Fekvenyomás', 'w', 'free', [48, 64, 80, 108, 136], '2 × 6–8', ['Barbell Bench Press', 'Flat Bench Press']],
  ['Incline Bench Press', 'Ferde Fekvenyomás', 'w', 'free', [40, 54, 68, 92, 116], '2 × 6–8', ['Incline Barbell Bench Press']],
  ['Overhead Press', 'Vállból Nyomás Rúddal', 'w', 'free', [32, 44, 56, 72, 88], '2 × 6–8', ['Military Press', 'Barbell Overhead Press']],
  ['Barbell Row', 'Döntött Törzsű Evezés', 'w', 'free', [40, 56, 72, 92, 112], '2 × 8–10', ['Bent Over Row']],
  ['Hip Thrust', 'Csípőemelés Rúddal', 'w', 'free', [60, 95, 135, 180, 230], '2 × 8–10', ['Barbell Hip Thrust']],
  ['Barbell Curl', 'Bicepsz Rúddal', 'w', 'free', [22, 30, 40, 52, 64], '2 × 8–10', ['EZ Bar Curl']],
  ['Scott Bench Preacher Curl', 'Scott Pados Bicepsz', 'w', 'free', [18, 26, 35, 46, 57], '2 × 8–10', ['Preacher Curl']],
  ['Dumbbell Bench Press', 'Fekvenyomás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [18, 26, 35, 46, 58], '2 × 8–10', []],
  ['Incline Dumbbell Press', 'Ferde Nyomás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [16, 23, 31, 41, 52], '2 × 8–10', []],
  ['Dumbbell Shoulder Press', 'Vállból Nyomás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [12, 18, 25, 33, 42], '2 × 8–10', []],
  ['Alternating Dumbbell Biceps Curl', 'Váltott Karú Bicepsz (1 súlyzó)', 'w', 'free', [10, 15, 20, 27, 34], '2 × 8–10', ['Dumbbell Curl', 'Dumbbell Biceps Curl']],
  ['Hammer Curl', 'Kalapács Bicepsz (1 súlyzó)', 'w', 'free', [11, 16, 22, 29, 37], '2 × 8–10', []],
  ['Lateral Raise', 'Oldalemelés (1 súlyzó)', 'w', 'free', [6, 10, 14, 19, 25], '2 × 10–12', ['Dumbbell Lateral Raise']],
  ['Rear Delt Fly', 'Hátsó Váll Tárogatás (1 súlyzó)', 'w', 'free', [5, 9, 13, 18, 23], '2 × 10–12', []],
  ['Dumbbell Row', 'Egykezes Evezés (1 súlyzó)', 'w', 'free', [18, 28, 40, 53, 68], '2 × 8–10', ['One Arm Dumbbell Row']],
  ['Dumbbell Fly', 'Tárogatás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [10, 15, 21, 28, 36], '2 × 10–12', []],
  ['Dumbbell Wrist Curl', 'Csuklóhajlítás (1 súlyzó)', 'w', 'free', [10, 16, 23, 31, 40], '2 × 12–15', []],
  ['Dumbbell Reverse Wrist Curl', 'Csuklófeszítés (1 súlyzó)', 'w', 'free', [7, 11, 15, 20, 26], '2 × 12–15', []],
  ['Dumbbell Deadlift', 'Felhúzás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [22, 34, 48, 64, 82], '2 × 8–10', []],
  ['Goblet Squat', 'Kehely Guggolás', 'w', 'free', [18, 28, 40, 54, 70], '2 × 10–12', []],
  ['Dumbbell Bulgarian Split Squat', 'Bolgár Guggolás Kézisúlyzóval (1 súlyzó)', 'w', 'free', [12, 20, 29, 40, 52], '2 × 8–10 / láb', []],
  ['Hack Squat', 'Hack Guggolás Gépen (ráterhelés)', 'w', 'machine', [40, 80, 125, 180, 240], '2 × 6–8', []],
  ['Leg Press', 'Lábtoló Gép', 'w', 'machine', [120, 200, 290, 390, 500], '2 × 8–10', []],
  ['Smith Machine Squat', 'Smith Guggolás', 'w', 'machine', [60, 90, 125, 165, 210], '2 × 6–8', []],
  ['Smith Machine Bulgarian Split Squat', 'Smith Bolgár Guggolás', 'w', 'machine', [30, 55, 85, 120, 160], '2 × 8–10 / láb', []],
  ['Smith Machine Bench Press', 'Smith Fekvenyomás', 'w', 'machine', [45, 62, 82, 108, 136], '2 × 6–8', []],
  ['Smith Machine Overhead Shoulder Press', 'Smith Vállból Nyomás', 'w', 'machine', [30, 42, 56, 72, 90], '2 × 6–8', ['Smith Machine Shoulder Press']],
  ['Leg Extension', 'Láb Extenzió', 'w', 'machine', [50, 75, 105, 140, 180], '2 × 10–12', []],
  ['Seated Hamstring Curl', 'Ülő Combhajlítás', 'w', 'machine', [40, 58, 80, 105, 135], '2 × 8–10', ['Leg Curl']],
  ['Lying Hamstring Curl', 'Fekvő Combhajlítás', 'w', 'machine', [32, 47, 65, 86, 110], '2 × 8–10', ['Lying Leg Curl']],
  ['Machine Hip Adduction', 'Csípő Addukció Gépen', 'w', 'machine', [35, 55, 85, 115, 150], '2 × 10–12', ['Hip Adduction']],
  ['Machine Hip Abduction', 'Csípő Abdukció Gépen', 'w', 'machine', [35, 55, 85, 115, 150], '2 × 10–12', ['Hip Abduction']],
  ['Standing Calf Raise', 'Álló Vádli Gépen', 'w', 'machine', [70, 115, 165, 225, 290], '2 × 8–10', []],
  ['Seated Calf Raise', 'Ülő Vádli Gépen', 'w', 'free', [32, 55, 82, 112, 145], '2 × 10–12', []],
  ['Machine Ab Crunch', 'Gépes Hasprés', 'w', 'machine', [15, 26, 40, 54, 72], '2 × 10–15', []],
  ['Chest-Supported Row', 'Mellkassal Támasztott Evezés', 'w', 'machine', [45, 70, 100, 135, 175], '2 × 6–8', ['T-Bar Row']],
  ['Wide-Grip Lat Pulldown', 'Széles Lehúzás Csigán', 'w', 'machine', [50, 65, 85, 108, 132], '2 × 8–10', ['Lat Pulldown']],
  ['Single-Arm Sagittal Pulldown', 'Szagittális Lehúzás Egy Kézzel Gépen', 'w', 'machine', [55, 85, 115, 145, 195], '2 × 8–10', ['Sagittal Pulldown', 'Sagittal Row', 'Single Arm Sagittal Pulldown', 'Sagital', 'Sagittal', 'Sagital Pulldown', 'Szagitalis', 'Szagitalis Lehuzas', 'Szagitális Lehúzás']],
  ['Straight-Arm Lat Pulldown', 'Egyeneskaros Lehúzás', 'w', 'machine', [20, 30, 42, 56, 72], '2 × 8–10', ['Straight Arm Pulldown']],
  ['Cable High Row', 'Magas Evezés Csigán', 'w', 'machine', [35, 50, 68, 88, 110], '2 × 8–10', ['High Cable Row']],
  ['Seated Cable Row', 'Ülő Csigás Evezés', 'w', 'machine', [50, 68, 90, 115, 142], '2 × 8–10', ['Cable Row']],
  ['High Row Machine', 'Gépes Magas Evezés', 'w', 'machine', [50, 75, 105, 140, 180], '2 × 8–10', ['High Row']],
  ['Chest Fly', 'Mell Tárogatás / Pec Deck', 'w', 'machine', [40, 60, 85, 115, 150], '2 × 8–10', ['Pec Deck', 'Pec Deck Machine', 'Machine Fly']],
  ['Machine Chest Press', 'Gépes Mellnyomás', 'w', 'machine', [55, 80, 110, 145, 185], '2 × 8–10', ['Chest Press']],
  ['Machine Shoulder Press', 'Gépes Vállnyomás', 'w', 'machine', [40, 55, 75, 98, 125], '2 × 8–10', ['Shoulder Press Machine']],
  ['Machine Lateral Raise', 'Gépes Oldalemelés', 'w', 'machine', [32, 50, 72, 100, 130], '2 × 10–12', []],
  ['Reverse Pec Deck', 'Hátsó Váll Pec Deck Gépen', 'w', 'machine', [40, 60, 85, 115, 150], '2 × 10–12', ['Reverse Fly Machine']],
  ['Cable Face Pull', 'Arcig Húzás Csigán', 'w', 'machine', [20, 30, 42, 56, 72], '2 × 10–12', ['Face Pull']],
  ['Cable Rope Triceps Pushdown', 'Csigás Kötél Tricepsz', 'w', 'machine', [22, 32, 45, 60, 78], '2 × 8–10', ['Triceps Pushdown', 'Rope Pushdown']],
  ['Single-Arm Overhead Cable Triceps Extension', '1 Kezes Fejfeletti Tricepsz', 'w', 'machine', [8, 13, 19, 26, 34], '2 × 8–10', []],
  ['Overhead Cable Triceps Extension', 'Fejfeletti Tricepsz Csigán', 'w', 'machine', [26, 40, 55, 72, 98], '2 × 8–10', []],
  ['Machine Preacher Curl', 'Gépes Scott Bicepsz (csigás)', 'w', 'machine', [45, 65, 90, 120, 155], '2 × 8–10', ['Preacher Curl Machine']],
  ['Cable Curl', 'Csigás Bicepsz', 'w', 'machine', [20, 30, 42, 56, 72], '2 × 8–10', []],
  ['Pull Up', 'Húzódzkodás (ismétlés)', 'r', 'bw', [1, 5, 11, 17, 25], '2 × max', ['Pull-Up', 'Pullup', 'Pull Ups', 'Chin Up', 'Húzódzkodás', 'Huzodzkodas']],
  ['Dips', 'Tolódzkodás (ismétlés)', 'r', 'bw', [1, 8, 18, 28, 40], '2 × max', ['Dip']],
  ['Push Up', 'Fekvőtámasz (ismétlés)', 'r', 'bw', [5, 18, 35, 55, 75], '2 × max', ['Push-Up']],
  ['Hanging Leg Raise', 'Függeszkedős Has (ismétlés)', 'r', 'bw', [1, 6, 12, 20, 30], '2 × 10–12', []],
  ['Hanging Oblique Leg Raise', 'Függeszkedős Oldalsó Lábemelés (oldalanként)', 'r', 'bw', [1, 5, 10, 16, 24], '2 × 10–12 / oldal', ['Hanging Oblique Raise']]
];
const RANK_DB = {}, RANK_ALIAS = {};
const BW_LOADED = new Set(['pull_up', 'dips']);
for (const [name, hu, type, equip, std, reps, aliases] of RANK_DB_RAW) {
  const key = exId(name);
  RANK_DB[key] = { key, name, hu, type, equip, std, reps };
  RANK_ALIAS[key] = key; for (const a of aliases) RANK_ALIAS[exId(a)] = key;
}
function rankKeyFor(id, st = state) { const m = st.rankMap?.[id]; if (m === 'none') return null; return (m && RANK_DB[m]) ? m : (RANK_ALIAS[id] || null); }
function bodyWeight(st = state) { const w = Number(st.body?.weight); return w > 0 ? w : 0; }
/* A rang mindig a JELENLEGI erőt mutatja: csak az utolsó 2 edzés (időrendben) legjobb szettje számít. */
const RANK_SESSIONS = 2;
function recentSessions(id) { return sessionsOf(id).filter(x => (x.r.sets || []).some(s => s?.done)).slice(-RANK_SESSIONS); }
function rankScore(id, type) { return scoreFromSessions(id, recentSessions(id), type); }
function scoreFromSessions(id, recent, type) {
  if (type === 'r') {
    // Húzódzkodás / tolódzkodás plusz súllyal: a teljes terhet (testsúly + plusz súly) átszámoljuk
    // „saját testsúlyos ismétlés-egyenértékre”, így a +20 kg × 9 többet ér, mint a sima 9 ismétlés.
    const loaded = BW_LOADED.has(rankKeyFor(id)), bw = bodyWeight();
    let best = null;
    for (const x of recent) for (const st of (x.r.sets || [])) {
      if (!st?.done || !positive(st.reps)) continue;
      const reps = toNum(st.reps), add = Math.max(0, toNum(st.weight) || 0);
      let sc = reps;
      if (loaded && bw && add > 0) sc = Math.max(reps, 30 * ((bw + add) * (1 + Math.min(reps, 12) / 30) / bw - 1));
      if (!best || sc > best.score) best = { score: sc, weight: add, rawReps: reps };
    }
    return best;
  }
  // A becslés 12 ismétlés fölött túl nagyvonalú, ezért a rangnál legfeljebb 12 ismétléssel számolunk.
  let best = null;
  for (const x of recent) for (const st of (x.r.sets || [])) {
    if (!st?.done || !positive(st.weight) || !positive(st.reps)) continue;
    const w = toNum(st.weight), reps = toNum(st.reps), sc = w * (1 + Math.min(reps, 12) / 30);
    if (!best || sc > best.score) best = { score: sc, reps: Math.min(reps, 12), weight: w, rawReps: reps };
  }
  return best;
}
/* A jelenlegi heti program gyakorlatai (csak ezek látszanak és számítanak a rangoknál). */
function programIds(st = state) {
  const L = withStateIf(st, () => layoutFor(state.cycle, state.week));
  return new Set(L.flatMap(day => day.flatMap(sl => sl.variants.map(v => exId(v.name)))));
}
function rankBounds(db, bw) {
  const f = db.type === 'w' ? Math.pow(bw / 80, 0.67) : 1, s = db.std.map(x => x * f);
  return [0, s[0], s[1], s[2], s[3], s[4], s[4] * 1.2, s[4] * 1.45, s[4] * 1.75];
}
/* Rang egy pontszámból: 8 rang × 3 fokozat = 0..23 pont. A legfelső (Legenda III) fölött „+pontok” gyűlnek. */
function rankFromScore(score, db, bw) {
  const B = rankBounds(db, bw), R = RANKS.length;
  if (score >= B[R]) {
    const step = (B[R] - B[R - 1]) / 3, plus = Math.floor((score - B[R]) / step) + 1;
    const from = B[R] + (plus - 1) * step, next = B[R] + plus * step;
    return { r: R - 1, sub: 2, pts: MAX_PTS, plus, label: `${RANKS[R - 1].n} III +${plus}`, color: RANKS[R - 1].c, next, nextLabel: `${RANKS[R - 1].n} III +${plus + 1}`, pct: (score - from) / (next - from), score };
  }
  let r = 0; for (let i = 0; i < R; i++) if (score < B[i + 1]) { r = i; break; }
  const lo = B[r], hi = B[r + 1], step = (hi - lo) / 3;
  const sub = Math.min(2, Math.max(0, Math.floor((score - lo) / step)));
  const pts = r * 3 + sub, next = sub < 2 ? lo + step * (sub + 1) : hi, nextPts = pts + 1;
  const nextLabel = nextPts > MAX_PTS ? `${RANKS[R - 1].n} III +1` : `${RANKS[Math.floor(nextPts / 3)].n} ${ROMAN[nextPts % 3]}`;
  const pct = Math.max(0, Math.min(1, (score - (lo + step * sub)) / (next - (lo + step * sub))));
  return { r, sub, pts, label: `${RANKS[r].n} ${ROMAN[sub]}`, color: RANKS[r].c, next, nextLabel, pct, score };
}
function rankOf(id, st = state) {
  const key = rankKeyFor(id, st); if (!key) return null;
  const db = RANK_DB[key], bw = bodyWeight(st);
  if (!bw && db.type === 'w') return { key, db, needBw: true };
  const sc = withStateIf(st, () => rankScore(id, db.type)); if (!sc) return { key, db, noData: true };
  return { key, db, ...rankFromScore(sc.score, db, bw || 80), reps: sc.reps, refWeight: sc.weight, refReps: sc.rawReps };
}
function withStateIf(st, fn) { return st === state ? fn() : withState(st, fn); }
function overallRank(st = state) {
  const ids = [...programIds(st)], pts = [];
  for (const id of ids) { const r = rankOf(id, st); if (r && r.pts !== undefined) pts.push(r.pts + (r.plus || 0)); }
  if (!pts.length) return null;
  const avg = Math.floor(pts.reduce((a, b) => a + b, 0) / pts.length);
  if (avg > MAX_PTS) { const plus = avg - MAX_PTS; return { pts: MAX_PTS, plus, label: `${RANKS[RANKS.length - 1].n} III +${plus}`, color: RANKS[RANKS.length - 1].c, n: pts.length }; }
  return { pts: avg, label: `${RANKS[Math.floor(avg / 3)].n} ${ROMAN[avg % 3]}`, color: RANKS[Math.floor(avg / 3)].c, n: pts.length };
}
function rankBadge(rk, big = false) {
  if (!rk || rk.pts === undefined) return '';
  const r = Math.floor(rk.pts / 3), sub = rk.pts % 3;
  return `<span class="rank-badge${big ? ' big' : ''}${r === RANKS.length - 1 ? ' legend' : ''}" style="--rc:${RANKS[r].c}" title="${esc(rk.label)}"><svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 2 37 9v13c0 11-7.5 18.5-17 22C10.5 40.5 3 33 3 22V9z" class="rb-shield"/><path d="M20 7 32 12v10c0 8-5.3 13.4-12 16-6.7-2.6-12-8-12-16V12z" class="rb-inner"/></svg><b>${rk.plus ? '+' + rk.plus : ROMAN[sub]}</b></span>`;
}
function rankNeedText(rk) {
  if (!rk || rk.pts === undefined) return '';
  if (rk.db.type === 'r') {
    const bw = bodyWeight(), w0 = rk.refWeight || 0;
    if (BW_LOADED.has(rk.key) && bw && w0 > 0) {
      const r = Math.ceil(30 * (bw * (1 + rk.next / 30) / (bw + w0) - 1));
      if (r > (rk.refReps || 0) && r <= 12) return `Következő: ${rk.nextLabel} · pl. +${showNum(w0)} kg × ${r}`;
      const w = Math.ceil((bw * (1 + rk.next / 30) / (1 + Math.min(rk.refReps || 5, 12) / 30) - bw) / 2.5) * 2.5;
      return `Következő: ${rk.nextLabel} · pl. +${showNum(Math.max(w, w0 + 2.5))} kg × ${rk.refReps}`;
    }
    return `Következő: ${rk.nextLabel} · még +${Math.max(1, Math.ceil(rk.next - rk.score))} ismétlés egy szettben`;
  }
  // Javaslat a legutóbbi legjobb szettedből: ugyanannyi ismétlés több súllyal (2,5 kg-os lépés, mindig több mint amit már emeltél), vagy ugyanaz a súly több ismétléssel.
  const reps = rk.reps || 5, w0 = rk.refWeight || 0;
  let w = Math.ceil(rk.next / (1 + reps / 30) / 2.5) * 2.5; if (w <= w0) w = Math.floor(w0 / 2.5) * 2.5 + 2.5;
  let alt = '';
  if (w0) { const r2 = Math.ceil((rk.next / w0 - 1) * 30); if (r2 > (rk.refReps || reps) && r2 <= 12) alt = ` vagy ${showNum(w0)} kg × ${r2}`; }
  return `Következő: ${rk.nextLabel} · pl. ${showNum(w)} kg × ${showNum(reps)}${alt}`;
}
const MACHINE_NOTE = '⚙️ Gépes gyakorlat: a terhelés gépenként és termenként eltérhet, ezért más teremben edzőkkel nem pontosan összemérhető.';

/* ---------- v28: rangtörténet, ranglétra, 1RM, ranglépés-animáció ---------- */
const rankLvl = rk => rk && rk.pts !== undefined ? rk.pts + (rk.plus || 0) : -1;
const rankEmoji = r => RANKS[Math.min(r, RANKS.length - 1)].n.split(' ')[0];
/* Becsült 1RM szövegesen. Plusz súlyos húzódzkodásnál/tolódzkodásnál a testsúllyal együtt értendő. */
function oneRmOf(key, score, bw = bodyWeight()) {
  const db = RANK_DB[key]; if (!db || !(score >= 0)) return '';
  if (db.type === 'w') return `${showNum(Math.round(score))} kg`;
  if (BW_LOADED.has(key) && bw) return `${showNum(Math.round(bw * (1 + score / 30)))} kg`;
  return `${showNum(Math.round(score))} ism.`;
}
function oneRmText(rk) {
  if (!rk || rk.score === undefined) return '';
  const v = oneRmOf(rk.key, rk.score);
  return rk.db.type === 'w' ? `1RM ≈ ${v}` : BW_LOADED.has(rk.key) && bodyWeight() ? `1RM ≈ ${v} (testsúllyal)` : `legjobb: ${v}`;
}
/* Rangod minden edzés után (mindig az addigi utolsó 2 edzésből, a mostani testsúlyoddal számolva). */
function rankHistory(id) {
  const key = rankKeyFor(id); if (!key) return [];
  const db = RANK_DB[key], bw = bodyWeight();
  if (!bw && db.type === 'w') return [];
  const done = sessionsOf(id).filter(x => (x.r.sets || []).some(s => s?.done)), out = [];
  done.forEach((x, i) => {
    const sc = scoreFromSessions(id, done.slice(Math.max(0, i - RANK_SESSIONS + 1), i + 1), db.type); if (!sc) return;
    const rk = { key, db, ...rankFromScore(sc.score, db, bw || 80) }, lvl = rankLvl(rk), prev = out[out.length - 1];
    out.push({ x, rk, lvl, up: !!prev && lvl > prev.lvl, from: prev?.rk });
  });
  return out;
}
const sessLab = x => isImported(x.c) ? 'Hevy' : `${state.maxCycle > 1 ? 'C' + x.c + ' ' : ''}W${x.w} ${(DAYS[x.d]?.name || '').replace('UPPER ', 'U').replace('LOWER ', 'L')}`;
function rankChartHtml(id) {
  const hist = rankHistory(id); if (!hist.length) return '';
  const W = 320, H = 170, L = 30, R = 14, T = 12, B = 24, lv = hist.map(h => h.lvl);
  const lo = Math.max(0, Math.floor((Math.min(...lv) - 1) / 3) * 3), hi = Math.max(lo + 3, Math.ceil((Math.max(...lv) + 2) / 3) * 3);
  const X = i => hist.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (hist.length - 1);
  const Y = v => T + (hi - v - 0.5) * (H - T - B) / (hi - lo - 1 || 1);
  const yb = v => Math.max(T - 4, Math.min(H - B + 4, Y(v - 0.5)));
  let bands = '';
  for (let b = lo; b < hi; b += 3) {
    const r = Math.floor(b / 3), c = RANKS[Math.min(r, RANKS.length - 1)].c, y1 = yb(b + 3), y2 = yb(b);
    bands += `<rect x="${L}" y="${y1.toFixed(1)}" width="${W - L - R}" height="${(y2 - y1).toFixed(1)}" fill="${c}" opacity=".09"/><line x1="${L}" x2="${W - R}" y1="${y2.toFixed(1)}" y2="${y2.toFixed(1)}" class="ch-grid"/>`;
    if (r < RANKS.length) bands += `<text x="${L - 5}" y="${((y1 + y2) / 2 + 4).toFixed(1)}" text-anchor="end" font-size="12">${rankEmoji(r)}</text>`;
  }
  const path = hist.map((h, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(h.lvl).toFixed(1)}`).join(' ');
  const dots = hist.map((h, i) => `${h.up ? `<circle cx="${X(i).toFixed(1)}" cy="${Y(h.lvl).toFixed(1)}" r="8" class="rk-ring" style="--dc:${h.rk.color}"/>` : ''}<circle cx="${X(i).toFixed(1)}" cy="${Y(h.lvl).toFixed(1)}" r="4.5" class="ch-dot rk-dot" style="--dc:${h.rk.color}"/>`).join('');
  const pts = hist.map((h, i) => ({ cx: X(i), cy: Y(h.lvl), read: [h.rk.label, ` · ${oneRmText({ ...h.rk })} · ${sessLab(h.x)}${fmtDate(h.x.t) ? ' · ' + fmtDate(h.x.t) : ''}${h.up ? ' · ⬆ ranglépés' : ''}`] }));
  const first = hist[0], last = hist[hist.length - 1], best = hist.reduce((a, h) => h.lvl > a.lvl ? h : a, first);
  const ups = hist.filter(h => h.up).length;
  return `<div class="chart-wrap rank-chart" data-pts="${esc(JSON.stringify(pts))}">
  <div class="chart-head"><span>Rangod alakulása edzésenként</span><b class="${last.lvl > first.lvl ? 'up' : ''}">${ups ? `⬆ ${ups} ranglépés` : ''}</b></div>
  <div class="chart-read"></div>
  <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Rang alakulása: ${esc(first.rk.label)} → ${esc(last.rk.label)}">${bands}<line class="ch-cross" y1="${T - 6}" y2="${H - B}" x1="-10" x2="-10"/><path d="${path}" class="ch-line rk-line"/>${dots}<text x="${L}" y="${H - 6}" class="ch-axis">${esc(sessLab(first.x))}</text>${hist.length > 1 ? `<text x="${W - R}" y="${H - 6}" class="ch-axis" text-anchor="end">${esc(sessLab(last.x))}</text>` : ''}<rect x="0" y="0" width="${W}" height="${H}" fill="transparent" class="ch-hit"/></svg>
  <div class="rk-sum"><div><span>EDDIG (ELSŐ)</span><b style="color:${first.rk.color}">${esc(first.rk.label)}</b></div><div><span>LEGJOBB</span><b style="color:${best.rk.color}">${esc(best.rk.label)}</b></div><div><span>MOST</span><b style="color:${last.rk.color}">${esc(last.rk.label)}</b></div></div></div>`;
}
/* Ranglétra egy gyakorlathoz: minden rang és fokozat, a hozzá kellő becsült 1RM-mel (a testsúlyodhoz igazítva). */
function rankLadderHtml(id) {
  const key = rankKeyFor(id); if (!key) return '';
  const db = RANK_DB[key], bw = bodyWeight(); if (!bw && db.type === 'w') return '';
  const B = rankBounds(db, bw || 80), cur = rankOf(id), cl = Math.min(rankLvl(cur), MAX_PTS);
  const kgUnit = db.type === 'w' || (BW_LOADED.has(key) && bw);
  const cell = v => db.type === 'w' ? showNum(Math.round(v)) : kgUnit ? showNum(Math.round(bw * (1 + v / 30))) : showNum(Math.ceil(v));
  let h = `<div class="ladder-card"><div class="chart-head"><span>Ranglétra · ${kgUnit ? 'becsült 1RM (kg)' + (db.type === 'w' ? '' : ', testsúllyal') : 'ismétlés egy szettben'}</span><b>${cur?.score !== undefined ? esc(oneRmText(cur)) : ''}</b></div><div class="ladder-grid"><span></span><span>I</span><span>II</span><span>III</span>`;
  for (let r = RANKS.length - 1; r >= 0; r--) {
    h += `<span class="ld-name" style="color:${RANKS[r].c}">${esc(RANKS[r].n)}</span>`;
    for (let s = 0; s < 3; s++) {
      const p = r * 3 + s, v = B[r] + (B[r + 1] - B[r]) * s / 3;
      h += `<span class="ld-cell${p === cl ? ' on' : p < cl ? ' past' : ''}" style="--rc:${RANKS[r].c}">${p === 0 ? '0' : cell(v)}</span>`;
    }
  }
  return h + `</div><div class="ld-note">Az értékek a ${bw ? showNum(bw) + ' kg-os testsúlyodhoz' : '80 kg-os testsúlyhoz'} igazítva, az alsó határt mutatják. A kiemelt mező a mostani rangod.${cur?.plus ? ` Te már a ${esc(RANKS[RANKS.length - 1].n)} III fölött jársz (+${cur.plus}).` : ''}</div></div>`;
}
/* Minden rang egy helyen, név szerint – és melyik gyakorlatod hol tart. */
function allRanksHtml() {
  const by = {}, ov = overallRank(), ovR = ov ? Math.min(Math.floor(ov.pts / 3), RANKS.length - 1) : -1;
  for (const id of programIds()) { const rk = rankOf(id); if (rk && rk.pts !== undefined) (by[rk.r] = by[rk.r] || []).push({ id, rk }); }
  let h = `<section class="all-ranks"><div class="eyebrow">AZ ÖSSZES RANG · ALULRÓL FELFELÉ ${RANKS.length} RANG × 3 FOKOZAT</div>`;
  for (let r = RANKS.length - 1; r >= 0; r--) {
    const list = (by[r] || []).sort((a, b) => rankLvl(b.rk) - rankLvl(a.rk));
    h += `<div class="ar-row${r === ovR ? ' me' : ''}" style="--rc:${RANKS[r].c}">${rankBadge({ pts: r * 3 + 2, label: RANKS[r].n })}<div class="ar-main"><div class="ar-name"><b>${esc(RANKS[r].n)}</b><span>${r + 1}. rang${r === ovR ? ' · ◀ itt tartasz összesítve' : ''}</span></div>${list.length ? `<div class="ar-ex">${list.map(x => `<button class="ar-chip" data-rstats="${esc(x.id)}">${esc(nameOf(x.id))} <i>${x.rk.plus ? '+' + x.rk.plus : ROMAN[x.rk.sub]} · ${esc(oneRmOf(x.rk.key, x.rk.score))}</i></button>`).join('')}</div>` : ''}</div></div>`;
  }
  return h + '</section>';
}
/* A FEJLŐDÉS oldalon: a legutóbbi ranglépések az összes gyakorlatodból. */
function recentRankUpsHtml() {
  const ups = [];
  for (const id of Object.keys(state.exercises || {})) for (const h of rankHistory(id)) if (h.up) ups.push({ id, ...h });
  if (!ups.length) return '';
  ups.sort((a, b) => later(b.x, a.x));
  return `<section class="summary-card rankups-card"><div class="summary-title">⬆ LEGUTÓBBI RANGLÉPÉSEK</div>${ups.slice(0, 6).map(u => `<button class="ru-row" data-rstats="${esc(u.id)}">${rankBadge(u.rk)}<div><b>${esc(nameOf(u.id))}</b><span><s>${esc(u.from.label)}</s> → <em style="color:${u.rk.color}">${esc(u.rk.label)}</em></span><span>${esc(oneRmText(u.rk))} · ${esc(sessLab(u.x))}${fmtDate(u.x.t) ? ' · ' + esc(fmtDate(u.x.t)) : ''}</span></div></button>`).join('')}</section>`;
}

/* ---------- v32: gyakorlat-útmutató (izomtérkép + kivitelezés) ----------
   m: izom:erősség (3 = fő célizom, 2 = másodlagos, 1 = segít/stabilizál) · s: lépések (|) · t: tipp / gyakori hiba */
const MUSCLES = {
  chest: 'Mellizom', delt_f: 'Elülső váll', delt_s: 'Oldalsó váll', delt_r: 'Hátsó váll', biceps: 'Bicepsz', triceps: 'Tricepsz',
  forearm: 'Alkar', abs: 'Egyenes hasizom', obl: 'Ferde hasizom', traps: 'Csuklyásizom', upback: 'Felső hát (rombusz)',
  lats: 'Széles hátizom', lowback: 'Gerincfeszítő (derék)', glutes: 'Farizom', quads: 'Combfeszítő (négyfejű)',
  hams: 'Combhajlító', adduct: 'Combközelítő (belső comb)', calves: 'Vádli'
};
const EX_INFO = {
  conventional_deadlift: ['glutes:3,hams:3,lowback:3,quads:2,traps:2,lats:1,forearm:2,upback:1', 'Állj a rúdhoz, a rúd a lábközép fölött legyen; vállszélességben fogd meg.|Csípő hátra, egyenes hát, mellkas fel; feszítsd meg a hátad, mielőtt húzol.|Lábbal told el a földet, a rúd végig a lábadhoz közel csússzon; fent csípőt előre, ne dőlj hátra.|Visszafelé csípő hátra, a rúd a combodon csúszik le.', 'A derék ne görbüljön be. Ha görbül, csökkentsd a súlyt.'],
  romanian_deadlift: ['hams:3,glutes:3,lowback:2,forearm:1,upback:1', 'Állj egyenesen, a rúd a combod előtt, térd enyhén hajlítva.|Csípőt told hátra, a rúd a combodon csúszik lefelé, amíg nyúlást érzel a comb hátsó részén.|Csípő előre tolásával gyere vissza.', 'Nem guggolás: a térd szöge végig alig változik, a mozgás a csípőből jön.'],
  back_squat: ['quads:3,glutes:3,adduct:2,lowback:2,hams:1,abs:1', 'Rúd a csuklyásizmon, lábak vállszélességben, lábujjak kicsit kifelé.|Vegyél levegőt, feszítsd a hasad, és ülj le csípő hátra–térd előre mozgással.|Legalább combpárhuzamosig menj, majd talpközépen told fel magad.', 'A térd a lábujjak irányába mutasson, ne essen befelé.'],
  front_squat: ['quads:3,glutes:2,abs:2,upback:2,adduct:1', 'Rúd az elülső vállakon, könyök magasan előre.|Egyenes törzzsel ülj le mélyre.|Talpközépről told fel, a könyök végig maradjon fent.', 'Ha előre dől a törzsed, a könyöködet emeld feljebb.'],
  bench_press: ['chest:3,delt_f:2,triceps:2', 'Feküdj a padra, a szemed a rúd alatt; lapockákat húzd hátra-le, talp a földön.|Vállszélességnél kicsit szélesebben fogd, a rudat engedd le kontrolláltan az alsó mellkasodra.|Told fel enyhén ív alakban a vállad fölé.', 'A könyök ne álljon 90°-ban oldalra, kb. 45–70°-ban legyen a törzshöz képest.'],
  incline_bench_press: ['chest:3,delt_f:3,triceps:2', 'Pad 30–45°-ban, lapockák hátra-le.|A rudat a felső mellkasodra engedd le.|Told fel függőlegesen.', 'Túl meredek pad (60° fölött) már inkább vállgyakorlat.'],
  overhead_press: ['delt_f:3,delt_s:2,triceps:2,traps:1,abs:1', 'Állva, rúd a vállad előtt, fogás vállszélesség.|Feszítsd a farizmod és a hasad, told a rudat egyenesen fel, a fejed hátrébb húzva.|Fent told át a fejed a rúd alá, majd engedd vissza.', 'Ne homoríts nagyot a derékkal.'],
  barbell_row: ['lats:3,upback:3,delt_r:2,biceps:2,lowback:2,forearm:1', 'Döntsd előre a törzsed kb. 45°-ra, egyenes háttal.|Húzd a rudat a hasad felé, a könyök hátra menjen.|Lassan engedd vissza.', 'Ne rántsd a törzsedet fel minden ismétlésnél.'],
  hip_thrust: ['glutes:3,hams:2,quads:1', 'Hát a padnak, rúd (párnával) a csípőn.|Sarokkal told fel a csípőd, amíg a törzs és a comb egy vonalba kerül.|Fent szorítsd meg a farizmod 1 mp-ig.', 'Az áll maradjon behúzva, a bordák lent.'],
  barbell_curl: ['biceps:3,forearm:2', 'Állj egyenesen, alsó fogással fogd a rudat.|Könyököd a törzsed mellett marad, csak az alkar mozog felfelé.|Lassan engedd le teljesen.', 'Ne lendítsd a törzseddel.'],
  scott_bench_preacher_curl: ['biceps:3,forearm:1', 'A felkarod feküdjön végig a Scott-padon.|Hajlítsd fel a súlyt, fent szorítsd.|Lassan engedd le majdnem teljesen nyújtott karig.', 'Alul ne ejtsd le, ott a legnagyobb a terhelés.'],
  dumbbell_bench_press: ['chest:3,delt_f:2,triceps:2', 'Feküdj a padra, súlyzók a mellkasod mellett, lapockák hátra-le.|Told fel a súlyzókat, fent kicsit közelítsenek.|Engedd le mélyen, amíg nyúlást érzel a mellben.', 'Kontrolláltan engedd le, ne essenek a súlyzók.'],
  incline_dumbbell_press: ['chest:3,delt_f:3,triceps:2', 'Pad 30–45°-ban, súlyzók a felső mellkas mellett.|Told fel őket a vállad fölé.|Lassan engedd vissza.', 'A könyök ne nyíljon teljesen oldalra.'],
  dumbbell_shoulder_press: ['delt_f:3,delt_s:2,triceps:2,traps:1', 'Ülj egyenes háttal, súlyzók fülmagasságban.|Told fel őket a fejed fölé.|Engedd vissza fülmagasságig.', 'Ne homoríts, a hátad maradjon a támlán.'],
  alternating_dumbbell_biceps_curl: ['biceps:3,forearm:2', 'Állj egyenesen, súlyzók a tested mellett.|Felváltva hajlítsd fel, közben fordítsd a tenyered felfelé.|Lassan engedd le.', 'A könyököd ne vándoroljon előre, ne lendíts.'],
  hammer_curl: ['biceps:3,forearm:3', 'Súlyzók a tested mellett, tenyér befelé (kalapácsfogás).|Hajlítsd fel úgy, hogy a tenyér végig befelé néz.|Lassan engedd le.', 'Az alkart és a karizmot (brachialis) is erősen dolgoztatja.'],
  lateral_raise: ['delt_s:3,delt_f:1,traps:1', 'Állj, súlyzók a tested mellett, könyök enyhén hajlítva.|Emeld oldalra vállmagasságig, a könyök vezessen.|Lassan engedd le.', 'Ne vond fel a vállad a füledhez, és ne lendíts.'],
  rear_delt_fly: ['delt_r:3,upback:2,traps:1', 'Dőlj előre egyenes háttal, súlyzók lógnak.|Tárd szét oldalra enyhén hajlított karral.|Lassan engedd vissza.', 'Ne a lapockákat húzd össze, a hátsó vállal emelj.'],
  dumbbell_row: ['lats:3,upback:2,delt_r:2,biceps:2,forearm:1', 'Egyik kéz és térd a padon, hát egyenes.|Húzd a súlyzót a csípőd felé, a könyök a test mellett hátra.|Engedd le, érezd a nyúlást.', 'Ne fordítsd ki a törzsed felfelé.'],
  dumbbell_fly: ['chest:3,delt_f:1', 'Feküdj a padra, súlyzók a mellkas fölött, könyök enyhén hajlítva.|Ív alakban engedd szét őket, amíg nyúlást érzel.|Ugyanazon az íven hozd vissza, mintha egy fát ölelnél.', 'Ne nyomd, hanem öleld; a könyök szöge ne változzon.'],
  dumbbell_wrist_curl: ['forearm:3', 'Ülj, az alkarod a combodon vagy padon, tenyér felfelé.|Csak a csuklóddal hajlítsd fel a súlyzót.|Lassan engedd le, akár az ujjakig gördítve.', 'Az alkar ne mozogjon, csak a csukló.'],
  dumbbell_reverse_wrist_curl: ['forearm:3', 'Alkar a combon/padon, tenyér lefelé.|Emeld fel a kézfejed csak a csuklóból.|Lassan engedd le.', 'Könnyebb súllyal megy, mint a csuklóhajlítás. Ez normális.'],
  dumbbell_deadlift: ['glutes:3,hams:3,quads:2,lowback:2,forearm:2,traps:1', 'Súlyzók a lábad mellett/előtt, egyenes hát.|Csípő hátra, majd lábbal told fel magad.|Fent csípő előre, lefelé ugyanígy vissza.', 'A hát ne görbüljön.'],
  goblet_squat: ['quads:3,glutes:2,adduct:2,abs:1', 'Fogd a súlyzót a mellkasod előtt.|Ülj le mélyre, a könyök a térdek között.|Told fel talpközépről.', 'A törzs maradjon egyenes, a sarok a földön.'],
  dumbbell_bulgarian_split_squat: ['quads:3,glutes:3,adduct:2,hams:1', 'Hátsó lábfej a padon, elöl a láb kb. egy nagy lépésre.|Ereszkedj le függőlegesen, amíg az első comb majdnem vízszintes.|Az első lábbal told fel magad.', 'Az első térd ne essen befelé; előredőlve több a farizom.'],
  hack_squat: ['quads:3,glutes:2,adduct:1', 'Hát és váll a párnának, lábak vállszélességben a platformon.|Engedd le mélyre kontrolláltan.|Told fel, fent ne zárd teljesen a térdet.', 'Lejjebb tett láb = több comb eleje, feljebb = több farizom.'],
  leg_press: ['quads:3,glutes:2,adduct:2,hams:1', 'Ülj be, láb csípőszélességben a platform közepén.|Engedd le, amíg a térd kb. 90° vagy mélyebb, a derék nem emelkedik el.|Told ki, a térd ne záródjon be teljesen.', 'Alul ne gördüljön fel a derekad.'],
  smith_machine_squat: ['quads:3,glutes:2,adduct:1,abs:1', 'Rúd a csuklyán, lábak kicsit a rúd előtt.|Ülj le mélyre egyenes törzzsel.|Told fel talpközépről.', 'A lábak elhelyezése dönti el, mennyi a comb vs. far.'],
  smith_machine_bulgarian_split_squat: ['quads:3,glutes:3,adduct:2,hams:1', 'Rúd a vállon, hátsó lábfej a padon.|Ereszkedj le függőlegesen.|Az első lábbal told fel.', 'Lábanként külön végezd, a gyengébb lábbal kezdj.'],
  smith_machine_bench_press: ['chest:3,delt_f:2,triceps:2', 'Pad a rúd alá, hogy a rúd az alsó mellkasra érkezzen.|Lapockák hátra-le, engedd le a rudat.|Told fel.', 'Ugyanaz, mint a fekvenyomás, csak a gép vezeti a rudat.'],
  smith_machine_overhead_shoulder_press: ['delt_f:3,delt_s:2,triceps:2,traps:1', 'Ülj a pad elejére, a rúd az állad előtt menjen.|Told fel a fejed fölé.|Engedd le állmagasságig.', 'Ne homoríts erősen.'],
  leg_extension: ['quads:3', 'Ülj be, a térd a gép forgáspontjánál, a párna a boka fölött.|Nyújtsd ki a lábad, fent 1 mp szorítás.|Lassan engedd vissza.', 'Ne lendítsd, fogd meg a kapaszkodót.'],
  seated_hamstring_curl: ['hams:3,calves:1', 'Ülj be, a párna a boka fölött, a combot rögzítsd.|Hajlítsd be a térded, amennyire tudod.|Lassan engedd vissza.', 'Ülve, előredőlve még jobban nyújtja a combhajlítót.'],
  lying_hamstring_curl: ['hams:3,calves:1', 'Feküdj hasra, a párna a boka fölött.|Hajlítsd be a térded a fenekedig.|Lassan engedd vissza.', 'A csípőd ne emelkedjen fel a padról.'],
  machine_hip_adduction: ['adduct:3', 'Ülj be, a párnák a térdek belső oldalán.|Zárd össze a lábaidat.|Lassan engedd szét.', 'Lassú, kontrollált visszaengedés.'],
  machine_hip_abduction: ['glutes:3', 'Ülj be, a párnák a térdek külső oldalán.|Told szét a lábaidat.|Lassan engedd vissza.', 'Kicsit előredőlve még jobban a farizmot dolgoztatja.'],
  standing_calf_raise: ['calves:3', 'Állj a gépbe, a lábujjpárnák a lépcső szélén.|Engedd le a sarkad mélyre.|Emelkedj lábujjhegyre, fent 1 mp szorítás.', 'Ne rugózz, alul tarts egy kis szünetet.'],
  seated_calf_raise: ['calves:3', 'Ülj be, a párna a térd fölött, a lábujjpárnák a lépcsőn.|Engedd le a sarkad mélyre.|Emelkedj fel, fent szorítsd.', 'Ülve a mélyebb vádliizom (soleus) dolgozik jobban.'],
  machine_ab_crunch: ['abs:3,obl:1', 'Ülj be, fogd a fogantyúkat, a lábad akassz be.|A hasad összehúzásával görbülj előre.|Lassan engedd vissza.', 'Ne a karoddal húzd, a hasaddal „tekerj”.'],
  chest_supported_row: ['lats:3,upback:3,delt_r:2,biceps:2', 'Mellkas a párnának, fogd a fogantyúkat.|Húzd a csípőd felé, a könyök a test mellett hátra.|Lassan engedd ki nyújtott karig.', 'A mellkasod maradjon végig a párnán.'],
  wide_grip_lat_pulldown: ['lats:3,upback:2,biceps:2,delt_r:1', 'Ülj be, combot rögzítsd, a rudat fogd szélesen.|Húzd a rudat a felső mellkasodhoz, a könyök lefelé-hátra.|Lassan engedd fel nyújtott karig.', 'Ne dőlj nagyon hátra, ne rántsd.'],
  single_arm_sagittal_pulldown: ['lats:3,upback:1,biceps:2,delt_r:1', 'Ülj be, egy kézzel fogd a fogantyút, a test előtt fentről.|Húzd lefelé a csípőd felé, a könyök a test mellett.|Lassan engedd fel, érezd a nyúlást a hát oldalán.', 'A könyök a törzsed mellett, előre-hátra síkban mozogjon.'],
  straight_arm_lat_pulldown: ['lats:3,triceps:1,abs:1', 'Állj a csiga elé, fogd a rudat/kötelet nyújtott karral.|Nyújtott karral húzd le a combodig.|Lassan engedd vissza.', 'A könyök végig majdnem nyújtott maradjon.'],
  cable_high_row: ['upback:3,lats:2,delt_r:2,biceps:2,traps:1', 'Ülj vagy térdelj a csiga elé, fogd fentről.|Húzd a fogantyút az arcod/mellkasod felé, könyök kifelé-hátra.|Lassan engedd vissza.', 'A lapockákat a végén húzd össze.'],
  seated_cable_row: ['lats:3,upback:3,delt_r:2,biceps:2,lowback:1', 'Ülj, lábad a talpon, egyenes hát.|Húzd a fogantyút a hasadhoz.|Lassan engedd ki, de a háttal ne dőlj előre nagyon.', 'Ne lendítsd a törzsed hátra.'],
  high_row_machine: ['upback:3,lats:3,delt_r:2,biceps:2', 'Ülj be, fogd fentről a fogantyúkat.|Húzd lefelé-hátra, a könyök a test mellé.|Lassan engedd vissza.', 'Lapockák hátra-le a mozgás végén.'],
  chest_fly: ['chest:3,delt_f:1', 'Ülj be, fogd a fogantyúkat, könyök enyhén hajlítva.|Zárd össze a karjaidat a mellkasod előtt.|Lassan engedd szét, amíg nyúlást érzel.', 'A könyök szöge ne változzon.'],
  machine_chest_press: ['chest:3,delt_f:2,triceps:2', 'Ülj be, a fogantyúk mellmagasságban.|Told előre a karod.|Lassan engedd vissza.', 'A lapockák maradjanak hátra húzva.'],
  machine_shoulder_press: ['delt_f:3,delt_s:2,triceps:2', 'Ülj be, a fogantyúk vállmagasságban.|Told fel.|Lassan engedd vissza.', 'A hátad maradjon a támlán.'],
  machine_lateral_raise: ['delt_s:3,delt_f:1,traps:1', 'Állj a gépbe, a mellkasod a párnán; a gép párnái a felkarod külső oldalán, a kezed a fogantyún.|Emeld a karod oldalra vállmagasságig, a könyök vezessen.|Lassan engedd vissza, lent se ejtsd le a súlyt.', 'Ne vond fel a vállad, és ne lendíts a törzseddel. (Ülő gépen ugyanez a mozdulat.)'],
  reverse_pec_deck: ['delt_r:3,upback:2,traps:1', 'Ülj be a gép felé fordulva, fogd a fogantyúkat.|Nyújtott karral tárd hátra.|Lassan engedd vissza.', 'Ne a lapockákat húzd össze, a hátsó vállal húzz.'],
  cable_face_pull: ['delt_r:3,upback:2,traps:2,biceps:1', 'Kötél a csigán szemmagasságban.|Húzd az arcod felé, a kezeket húzd szét.|Lassan engedd vissza.', 'Fent fordítsd kifelé a kezed (mintha bicepszet mutatnál).'],
  cable_rope_triceps_pushdown: ['triceps:3,forearm:1', 'Állj a csiga elé, fogd a kötelet, könyök a test mellett.|Nyújtsd le a karod, lent húzd szét a kötelet.|Lassan engedd vissza.', 'A könyök ne mozogjon előre-hátra.'],
  single_arm_overhead_cable_triceps_extension: ['triceps:3', 'Fordulj háttal a csigának, egy kézzel fogd a fogantyút a fejed mögött.|Nyújtsd ki a karod előre-fel.|Lassan engedd vissza.', 'A felkar maradjon a füled mellett.'],
  overhead_cable_triceps_extension: ['triceps:3', 'Háttal a csigának, kötél a fejed mögött, könyök előre.|Nyújtsd ki előre-fel a karjaidat.|Lassan engedd vissza nyújtásig.', 'Nyújtott helyzetben a tricepsz hosszú feje is erősen dolgozik.'],
  machine_preacher_curl: ['biceps:3,forearm:1', 'Ülj be, a felkar a párnán.|Hajlítsd fel a fogantyút.|Lassan engedd le majdnem nyújtott karig.', 'Alul ne ejtsd le.'],
  cable_curl: ['biceps:3,forearm:2', 'Állj a csiga elé, fogd alulról.|Hajlítsd fel, könyök a test mellett.|Lassan engedd le.', 'Ne lendíts.'],
  pull_up: ['lats:3,upback:2,biceps:2,forearm:2,delt_r:1,abs:1', 'Fogd a rudat vállszélességnél szélesebben, lógj nyújtott karral.|Húzd fel magad, amíg az állad a rúd fölé ér, mellkas a rúd felé.|Lassan engedd le teljesen.', 'Ne lendülj; ha még nem megy, gumiszalaggal vagy géppel segíts.'],
  dips: ['chest:2,triceps:3,delt_f:2', 'Támaszkodj fel a korláton nyújtott karral.|Ereszkedj le, amíg a váll a könyök alá kerül.|Told vissza magad.', 'Előredőlve több mell, egyenesen több tricepsz.'],
  push_up: ['chest:3,triceps:2,delt_f:2,abs:1', 'Kéz vállszélességben, test egyenes vonalban.|Engedd le a mellkasod a földig.|Told vissza.', 'A csípő ne lógjon le.'],
  hanging_leg_raise: ['abs:3,obl:2,forearm:1', 'Lógj a rúdon nyújtott karral.|Emeld fel a lábad (térdet) a hasad összehúzásával.|Lassan engedd le, ne lendülj.', 'A medencét is billentsd fel, ne csak a lábat emeld.'],
  hanging_oblique_leg_raise: ['obl:3,abs:2,forearm:1', 'Lógj a rúdon.|Emeld a térded fel és oldalra, a csípőt fordítsd.|Lassan engedd le, majd a másik oldal.', 'Lassan, lendítés nélkül.']
};
/* Saját rajzú izomtérkép: elöl + hátul. A bal fél rajzolt, a jobb tükrözött. */
const BODY_FRONT = [
  ['traps', 'M92,57 L77,66 L90,67 Z'],
  ['delt_s', 'M75,64 C63,64 56,74 57,90 L63,92 C63,80 66,72 75,68 Z'],
  ['delt_f', 'M75,68 C67,72 64,80 64,92 L70,96 C72,86 77,78 84,74 L83,68 Z'],
  ['chest', 'M84,72 L99,71 L99,104 C92,108 80,106 72,98 C71,88 76,78 84,72 Z'],
  ['biceps', 'M60,95 C55,105 55,119 57,130 L67,131 C70,119 70,106 67,97 Z'],
  ['forearm', 'M56,134 C50,150 49,164 50,178 L58,178 C62,164 66,150 67,135 Z'],
  ['obl', 'M73,102 C79,108 85,109 87,110 C86,128 86,144 88,160 L79,157 C76,140 72,120 73,102 Z'],
  ['abs', 'M88,109 L99,108 L99,162 L89,160 C87,142 87,126 88,109 Z'],
  ['quads', 'M78,163 C70,190 70,222 74,250 L90,252 C94,230 96,204 96,180 L87,170 Z'],
  ['adduct', 'M96,178 C96,202 94,226 92,246 L99,238 L99,176 Z'],
  ['calves', 'M76,268 C71,290 73,318 78,344 L87,344 C90,320 91,292 89,268 Z']
];
const BODY_BACK = [
  ['traps', 'M92,55 L75,65 L85,70 L99,98 L99,55 Z'],
  ['delt_r', 'M75,64 C63,64 56,74 57,90 L64,92 C66,80 72,72 83,70 Z'],
  ['upback', 'M85,71 L99,99 L99,110 L86,104 C81,94 80,80 85,71 Z'],
  ['lats', 'M72,96 C74,92 79,90 83,94 L86,105 L99,111 L99,140 L87,146 C80,130 74,114 72,96 Z'],
  ['lowback', 'M87,147 L99,141 L99,166 L87,163 Z'],
  ['triceps', 'M60,95 C55,105 55,119 57,130 L67,131 C70,119 70,106 67,97 Z'],
  ['forearm', 'M56,134 C50,150 49,164 50,178 L58,178 C62,164 66,150 67,135 Z'],
  ['glutes', 'M79,158 C73,170 73,186 79,195 C87,200 96,198 99,193 L99,168 L87,165 Z'],
  ['hams', 'M77,199 C72,216 72,236 76,252 L90,252 C94,234 96,214 97,200 Z'],
  ['calves', 'M76,264 C69,280 71,300 77,318 L89,318 C94,300 94,282 90,264 Z']
];
const BODY_FILL = '<ellipse cx="100" cy="30" rx="15" ry="19"/><rect x="92" y="46" width="16" height="14" rx="4"/><path d="M73,100 C72,120 76,145 79,158 L99,168 L121,158 C124,145 128,120 127,100 Z"/><ellipse cx="54" cy="187" rx="5" ry="9"/><ellipse cx="146" cy="187" rx="5" ry="9"/><ellipse cx="83" cy="259" rx="8" ry="8"/><ellipse cx="117" cy="259" rx="8" ry="8"/><path d="M77,318 L89,318 L88,346 L78,346 Z M123,318 L111,318 L112,346 L122,346 Z"/><ellipse cx="83" cy="353" rx="9" ry="5"/><ellipse cx="117" cy="353" rx="9" ry="5"/>';
function bodySvg(parts, m, dx, label) {
  const shape = (k, d) => { const v = m[k] || 0; return `<path d="${d}" class="mm${v ? ' mm' + v : ''}"/>`; };
  const body = parts.map(([k, d]) => shape(k, d) + `<g transform="translate(200,0) scale(-1,1)">${shape(k, d)}</g>`).join('');
  const absLines = label === 'ELÖL' ? '<path d="M89,122 H111 M89,136 H111 M89,149 H111 M100,108 V162" class="mm-line"/>' : '<path d="M100,56 V166" class="mm-line"/>';
  return `<g transform="translate(${dx},0)"><g class="mm-fill">${BODY_FILL}</g>${body}${absLines}<text x="100" y="372" text-anchor="middle" class="mm-lab">${label}</text></g>`;
}
function muscleMapSvg(m) {
  return `<svg viewBox="0 0 400 380" class="muscle-map" role="img" aria-label="Izomtérkép">${bodySvg(BODY_FRONT, m, 0, 'ELÖL')}${bodySvg(BODY_BACK, m, 200, 'HÁTUL')}</svg>`;
}
function exInfoFor(id) {
  const key = rankKeyFor(id) || RANK_ALIAS[id] || id, raw = EX_INFO[key]; if (!raw) return null;
  const m = {}; for (const p of raw[0].split(',')) { const [k, v] = p.split(':'); m[k] = Number(v); }
  return { m, steps: raw[1].split('|'), tip: raw[2] };
}
const ytUrl = name => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercise form');
let exInfoStop = null;
function openExInfo(id, name, hu) {
  if (exInfoStop) { exInfoStop(); exInfoStop = null; }
  document.getElementById('exInfo')?.remove();
  const info = exInfoFor(id), el = document.createElement('div');
  // 3D-s animáció, ha ehhez a gyakorlathoz már van és a készülék tudja; különben (vagy hiba esetén) a 2D-s rajz
  const use3d = typeof ANIM3D !== 'undefined' && ANIM3D.has(id), has2d = typeof ANIM !== 'undefined' && ANIM.has(id);
  const NOTE2D = 'Koppints az animációra a megállításhoz. A zöld részek a dolgozó izmok.', NOTE3D = 'Húzd az ujjad oldalra a körbeforgatáshoz, koppints a megállításhoz. A zöld részek a dolgozó izmok.';
  el.id = 'exInfo'; el.className = 'overlay edit-overlay exinfo-overlay';
  const lvl = [['FŐ CÉLIZOM', 3], ['MÁSODLAGOS', 2], ['SEGÍT, STABILIZÁL', 1]];
  const groups = info ? lvl.map(([t, v]) => { const ks = Object.keys(info.m).filter(k => info.m[k] === v); return ks.length ? `<div class="mi-group"><span class="mi-lvl mi${v}">${t}</span>${ks.map(k => `<div class="mi-row"><b>${esc(MUSCLES[k] || k)}</b><i class="mi-bar"><em class="mi${v}" style="width:${v * 33.3}%"></em></i></div>`).join('')}</div>` : ''; }).join('') : '';
  el.innerHTML = `<div class="timer-card edit-card stats-card exinfo-card"><div class="stats-top-row"><div class="eyebrow">GYAKORLAT-ÚTMUTATÓ</div><button class="secondary stats-close" data-close aria-label="Bezárás">✕</button></div>
  <div class="edit-title">${esc(name)}</div>${hu ? `<div class="exercise-hu">${esc(hu)}</div>` : ''}
  ${use3d || has2d ? `<div class="ex-anim" role="img" aria-label="${esc(name)} animáció"></div><div class="ei-note" id="exAnimNote">${use3d ? NOTE3D : NOTE2D}</div>` : ''}
  ${info ? `<div class="ei-sec">MELYIK IZMOT DOLGOZTATJA</div>${muscleMapSvg(info.m)}<div class="mi-legend"><span><i class="mi3"></i>fő</span><span><i class="mi2"></i>másodlagos</span><span><i class="mi1"></i>segít</span></div>${groups}
  <div class="ei-sec">HOGYAN CSINÁLD</div><ol class="ei-steps">${info.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol><div class="ei-tip">💡 ${esc(info.tip)}</div>` : `<div class="empty">Ehhez a gyakorlathoz még nincs leírás és izomtérkép. Szólj, és hozzáadom.</div>`}
  <a class="primary ei-video" href="${esc(ytUrl(name))}" target="_blank" rel="noopener">▶ VIDEÓK A YOUTUBE-ON</a><div class="ei-note">A videókeresés a YouTube-ot nyitja meg (internet kell). Az izmok erőssége tájékoztató jellegű.</div></div>`;
  let stop = () => {};
  exInfoStop = () => stop();
  el.addEventListener('click', ev => { if (ev.target === el || ev.target.closest('[data-close]')) { stop(); exInfoStop = null; el.remove(); } });
  document.body.appendChild(el);
  const box = el.querySelector('.ex-anim');
  if (box) {
    const play2d = () => {
      const note = el.querySelector('#exAnimNote'); box.className = 'ex-anim'; box.textContent = '';
      if (has2d) { stop = ANIM.play(box, id); if (note) note.textContent = NOTE2D; } else { stop = () => {}; box.remove(); note?.remove(); }
    };
    let s3 = null;
    if (use3d) { try { s3 = ANIM3D.mount(box, id, play2d); } catch (e) { s3 = null; } }
    if (s3) stop = s3; else play2d();
  }
}
let flashRankId = null;
function showRankUp(id, before, after, ovBefore, ovAfter) {
  document.getElementById('rankUp')?.remove();
  const first = rankLvl(before) < 0, el = document.createElement('div');
  el.id = 'rankUp'; el.className = 'rankup-overlay';
  const conf = Array.from({ length: 30 }, (_, i) => `<i style="--a:${Math.round(i * 12 + Math.random() * 8)}deg;--d:${Math.round(90 + Math.random() * 80)}px;--t:${(0.9 + Math.random() * 0.7).toFixed(2)}s;--c:${['#9cff57', after.color, '#ffffff'][i % 3]}"></i>`).join('');
  const ovUp = rankLvl(ovAfter) > rankLvl(ovBefore) && rankLvl(ovBefore) >= 0;
  el.innerHTML = `<div class="rankup-card" style="--rc:${after.color}"><div class="rankup-rays"></div><div class="rankup-burst">${conf}</div><div class="rankup-badge">${rankBadge(after, true)}</div><div class="rankup-eyebrow">${first ? 'MEGVAN AZ ELSŐ RANGOD!' : 'RANGLÉPÉS!'}</div><div class="rankup-ex">${esc(nameOf(id))}</div>${first ? '' : `<div class="rankup-old">${esc(before.label)}</div><div class="rankup-arrow">▼</div>`}<div class="rankup-new">${esc(after.label)}</div><div class="rankup-1rm">${esc(oneRmText(after))}</div>${ovUp ? `<div class="rankup-ov">Az összesített rangod is nőtt: <b style="color:${ovAfter.color}">${esc(ovAfter.label)}</b></div>` : ''}<div class="rankup-tap">Koppints a folytatáshoz</div></div>`;
  const close = () => { if (!el.isConnected || el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  el.onclick = close;
  document.body.appendChild(el);
  try { navigator.vibrate?.([40, 60, 90]); } catch (e) {}
  setTimeout(close, 7000);
}

/* RANGOK nézet */
let rankBoard = null;
function renderRanks() {
  const bw = bodyWeight(), ov = overallRank();
  let h = `<div class="eyebrow">RANGOK & RANGLISTA</div><div class="day-name">RANGOK</div><div class="day-meta">A rang a jelenlegi programod gyakorlataiból, az utolsó 2 edzés legjobb szettjéből számol (becsült 1RM), a testsúlyodhoz igazítva. ${RANKS.length} rang: ${RANKS.map(r => r.n).join(' → ')}, mindegyik I–III fokozattal; a ${RANKS[RANKS.length - 1].n} III fölött minden további fejlődés +1 pont.</div>`;
  h += `<section class="social-card bw-card"><div class="bw-row"><div><div class="eyebrow">TESTSÚLY</div><div class="bw-val">${bw ? showNum(bw) + ' kg' : 'nincs megadva'}</div>${state.body?.updatedAt ? `<div class="bw-date">frissítve: ${esc(fmtDate(state.body.updatedAt))}</div>` : ''}</div><form id="bwForm" class="bw-form"><input id="bwInput" inputmode="decimal" placeholder="pl. 82,5" value="${bw ? esc(showNum(bw)) : ''}"><button class="primary" type="submit">MENTÉS</button></form></div>
    <div class="bw-note">A barátaid is látják. Frissítsd, ha változik – a rangok ehhez igazodnak. Minden mentés megmarad, a görbe mutatja a változást.</div>${bwChartHtml()}</section>`;
  if (ov) h += `<section class="overall-card" style="--rc:${ov.color}">${rankBadge(ov, true)}<div><div class="eyebrow">ÖSSZESÍTETT RANG</div><div class="ov-label">${esc(ov.label)}</div><div class="bw-date">${ov.n} rangos gyakorlat átlaga</div></div></section>`;
  h += allRanksHtml();
  // ranglista
  h += `<div class="history-section">A BARÁTOK RANGJAI</div>`;
  if (!auth) h += '<div class="note">A ranglistához lépj be a 👥 BARÁTOK fülön.</div>';
  else {
    const keys = rankKeysInPlay();
    const sel = rankBoard && (rankBoard === '__overall' || keys.includes(rankBoard)) ? rankBoard : '__overall';
    h += `<select id="boardSel" class="lib-search board-sel"><option value="__overall"${sel === '__overall' ? ' selected' : ''}>🏆 Összesített rang</option>${keys.map(k => `<option value="${esc(k)}"${k === sel ? ' selected' : ''}>${esc(RANK_DB[k].name)}${RANK_DB[k].equip === 'machine' ? ' ⚙️' : ''}</option>`).join('')}</select>`;
    if (friends === null) h += '<div class="note">Barátok betöltése…</div>';
    else h += boardHtml(sel) + '<button class="secondary wide" id="boardReload">RANGLISTA FRISSÍTÉSE</button>';
  }
  // saját rangok
  const prog = programIds();
  const mine = [...prog].map(id => ({ id, rk: rankOf(id) })).filter(x => x.rk && (x.rk.pts !== undefined || x.rk.needBw));
  mine.sort((a, b) => (b.rk.pts ?? -1) - (a.rk.pts ?? -1));
  h += `<div class="history-section">SAJÁT RANGJAIM</div><input id="rankSearch" class="lib-search" placeholder="🔍 Gyakorlat keresése…" autocomplete="off">`;
  if (!bw) h += '<div class="note warn">Add meg a testsúlyodat, hogy a súlyos gyakorlatoknál is legyen rangod.</div>';
  h += mine.map(({ id, rk }) => rk.needBw ? '' : `<button class="rank-row" data-rstats="${esc(id)}" data-hname="${esc(norm(nameOf(id)) + ' ' + norm(rk.db.hu))}">${rankBadge(rk)}<div class="rr-main"><b>${esc(nameOf(id))}</b><span class="rr-label" style="color:${rk.color}">${esc(rk.label)}</span><span class="rr-1rm">${esc(oneRmText(rk))}</span><div class="rr-bar"><i style="width:${Math.round(rk.pct * 100)}%;background:${rk.color}"></i></div><span class="rr-need">${esc(rankNeedText(rk))}</span>${rk.db.equip === 'machine' ? '<span class="rr-machine">⚙️ gépes – a terhelés gépenként eltérhet</span>' : ''}</div></button>`).join('');
  const unranked = [...prog].filter(id => !rankKeyFor(id) && Object.values(state.exercises[id]?.occurrences || {}).some(anyDone));
  if (unranked.length) h += `<div class="note">Rang nélküli gyakorlataid: ${unranked.map(id => esc(nameOf(id))).join(', ')}. A CSERE ablakban a „Rang alapja” mezőnél hozzárendelheted egy hasonló gyakorlathoz.</div>`;
  workout.innerHTML = h;
  bindCharts(workout);
  $('bwForm').onsubmit = ev => {
    ev.preventDefault();
    const v = toNum($('bwInput').value);
    if (!(v >= 30 && v <= 250)) { $('bwInput').classList.add('invalid'); toast('Adj meg egy valós testsúlyt (30–250 kg).'); return; }
    setBodyWeight(v);
    save(); renderRanks(); toast('Testsúly elmentve.');
  };
  const bs = $('boardSel'); if (bs) bs.onchange = () => { rankBoard = bs.value; renderRanks(); };
  const br = $('boardReload'); if (br) br.onclick = () => { friends = null; renderRanks(); };
  $('rankSearch').oninput = e => { const q = norm(e.target.value); workout.querySelectorAll('[data-rstats]').forEach(b => b.classList.toggle('hidden', !!q && !b.dataset.hname.includes(q))); };
  workout.querySelectorAll('[data-rstats]').forEach(b => b.onclick = () => openStats(b.dataset.rstats));
  if (auth && (friends === null || Date.now() - friendsAt > 60000) && !socialBusy) { if (me) loadFriends(); else afterLogin(false).then(loadFriends).catch(() => {}); }
}
function rankKeysInPlay() {
  const ks = new Set();
  const add = st => { for (const id of programIds(st)) { const k = rankKeyFor(id, st); if (k && Object.values(st.exercises?.[id]?.occurrences || {}).some(anyDone)) ks.add(k); } };
  add(state); for (const f of (friends || [])) if (f.state) add(f.state);
  return [...ks].sort((a, b) => RANK_DB[a].name.localeCompare(RANK_DB[b].name));
}
/* Egy ember legjobb rangja egy adatbázis-gyakorlatban (ha több saját gyakorlata is ide tartozik, a legjobb számít). */
function bestFor(st, key) {
  let best = null;
  for (const id of programIds(st)) {
    if (rankKeyFor(id, st) !== key) continue;
    const rk = rankOf(id, st); if (!rk || rk.pts === undefined) continue;
    if (!best || rk.score > best.score) best = { ...rk, id };
  }
  return best;
}
function boardHtml(sel) {
  const people = [{ name: (me?.display_name || 'Én') + ' (te)', st: state, mine: true }, ...(friends || []).filter(f => f.state).map(f => ({ name: f.display_name || 'Névtelen', st: f.state }))];
  const rows = people.map(p => {
    const rk = sel === '__overall' ? overallRank(p.st) : bestFor(p.st, sel);
    return { ...p, rk, bw: bodyWeight(p.st) };
  }).filter(x => x.rk);
  rows.sort((a, b) => ((b.mine ? 1 : 0) - (a.mine ? 1 : 0)) || a.name.localeCompare(b.name, 'hu')); // nincs sorrend a rang szerint – nem verseny
  const db = sel === '__overall' ? null : RANK_DB[sel];
  let h = db?.equip === 'machine' ? `<div class="machine-note">${MACHINE_NOTE}</div>` : '';
  if (!rows.length) return h + '<div class="note">Ebben még senkinek nincs rangja.</div>';
  h += rows.map((x, i) => {
    const val = db ? (db.type === 'r' ? `${showNum(x.rk.score)} ismétlés` : `1RM ≈ ${showNum(Math.round(x.rk.score * 10) / 10)} kg`) : `${x.rk.n} gyakorlat`;
    return `<div class="board-row${x.mine ? ' me' : ''}">${rankBadge(x.rk)}<div class="board-main"><b>${esc(x.name)}</b><span>${esc(x.rk.label)} · ${val}${x.bw ? ` · ${showNum(x.bw)} kg testsúly` : ''}</span></div></div>`;
  }).join('');
  return h;
}

/* ---------- statisztika ablak ---------- */
function openStats(id) {
  const pb = personalBest(id), m = libMeta(id);
  $('statsTitle').textContent = nameOf(id);
  $('statsHu').textContent = m.hu || '';
  $('statsPb').textContent = pb ? `🏆 Rekord: ${showNum(pb.weight)} kg × ${showNum(pb.reps)} · ${state.maxCycle > 1 ? pb.c + '. ciklus, ' : ''}${pb.w}. hét` : '';
  $('statsPb').classList.toggle('hidden', !pb);
  $('statsInfo').onclick = () => openExInfo(id, nameOf(id), m.hu || '');
  $('statsBody').innerHTML = statsHtml(id);
  bindCharts($('statsBody'));
  $('statsOverlay').classList.remove('hidden');
  $('statsBody').scrollTop = 0;
}
$('statsClose').onclick = () => $('statsOverlay').classList.add('hidden');
$('statsOverlay').onclick = ev => { if (ev.target.id === 'statsOverlay') $('statsOverlay').classList.add('hidden'); };

/* ---------- export / import ---------- */
const LAST_EXPORT_KEY = 'ironlog-last-export';
function exportData(obj, filename) {
  if (obj === state) try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch (e) {}
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Biztonsági mentés letöltése elindult.');
}

/* ---------- HEVY IMPORT ----------
   Hevy → Profile → Settings → Export & Import Data → Export Data → Export Workouts (CSV, soronként egy szett).
   Oszlopok: title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg | weight_lbs, reps, …
   Minden Hevy-edzés külön alkalom lesz a 0. „ciklusban” (kulcs: 0-sorszám-0), a valódi dátumával – így az időrendi
   „legutóbbi”, a statisztika, a görbe, a havi összefoglaló és a rang is látja, de a heti nézetet nem keveri össze. */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] || '').trim());
}
const MONTHS_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTHS_HU = { jan: 0, febr: 1, feb: 1, marc: 2, mar: 2, apr: 3, maj: 4, jun: 5, jul: 6, aug: 7, szept: 8, szep: 8, okt: 9, nov: 10, dec: 11 };
function parseHevyDate(s) {
  s = String(s || '').trim(); if (!s) return 0;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  m = s.match(/^(\d{1,2})\s+([A-Za-zÀ-ž]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);   // „15 Jan 2024, 10:00”
  if (m) { const k = norm(m[2]).slice(0, 5); const mo = MONTHS_EN[k.slice(0, 3)] ?? MONTHS_HU[k] ?? MONTHS_HU[k.slice(0, 4)] ?? MONTHS_HU[k.slice(0, 3)]; if (mo !== undefined) return new Date(+m[3], mo, +m[1], +m[4], +m[5]).getTime(); }
  m = s.match(/^(\d{4})\.\s*([A-Za-zÀ-ž]+)\.?\s*(\d{1,2})\.?,?\s+(\d{1,2}):(\d{2})/);   // „2024. jan. 15. 10:00”
  if (m) { const k = norm(m[2]); const mo = MONTHS_HU[k] ?? MONTHS_HU[k.slice(0, 4)] ?? MONTHS_HU[k.slice(0, 3)]; if (mo !== undefined) return new Date(+m[1], mo, +m[3], +m[4], +m[5]).getTime(); }
  const t = Date.parse(s); return Number.isFinite(t) ? t : 0;
}
// Hevy gyakorlatnév → IRONLOG gyakorlat (ugyanaz a gyakorlat → közös előzmény és rang)
const HEVY_MAP = {
  'bench press (barbell)': 'Bench Press', 'incline bench press (barbell)': 'Incline Bench Press', 'deadlift (barbell)': 'Conventional Deadlift',
  'squat (barbell)': 'Back Squat', 'front squat (barbell)': 'Front Squat', 'romanian deadlift (barbell)': 'Romanian Deadlift', 'romanian deadlift (dumbbell)': 'Dumbbell Deadlift',
  'overhead press (barbell)': 'Overhead Press', 'bent over row (barbell)': 'Barbell Row', 'hip thrust (barbell)': 'Hip Thrust', 'bicep curl (barbell)': 'Barbell Curl',
  'ez bar biceps curl': 'Barbell Curl', 'preacher curl (barbell)': 'Scott Bench Preacher Curl', 'preacher curl (ez bar)': 'Scott Bench Preacher Curl', 'preacher curl (dumbbell)': 'Scott Bench Preacher Curl',
  'preacher curl (machine)': 'Machine Preacher Curl', 'bench press (dumbbell)': 'Dumbbell Bench Press', 'incline bench press (dumbbell)': 'Incline Dumbbell Press',
  'shoulder press (dumbbell)': 'Dumbbell Shoulder Press', 'seated overhead press (dumbbell)': 'Dumbbell Shoulder Press', 'bicep curl (dumbbell)': 'Alternating Dumbbell Biceps Curl',
  'hammer curl (dumbbell)': 'Hammer Curl', 'lateral raise (dumbbell)': 'Lateral Raise', 'lateral raise (machine)': 'Machine Lateral Raise',
  'rear delt reverse fly (dumbbell)': 'Rear Delt Fly', 'rear delt reverse fly (machine)': 'Reverse Pec Deck', 'dumbbell row': 'Dumbbell Row', 'chest fly (dumbbell)': 'Dumbbell Fly',
  'chest fly (machine)': 'Chest Fly', 'butterfly (pec deck)': 'Chest Fly', 'chest press (machine)': 'Machine Chest Press', 'shoulder press (machine)': 'Machine Shoulder Press',
  'shoulder press (machine plates)': 'Machine Shoulder Press', 'lat pulldown (cable)': 'Wide-Grip Lat Pulldown', 'lat pulldown (machine)': 'Wide-Grip Lat Pulldown',
  'lat pulldown - close grip (cable)': 'Wide-Grip Lat Pulldown', 'seated cable row - v grip (cable)': 'Seated Cable Row', 'seated cable row - bar grip': 'Seated Cable Row',
  'straight arm lat pulldown (cable)': 'Straight-Arm Lat Pulldown', 'face pull': 'Cable Face Pull', 'triceps pushdown': 'Cable Rope Triceps Pushdown',
  'triceps rope pushdown': 'Cable Rope Triceps Pushdown', 'triceps extension (cable)': 'Overhead Cable Triceps Extension', 'overhead triceps extension (cable)': 'Overhead Cable Triceps Extension',
  'single arm triceps pushdown (cable)': 'Single-Arm Overhead Cable Triceps Extension', 'bicep curl (cable)': 'Cable Curl', 'leg press (machine)': 'Leg Press', 'leg press horizontal (machine)': 'Leg Press',
  'hack squat (machine)': 'Hack Squat', 'leg extension (machine)': 'Leg Extension', 'seated leg curl (machine)': 'Seated Hamstring Curl', 'lying leg curl (machine)': 'Lying Hamstring Curl',
  'hip adduction (machine)': 'Machine Hip Adduction', 'hip abduction (machine)': 'Machine Hip Abduction', 'standing calf raise (machine)': 'Standing Calf Raise',
  'seated calf raise': 'Seated Calf Raise', 'crunch (machine)': 'Machine Ab Crunch', 'pull up': 'Pull Up', 'pull up (weighted)': 'Pull Up', 'chin up': 'Pull Up',
  'chest dip': 'Dips', 'triceps dip': 'Dips', 'chest dip (weighted)': 'Dips', 'push up': 'Push Up', 'hanging leg raise': 'Hanging Leg Raise', 'goblet squat': 'Goblet Squat',
  'bulgarian split squat': 'Dumbbell Bulgarian Split Squat', 'smith machine squat': 'Smith Machine Squat', 'smith machine bench press': 'Smith Machine Bench Press',
  't bar row': 'Chest-Supported Row', 'chest supported incline row (dumbbell)': 'Chest-Supported Row', 'wrist curl (dumbbell)': 'Dumbbell Wrist Curl', 'reverse wrist curl (dumbbell)': 'Dumbbell Reverse Wrist Curl'
};
function hevyName(title) {
  const t = String(title || '').trim(), k = t.toLowerCase();
  if (HEVY_MAP[k]) return HEVY_MAP[k];
  if (RANK_ALIAS[exId(t)]) return RANK_DB[RANK_ALIAS[exId(t)]].name;
  return t; // ismeretlen: saját néven kerül be (CSERE ablakban rang rendelhető hozzá)
}
function parseHevy(text) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('Üres fájl.');
  const head = rows[0].map(h => h.trim().toLowerCase()), col = n => head.indexOf(n);
  const iT = col('title'), iS = col('start_time'), iE = col('exercise_title'), iTy = col('set_type'), iKg = col('weight_kg'), iLb = col('weight_lbs'), iR = col('reps'), iIdx = col('set_index');
  if (iS < 0 || iE < 0 || iR < 0 || (iKg < 0 && iLb < 0)) throw new Error('Ez nem Hevy edzés-export (hiányzó oszlopok). A Hevy-ben az „Export Workouts” fájlt válaszd.');
  const sessions = new Map(); let skipped = 0;
  for (const r of rows.slice(1)) {
    const reps = toNum(r[iR]); if (!(reps > 0)) { skipped++; continue; } // kardió / időre mért sor
    let w = iKg >= 0 ? toNum(r[iKg]) : toNum(r[iLb]) * 0.45359237; if (!Number.isFinite(w) || w < 0) w = 0;
    w = Math.round(w * 4) / 4;
    const t = parseHevyDate(r[iS]); if (!t) { skipped++; continue; }
    const title = (iT >= 0 ? r[iT] : '') || 'Hevy edzés', key = `${t}|${title}`;
    const ss = sessions.get(key) || { t, title, ex: new Map() }; sessions.set(key, ss);
    const name = hevyName(r[iE]), e = ss.ex.get(name) || { orig: r[iE], warm: null, sets: [] }; ss.ex.set(name, e);
    const set = { weight: String(w), reps: String(Math.round(reps)), done: true, ts: t, idx: iIdx >= 0 ? toNum(r[iIdx]) : 0 };
    if ((iTy >= 0 ? r[iTy] : '').toLowerCase() === 'warmup') { if (!e.warm || w >= toNum(e.warm.weight)) e.warm = set; }
    else e.sets.push(set);
  }
  return { sessions: [...sessions.values()].sort((a, b) => a.t - b.t), skipped };
}
function importHevy(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = async () => {
    let parsed; try { parsed = parseHevy(String(fr.result)); } catch (e) { toast(e.message || 'Nem sikerült beolvasni.'); return; }
    state.hevyImported = state.hevyImported || {};
    const fresh = parsed.sessions.filter(s => !state.hevyImported[`${s.t}|${s.title}`]);
    if (!fresh.length) { toast(parsed.sessions.length ? 'Ezek az edzések már be vannak importálva.' : 'Nem találtam edzést a fájlban.'); return; }
    const names = new Map(); let sets = 0;
    for (const s of fresh) for (const [n, e] of s.ex) { names.set(e.orig, n); sets += e.sets.length; }
    const mapped = [...names].filter(([o, n]) => o !== n).slice(0, 12).map(([o, n]) => `  ${o} → ${n}`).join('\n');
    const first = new Date(fresh[0].t).toLocaleDateString('hu-HU'), last = new Date(fresh[fresh.length - 1].t).toLocaleDateString('hu-HU');
    if (!confirm(`Hevy import\n\n${fresh.length} edzés (${first} – ${last}), ${sets} munkasorozat, ${names.size} gyakorlat.\n${mapped ? '\nÖsszepárosítva az IRONLOG gyakorlataival:\n' + mapped + (names.size > 12 ? '\n  …' : '') + '\n' : ''}\nAz eddigi IRONLOG-adataid nem változnak, a Hevy-edzések az előzményekhez kerülnek (dátummal). Előtte automatikus helyi másolat készül.\n\nMehet?`)) return;
    lsSet(PRE_IMPORT_PREFIX + new Date().toISOString().slice(0, 19).replace('T', ' ') + ' hevy', JSON.stringify(state)); pruneSnaps();
    let seq = Math.max(0, ...Object.values(state.exercises).flatMap(x => Object.keys(x.occurrences || {})).filter(k => k.startsWith('0-')).map(k => Number(k.split('-')[1]) || 0));
    for (const s of fresh) {
      seq++;
      for (const [n, e] of s.ex) {
        const id = exId(n); if (!id) continue;
        const obj = ensureExercise(id);
        if (!state.names[id]) state.names[id] = n;
        state.library = state.library || {};
        if (!state.library[id]) state.library[id] = { name: n, hu: RANK_DB[rankKeyFor(id)]?.hu || '', reps: RANK_DB[rankKeyFor(id)]?.reps || '2 × 8–10' };
        e.sets.sort((a, b) => a.idx - b.idx);
        obj.occurrences[`0-${seq}-0`] = { warmup: e.warm ? { weight: e.warm.weight, reps: e.warm.reps, done: true, ts: s.t } : emptySet(), sets: e.sets.length ? e.sets.map(x => ({ weight: x.weight, reps: x.reps, done: true, ts: s.t })) : [emptySet(), emptySet()], ts: s.t, doneAt: s.t, src: 'hevy', title: s.title };
      }
      state.hevyImported[`${s.t}|${s.title}`] = seq;
    }
    await save(); render();
    toast(`Kész: ${fresh.length} Hevy-edzés importálva.`);
  };
  fr.readAsText(file);
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
let timerCtx = null; // { c, w, d, e, kind, s } – melyik szett után indult a pihenő
function persistTimer() { try { if (timerEnd) localStorage.setItem(TIMER_KEY, JSON.stringify({ end: timerEnd, kind: timerKind, ex: timerEx, ctx: timerCtx })); else localStorage.removeItem(TIMER_KEY); } catch (e) {} }
/* A következő elvégzendő szett az adott napon (a most befejezett után, a nap végén körbeér). */
function nextStep(ctx) {
  if (!ctx) return null;
  const slots = layoutFor(ctx.c, ctx.w)[ctx.d] || [], steps = [];
  slots.forEach((slot, e) => { const name = slotName(ctx.c, ctx.w, ctx.d, slot), r = recordFor(ctx.c, ctx.w, ctx.d, name); steps.push({ e, name, kind: 'warmup', s: 0, done: !!r?.warmup?.done || (r?.sets || []).some(x => x?.done) }); for (let s = 0; s < setCount(slot, r); s++) steps.push({ e, name, kind: 'work', s, done: !!r?.sets?.[s]?.done }); });
  let cur = steps.findIndex(x => x.e === ctx.e && x.kind === (ctx.kind === 'warmup' ? 'warmup' : 'work') && (ctx.kind === 'warmup' || x.s === ctx.s));
  if (cur < 0) cur = 0;
  // A bemelegítés nem kötelező: ha minden munkasorozat kész, az edzés kész.
  if (steps.every(x => x.kind === 'warmup' || x.done)) return { finished: true };
  for (let i = 1; i <= steps.length; i++) { const st = steps[(cur + i) % steps.length]; if (!st.done) return st; }
  return { finished: true };
}
function renderNext() {
  const box = $('timerNext'); if (!box) return;
  const st = nextStep(timerCtx);
  if (!st) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.textContent = '';
  const head = document.createElement('div'); head.className = 'next-head';
  const main = document.createElement('div'); main.className = 'next-main';
  const sub = document.createElement('div'); sub.className = 'next-sub';
  if (st.finished) { head.textContent = 'KÖVETKEZŐ'; main.textContent = 'A mai edzés minden szettje kész! 💪'; box.append(head, main); return; }
  head.textContent = `KÖVETKEZŐ · ${st.name} · ${st.kind === 'warmup' ? 'BEMELEGÍTÉS' : st.s + 1 + '. SZETT'}`;
  const last = latestBefore(timerCtx.c, timerCtx.w, timerCtx.d, st.name);
  if (st.kind === 'warmup') {
    const wu = last?.warmup;
    if (wu && (wu.weight || wu.reps)) { main.textContent = `${showNum(wu.weight) || '—'} kg × ${showNum(wu.reps) || '—'}`; sub.textContent = `legutóbbi bemelegítés · ${weekShort(last.c, last.w, last.t)}`; }
    else { main.textContent = 'Még nincs korábbi bemelegítés'; }
  } else {
    const hs = heavierSet(last);
    if (hs) { main.textContent = `${showNum(hs.weight)} kg × ${showNum(hs.reps)}`; sub.textContent = `minimum ennyi · előző edzés legerősebb szettje (${hs.i + 1}. szett, ${weekShort(last.c, last.w, last.t)})`; }
    else { main.textContent = 'Még nincs korábbi adat'; }
    const pb = personalBest(exId(st.name));
    if (pb) sub.textContent += ` · rekord: ${showNum(pb.weight)} kg × ${showNum(pb.reps)}`;
  }
  box.append(head, main, sub);
}
function startTimer(ex, kind = 'work', at = null) {
  timerCtx = at ? { c: state.cycle, w: state.week, d: state.day, ...at } : null;
  timerKind = kind; timerEx = ex;
  timerEnd = Date.now() + (kind === 'warmup' ? 60 : 150) * 1000;
  persistTimer(); showTimer();
}
function showTimer() {
  timerExercise.textContent = `${timerEx} · ${timerKind === 'warmup' ? 'bemelegítő szett után' : 'következő munkasorozat előtt'}`;
  try { renderNext(); } catch (e) {}
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
    if (t.end > Date.now()) { timerEnd = t.end; timerKind = t.kind || 'work'; timerEx = t.ex || ''; timerCtx = t.ctx || null; showTimer(); }
    else { localStorage.removeItem(TIMER_KEY); if (Date.now() - t.end < 15 * 60 * 1000) toast('A pihenőidő lejárt, amíg nem voltál itt.'); }
  } catch (e) {}
}
skipTimer.onclick = () => finishTimer(false);
add30.onclick = () => { if (!timerEnd) return; timerEnd += 30000; persistTimer(); tickTimer(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && timerEnd) { unlockAudio(); tickTimer(); if (timerEnd) requestWake(); } });
window.addEventListener('pageshow', () => { if (timerEnd) tickTimer(); });


/* ---------- közösség: fiók, szinkron, barátok, admin ---------- */
// A telefonon tárolt napló az elsődleges; a fiókba csak másolat kerül. Kapcsolat nélkül minden ugyanúgy működik.
const SB_URL = 'https://ssjtfvgslmtgjxmnnnou.supabase.co';
const SB_KEY = 'sb_publishable_fEv3pIvHqF_4DuRTvJ4LTQ_QIPtjC3D';
const AUTH_KEY = 'ironlog-auth', LASTSYNC_KEY = 'ironlog-lastsync';
let auth = (() => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } })();
let friendDay = null, friendsAt = 0;
let me = null, friends = null, friendsErr = '', socialFriend = null, adminList = null, syncTimer = null, syncErr = '', stateSwapped = false, authMode = 'login', socialBusy = false;

function setAuth(j) {
  auth = j ? { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (j.expires_in || 3600)), user: { id: j.user?.id, email: j.user?.email } } : null;
  try { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); } catch (e) {}
}
async function sbRaw(path, { method = 'GET', body, headers = {}, token } = {}) {
  const h = { apikey: SB_KEY, 'Content-Type': 'application/json', ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(SB_URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) { const e = new Error(j?.msg || j?.message || j?.error_description || j?.error || ('HTTP ' + r.status)); e.status = r.status; e.code = j?.error_code || j?.code; throw e; }
  return j;
}
let refreshing = null; // egyszerre csak egy tokenfrissítés fusson (különben a második érvénytelen tokennel próbálkozna)
async function accessToken() {
  if (!auth) return null;
  if (auth.expires_at * 1000 > Date.now() + 60000) return auth.access_token;
  if (!refreshing) refreshing = (async () => {
    const rt = auth.refresh_token;
    try { setAuth(await sbRaw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: rt } })); }
    catch (e) { if ((e.status === 400 || e.status === 401) && auth?.refresh_token === rt) { setAuth(null); me = null; } throw e; }
    finally { refreshing = null; }
  })();
  await refreshing;
  return auth?.access_token || null;
}
async function sb(path, opts = {}) { const t = await accessToken(); if (!t) throw new Error('Nincs bejelentkezve'); return sbRaw(path, { ...opts, token: t }); }
function authErrorText(e) {
  const m = String(e?.message || e), c = String(e?.code || '');
  if (/invalid_credentials|Invalid login/i.test(c + m)) return 'Hibás e-mail-cím vagy jelszó.';
  if (/user_already_exists|already registered/i.test(c + m)) return 'Ezzel az e-mail-címmel már regisztráltak – lépj be.';
  if (/weak_password|at least 6/i.test(c + m)) return 'A jelszó legyen legalább 6 karakter.';
  if (/email_not_confirmed/i.test(c + m)) return 'Az e-mail-cím nincs megerősítve.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Nincs internetkapcsolat.';
  return m;
}
const localHasData = st => Object.values(st?.exercises || {}).some(x => Object.values(x.occurrences || {}).some(hasData));

async function signIn(email, password, name, register) {
  const j = register
    ? await sbRaw('/auth/v1/signup', { method: 'POST', body: { email, password, data: { display_name: name } } })
    : await sbRaw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  if (!j?.access_token) throw new Error('A regisztráció megtörtént, de belépni még nem lehet (e-mail megerősítés szükséges).');
  setAuth(j);
  await afterLogin(true);
}
async function signOut() {
  if (!confirm('Kijelentkezel? Az edzésnaplód a telefonon marad, de az app használatához újra be kell lépned.')) return;
  try { await sb('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
  setAuth(null); me = null; friends = null; adminList = null; socialFriend = null; authMode = 'login';
  render();
}
/* Belépés után / indításkor: profil + a saját felhőmentés egyeztetése. */
async function afterLogin(interactive) {
  const rows = await sb('/rest/v1/rpc/my_profile', { method: 'POST', body: {} });
  me = rows?.[0] || null;
  if (!me) throw new Error('A profil nem található.');
  if (!me.approved) { render(); return; }
  if (me.is_admin && pendingFixes().length) applyProgramFix(true); // kérésre automatikusan (előtte helyi másolat)
  const srv = (await sb(`/rest/v1/user_state?user_id=eq.${auth.user.id}&select=state,updated_at`))?.[0];
  if (srv?.state && (srv.state.exercises || srv.state.logs)) {
    const srvNewer = (Number(srv.state.savedAt) || 0) > (Number(state.savedAt) || 0) + 5000;
    if (!localHasData(state) || (srvNewer && confirm(`A fiókodban újabb mentés van (${new Date(srv.updated_at).toLocaleString('hu-HU')}), mint ezen a telefonon.\n\nBetöltöd a fiókból? (Mégse: a telefonon lévő marad, és az kerül fel a fiókba.)`))) {
      lsSet(PRE_IMPORT_PREFIX + new Date().toISOString().slice(0, 19).replace('T', ' '), JSON.stringify(state)); pruneSnaps();
      state = migrate(srv.state); await save(); render();
      toast('Az edzésnapló betöltve a fiókodból.');
      return;
    }
  }
  await pushState();
  if (interactive) toast('Bejelentkezve. Az edzésnaplód feltöltve a fiókodba.');
}
function scheduleSync() { if (!auth || !me?.approved || stateSwapped) return; clearTimeout(syncTimer); syncTimer = setTimeout(pushState, 4000); }
async function pushState() {
  clearTimeout(syncTimer); syncTimer = null;
  if (!auth || !ready || !me?.approved) return;
  try {
    await sb('/rest/v1/user_state?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: auth.user.id, state, app_version: APP_VERSION, updated_at: new Date().toISOString() } });
    syncErr = ''; try { localStorage.setItem(LASTSYNC_KEY, String(Date.now())); } catch (e) {}
  } catch (e) { syncErr = authErrorText(e); }
  if (view === 'social' && !socialFriend) { const el = $('syncStatus'); if (el) el.textContent = syncStatusText(); }
}
function syncStatusText() {
  if (syncErr) return 'Feltöltés sikertelen: ' + syncErr + ' (később újrapróbálja)';
  const t = Number(localStorage.getItem(LASTSYNC_KEY) || 0);
  return t ? 'Utolsó feltöltés: ' + new Date(t).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Még nem volt feltöltés';
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && syncTimer) pushState();
  if (!document.hidden && auth && ready && !me) afterLogin(false).catch(() => {});
});

/* Barát adatainak nézése: ideiglenesen az ő állapotával számolunk (mentés ilyenkor tiltva). */
function withState(st, fn) { const prev = state, pf = stateSwapped; state = st; stateSwapped = true; try { return fn(); } finally { state = prev; stateSwapped = pf; } }
function friendSummary(st) {
  return withState(st, () => {
    const sessions = {};
    for (const obj of Object.values(state.exercises)) for (const [k, r] of Object.entries(obj.occurrences || {})) {
      if (!anyDone(r)) continue;
      const t = sessionTime(r), x = sessions[k] || (sessions[k] = { k, t: Infinity, n: 0 });
      x.t = Math.min(x.t, t || Infinity); x.n++;
    }
    const list = Object.values(sessions).map(x => { const [c, w, d] = x.k.split('-').map(Number); return { ...x, t: x.t === Infinity ? 0 : x.t, c, w, d, p: pos(c, w, d), vol: dayVolume(c, w, d).total }; }).sort((a, b) => later(b, a));
    const week = Date.now() - 7 * 864e5;
    return { list, last: list[0] || null, thisWeek: list.filter(x => x.t > week).length, maxCycle: state.maxCycle };
  });
}
async function loadFriends() {
  socialBusy = true; friendsErr = '';
  try {
    const [profiles, states] = await Promise.all([
      sb('/rest/v1/profiles?select=id,display_name,approved,share_enabled'),
      sb('/rest/v1/user_state?select=user_id,state,updated_at')
    ]);
    const byId = Object.fromEntries((states || []).map(x => [x.user_id, x]));
    friends = (profiles || []).filter(p => p.id !== auth.user.id).map(p => {
      const raw = byId[p.id]; let st = null;
      try { st = raw?.state ? migrate(raw.state) : null; } catch (e) { st = null; }
      return { ...p, state: st, updated_at: raw?.updated_at, sum: st ? friendSummary(st) : null };
    }).sort((a, b) => (b.sum?.last?.t || 0) - (a.sum?.last?.t || 0));
    if (me?.is_admin) adminList = await sb('/rest/v1/rpc/admin_members', { method: 'POST', body: {} });
    friendsAt = Date.now();
  } catch (e) { friendsErr = authErrorText(e); }
  socialBusy = false;
  if (view === 'social') renderSocial(); else if (view === 'ranks') renderRanks();
}

function setBodyWeight(v) {
  state.body = state.body || {}; state.body.weight = Math.round(v * 10) / 10; state.body.updatedAt = Date.now();
  state.body.history = [...(state.body.history || []), { t: Date.now(), kg: state.body.weight }].slice(-100);
}
const validBw = v => v >= 30 && v <= 250;
function renderAuth(head, done) {
  const reg = authMode === 'register', needBw = !bodyWeight();
  workout.innerHTML = head + `<section class="social-card"><div class="seg"><button class="${reg ? '' : 'on'}" id="modeLogin">BELÉPÉS</button><button class="${reg ? 'on' : ''}" id="modeReg">REGISZTRÁCIÓ</button></div>
    <form id="authForm" autocomplete="on">
      ${reg ? '<label class="field"><span>Név (ezt látják a barátaid)</span><input id="authName" autocomplete="nickname" required></label>' : ''}
      <label class="field"><span>E-mail</span><input id="authEmail" type="email" autocomplete="email" autocapitalize="off" required></label>
      <label class="field"><span>Jelszó${reg ? ' (min. 6 karakter)' : ''}</span><input id="authPass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required minlength="6"></label>
      ${reg && needBw ? '<label class="field"><span>Testsúly (kg) – a rangokhoz kell, a barátaid is látják</span><input id="authBw" inputmode="decimal" placeholder="pl. 78,5" required></label>' : ''}
      <div class="auth-err" id="authErr"></div>
      <button type="submit" class="primary wide" id="authSubmit">${reg ? 'REGISZTRÁCIÓ' : 'BELÉPÉS'}</button>
    </form></section>`;
  $('modeLogin').onclick = () => { authMode = 'login'; renderAuth(head, done); };
  $('modeReg').onclick = () => { authMode = 'register'; renderAuth(head, done); };
  $('authForm').onsubmit = async ev => {
    ev.preventDefault();
    const bwIn = $('authBw'), bwv = bwIn ? toNum(bwIn.value) : 0;
    if (bwIn && !validBw(bwv)) { bwIn.classList.add('invalid'); $('authErr').textContent = 'Adj meg egy valós testsúlyt (30–250 kg).'; return; }
    const btn = $('authSubmit'); btn.disabled = true; $('authErr').textContent = '';
    try {
      if (bwIn) { setBodyWeight(bwv); save(); }
      await signIn($('authEmail').value.trim(), $('authPass').value, reg ? $('authName').value.trim() : '', reg);
      if (bwIn) { setBodyWeight(bwv); save(); }
      done();
    } catch (e) { if (auth) { toast(authErrorText(e)); done(); return; } $('authErr').textContent = authErrorText(e); btn.disabled = false; }
  };
}
function renderGate() {
  if (auth && !bodyWeight()) {
    // Belépve, de nincs testsúly (pl. régi fiók vagy belépés új telefonon) → kötelező megadni.
    workout.innerHTML = `<div class="gate-hero"><div class="brand">IRON<span>LOG</span></div><div class="gate-title">Még egy lépés 💪</div><div class="day-meta">Add meg a testsúlyodat – ehhez igazodnak a rangjaid. A barátaid is látják. Később a 🏅 RANGOK fülön bármikor frissítheted.</div></div>
      <section class="social-card"><form id="gateBwForm"><label class="field"><span>Testsúly (kg)</span><input id="gateBw" inputmode="decimal" placeholder="pl. 78,5" required></label><div class="auth-err" id="gateErr"></div><button class="primary wide" type="submit">TOVÁBB</button></form></section>`;
    $('gateBwForm').onsubmit = ev => {
      ev.preventDefault();
      const v = toNum($('gateBw').value);
      if (!validBw(v)) { $('gateBw').classList.add('invalid'); $('gateErr').textContent = 'Adj meg egy valós testsúlyt (30–250 kg).'; return; }
      setBodyWeight(v); save(); view = 'workout'; render(); window.scrollTo(0, 0); toast('Testsúly elmentve. Jó edzést!');
    };
    return;
  }
  renderAuth(inAppWarning() + `<div class="gate-hero"><div class="brand">IRON<span>LOG</span></div><div class="gate-title">Üdv az IRONLOG-ban! 💪</div><div class="day-meta">Az app használatához regisztrálj, vagy lépj be. Így az edzésnaplód a fiókodban is biztonságban van, és láthatod a barátaid edzéseit és rangjait. A telefonodon lévő adatok megmaradnak.</div></div>`,
    () => { friends = null; view = 'workout'; render(); window.scrollTo(0, 0); if (bodyWeight()) toast(`Üdv${me?.display_name ? ', ' + me.display_name : ''}! Jó edzést!`); });
  const c2 = $('copyBtn2'); if (c2) c2.onclick = copyLink;
}
function renderSocial() {
  let h = `<div class="eyebrow">PROFIL & BARÁTOK</div><div class="day-name">BARÁTOK</div>`;
  if (!auth) return renderAuth(h + `<div class="day-meta">Lépj be, és kövessétek egymás edzéseit. Az edzésnaplód a telefonon marad, a fiókba csak egy másolat kerül.</div>`, () => { friends = null; renderSocial(); });
  if (socialFriend) return renderFriend();
  if (!me) {
    workout.innerHTML = h + '<div class="note">Profil betöltése…</div>';
    afterLogin(false).then(() => { if (view === 'social') renderSocial(); }).catch(e => { if (view === 'social') workout.innerHTML = h + `<div class="note">${esc(authErrorText(e))}</div><button class="secondary wide" id="retryBtn">ÚJRA</button>`; const b = $('retryBtn'); if (b) b.onclick = renderSocial; });
    return;
  }
  h += `<section class="social-card me-card"><div class="me-top"><div><div class="me-name">${esc(me.display_name || auth.user.email)}${me.is_admin ? ' <span class="admin-tag">ADMIN</span>' : ''}</div><div class="me-mail">${esc(auth.user.email)}</div></div><button class="secondary" id="renameBtn">NÉV</button></div>
    <div class="sync-line" id="syncStatus">${esc(syncStatusText())}</div>
    ${me.approved ? `<label class="switch-row"><input type="checkbox" id="shareToggle" ${me.share_enabled ? 'checked' : ''}><span><b>Adataim megosztása a többi taggal</b><small>Ha kikapcsolod, elrejted magad a többi tag elől.</small></span></label>` : '<div class="note warn">A fiókod jelenleg nem aktív, ezért a barátok nézete és a feltöltés szünetel.</div>'}
    <div class="me-actions"><button class="secondary" id="syncNow">FELTÖLTÉS MOST</button><button class="secondary" id="logoutBtn">KIJELENTKEZÉS</button></div></section>`;
  if (me.approved) {
    h += `<div class="history-section">BARÁTOK</div>`;
    if (friends === null || socialBusy) h += '<div class="note">Barátok betöltése…</div>';
    else if (friendsErr) h += `<div class="note">${esc(friendsErr)}</div>`;
    else if (!friends.length) h += '<div class="note">Még nincs más tag, vagy senki nem oszt meg adatot.</div>';
    else h += friends.map(f => {
      const s = f.sum, l = s?.last;
      return `<button class="friend-card" data-friend="${esc(f.id)}"><div class="friend-top"><b>${esc(f.display_name || 'Névtelen')}</b>${me.is_admin && !f.share_enabled ? '<span class="pill">nem oszt meg</span>' : ''}<span class="friend-week">${s ? `${s.thisWeek} edzés / 7 nap` : ''}</span></div>
        <div class="friend-last">${l ? `Utolsó: ${fmtDate(l.t) || ''} · ${DAYS[l.d]?.name || ''} · ${kg(l.vol)} kg` : 'Még nincs rögzített edzés'}</div></button>`;
    }).join('');
    h += '<button class="secondary wide" id="reloadFriends">FRISSÍTÉS</button>';
    if (me.is_admin) h += adminHtml();
  }
  workout.innerHTML = h;
  $('logoutBtn').onclick = signOut;
  $('syncNow').onclick = async () => { await pushState(); toast(syncErr ? 'Feltöltés sikertelen.' : 'Feltöltve.'); };
  $('renameBtn').onclick = async () => {
    const n = prompt('Milyen néven lássanak a barátaid?', me.display_name || ''); if (n === null || !n.trim()) return;
    try { await sb(`/rest/v1/profiles?id=eq.${auth.user.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { display_name: n.trim().slice(0, 40) } }); me.display_name = n.trim().slice(0, 40); renderSocial(); }
    catch (e) { toast(authErrorText(e)); }
  };
  const st = $('shareToggle');
  if (st) st.onchange = async () => {
    const v = st.checked;
    try { await sb(`/rest/v1/profiles?id=eq.${auth.user.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { share_enabled: v } }); me.share_enabled = v; toast(v ? 'A többi tag látja az edzéseidet.' : 'Elrejtve a többi tag elől.'); }
    catch (e) { st.checked = !v; toast(authErrorText(e)); }
  };
  const rf = $('reloadFriends'); if (rf) rf.onclick = () => { friends = null; renderSocial(); };
  workout.querySelectorAll('[data-friend]').forEach(b => b.onclick = () => { socialFriend = b.dataset.friend; friendDay = null; renderSocial(); window.scrollTo(0, 0); });
  bindAdmin();
  if (me.approved && (friends === null || Date.now() - friendsAt > 60000) && !socialBusy) loadFriends();
}
function adminHtml() {
  if (!adminList) return '';
  return `<div class="history-section">TAGOK · CSAK TE LÁTOD</div>` + adminList.filter(m => m.id !== auth.user.id).map(m => `
    <div class="admin-row"><div class="admin-info"><b>${esc(m.display_name || '—')}</b><span>${esc(m.email)}</span><span>${m.last_sync ? 'Utolsó feltöltés: ' + esc(new Date(m.last_sync).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : 'Még nem töltött fel'}</span>
      <span class="pills">${!m.approved ? '<span class="pill bad">eltávolítva</span>' : ''}${m.admin_hidden ? '<span class="pill">elrejtve mások elől</span>' : ''}${!m.share_enabled ? '<span class="pill">ő nem oszt meg</span>' : ''}</span></div>
      <div class="admin-btns">${m.approved ? `<button class="secondary" data-hide="${esc(m.id)}" data-v="${m.admin_hidden ? 0 : 1}">${m.admin_hidden ? 'LÁTHATÓ' : 'ELREJT'}</button>` : ''}<button class="secondary ${m.approved ? 'danger' : ''}" data-approve="${esc(m.id)}" data-v="${m.approved ? 0 : 1}">${m.approved ? 'ELTÁVOLÍT' : 'VISSZAVESZ'}</button></div></div>`).join('');
}
function bindAdmin() {
  const call = async (target, approved, hidden) => {
    try { await sb('/rest/v1/rpc/admin_set_member', { method: 'POST', body: { target, p_approved: approved, p_hidden: hidden } }); friends = null; adminList = null; renderSocial(); }
    catch (e) { toast(authErrorText(e)); }
  };
  workout.querySelectorAll('[data-hide]').forEach(b => b.onclick = () => call(b.dataset.hide, null, b.dataset.v === '1'));
  workout.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
    const rm = b.dataset.v === '0';
    if (rm && !confirm('Eltávolítod ezt a tagot? Nem lát senkit, őt sem látják, és nem tud feltölteni. Később visszaveheted.')) return;
    call(b.dataset.approve, !rm, null);
  });
}
function renderFriend() {
  const f = (friends || []).find(x => x.id === socialFriend);
  if (!f) { socialFriend = null; return renderSocial(); }
  let h = `<button class="secondary back-btn" id="friendBack">← BARÁTOK</button><div class="eyebrow">BARÁT</div><div class="day-name">${esc(f.display_name || 'Névtelen')}</div>`;
  if (!f.state || !f.sum) { workout.innerHTML = h + '<div class="note">Még nem töltött fel edzést.</div>'; $('friendBack').onclick = () => { socialFriend = null; renderSocial(); }; return; }
  const s = f.sum;
  h += `<div class="day-meta">${s.thisWeek} edzés az elmúlt 7 napban · összesen ${s.list.length} edzés${bodyWeight(f.state) ? ` · testsúly: ${showNum(bodyWeight(f.state))} kg` : ''}</div>`;
  const fov = overallRank(f.state);
  if (fov) h += `<section class="overall-card" style="--rc:${fov.color}">${rankBadge(fov, true)}<div><div class="eyebrow">ÖSSZESÍTETT RANG</div><div class="ov-label">${esc(fov.label)}</div></div></section>`;
  h += '<div class="history-section">LEGUTÓBBI EDZÉSEK</div>' + s.list.slice(0, 8).map(x => `<div class="session-row"><b>${esc(fmtDate(x.t) || '—')}</b><span>${isImported(x.c) ? 'Hevy-ből importálva' : `${DAYS[x.d]?.name || ''} · ${s.maxCycle > 1 ? x.c + '. ciklus ' : ''}${x.w}. hét`}</span><em>${kg(x.vol)} kg</em></div>`).join('');
  // Edzésnapok: a barát aktuális programja (az általa hozzáadott / cserélt gyakorlatokkal együtt)
  const fd = friendDay ?? f.state.day ?? 0;
  h += `<div class="history-section">EDZÉSNAPOK · ${f.state.maxCycle > 1 ? f.state.cycle + '. ciklus, ' : ''}${f.state.week}. hét</div><nav class="tabs friend-tabs">${DAYS.map((d, i) => `<button class="tab${i === fd ? ' active' : ''}" data-fday="${i}">${d.name}</button>`).join('')}</nav>`;
  h += withState(f.state, () => {
    const c = state.cycle, w = state.week, slots = layoutFor(c, w)[fd] || [];
    if (!slots.length) return '<div class="note">Ezen a napon nincs gyakorlat.</div>';
    return slots.map(slot => {
      const name = slotName(c, w, fd, slot), id = exId(name), l = lastDone(id), pb = personalBest(id), cur = recordFor(c, w, fd, name);
      const alt = slot.variants.length > 1 ? `<span class="pill">váltakozik: ${esc(slot.variants.map(v => v.name).join(' / '))}</span>` : '';
      const frk = rankOf(id);
      return `<button class="friend-ex fday-ex" data-fex="${esc(id)}"><b>${frk?.label ? rankBadge(frk) + ' ' : ''}${esc(name)}${frk?.label ? ` <small style="color:${frk.color}">${esc(frk.label)}</small>` : ''}</b><span>${esc(showReps(slot))} ${alt}</span>${anyDone(cur) ? `<span class="fx-now">Ezen a héten: ${esc(setsText(cur))}</span>` : ''}<span>${l ? `Legutóbb (${esc(fmtDate(l.t) || l.w + '. hét')}): ${esc(setsText(l))}` : 'Még nincs adat'}</span>${pb ? `<span>🏆 ${showNum(pb.weight)} kg × ${showNum(pb.reps)}</span>` : ''}</button>`;
    }).join('');
  });
  const ids = withState(f.state, () => libraryIds().filter(id => Object.values(state.exercises[id]?.occurrences || {}).some(anyDone)));
  h += `<div class="history-section">ÖSSZES GYAKORLATA</div><input id="friendSearch" class="lib-search" placeholder="🔍 Gyakorlat keresése…" autocomplete="off">`;
  h += withState(f.state, () => ids.map(id => { const pb = personalBest(id), l = lastDone(id), hs = heavierSet(l); return `<button class="friend-ex" data-fex="${esc(id)}" data-hname="${esc(norm(nameOf(id)) + ' ' + norm(libMeta(id).hu))}"><b>${esc(nameOf(id))}</b><span>${hs ? `Legutóbb: ${showNum(hs.weight)} kg × ${showNum(hs.reps)}` : ''}${pb ? ` · 🏆 ${showNum(pb.weight)} kg × ${showNum(pb.reps)}` : ''}</span></button>`; }).join(''));
  workout.innerHTML = h;
  $('friendBack').onclick = () => { socialFriend = null; friendDay = null; renderSocial(); window.scrollTo(0, 0); };
  workout.querySelectorAll('[data-fday]').forEach(b => b.onclick = () => { friendDay = +b.dataset.fday; renderFriend(); });
  $('friendSearch').oninput = e => { const q = norm(e.target.value); workout.querySelectorAll('[data-fex][data-hname]').forEach(b => b.classList.toggle('hidden', !!q && !b.dataset.hname.includes(q))); };
  workout.querySelectorAll('[data-fex]').forEach(b => b.onclick = () => {
    withState(f.state, () => openStats(b.dataset.fex));
    $('statsTitle').textContent = `${f.display_name || ''} · ${$('statsTitle').textContent}`;
  });
}


/* ---------- INFÓ & MEGHÍVÁS ---------- */
const APP_URL = 'https://skridii.github.io/v8/';
const INSTA_URL = 'https://www.instagram.com/skridi_/';
const INFO_KEY = 'ironlog-info-read';
// Instagram / Facebook / Messenger beépített böngészője nem tud appot telepíteni és tárhelye sem tartós.
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|TikTok|Snapchat/i.test(navigator.userAgent);
const IS_ANDROID = /Android/i.test(navigator.userAgent);
function inAppWarning() {
  if (!IN_APP_BROWSER) return '';
  return `<section class="inapp-warn"><b>⚠️ Az Instagram (vagy Facebook) beépített böngészőjében vagy.</b><span>Innen nem lehet az appot telepíteni, és az adataid sem maradnak meg biztonságosan.</span><span>${IS_ANDROID ? 'Koppints jobb fent a <b>⋮</b> menüre → <b>Megnyitás Chrome-ban</b> (vagy „Megnyitás böngészőben”).' : 'Koppints jobb fent a <b>•••</b> menüre → <b>Megnyitás külső böngészőben</b> / <b>Megnyitás Safariban</b>.'}</span><button class="secondary" id="copyBtn2">LINK MÁSOLÁSA</button><span class="muted">…vagy másold ki a linket, és illeszd be a ${IS_ANDROID ? 'Chrome' : 'Safari'} címsorába.</span></section>`;
}
function infoRead() { try { return !!localStorage.getItem(INFO_KEY); } catch (e) { return true; } }
function renderInfo() {
  const first = !infoRead();
  let h = first
    ? `<div class="eyebrow">ÜDV AZ IRONLOG-BAN</div><div class="day-name">Mielőtt kezdenéd 👋</div><div class="day-meta">Olvasd végig ezt a rövid útmutatót – a lap alján tudsz továbblépni a regisztrációhoz.</div>`
    : `<div class="eyebrow">INFÓ & MEGHÍVÁS</div><div class="day-name">IRONLOG</div><div class="day-meta">Edzésnapló, rangok és barátok – egy helyen.</div>`;
  h += `<section class="social-card invite-card"><div class="eyebrow">HÍVD MEG A BARÁTAIDAT</div><div class="invite-link">${esc(APP_URL.replace('https://', ''))}</div>
    <div class="me-actions"><button class="primary" id="shareBtn">MEGOSZTÁS</button><button class="secondary" id="copyBtn">LINK MÁSOLÁSA</button></div>
    <div class="bw-note">Küldd el a linket, nyissa meg, tegye ki a kezdőképernyőre, és regisztráljon a 👥 BARÁTOK fülön.</div></section>`;
  const sec = (t, items) => `<section class="social-card info-card"><div class="eyebrow">${t}</div><ol>${items.map(x => `<li>${x}</li>`).join('')}</ol></section>`;
  h += sec('📱 IPHONE – KEZDŐKÉPERNYŐRE', [
    'Nyisd meg a linket a <b>Safari</b> böngészőben (ha Instagramon kaptad: ••• → Megnyitás külső böngészőben).',
    'Koppints alul a <b>Megosztás</b> gombra (négyzet felfelé nyíllal).',
    'Válaszd: <b>Főképernyőhöz adás</b> → <b>Hozzáadás</b>.',
    'Ezután mindig az <b>IRONLOG ikonról</b> indítsd, ne a Safariból.',
    '⚠️ Az ikont <b>ne töröld</b> és ne add hozzá újra – iPhone-on az ikonhoz tartozik a tárhely, törléskor az adatok elveszhetnek.']);
  if (deferredPrompt) h += `<button class="primary wide" id="installNow">📲 TELEPÍTÉS MOST</button>`;
  h += sec('🤖 ANDROID – KEZDŐKÉPERNYŐRE', [
    'Nyisd meg a linket a <b>Chrome</b> böngészőben – <b>ne</b> az Instagram / Messenger beépített böngészőjében (ott: ⋮ → Megnyitás Chrome-ban).',
    'Jobb fent <b>⋮</b> menü → <b>Alkalmazás telepítése</b> (vagy <b>Hozzáadás a kezdőképernyőhöz</b> → <b>Telepítés</b>).',
    'Ezután az ikonról indítsd.']);
  h += sec('🚀 ELSŐ LÉPÉSEK', [
    '<b>👥 BARÁTOK</b> → <b>REGISZTRÁCIÓ</b>: név, e-mail, jelszó. A naplód innentől a fiókodba is mentődik.',
    '<b>🏅 RANGOK</b> → add meg a <b>testsúlyodat</b> (ehhez igazodnak a rangok).',
    'Ha más gyakorlatokat csinálsz, mint a programban: <b>CSERE</b> vagy <b>+ ÚJ GYAKORLAT HOZZÁADÁSA</b>.',
    'Eddig a <b>Hevy</b> appot használtad? A Hevy-ben: Profile → Settings → Export & Import Data → Export Data → <b>Export Workouts</b>, majd itt: <b>📈 FEJLŐDÉS</b> → legfelül <b>HEVY ADATOK BETÖLTÉSE</b>. Az előzményeid átjönnek.']);
  h += sec('🏋️ HOGYAN HASZNÁLD', [
    'Fent válaszd ki a <b>hetet</b> (1–6) és az <b>edzésnapot</b> (LOWER 1, UPPER 1…).',
    'Gyakorlatonként: <b>W</b> = bemelegítő szett, <b>1, 2</b> = munkasorozatok. Írd be a súlyt és az ismétlést, majd koppints a <b>○</b> gombra – indul a pihenőidő (1:00 / 2:30).',
    'Pihenő alatt a <b>KÖVETKEZŐ</b> kártya mutatja, mennyit emeltél legutóbb – minimum annyit tegyél fel.',
    '<b>+ SZETT / − SZETT</b>: a gyakorlat szettszáma, minden edzésen megmarad.',
    '<b>CSERE</b>: másik gyakorlat (a gyakorlatlistából vagy a rangos adatbázisból), eltávolítás egy napról vagy mindenhonnan – az adatok megmaradnak.',
    'A <b>gyakorlat nevére</b> koppintva statisztika és fejlődési görbe.',
    '<b>📝 Jegyzet</b>: gépbeállítás, fogás – minden héten ott lesz.',
    'Saját testsúlyos gyakorlatnál (húzódzkodás, lábemelés) a súly lehet <b>0</b>; plusz súlynál írd be a pluszt.',
    'A 6. hét végén indíts <b>ÚJ CIKLUST</b> – a régi eredmények megmaradnak.']);
  h += sec('📈 FEJLŐDÉS · 🏅 RANGOK · 👥 BARÁTOK', [
    '<b>FEJLŐDÉS</b>: heti és havi összefoglaló, rekordok, minden gyakorlat előzménye, biztonsági mentés fájlba.',
    `<b>RANGOK</b>: ${RANKS.map(r => r.n).join(' → ')}, I–III fokozattal.`+' A jelenlegi programod gyakorlataiból, az utolsó 2 edzés legjobb szettjéből számol, a testsúlyodhoz igazítva.',
    '<b>BARÁTOK</b>: látod a többiek edzéseit, edzésnapjait és rangjait. A megosztást a profilodban kikapcsolhatod.']);
  h += sec('🔒 AZ ADATAID', [
    'Minden a telefonodon tárolódik, internet nélkül is működik.',
    'Belépve a fiókodba is felkerül egy másolat – új telefonon belépve visszakapod.',
    'Hetente készíts <b>mentést fájlba</b> (FEJLŐDÉS oldal alja) – az app emlékeztet is.']);
  h += `<section class="credit-card"><div class="eyebrow">KÉSZÍTETTE</div><div class="credit-name">Sarkadi Ádám</div><div class="credit-nick">„Skridi”</div>
    <a class="primary insta-btn" href="${INSTA_URL}" target="_blank" rel="noopener">📸 Instagram · @skridi_</a><div class="bw-date">IRONLOG ${APP_VERSION}</div></section>`;
  if (first) h += `<button class="primary wide read-btn" id="infoDoneBtn">✓ ELOLVASTAM – TOVÁBB</button>`;
  workout.innerHTML = inAppWarning() + h;
  const c2 = $('copyBtn2'); if (c2) c2.onclick = copyLink;
  const ia = $('installNow'); if (ia) ia.onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; renderInfo(); } };
  const done = $('infoDoneBtn');
  if (done) done.onclick = () => { try { localStorage.setItem(INFO_KEY, String(Date.now())); } catch (e) {} view = 'workout'; render(); window.scrollTo(0, 0); };
  $('shareBtn').onclick = async () => {
    const data = { title: 'IRONLOG', text: 'Gyere, vezessük együtt az edzéseinket – IRONLOG edzésnapló:', url: APP_URL };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    copyLink();
  };
  $('copyBtn').onclick = copyLink;
}
async function copyLink() {
  try { await navigator.clipboard.writeText(APP_URL); toast('Link kimásolva – illeszd be az üzenetbe.'); }
  catch (e) { prompt('Másold ki a linket:', APP_URL); }
}

/* ---------- egyéb ---------- */
let toastTimer = null;
function toast(t) { const x = $('toast'); x.textContent = t; x.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => x.classList.remove('show'), 2600); }
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden'); installBtn.textContent = '📲 TELEPÍTÉS'; if (view === 'info' && ready) renderInfo(); });
installBtn.onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.classList.add('hidden'); } };
window.addEventListener('error', () => { try { toast('Hiba történt. Ha valami nem jelenik meg, indítsd újra az alkalmazást.'); } catch (e) {} });

/* Frissítés: ha új verzió települt, megjelenik a FRISSÍTÉS sáv (nem kell többször bezárni az appot). */
let swReg = null;
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(r => { swReg = r; }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) $('updateBar').classList.remove('hidden'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) try { swReg?.update().catch(() => {}); } catch (e) {} });
}
$('updateBtn').onclick = () => { save(); setTimeout(() => location.reload(), 150); };
render();
load().then(() => { render(); restoreTimer(); if (auth) afterLogin(false).then(() => renderBanner()).catch(() => {}); }).catch(() => {
  // Ha a betöltés váratlanul elakad, NEM írunk felül semmit (ready=false marad).
  workout.innerHTML = '<div class="note">Az adatok betöltése nem sikerült. Zárd be teljesen az alkalmazást, és nyisd meg újra. Az adataid nem törlődtek.</div>';
});
