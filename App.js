import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Image, ScrollView,
  Pressable, StyleSheet, StatusBar, BackHandler, Alert, SafeAreaView, Share,
  KeyboardAvoidingView, Platform, useWindowDimensions, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { buildEditorHtml } from './editor';
import { LANG_GROUPS, langLabel, groupOf, makeT, detectLang, localeOf } from './idiomas';

/* Idioma actual (se cambia con applyLang). tr('clave') devuelve el texto traducido. */
let tr = makeT(detectLang());
let LOCALE = localeOf(detectLang());
function applyLang(code) { tr = makeT(code); LOCALE = localeOf(code); }

/* En el teléfono las notas se guardan en un archivo (sin límite de tamaño,
   necesario para las fotos). En la vista previa de Replit se usa AsyncStorage. */
let FS = null;
if (Platform.OS !== 'web') {
  try { FS = require('expo-file-system'); } catch (e) { FS = null; }
}

/* ============================================================
   COLORES (modo claro y oscuro)
   ============================================================ */
const KEY = 'misnotas_v1';
/* Fondos desenfocados (imágenes pequeñas incluidas en el código) */
const BG_DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAAC+CAIAAAA6H4/BAAAJ0UlEQVR42u1d25ajOAwE1o/Tfzf//ymTfcie6TSWSqWbIXvCU4cmBJWl0gVb3n///r0px77v5pl3OR6PB3Ny8LfY91286X1g0h6Pv2A8r2DkAVcuhsmUKnz98MozXwlk/ntxCS6MVLzk4pUDPzEj/Os1mtje8VxsIwJ3kAqCAWq1GlKqjBIN8OWnDDOhvpd2gP8KnuXPnz9YEcyBvZV2kA7V5g7wAzFhGJg6oDn9C388/WvEnNZJVDFgazUQUTBGcgccGguYCjK7p1oX60LBC8frGZU7ThAwJiNqBB/mFRoIqSwylWpDKn6c/zYhKzScwICT3PE8Px6Ph6nq2giTFhEmY69RYLAYXGTtIDXCDOFLqCRAFrx2nD7+0I4TECdhNIBmIZkspkRNeDNhMH08Hj+o9NXOZ4N/CilqivYRC59BLQAE44C+4ZhD8pNdPPVFvABQb23kTmq+BpZJH2O+hWkjJ4AAZZBZT9iVgP96Y9P/PMvJWESZeV97+lcyhSEDDSAqqT5/P9pwzILNJCJ+BEqRN5OY4ZjWJESlmkgnEwBKpKU2VdrhGnPSDaEgXRt5jSPnP4CuJYudQCpGciMqBUE6MBkTIAxHxlJcVuNCKh6ka3oBblUYlZImEwnDxO+IuIhuRSMXTV/yUSlDjbyvQQm+OcjA7zJkWWIs/ElvXitUw8gcH3gcUOboS/NjYYicwjFZ+ZzRMUEXn9plYnNvamck+CBYwgUxESMmi1kDSqBEMMiXFJqL0Uo7gFZaq4SxUpgKB1O5OhFHYTW0ilnDxeTBv+kji+lVuWzyFUGsgDKaClZ9pbC8CjiMBQyj6DjwM101v8OFu20sTKV3wXu2pLTe9zIbngylfc30mk0OpVBsn7F4reZarSkpJsW1A/vXqyyoBKZRGykWpm0l0oJiZUQ7ksCvMZzCKXTjbup67TEyUpFv8N8Sjo5if+zoeN1Pjty4oT53PBI5csf2OUqotE+tLiSgcaHYgczg1lR6B0KphSlIpa3Y5Wc8hO85bmUmfYrgi0q7M5eSAVzAKam4o6/YxwtZi9FxEyxqfyL8xXE3CE4/FB78WLH2jlTqqmJUXXlZzlLoOLzLPCuNZf36FBKp8BdtOO5pIEkGubWx9GGUnws/bjjs4WgtFrl0wbH+JVP5Au+CZcX3Ua7wQnEHd7wRufCrr27KHTHfaYYb4cVV472w0OJ3vGSGB2XcXPiS8JSfhDS077/jC6QC7iDnlZbEAjfM8YqNhezfUFiRdc1V9Kr56ANCvLhwHhMfj/GPeizAouSLSdvpylny8swz/LXAMdbXKONfRhUW3gZa2gL3El0IF4QOUrx937XfCP8rcKb7GEmLYK4EqxrMqdux6VThTP9ghNGWLnlHb/6KC80LtIP8bVKxceAAdMRsfNGE4BEYK97IgWaFbbNVWUaS28LcgZ0L9jW4IpXBa6y0T1Pm2JKxwocfYWowYxA+6MDcURKVkDnu2Jxt9AJnmOFlPG5flvz35sNktQ5fCFb954OOzLMV5Cy8cjHrpbQ1y/l3KPVwJJ8DrBd0QdBXUhorVdGbwmrG4oJmUflngSdm+Lh4btiFYptxVHi2WPjNYRaO1pp7rCCeKRQc5G+0ctjcW6mEtvaXg9UOrYXTq8byfRpaEXG9fPZe+bz5of0S7nNgnmlSolbD3Pd9kIO8/r0c42XLjwNoo/lRPJNZEXaydm+lut7RYqYwiQaYXr67eAYRX4cGTKWbszF2wNy6LZF8+TJIf6E1r3G1LckTUG1DlPmGw2UILmPBPYGqZggUa4eoBRvRW9LFIOK/SERa7UjQDmaEeVCA/GI7ByztYu8+zBGOQQCKGpoRxYL0QKhqzP5hjMVblWEars1dPgMvvWIFFw2msSlTh8hdJDA05hmNbi5xyT+C9AAuJjRMJ1Svl2lNFw6tMxQZgz9eDhDCz9ec5jTxHc/bqRSoaLiiC7SDLx1gm+rQkUFGCknuAF1xxfbzJwtalk8P0xsFttlgtOMUnoqaghEp2SDoJMs/X19fXtLm5zcBvyh2Xdc6cAc8S6x6/AOOwrobkEHs0k+i1u1rB6lFTBYEOIXhDtE0xCBtEZUmc2Rm4zDMHaLMYhPuLu749etXFcwZ7gifrOUOFHeY3ZzJPumMdmAvu1kt2mPVwPkalUrz2oEplnQx2j0D7qax5yDDqRrFAu3Q5knhXaNKZsWovY69t9DiNHMjrBMEIjRi7s90HQ90Wq3xLCb1aBsyiK509jibsoeFd59lRrSRtzdXZsXTquZicUWOybkWcQdZ+JmN5ZSnaOGGuctS3rN0TXfhJwaYweg87FVbN6yDA6ShZEBRu10FiUj7ZCizeDMzCM5QyL3WYgy4Ym6YWLwBW3iSWwPVTtQuiDuSTkcrDprJa2Yy3PXaQVKJxqDmjP38lozXwJHhmiYbucZYsAMWU1gzzO1wN+MOKuDd1aRjun5KOzra48c2EK99jPgCDpMCAY6xKYor+pVmqn7ggsw7Z9c7/aXaUT4x2hs7r1nVc19Hu0wRRG/9TnAsQHmE4XTl9e9yDNKbFq7NLwwiy03GaEnQwV6x8GGus3eYTM2ic3KDc5LPtGetbfgvN7spnHmXN5b8+AfaBb0+4dJ1tEwC5lpBuhVtjv296Jyh0kBU6lJX126VHYSqvmdxvWeN6RQpfMebR9bRJqdBadfgpMss5Kzfj3Fk1gzEjIiZe6vFPrHGag7PUuI+krUSbBcBRLz7KwpwJPnSVb819WKlmbw+0ogJmWnBSDb70ZQibD6OqLQqxKpVDUbyWj0aMStwoYYXlOFhZ3zwCs/i6pXmDUOZt9P8nAamL507wXdJm1wjDF7KYiC6TebQWjrg84U5Pj+XtCOBcmtHLB4lvT2Y4gESqD5/PJLwB/IXbaqkZv+kzCXQHOJ9sUUEuqYwWeLcmIGZY1trMkdJGpJHRJx7XBjyVKZwVYYTSNgL03zmi4f5NIUtZvCYL6hax+EgUfDySKC8hAmlHQ5TtiYqNWVesAHrsYaiAogs04gIlW79fTQKo+/eHUervE/fRgLtVFqYoZQY1CJjudsDhe0C/MEb0bF9jg8cHzg+cNTC8b5b1bZ4lq25j0hh51yzOQ7urvmtHWbn1fvoyOscoK4XC6+/5GpJEQYOhAPiHzMKJ0TEjy6lkLljTY/eBalHJZUyO/a9BWSBpz20GwFO+h97nGEumOjOXGpn3WY9S8zhddRvcZ+5NZ7lYEygFpGwc11NpV5euJxEYjzq2+lcWxS91c23Nxsu4lgDRB/JesdwkWhJb6qPZ1lnNWHP8hRztWfJMMJdPEstj5IhwALhg56lcLXAJRkAn8gdd7CODjljD3y8kfALjn8BgNmC4kb1AvoAAAAASUVORK5CYII=';
const BG_LIGHT = 'data:image/png;base64,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';

const THEMES = {
  /* Noche: vidrio ahumado oscuro con brillo ámbar arriba */
  dark: {
    grad: ['#1c1c1c', '#1c1c1c', '#1c1c1c'],
    bgImage: BG_DARK,
    frost: 'rgba(255,255,255,0.02)',
    text: '#ffffff', muted: 'rgba(255,255,255,0.68)', border: 'rgba(255,255,255,0.18)', accent: '#ffffff',
    fill: 'rgba(255,255,255,0.02)',            // vidrio casi transparente
    strong: 'rgba(38,38,38,0.80)',             // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.40)'],
    rim: 'rgba(255,255,255,0.14)',             // brillo interno del borde
    rim2: 'rgba(255,255,255,0.03)',
    sheen: 'rgba(255,255,255,0.10)',           // brillo de esquina
    hi: 'rgba(255,255,255,0.22)',              // brillo interno arriba
    lo: 'rgba(0,0,0,0.12)',                    // sombra interna abajo
    dockFill: 'rgba(255,255,255,0.03)',
    scrim: 'rgba(0,0,0,0.35)',
    bar: 'light-content',
    inv: '#1c1c1c',
    wallDim: 'rgba(0,0,0,0.30)',
    card: 'transparent',
    seeTint: 'rgba(0,0,0,0.38)',             // modo translúcido: capa sobre la pantalla de inicio
  },
  /* Día: vidrio lechoso como el Centro de control (gris perla, brillo cálido arriba) */
  light: {
    grad: ['#959595', '#959595', '#959595'],
    bgImage: BG_LIGHT,
    frost: 'rgba(255,255,255,0.05)',
    text: '#ffffff', muted: 'rgba(255,255,255,0.80)', border: 'rgba(255,255,255,0.40)', accent: '#ffffff',
    fill: 'rgba(255,255,255,0.025)',            // vidrio casi transparente, como los botones del iPhone
    strong: 'rgba(136,136,136,0.78)',          // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.60)'],
    rim: 'rgba(255,255,255,0.24)',             // brillo interno del borde
    rim2: 'rgba(255,255,255,0.05)',
    sheen: 'rgba(255,255,255,0.18)',           // brillo de esquina
    hi: 'rgba(255,255,255,0.50)',
    lo: 'rgba(0,0,0,0.06)',
    dockFill: 'rgba(255,255,255,0.04)',
    glassBright: 0.95,                         // la barra del editor un poco más oscura para ver los íconos
    scrim: 'rgba(56,56,56,0.28)',
    bar: 'light-content',
    inv: '#383838',
    wallDim: 'rgba(36,36,36,0.18)',
    card: 'transparent',
    seeTint: 'rgba(70,70,70,0.30)',
  },
};
const TITLE_KEYS = ['all', 'fav', 'trash'];

