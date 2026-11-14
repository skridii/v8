'use strict';
/* IRONLOG – 3D-s gyakorlat-animációk (v34)
   Saját, függőség nélküli WebGL2 megjelenítő. Nincs külső könyvtár, letöltött modell vagy kép:
   a figura és a gépek kódból, két alapformából épülnek fel (lekerekített doboz/ellipszoid és henger).
   Koordináták: méter; y felfelé, a figura +z felé néz, +x a figura BAL oldala.
   Egy gyakorlat = build(t) függvény: t = 0 (kiinduló helyzet) … 1 (a mozdulat vége). Kirajzolja a gépet,
   és visszaadja a testhelyzetet (medence, törzsdőlés, kéz- és lábcélpontok – a könyök és a térd IK-val adódik).
   Ha a WebGL2 nem érhető el vagy hiba történik, az app a régi 2D-s animációra (anim.js) vált vissza. */
const ANIM3D = (() => {
  /* ===== vektorok, keretek, mátrixok ===== */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const mad = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = d => d * Math.PI / 180;
  const anyPerp = a => norm(cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const perpTo = (v, axis) => { const p = mad(v, axis, -dot(v, axis)); return len(p) > 1e-5 ? norm(p) : null; };
  const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), d = dot(k, v) * (1 - c), x = cross(k, v); return [v[0] * c + x[0] * s + k[0] * d, v[1] * c + x[1] * s + k[1] * d, v[2] * c + x[2] * s + k[2] * d]; };
  // keret: origó + három egységvektor (x = bal, y = fel, z = előre a testrész saját rendszerében)
  const frame = (o, x, y, z) => ({ o, x, y, z });
  const fpt = (f, a, b, c) => [f.o[0] + f.x[0] * a + f.y[0] * b + f.z[0] * c, f.o[1] + f.x[1] * a + f.y[1] * b + f.z[1] * c, f.o[2] + f.x[2] * a + f.y[2] * b + f.z[2] * c];
  const fdir = (f, a, b, c) => [f.x[0] * a + f.y[0] * b + f.z[0] * c, f.x[1] * a + f.y[1] * b + f.z[1] * c, f.x[2] * a + f.y[2] * b + f.z[2] * c];
  const frot = (f, ax, a, o = f.o) => { const k = typeof ax === 'string' ? f[ax] : ax; return frame(o, rot(f.x, k, a), rot(f.y, k, a), rot(f.z, k, a)); };
  const fypr = (o, yaw, pitch, roll) => frot(frot(frot(frame(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]), 'y', yaw), 'x', pitch), 'z', roll);
  function persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; }
  function ortho(r, t, n, f) { const m = new Float32Array(16); m[0] = 1 / r; m[5] = 1 / t; m[10] = -2 / (f - n); m[14] = -(f + n) / (f - n); m[15] = 1; return m; }
  function lookAt(e, c, up) { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
  function mmul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }

  /* ===== hálók =====
     Mindkét háló csúcsa: a_n (egységgömb-normális) és a_k (eltolási irány). A csúcs helye: a_n * R + a_k * H,
     ahol R és H a forma alsó (a_k.y < 0) és felső felére külön adható meg. Így ugyanabból a hálóból lesz
     gömb, ellipszoid, (kúpos) kapszula és lekerekített doboz, a másikból lekerekített élű henger/kúp. */
  function meshRB(N) {
    const v = [], idx = [], base = {}, S = [1, -1];
    const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
    for (const sx of S) for (const sy of S) for (const sz of S) {
      const b0 = base[[sx, sy, sz]] = v.length / 6;
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const th = i / N * Math.PI / 2, ph = j / N * Math.PI / 2;
        v.push(sx * Math.sin(th) * Math.cos(ph), sy * Math.cos(th), sz * Math.sin(th) * Math.sin(ph), sx, sy, sz);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) quad(b0 + i * (N + 1) + j, b0 + (i + 1) * (N + 1) + j, b0 + (i + 1) * (N + 1) + j + 1, b0 + i * (N + 1) + j + 1);
    }
    const V = (sx, sy, sz, i, j) => base[[sx, sy, sz]] + i * (N + 1) + j;
    for (const a of S) for (const b of S) for (let i = 0; i < N; i++) {
      quad(V(a, b, 1, i, 0), V(a, b, 1, i + 1, 0), V(a, b, -1, i + 1, 0), V(a, b, -1, i, 0));
      quad(V(1, a, b, i, N), V(1, a, b, i + 1, N), V(-1, a, b, i + 1, N), V(-1, a, b, i, N));
      quad(V(a, 1, b, N, i), V(a, 1, b, N, i + 1), V(a, -1, b, N, i + 1), V(a, -1, b, N, i));
    }
    for (const s of S) {
      quad(V(1, s, 1, 0, 0), V(1, s, -1, 0, 0), V(-1, s, -1, 0, 0), V(-1, s, 1, 0, 0));
      quad(V(s, 1, 1, N, 0), V(s, 1, -1, N, 0), V(s, -1, -1, N, 0), V(s, -1, 1, N, 0));
      quad(V(1, 1, s, N, N), V(1, -1, s, N, N), V(-1, -1, s, N, N), V(-1, 1, s, N, N));
    }
    return { v: new Float32Array(v), idx: new Uint16Array(idx) };
  }
  function meshCY(M, K) {
    const v = [], idx = [], ring = (s, k) => (s > 0 ? (K + 1) * M : 0) + k * M;
    for (const s of [-1, 1]) for (let k = 0; k <= K; k++) for (let m = 0; m < M; m++) {
      const ph = m / M * 2 * Math.PI, ps = k / K * Math.PI / 2, c = Math.cos(ph), sn = Math.sin(ph);
      v.push(c * Math.cos(ps), s * Math.sin(ps), sn * Math.cos(ps), c, s, sn);
    }
    const c0 = v.length / 6; v.push(0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0);
    for (let m = 0; m < M; m++) {
      const n = (m + 1) % M;
      idx.push(ring(-1, 0) + m, ring(-1, 0) + n, ring(1, 0) + n, ring(-1, 0) + m, ring(1, 0) + n, ring(1, 0) + m);
      for (const s of [-1, 1]) {
        for (let k = 0; k < K; k++) idx.push(ring(s, k) + m, ring(s, k) + n, ring(s, k + 1) + n, ring(s, k) + m, ring(s, k + 1) + n, ring(s, k + 1) + m);
        idx.push(s < 0 ? c0 : c0 + 1, ring(s, K) + m, ring(s, K) + n);
      }
    }
    return { v: new Float32Array(v), idx: new Uint16Array(idx) };
  }

  /* ===== WebGL ===== */
  const VS = `#version 300 es
layout(location=0) in vec3 a_n; layout(location=1) in vec3 a_k;
uniform mat4 u_vp; uniform mat4 u_model; uniform mat4 u_light;
uniform vec3 u_r0; uniform vec3 u_r1; uniform vec3 u_h0; uniform vec3 u_h1;
out vec3 v_pos; out vec3 v_nrm; out vec4 v_sh;
void main() {
  bool top = a_k.y > 0.0;
  vec3 R = top ? u_r1 : u_r0; vec3 H = top ? u_h1 : u_h0;
  vec4 wp = u_model * vec4(a_n * R + a_k * H, 1.0);
  vec3 wn = normalize(mat3(u_model) * (a_n / R));
  v_pos = wp.xyz; v_nrm = wn; v_sh = u_light * vec4(wp.xyz + wn * 0.012, 1.0);
  gl_Position = u_vp * wp;
}`;
  const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 v_pos; in vec3 v_nrm; in vec4 v_sh;
