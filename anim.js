'use strict';
/* IRONLOG – saját rajzú gyakorlat-animációk (v33).
   Minden figura és gép kódból rajzolt SVG (nincs letöltött kép).
   Oldalnézet ('side'): a figura jobbra néz. Szemből ('front'): szimmetrikus figura.
   Egy gyakorlat = két póz (A = kiinduló, B = a mozdulat vége) + felszerelés; a motor oda-vissza mozgatja.
   Póz mezők: hip [x,y] csípő · t törzsszög (0 = függőleges, + = előre dől) vagy sh [x,y] váll ·
   h / h2 kéz (közeli / távoli) · f / f2 boka · toe / toe2 lábujj · wr csukló-szög · eb / kb könyök/térd hajlásirány.
   Pont megadható abszolútan [x,y], vagy egy ízülethez képest: {j:'sh'|'hip', d:[dx,dy]}. */
const ANIM = (() => {
  const L = { torso: 50, ua: 29, fa: 26, hand: 8, th: 39, sh: 38 };
  const GROUND = 186, VB = [0, -24, 240, 214];
  const rad = a => a * Math.PI / 180;
  const dirv = a => [Math.sin(rad(a)), -Math.cos(rad(a))];
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = v => Math.hypot(v[0], v[1]);
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const f1 = n => Math.round(n * 10) / 10;
  function ik(root, target, l1, l2, bend) {
    let v = sub(target, root), d = len(v);
    const maxd = l1 + l2 - 0.05, mind = Math.abs(l1 - l2) + 0.5;
    if (d > maxd) { v = [v[0] * maxd / d, v[1] * maxd / d]; d = maxd; }
    if (d < mind) { if (d < 0.01) v = [0, mind]; else v = [v[0] * mind / d, v[1] * mind / d]; d = mind; }
    const a = Math.atan2(v[1], v[0]);
    const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const ang = a + bend * b;
    return [[root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1], add(root, v)];
  }
  /* két IK-megoldás közül a kifelé eső (szemből nézetnél) */
  function ikOut(root, target, l1, l2, side) {
    const p = ik(root, target, l1, l2, 1), q = ik(root, target, l1, l2, -1);
    return (p[0][0] - q[0][0]) * side >= 0 ? p : q;
  }
  const resolve = (spec, J) => !spec ? null : Array.isArray(spec) ? spec : add(J[spec.j], spec.d);
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function mixPose(A, B, t) {
    const out = {};
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const a = A[k] ?? B[k], b = B[k] ?? A[k];
      if (typeof a === 'number') out[k] = lerp(a, b, t);
      else if (Array.isArray(a)) out[k] = lerpP(a, b, t);
      else if (a && a.j) out[k] = { j: a.j, d: lerpP(a.d, b.d || a.d, t) };
      else out[k] = t < 0.5 ? a : b;
    }
    return out;
  }
  /* ---------- csontváz kiszámítása ---------- */
  function solveSide(P, ex) {
    const J = {};
    J.hip = P.hip;
    if (P.sh) { const v = sub(P.sh, P.hip); J.t = Math.atan2(v[0], -v[1]) * 180 / Math.PI; }
    else J.t = P.t || 0;
    J.sh = add(J.hip, dirv(J.t), L.torso);
    J.neck = add(J.sh, dirv(J.t + (P.hd || 0)), 7);
    J.head = add(J.sh, dirv(J.t + (P.hd || 0)), 17);
    const eb = P.eb ?? ex.eb ?? 1, kb = P.kb ?? ex.kb ?? -1;
    const h = resolve(P.h, J) || add(J.sh, [3, 50]);
    [J.el, J.h] = ik(J.sh, h, L.ua, L.fa, eb);
    const h2 = resolve(P.h2, J) || add(J.h, [-4, 0]);
    [J.el2, J.h2] = ik(add(J.sh, [-3, 0]), h2, L.ua, L.fa, P.eb2 ?? ex.eb2 ?? eb);
    const fa = Math.atan2(J.h[1] - J.el[1], J.h[0] - J.el[0]) + rad(P.wr || 0);
    J.hd = [J.h[0] + Math.cos(fa) * L.hand, J.h[1] + Math.sin(fa) * L.hand];
    const fa2 = Math.atan2(J.h2[1] - J.el2[1], J.h2[0] - J.el2[0]) + rad(P.wr || 0);
    J.hd2 = [J.h2[0] + Math.cos(fa2) * L.hand, J.h2[1] + Math.sin(fa2) * L.hand];
    const f = resolve(P.f, J) || [J.hip[0] + 3, GROUND - 5];
    [J.kn, J.f] = ik(J.hip, f, L.th, L.sh, kb);
    const f2 = resolve(P.f2, J) || add(J.f, [-5, 0]);
    [J.kn2, J.f2] = ik(add(J.hip, [-2, 0]), f2, L.th, L.sh, P.kb2 ?? ex.kb2 ?? kb);
    J.toe = resolve(P.toe, J) || add(J.f, [11, 4]);
    J.toe2 = resolve(P.toe2, J) || add(J.f2, [11, 4]);
    return J;
  }
  function solveFront(P, ex) {
    const J = {}, c = P.hip[0];
    J.hip = P.hip; J.sh = [c, P.hip[1] - L.torso];
    J.head = [c, J.sh[1] - 17]; J.neck = [c, J.sh[1] - 6];
    J.shR = [c + 16, J.sh[1] + 3]; J.shL = [c - 16, J.sh[1] + 3];
    J.hpR = [c + 8, P.hip[1]]; J.hpL = [c - 8, P.hip[1]];
    const mir = p => [2 * c - p[0], p[1]];
    const hR = resolve(P.h, J) || [c + 20, J.sh[1] + 52], hL = resolve(P.hL, J) || mir(hR);
    [J.elR, J.hR] = ikOut(J.shR, hR, L.ua, L.fa, 1); [J.elL, J.hL] = ikOut(J.shL, hL, L.ua, L.fa, -1);
    const fR = resolve(P.f, J) || [c + 10, GROUND - 5], fL = resolve(P.fL, J) || mir(fR);
    if (P.k) { J.knR = resolve(P.k, J); J.knL = P.kL ? resolve(P.kL, J) : mir(J.knR); J.fR = fR; J.fL = fL; }
    else { [J.knR, J.fR] = ikOut(J.hpR, fR, L.th, L.sh, 1); [J.knL, J.fL] = ikOut(J.hpL, fL, L.th, L.sh, -1); }
    return J;
  }
  /* ---------- izom-intenzitás ---------- */
  function musclesOf(key) {
    const raw = typeof EX_INFO !== 'undefined' && EX_INFO[key]; const m = {};
    if (raw) for (const p of raw[0].split(',')) { const [k, v] = p.split(':'); m[k] = Number(v); }
    return m;
  }
  const OP = [0, .35, .65, 1];
  const BODY = '#4f5a65', BODY_FAR = '#323a42', EQ = '#6f7a85', EQ_DARK = '#2a3138', LIME = '#9cff57';
  function seg(a, b, w, col) { return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; }
  /* izom-csík egy végtagszakasz elülső (+1) vagy hátsó (-1) felén */
  function stripe(a, b, w, side, lvl, normalSign, far) {
    if (!lvl) return '';
    const v = sub(b, a), d = len(v) || 1, u = [v[0] / d, v[1] / d];
    const n = [u[1] * normalSign, -u[0] * normalSign]; // elülső normális
    const off = side * w / 4, s = 0.12;
    const p = add(add(a, u, d * s), n, off), q = add(add(b, u, -d * s), n, off);
    return `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="${LIME}" stroke-opacity="${OP[lvl] * (far ? .55 : 1)}" stroke-width="${f1(side ? w / 2 : w * .6)}" stroke-linecap="round"/>`;
  }
  const dot = (p, r, col, op = 1) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${col}" fill-opacity="${op}"/>`;
  function drawSide(J, m, ex) {
    const pr = ex.prone ? -1 : 1, mx = (...k) => Math.max(0, ...k.map(x => m[x] || 0));
    const limbsArm = (sh, el, h, hd, far) => {
      const col = far ? BODY_FAR : BODY;
      return seg(sh, el, 9.5, col) + seg(el, h, 8, col) + seg(h, hd, 6.5, col) +
        stripe(sh, el, 9.5, 1, m.biceps, pr, far) + stripe(sh, el, 9.5, -1, m.triceps, pr, far) + stripe(el, h, 8, 0, m.forearm, pr, far);
    };
    const limbsLeg = (hip, kn, f, toe, far) => {
      const col = far ? BODY_FAR : BODY;
      return seg(hip, kn, 14, col) + seg(kn, f, 10, col) + seg(f, toe, 6, col) +
        stripe(hip, kn, 14, 1, m.quads, pr, far) + stripe(hip, kn, 14, -1, m.hams, pr, far) +
        (m.adduct > 1 && !m.quads ? stripe(hip, kn, 14, 0, m.adduct, pr, far) : '') + stripe(kn, f, 10, -1, m.calves, pr, far);
    };
    let s = '';
    s += limbsLeg(J.hip, J.kn2, J.f2, J.toe2, true) + limbsArm(add(J.sh, [-3, 0]), J.el2, J.h2, J.hd2, true);
    // törzs: alsó és felső fél
    const mid = lerpP(J.hip, J.sh, 0.5), back = mx('lats', 'upback'), front = mx('abs', 'obl');
    s += seg(J.hip, J.sh, 19, BODY) + dot(J.hip, 10, BODY) + seg(J.sh, J.neck, 7, BODY) + dot(J.head, 9.5, BODY);
    const tnorm = -pr; // a törzs iránya csípő→váll, ezért a normális előjele fordított
    s += stripe(mid, J.sh, 19, 1, m.chest, tnorm) + stripe(mid, J.sh, 19, -1, back, tnorm) +
      stripe(J.hip, mid, 19, 1, front, tnorm) + stripe(J.hip, mid, 19, -1, m.lowback, tnorm);
    if (m.traps) s += stripe(lerpP(J.sh, J.neck, -0.4), J.neck, 9, -1, m.traps, tnorm);
    if (m.glutes) { const v = sub(J.sh, J.hip), d = len(v), n = [-v[1] / d * tnorm, v[0] / d * tnorm]; s += dot(add(J.hip, n, -6), 6.5, LIME, OP[m.glutes]); }
    s += limbsLeg(J.hip, J.kn, J.f, J.toe, false);
    const delt = mx('delt_f', 'delt_s', 'delt_r');
    s += dot(J.sh, 7, BODY) + (delt ? dot(J.sh, 5.5, LIME, OP[delt]) : '');
    s += limbsArm(J.sh, J.el, J.h, J.hd, false);
    return s;
  }
  function drawFront(J, m, ex) {
    const mx = (...k) => Math.max(0, ...k.map(x => m[x] || 0)), back = !!ex.back;
    let s = '';
    const leg = (hp, kn, f, side) => seg(hp, kn, 14, BODY) + seg(kn, f, 10, BODY) + seg(f, add(f, [side * 7, 3]), 6, BODY) +
      (mx('quads', 'hams', 'adduct') ? stripe(hp, kn, 14, 0, back ? mx('hams') : mx('quads', 'adduct'), 1) : '') + (m.calves && back ? stripe(kn, f, 10, 0, m.calves, 1) : '');
    s += leg(J.hpR, J.knR, J.fR, 1) + leg(J.hpL, J.knL, J.fL, -1);
    const c = J.hip[0], y0 = J.sh[1], y1 = J.hip[1];
    s += `<path d="M${c - 19},${y0 + 1} L${c + 19},${y0 + 1} L${c + 12},${y1 + 4} L${c - 12},${y1 + 4} Z" fill="${BODY}" stroke="${BODY}" stroke-width="6" stroke-linejoin="round"/>`;
    s += seg(J.sh, J.neck, 7, BODY) + dot(J.head, 9.5, BODY);
    const area = (d, lvl) => lvl ? `<path d="${d}" fill="${LIME}" fill-opacity="${OP[lvl]}"/>` : '';
    if (!back) {
      s += area(`M${c - 15},${y0 + 4} Q${c - 2},${y0 + 2} ${c - 1},${y0 + 8} L${c - 1},${y0 + 17} Q${c - 9},${y0 + 21} ${c - 16},${y0 + 15} Z M${c + 15},${y0 + 4} Q${c + 2},${y0 + 2} ${c + 1},${y0 + 8} L${c + 1},${y0 + 17} Q${c + 9},${y0 + 21} ${c + 16},${y0 + 15} Z`, m.chest);
      s += area(`M${c - 6},${y0 + 22} L${c + 6},${y0 + 22} L${c + 5},${y1 - 2} L${c - 5},${y1 - 2} Z`, m.abs);
      s += area(`M${c - 15},${y0 + 22} L${c - 8},${y0 + 23} L${c - 7},${y1 - 3} L${c - 12},${y1 - 2} Z M${c + 15},${y0 + 22} L${c + 8},${y0 + 23} L${c + 7},${y1 - 3} L${c + 12},${y1 - 2} Z`, m.obl);
      s += area(`M${c - 19},${y0 + 8} L${c - 15},${y0 + 30} L${c - 13},${y0 + 14} Z M${c + 19},${y0 + 8} L${c + 15},${y0 + 30} L${c + 13},${y0 + 14} Z`, m.lats);
    } else {
      s += area(`M${c - 7},${y0 - 3} L${c + 7},${y0 - 3} L${c + 15},${y0 + 3} L${c},${y0 + 24} L${c - 15},${y0 + 3} Z`, m.traps);
      s += area(`M${c - 13},${y0 + 5} L${c - 2},${y0 + 10} L${c - 2},${y0 + 22} L${c - 11},${y0 + 18} Z M${c + 13},${y0 + 5} L${c + 2},${y0 + 10} L${c + 2},${y0 + 22} L${c + 11},${y0 + 18} Z`, m.upback);
      s += area(`M${c - 18},${y0 + 8} Q${c - 4},${y0 + 24} ${c - 3},${y1 - 14} L${c - 12},${y1 - 6} Z M${c + 18},${y0 + 8} Q${c + 4},${y0 + 24} ${c + 3},${y1 - 14} L${c + 12},${y1 - 6} Z`, m.lats);
      s += area(`M${c - 7},${y1 - 14} L${c + 7},${y1 - 14} L${c + 6},${y1} L${c - 6},${y1} Z`, m.lowback);
    }
    if (m.traps && !back) s += area(`M${c - 7},${y0 - 3} L${c - 15},${y0 + 2} L${c - 6},${y0 + 3} Z M${c + 7},${y0 - 3} L${c + 15},${y0 + 2} L${c + 6},${y0 + 3} Z`, m.traps);
    if (m.glutes) s += dot([c - 13, y1 + 1], 5.5, LIME, OP[m.glutes]) + dot([c + 13, y1 + 1], 5.5, LIME, OP[m.glutes]);
    const delt = back ? mx('delt_r', 'delt_s') : mx('delt_f', 'delt_s');
    const arm = (sh, el, h) => seg(sh, el, 9.5, BODY) + seg(el, h, 8, BODY) + dot(h, 4.5, BODY) +
      stripe(sh, el, 9.5, 0, back ? m.triceps : m.biceps, 1) + stripe(el, h, 8, 0, m.forearm, 1);
    s += arm(J.shR, J.elR, J.hR) + arm(J.shL, J.elL, J.hL);
    s += dot(J.shR, 7, BODY) + dot(J.shL, 7, BODY) + (delt ? dot(J.shR, 5.5, LIME, OP[delt]) + dot(J.shL, 5.5, LIME, OP[delt]) : '');
    return s;
  }
  /* ---------- felszerelés ---------- */
  function pt(J, ref) { if (Array.isArray(ref)) return ref; if (typeof ref === 'string') return J[ref]; if (ref && ref.j) return add(J[ref.j], ref.d); return [0, 0]; }
  function drawEq(items, J, layer) {
    let s = '';
    for (const it of items || []) {
      const [type, ...a] = it, front = ['bar', 'db', 'handle', 'fbar', 'pad', 'plat', 'kb'].includes(type);
      if ((layer === 'front') !== front) continue;
      if (type === 'bench') { const [x1, y, x2, h = 8] = a; s += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${h}" rx="3" fill="${EQ}"/>` + seg([x1 + 8, y + h], [x1 + 8, GROUND], 4, EQ_DARK) + seg([x2 - 8, y + h], [x2 - 8, GROUND], 4, EQ_DARK); }
      else if (type === 'slab') { const [p, q, w = 9] = a; s += seg(pt(J, p), pt(J, q), w, EQ); }
      else if (type === 'post') { const [x, y1, y2 = GROUND, w = 5] = a; s += seg([x, y1], [x, y2], w, EQ_DARK); }
      else if (type === 'rod') { const [p, q, w = 3] = a; s += seg(pt(J, p), pt(J, q), w, EQ_DARK); }
      else if (type === 'pulley') { const [p] = a; s += dot(pt(J, p), 5, EQ) + dot(pt(J, p), 2, EQ_DARK); }
      else if (type === 'cable') { const [p, q] = a; const P = pt(J, p), Q = pt(J, q); s += `<line x1="${f1(P[0])}" y1="${f1(P[1])}" x2="${f1(Q[0])}" y2="${f1(Q[1])}" stroke="#aab4be" stroke-width="1.3"/>` + dot(P, 5, EQ) + dot(P, 2, EQ_DARK); }
      else if (type === 'lever') { const [p, q, ext = 10] = a; const P = pt(J, p), Q = pt(J, q), v = sub(Q, P), d = len(v) || 1, E = add(Q, v, ext / d); s += seg(P, E, 6, EQ) + dot(P, 4.5, EQ_DARK) + dot(lerpP(P, Q, 0.45), 10, EQ_DARK) + dot(lerpP(P, Q, 0.45), 3, EQ); }
      else if (type === 'stack') { const [x, y, w = 22, h = 40] = a; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${EQ_DARK}"/>` + [1, 2, 3, 4, 5].map(i => `<line x1="${x + 2}" x2="${x + w - 2}" y1="${y + i * h / 6}" y2="${y + i * h / 6}" stroke="${EQ}" stroke-width="1"/>`).join(''); }
      else if (type === 'bar') { const [p, r = 16] = a; const P = pt(J, p); s += dot(P, r, EQ_DARK) + `<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${r - 3}" fill="none" stroke="${EQ}" stroke-width="1.5"/>` + dot(P, 3, '#c9d1d9'); }
      else if (type === 'db') { const [p, r = 6.5] = a; const P = pt(J, p); s += dot(P, r, EQ_DARK) + `<circle cx="${f1(P[0])}" cy="${f1(P[1])}" r="${r - 1.5}" fill="none" stroke="${EQ}" stroke-width="1.3"/>`; }
      else if (type === 'kb') { const [p] = a; const P = pt(J, p); s += dot(add(P, [0, 6]), 8, EQ_DARK) + `<path d="M${f1(P[0] - 5)},${f1(P[1] + 2)} Q${f1(P[0])},${f1(P[1] - 6)} ${f1(P[0] + 5)},${f1(P[1] + 2)}" stroke="${EQ}" stroke-width="2.4" fill="none"/>`; }
      else if (type === 'handle') { const [p] = a; s += dot(pt(J, p), 3.5, '#c9d1d9'); }
      else if (type === 'fbar') { const [p, q] = a; const P = pt(J, p), Q = pt(J, q); s += seg(add(P, [10 * Math.sign(P[0] - Q[0]), 0]), add(Q, [10 * Math.sign(Q[0] - P[0]), 0]), 3.5, '#c9d1d9'); }
      else if (type === 'pad') { const [p, dx = 0, dy = 0, r = 6] = a; s += dot(add(pt(J, p), [dx, dy]), r, EQ); }
      else if (type === 'plat') { const [p, ang, w = 30] = a; const P = pt(J, p), u = dirv(ang); s += seg(add(P, u, -w / 2), add(P, u, w / 2), 6, EQ); }
      else if (type === 'tpad') { const [off = 13, w = 9] = a; const v = sub(J.sh, J.hip), d = len(v), n = [-v[1] / d, v[0] / d]; s += seg(add(add(J.hip, n, off), v, 0.05), add(add(J.hip, n, off), v, 1.0), w, EQ); }
    }
    return s;
  }
  /* ---------- gyakorlatok ---------- */
  const STAND = { hip: [118, 106], t: 0, f: [121, 181] };
  const R = (dx, dy, j = 'sh') => ({ j, d: [dx, dy] });
  const S = (o) => Object.assign({}, STAND, o);
  const BENCH = ['bench', 28, 150, 152];
  const benchLie = (o) => Object.assign({ hip: [112, 141], t: -90, f: [150, 181] }, o);
  const incl = (o) => Object.assign({ hip: [104, 142], t: -55, f: [148, 181] }, o);
  const INCL = [['bench', 92, 150, 132], ['slab', [96, 148], [52, 97], 9]];
  const seated = (o) => Object.assign({ hip: [108, 128], t: -4, f: [150, 181] }, o);
  const SEAT = [['bench', 86, 136, 132], ['slab', [92, 134], [92, 62], 9]];
  const STOOL = [['bench', 88, 136, 128]];
  const DB = [['db', 'h'], ['db', 'h2']];
  const SIDE_STACK = [['stack', 196, 120, 24, 60], ['post', 214, -10]];
  const E = {
    conventional_deadlift: { A: { hip: [96, 134], t: 64, h: [128, 169], f: [122, 181] }, B: { hip: [116, 106], t: -2, h: [119, 109], f: [122, 181] }, eq: [['bar', 'h']] },
    romanian_deadlift: { A: { hip: [116, 106], t: -2, h: [120, 109], f: [122, 181] }, B: { hip: [98, 112], t: 72, h: [132, 152], f: [122, 181] }, eq: [['bar', 'h']] },
    back_squat: { eb: -1, A: S({ t: 5, h: R(-8, 1) }), B: S({ hip: [92, 150], t: 38, h: R(-8, 1) }), eq: [['bar', R(-8, 4), 14]] },
    front_squat: { A: S({ t: 2, h: R(13, 3), eb: -1 }), B: S({ hip: [96, 150], t: 20, h: R(13, 3), eb: -1 }), eq: [['bar', R(11, 2), 13]] },
    bench_press: { A: benchLie({ h: [66, 124] }), B: benchLie({ h: [62, 90] }), eq: [BENCH, ['post', 56, 70, 150, 4], ['bar', 'h']] },
    incline_bench_press: { A: incl({ h: [74, 100] }), B: incl({ h: [62, 62] }), eq: [...INCL, ['bar', 'h']] },
    overhead_press: { A: S({ t: -3, h: R(12, 4) }), B: S({ t: 0, h: R(2, -50) }), eq: [['bar', 'h', 13]] },
    barbell_row: { A: { hip: [96, 118], t: 70, h: [140, 152], f: [122, 181] }, B: { hip: [96, 118], t: 70, h: [118, 124], f: [122, 181] }, eq: [['bar', 'h']] },
    hip_thrust: { A: { hip: [112, 168], sh: [64, 138], h: R(4, -12, 'hip'), f: [152, 181] }, B: { hip: [112, 136], sh: [64, 134], h: R(4, -12, 'hip'), f: [152, 181] }, eq: [['bench', 30, 140, 70], ['bar', R(2, -14, 'hip')]] },
    barbell_curl: { A: S({ h: R(4, 51) }), B: S({ h: R(13, 6) }), eq: [['bar', 'h', 11]] },
    scott_bench_preacher_curl: { A: { hip: [104, 126], t: 18, h: [164, 116], f: [146, 181] }, B: { hip: [104, 126], t: 18, h: [146, 74], f: [146, 181] }, eq: [['bench', 82, 134, 124], ['slab', [121, 93], [143, 115], 8], ['post', 140, 118], ['bar', 'h', 11]] },
    dumbbell_bench_press: { A: benchLie({ h: [70, 128] }), B: benchLie({ h: [62, 90] }), eq: [BENCH, ...DB] },
    incline_dumbbell_press: { A: incl({ h: [78, 104] }), B: incl({ h: [62, 62] }), eq: [...INCL, ...DB] },
    dumbbell_shoulder_press: { A: seated({ h: R(14, -6) }), B: seated({ h: R(4, -50) }), eq: [...SEAT, ...DB] },
    alternating_dumbbell_biceps_curl: { alt: true, A: S({ h: R(4, 51), h2: R(1, 51) }), B: S({ h: R(13, 6), h2: R(10, 6) }), eq: DB },
    hammer_curl: { A: S({ h: R(4, 51) }), B: S({ h: R(13, 6) }), eq: DB },
    lateral_raise: { view: 'front', A: { hip: [120, 104], h: [142, 106] }, B: { hip: [120, 104], h: [186, 60] }, eq: [['db', 'hR'], ['db', 'hL']] },
    rear_delt_fly: { view: 'front', back: true, A: { hip: [120, 104], h: [130, 104] }, B: { hip: [120, 104], h: [188, 62] }, eq: [['db', 'hR'], ['db', 'hL']] },
    dumbbell_row: { A: { hip: [80, 112], t: 82, h: [131, 156], h2: [137, 130], f: [88, 181], f2: [58, 126], toe2: [48, 128], kb2: -1 }, B: { hip: [80, 112], t: 82, h: [106, 114], h2: [137, 130], f: [88, 181], f2: [58, 126], toe2: [48, 128] }, eq: [['bench', 50, 132, 160], ['db', 'h']] },
    dumbbell_fly: { A: benchLie({ h: [74, 134] }), B: benchLie({ h: [62, 88] }), eq: [BENCH, ...DB] },
    dumbbell_wrist_curl: { A: { hip: [100, 128], t: 24, h: [150, 122], wr: 70, f: [146, 181] }, B: { hip: [100, 128], t: 24, h: [150, 122], wr: -60, f: [146, 181] }, eq: [['bench', 78, 136, 120], ['db', 'hd']] },
    dumbbell_reverse_wrist_curl: { A: { hip: [100, 128], t: 24, h: [150, 122], wr: 50, f: [146, 181] }, B: { hip: [100, 128], t: 24, h: [150, 122], wr: -30, f: [146, 181] }, eq: [['bench', 78, 136, 120], ['db', 'hd']] },
    dumbbell_deadlift: { A: { hip: [96, 138], t: 58, h: [128, 160], f: [122, 181] }, B: { hip: [116, 106], t: -2, h: [119, 109], f: [122, 181] }, eq: DB },
    goblet_squat: { A: S({ t: 4, h: R(12, 14) }), B: S({ hip: [94, 150], t: 25, h: R(12, 14) }), eq: [['kb', 'h']] },
    dumbbell_bulgarian_split_squat: { A: { hip: [106, 108], t: 4, h: R(3, 50), f: [140, 181], f2: [64, 140], toe2: [54, 142] }, B: { hip: [104, 140], t: 12, h: R(3, 50), f: [140, 181], f2: [64, 140], toe2: [54, 142] }, eq: [['bench', 44, 144, 80], ...DB] },
    hack_squat: { A: { hip: [98, 110], t: -40, h: R(8, 6), f: [150, 166], toe: R(8.5, -7, 'f') }, B: { hip: [114, 130], t: -40, h: R(8, 6), f: [150, 166], toe: R(8.5, -7, 'f') }, eq: [['rod', [28, 50], [141, 186], 4], ['tpad', -13], ['plat', [157, 172], 50, 38]] },
    leg_press: { A: { hip: [92, 150], t: -70, h: R(6, 6, 'hip'), f: [118, 122], toe: R(6, -10, 'f') }, B: { hip: [92, 150], t: -70, h: R(6, 6, 'hip'), f: [146, 100], toe: R(6, -10, 'f') }, eq: [['rod', [100, 186], [214, 70], 4], ['slab', [104, 162], [44, 134], 10], ['plat', R(6, -6, 'f'), 45, 40]] },
    smith_machine_squat: { eb: -1, A: S({ t: 4, h: R(-8, 1) }), B: S({ hip: [94, 150], t: 30, h: R(-8, 1) }), eq: [['rod', [112, -20], [112, 186]], ['bar', R(-8, 4), 14]] },
    smith_machine_bulgarian_split_squat: { eb: -1, A: { hip: [106, 108], t: 4, h: R(-8, 1), f: [140, 181], f2: [64, 140], toe2: [54, 142] }, B: { hip: [104, 140], t: 10, h: R(-8, 1), f: [140, 181], f2: [64, 140], toe2: [54, 142] }, eq: [['bench', 44, 144, 80], ['rod', [100, -20], [100, 186]], ['bar', R(-8, 4), 14]] },
    smith_machine_bench_press: { A: benchLie({ h: [66, 124] }), B: benchLie({ h: [64, 90] }), eq: [BENCH, ['rod', [65, -20], [65, 186]], ['bar', 'h']] },
    smith_machine_overhead_shoulder_press: { A: seated({ h: R(14, -2) }), B: seated({ h: R(6, -50) }), eq: [...SEAT, ['rod', [118, -20], [118, 186]], ['bar', 'h', 13]] },
    leg_extension: { A: { hip: [100, 122], t: -8, h: [104, 140], f: [136, 160] }, B: { hip: [100, 122], t: -8, h: [104, 140], f: [176, 118] }, eq: [['bench', 80, 130, 140], ['slab', [86, 128], [80, 66], 9], ['lever', 'kn', 'f', 4], ['pad', 'f', 4, -2, 6], ['stack', 40, 120, 22, 60]] },
    seated_hamstring_curl: { A: { hip: [100, 122], t: -8, h: [104, 140], f: [176, 118] }, B: { hip: [100, 122], t: -8, h: [104, 140], f: [134, 162] }, eq: [['bench', 80, 130, 140], ['slab', [86, 128], [80, 66], 9], ['pad', 'kn', 0, -9, 6], ['lever', 'kn', 'f', 4], ['pad', 'f', -2, 6, 6], ['stack', 40, 120, 22, 60]] },
    lying_hamstring_curl: { prone: true, A: { hip: [110, 141], t: -90, h: [40, 160], f: [188, 141], toe: [196, 148], kb: 1 }, B: { hip: [110, 141], t: -90, h: [40, 160], f: [154, 104], toe: [164, 100], kb: 1 }, eq: [['bench', 30, 150, 175], ['pad', 'f', 2, -8, 6]] },
    machine_hip_adduction: { view: 'front', A: { hip: [120, 128], h: [150, 132], k: [160, 140], f: [166, 178] }, B: { hip: [120, 128], h: [150, 132], k: [130, 140], f: [130, 178] }, eq: [['bench', 82, 134, 158, 8], ['pad', 'knR', 6, 0, 5], ['pad', 'knL', -6, 0, 5]] },
    machine_hip_abduction: { view: 'front', back: false, A: { hip: [120, 128], h: [150, 132], k: [130, 140], f: [130, 178] }, B: { hip: [120, 128], h: [150, 132], k: [160, 140], f: [166, 178] }, eq: [['bench', 82, 134, 158, 8], ['pad', 'knR', 7, 0, 5], ['pad', 'knL', -7, 0, 5]] },
    standing_calf_raise: { eb: -1, A: { hip: [117, 102], t: 0, h: R(3, -6), f: [124, 178], toe: [136, 176] }, B: { hip: [118, 86], t: 0, h: R(3, -6), f: [127, 162], toe: [136, 176] }, eq: [['bench', 112, 177, 150, 9], ['pad', 'sh', -2, -6, 6], ['post', 70, -10]] },
    seated_calf_raise: { A: { hip: [96, 128], t: 0, h: R(14, 0, 'hip'), f: [150, 173], toe: [160, 172] }, B: { hip: [96, 128], t: 0, h: R(14, 0, 'hip'), f: [152, 160], toe: [161, 172] }, eq: [['bench', 74, 136, 116], ['bench', 150, 173, 178, 8], ['pad', 'kn', 0, -10, 7]] },
    machine_ab_crunch: { A: { hip: [108, 128], t: -6, h: R(8, -2), f: [150, 181] }, B: { hip: [108, 128], t: 34, h: R(8, -2), f: [150, 181] }, eq: [['bench', 84, 136, 130], ['slab', [90, 134], [86, 70], 9], ['handle', 'h']] },
    chest_supported_row: { A: { hip: [100, 130], t: 20, h: [162, 104], h2: [158, 104], f: [138, 181] }, B: { hip: [100, 130], t: 20, h: [114, 108], h2: [110, 108], f: [138, 181] }, eq: [['bench', 78, 138, 120], ['slab', [133, 76], [128, 124], 9], ['lever', [184, 30], 'h', 6], ['handle', 'h']] },
    wide_grip_lat_pulldown: { view: 'front', A: { hip: [120, 132], h: [166, 2], k: [136, 140], f: [138, 180] }, B: { hip: [120, 132], h: [150, 80], k: [136, 140], f: [138, 180] }, eq: [['bench', 92, 138, 148, 8], ['pad', 'knR', 0, -8, 5], ['pad', 'knL', 0, -8, 5], ['cable', [120, -24], 'barC'], ['fbar', 'hR', 'hL']] },
    single_arm_sagittal_pulldown: { A: { hip: [104, 132], t: 4, h: [130, 14], h2: [138, 132], f: [146, 181] }, B: { hip: [104, 132], t: 4, h: [112, 120], h2: [138, 132], f: [146, 181] }, eq: [['bench', 82, 140, 126], ['cable', [134, -22], 'h'], ['handle', 'h']] },
    straight_arm_lat_pulldown: { A: { hip: [108, 108], t: 22, h: [166, 38], f: [120, 181] }, B: { hip: [108, 108], t: 22, h: [122, 120], f: [120, 181] }, eq: [['post', 214, -20], ['cable', [210, -2], 'h'], ['handle', 'h'], ['stack', 196, 120, 18, 60]] },
    cable_high_row: { A: { hip: [100, 134], t: -4, h: [162, 40], f: [150, 181] }, B: { hip: [100, 134], t: -4, h: [124, 64], f: [150, 181] }, eq: [['bench', 80, 142, 124], ['post', 214, -20], ['cable', [210, 10], 'h'], ['handle', 'h'], ['stack', 196, 120, 18, 60]] },
    seated_cable_row: { A: { hip: [92, 150], t: 6, h: [150, 108], f: [166, 168], toe: [172, 160] }, B: { hip: [92, 150], t: -4, h: [114, 124], f: [166, 168], toe: [172, 160] }, eq: [['bench', 60, 158, 150, 7], ['plat', [176, 166], 5, 30], ['cable', [214, 150], 'h'], ['handle', 'h']] },
    high_row_machine: { A: { hip: [100, 130], t: 12, h: [156, 34], h2: [152, 34], f: [140, 181] }, B: { hip: [100, 130], t: 12, h: [118, 90], h2: [114, 90], f: [140, 181] }, eq: [['bench', 78, 138, 120], ['slab', [128, 80], [126, 120], 9], ['lever', [60, 20], 'h', 8], ['handle', 'h']] },
    chest_fly: { view: 'front', A: { hip: [120, 132], h: [166, 56], k: [134, 140], f: [136, 180] }, B: { hip: [120, 132], h: [140, 58], k: [134, 140], f: [136, 180] }, eq: [['bench', 92, 138, 148, 8], ['rod', R(0, -12, 'hR'), R(0, 10, 'hR')], ['rod', R(0, -12, 'hL'), R(0, 10, 'hL')]] },
    machine_chest_press: { A: { hip: [112, 130], t: -8, h: [128, 82], h2: [124, 82], f: [152, 181] }, B: { hip: [112, 130], t: -8, h: [160, 80], h2: [156, 80], f: [152, 181] }, eq: [['bench', 88, 138, 134], ['slab', [96, 136], [90, 62], 9], ['lever', [96, 18], 'h', 6], ['handle', 'h']] },
    machine_shoulder_press: { A: seated({ h: R(12, -8) }), B: seated({ h: R(4, -50) }), eq: [...SEAT, ['lever', [60, 160], 'h', 8], ['handle', 'h']] },
    machine_lateral_raise: { view: 'front', A: { hip: [120, 104], h: [142, 106] }, B: { hip: [120, 104], h: [186, 60] }, eq: [['post', 120, 60, 186, 6], ['pad', 'elR', 6, 0, 5], ['pad', 'elL', -6, 0, 5]] },
    reverse_pec_deck: { view: 'front', back: true, A: { hip: [120, 132], h: [142, 96], k: [134, 140], f: [136, 180] }, B: { hip: [120, 132], h: [186, 86], k: [134, 140], f: [136, 180] }, eq: [['bench', 92, 138, 148, 8], ['rod', R(0, -12, 'hR'), R(0, 10, 'hR')], ['rod', R(0, -12, 'hL'), R(0, 10, 'hL')]] },
    cable_face_pull: { A: S({ t: -6, h: [172, 50] }), B: S({ t: -6, h: [128, 38] }), eq: [['post', 216, -20], ['cable', [212, 46], 'h'], ['handle', 'h'], ['stack', 198, 120, 18, 60]] },
    cable_rope_triceps_pushdown: { A: S({ t: 10, h: R(22, 22) }), B: S({ t: 10, h: R(8, 52) }), eq: [['post', 190, -20], ['cable', [186, -16], 'h'], ['handle', 'h'], ['stack', 176, 120, 18, 60]] },
    single_arm_overhead_cable_triceps_extension: { A: { hip: [116, 106], t: 18, h: R(-4, -18), eb: -1, f: [150, 181], f2: [96, 181] }, B: { hip: [116, 106], t: 18, h: R(34, -38), eb: -1, f: [150, 181], f2: [96, 181] }, eq: [['post', 30, -20], ['cable', [36, 60], 'h'], ['handle', 'h'], ['stack', 22, 120, 18, 60]] },
    overhead_cable_triceps_extension: { A: { hip: [116, 106], t: 18, h: R(-4, -18), h2: R(-6, -18), eb: -1, f: [150, 181], f2: [96, 181] }, B: { hip: [116, 106], t: 18, h: R(34, -38), h2: R(32, -38), eb: -1, f: [150, 181], f2: [96, 181] }, eq: [['post', 30, -20], ['cable', [36, 60], 'h'], ['handle', 'h'], ['stack', 22, 120, 18, 60]] },
    machine_preacher_curl: { A: { hip: [104, 126], t: 18, h: [164, 116], h2: [160, 116], f: [146, 181] }, B: { hip: [104, 126], t: 18, h: [146, 74], h2: [142, 74], f: [146, 181] }, eq: [['bench', 82, 134, 124], ['slab', [121, 93], [143, 115], 8], ['post', 140, 118], ['lever', [142, 102], 'h', 6], ['handle', 'h']] },
    cable_curl: { A: S({ h: R(6, 51) }), B: S({ h: R(13, 6) }), eq: [['cable', [180, 182], 'h'], ['handle', 'h']] },
    pull_up: { view: 'front', A: { hip: [120, 98], h: [150, -4], f: R(8, 74, 'hip') }, B: { hip: [120, 54], h: [150, -4], f: R(8, 74, 'hip') }, eq: [['rod', [70, -6], [170, -6], 4]] },
    dips: { A: { hip: [116, 98], t: -4, h: [124, 100], f: R(-10, 66, 'hip'), kb: 1 }, B: { hip: [114, 126], t: 16, h: [124, 100], f: R(-10, 66, 'hip'), kb: 1 }, eq: [['rod', [100, 102], [160, 102], 4], ['post', 156, 102]] },
    push_up: { A: { hip: [98, 146], t: 72, h: [150, 180], f: [30, 180], toe: [24, 187] }, B: { hip: [100, 164], t: 82, h: [150, 180], f: [30, 180], toe: [24, 187] } },
    hanging_leg_raise: { A: { hip: [120, 100], t: 0, h: [124, -4], f: R(2, 76, 'hip') }, B: { hip: [122, 100], t: -8, h: [124, -4], f: R(40, 36, 'hip') }, eq: [['rod', [80, -6], [170, -6], 4]] },
    hanging_oblique_leg_raise: { view: 'front', A: { hip: [120, 98], h: [146, -4], f: R(8, 74, 'hip') }, B: { hip: [120, 98], h: [146, -4], f: R(46, 22, 'hip'), fL: R(30, 34, 'hip') }, eq: [['rod', [70, -6], [170, -6], 4]] }
  };
  // a jobb/bal kéz kezelése szemből nézetnél a felszerelésben
  function joints(ex, t) {
    const P = mixPose(ex.A, ex.B, t);
    if (ex.view === 'front') return solveFront(P, ex);
    if (ex.alt) { const Q = mixPose(ex.A, ex.B, 1 - t); P.h2 = Q.h2; }
    return solveSide(P, ex);
  }
  function frame(key, t, ex = E[key]) {
    const J = joints(ex, t), m = musclesOf(key);
    if (ex.view === 'front') { J.h = J.hR; J.h2 = J.hL; J.barC = lerpP(J.hR, J.hL, 0.5); }
    return `<line x1="-40" x2="300" y1="${GROUND}" y2="${GROUND}" stroke="#2a3138" stroke-width="2"/>` + drawEq(ex.eq, J, 'back') + (ex.view === 'front' ? drawFront(J, m, ex) : drawSide(J, m, ex)) + drawEq(ex.eq, J, 'front');
  }
  /* a figura befoglaló doboza (a kivágáshoz) */
  function bbox(ex, ts = [0, 0.5, 1]) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const t of ts) { const J = joints(ex, t); for (const [k, p] of Object.entries(J)) if (Array.isArray(p)) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } }
    return [x0, y0, x1, y1];
  }
  function viewBox(ex, pad, square) {
    let [x0, y0, x1, y1] = bbox(ex); x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    if (square) { const w = x1 - x0, h = y1 - y0, s = Math.max(w, h); x0 -= (s - w) / 2; y0 -= (s - h) / 2; return [x0, y0, s, s].map(f1).join(' '); }
    y1 = Math.max(y1, GROUND + 6); const w = x1 - x0, h = y1 - y0, W = Math.max(w, h * 1.25), H = Math.max(h, W / 1.25);
    return [x0 - (W - w) / 2, y0 - (H - h), W, H].map(f1).join(' ');
  }
  const keyOf = id => (typeof rankKeyFor === 'function' && rankKeyFor(id)) || (typeof RANK_ALIAS !== 'undefined' && RANK_ALIAS[id]) || id;
  const has = id => !!E[keyOf(id)];
  const THUMBS = new Map();
  function thumb(id) {
    const key = keyOf(id), ex = E[key];
    if (THUMBS.has(key)) return THUMBS.get(key);
    if (!ex) return `<svg viewBox="0 0 40 40" class="ex-thumb-svg"><rect x="8" y="17" width="24" height="6" rx="2" fill="${EQ}"/><rect x="5" y="11" width="6" height="18" rx="2" fill="${BODY}"/><rect x="29" y="11" width="6" height="18" rx="2" fill="${BODY}"/></svg>`;
    const out = `<svg viewBox="${viewBox(ex, 16, true)}" class="ex-thumb-svg" aria-hidden="true">${frame(key, 0.7)}</svg>`;
    THUMBS.set(key, out); return out;
  }
  /* nagy, mozgó animáció egy elembe; visszaad egy leállító függvényt */
  function play(el, id) {
    const key = keyOf(id), ex = E[key]; if (!ex) return () => {};
    el.innerHTML = `<svg viewBox="${viewBox(ex, 26, false)}" class="ex-anim-svg"><g></g></svg>`;
    const g = el.querySelector('g'), T = ex.dur || 3200;
    let raf = 0, last = 0, paused = false, t0 = performance.now(), tp = 0;
    const phase = ms => { const u = (ms % T) / T; return u < 0.38 ? ease(u / 0.38) : u < 0.48 ? 1 : u < 0.9 ? 1 - ease((u - 0.48) / 0.42) : 0; };
    const draw = now => { raf = requestAnimationFrame(draw); if (paused || now - last < 33) return; last = now; g.innerHTML = frame(key, phase(now - t0)); };
    g.innerHTML = frame(key, 0);
    raf = requestAnimationFrame(draw);
    el.onclick = () => { paused = !paused; el.classList.toggle('paused', paused); if (paused) tp = performance.now(); else t0 += performance.now() - tp; };
    return () => cancelAnimationFrame(raf);
  }
  return { E, has, thumb, play, frame, keyOf, viewBox };
})();