/* Carpetas, orden y etiquetas */
const FOLDER_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1',
                       '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#757575'];
const SORTS = [
  ['updated', 'clock', 'sortUpdated'],
  ['created', 'calendar', 'sortCreated'],
  ['alpha', 'type', 'sortAlpha'],
];
/* Etiquetas en cualquier idioma: # seguido de letras (no espacios ni signos) */
const TAG_RE = /#([^\s#.,;:!?¡¿()\[\]{}"'<>\/\\。、，！？]+)/g;

/* PIN: se guarda solo una "huella" del número, no el número en sí */
function hashPin(p) {
  let h = 2166136261;
  for (let r = 0; r < 500; r++) {
    const str = 'misnotas:' + r + ':' + p + ':' + h;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  }
  return h.toString(36);
}

/* Pregunta Sí/No (funciona en el teléfono y en la vista previa web) */
function confirmAsk(title, msg, okText, onOk) {
  if (Platform.OS === 'web') {
    if (window.confirm(title + '\n\n' + msg)) onOk();
    return;
  }
  Alert.alert(title, msg, [
    { text: tr('cancel'), style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}

/* ============================================================
   GUARDAR Y CARGAR
   ============================================================ */
function notesFile() {
  return new FS.File(FS.Paths.document, 'notas.json');
}

const WALL_KEY = 'misnotas_fondo';
/* id vacío = fondo del menú principal; id de nota = fondo solo de esa nota */
function wallFile(id) {
  return new FS.File(FS.Paths.document, id ? `fondo_${id}.txt` : 'fondo.txt');
}
function wallKey(id) { return id ? `${WALL_KEY}_${id}` : WALL_KEY; }
async function loadWallpaper(id) {
  if (FS) {
    try { const f = wallFile(id); if (f.exists) return await f.text(); } catch (e) {}
  }
  return (await AsyncStorage.getItem(wallKey(id))) || null;
}
async function saveWallpaper(data, id) {
  if (FS) {
    try {
      const f = wallFile(id);
      if (!data) { if (f.exists) f.delete(); return; }
      if (!f.exists) f.create();
      f.write(data);
      return;
    } catch (e) {}
  }
  if (data) await AsyncStorage.setItem(wallKey(id), data);
  else await AsyncStorage.removeItem(wallKey(id));
}

/* Historial de versiones: un archivo por nota (no hace pesado el archivo de notas) */
const HIST_KEY = 'misnotas_hist';
const MAX_VERSIONS = 20;
function histFile(id) { return new FS.File(FS.Paths.document, `historial_${id}.json`); }
async function loadHistory(id) {
  try {
    if (FS) { const f = histFile(id); if (f.exists) return JSON.parse(await f.text()); return []; }
    const raw = await AsyncStorage.getItem(`${HIST_KEY}_${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
async function saveHistory(id, list) {
  const str = JSON.stringify(list);
  if (FS) {
    try {
      const f = histFile(id);
      if (!list.length) { if (f.exists) f.delete(); return; }
      if (!f.exists) f.create();
      f.write(str);
      return;
    } catch (e) {}
  }
  if (list.length) await AsyncStorage.setItem(`${HIST_KEY}_${id}`, str);
  else await AsyncStorage.removeItem(`${HIST_KEY}_${id}`);
}
/* Lo que se guarda de una nota en cada versión */
function versionOf(n, at) {
  return { at: at || Date.now(), title: n.title || '', titleHtml: n.titleHtml || '',
           content: n.content || '', html: !!n.html, ink: n.ink || null };
}
function sameVersion(a, b) {
  return !!a && !!b && a.title === b.title && a.titleHtml === b.titleHtml && a.content === b.content &&
    JSON.stringify(a.ink || null) === JSON.stringify(b.ink || null);
}

/* ============================================================
   REGISTRO: guarda todo lo que se escribe en una nota, aunque
   después se borre. Se va actualizando solo mientras escribes.
   ============================================================ */
const REC_KEY = 'misnotas_registro';
const REC_IMG = '\u0001';              // marca de foto dentro del registro
const MAX_REC = 3000;
function recFile(id) { return new FS.File(FS.Paths.document, `registro_${id}.json`); }
async function loadRecord(id) {
  try {
    if (FS) { const f = recFile(id); if (f.exists) return JSON.parse(await f.text()); return null; }
    const raw = await AsyncStorage.getItem(`${REC_KEY}_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
async function saveRecord(id, rec) {
  const str = rec ? JSON.stringify(rec) : '';
  if (FS) {
    try {
      const f = recFile(id);
      if (!rec) { if (f.exists) f.delete(); return; }
      if (!f.exists) f.create();
      f.write(str);
      return;
    } catch (e) {}
  }
  if (rec) await AsyncStorage.setItem(`${REC_KEY}_${id}`, str);
  else await AsyncStorage.removeItem(`${REC_KEY}_${id}`);
}
/* La nota convertida en una lista ordenada de renglones y fotos */
function noteTokens(n) {
  const out = [];
  const add = l => { l = l.replace(/\u200B/g, '').replace(/\s+/g, ' ').trim(); if (l) out.push(l); };
  add(n.title || '');
  if (!n.html) { (n.content || '').split('\n').forEach(add); return out; }
  (n.content || '').split(/(<img[^>]*>)/i).forEach(part => {
    const m = part.match(/^<img[^>]+src="([^"]+)"/i);
    if (m) out.push(REC_IMG + m[1]);
    else toPlain({ html: true, content: part.replace(/<(div|p|li|h[1-6])[\s>]/gi, '\n$&') }).split('\n').forEach(add);
  });
  return out;
}
/* ¿"a" se puede formar con "b" solo agregando letras? */
function isSubseq(a, b) {
  let i = 0;
  for (let j = 0; j < b.length && i < a.length; j++) if (a[i] === b[j]) i++;
  return i === a.length;
}
/* Suma lo nuevo al registro. Nunca quita nada.
   - Renglón que solo creció (ej. "Hol" → "Hola"): se actualiza.
   - Renglón al que le borraste algo: se queda la versión completa.
   - Renglón nuevo: se agrega en su lugar. */
function mergeRecord(entries, tokens) {
  const arr = entries.slice();
  const cur = new Set(tokens);
  let changed = false, prev = -1;
  for (const tk of tokens) {
    let idx = arr.indexOf(tk);
    if (idx === -1 && tk[0] !== REC_IMG) {
      const grown = arr.findIndex(r => r[0] !== REC_IMG && !cur.has(r) && r.length < tk.length && isSubseq(r, tk));
      if (grown !== -1) { arr[grown] = tk; idx = grown; changed = true; }
      else if (arr.some(r => r[0] !== REC_IMG && !cur.has(r) && r.length > tk.length && isSubseq(tk, r))) continue;
    }
    if (idx === -1) {
      idx = prev + 1;
      while (idx < arr.length && !cur.has(arr[idx])) idx++;   // lo nuevo va después de lo borrado
      arr.splice(idx, 0, tk); changed = true;
    }
    prev = idx;
  }
  if (!changed) return null;
  return arr.slice(0, MAX_REC);
}

async function loadData() {
  if (FS) {
    try {
      const f = notesFile();
      if (f.exists) return JSON.parse(await f.text());
    } catch (e) {}
  }
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

async function saveData(data) {
  const str = JSON.stringify(data);
  if (FS) {
    try {
      const f = notesFile();
      if (!f.exists) f.create();
      f.write(str);
      return;
    } catch (e) {}
  }
  await AsyncStorage.setItem(KEY, str);
}

/* ============================================================
   AYUDANTES
   ============================================================ */
function fmtDate(t) {
  const d = new Date(t);
  try {
    return d.toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    const p = x => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}

/* Texto simple de una nota (para vista previa y búsqueda) */
function toPlain(n) {
  if (!n.html) return n.content || '';
  return (n.content || '')
    .replace(/<(br|\/div|\/p|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* Convierte notas antiguas (texto simple) al nuevo formato */
function toHtml(n) {
  if (n.html) return n.content || '';
  return (n.content || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* Título con formato (colores, tamaños...) */
function toTitleHtml(n) {
  if (n.titleHtml) return n.titleHtml;
  const esc = (n.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return n.titleColor && esc ? `<span style="color:${n.titleColor}">${esc}</span>` : esc;
}
/* Primer color usado en el título (para la tarjeta) */
function titleColorOf(n) {
  const m = n.titleHtml && n.titleHtml.match(/color:\s*([^;"]+)/);
  return m ? m[1].trim() : (n.titleColor || null);
}

/* Divide el título en partes con su color/negrita/cursiva (para la tarjeta) */
function decodeHtml(t) {
  return t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
function titleSegments(n) {
  const html = toTitleHtml(n);
  if (!html) return [];
  const out = [];
  const stack = [{}];
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) {
      const text = decodeHtml(m[3]).replace(/\u200B/g, '');
      if (text) out.push({ text, ...stack[stack.length - 1] });
      continue;
    }
    const tag = m[1].toLowerCase();
    if (tag === 'br') continue;
    if (m[0][1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    const st = { ...stack[stack.length - 1] };
    const attrs = m[2] || '';
    if (tag === 'b' || tag === 'strong') st.bold = true;
    if (tag === 'i' || tag === 'em') st.italic = true;
    if (tag === 'u') st.underline = true;
    const fc = attrs.match(/color="([^"]+)"/);
    if (tag === 'font' && fc) st.color = fc[1];
    const sm = attrs.match(/style="([^"]*)"/);
    if (sm) {
      const css = sm[1];
      const c1 = css.match(/(?:^|;)\s*color:\s*([^;]+)/); if (c1) st.color = c1[1].trim();
      const fw = css.match(/font-weight:\s*([^;]+)/); if (fw) st.bold = /bold|[6-9]00/.test(fw[1]);
      const fs = css.match(/font-style:\s*([^;]+)/); if (fs) st.italic = /italic/.test(fs[1]);
      const td = css.match(/text-decoration[a-z-]*:\s*([^;]+)/); if (td) st.underline = /underline/.test(td[1]);
      const ol = css.match(/(?:-webkit-)?text-stroke:\s*([^;]+)/) || css.match(/text-shadow:\s*([^;]+)/);
      if (ol) {
        const colm = ol[1].match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b(?=\s*$)/);
        st.outline = /none|^\s*0(px)?\s*$/.test(ol[1]) ? null : (colm ? colm[0] : null);
      }
    }
    if (/\/\s*$/.test(attrs)) continue;   // etiqueta que se cierra sola
    stack.push(st);
  }
  return out;
}

/* Etiquetas (#algo) que hay en una nota. Las notas bloqueadas solo muestran las del título */
function tagsOf(n) {
  const text = (n.title || '') + ' ' + (n.locked ? '' : toPlain(n));
  const out = [];
  for (const m of text.matchAll(TAG_RE)) {
    const t = m[1].toLowerCase();
    if (!/^\d+$/.test(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

/* Primera foto de la nota (para mostrarla en la tarjeta) */
function firstImg(n) {
  if (!n.html || !n.content) return null;
  const m = n.content.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
}

/* ============================================================
   LIQUID GLASS: piezas de vidrio
   ============================================================ */

/* Fondo de vidrio desenfocado (una imagen muy borrosa estirada a toda la pantalla) */
/* La ventana solo es translúcida en la app instalada de Android */
const CAN_SEE = Platform.OS === 'android';

function Background({ t, wall, blur, see }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {see && !wall ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.seeTint }]} />
      ) : wall ? (
        <>
          {/* blur -1 = "Nada": la imagen tal cual, sin desenfoque ni capa encima */}
          <Image source={{ uri: wall }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={blur > 0 ? blur : 0} />
          {blur >= 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: t.wallDim }]} />}
        </>
      ) : (
        <>
          <Image source={{ uri: t.bgImage }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 2} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: t.frost }]} />
        </>
      )}
    </View>
  );
}

/* Cristal: relleno 4%, borde 0.5 con degradado, brillo arriba y sombra abajo */
function Glass({ t, style, inner, radius = 20, strong, children }) {
  return (
    <View style={[{ borderRadius: radius, borderWidth: 1, borderColor: t.stroke[0] }, style]}>
      <View style={{ flexGrow: 1, borderRadius: radius - 0.5, overflow: 'hidden', backgroundColor: strong ? t.strong : t.fill }}>
        {/* brillo interno pegado al borde (efecto lente) */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radius - 0.5, borderWidth: 2.5, borderColor: t.rim }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 2.5, left: 2.5, right: 2.5, bottom: 2.5,
          borderRadius: Math.max(0, radius - 3), borderWidth: 3, borderColor: t.rim2 }} />
        {/* reflejo diagonal */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.sheen, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
          locations={[0, 0.35, 0.7]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.75, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
        {/* sombra interna blanca arriba (+2) */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.hi, 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6 }}
        />
        {/* sombra interna negra abajo (-2) */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', t.lo]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6 }}
        />
        <View style={[{ flexGrow: 1 }, inner]}>{children}</View>
      </View>
    </View>
  );
}

/* Botón redondo de cristal */
function Ico({ name, set, size = 20, color }) {
  const C = set === 'mci' ? MaterialCommunityIcons : Feather;
  return <C name={name} size={size} color={color} />;
}

function IconBtn({ name, set, onPress, s, t, dim }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
      <Glass t={t} radius={22} style={{ width: 44, height: 44 }} inner={s.center}>
        <View style={dim ? { opacity: 0.4 } : null}>
          <Ico name={name} set={set} size={20} color={t.text} />
        </View>
      </Glass>
    </TouchableOpacity>
  );
}

/* Hoja de opciones que sale desde abajo */
function Sheet({ visible, onClose, title, s, t, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[s.newScrim, { backgroundColor: t.scrim }]} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <Glass t={t} strong radius={26} inner={{ paddingVertical: 10 }}>
            {title ? <Text style={s.sheetTitle}>{title}</Text> : null}
            <ScrollView style={{ maxHeight: 420 }}>{children}</ScrollView>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ icon, iconColor, label, right, onPress, s, t, danger }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={s.row}>
      {icon ? <Feather name={icon} size={19} color={iconColor || (danger ? '#e53935' : t.text)} style={{ marginRight: 14 }} /> : null}
      <Text style={[s.rowText, danger && { color: '#e53935' }]} numberOfLines={1}>{label}</Text>
      {right}
    </TouchableOpacity>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
export default function App() {
  const [notes, setNotes] = useState([]);
  const [layout, setLayout] = useState('grid');   // 'grid' o 'list'
  const [dark, setDark] = useState(true);
  const [translucent, setTranslucent] = useState(false);  // ver la pantalla de inicio detrás
  const [lang, setLang] = useState('auto');                // 'auto' = idioma del teléfono
  const [langOpen, setLangOpen] = useState(false);
  const [langGroup, setLangGroup] = useState(null);       // idioma desplegado en la lista
  const langCode = lang === 'auto' ? detectLang() : lang;
  applyLang(langCode);
  const [view, setView] = useState('all');        // 'all', 'fav', 'trash'
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchFocus = useRef(false);   // el teclado solo se abre al tocar la lupa
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [wallpaper, setWallpaper] = useState(null);   // tu imagen de fondo
  const [wallBlur, setWallBlur] = useState(8);        // desenfoque del fondo
  const [newOpen, setNewOpen] = useState(false);      // catálogo de nota nueva
  const [selected, setSelected] = useState({});       // notas seleccionadas (mantener presionado)
  const [wallOpen, setWallOpen] = useState(false);    // ventana de fondo de pantalla
  const [wallFor, setWallFor] = useState(null);       // null = menú principal; id = una nota
  const [noteWall, setNoteWall] = useState(null);     // fondo propio de la nota abierta
  const [titleColorOpen, setTitleColorOpen] = useState(false);
  const [folders, setFolders] = useState([]);          // [{ id, name, color }]
  const [sortBy, setSortBy] = useState('updated');     // 'updated' | 'created' | 'alpha'
  const [pinHash, setPinHash] = useState(null);        // huella del PIN
  const [unlocked, setUnlocked] = useState({});        // notas abiertas con PIN en esta sesión
  const [folderEdit, setFolderEdit] = useState(null);  // ventana crear/editar carpeta
  const [moveOpen, setMoveOpen] = useState(false);     // mover nota a carpeta
  const [sortOpen, setSortOpen] = useState(false);     // elegir orden
  const [optsOpen, setOptsOpen] = useState(false);     // opciones de la nota (⋯)
  const [pinPad, setPinPad] = useState(null);          // teclado del PIN
  const [pinEntry, setPinEntry] = useState('');
  const pinOkRef = useRef(null);
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
  const [histOpen, setHistOpen] = useState(false);     // ventana del historial
  const [histList, setHistList] = useState([]);        // versiones de la nota abierta
  const [histView, setHistView] = useState(null);      // versión que se está mirando
  const [editorRev, setEditorRev] = useState(0);       // para recargar el editor al restaurar
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const openedRef = useRef(null);                      // cómo estaba la nota al abrirla
  const recCache = useRef({});                         // registro de cada nota (en memoria)
  const recTimers = useRef({});
  const [recEntries, setRecEntries] = useState([]);    // registro que se está mirando
  const toastTimer = useRef(null);
  const iframeRef = useRef(null);
  const webRef = useRef(null);

  const { width } = useWindowDimensions();
  const c = dark ? THEMES.dark : THEMES.light;
  const s = useMemo(() => makeStyles(c), [dark]);

  /* ---------- Cargar notas guardadas ---------- */
  useEffect(() => {
    loadWallpaper().then(w => { if (w) setWallpaper(w); }).catch(() => {});
    loadData()
      .then(data => {
        if (!data) return;
        setNotes(data.notes || []);
        setLayout(data.layout || 'grid');
        setDark(!!data.dark);
        setTranslucent(!!data.translucent);
        if (data.lang) setLang(data.lang);
        if (typeof data.wallBlur === 'number') setWallBlur(data.wallBlur);
        setFolders(data.folders || []);
        if (data.sortBy) setSortBy(data.sortBy);
        if (data.pinHash) setPinHash(data.pinHash);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  /* ---------- Guardado automático ---------- */
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveData({ notes, layout, dark, translucent, lang, wallBlur, folders, sortBy, pinHash }).catch(() => showToast(tr('saveFail')));
    }, 500);
    return () => clearTimeout(t);
  }, [notes, layout, dark, translucent, lang, wallBlur, folders, sortBy, pinHash, loaded]);

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1800);
  }

  /* ---------- Acciones con notas ---------- */
  const current = notes.find(n => n.id === currentId);

  function newNote(kind = 'text') {
    const now = Date.now();
    const n = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      title: '', content: '', html: true, created: now, updated: now,
      fav: false, pinned: false, deleted: false, kind,
      ink: kind === 'draw' ? [] : undefined,
      folderId: view.startsWith('f:') ? view.slice(2) : undefined,
    };
    setNewOpen(false);
    setNotes(ns => [...ns, n]);
    setCurrentId(n.id);
    // Nota con dibujo: primero elegir un fondo (se puede omitir con "Listo")
    if (kind === 'draw') setTimeout(() => openWall(n.id), 350);
  }

  // Cambia algo de una nota. "touch" = actualizar la fecha de modificación
  function patch(id, changes, touch = true) {
    setNotes(ns => ns.map(n =>
      n.id === id ? { ...n, ...changes, ...(touch ? { updated: Date.now() } : {}) } : n));
  }

  function isEmpty(n) {
    return !n.title.trim() && !toPlain(n).trim() && !firstImg(n) && !n.hasWall && !(n.ink && n.ink.length);
  }

  function closeEditor() {
    const id = currentId;
    const finish = () => {
      // Si la nota quedó vacía, se descarta
      setNotes(ns => ns.filter(n => !(n.id === id && isEmpty(n))));
      setCurrentId(cur => (cur === id ? null : cur));
      setCropOpen(false);
      setTitleColorOpen(false);
      setOptsOpen(false);
      setUnlocked(u => { const c2 = { ...u }; delete c2[id]; return c2; });   // se vuelve a bloquear
      setHistOpen(false); setHistView(null);
      setTimeout(() => { updateRecord(notesRef.current.find(x => x.id === id)); flushRecord(id); }, 400);
    };
    // Primero se guarda lo último que escribiste en el editor
    if (Platform.OS === 'web') {
      try {
        const r = iframeRef.current && iframeRef.current.contentWindow.getHtml();
        if (r) patch(id, { content: r.html, html: true, title: r.title, titleHtml: r.titleHtml, ...(r.ink ? { ink: r.ink } : {}) });
      } catch (e) {}
      finish();
    } else if (webRef.current) {
      webRef.current.injectJavaScript('window.flushNow && window.flushNow(); true;');
      setTimeout(finish, 150);
    } else {
      finish();
    }
  }

  /* ---------- Deshacer / Rehacer (los hace el editor) ---------- */
  function callEditor(fn) {
    if (Platform.OS === 'web') {
      try { const w = iframeRef.current && iframeRef.current.contentWindow; if (w && w[fn]) w[fn](); } catch (e) {}
    } else if (webRef.current) {
      webRef.current.injectJavaScript(`window.${fn} && window.${fn}(); true;`);
    }
  }

  /* Guarda lo último que escribiste y luego hace "after" */
  function flushEditor(after) {
    if (Platform.OS === 'web') {
      try {
        const r = iframeRef.current && iframeRef.current.contentWindow.getHtml();
        if (r && currentId) patch(currentId, { content: r.html, html: true, title: r.title, titleHtml: r.titleHtml, ...(r.ink ? { ink: r.ink } : {}) });
      } catch (e) {}
      setTimeout(after, 50);
    } else {
      callEditor('flushNow');
      setTimeout(after, 250);
    }
  }

  /* ---------- Historial de versiones ---------- */
  async function addVersion(id, v) {
    const list = await loadHistory(id);
    if (sameVersion(list[0], v)) return list;            // ya está guardada igual
    const next = [v, ...list].slice(0, MAX_VERSIONS);
    try { await saveHistory(id, next); } catch (e) { showToast(tr('histSaveFail')); }
    return next;
  }
  /* ---------- Registro (todo lo que se escribe, nunca lo borrado) ---------- */
  function updateRecord(n) {
    if (!n) return;
    const cache = recCache.current;
    if (!cache[n.id]) return;                            // todavía cargando
    const next = mergeRecord(cache[n.id].e, noteTokens(n));
    if (!next) return;
    cache[n.id] = { e: next, at: Date.now() };
    clearTimeout(recTimers.current[n.id]);
    recTimers.current[n.id] = setTimeout(() => {
      delete recTimers.current[n.id];
      saveRecord(n.id, cache[n.id]).catch(() => {});
    }, 1500);
  }
  function flushRecord(id) {
    if (!recTimers.current[id]) return;
    clearTimeout(recTimers.current[id]);
    delete recTimers.current[id];
    if (recCache.current[id]) saveRecord(id, recCache.current[id]).catch(() => {});
  }
  function openRecord() {
    const r = recCache.current[current.id];
    setRecEntries(r ? r.e : []);
    setHistView({ rec: true });
  }
  function recordToHtml(entries) {
    const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const title = (current.title || '').trim();
    return entries.filter(e => e !== title).map(e => (e[0] === REC_IMG
      ? `<div class="imgwrap" contenteditable="false" data-scale="100" style="width:40%"><img src="${e.slice(1)}"></div>`
      : `<div>${esc(e)}</div>`)).join('');
  }
  function restoreRecord() {
    const id = current.id;
    confirmAsk(tr('recRestoreTitle'),
      tr('recRestoreMsg'), tr('restore'), () => {
        flushEditor(() => {
          patch(id, { content: recordToHtml(recEntries), html: true });
          setHistOpen(false); setHistView(null);
          setEditorRev(r => r + 1);
          showToast(tr('recRestored'));
        });
      });
  }
  function clearRecord() {
    const id = current.id;
    confirmAsk(tr('recClearTitle'), tr('recClearMsg'), tr('emptyIt'), () => {
      const n = notesRef.current.find(x => x.id === id);
      recCache.current[id] = { e: n ? noteTokens(n) : [], at: Date.now() };
      saveRecord(id, recCache.current[id]).catch(() => {});
      setRecEntries(recCache.current[id].e);
      showToast(tr('recCleared'));
    });
  }
  function openHistory() {
    const id = current.id;
    const show = () => {
      flushEditor(async () => {
        updateRecord(notesRef.current.find(x => x.id === id));
        setHistView(null);
        setHistList(await loadHistory(id));
        setHistOpen(true);
      });
    };
    if (current.histLocked) askPin('unlock', tr('histProtected'), show);
    else show();
  }
  function saveVersionNow() {
    const id = current.id;
    flushEditor(async () => {
      const n = notesRef.current.find(x => x.id === id);
      if (!n) return;
      const list = await loadHistory(id);
      if (sameVersion(list[0], versionOf(n))) { showToast(tr('versionExists')); return; }
      setHistList(await addVersion(id, versionOf(n)));
      showToast(tr('versionSaved'));
    });
  }
  function restoreVersion(v) {
    const id = current.id;
    confirmAsk(tr('versionRestoreTitle'), tr('versionRestoreMsg'), tr('restore'), () => {
      flushEditor(() => {
        updateRecord(notesRef.current.find(x => x.id === id));
        patch(id, { title: v.title, titleHtml: v.titleHtml, content: v.content, html: v.html, ...(v.ink ? { ink: v.ink } : {}) });
        setHistOpen(false); setHistView(null);
        setEditorRev(r => r + 1);                          // recargar el editor con la versión
        showToast(tr('versionRestored'));
      });
    });
  }
  function deleteVersion(v) {
    const id = current.id;
    confirmAsk(tr('versionDelTitle'), tr('versionDelMsg'), tr('del'), async () => {
      const next = (await loadHistory(id)).filter(x => x.at !== v.at);
      await saveHistory(id, next);
      setHistList(next); setHistView(null);
    });
  }
  function toggleHistLock() {
    const id = current.id;
    if (current.histLocked) {
      askPin('unlock', tr('pinToUnprotect'), () => {
        patch(id, { histLocked: false }, false); showToast(tr('histNoPin'));
      });
      return;
    }
    const lockIt = () => { patch(id, { histLocked: true }, false); showToast(tr('histWithPin')); };
    if (!pinHash) askPin('set1', tr('pinCreate'), lockIt);
    else lockIt();
  }

  function toggleFav() {
    patch(current.id, { fav: !current.fav }, false);
    showToast(current.fav ? tr('favRemoved') : tr('favAdded'));
  }

  function togglePin() {
    patch(current.id, { pinned: !current.pinned }, false);
    showToast(current.pinned ? tr('unpinned') : tr('pinnedTop'));
  }

  function moveToTrash() {
    if (isEmpty(current)) { closeEditor(); return; }
    patch(current.id, { deleted: true }, false);
    setCurrentId(null);
    showToast(tr('movedTrash'));
  }

  function restore() {
    patch(current.id, { deleted: false }, false);
    setCurrentId(null);
    showToast(tr('noteRestored'));
  }

  /* Borra los archivos aparte de una nota (fondo, historial y registro) */
  function purgeFiles(id) {
    saveWallpaper(null, id).catch(() => {});
    saveHistory(id, []).catch(() => {});
    saveRecord(id, null).catch(() => {});
    delete recCache.current[id];
  }

  /* ---------- Selección (mantener presionada una nota) ---------- */
  const selIds = Object.keys(selected);
  const selMode = selIds.length > 0;
  function toggleSelect(id) {
    setSelected(sl => { const n2 = { ...sl }; if (n2[id]) delete n2[id]; else n2[id] = true; return n2; });
  }
  function clearSelection() { setSelected({}); }
  function selectAll() {
    const all = {}; visible.forEach(n => { all[n.id] = true; });
    setSelected(selIds.length === visible.length ? {} : all);
  }
  async function shareSelected() {
    const list = notes.filter(n => selected[n.id]);
    const text = list.map(n => {
      const t = (n.title || '').trim() || tr('untitled');
      return n.locked ? `${t}\n(${tr('lockedNote')})` : `${t}\n${toPlain(n)}`.trim();
    }).join('\n\n────────\n\n');
    try {
      await Share.share({ message: text, title: list.length === 1 ? (list[0].title || tr('note')) : tr('myNotes') });
      clearSelection();
    } catch (e) {
      showToast(tr('shareFail'));
    }
  }
  function trashSelected() {
    const ids = selIds;
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: true, pinned: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? tr('movedTrash') : tr('nMovedTrash', { n: ids.length }));
  }
  function restoreSelected() {
    const ids = selIds;
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? tr('noteRecovered') : tr('nRecovered', { n: ids.length }));
  }
  function destroySelected() {
    const ids = selIds;
    confirmAsk(tr('delForeverTitle'),
      ids.length === 1 ? tr('delOneMsg') : tr('delManyMsg', { n: ids.length }),
      tr('remove'), () => {
        setNotes(ns => ns.filter(n => !ids.includes(n.id)));
        ids.forEach(purgeFiles);
        clearSelection();
        showToast(ids.length === 1 ? tr('noteDeleted') : tr('nDeleted', { n: ids.length }));
      });
  }
  function restoreAllTrash() {
    const n = notes.filter(x => x.deleted).length;
    if (!n) return;
    setNotes(ns => ns.map(x => (x.deleted ? { ...x, deleted: false } : x)));
    showToast(n === 1 ? tr('noteRecovered') : tr('nRecovered', { n }));
  }
  function emptyTrash() {
    const ids = notes.filter(x => x.deleted).map(x => x.id);
    if (!ids.length) return;
    confirmAsk(tr('emptyTrash'),
      ids.length === 1 ? tr('emptyTrashMsg1') : tr('emptyTrashMsg', { n: ids.length }), tr('emptyIt'), () => {
        setNotes(ns => ns.filter(x => !x.deleted));
        ids.forEach(purgeFiles);
        clearSelection();
        showToast(tr('trashEmptied'));
      });
  }

  function destroy() {
    const id = current.id;
    confirmAsk(tr('deleteNote'), tr('delOneMsg'), tr('remove'), () => {
      setNotes(ns => ns.filter(n => n.id !== id));
      purgeFiles(id);
      setCurrentId(null);
      showToast(tr('noteDeleted'));
    });
  }

  async function pickWallpaper() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,      // te deja recortar la imagen al tamaño de la pantalla
        aspect: [9, 16],
        quality: 0.5,
        base64: true,
      });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      const data = a.base64 ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` : a.uri;
      if (wallFor) {
        await saveWallpaper(data, wallFor);
        setNoteWall(data);
        patch(wallFor, { hasWall: true }, false);
        showToast(tr('bgNoteApplied'));
      } else {
        await saveWallpaper(data);
        setWallpaper(data);
        showToast(tr('bgApplied'));
      }
    } catch (e) {
      showToast(tr('imageFail'));
    }
  }

  async function removeWallpaper() {
    if (wallFor) {
      await saveWallpaper(null, wallFor).catch(() => {});
      setNoteWall(null);
      patch(wallFor, { hasWall: false }, false);
      showToast(tr('bgNoteRemoved'));
    } else {
      await saveWallpaper(null).catch(() => {});
      setWallpaper(null);
      showToast(tr('bgRestored'));
    }
  }

  function openWall(target) { setWallFor(target || null); setWallOpen(true); }
  function toggleTranslucent() {
    const on = !translucent;
    setTranslucent(on);
    if (on && !CAN_SEE) showToast(tr('seeLater'));
    else showToast(on ? tr('seeOn') : tr('seeOff'));
  }

  // Al abrir una nota: recordar cómo estaba (para el historial) y reiniciar deshacer
  useEffect(() => {
    const n = notesRef.current.find(x => x.id === currentId);
    openedRef.current = n ? { id: n.id, v: versionOf(n) } : null;
    setUndoState({ canUndo: false, canRedo: false });
    if (n && !recCache.current[n.id]) {
      const id = n.id;
      loadRecord(id).then(r => {
        if (recCache.current[id]) return;
        recCache.current[id] = r && r.e ? r : { e: [], at: 0 };
        updateRecord(notesRef.current.find(x => x.id === id));
      });
    }
  }, [currentId]);

  // Si sales de la app con una nota abierta, se guarda el registro
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active' || !currentId) return;
      const id = currentId;
      flushEditor(() => { updateRecord(notesRef.current.find(x => x.id === id)); flushRecord(id); });
    });
    return () => sub.remove();
  }, [currentId]);

  // Al abrir una nota, cargar su fondo propio (si tiene)
  useEffect(() => {
    setNoteWall(null);
    const n = notes.find(x => x.id === currentId);
    if (!n || !n.hasWall) return;
    let alive = true;
    loadWallpaper(n.id).then(w => { if (alive) setNoteWall(w); }).catch(() => {});
    return () => { alive = false; };
  }, [currentId]);

  /* ---------- Carpetas ---------- */
  function openFolderEdit(f, assignTo) {
    setMenuOpen(false); setMoveOpen(false);
    setFolderEdit(f ? { ...f } : { name: '', color: FOLDER_COLORS[5], assignTo });
  }
  function saveFolder() {
    const name = (folderEdit.name || '').trim();
    if (!name) { showToast(tr('folderNameNeeded')); return; }
    if (folderEdit.id) {
      setFolders(fs => fs.map(f => (f.id === folderEdit.id ? { ...f, name, color: folderEdit.color } : f)));
      showToast(tr('folderUpdated'));
    } else {
      const f = { id: 'f' + Date.now().toString(36), name, color: folderEdit.color };
      setFolders(fs => [...fs, f]);
      if (folderEdit.assignTo) { patch(folderEdit.assignTo, { folderId: f.id }, false); showToast(tr('movedTo', { name })); }
      else showToast(tr('folderCreated'));
    }
    setFolderEdit(null);
  }
  function deleteFolder(f) {
    confirmAsk(tr('deleteFolder'), tr('deleteFolderMsg', { name: f.name, all: tr('all') }), tr('remove'), () => {
      setFolders(fs => fs.filter(x => x.id !== f.id));
      setNotes(ns => ns.map(n => (n.folderId === f.id ? { ...n, folderId: undefined } : n)));
      if (view === 'f:' + f.id) setView('all');
      setFolderEdit(null);
      showToast(tr('folderDeleted'));
    });
  }
  function moveTo(folderId) {
    patch(current.id, { folderId: folderId || undefined }, false);
    setMoveOpen(false);
    const f = folders.find(x => x.id === folderId);
    showToast(f ? tr('movedTo', { name: f.name }) : tr('removedFromFolder'));
  }

  /* ---------- PIN ---------- */
  function askPin(mode, title, onOk) {
    pinOkRef.current = onOk;
    setPinEntry('');
    setPinPad({ mode, title });
  }
  function pressPin(d) {
    if (d === 'del') { setPinEntry(p => p.slice(0, -1)); return; }
    const next = (pinEntry + d).slice(0, 4);
    setPinEntry(next);
    if (next.length < 4) return;
    setTimeout(() => {
      const pad = pinPad;
      if (!pad) return;
      if (pad.mode === 'unlock') {
        if (hashPin(next) === pinHash) { setPinPad(null); setPinEntry(''); pinOkRef.current && pinOkRef.current(); }
        else { setPinEntry(''); showToast(tr('pinWrong')); }
      } else if (pad.mode === 'set1') {
        setPinPad({ mode: 'set2', title: tr('pinConfirm'), first: next });
        setPinEntry('');
      } else if (pad.mode === 'set2') {
        if (next === pad.first) {
          setPinHash(hashPin(next)); setPinPad(null); setPinEntry('');
          pinOkRef.current && pinOkRef.current();
        } else {
          setPinPad({ mode: 'set1', title: tr('pinMismatch') });
          setPinEntry('');
        }
      }
    }, 120);
  }
  function toggleLock() {
    setOptsOpen(false);
    const id = current.id;
    if (current.locked) {
      askPin('unlock', tr('pinToUnlock'), () => {
        patch(id, { locked: false }, false); showToast(tr('lockRemoved'));
      });
      return;
    }
    const lockIt = () => {
      patch(id, { locked: true }, false);
      setUnlocked(u => ({ ...u, [id]: true }));      // sigue abierta hasta que salgas
      showToast(tr('noteLockedPin'));
    };
    if (!pinHash) askPin('set1', tr('pinCreate'), lockIt);
    else lockIt();
  }
  function changePin() {
    setMenuOpen(false);
    if (!pinHash) { askPin('set1', tr('pinCreate'), () => showToast(tr('pinCreated'))); return; }
    askPin('unlock', tr('pinCurrent'), () => {
      setTimeout(() => askPin('set1', tr('pinNew'), () => showToast(tr('pinChanged'))), 200);
    });
  }
  function openNote(n) {
    if (n.locked && !unlocked[n.id]) {
      askPin('unlock', tr('lockedNote'), () => {
        setUnlocked(u => ({ ...u, [n.id]: true }));
        setCurrentId(n.id);
      });
      return;
    }
    setCurrentId(n.id);
  }

  function toggleSearch() {
    if (searchOpen) setQuery('');
    else searchFocus.current = true;
    setSearchOpen(!searchOpen);
  }

  /* ---------- Mensajes que llegan desde el editor ---------- */
  function onEditorMessage(data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'change' && m.id) {
        patch(m.id, { content: m.html, html: true, title: m.title || '', titleHtml: m.titleHtml || '', ...(m.ink ? { ink: m.ink } : {}) });
        const base = notesRef.current.find(x => x.id === m.id) || {};
        updateRecord({ ...base, id: m.id, title: m.title || '', content: m.html, html: true });
      }
      if (m.type === 'crop') setCropOpen(!!m.open);
      if (m.type === 'undo') setUndoState({ canUndo: !!m.canUndo, canRedo: !!m.canRedo });
    } catch (e) {}
  }

  // En la vista previa de Replit (web) el editor avisa por "postMessage"
  useEffect(() => {
    if (Platform.OS !== 'web' || !currentId) return;
    const handler = e => {
      if (iframeRef.current && e.source === iframeRef.current.contentWindow) onEditorMessage(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentId]);

  // El editor se arma una sola vez al abrir la nota
  const editorHtml = useMemo(() => {
    if (!current) return '';
    return buildEditorHtml({
      id: current.id, content: toHtml(current), titleHtml: toTitleHtml(current),
      updated: current.updated, editable: !current.deleted, c,
      kind: current.kind, ink: current.ink, tr, locale: LOCALE,
    });
  }, [currentId, dark, langCode, current && current.deleted, editorRev]);

  /* ---------- Botón "atrás" de Android ---------- */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cropOpen && webRef.current) {
        webRef.current.injectJavaScript('window.closeCrop && window.closeCrop(); true;');
        return true;
      }
      if (pinPad) { setPinPad(null); return true; }
      if (selMode && !currentId) { clearSelection(); return true; }
      if (histView) { setHistView(null); return true; }
      if (histOpen) { setHistOpen(false); return true; }
      if (folderEdit) { setFolderEdit(null); return true; }
      if (moveOpen) { setMoveOpen(false); return true; }
      if (optsOpen) { setOptsOpen(false); return true; }
      if (sortOpen) { setSortOpen(false); return true; }
      if (wallOpen) { setWallOpen(false); return true; }
      if (newOpen) { setNewOpen(false); return true; }
      if (currentId) { closeEditor(); return true; }
      if (menuOpen) { setMenuOpen(false); return true; }
      if (searchOpen) { setSearchOpen(false); setQuery(''); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentId, menuOpen, searchOpen, cropOpen, wallOpen, newOpen, pinPad, folderEdit, moveOpen, optsOpen, sortOpen, histOpen, histView, selMode]);

  /* ---------- Notas que se muestran ---------- */
  useEffect(() => { setSelected({}); }, [view]);

  const viewFolder = view.startsWith('f:') ? folders.find(f => f.id === view.slice(2)) : null;
  const viewTag = view.startsWith('t:') ? view.slice(2) : null;
  const viewTitle = viewFolder ? viewFolder.name : viewTag ? '#' + viewTag : tr(TITLE_KEYS.includes(view) ? view : 'all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byOrder = (a, b) => {
      if (sortBy === 'created') return (b.created || 0) - (a.created || 0);
      if (sortBy === 'alpha') {
        const ta = (a.title || '').trim(), tb = (b.title || '').trim();
        if (!ta !== !tb) return ta ? -1 : 1;           // las "Sin título" al final
        return ta.localeCompare(tb, 'es', { sensitivity: 'base' });
      }
      return b.updated - a.updated;
    };
    return notes
      .filter(n => {
        if (view === 'trash') return n.deleted;
        if (n.deleted) return false;
        if (view === 'fav') return n.fav;
        if (view.startsWith('f:')) return n.folderId === view.slice(2);
        if (view.startsWith('t:')) return tagsOf(n).includes(view.slice(2));
        return true;
      })
      .filter(n => !q || ((n.title || '') + ' ' + (n.locked ? '' : toPlain(n))).toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || byOrder(a, b));
  }, [notes, view, query, sortBy]);

  const live = notes.filter(n => !n.deleted);
  const counts = {
    all: live.length,
    fav: live.filter(n => n.fav).length,
    trash: notes.length - live.length,
  };
  const folderCount = id => live.filter(n => n.folderId === id).length;
  const allTags = useMemo(() => {
    const m = {};
    notes.forEach(n => { if (!n.deleted) tagsOf(n).forEach(t => { m[t] = (m[t] || 0) + 1; }); });
    return Object.keys(m).sort().map(t => [t, m[t]]);
  }, [notes]);

  const toast = toastMsg ? (
    <View style={s.toastWrap} pointerEvents="none">
      <Glass t={c} strong radius={20}><Text style={s.toastText}>{toastMsg}</Text></Glass>
    </View>
  ) : null;

  /* ---------- Ventana: fondo de pantalla (menú o nota) ---------- */
  const wallNote = wallFor ? notes.find(n => n.id === wallFor) : null;
  const wallData = wallFor ? noteWall : wallpaper;
  const wallBlurNow = wallFor ? ((wallNote && wallNote.wallBlur) ?? 8) : wallBlur;
  const wallModal = (
    <Modal visible={wallOpen} transparent animationType="fade" onRequestClose={() => setWallOpen(false)}>
      <Pressable style={[s.wallScrim, { backgroundColor: c.scrim }]} onPress={() => setWallOpen(false)}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420 }}>
          <Glass t={c} strong radius={28} inner={{ padding: 20 }}>
            <Text style={s.wallTitle}>{wallFor ? tr('bgThisNote') : tr('wallpaper')}</Text>
            <Text style={s.wallHint}>{wallFor ? tr('bgNoteHint') : tr('bgMainHint')}</Text>

            <View style={s.wallPreview}>
              <Background t={c} wall={wallData} blur={wallBlurNow} />
              <Text style={[s.wallPreviewText, { color: c.text }]}>{tr('preview')}</Text>
            </View>

            {!wallFor && (
              <TouchableOpacity onPress={toggleTranslucent} style={[s.row, { paddingHorizontal: 4, marginBottom: 12 }]} activeOpacity={0.7}>
                <Feather name="smartphone" size={18} color={c.text} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowText}>{tr('translucent')}</Text>
                  <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('translucentHint')}</Text>
                </View>
                <View style={[s.toggle, { borderColor: c.text }, translucent && { backgroundColor: c.text }]}>
                  <View style={[s.toggleKnob, { backgroundColor: translucent ? c.inv : c.text }, translucent && { alignSelf: 'flex-end' }]} />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={pickWallpaper} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
              <Feather name="image" size={18} color={c.inv} />
              <Text style={[s.wallBtnText, { color: c.inv }]}>{tr('pickGallery')}</Text>
            </TouchableOpacity>

            {wallData && (
              <>
                <Text style={s.wallLabel}>{tr('blur')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[[tr('blurNone'), -1], [tr('blurLow'), 0], [tr('blurSoft'), 8], [tr('blurStrong'), 20]].map(([label, v]) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => (wallFor ? patch(wallFor, { wallBlur: v }, false) : setWallBlur(v))}
                      style={[s.blurChip, { borderColor: c.border }, wallBlurNow === v && { backgroundColor: c.text, borderColor: c.text }]}
                    >
                      <Text style={{ color: wallBlurNow === v ? c.inv : c.text, fontSize: 15 }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={removeWallpaper} activeOpacity={0.7} style={s.wallRemove}>
                  <Feather name="x" size={16} color={c.muted} />
                  <Text style={{ color: c.muted, fontSize: 15, marginLeft: 6 }}>{wallFor ? tr('removeNoteBg') : tr('removeMyBg')}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setWallOpen(false)} style={{ alignSelf: 'center', padding: 10, marginTop: 6 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{tr('done')}</Text>
            </TouchableOpacity>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );

  /* ---------- Ventana: crear / editar carpeta ---------- */
  const folderModal = (
    <Modal visible={!!folderEdit} transparent animationType="fade" onRequestClose={() => setFolderEdit(null)}>
      <Pressable style={[s.wallScrim, { backgroundColor: c.scrim }]} onPress={() => setFolderEdit(null)}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420 }}>
          {folderEdit && (
            <Glass t={c} strong radius={28} inner={{ padding: 20 }}>
              <Text style={s.wallTitle}>{folderEdit.id ? tr('editFolder') : tr('newFolder')}</Text>
              <View style={[s.folderInputWrap, { borderColor: c.border }]}>
                <Feather name="folder" size={20} color={folderEdit.color} />
                <TextInput
                  style={s.folderInput}
                  value={folderEdit.name}
                  onChangeText={tx => setFolderEdit(f => ({ ...f, name: tx }))}
                  placeholder={tr('folderName')}
                  placeholderTextColor={c.muted}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <Text style={s.wallLabel}>{tr('color')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {FOLDER_COLORS.map(col => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setFolderEdit(f => ({ ...f, color: col }))}
                    style={[s.swatch, { backgroundColor: col }, folderEdit.color === col && { borderColor: c.text, borderWidth: 3 }]}
                  />
                ))}
              </View>
              <TouchableOpacity onPress={saveFolder} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text, marginTop: 20 }]}>
                <Text style={[s.wallBtnText, { color: c.inv }]}>{tr('save')}</Text>
              </TouchableOpacity>
              {folderEdit.id && (
                <TouchableOpacity onPress={() => deleteFolder(folderEdit)} style={s.wallRemove}>
                  <Feather name="trash-2" size={16} color="#e53935" />
                  <Text style={{ color: '#e53935', fontSize: 15, marginLeft: 6 }}>{tr('deleteFolder')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFolderEdit(null)} style={{ alignSelf: 'center', padding: 10, marginTop: 4 }}>
                <Text style={{ color: c.muted, fontSize: 16 }}>{tr('cancel')}</Text>
              </TouchableOpacity>
            </Glass>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  /* ---------- Teclado del PIN ---------- */
  const pinModal = (
    <Modal visible={!!pinPad} transparent animationType="fade" onRequestClose={() => setPinPad(null)}>
      <View style={[s.wallScrim, { backgroundColor: c.scrim }]}>
        {pinPad && (
          <Glass t={c} strong radius={30} style={{ width: '100%', maxWidth: 340 }} inner={{ padding: 22, alignItems: 'center' }}>
            <Feather name="lock" size={28} color={c.text} />
            <Text style={[s.wallTitle, { textAlign: 'center', marginTop: 10 }]}>{pinPad.title}</Text>
            {(pinPad.mode === 'set1') && (
              <Text style={[s.wallHint, { textAlign: 'center' }]}>{tr('pinKeepSafe')}</Text>
            )}
            <View style={s.pinDots}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[s.pinDot, { borderColor: c.text }, i < pinEntry.length && { backgroundColor: c.text }]} />
              ))}
            </View>
            <View style={s.pinGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => (
                k === '' ? <View key={i} style={s.pinKey} /> : (
                  <TouchableOpacity key={i} onPress={() => pressPin(k)} activeOpacity={0.6} style={s.pinKey}>
                    <Glass t={c} radius={32} style={{ width: 64, height: 64 }} inner={s.center}>
                      {k === 'del'
                        ? <Feather name="delete" size={22} color={c.text} />
                        : <Text style={s.pinKeyText}>{k}</Text>}
                    </Glass>
                  </TouchableOpacity>
                )
              ))}
            </View>
            <TouchableOpacity onPress={() => setPinPad(null)} style={{ padding: 10, marginTop: 4 }}>
              <Text style={{ color: c.muted, fontSize: 16 }}>{tr('cancel')}</Text>
            </TouchableOpacity>
          </Glass>
        )}
      </View>
    </Modal>
  );

  /* ---------- Elegir orden ---------- */
  const sortSheet = (
    <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title={tr('sortBy')} s={s} t={c}>
      {SORTS.map(([k, icon, label]) => (
        <Row key={k} icon={icon} label={tr(label)} s={s} t={c}
          onPress={() => { setSortBy(k); setSortOpen(false); }}
          right={sortBy === k ? <Feather name="check" size={20} color={c.text} /> : null} />
      ))}
    </Sheet>
  );

  /* ---------- Elegir idioma (con variantes por país que se despliegan) ---------- */
  const langName = langLabel(langCode);
  const pickLang = code => { setLang(code); setLangOpen(false); setLangGroup(null); };
  const check = on => (on ? <Feather name="check" size={20} color={c.text} /> : null);
  const langSheet = (
    <Sheet visible={langOpen} onClose={() => { setLangOpen(false); setLangGroup(null); }} title={tr('language')} s={s} t={c}>
      <Row icon="smartphone" label={tr('langAuto')} s={s} t={c} onPress={() => pickLang('auto')} right={check(lang === 'auto')} />
      {LANG_GROUPS.map(([base, name, vars]) => {
        const mine = lang !== 'auto' && groupOf(lang) === base;
        if (!vars.length) return <Row key={base} label={name} s={s} t={c} onPress={() => pickLang(base)} right={check(lang === base)} />;
        const open = langGroup === base;
        return (
          <View key={base}>
            <Row label={name} s={s} t={c} onPress={() => setLangGroup(open ? null : base)}
              right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {mine && !open ? <Feather name="check" size={18} color={c.text} /> : null}
                <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
              </View>} />
            {open && vars.map(([code, flag, region]) => (
              <TouchableOpacity key={code} onPress={() => pickLang(code)} activeOpacity={0.6} style={[s.row, { paddingLeft: 44 }]}>
                <Text style={[s.rowText, { fontSize: 15 }]} numberOfLines={1}>{flag + '  ' + region}</Text>
                {check(lang === code)}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </Sheet>
  );

  const seeNow = translucent && CAN_SEE;
  if (!loaded) return <View style={s.screen} />;

  /* ============================================================
     PANTALLA DEL EDITOR
     ============================================================ */
  if (current) {
    const inTrash = current.deleted;
    return (
      <View style={[s.screen, seeNow && { backgroundColor: 'transparent' }]}>
        {/* Cada nota usa SOLO su propio fondo; si no tiene, el vidrio por defecto (o translúcido) */}
        <Background t={c} wall={noteWall} blur={current.wallBlur ?? 8} see={seeNow} />
        <StatusBar barStyle={c.bar} backgroundColor="transparent" translucent />
        <View style={s.topbar}>
          <IconBtn name="arrow-left" onPress={closeEditor} s={s} t={c} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            {!inTrash && (
              <Glass t={c} radius={22} inner={s.undoPill}>
                <TouchableOpacity onPress={() => callEditor('undoNow')} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="undo-variant" size={22} color={c.text} style={!undoState.canUndo && { opacity: 0.35 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openHistory} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name={current.histLocked ? 'history' : 'history'} size={22} color={c.text} />
                  {current.histLocked && <Feather name="lock" size={9} color={c.text} style={s.histLockBadge} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => callEditor('redoNow')} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="redo-variant" size={22} color={c.text} style={!undoState.canRedo && { opacity: 0.35 }} />
                </TouchableOpacity>
              </Glass>
            )}
          </View>
          {inTrash ? (
            <>
              <IconBtn name="rotate-ccw" onPress={restore} s={s} t={c} />
              <IconBtn name="x" onPress={destroy} s={s} t={c} />
            </>
          ) : (
            <>
              <IconBtn name="image" onPress={() => openWall(current.id)} s={s} t={c} />
              <IconBtn name="more-vertical" onPress={() => setOptsOpen(true)} s={s} t={c} />
            </>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ paddingHorizontal: 20, paddingTop: inTrash ? 10 : 0 }}>
            {inTrash && (
              <Glass t={c} radius={16} style={{ marginBottom: 12 }} inner={{ padding: 12 }}>
                <Text style={s.bannerText}>{tr('inTrashBanner')}</Text>
              </Glass>
            )}
            {/* El título y la fecha ahora están dentro del editor */}
          </View>

          <View style={{ flex: 1 }}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={iframeRef}
                srcDoc={editorHtml}
                title="editor"
                allowTransparency
                style={{ border: 'none', width: '100%', height: '100%', backgroundColor: 'transparent' }}
              />
            ) : (
              <WebView
                ref={webRef}
                originWhitelist={['*']}
                source={{ html: editorHtml }}
                onMessage={e => onEditorMessage(e.nativeEvent.data)}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                containerStyle={{ backgroundColor: 'transparent' }}
                allowFileAccess
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView
              />
            )}
          </View>
        </KeyboardAvoidingView>
        {wallModal}

        {/* Opciones de la nota */}
        <Sheet visible={optsOpen} onClose={() => setOptsOpen(false)} title={tr('noteOptions')} s={s} t={c}>
          <Row icon="folder" iconColor={(folders.find(f => f.id === current.folderId) || {}).color} s={s} t={c}
            label={tr('folderLabel', { name: (folders.find(f => f.id === current.folderId) || {}).name || tr('none') })}
            onPress={() => { setOptsOpen(false); setMoveOpen(true); }}
            right={<Feather name="chevron-right" size={18} color={c.muted} />} />
          <Row icon={current.locked ? 'unlock' : 'lock'} s={s} t={c}
            label={current.locked ? tr('unlock') : tr('lockPin')} onPress={toggleLock} />
          <TouchableOpacity onPress={() => { setOptsOpen(false); togglePin(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.pinned ? 'pin-off-outline' : 'pin-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text style={s.rowText}>{current.pinned ? tr('unpin') : tr('pinTop')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOptsOpen(false); toggleFav(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.fav ? 'star' : 'star-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text style={s.rowText}>{current.fav ? tr('favRemove') : tr('favAdd')}</Text>
          </TouchableOpacity>
          <Row icon="trash-2" label={tr('moveTrash')} danger s={s} t={c} onPress={() => { setOptsOpen(false); moveToTrash(); }} />
        </Sheet>

        {/* Mover a carpeta */}
        <Sheet visible={moveOpen} onClose={() => setMoveOpen(false)} title={tr('moveToFolder')} s={s} t={c}>
          <Row icon="inbox" label={tr('noFolder')} s={s} t={c} onPress={() => moveTo(null)}
            right={!current.folderId ? <Feather name="check" size={20} color={c.text} /> : null} />
          {folders.map(f => (
            <Row key={f.id} icon="folder" iconColor={f.color} label={f.name} s={s} t={c} onPress={() => moveTo(f.id)}
              right={current.folderId === f.id ? <Feather name="check" size={20} color={c.text} /> : null} />
          ))}
          <Row icon="plus" label={tr('newFolder')} s={s} t={c} onPress={() => openFolderEdit(null, current.id)} />
        </Sheet>

        {/* Historial de versiones */}
        <Modal visible={histOpen} transparent animationType="fade" onRequestClose={() => (histView ? setHistView(null) : setHistOpen(false))}>
          <Pressable style={[s.wallScrim, { backgroundColor: c.scrim }]} onPress={() => setHistOpen(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 440, maxHeight: '88%' }}>
              <Glass t={c} strong radius={28} inner={{ padding: 18 }}>
                {!histView ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="history" size={24} color={c.text} />
                      <Text style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]}>{tr('history')}</Text>
                      <TouchableOpacity onPress={() => setHistOpen(false)} hitSlop={10}>
                        <Feather name="x" size={22} color={c.muted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.wallHint, { marginTop: 6 }]}>
                      {tr('histIntro')}
                    </Text>
                    <TouchableOpacity onPress={openRecord} activeOpacity={0.7}>
                      <Glass t={c} radius={18} style={{ marginBottom: 12 }} inner={s.histRow}>
                        <View style={[s.recIcon, { backgroundColor: c.text }]}>
                          <Feather name="book-open" size={18} color={c.inv} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.recTitle}>{tr('record')}</Text>
                          <Text style={s.histDate}>
                            {tr('recLines', { n: ((recCache.current[current.id] || {}).e || []).length })}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={c.muted} />
                      </Glass>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveVersionNow} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="save" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>{tr('saveVersionNow')}</Text>
                    </TouchableOpacity>
                    <Text style={[s.sideHeaderText, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>{tr('savedVersions')}</Text>
                    <ScrollView style={{ maxHeight: 260 }}>
                      {histList.length === 0 && (
                        <Text style={[s.emptyText, { paddingVertical: 16 }]}>{tr('noVersions', { btn: tr('saveVersionNow') })}</Text>
                      )}
                      {histList.map((v, i) => (
                        <TouchableOpacity key={v.at} onPress={() => setHistView(v)} activeOpacity={0.7}>
                          <Glass t={c} radius={16} style={{ marginBottom: 8 }} inner={s.histRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.histDate}>{fmtDate(v.at)}{i === 0 ? '  · ' + tr('latest') : ''}</Text>
                              <Text style={s.histPrev} numberOfLines={2}>
                                {(v.title ? v.title + ' — ' : '') + (toPlain(v) || (v.ink && v.ink.length ? tr('drawing') : tr('emptyNote')))}
                              </Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={c.muted} />
                          </Glass>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity onPress={toggleHistLock} style={[s.row, { paddingHorizontal: 4, paddingBottom: 4 }]} activeOpacity={0.7}>
                      <Feather name={current.histLocked ? 'lock' : 'unlock'} size={18} color={c.text} style={{ marginRight: 12 }} />
                      <Text style={s.rowText}>{current.histLocked ? tr('histWithPin') : tr('protectHist')}</Text>
                      <View style={[s.toggle, { borderColor: c.text }, current.histLocked && { backgroundColor: c.text }]}>
                        <View style={[s.toggleKnob, { backgroundColor: current.histLocked ? c.inv : c.text },
                          current.histLocked && { alignSelf: 'flex-end' }]} />
                      </View>
                    </TouchableOpacity>
                  </>
                ) : histView.rec ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setHistView(null)} hitSlop={10}>
                        <Feather name="arrow-left" size={22} color={c.text} />
                      </TouchableOpacity>
                      <Text style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]}>{tr('record')}</Text>
                      <TouchableOpacity onPress={clearRecord} hitSlop={10}>
                        <Feather name="trash-2" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.wallHint, { marginTop: 6, marginBottom: 0 }]}>{tr('recIntro')}</Text>
                    <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                      {recEntries.length === 0 && <Text style={[s.emptyText, { paddingVertical: 16 }]}>{tr('recEmpty')}</Text>}
                      {recEntries.map((e, i) => (e[0] === REC_IMG
                        ? <Image key={i} source={{ uri: e.slice(1) }} style={[s.thumb, { height: 120, marginVertical: 4 }]} resizeMode="cover" />
                        : <Text key={i} style={[s.histViewText, { marginBottom: 6 }]}>{e}</Text>))}
                    </ScrollView>
                    <TouchableOpacity onPress={restoreRecord} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>{tr('putAllInNote')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setHistView(null)} hitSlop={10}>
                        <Feather name="arrow-left" size={22} color={c.text} />
                      </TouchableOpacity>
                      <Text style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]} numberOfLines={1}>{fmtDate(histView.at)}</Text>
                      <TouchableOpacity onPress={() => deleteVersion(histView)} hitSlop={10}>
                        <Feather name="trash-2" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 380, marginVertical: 14 }}>
                      {!!histView.title && <Text style={s.histViewTitle}>{histView.title}</Text>}
                      {firstImg(histView) && (
                        <Image source={{ uri: firstImg(histView) }} style={[s.thumb, { height: 140 }]} resizeMode="cover" />
                      )}
                      <Text style={s.histViewText}>{toPlain(histView) || ' '}</Text>
                      {!!(histView.ink && histView.ink.length) && (
                        <Text style={[s.histDate, { marginTop: 8 }]}>{tr('includesStrokes', { n: histView.ink.length })}</Text>
                      )}
                    </ScrollView>
                    <TouchableOpacity onPress={() => restoreVersion(histView)} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>{tr('restoreThisVersion')}</Text>
                    </TouchableOpacity>
                    <Text style={[s.wallHint, { textAlign: 'center', marginTop: 10, marginBottom: 0 }]}>
                      {tr('nowKeptInRec')}
                    </Text>
                  </>
                )}
              </Glass>
            </Pressable>
          </Pressable>
        </Modal>

        {folderModal}
        {pinModal}
        {toast}
      </View>
    );
  }

  /* ============================================================
     PANTALLA PRINCIPAL
     ============================================================ */
  const isGrid = layout === 'grid';
  const cols = width >= 700 ? 3 : 2;
  const cardW = (width - 32 - 12 * (cols - 1)) / cols;

  const emptyMsg = query
    ? ['search', tr('noMatch')]
    : viewFolder ? ['folder', tr('folderEmpty')]
    : viewTag ? ['hash', tr('tagEmpty')]
    : ({ all: ['file-text', tr('noNotes')],
        fav: ['star', tr('noFav')],
        trash: ['trash-2', tr('trashEmpty')] }[view] || ['file-text', '']);

  return (
    <View style={[s.screen, seeNow && { backgroundColor: 'transparent' }]}>
      <Background t={c} wall={seeNow ? null : wallpaper} blur={wallBlur} see={seeNow} />
      <StatusBar barStyle={c.bar} backgroundColor="transparent" translucent />

      {/* Barra superior */}
      {selMode ? (
        <View style={s.topbar}>
          <Glass t={c} radius={24} inner={s.selPill}>
            <TouchableOpacity onPress={clearSelection} hitSlop={10} style={{ paddingHorizontal: 6 }}>
              <Feather name="x" size={22} color={c.text} />
            </TouchableOpacity>
            <Text style={s.selCount}>{selIds.length}</Text>
          </Glass>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
            <Glass t={c} radius={22} inner={s.selAll}>
              <Feather name={selIds.length === visible.length ? 'minus-square' : 'check-square'} size={18} color={c.text} />
              <Text style={s.selAllText}>{selIds.length === visible.length ? tr('none') : tr('selAll')}</Text>
            </Glass>
          </TouchableOpacity>
        </View>
      ) : (
      <View style={s.topbar}>
        <IconBtn name="menu" onPress={() => setMenuOpen(true)} s={s} t={c} />
        <View style={{ flex: 1 }} />
        <IconBtn name="search" onPress={toggleSearch} s={s} t={c} />
        <IconBtn set="mci" name="sort" onPress={() => setSortOpen(true)} s={s} t={c} />
        <IconBtn name={isGrid ? 'list' : 'grid'} onPress={() => setLayout(isGrid ? 'list' : 'grid')} s={s} t={c} />
        <IconBtn name={dark ? 'sun' : 'moon'} onPress={() => setDark(!dark)} s={s} t={c} />
      </View>
      )}

      {/* Lista de notas */}
      <FlatList
        key={layout + cols}
        data={visible}
        keyExtractor={n => n.id}
        numColumns={isGrid ? cols : 1}
        columnWrapperStyle={isGrid ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={s.hero}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {viewFolder && <Feather name="folder" size={26} color={viewFolder.color} style={{ marginRight: 10 }} />}
                <Text style={[s.heroTitle, { flexShrink: 1 }]} numberOfLines={1}>{viewTitle}</Text>
              </View>
              <Text style={s.heroCount}>{tr('nNotes', { n: visible.length })}</Text>
            </View>
            {view === 'trash' && counts.trash > 0 && !selMode && (
              <View style={s.trashBtns}>
                <TouchableOpacity onPress={restoreAllTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="rotate-ccw" size={18} color={c.text} />
                    <Text style={s.trashBtnText}>{tr('recoverAll')}</Text>
                  </Glass>
                </TouchableOpacity>
                <TouchableOpacity onPress={emptyTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="trash-2" size={18} color="#e53935" />
                    <Text style={[s.trashBtnText, { color: '#e53935' }]}>{tr('emptyTrash')}</Text>
                  </Glass>
                </TouchableOpacity>
              </View>
            )}
            {searchOpen && (
              <Glass t={c} radius={24} style={{ marginBottom: 14 }}>
                <TextInput
                  style={s.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={tr('searchPh')}
                  placeholderTextColor={c.muted}
                  autoFocus={searchFocus.current}
                  onFocus={() => { searchFocus.current = false; }}
                />
              </Glass>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={{ marginBottom: 14, opacity: 0.6 }}><Feather name={emptyMsg[0]} size={42} color={c.muted} /></View>
            <Text style={s.emptyText}>{emptyMsg[1]}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const thumb = firstImg(item);
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => (selMode ? toggleSelect(item.id) : openNote(item))}
              onLongPress={() => toggleSelect(item.id)}
              delayLongPress={350}
              style={isGrid ? { width: cardW } : null}
            >
              <Glass t={c} radius={22} style={selected[item.id] && s.cardSel} inner={[s.cardInner, isGrid && { minHeight: 150 }]}>
                {selMode && (
                  <View style={[s.selCheck, { borderColor: c.text }, selected[item.id] && { backgroundColor: c.text }]}>
                    {selected[item.id] && <Feather name="check" size={15} color={c.inv} />}
                  </View>
                )}
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.title ? titleSegments(item).map((g, i) => (
                      <Text key={i} style={{
                        color: g.color || c.text,
                        fontWeight: g.bold === false ? '400' : '700',
                        fontStyle: g.italic ? 'italic' : 'normal',
                        textDecorationLine: g.underline ? 'underline' : 'none',
                        ...(g.outline ? { textShadowColor: g.outline, textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } } : {}),
                      }}>{g.text}</Text>
                    )) : tr('untitled')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {item.pinned && <MaterialCommunityIcons name="pin" size={14} color={c.muted} />}
                    {item.locked && <Feather name="lock" size={13} color={c.muted} />}
                    {!!(item.ink && item.ink.length) && <Feather name="edit-2" size={13} color={c.muted} />}
                    {item.fav && <MaterialCommunityIcons name="star" size={14} color={c.muted} />}
                  </View>
                </View>
                {item.locked ? (
                  <View style={s.lockedBox}>
                    <Feather name="lock" size={22} color={c.muted} />
                    <Text style={[s.preview, { flex: 0, marginTop: 6, marginBottom: 0 }]}>{tr('lockedNote')}</Text>
                  </View>
                ) : (
                  <>
                    {thumb && (
                      <Image source={{ uri: thumb }} style={[s.thumb, !isGrid && { height: 120 }]} resizeMode="cover" />
                    )}
                    <Text style={s.preview} numberOfLines={thumb ? 2 : isGrid ? 4 : 2}>{toPlain(item)}</Text>
                  </>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {(() => {
                    const f = !viewFolder && folders.find(x => x.id === item.folderId);
                    return f ? <View style={[s.folderDot, { backgroundColor: f.color }]} /> : null;
                  })()}
                  <Text style={[s.date, { flexShrink: 1 }]} numberOfLines={1}>{fmtDate(sortBy === 'created' ? (item.created || item.updated) : item.updated)}</Text>
                </View>
              </Glass>
            </TouchableOpacity>
          );
        }}
      />

      {/* Barra de acciones al seleccionar (estilo Google Fotos) */}
      {selMode && (
        <View style={s.selBarWrap} pointerEvents="box-none">
          <Glass t={c} strong radius={28} inner={s.selBar}>
            {view === 'trash' ? (
              <>
                <TouchableOpacity onPress={restoreSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="rotate-ccw" size={24} color={c.text} />
                  <Text style={s.selActionText}>{tr('recover')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={destroySelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color="#e53935" />
                  <Text style={[s.selActionText, { color: '#e53935' }]}>{tr('remove')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={shareSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="share-2" size={24} color={c.text} />
                  <Text style={s.selActionText}>{tr('share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={trashSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color={c.text} />
                  <Text style={s.selActionText}>{tr('trash')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Glass>
        </View>
      )}

      {/* Botón flotante con brillo */}
      {view !== 'trash' && !selMode && (
        <TouchableOpacity style={s.fabWrap} onPress={() => newNote('text')} activeOpacity={0.85}>
          <View style={s.fab}>
            <Feather name="edit-3" size={24} color={c.inv} />
          </View>
        </TouchableOpacity>
      )}

      {/* Menú lateral de cristal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.scrim }}>
          <Glass t={c} strong radius={28} style={s.sidebar}>
           <ScrollView contentContainerStyle={s.sidebarInner}>
            <Text style={s.sideTitle}>{tr('appName')}</Text>
            {[['all', 'file-text'], ['fav', 'star'], ['trash', 'trash-2']].map(([key, icon]) => (
              <TouchableOpacity key={key} onPress={() => { setView(key); setMenuOpen(false); }} activeOpacity={0.7}>
                {view === key ? (
                  <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>
                    <Feather name={icon} size={19} color={c.text} style={s.navIcon} />
                    <Text style={[s.navText, { fontWeight: '700' }]}>{tr(key)}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </Glass>
                ) : (
                  <View style={[s.navItem, { marginBottom: 4 }]}>
                    <Feather name={icon} size={19} color={c.muted} style={s.navIcon} />
                    <Text style={s.navText}>{tr(key)}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <View style={s.sep} />

            {/* Carpetas */}
            <View style={s.sideHeader}>
              <Text style={s.sideHeaderText}>{tr('folders')}</Text>
              <TouchableOpacity onPress={() => openFolderEdit(null)} hitSlop={10}>
                <Feather name="plus" size={20} color={c.text} />
              </TouchableOpacity>
            </View>
            {folders.length === 0 && (
              <TouchableOpacity style={s.navItem} onPress={() => openFolderEdit(null)} activeOpacity={0.7}>
                <Feather name="folder-plus" size={19} color={c.muted} style={s.navIcon} />
                <Text style={[s.navText, { color: c.muted }]}>{tr('createFolder')}</Text>
              </TouchableOpacity>
            )}
            {folders.map(f => {
              const on = view === 'f:' + f.id;
              const body = (
                <>
                  <Feather name="folder" size={19} color={f.color} style={s.navIcon} />
                  <Text style={[s.navText, on && { fontWeight: '700' }]} numberOfLines={1}>{f.name}</Text>
                  <Text style={s.navCount}>{folderCount(f.id)}</Text>
                  <TouchableOpacity onPress={() => openFolderEdit(f)} hitSlop={10} style={{ marginLeft: 10 }}>
                    <Feather name="more-horizontal" size={18} color={c.muted} />
                  </TouchableOpacity>
                </>
              );
              return (
                <TouchableOpacity key={f.id} onPress={() => { setView('f:' + f.id); setMenuOpen(false); }}
                  onLongPress={() => openFolderEdit(f)} activeOpacity={0.7}>
                  {on
                    ? <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>{body}</Glass>
                    : <View style={[s.navItem, { marginBottom: 4 }]}>{body}</View>}
                </TouchableOpacity>
              );
            })}

            {/* Etiquetas */}
            {allTags.length > 0 && (
              <>
                <View style={s.sideHeader}><Text style={s.sideHeaderText}>{tr('tags')}</Text></View>
                {allTags.map(([tg, n]) => {
                  const on = view === 't:' + tg;
                  const body = (
                    <>
                      <Feather name="hash" size={18} color={on ? c.text : c.muted} style={s.navIcon} />
                      <Text style={[s.navText, on && { fontWeight: '700' }]} numberOfLines={1}>{tg}</Text>
                      <Text style={s.navCount}>{n}</Text>
                    </>
                  );
                  return (
                    <TouchableOpacity key={tg} onPress={() => { setView('t:' + tg); setMenuOpen(false); }} activeOpacity={0.7}>
                      {on
                        ? <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>{body}</Glass>
                        : <View style={[s.navItem, { marginBottom: 4 }]}>{body}</View>}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <View style={s.sep} />
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); openWall(null); }}>
              <Feather name="image" size={19} color={c.muted} style={s.navIcon} />
              <Text style={s.navText}>{tr('wallpaper')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={changePin}>
              <Feather name="key" size={19} color={c.muted} style={s.navIcon} />
              <Text style={s.navText}>{pinHash ? tr('changePin') : tr('createLockPin')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); setLangOpen(true); }}>
              <Feather name="globe" size={19} color={c.muted} style={s.navIcon} />
              <Text style={s.navText}>{tr('language')}</Text>
              <Text style={s.navCount} numberOfLines={1}>{langName}</Text>
            </TouchableOpacity>
           </ScrollView>
          </Glass>
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {wallModal}
      {sortSheet}
      {langSheet}
      {folderModal}
      {pinModal}


      {toast}
    </View>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
function makeStyles(c) {
  const top = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.grad[0], paddingTop: top },
    center: { alignItems: 'center', justifyContent: 'center' },
    topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    iconText: { fontSize: 19, color: c.text },

    hero: { paddingTop: 22, paddingBottom: 16, paddingHorizontal: 4 },
    heroTitle: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.5,
                 textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
    heroCount: { fontSize: 14, color: c.muted, marginTop: 4 },
    search: { color: c.text, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16 },

    cardInner: { padding: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    thumb: { width: '100%', height: 90, borderRadius: 12, marginBottom: 6, backgroundColor: c.border },
    preview: { flex: 1, fontSize: 14, lineHeight: 20, color: c.muted, marginBottom: 6 },
    date: { fontSize: 12, color: c.muted },

    empty: { alignItems: 'center', paddingVertical: 70 },
    emptyText: { color: c.muted, textAlign: 'center', fontSize: 15, lineHeight: 22 },

    fabWrap: {
      position: 'absolute', right: 20, bottom: 30, borderRadius: 31, elevation: 8,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    },
    fab: {
      width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.text, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)',
    },

    sidebar: { width: 290, maxWidth: '86%', margin: 10, marginTop: top + 10 },
    sidebarInner: { paddingTop: 22, paddingHorizontal: 12, paddingBottom: 16 },
    sideTitle: { fontSize: 21, fontWeight: '800', color: c.text, paddingHorizontal: 12, marginBottom: 18 },
    navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12 },
    navIcon: { marginRight: 14 },
    navText: { flex: 1, fontSize: 16, color: c.text },
    navCount: { fontSize: 14, color: c.muted },
    sep: { height: 0.5, backgroundColor: c.border, marginVertical: 10, marginHorizontal: 12 },

    bannerText: { color: c.muted, fontSize: 14 },
    titleInput: { fontSize: 26, fontWeight: '700', color: c.text, paddingVertical: 6 },
    meta: { fontSize: 13, color: c.muted, marginBottom: 4 },
    titleDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border },

    wallScrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    wallTitle: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 4 },
    wallHint: { fontSize: 13, color: c.muted, marginBottom: 14 },
    newScrim: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
    selPill: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 10, gap: 10 },
    selCount: { fontSize: 20, fontWeight: '700', color: c.text, marginRight: 6, minWidth: 16 },
    selAll: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 14, gap: 8 },
    selAllText: { fontSize: 15, fontWeight: '600', color: c.text },
    selCheck: { position: 'absolute', top: 10, left: 10, zIndex: 2, width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                alignItems: 'center', justifyContent: 'center' },
    cardSel: { transform: [{ scale: 0.95 }], opacity: 0.85 },
    selBarWrap: { position: 'absolute', left: 12, right: 12, bottom: 24 },
    selBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    selAction: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 4, gap: 6 },
    selActionText: { fontSize: 14, color: c.text, fontWeight: '500' },
    trashBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    trashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    trashBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
    undoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, height: 44 },
    undoBtn: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
    histLockBadge: { position: 'absolute', right: 8, bottom: 9 },
    recIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    recTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    histRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    histDate: { fontSize: 13, color: c.muted },
    histPrev: { fontSize: 15, color: c.text, marginTop: 2 },
    histViewTitle: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 8 },
    histViewText: { fontSize: 16, lineHeight: 23, color: c.text },
    toggle: { width: 44, height: 26, borderRadius: 13, borderWidth: 2, padding: 2, justifyContent: 'center' },
    toggleKnob: { width: 18, height: 18, borderRadius: 9 },
    sheetTitle: { fontSize: 13, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
    rowText: { flex: 1, fontSize: 16, color: c.text },
    sideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
    sideHeaderText: { fontSize: 12, color: c.muted, letterSpacing: 1.2, fontWeight: '600' },
    folderInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 6 },
    folderInput: { flex: 1, color: c.text, fontSize: 16, paddingVertical: 12 },
    folderDot: { width: 8, height: 8, borderRadius: 4 },
    lockedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    pinDots: { flexDirection: 'row', gap: 16, marginVertical: 18 },
    pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
    pinGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 252, justifyContent: 'space-between', rowGap: 12 },
    pinKey: { width: 64, height: 64, marginHorizontal: 10 },
    pinKeyText: { fontSize: 26, fontWeight: '500', color: c.text },
    newTitle: { fontSize: 22, fontWeight: '800', color: c.text, marginBottom: 14, marginLeft: 6 },
    newCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    newIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    newCardTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    newCardDesc: { fontSize: 13, color: c.muted, marginTop: 2 },
    wallPreview: { height: 180, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    wallPreviewText: { fontSize: 15, fontWeight: '600' },
    wallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
    wallBtnText: { fontSize: 16, fontWeight: '600' },
    wallLabel: { color: c.muted, fontSize: 13, marginTop: 18, marginBottom: 8 },
    blurChip: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2, borderRadius: 14, borderWidth: 1 },
    wallRemove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 6 },

    toastWrap: { position: 'absolute', bottom: 110, alignSelf: 'center' },
    toastText: { color: c.text, fontSize: 14, paddingHorizontal: 18, paddingVertical: 10 },
  });
}