uniform vec3 u_eye; uniform vec3 u_ldir; uniform vec3 u_fdir; uniform vec3 u_color; uniform vec3 u_emis; uniform vec3 u_bg; uniform vec3 u_cen;
uniform vec4 u_mat; uniform vec2 u_sh; uniform sampler2DShadow u_shadow;
out vec4 o;
float shadowF() {
  vec3 p = v_sh.xyz / v_sh.w * 0.5 + 0.5;
  if (u_sh.x < 0.5 || p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += texture(u_shadow, vec3(p.xy + vec2(float(i), float(j)) * u_sh.y, p.z - 0.0008));
  return s / 9.0;
}
void main() {
  vec3 n = normalize(v_nrm); vec3 v = normalize(u_eye - v_pos);
  float ndl = dot(n, u_ldir); float sh = shadowF();
  float dif = clamp(ndl, 0.0, 1.0) * sh;
  vec3 amb = mix(vec3(0.085, 0.095, 0.115), vec3(0.34, 0.37, 0.42), n.y * 0.5 + 0.5);
  vec3 lit = u_color * (amb + clamp(dot(n, u_fdir), 0.0, 1.0) * vec3(0.13, 0.15, 0.19) + dif * vec3(0.98, 0.94, 0.88));
  vec3 hv = normalize(u_ldir + v);
  float sp = pow(clamp(dot(n, hv), 0.0, 1.0), u_mat.y) * u_mat.x * sh * step(0.0, ndl);
  float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0) * u_mat.z;
  vec3 col = lit + vec3(sp) + fr * vec3(0.20, 0.25, 0.32) + u_emis;
  if (u_mat.w > 0.5) { float d = length(v_pos.xz - u_cen.xz); col = mix(col, u_bg, smoothstep(u_cen.y * 0.4, u_cen.y, d)); }
  o = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.4545)), 1.0);
}`;
  const FS_DEPTH = `#version 300 es
