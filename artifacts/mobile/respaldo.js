/* ============================================================
   respaldo.js — archivo de respaldo protegido con contraseña
   Sirve para pasar TODAS las notas a otro teléfono.

   Cómo se protege:
   - La contraseña se convierte en dos llaves con PBKDF2-SHA256
     (muchas vueltas, para que adivinarla sea muy lento).
   - Las notas se cifran con ChaCha20 (como WhatsApp y Google).
   - Un sello HMAC-SHA256 detecta si la contraseña es incorrecta
     o si el archivo se dañó.
   Todo está escrito aquí mismo: no necesita paquetes extra.
   ============================================================ */

const ITER = 40000;

/* ---------- Texto ↔ bytes (UTF-8) ---------- */
function utf8Encode(str) {
  const out = new Uint8Array(str.length * 3);
  let o = 0;
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
    }
    if (c < 0x80) out[o++] = c;
    else if (c < 0x800) { out[o++] = 0xc0 | (c >> 6); out[o++] = 0x80 | (c & 63); }
    else if (c < 0x10000) { out[o++] = 0xe0 | (c >> 12); out[o++] = 0x80 | ((c >> 6) & 63); out[o++] = 0x80 | (c & 63); }
    else { out[o++] = 0xf0 | (c >> 18); out[o++] = 0x80 | ((c >> 12) & 63); out[o++] = 0x80 | ((c >> 6) & 63); out[o++] = 0x80 | (c & 63); }
  }
  return out.subarray(0, o);
}
function utf8Decode(b) {
  const parts = [];
  let s = '';
  for (let i = 0; i < b.length;) {
    let c = b[i++];
    if (c >= 0xf0) c = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xe0) c = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xc0) c = ((c & 31) << 6) | (b[i++] & 63);
    if (c >= 0x10000) { c -= 0x10000; s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023)); }
    else s += String.fromCharCode(c);
    if (s.length > 8192) { parts.push(s); s = ''; }
  }
  parts.push(s);
  return parts.join('');
}

/* ---------- Base64 ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64MAP = (() => { const m = new Uint8Array(128); for (let i = 0; i < 64; i++) m[B64.charCodeAt(i)] = i; return m; })();
function b64Encode(b) {
  const parts = [];
  let s = '';
  let i = 0;
  for (; i + 2 < b.length; i += 3) {
    const n = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
    s += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    if (s.length > 8192) { parts.push(s); s = ''; }
  }
  if (i < b.length) {
    const n = (b[i] << 16) | ((i + 1 < b.length ? b[i + 1] : 0) << 8);
    s += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + '=';
  }
  parts.push(s);
  return parts.join('');
}
function b64Decode(str) {
  const clean = String(str).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64MAP[clean.charCodeAt(i)], b = B64MAP[clean.charCodeAt(i + 1)];
    const c = B64MAP[clean.charCodeAt(i + 2)] || 0, d = B64MAP[clean.charCodeAt(i + 3)] || 0;
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}

/* ---------- SHA-256 ---------- */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const W = new Uint32Array(64);
function compress(H, b, off) {
  for (let i = 0; i < 16; i++) W[i] = (b[off + i * 4] << 24) | (b[off + i * 4 + 1] << 16) | (b[off + i * 4 + 2] << 8) | b[off + i * 4 + 3];
  for (let i = 16; i < 64; i++) {
    const x = W[i - 15], y = W[i - 2];
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
  }
  let a = H[0], b2 = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
    h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
  }
  H[0] = (H[0] + a) | 0; H[1] = (H[1] + b2) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
  H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
}
const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
/* Hash por partes (para archivos grandes sin trabar el teléfono) */
function shaInit() { return { H: new Uint32Array(IV), buf: new Uint8Array(64), n: 0, len: 0 }; }
function shaUpdate(st, data) {
  let i = 0;
  st.len += data.length;
  if (st.n) {
    while (st.n < 64 && i < data.length) st.buf[st.n++] = data[i++];
    if (st.n === 64) { compress(st.H, st.buf, 0); st.n = 0; }
  }
  for (; i + 64 <= data.length; i += 64) compress(st.H, data, i);
  while (i < data.length) st.buf[st.n++] = data[i++];
}
function shaFinal(st) {
  const bits = st.len * 8;
  const pad = new Uint8Array(((st.n + 9 + 63) >> 6) * 64 - st.n);
  pad[0] = 0x80;
  const hi = Math.floor(bits / 0x100000000), lo = bits >>> 0;
  const L = pad.length;
  pad[L - 8] = hi >>> 24; pad[L - 7] = hi >>> 16; pad[L - 6] = hi >>> 8; pad[L - 5] = hi;
  pad[L - 4] = lo >>> 24; pad[L - 3] = lo >>> 16; pad[L - 2] = lo >>> 8; pad[L - 1] = lo;
  shaUpdate(st, pad);
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) { out[i * 4] = st.H[i] >>> 24; out[i * 4 + 1] = st.H[i] >>> 16; out[i * 4 + 2] = st.H[i] >>> 8; out[i * 4 + 3] = st.H[i]; }
  return out;
}
export function sha256(data) { const st = shaInit(); shaUpdate(st, data); return shaFinal(st); }