precision mediump float;
void main() {}`;
  const SHADOW = 1024, BG = [11 / 255, 14 / 255, 18 / 255];
  const lin = c => Math.pow(c, 2.2);
  const hexLin = h => [lin(parseInt(h.slice(1, 3), 16) / 255), lin(parseInt(h.slice(3, 5), 16) / 255), lin(parseInt(h.slice(5, 7), 16) / 255)];
  const BG_LIN = BG.map(lin);
  let G = null, failed = false;
  function program(gl, vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('program: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p, u };
  }
  function mesh(gl, m) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, m.v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: m.idx.length };
  }
  function glInit() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('A WebGL2 nem érhető el');
    const g = { gl, canvas, lost: false, fbos: {} };
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); g.lost = true; });
    g.main = program(gl, VS, FS); g.depth = program(gl, VS, FS_DEPTH);
    g.meshes = [mesh(gl, meshRB(8)), mesh(gl, meshCY(36, 3))];
    // árnyéktérkép (ha a mélység-textúra nem megy, árnyék nélkül rajzolunk)
    try {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW, SHADOW);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) g.shadow = { fbo, tex };
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } catch (e) { g.shadow = null; }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    return g;
  }
  function ensureGL() { if (G && !G.lost && !G.gl.isContextLost()) return G; G = glInit(); return G; }
  function ok() { if (failed) return false; try { ensureGL(); return true; } catch (e) { failed = true; console.warn('IRONLOG 3D kikapcsolva:', e); return false; } }
  // képkocka-puffer a kis ikonokhoz és a tesztképekhez (a látható vásznat nem érinti)
  function target(g, size) {
    if (g.fbos[size]) return g.fbos[size];
    const gl = g.gl, tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, size, size);
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, size, size);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('képpuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return g.fbos[size] = { fbo };
  }
  function drawItems(g, P, items, shadowPass) {
    const gl = g.gl, u = P.u; let cur = -1;
    for (const it of items) {
      const c = it.mat; if (shadowPass && c.noShadow) continue;
      if (it.mesh !== cur) { gl.bindVertexArray(g.meshes[it.mesh].vao); cur = it.mesh; }
      gl.uniformMatrix4fv(u.u_model, false, it.M);
      gl.uniform3fv(u.u_r0, it.r0); gl.uniform3fv(u.u_r1, it.r1); gl.uniform3fv(u.u_h0, it.h0); gl.uniform3fv(u.u_h1, it.h1);
      if (!shadowPass) { gl.uniform3fv(u.u_color, c.col); gl.uniform3fv(u.u_emis, c.emis); gl.uniform4f(u.u_mat, c.spec, c.gloss, c.rim, c.ground ? 1 : 0); }
      gl.drawElements(gl.TRIANGLES, g.meshes[it.mesh].count, gl.UNSIGNED_SHORT, 0);
    }
    gl.bindVertexArray(null);
  }
  /* cam: { yaw, pitch (radián), dist, target, fov (fok), cen (a jelenet közepe), rad (a jelenet sugara) } */
  function render(g, items, cam, w, h, fbo) {
    const gl = g.gl, cp = Math.cos(cam.pitch), T = cam.target;
    const eye = [T[0] + cam.dist * Math.sin(cam.yaw) * cp, T[1] + cam.dist * Math.sin(cam.pitch), T[2] + cam.dist * Math.cos(cam.yaw) * cp];
    const vp = mmul(persp(rad(cam.fov || 26), w / h, 0.4, 40), lookAt(eye, T, [0, 1, 0]));
    // a fény a kamerához képest áll (bal-felülről), így minden nézetből jól megvilágított a figura
    const back = norm([eye[0] - T[0], 0, eye[2] - T[2]]), right = [back[2], 0, -back[0]];
    const ldir = norm(add(add(mul(right, -0.62), [0, 1.0, 0]), mul(back, 0.58))), fill = norm(add(add(mul(right, 0.85), [0, 0.15, 0]), mul(back, 0.45)));
    const cen = cam.cen || T, R = cam.rad || 1.9;
    const lvp = mmul(ortho(R, R, 1, 13), lookAt(mad(cen, ldir, 7), cen, [0, 1, 0]));
    if (g.shadow) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, g.shadow.fbo); gl.viewport(0, 0, SHADOW, SHADOW); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
      gl.useProgram(g.depth.p); gl.uniformMatrix4fv(g.depth.u.u_vp, false, lvp);
      drawItems(g, g.depth, items, true);
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo || null); gl.viewport(0, 0, w, h);
    gl.clearColor(BG[0], BG[1], BG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const P = g.main, u = P.u; gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.u_vp, false, vp); gl.uniformMatrix4fv(u.u_light, false, lvp);
    gl.uniform3fv(u.u_eye, eye); gl.uniform3fv(u.u_ldir, ldir); gl.uniform3fv(u.u_fdir, fill); gl.uniform3fv(u.u_bg, BG_LIN);
    gl.uniform3f(u.u_cen, cen[0], cam.floor || 2.6, cen[2]); gl.uniform2f(u.u_sh, g.shadow ? 1 : 0, 1.4 / SHADOW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, g.shadow ? g.shadow.tex : null); gl.uniform1i(u.u_shadow, 0);
    drawItems(g, P, items, false);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /* ===== rajzlista és alapformák ===== */
  let Q = [];
  const Z3 = [0, 0, 0];
  const R3 = r => typeof r === 'number' ? [r, r, r] : r.length === 2 ? [r[0], (r[0] + r[1]) / 2, r[1]] : r;
  const M4 = (o, x, y, z) => new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, o[0], o[1], o[2], 1]);
  const emit = (m, o, x, y, z, r0, r1, h0, h1, mat) => Q.push({ mesh: m, M: M4(o, x, y, z), r0, r1, h0, h1, mat });
  // két végű „csepp”: p0 és p1 körül egy-egy fél ellipszoid (sugár: [oldal, tengelyirány, előre-hátra]), köztük sima átmenet
  function blob(p0, p1, r0, r1, front, mat) {
    const d = sub(p1, p0), L = len(d), y = L > 1e-6 ? mul(d, 1 / L) : [0, 1, 0];
    const z = (front && perpTo(front, y)) || anyPerp(y), x = cross(y, z), h = [0, L / 2, 0];
    emit(0, mix(p0, p1, 0.5), x, y, z, R3(r0), R3(r1), h, h, mat);
  }
  const ell = (c, r, f, mat) => { const R = R3(r); emit(0, c, f.x, f.y, f.z, R, R, Z3, Z3, mat); };
  function box(c, half, bev, f, mat) { const b = Math.min(bev, half[0], half[1], half[2]), R = [b, b, b], h = [half[0] - b, half[1] - b, half[2] - b]; emit(0, c, f.x, f.y, f.z, R, R, h, h, mat); }
  // szögletes cső p0 → p1 (w: szélesség, d: mélység; az „up” vektor felé néz a mélység)
  function beam(p0, p1, w, d, mat, up, bev = 0.012) { const y = norm(sub(p1, p0)), z = perpTo(up || [0, 0, 1], y) || anyPerp(y), x = cross(y, z); box(mix(p0, p1, 0.5), [w / 2, len(sub(p1, p0)) / 2, d / 2], bev, { x, y, z }, mat); }
  function cyl(p0, p1, R, mat, bev, R1) { const d = sub(p1, p0), L = len(d), y = norm(d), z = anyPerp(y), x = cross(y, z), Rt = R1 ?? R, b = Math.min(bev ?? R * 0.25, R, Rt, L / 2), rr = [b, b, b]; emit(1, mix(p0, p1, 0.5), x, y, z, rr, rr, [R - b, L / 2 - b, R - b], [Rt - b, L / 2 - b, Rt - b], mat); }
  const tube = (p0, p1, r, mat) => blob(p0, p1, r, r, null, mat);
  const ball = (c, r, mat) => emit(0, c, [1, 0, 0], [0, 1, 0], [0, 0, 1], [r, r, r], [r, r, r], Z3, Z3, mat);

  /* ===== anyagok ===== */
  const mat = (hex, spec, gloss, rim, extra) => Object.assign({ col: hexLin(hex), emis: Z3, spec, gloss, rim }, extra);
  const LIME = hexLin('#9cff57'), LIME_A = mul(LIME, 0.76);
  const SKIN = mat('#bcc4cc', 0.20, 20, 0.5), MUS0 = mat('#a2abb5', 0.20, 20, 0.5), SHOE = mat('#39414a', 0.22, 18, 0.45);
  const STEEL = mat('#46505b', 0.55, 46, 0.55), CHROME = mat('#cdd4da', 1.0, 90, 0.6), PAD = mat('#1c2127', 0.38, 26, 0.6);
  const PLATE = mat('#23282e', 0.32, 30, 0.6), GRIP = mat('#14171b', 0.18, 14, 0.4), FLOOR = mat('#262c33', 0, 1, 0, { ground: 1, noShadow: 1 });
  // izom-anyagok terhelés szerint (0 = nem dolgozik … 3 = fő célizom); a „glow” a mozdulat nehéz szakaszában erősebb
  function muscleMats(glow) {
    const out = [MUS0];
    for (const [w, e] of [[0.32, 0.02], [0.62, 0.06], [1, 0.13]]) out.push({ col: mix(MUS0.col, LIME_A, w), emis: mul(LIME, e * (0.15 + 0.85 * glow)), spec: 0.2, gloss: 20, rim: 0.5 });
    return out;
  }

  /* ===== figura ===== */
  const D = { hipW: 0.095, hipDrop: 0.03, abd: 0.05, lum: 0.19, shY: 0.24, shW: 0.185, neck: 0.3, thigh: 0.44, shin: 0.43, uarm: 0.30, farm: 0.26, hand: 0.075, ankle: 0.08 };
  function ik(S, T, a, b, pole) {
    const d = sub(T, S); let L = len(d);
    const dir = L > 1e-6 ? mul(d, 1 / L) : [0, -1, 0];
    L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-4);
    const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(a * a - x * x, 0)), p = perpTo(pole, dir) || anyPerp(dir);
    return { mid: mad(mad(S, dir, x), p, h), end: mad(S, dir, L), perp: p };
  }
  /* Póz: { root: medence közepe, pitch/yaw/roll: medence dőlése fokban (pitch + = előre), spine/chest: gerinc hajlása,
     head, L / R: { hand, pole (könyök iránya), grip (a fogantyú tengelye), foot (boka), kpole (térd iránya), toe, footUp } } */
  function solve(P) {
    const Fp = fypr(P.root, rad(P.yaw || 0), rad(P.pitch || 0), rad(P.roll || 0));
    const Fa = frot(Fp, 'x', rad(P.spine || 0), fpt(Fp, 0, D.abd, 0));
    let Fc = frot(Fa, 'x', rad(P.chest || 0), fpt(Fa, 0, D.lum, 0));
    if (P.twist) Fc = frot(Fc, 'y', rad(P.twist));
    if (P.bend) Fc = frot(Fc, 'z', rad(P.bend));
    let Fh = frot(Fc, 'x', rad(P.head || 0), fpt(Fc, 0, D.neck, -0.012));
    if (P.headYaw) Fh = frot(Fh, 'y', rad(P.headYaw));
    const J = { Fp, Fa, Fc, Fh, arm: [], leg: [] };
    for (const s of [1, -1]) {
      const A = (s > 0 ? P.L : P.R) || {};
      let S = fpt(Fc, s * D.shW, D.shY, 0);
      const T = A.hand || fpt(Fc, s * (D.shW + 0.085), D.shY - 0.6, 0.05);
      // a vállöv a kar után mozdul: fej fölé nyúláskor emelkedik, előre nyúláskor előrébb jön
      const dT = norm(sub(T, S)), up = Math.max(0, dot(dT, Fc.y)), fw = Math.max(0, dot(dT, Fc.z));
      S = add(S, fdir(Fc, -s * 0.02 * up, 0.05 * up * up + (A.shrug || 0), 0.03 * fw * (1 - up)));
      const k = ik(S, T, D.uarm, D.farm + D.hand, A.pole || fdir(Fc, s * 0.3, -0.2, -1));
      const E = k.mid, H = k.end, W = mad(E, norm(sub(H, E)), D.farm);
      J.arm.push({ s, S, E, W, H, perp: k.perp, grip: A.grip, open: A.open });
    }
    for (const s of [1, -1]) {
      const A = (s > 0 ? P.L : P.R) || {};
      const Hp = fpt(Fp, s * D.hipW, -D.hipDrop, 0);
      const k = ik(Hp, A.foot || [Hp[0] + s * 0.012, D.ankle, Hp[2]], D.thigh, D.shin, A.kpole || fdir(Fp, s * 0.12, 0.1, 1));
      const up = A.footUp || [0, 1, 0], toe = perpTo(A.toe || [s * 0.16, 0, 1], up) || [0, 0, 1];
      J.leg.push({ s, Hp, K: k.mid, An: k.end, perp: k.perp, toe, up });
    }
    return J;
  }
  // a legrövidebb forgatás, ami az „a” irányt „b”-be viszi – ezzel visszük a mellkas keretét a felkarra (deltaizom)
  function swing(f, a, b) {
    const ax = cross(a, b), s = len(ax), c = dot(a, b);
    if (s < 1e-6) return c > 0 ? f : frot(f, 'z', Math.PI);
    return frot(f, mul(ax, 1 / s), Math.atan2(s, c));
  }
  function drawBody(J, lv, glow, only) {
    const { Fp, Fa, Fc, Fh } = J, MM = muscleMats(glow), mm = (k, sd) => MM[only && sd && sd !== only ? 0 : lv[k] || 0];   // only: egyoldalas gyakorlatnál a dolgozó oldal (+1 bal, −1 jobb)
    // medence, far
    ell(fpt(Fp, 0, -0.005, -0.004), [0.162, 0.108, 0.112], Fp, SKIN);
    for (const s of [1, -1]) ell(fpt(Fp, s * 0.082, -0.056, -0.05), [0.092, 0.102, 0.08], Fp, mm('glutes', s));
    // derék és mellkas (V alak: széles váll, keskeny derék)
    blob(fpt(Fp, 0, 0.035, 0.002), fpt(Fc, 0, 0.03, 0.002), [0.14, 0.09, 0.098], [0.152, 0.09, 0.106], Fa.z, SKIN);
    blob(fpt(Fc, 0, 0.04, 0), fpt(Fc, 0, 0.2, -0.004), [0.158, 0.09, 0.11], [0.182, 0.085, 0.118], Fc.z, SKIN);
    blob(fpt(Fc, -0.13, 0.247, -0.012), fpt(Fc, 0.13, 0.247, -0.012), [0.062, 0.07, 0.092], [0.062, 0.07, 0.092], Fc.z, SKIN);
    for (const s of [1, -1]) {
      // mell, has (kockák), ferde has
      ell(fpt(Fc, s * 0.088, 0.152, 0.084), [0.095, 0.082, 0.045], frot(Fc, 'y', s * 0.3), mm('chest', s));
      for (let r = 0; r < 4; r++) box(mix(fpt(Fp, s * 0.037, 0.04, 0.094), fpt(Fc, s * 0.041, 0.036, 0.101), r / 3), [0.034, 0.033, 0.015], 0.015, r < 2 ? Fa : Fc, mm('abs'));
      ell(mix(fpt(Fp, s * 0.118, 0.09, 0.028), fpt(Fc, s * 0.134, 0.04, 0.034), 0.5), [0.046, 0.09, 0.072], Fa, mm('obl'));
      // hát: széles hátizom (szárny a hónaljtól a derékig), lapocka környéke, gerincfeszítő, csuklya
      blob(fpt(Fp, s * 0.052, 0.07, -0.086), fpt(Fc, s * 0.16, 0.165, -0.038), [0.044, 0.03, 0.022], [0.094, 0.06, 0.05], fdir(Fc, s * 0.5, 0, -0.86), mm('lats', s));
      ell(fpt(Fc, s * 0.106, 0.178, -0.09), [0.064, 0.068, 0.034], Fc, mm('upback', s));
      blob(fpt(Fp, s * 0.032, 0.02, -0.097), fpt(Fa, s * 0.036, 0.16, -0.1), [0.032, 0.03, 0.016], [0.035, 0.03, 0.017], Fa.z, mm('lowback'));
      blob(fpt(Fc, s * 0.044, 0.318, -0.024), fpt(Fc, s * 0.152, 0.266, -0.026), [0.042, 0.04, 0.048], [0.03, 0.03, 0.04], Fc.z, mm('traps', s));
    }
    ell(fpt(Fc, 0, 0.212, -0.094), [0.066, 0.118, 0.032], Fc, mm('traps'));
    // nyak, fej (koponya + állkapocs, fül és orr – ezekből látszik, merre néz)
    blob(fpt(Fc, 0, 0.27, -0.012), fpt(Fh, 0, 0.07, -0.002), 0.06, 0.056, Fc.z, SKIN);
    ell(fpt(Fh, 0, 0.162, 0.002), [0.079, 0.1, 0.102], Fh, SKIN);
    ell(fpt(Fh, 0, 0.098, 0.03), [0.066, 0.074, 0.072], Fh, SKIN);
    ell(fpt(Fh, 0, 0.132, 0.102), [0.015, 0.028, 0.022], Fh, SKIN);
    for (const s of [1, -1]) ell(fpt(Fh, s * 0.078, 0.134, -0.008), [0.006, 0.02, 0.012], Fh, SKIN);
    // karok
    for (const a of J.arm) {
      const s = a.s, ua = norm(sub(a.E, a.S)), fa = norm(sub(a.W, a.E));
      const bf = mul(perpTo(a.perp, ua) || anyPerp(ua), -1);                 // a bicepsz oldala (amerre az alkar hajlik)
      const Fd = swing(Fc, mul(Fc.y, -1), ua), out = mul(Fd.x, s), df = { x: Fd.x, y: ua, z: Fd.z };
      ell(mad(mad(a.S, out, 0.03), ua, 0.045), [0.055, 0.09, 0.062], df, mm('delt_s', s));
      ell(mad(mad(mad(a.S, Fd.z, 0.04), ua, 0.04), out, 0.006), [0.05, 0.08, 0.045], df, mm('delt_f', s));
      ell(mad(mad(mad(a.S, Fd.z, -0.04), ua, 0.04), out, 0.006), [0.05, 0.08, 0.045], df, mm('delt_r', s));
      blob(a.S, a.E, [0.052, 0.05, 0.055], [0.043, 0.042, 0.045], bf, SKIN);
      const af = { x: cross(ua, bf), y: ua, z: bf };
      ell(mad(mix(a.S, a.E, 0.55), bf, 0.024), [0.043, 0.11, 0.042], af, mm('biceps', s));
      ell(mad(mix(a.S, a.E, 0.48), bf, -0.027), [0.046, 0.12, 0.042], af, mm('triceps', s));
      const ff = perpTo(bf, fa) || anyPerp(fa);
      blob(a.E, a.W, [0.045, 0.042, 0.042], [0.031, 0.03, 0.025], ff, SKIN);
      ell(mix(a.E, a.W, 0.3), [0.05, 0.105, 0.046], { x: cross(fa, ff), y: fa, z: ff }, mm('forearm', s));
      // kéz: ökölbe zárva a fogantyú körül (grip = a fogantyú tengelye), különben nyitva
      if (a.grip) { const gx = perpTo(a.grip, fa) || cross(fa, ff); ell(a.H, [0.047, 0.041, 0.036], { x: gx, y: fa, z: cross(gx, fa) }, SKIN); }
      else { const hf = { x: ff, y: fa, z: cross(ff, fa) }; ell(mad(a.W, fa, 0.052), [0.045, 0.062, 0.021], hf, SKIN); ell(mad(mad(a.W, fa, 0.132), ff, 0.012), [0.04, 0.052, 0.017], hf, SKIN); }
    }
    // lábak
    for (const g of J.leg) {
      const s = g.s, th = norm(sub(g.K, g.Hp)), sh = norm(sub(g.An, g.K));
      const kf = perpTo(g.perp, th) || anyPerp(th), tf = { x: cross(th, kf), y: th, z: kf }, inn = mul(tf.x, -s);
      blob(g.Hp, g.K, [0.088, 0.08, 0.094], [0.058, 0.05, 0.062], kf, SKIN);
      ell(mad(mix(g.Hp, g.K, 0.48), kf, 0.034), [0.074, 0.18, 0.06], tf, mm('quads', s));
      ell(mad(mix(g.Hp, g.K, 0.5), kf, -0.036), [0.068, 0.165, 0.054], tf, mm('hams', s));
      ell(mad(mix(g.Hp, g.K, 0.28), inn, 0.04), [0.05, 0.125, 0.066], tf, mm('adduct', s));
      ball(g.K, 0.058, SKIN);
      const sf = perpTo(g.perp, sh) || anyPerp(sh);
      blob(g.K, g.An, [0.055, 0.05, 0.057], [0.037, 0.034, 0.04], sf, SKIN);
      ell(mad(mix(g.K, g.An, 0.3), sf, -0.022), [0.061, 0.13, 0.054], { x: cross(sh, sf), y: sh, z: sf }, mm('calves', s));
      blob(mad(mad(g.An, g.up, -0.034), g.toe, -0.038), mad(mad(g.An, g.up, -0.046), g.toe, 0.16), [0.046, 0.046, 0.046], [0.054, 0.04, 0.036], g.up, SHOE);
    }
  }

  /* ===== gyakorlatok ===== */
  const EX = {};
  const X = [1, 0, 0], Y = [0, 1, 0], Zf = [0, 0, 1], W = { x: X, y: Y, z: Zf };
  const STEEL2 = mat('#2e353d', 0.5, 40, 0.55), PLATE2 = mat('#3b434c', 0.4, 36, 0.5);
  const side2 = f => { f(1); f(-1); };
  const LR = f => ({ L: f(1), R: f(-1) });
  function weightPlate(c, ax, R = 0.225, th = 0.042) {
    cyl(mad(c, ax, -th / 2), mad(c, ax, th / 2), R, PLATE, 0.014);
    cyl(mad(c, ax, -th / 2 - 0.003), mad(c, ax, th / 2 + 0.003), R * 0.42, PLATE2, 0.004);
    cyl(mad(c, ax, -th / 2 - 0.006), mad(c, ax, th / 2 + 0.006), R * 0.16, CHROME, 0.004);
  }
  EX._stand = { cam: { yaw: -25, pitch: 6, dist: 4.5, target: [0, 0.92, 0], floor: 1.5 }, build: () => Object.assign({ root: [0, 0.98, 0] }, LR(sd => ({ hand: [sd * 0.4, 0.86, 0.06], pole: [sd * 0.4, 0, -1], foot: [sd * 0.13, D.ankle, 0], toe: [sd * 0.2, 0, 1] }))) };

  /* Hack guggolás: ferde sínen futó szánkó (háttámla + vállpárnák), a lábak a döntött lapon. t = 0 fent, 1 lent. */
  EX.hack_squat = {
    neg: true, cam: { yaw: -62, pitch: 9, dist: 5.15, target: [0, 0.72, 0.03], rad: 2.1 },
    build(t) {
      const al = rad(48), u = [0, Math.sin(al), -Math.cos(al)], n = [0, Math.cos(al), Math.sin(al)], F = { x: X, y: u, z: n };   // u: a sín iránya (fel-hátra), n: a támlától a test felé
      const PC = [0, 0.3, 0.7], A = mad(mad(PC, n, -0.07), u, 0.095);                      // a lábtartó közepe; a boka helye
      const hip = mad(mad(A, n, -0.12), u, lerp(0.85, 0.45, t));                          // a csípő a sínnel párhuzamosan mozog
      const at = (x, a, b) => [x, hip[1] + u[1] * a + n[1] * b, hip[2] + u[2] * a + n[2] * b];   // a szánkóhoz rögzített pont
      const fx = (x, a, b) => [x, A[1] + u[1] * a + n[1] * b, A[2] + u[2] * a + n[2] * b];       // a vázhoz rögzített pont
      const top = fx(0, 1.64, -0.42), bot = fx(0, 0, -0.42);
      side2(sd => {
        beam([sd * 0.3, 0.03, top[2] - 0.05], [sd * 0.3, 0.03, 0.97], 0.07, 0.05, STEEL, Y);
        cyl(fx(sd * 0.3, 0, -0.42), fx(sd * 0.3, 1.64, -0.42), 0.021, CHROME);
        beam([sd * 0.3, 0.03, top[2]], [sd * 0.3, top[1] + 0.04, top[2]], 0.07, 0.07, STEEL, Zf);
        beam(mad(mad(mad(PC, u, -0.03), X, sd * 0.27), n, -0.12), [sd * 0.3, 0.05, 0.56], 0.05, 0.05, STEEL, n);
        beam(mad(mad(mad(PC, u, -0.03), X, sd * 0.27), n, 0.16), [sd * 0.3, 0.05, 0.92], 0.05, 0.05, STEEL, n);
      });
      beam([-0.3, top[1] + 0.02, top[2]], [0.3, top[1] + 0.02, top[2]], 0.07, 0.07, STEEL, Y);
      beam([-0.3, 0.045, bot[2]], [0.3, 0.045, bot[2]], 0.08, 0.07, STEEL, Y);
      beam([-0.3, 0.03, 0.95], [0.3, 0.03, 0.95], 0.07, 0.05, STEEL, Y);
      box(PC, [0.34, 0.016, 0.25], 0.012, F, STEEL2);
      box(at(0, 0.36, -0.165), [0.17, 0.42, 0.035], 0.03, F, PAD);
      box(at(0, 0.36, -0.22), [0.21, 0.44, 0.02], 0.012, F, STEEL);
      for (const a of [0.08, 0.66]) {
        beam(at(-0.33, a, -0.3), at(0.33, a, -0.3), 0.06, 0.05, STEEL, n);
        box(at(0, a, -0.26), [0.06, 0.04, 0.04], 0.01, F, STEEL);
        side2(sd => cyl(at(sd * 0.3, a - 0.07, -0.3), at(sd * 0.3, a + 0.07, -0.3), 0.036, STEEL2, 0.008));
      }
      side2(sd => {
        cyl(at(sd * 0.335, 0.66, -0.3), at(sd * 0.6, 0.66, -0.3), 0.024, CHROME, 0.005);
        weightPlate(at(sd * 0.42, 0.66, -0.3), X); weightPlate(at(sd * 0.47, 0.66, -0.3), X);
        box(at(sd * 0.165, 0.625, 0), [0.07, 0.045, 0.1], 0.035, F, PAD);
        beam(at(sd * 0.165, 0.66, -0.2), at(sd * 0.165, 0.66, -0.08), 0.05, 0.04, STEEL, u);
        cyl(at(sd * 0.29, 0.56, -0.2), at(sd * 0.29, 0.56, 0.2), 0.015, CHROME, 0.004);
        cyl(at(sd * 0.29, 0.56, 0.06), at(sd * 0.29, 0.56, 0.2), 0.021, GRIP, 0.006);
      });
      return Object.assign({ root: mad(hip, u, D.hipDrop), pitch: al * 180 / Math.PI - 90, head: 4 }, LR(sd => ({
        hand: at(sd * 0.29, 0.56, 0.13), grip: n, pole: [sd * 0.5, -1, 0.5],
        foot: [sd * 0.14, A[1], A[2]], toe: add(n, [sd * 0.2, 0, 0]), footUp: u, kpole: add(n, [sd * 0.3, 0, 0]) })));
    }
  };

  /* Smith vállból nyomás ülve: a rúd függőleges sínen fut az arc előtt. t = 0 lent (állmagasság), 1 fent. */
  EX.smith_machine_overhead_shoulder_press = {
    cam: { yaw: -32, pitch: 7, dist: 5.35, target: [0, 1.07, 0], rad: 2.1 },
    build(t) {
      const seatY = 0.47, ln = rad(10), bd = [0, Math.cos(ln), -Math.sin(ln)], bn = [0, Math.sin(ln), Math.cos(ln)];
      const bz = 0.01, by = lerp(1.13, 1.68, t), ux = 0.58;
      side2(sd => {
        beam([sd * ux, 0.03, -0.6], [sd * ux, 0.03, 0.6], 0.08, 0.05, STEEL, Y);
        beam([sd * ux, 0.03, -0.22], [sd * ux, 2.08, -0.22], 0.07, 0.08, STEEL, Zf);
        cyl([sd * ux, 0.07, bz], [sd * ux, 2.06, bz], 0.016, CHROME, 0.004);
        beam([sd * ux, 2.06, -0.24], [sd * ux, 2.06, bz + 0.04], 0.06, 0.05, STEEL, Y);
        beam([sd * ux, 0.09, -0.22], [sd * ux, 0.09, bz + 0.04], 0.06, 0.05, STEEL, Y);
        box([sd * ux, by, bz], [0.04, 0.075, 0.042], 0.012, W, STEEL2);
        cyl([sd * 0.63, by, bz], [sd * 0.92, by, bz], 0.025, CHROME, 0.005);
        weightPlate([sd * 0.7, by, bz], X);
        cyl([sd * 0.728, by, bz], [sd * 0.762, by, bz], 0.034, STEEL2, 0.006);
      });
      beam([-ux, 2.08, -0.22], [ux, 2.08, -0.22], 0.07, 0.07, STEEL, Y);
      beam([-ux, 0.03, -0.58], [ux, 0.03, -0.58], 0.07, 0.05, STEEL, Y);
      cyl([-0.64, by, bz], [0.64, by, bz], 0.0145, CHROME, 0.003);
      box([0, seatY - 0.03, 0.03], [0.15, 0.03, 0.19], 0.026, W, PAD);
      box(mad(mad([0, seatY, -0.19], bd, 0.4), bn, -0.03), [0.14, 0.4, 0.03], 0.026, { x: X, y: bd, z: bn }, PAD);
      beam([0, seatY - 0.085, -0.3], [0, seatY - 0.085, 0.2], 0.06, 0.05, STEEL, Y);
      beam(mad([0, seatY - 0.06, -0.2], bn, -0.085), mad(mad([0, seatY, -0.19], bd, 0.74), bn, -0.085), 0.06, 0.05, STEEL, bn);
      beam([0, seatY - 0.085, 0.16], [0, 0.03, 0.26], 0.05, 0.05, STEEL, Zf); beam([-0.2, 0.03, 0.26], [0.2, 0.03, 0.26], 0.06, 0.05, STEEL, Y);
      beam([0, seatY - 0.085, -0.28], [0, 0.03, -0.42], 0.05, 0.05, STEEL, Zf); beam([-0.22, 0.03, -0.42], [0.22, 0.03, -0.42], 0.06, 0.05, STEEL, Y);
      return Object.assign({ root: [0, seatY + 0.13, -0.083], pitch: -10, head: 7 }, LR(sd => ({
        hand: [sd * 0.36, by, bz], grip: X, pole: [sd * 0.5, -1, 0.3],
        foot: [sd * 0.21, D.ankle, 0.4], toe: [sd * 0.25, 0, 1], kpole: [sd * 0.3, 0.6, 1] })));
    }
  };

  /* Gépes oldalemelés állva: mellpárnának dőlve, a karok melletti párnás karok a váll magasságában forognak. t = 0 lent, 1 vízszintes kar. */
  EX.machine_lateral_raise = {
    cam: { yaw: -152, pitch: 8, dist: 4.75, target: [0, 0.98, 0.12], rad: 2.1 },
    build(t) {
      const th = rad(lerp(10, 92, t)), px = 0.205, py = 1.5, za = 0.105, Fpad = frot(W, 'x', rad(7)), lift = 0.28 * t;
      beam([0, 0.03, -0.3], [0, 0.03, 0.82], 0.09, 0.05, STEEL, Y);
      beam([-0.36, 0.03, -0.28], [0.36, 0.03, -0.28], 0.07, 0.05, STEEL, Y); beam([-0.36, 0.03, 0.8], [0.36, 0.03, 0.8], 0.07, 0.05, STEEL, Y);
      box([0, 0.045, 0], [0.33, 0.012, 0.24], 0.008, W, STEEL2);
      beam([0, 0.03, 0.42], [0, 1.6, 0.36], 0.1, 0.08, STEEL, Zf);
      box([0, 1.36, 0.185], [0.11, 0.12, 0.035], 0.028, Fpad, PAD);
      beam([0, 1.36, 0.21], [0, 1.36, 0.36], 0.06, 0.05, STEEL, Y);
      beam([-px - 0.03, py, 0.33], [px + 0.03, py, 0.33], 0.07, 0.07, STEEL, Y);
      side2(sd => cyl([sd * 0.09, 0.06, 0.6], [sd * 0.09, 1.5, 0.6], 0.012, CHROME, 0.003));
      for (let i = 0; i < 13; i++) box([0, 0.1 + i * 0.052 + (i >= 8 ? lift : 0), 0.6], [0.14, 0.023, 0.06], 0.006, W, i >= 8 ? PLATE2 : PLATE);
      beam([-0.13, 1.5, 0.6], [0.13, 1.5, 0.6], 0.06, 0.06, STEEL, Y); beam([0, 1.5, 0.36], [0, 1.5, 0.6], 0.05, 0.05, STEEL, Y);
      cyl([0, 0.1 + 12 * 0.052 + lift + 0.03, 0.6], [0, 1.48, 0.6], 0.004, GRIP, 0.001);
      const hands = {};
      side2(sd => {
        const d = [sd * Math.sin(th), -Math.cos(th), 0], pp = [sd * Math.cos(th), Math.sin(th), 0];   // d: a kar iránya, pp: rá merőlegesen kifelé/felfelé
        const P0 = [sd * px, py, za], Lp = r => mad(mad(P0, d, r), pp, 0.105), hp = mad(P0, d, 0.625);
        cyl([sd * px, py, 0.27], [sd * px, py, 0.39], 0.045, STEEL2, 0.01);                      // csapágyház a kereszttartón
        cyl([sd * px, py, za - 0.02], [sd * px, py, 0.3], 0.02, CHROME, 0.004);                    // forgástengely a váll vonalában
        beam(P0, Lp(0), 0.05, 0.04, STEEL, Zf);
        beam(Lp(-0.02), Lp(0.66), 0.045, 0.04, STEEL, Zf);                                         // a gép karja a felkar külső oldalán fut
        box(mad(mad([P0[0], P0[1], 0], d, 0.31), pp, 0.064), [0.075, 0.021, 0.085], 0.02, { x: d, y: pp, z: Zf }, PAD);   // párna a könyök fölött
        beam(Lp(0.625), hp, 0.035, 0.035, STEEL, Zf);
        cyl([hp[0], hp[1], za + 0.012], [hp[0], hp[1], -0.065], 0.014, CHROME, 0.004);
        cyl([hp[0], hp[1], 0.06], [hp[0], hp[1], -0.055], 0.02, GRIP, 0.006);
        hands[sd] = [hp[0], hp[1], 0.004];
      });
      return Object.assign({ root: [0, 1.0, -0.035], pitch: 7, head: -5 }, LR(sd => ({
        hand: hands[sd], grip: Zf, pole: [sd * 0.2, 0.3, -1], foot: [sd * 0.11, 0.057 + D.ankle, -0.02], toe: [sd * 0.18, 0, 1] })));
    }
  };

  /* Szagittális lehúzás egy kézzel: ülve, comb a párna alatt; a kéz a fej fölül-elölről a váll elé húzza a fogantyút,
     a könyök a test előtt halad lefelé, és a törzs mellett áll meg. A kar a fej mögött-fölött lévő tengely körül fordul,
     a tárcsa a lefelé lógó karon hátra-fel lendül. t = 0 fent (nyújtott kar), 1 lent. */
  EX.single_arm_sagittal_pulldown = {
    side: -1, views: { back: 152 }, cam: { yaw: -46, pitch: 8, dist: 5.35, target: [0, 0.98, -0.22], rad: 2.3 },
    build(t) {
      const seatY = 0.5, S0 = seatY + 0.125 + 0.48, C = [0, S0 + 0.452, -0.378], R = 0.672, dl = rad(-64.6), lx = 0.4;
      const lever = (sd, ph) => {            // ph: a fogantyús kar szöge a vízszinteshez képest (előre mutat)
        const P = [sd * lx, C[1], C[2]], h = [0, Math.sin(ph), Math.cos(ph)], w = [0, -Math.sin(ph - dl), -Math.cos(ph - dl)];
        const H = mad(P, h, R), Wp = mad(P, w, 0.8);
        beam(P, H, 0.045, 0.04, STEEL, X); beam(P, Wp, 0.045, 0.04, STEEL, X);
        cyl([sd * (lx + 0.02), H[1], H[2]], [sd * 0.18, H[1], H[2]], 0.014, CHROME, 0.004); cyl([sd * 0.31, H[1], H[2]], [sd * 0.19, H[1], H[2]], 0.02, GRIP, 0.006);
        cyl([sd * lx, Wp[1], Wp[2]], [sd * (lx + 0.22), Wp[1], Wp[2]], 0.024, CHROME, 0.005); weightPlate([sd * (lx + 0.1), Wp[1], Wp[2]], X);
        cyl([sd * (lx - 0.04), P[1], P[2]], [sd * (lx + 0.04), P[1], P[2]], 0.05, STEEL2, 0.01);
        return [sd * 0.245, H[1], H[2]];
      };
      beam([0, 0.03, -0.62], [0, 0.03, 0.72], 0.09, 0.05, STEEL, Y);
      beam([-0.42, 0.03, -0.6], [0.42, 0.03, -0.6], 0.07, 0.05, STEEL, Y); beam([-0.36, 0.03, 0.7], [0.36, 0.03, 0.7], 0.07, 0.05, STEEL, Y);
      side2(sd => {
        beam([sd * 0.27, 0.03, -0.6], [sd * 0.27, C[1] + 0.07, C[2] - 0.08], 0.07, 0.07, STEEL, Zf);
        beam([sd * 0.27, C[1], C[2] - 0.08], [sd * 0.27, C[1], C[2] + 0.03], 0.06, 0.06, STEEL, Y);
      });
      beam([-0.27, C[1] + 0.07, C[2] - 0.08], [0.27, C[1] + 0.07, C[2] - 0.08], 0.07, 0.07, STEEL, Y);
      cyl([-lx - 0.05, C[1], C[2]], [lx + 0.05, C[1], C[2]], 0.022, CHROME, 0.004);
      box([0, seatY - 0.03, -0.02], [0.17, 0.03, 0.18], 0.026, W, PAD);
      beam([0, seatY - 0.06, 0], [0, 0.03, 0], 0.07, 0.07, STEEL, Zf);
      beam([0, 0.03, 0.5], [0, 0.68, 0.42], 0.07, 0.06, STEEL, Zf);
      beam([0, 0.68, 0.3], [0, 0.68, 0.42], 0.05, 0.05, STEEL, Y);
      cyl([-0.26, 0.68, 0.3], [0.26, 0.68, 0.3], 0.014, CHROME, 0.004);
      side2(sd => cyl([sd * 0.045, 0.68, 0.3], [sd * 0.25, 0.68, 0.3], 0.05, PAD, 0.02));
      beam([0, 0.68, 0.42], [0, 0.9, 0.46], 0.04, 0.04, STEEL, Zf); cyl([-0.26, 0.9, 0.46], [0.26, 0.9, 0.46], 0.016, GRIP, 0.005);
      const hand = lever(-1, lerp(rad(15.4), rad(-44.6), t)); lever(1, rad(15.4));
      return { root: [0, seatY + 0.125, 0], pitch: lerp(6, -6, t), chest: -4 * t, head: lerp(-10, 0, t),
        R: { hand, grip: X, pole: [-0.2, -1, 0.6], foot: [-0.17, D.ankle, 0.42], toe: [-0.15, 0, 1], kpole: [-0.2, 0.6, 1] },
        L: { hand: [0.2, 0.9, 0.46], grip: X, pole: [0.6, -1, -0.3], foot: [0.17, D.ankle, 0.42], toe: [0.15, 0, 1], kpole: [0.2, 0.6, 1] } };
    }
  };

  let LV_TEST = null;
  function levels(key) {
    const raw = typeof EX_INFO !== 'undefined' && EX_INFO[key], m = {};
    if (raw) for (const p of raw[0].split(',')) { const [k, v] = p.split(':'); m[k] = Number(v); }
    return m;
  }
  function scene(key, t, glow) {
    const ex = EX[key]; Q = [];
    const c = ex.cam.cen || ex.cam.target;
    emit(1, [c[0], -0.02, c[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.004, 0.004, 0.004], [0.004, 0.004, 0.004], [3.4, 0.016, 3.4], [3.4, 0.016, 3.4], FLOOR);
    const pose = ex.build(t);
    drawBody(solve(pose), LV_TEST || ex.lv || (ex.lv = levels(key)), glow, ex.side);
    return Q;
  }
  const camOf = (ex, o = {}) => ({ yaw: rad(o.yaw ?? ex.cam.yaw), pitch: rad(o.pitch ?? ex.cam.pitch), dist: o.dist ?? ex.cam.dist, target: o.target || ex.cam.target, cen: ex.cam.cen, rad: ex.cam.rad, fov: ex.cam.fov, floor: ex.cam.floor });
  // állókép adat-URL-ként (ikonokhoz és ellenőrzéshez): 2× felbontáson rajzol, majd lekicsinyít
  function shot(key, o = {}) {
    const g = ensureGL(), gl = g.gl, w = o.w || o.size || 160, h = o.h || o.size || 160, W = w * 2, H = h * 2, ex = EX[key];
    render(g, scene(key, o.t ?? 0.7, o.glow ?? 0.6), camOf(ex, o), W, H, target(g, Math.max(W, H)).fbo);
    const px = new Uint8ClampedArray(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const big = document.createElement('canvas'); big.width = W; big.height = H;
    const img = new ImageData(W, H); for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    big.getContext('2d').putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const c2 = out.getContext('2d'); c2.imageSmoothingQuality = 'high'; c2.drawImage(big, 0, 0, w, h);
    return out.toDataURL('image/png');
  }
  /* Álló figura a megadott izomszintekkel (heti izomtérkép): kép-URL, vagy '' ha a 3D nem megy. */
  const FIGS = new Map();
  function figure(lv, yaw) {
    if (!ok()) return '';
    const k = yaw + JSON.stringify(lv);
    if (!FIGS.has(k)) {
      if (FIGS.size > 16) { for (const u of FIGS.values()) { try { URL.revokeObjectURL(u); } catch (e) {} } FIGS.clear(); }
      LV_TEST = lv;
      try { FIGS.set(k, blobUrl(shot('_stand', { w: 230, h: 430, yaw, pitch: 4, dist: 4.5, t: 0, glow: 0.8 }))); } catch (e) { failed = true; return ''; } finally { LV_TEST = null; }
    }
    return FIGS.get(k);
  }

  /* ===== nézőke: mozgó, ujjal forgatható animáció ===== */
  const TL = { conc: 1150, hold: 300, ecc: 1500, rest: 350 };            // ms: erőkifejtés, megtartás, visszaengedés, pihenő
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  // „neg” gyakorlatnál (pl. guggolás) a mozdulat első fele a leengedés, a nehéz szakasz a visszaút
  function phase(ms, neg) {
    let x = ms % (TL.conc + TL.hold + TL.ecc + TL.rest);
    const a = neg ? TL.ecc : TL.conc, b = neg ? TL.conc : TL.ecc;
    if (x < a) return { t: ease(x / a), glow: neg ? 0.4 : 1 };
    x -= a; if (x < TL.hold) return { t: 1, glow: neg ? 0.6 : 1 };
    x -= TL.hold; if (x < b) return { t: 1 - ease(x / b), glow: neg ? 1 : 0.4 };
    return { t: 0, glow: 0.25 };
  }
  const keyOf = id => (typeof rankKeyFor === 'function' && rankKeyFor(id)) || (typeof RANK_ALIAS !== 'undefined' && RANK_ALIAS[id]) || id;
  const has = id => { const k = keyOf(id); return !failed && !!EX[k] && k[0] !== '_'; };
  const VIEWS = { front: -20, side: -82, back: -158 };
  let activeStop = null;
  /* A megadott elembe teszi az animációt; visszaad egy leállító függvényt (vagy null-t, ha a 3D nem megy). */
  function mount(el, id, onFail) {
    const key = keyOf(id), ex = EX[key];
    if (!ex || !ok()) return null;
    if (activeStop) activeStop();
    const g = G, cv = g.canvas;
    el.textContent = ''; el.classList.add('ex-anim3d');
    cv.className = 'a3-canvas'; el.appendChild(cv);
    const bar = document.createElement('div'); bar.className = 'a3-bar';
    bar.innerHTML = '<button type="button" data-v="front">Elölről</button><button type="button" data-v="side">Oldalról</button><button type="button" data-v="back">Hátulról</button><button type="button" data-v="play" class="a3-play" aria-label="Megállítás / indítás">❚❚</button>';
    el.appendChild(bar);
    let yaw = rad(ex.cam.yaw), yawTo = null, paused = false, t0 = performance.now(), tp = 0, raf = 0, glow = 0.3, alive = true, dirty = true, drag = null;
    const size = () => {
      const w = Math.max(200, el.clientWidth || 320), h = Math.round(w * 0.94), dpr = Math.min(window.devicePixelRatio || 1, 3), W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.height = h + 'px'; dirty = true; }
    };
    const setPaused = p => { if (p === paused) return; paused = p; if (p) tp = performance.now(); else t0 += performance.now() - tp; el.classList.toggle('paused', p); bar.querySelector('.a3-play').textContent = p ? '▶' : '❚❚'; dirty = true; };
    const frame = now => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      try {
        if (g.lost || g.gl.isContextLost()) throw new Error('a WebGL-környezet elveszett');
        size();
        if (yawTo !== null) { let d = (yawTo - yaw) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) < 0.004) { yaw += d; yawTo = null; } else yaw += d * 0.17; dirty = true; }
        if (paused && !dirty) return;
        const ph = phase((paused ? tp : now) - t0, ex.neg);
        glow += (ph.glow - glow) * (paused ? 1 : 0.1);
        render(g, scene(key, ph.t, glow), Object.assign(camOf(ex), { yaw }), cv.width, cv.height, null);
        dirty = false;
      } catch (e) { stop(); if (onFail) onFail(e); }
    };
    const down = e => { drag = { x: e.clientX, yaw, moved: false, t: performance.now(), id: e.pointerId }; };
    const move = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 7) { drag.moved = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
      if (drag.moved) { yaw = drag.yaw - dx * 0.011; yawTo = null; dirty = true; }
    };
    const up = e => { if (!drag || e.pointerId !== drag.id) return; if (!drag.moved && performance.now() - drag.t < 450) setPaused(!paused); drag = null; };
    const cancel = () => { drag = null; };
    const click = e => { const v = e.target.closest('[data-v]')?.dataset.v; if (!v) return; if (v === 'play') setPaused(!paused); else { yawTo = rad((ex.views && ex.views[v]) ?? VIEWS[v]); dirty = true; } };
    const redraw = () => { dirty = true; };      // háttérből visszatérve vagy átméretezéskor megállítva is újrarajzolunk
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', cancel);
    bar.addEventListener('click', click); document.addEventListener('visibilitychange', redraw); window.addEventListener('pageshow', redraw);
    function stop() {
      if (!alive) return; alive = false; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', redraw); window.removeEventListener('pageshow', redraw);
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', cancel);
      if (cv.parentNode === el) el.removeChild(cv);
      if (activeStop === stop) activeStop = null;
    }
    activeStop = stop;
    raf = requestAnimationFrame(frame);
    return stop;
  }

  /* ===== kis kerek ikonok a kártyákra: egyszer rajzoljuk meg, utána képként tároljuk (csak a memóriában) ===== */
  const THUMBS = new Map();
  function blobUrl(dataUrl) { try { const b = atob(dataUrl.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'image/png' })); } catch (e) { return dataUrl; } }
  let thumbTimer = 0;
  const thumbImg = key => `<img class="ex-thumb-img" src="${THUMBS.get(key)}" alt="">`;
  const thumbHtml = id => { const k = keyOf(id); return has(id) && THUMBS.has(k) ? thumbImg(k) : ''; };
  function fillThumbs(root) {
    if (failed || !root) return;
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => {
      const els = [...root.querySelectorAll('.ex-thumb[data-info]')].filter(b => has(b.dataset.info) && !b.querySelector('img'));
      if (!els.length || !ok()) return;
      try {
        for (const b of els) {
          const k = keyOf(b.dataset.info), ex = EX[k], th = ex.thumb || {};
          if (!THUMBS.has(k)) THUMBS.set(k, blobUrl(shot(k, { size: 168, t: th.t ?? 0.7, glow: 0.9, yaw: th.yaw, pitch: th.pitch, dist: th.dist ?? ex.cam.dist * 0.6, target: th.target || ex.cam.target })));
          b.innerHTML = thumbImg(k);
        }
      } catch (e) { failed = true; console.warn('IRONLOG 3D ikon hiba:', e); }
    }, 80);
  }
  return { EX, ok, has, mount, thumbHtml, fillThumbs, figure, shot, scene, solve, phase, keyOf, _lv: v => { LV_TEST = v; } };
})();