/* ---------- HMAC-SHA256 ---------- */
function hmacInit(key) {
  if (key.length > 64) key = sha256(key);
  const k = new Uint8Array(64); k.set(key);
  const ip = new Uint8Array(64), op = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
  const inner = shaInit(); shaUpdate(inner, ip);
  const outer = shaInit(); shaUpdate(outer, op);
  return { inner, outer };
}
function cloneSha(st) { return { H: new Uint32Array(st.H), buf: new Uint8Array(st.buf), n: st.n, len: st.len }; }
function hmacWith(base, data) {
  const i = cloneSha(base.inner); shaUpdate(i, data);
  const o = cloneSha(base.outer); shaUpdate(o, shaFinal(i));
  return shaFinal(o);
}
export function hmac(key, data) { return hmacWith(hmacInit(key), data); }

/* ---------- PBKDF2-SHA256 (contraseña → llaves) ---------- */
const tick = () => new Promise(r => setTimeout(r, 0));
async function pbkdf2(pass, salt, iter, blocks) {
  const base = hmacInit(pass);
  const out = new Uint8Array(32 * blocks);
  for (let b = 1; b <= blocks; b++) {
    const s = new Uint8Array(salt.length + 4); s.set(salt);
    s[salt.length + 3] = b;
    let u = hmacWith(base, s);
    const t = new Uint8Array(u);
    for (let i = 1; i < iter; i++) {
      u = hmacWith(base, u);
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
      if (i % 4000 === 0) await tick();
    }
    out.set(t, (b - 1) * 32);
  }
  return out;
}

/* ---------- ChaCha20 (cifrado) ---------- */
function rd32(b, i) { return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24); }
async function chacha20(key, nonce, data) {
  const st = new Uint32Array(16), x = new Uint32Array(16), ks = new Uint8Array(64);
  st[0] = 0x61707865; st[1] = 0x3320646e; st[2] = 0x79622d32; st[3] = 0x6b206574;
  for (let i = 0; i < 8; i++) st[4 + i] = rd32(key, i * 4);
  st[12] = 0;
  for (let i = 0; i < 3; i++) st[13 + i] = rd32(nonce, i * 4);
  const out = new Uint8Array(data.length);
  const QR = (a, b, c, d) => {
    x[a] += x[b]; x[d] ^= x[a]; x[d] = (x[d] << 16) | (x[d] >>> 16);
    x[c] += x[d]; x[b] ^= x[c]; x[b] = (x[b] << 12) | (x[b] >>> 20);
    x[a] += x[b]; x[d] ^= x[a]; x[d] = (x[d] << 8) | (x[d] >>> 24);
    x[c] += x[d]; x[b] ^= x[c]; x[b] = (x[b] << 7) | (x[b] >>> 25);
  };
  for (let pos = 0, blk = 0; pos < data.length; pos += 64, blk++) {
    st[12] = blk;
    x.set(st);
    for (let r = 0; r < 10; r++) {
      QR(0, 4, 8, 12); QR(1, 5, 9, 13); QR(2, 6, 10, 14); QR(3, 7, 11, 15);
      QR(0, 5, 10, 15); QR(1, 6, 11, 12); QR(2, 7, 8, 13); QR(3, 4, 9, 14);
    }
    for (let i = 0; i < 16; i++) {
      const v = (x[i] + st[i]) | 0;
      ks[i * 4] = v; ks[i * 4 + 1] = v >>> 8; ks[i * 4 + 2] = v >>> 16; ks[i * 4 + 3] = v >>> 24;
    }
    const n = Math.min(64, data.length - pos);
    for (let i = 0; i < n; i++) out[pos + i] = data[pos + i] ^ ks[i];
    if (blk % 20000 === 19999) await tick();
  }
  return out;
}

function randomBytes(n) {
  const b = new Uint8Array(n);
  try { if (typeof crypto !== 'undefined' && crypto.getRandomValues) { crypto.getRandomValues(b); return b; } } catch (e) {}
  for (let i = 0; i < n; i++) b[i] = (Math.random() * 256) ^ (Date.now() >> (i % 8));
  return b;
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
async function macOf(macKey, salt, nonce, ct) {
  const base = hmacInit(macKey);
  const i = cloneSha(base.inner);
  shaUpdate(i, utf8Encode('mis-notas-v1'));
  shaUpdate(i, salt); shaUpdate(i, nonce);
  for (let p = 0; p < ct.length; p += 1 << 20) { shaUpdate(i, ct.subarray(p, p + (1 << 20))); await tick(); }
  const o = cloneSha(base.outer); shaUpdate(o, shaFinal(i));
  return shaFinal(o);
}

/* ============================================================
   USO
   ============================================================ */
/* Convierte las notas en el texto del archivo de respaldo */
export async function makeBackup(obj, password) {
  const salt = randomBytes(16), nonce = randomBytes(12);
  const keys = await pbkdf2(utf8Encode(password), salt, ITER, 2);
  const encKey = keys.subarray(0, 32), macKey = keys.subarray(32, 64);
  const plain = utf8Encode(JSON.stringify(obj));
  await tick();
  const ct = await chacha20(encKey, nonce, plain);
  const tag = await macOf(macKey, salt, nonce, ct);
  return JSON.stringify({
    app: 'mis-notas', v: 1, kdf: 'pbkdf2-sha256', iter: ITER, cipher: 'chacha20+hmac-sha256',
    created: new Date().toISOString(),
    salt: b64Encode(salt), nonce: b64Encode(nonce), tag: b64Encode(tag), data: b64Encode(ct),
  });
}

/* Abre el archivo de respaldo. Errores: 'file' (no es un respaldo) o 'pass' (contraseña incorrecta) */
export async function openBackup(text, password) {
  let f;
  try { f = JSON.parse(text); } catch (e) { throw new Error('file'); }
  if (!f || f.app !== 'mis-notas' || !f.data || !f.salt || !f.nonce || !f.tag) throw new Error('file');
  const salt = b64Decode(f.salt), nonce = b64Decode(f.nonce), tag = b64Decode(f.tag);
  const keys = await pbkdf2(utf8Encode(password), salt, f.iter || ITER, 2);
  const encKey = keys.subarray(0, 32), macKey = keys.subarray(32, 64);
  const ct = b64Decode(f.data);
  await tick();
  const want = await macOf(macKey, salt, nonce, ct);
  if (!sameBytes(want, tag)) throw new Error('pass');
  const plain = await chacha20(encKey, nonce, ct);
  try { return JSON.parse(utf8Decode(plain)); } catch (e) { throw new Error('file'); }
}

/* ============================================================
   BÓVEDA: llaves que se quedan en memoria mientras está abierta
   y "sobres" cifrados para cada cosa que guardas.
   Sobre = nonce (12) + sello (32) + datos cifrados
   ============================================================ */
export async function vaultKeys(password, salt, iter) {
  const k = await pbkdf2(utf8Encode(password), salt, iter || ITER, 2);
  return { enc: k.slice(0, 32), mac: k.slice(32, 64) };
}
export async function seal(keys, bytes) {
  const nonce = randomBytes(12);
  const ct = await chacha20(keys.enc, nonce, bytes);
  const tag = await macOf(keys.mac, new Uint8Array(0), nonce, ct);
  const out = new Uint8Array(44 + ct.length);
  out.set(nonce, 0); out.set(tag, 12); out.set(ct, 44);
  return out;
}
export async function unseal(keys, data) {
  if (!data || data.length < 44) throw new Error('file');
  const nonce = data.subarray(0, 12), tag = data.subarray(12, 44), ct = data.subarray(44);
  const want = await macOf(keys.mac, new Uint8Array(0), nonce, ct);
  if (!sameBytes(want, tag)) throw new Error('pass');
  return chacha20(keys.enc, nonce, ct);
}
export { randomBytes, b64Encode, b64Decode, utf8Encode, utf8Decode };
