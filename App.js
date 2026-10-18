import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Image, ScrollView,
  Pressable, StyleSheet, StatusBar, BackHandler, Alert, SafeAreaView, Share,
  KeyboardAvoidingView, Platform, useWindowDimensions, Dimensions, AppState, ActivityIndicator, Animated, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { buildEditorHtml } from './editor';
import { buildCalcHtml } from './calc';
import { shareFile } from './compartir';
import { makeBackup, openBackup } from './respaldo';
import Vault, { exportVaultRaw, importVaultRaw } from './boveda';
import DailyReport from './reporte';
import Pending, { countPending, pendingOf, markDoneHtml } from './pendientes';
import { groupsOf as matGroupsOf, loadMaterials } from './matlista';
import Materials from './materiales';
import { ICON_URI } from './icono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useInsets, webTextZoom } from './pantalla';
import Guide, { GUIDE_VERSION, guideSeen } from './ayuda';
import RemindSheet, { setupNotifications, scheduleAt, cancelAt, canNotify, fmtWhen } from './recordatorios';
import { LANG_GROUPS, langLabel, groupOf, makeT, detectLang, localeOf } from './idiomas';

/* Idioma actual (se cambia con applyLang). tr('clave') devuelve el texto traducido. */
let tr = makeT(detectLang());
let LOCALE = localeOf(detectLang());
function applyLang(code) { tr = makeT(code); LOCALE = localeOf(code); }
/* Idioma que entiende el revisor de ortografía (LanguageTool) */
function spellLang(code) {
  const c = String(code || 'es'), b = c.split('-')[0];
  const exact = ['en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'pt-PT', 'pt-AO', 'pt-MZ', 'pt-BR', 'de-AT', 'de-CH', 'nl-BE'];
  if (exact.includes(c)) return c;
  const base = { es: 'es', en: 'en-US', pt: 'pt-BR', de: 'de-DE', ca: 'ca-ES', nl: 'nl', fr: 'fr', it: 'it', ar: 'ar', fa: 'fa',
    sv: 'sv', da: 'da-DK', pl: 'pl-PL', ro: 'ro-RO', ru: 'ru-RU', sk: 'sk-SK', uk: 'uk-UA', el: 'el-GR', ja: 'ja-JP', zh: 'zh-CN', fil: 'tl-PH' };
  return base[b] || 'auto';
}

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
const BG_DARK = 'data:image/png;base64,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';
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
  if (!list.length) { await AsyncStorage.removeItem(`${HIST_KEY}_${id}`); return; }
  let l = list;
  for (;;) {                                   // si no cabe (navegador lleno), se guardan menos versiones
    try { await AsyncStorage.setItem(`${HIST_KEY}_${id}`, JSON.stringify(l)); return; }
    catch (e) { if (l.length <= 1) throw e; l = l.slice(0, Math.ceil(l.length / 2)); }
  }
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
  return arr;                                          // sin límite: solo el espacio del teléfono
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

/* Progreso de las listas de tareas de una nota: { done, total } o null */
function checklistProgress(n) {
  if (!n.html || !n.content || n.content.indexOf('checklist') === -1) return null;
  let done = 0, total = 0;
  (n.content.match(/<ul[^>]*class="[^"]*checklist[^"]*"[^>]*>[\s\S]*?<\/ul>/gi) || []).forEach(ul => {
    (ul.match(/<li\b[^>]*>/gi) || []).forEach(li => { total++; if (/class="[^"]*\bdone\b/.test(li)) done++; });
  });
  return total ? { done, total } : null;
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
/* 📦 Cuánto pesa una nota (texto + fotos + audios y videos guardados aparte) */
function noteBytes(n) {
  if (!n) return 0;
  const h = String(n.content || '');
  let b = h.length + String(n.titleHtml || n.title || '').length;
  const re = /<div class="(?:aud|vid)wrap"[^>]*>/g;
  let m;
  while ((m = re.exec(h))) {
    const tag = m[0], after = h.slice(m.index, m.index + 4000);
    if (!/<(?:audio|video)[^>]*data-aid=/.test(after)) continue;       // está dentro de la nota: ya se contó
    const sz = /data-size="(\d+)"/.exec(tag), du = /data-dur="(\d+)"/.exec(tag);
    b += sz ? +sz[1] : du ? +du[1] * 4000 : 0;
  }
  return b;
}
/* Lo que pesa al enviarla como página (fotos/videos van dentro del archivo, ~1.37 veces) */
function sendBytes(n) {
  const all = noteBytes(n), inside = String((n && n.content) || '').length;
  return Math.round(inside + (all - inside) * 1.37 + 4000);
}
function fmtBytes(b) {
  b = +b || 0;
  if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
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
function Sheet({ visible, onClose, title, s, t, children, onBack }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[s.newScrim, { backgroundColor: t.scrim }]} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <Glass t={t} strong radius={26} inner={{ paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4 }}>
              <BackBtn onPress={onBack || onClose} t={t} />
              <Text maxFontSizeMultiplier={1.3} style={[s.sheetTitle, { flex: 1, paddingLeft: 10, paddingRight: 8 }]} numberOfLines={1}>{title || ''}</Text>
              <DoneBtn onPress={onClose} t={t} />
            </View>
            <ScrollView style={{ maxHeight: Math.min(420, Dimensions.get('window').height * 0.6) }}>{children}</ScrollView>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ============================================================
   CÍRCULO DE COLORES (igual al del editor de notas)
   ============================================================ */
const WHEEL_IMG = 'data:image/png;base64,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';
const QUICK_COLORS = ['#ffffff', '#000000', '#9e9e9e', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#8e24aa', '#d81b60'];
function hsvToHex(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  const to = x => { const t = Math.round(x * 255).toString(16); return t.length < 2 ? '0' + t : t; };
  return '#' + to(f(5)) + to(f(3)) + to(f(1));
}
function hexToHsv(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
function ColorWheel({ value, onChange, t, size = 200 }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value) || { h: 0, s: 0, v: 1 });
  const [barW, setBarW] = useState(1);
  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
  useEffect(() => { const x = hexToHsv(value); if (x && value.toLowerCase() !== hex) setHsv(x); }, [value]);
  const R = size / 2;
  const set = n => { setHsv(n); onChange(hsvToHex(n.h, n.s, n.v)); };
  const pickWheel = e => {
    const dx = e.nativeEvent.locationX - R, dy = e.nativeEvent.locationY - R;
    const dist = Math.min(Math.hypot(dx, dy), R);
    set({ h: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, s: dist / R, v: hsv.v < 0.15 ? 1 : hsv.v });
  };
  const pickBar = e => set({ ...hsv, v: Math.max(0, Math.min(1, e.nativeEvent.locationX / barW)) });
  const touch = fn => ({
    onStartShouldSetResponder: () => true, onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false, onResponderGrant: fn, onResponderMove: fn,
  });
  const a = hsv.h * Math.PI / 180;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }} {...touch(pickWheel)}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: WHEEL_IMG }} style={{ width: size, height: size }} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: R, backgroundColor: '#000', opacity: 1 - hsv.v }]} />
          <View style={{ position: 'absolute', left: R + Math.cos(a) * hsv.s * R - 13, top: R + Math.sin(a) * hsv.s * R - 13,
            width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: '#fff', backgroundColor: hex,
            shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, elevation: 3 }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 14, gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: hex, borderWidth: 2, borderColor: t.border }} />
        <View style={{ flex: 1, height: 34, justifyContent: 'center' }} onLayout={e => setBarW(e.nativeEvent.layout.width || 1)} {...touch(pickBar)}>
          <View pointerEvents="none" style={{ height: 34, justifyContent: 'center' }}>
            <LinearGradient colors={['#000000', hsvToHex(hsv.h, hsv.s, 1)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 10, borderRadius: 5 }} />
            <View style={{ position: 'absolute', left: hsv.v * barW - 12, width: 24, height: 24, borderRadius: 12,
              backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' }} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12, justifyContent: 'center' }}>
        {QUICK_COLORS.map(col => (
          <TouchableOpacity key={col} onPress={() => set(hexToHsv(col))} activeOpacity={0.7}
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: col, borderWidth: 2,
              borderColor: hex === col ? t.text : 'rgba(255,255,255,0.35)' }} />
        ))}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ color: t.muted, fontSize: 12, marginTop: 8, letterSpacing: 1 }}>{hex.toUpperCase()}</Text>
    </View>
  );
}
/* Ventana con el círculo de colores. onDone(color) o onDone(null) = sin color */
function ColorSheet({ visible, title, value, allowNone, onDone, onClose, s, t }) {
  const [cur, setCur] = useState(value || '#1e88e5');
  useEffect(() => { if (visible) setCur(value || '#1e88e5'); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[s.wallScrim, { backgroundColor: t.scrim }]} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 380 }}>
          <Glass t={t} strong radius={28} inner={{ padding: 18 }}>
            <PanelHead title={title} onBack={onClose} onDone={() => onDone(cur)} s={s} t={t} style={{ marginBottom: 12 }} />
            <ColorWheel value={cur} onChange={setCur} t={t} size={210} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {allowNone && (
                <TouchableOpacity onPress={() => onDone(null)} activeOpacity={0.8}
                  style={[s.wallBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border }]}>
                  <Feather name="slash" size={16} color={t.text} />
                  <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: t.text }]}>{tr('noColor')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => onDone(cur)} activeOpacity={0.8} style={[s.wallBtn, { flex: 1, backgroundColor: t.text }]}>
                <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: t.inv }]}>{tr('done')}</Text>
              </TouchableOpacity>
            </View>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* Aviso formal antes de algo que borra (⚠️ + Cancelar / botón rojo) */
function WarnSheet({ visible, title, msg, okText, onOk, onClose, s, t }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[s.wallScrim, { backgroundColor: t.scrim }]} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360 }}>
          <Glass t={t} strong radius={28} inner={{ padding: 22, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,57,53,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Feather name="alert-triangle" size={28} color="#e53935" />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { textAlign: 'center', marginBottom: 8 }]}>{title}</Text>
            <Text maxFontSizeMultiplier={1.3} style={{ color: t.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' }}>{msg}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' }}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.8}
                style={[s.wallBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border }]}>
                <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: t.text }]}>{tr('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOk} activeOpacity={0.8} style={[s.wallBtn, { flex: 1, backgroundColor: '#e53935' }]}>
                <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: '#fff' }]}>{okText}</Text>
              </TouchableOpacity>
            </View>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ============================================================
   TRANSFERIR NOTAS: archivo de respaldo con contraseña
   ============================================================ */
/* Botón para elegir un archivo (en el teléfono lo hace una mini página web) */
const PICK_HTML = (label, c) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:transparent;height:100%}label{display:flex;align-items:center;justify-content:center;gap:8px;height:100%;
border:1.5px dashed ${c.border};border-radius:16px;color:${c.text};font:600 16px -apple-system,Roboto,sans-serif;box-sizing:border-box}
input{display:none}</style></head><body><label>📁 <span>${label.replace(/</g, '&lt;')}</span><input id="f" type="file"></label>
<script>document.getElementById('f').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();
r.onload=function(){window.ReactNativeWebView.postMessage(JSON.stringify({name:f.name,text:r.result}));};r.readAsText(f);});</script></body></html>`;

function TransferModal({ visible, onClose, onMake, onImport, s, t }) {
  const [step, setStep] = useState('menu');          // 'menu' | 'make' | 'import'
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [show, setShow] = useState(false);
  const [file, setFile] = useState(null);           // { name, text }
  const [busy, setBusy] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState('');
  useEffect(() => { if (visible) { setStep('menu'); setP1(''); setP2(''); setFile(null); setErr(''); setOk(''); setBusy(''); setShow(false); } }, [visible]);
  const pickWeb = () => {
    const inp = document.createElement('input'); inp.type = 'file';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setFile({ name: f.name, text: r.result }); r.readAsText(f); };
    inp.click();
  };
  async function doMake() {
    setErr('');
    if (p1.length < 6) { setErr(tr('bkShort')); return; }
    if (p1 !== p2) { setErr(tr('bkMismatch')); return; }
    setBusy(tr('bkWorking'));
    try { const r = await onMake(p1); if (r === 'web') { setBusy(''); onClose(); return; } setOk(tr('bkMade')); } catch (e) { setErr(tr('exportFail')); }
    setBusy('');
  }
  async function doImport() {
    setErr('');
    if (!file) { setErr(tr('bkPick')); return; }
    if (!p1) { setErr(tr('bkPass')); return; }
    setBusy(tr('bkOpening'));
    try {
      const r = await onImport(file.text, p1);
      const n = r.n;
      setOk((n === 1 ? tr('bkDone1') : tr('bkDone', { n })) + (r.vaultMsg ? '\n\n' + r.vaultMsg : ''));
    }
    catch (e) { setErr(e && e.message === 'pass' ? tr('bkWrongPass') : tr('bkBadFile')); }
    setBusy('');
  }
  const input = (val, set, ph) => (
    <View style={[s.folderInputWrap, { borderColor: t.border, marginTop: 10 }]}>
      <Feather name="lock" size={16} color={t.muted} />
      <TextInput maxFontSizeMultiplier={1.3} style={s.folderInput} value={val} onChangeText={v => { set(v); setErr(''); }} placeholder={ph}
        placeholderTextColor={t.muted} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
      <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10}><Feather name={show ? 'eye-off' : 'eye'} size={18} color={t.muted} /></TouchableOpacity>
    </View>
  );
  const bigBtn = (icon, title, sub, onPress) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18,
      borderWidth: 1, borderColor: t.border, marginTop: 10 }}>
      <Feather name={icon} size={24} color={t.text} />
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={t.muted} />
    </TouchableOpacity>
  );
  const mainBtn = (label, onPress) => (
    <TouchableOpacity onPress={onPress} disabled={!!busy} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: t.text, marginTop: 16, opacity: busy ? 0.5 : 1 }]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: t.inv }]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) (step === 'menu' || ok ? onClose() : setStep('menu')); }}>
      <Pressable style={[s.wallScrim, { backgroundColor: t.scrim }]} onPress={() => { if (!busy) onClose(); }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400 }}>
          <Glass t={t} strong radius={28} inner={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {!busy && !ok && (
                <BackBtn t={t} onPress={() => { if (step === 'menu') onClose(); else { setStep('menu'); setErr(''); setP1(''); setP2(''); } }} />
              )}
              <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { flex: 1, marginBottom: 0 }]}>
                {step === 'make' ? tr('bkMake') : step === 'import' ? tr('bkImport') : tr('transfer')}
              </Text>
              {!busy && <DoneBtn onPress={onClose} t={t} />}
            </View>

            {ok ? (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Feather name="check-circle" size={44} color="#43a047" />
                <Text maxFontSizeMultiplier={1.3} style={{ color: t.text, fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>{ok}</Text>
                {mainBtn(tr('done'), onClose)}
              </View>
            ) : busy ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
                <ActivityIndicator size="large" color={t.text} />
                <Text maxFontSizeMultiplier={1.3} style={{ color: t.text, fontSize: 15 }}>{busy}</Text>
              </View>
            ) : step === 'menu' ? (
              <>
                <Text maxFontSizeMultiplier={1.3} style={{ color: t.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>{tr('transferHint')}</Text>
                {bigBtn('upload', tr('bkMake'), tr('bkMakeSub'), () => setStep('make'))}
                {bigBtn('download', tr('bkImport'), tr('bkImportSub'), () => setStep('import'))}
              </>
            ) : step === 'make' ? (
              <>
                <Text maxFontSizeMultiplier={1.3} style={{ color: t.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }}>{tr('bkPassHint')}</Text>
                {input(p1, setP1, tr('bkPass'))}
                {input(p2, setP2, tr('bkPass2'))}
                {!!err && <Text maxFontSizeMultiplier={1.3} style={{ color: '#ff6b6b', marginTop: 10, fontSize: 14 }}>{err}</Text>}
                {mainBtn(tr('bkCreateFile'), doMake)}
              </>
            ) : (
              <>
                <View style={{ height: 56, marginTop: 12 }}>
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity onPress={pickWeb} activeOpacity={0.75} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.border, borderRadius: 16 }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>📁 {tr('bkPick')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <WebView originWhitelist={['*']} source={{ html: PICK_HTML(tr('bkPick'), t) }} style={{ flex: 1, backgroundColor: 'transparent' }}
                      scrollEnabled={false} allowFileAccess
                      onMessage={e => { try { const m = JSON.parse(e.nativeEvent.data); setFile(m); setErr(''); } catch (_) {} }} />
                  )}
                </View>
                {file && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <Feather name="file" size={16} color="#43a047" />
                    <Text maxFontSizeMultiplier={1.3} style={{ color: t.text, fontSize: 14, flex: 1 }} numberOfLines={1}>{file.name}</Text>
                  </View>
                )}
                {input(p1, setP1, tr('bkPass'))}
                {!!err && <Text maxFontSizeMultiplier={1.3} style={{ color: '#ff6b6b', marginTop: 10, fontSize: 14 }}>{err}</Text>}
                {mainBtn(tr('bkImportBtn'), doImport)}
              </>
            )}
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ============================================================
   ESTRELLITAS ✨ (rastro del menú al cerrarse)
   Mientras el panel se va encogiendo hacia la izquierda, va
   dejando un rastro de estrellitas que se prenden y se apagan
   (titilan) y desaparecen detrás del panel, de derecha a izquierda.
   ============================================================ */
const MENU_PANEL_W = 290;
/* Para que se vea fluido, las estrellitas van en grupos: cada grupo se anima
   como una sola pieza (mucho menos trabajo por cuadro), pero cada grupo
   sale en su momento y titila a su ritmo. */
function makeStarGroups(H, seed, screenW) {
  let x = seed * 9301 + 49297;
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const W = MENU_PANEL_W, groups = [];
  const star = (x0, x1) => ({ x: x0 + rnd() * (x1 - x0), y: 8 + rnd() * (H - 16), size: 4 + rnd() * 6, rot: Math.floor(rnd() * 45) });
  // franjas del panel: de derecha a izquierda, siguiendo el borde que se encoge
  const BANDS = 14;
  for (let g = 0; g < BANDS; g++) {
    const x1 = W * (1 - g / BANDS), x0 = W * (1 - (g + 1) / BANDS);
    const passed = Math.min(1.05, Math.max(0.02, (1 - x1 / W) / 0.985));
    for (let k = 0; k < 2; k++) {
      const stars = []; for (let i = 0; i < 4; i++) stars.push(star(x0 + 4, x1 - 4));
      groups.push({ start: passed + k * 0.05, life: 0.55 + rnd() * 0.25, drift: -(6 + rnd() * 12), alt: k, stars });
    }
  }
  // lado derecho de la pantalla: salen al empezar a cerrar
  const right = Math.max(W, (screenW || 400) - 20);
  for (let g = 0; g < 8; g++) {
    const stars = []; for (let i = 0; i < 9; i++) stars.push(star(W * 0.55, right));
    groups.push({ start: 0.02 + g * 0.06, life: 0.55 + rnd() * 0.25, drift: -(8 + rnd() * 16), alt: g % 2, stars });
  }
  return groups;
}
/* Una sola regla para el brillo de cada grupo (la usan el teléfono y la vista web) */
function starRange(gr) {
  const a = gr.start, l = gr.life;
  return {
    inR: [0, a, a + l * 0.12, a + l * 0.28, a + l * 0.44, a + l * 0.62, Math.min(1.97, a + l), 2],
    op: gr.alt ? [0, 0, 0.9, 1, 0.3, 0.8, 0, 0] : [0, 0, 1, 0.25, 1, 0.55, 0, 0],
    tx: [0, 0, gr.drift * 0.2, gr.drift * 0.4, gr.drift * 0.6, gr.drift * 0.8, gr.drift, gr.drift],
  };
}
function Sparkles({ anim, top, height, screenW, groups, starRefs }) {
  const styles = useMemo(() => groups.map(gr => {
    const r = starRange(gr), range = { inputRange: r.inR, extrapolate: 'clamp' };
    return {
      opacity: anim.interpolate({ ...range, outputRange: r.op }),                       // titilan a destiempo
      transform: [{ translateX: anim.interpolate({ ...range, outputRange: r.tx }) }],
    };
  }), [groups, anim]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 10, top, height, width: Math.max(MENU_PANEL_W, (screenW || 400) - 10) }}>
      {groups.map((gr, gi) => (
        <Animated.View key={gi} ref={el => { if (starRefs) starRefs.current[gi] = el; }}
          style={[StyleSheet.absoluteFill, styles[gi]]} renderToHardwareTextureAndroid>
          {gr.stars.map((st, i) => (
            <Text maxFontSizeMultiplier={1.3} key={i} style={{ position: 'absolute', left: st.x, top: st.y, color: '#ffffff', fontSize: st.size,
              transform: [{ rotate: st.rot + 'deg' }] }}>✦</Text>
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

/* Flecha de regresar (para los paneles que se abren desde el menú) */
function BackBtn({ onPress, t, style }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={12} activeOpacity={0.6}
      style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }, style]}>
      <Feather name="arrow-left" size={20} color={t.text} />
    </TouchableOpacity>
  );
}

/* Botón "Listo" (cierra el panel) */
function DoneBtn({ onPress, t, style }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} activeOpacity={0.6}
      style={[{ minHeight: 36, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
        backgroundColor: t.text }, style]}>
      <Text maxFontSizeMultiplier={1.3} style={{ color: t.inv, fontSize: 15, fontWeight: '700' }}>{tr('done')}</Text>
    </TouchableOpacity>
  );
}

/* Encabezado de panel: ← título Listo */
function PanelHead({ title, onBack, onDone, s, t, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <BackBtn onPress={onBack} t={t} />
      <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>{title}</Text>
      <DoneBtn onPress={onDone || onBack} t={t} />
    </View>
  );
}

function Row({ icon, iconColor, label, right, onPress, s, t, danger }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={s.row}>
      {icon ? <Feather name={icon} size={19} color={iconColor || (danger ? '#e53935' : t.text)} style={{ marginRight: 14 }} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[s.rowText, danger && { color: '#e53935' }]} numberOfLines={1}>{label}</Text>
      {right}
    </TouchableOpacity>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
/* ============================================================
   PORTAL: la nota se abre como un círculo que crece desde donde tocaste
   ============================================================ */
const DROP = { pt: null, openPt: null };   // dónde tocaste (para que el círculo salga de ahí)
const ND = Platform.OS !== 'web';
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/* Cuadros del círculo líquido (para la web): se mueve como agua y termina redondo */
function liquidFrames(x, y, W, H, opening) {
  const K = 40, P = 36, out = [];
  const Rmax = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 12;
  for (let k = 0; k <= K; k++) {
    const t = k / K, e = easeIO(t);
    const R = Math.max(0.5, e * Rmax);
    const amp = 0.15 * Math.pow(1 - e, 1.4);
    const ph = t * Math.PI * 2.6;
    const pts = [];
    for (let i = 0; i < P; i++) {
      const a = (i / P) * Math.PI * 2;
      const r = R * (1 + amp * (0.6 * Math.sin(2 * a + ph) + 0.4 * Math.sin(3 * a - 1.7 * ph)));
      pts.push((x + r * Math.cos(a)).toFixed(1) + 'px ' + (y + r * Math.sin(a)).toFixed(1) + 'px');
    }
    out.push('polygon(' + pts.join(',') + ')');
  }
  if (!opening) out.reverse();
  return out.map((cp, i) => ({ clipPath: cp, offset: i / K }));
}
/* ✦ Estela de estrellitas alrededor del círculo (igual que las del menú, pero en redondo) */
function ringStars(o, W, H, opening, Rmax) {
  let sd = (Date.now() % 997) * 9301 + 49297;
  const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
  const G = 9, groups = [];                // pocas estrellitas (livianas)
  for (let g = 0; g < G; g++) {
    const t = 0.03 + (g / G) * 0.92;                         // cuándo pasa el borde por ahí
    const R = easeIO(opening ? t : 1 - t) * Rmax;
    if (R < 10) continue;
    const stars = [];
    for (let k = 0; k < 16 && stars.length < 2; k++) {
      const a = rnd() * Math.PI * 2, r = R + (rnd() - 0.5) * 22;
      const x = o.x + r * Math.cos(a), y = o.y + r * Math.sin(a);
      if (x < 6 || y < 6 || x > W - 6 || y > H - 6) continue;   // solo las que se ven en la pantalla
      const sz = 5 + rnd() * 7, dr = (opening ? 1 : -1) * (6 + rnd() * 12);
      stars.push({ x, y, size: sz, rot: Math.floor(rnd() * 45), dx: Math.cos(a) * dr, dy: Math.sin(a) * dr });
    }
    if (stars.length) groups.push({ start: t, life: 0.6 + rnd() * 0.35, alt: g % 2, stars });
  }
  return groups;
}
/* Web: cada estrellita titila y se apaga con la tarjeta gráfica (solo opacidad y movimiento) */
function playRingStars(groups, M) {
  if (typeof document === 'undefined') return;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:2147483000;overflow:hidden';
  document.body.appendChild(box);
  let end = 0;
  groups.forEach(gr => {
    const op = gr.alt ? [0, 0.9, 1, 0.3, 0.8, 0] : [0, 1, 0.25, 1, 0.55, 0];
    const offs = [0, 0.12, 0.28, 0.44, 0.62, 1];
    gr.stars.forEach(st => {
      const sp = document.createElement('span');
      sp.textContent = '✦';
      sp.style.cssText = 'position:absolute;left:' + (st.x - st.size / 2) + 'px;top:' + (st.y - st.size / 2) + 'px;font-size:' + st.size +
        'px;line-height:1;color:#fff;opacity:0;will-change:transform,opacity;text-shadow:0 0 5px rgba(180,230,255,.95)';
      box.appendChild(sp);
      const kf = offs.map((f, i) => ({ offset: f, opacity: op[i],
        transform: 'translate(' + (st.dx * f).toFixed(1) + 'px,' + (st.dy * f).toFixed(1) + 'px) rotate(' + st.rot + 'deg)' }));
      const delay = gr.start * M, dur = gr.life * M;
      sp.animate(kf, { delay, duration: dur, easing: 'linear', fill: 'both' });
      end = Math.max(end, delay + dur);
    });
  });
  setTimeout(() => { if (box.parentNode) box.parentNode.removeChild(box); }, end + 80);
}
/* Para Android/iPhone: el círculo crece con un temblor de agua (escala X/Y) */
const LIQ = (() => {
  const inR = [], sx = [], sy = [], ix = [], iy = [], N = 40;
  for (let i = 0; i <= N; i++) {
    const q = i / N, wob = 0.14 * Math.sin(q * Math.PI * 3.2) * (1 - q) * (1 - q), b = Math.max(0.003, q);
    const X = b * (1 + wob), Y = b * (1 - wob);
    inR.push(q); sx.push(X); sy.push(Y); ix.push(1 / X); iy.push(1 / Y);
  }
  return { inR, sx, sy, ix, iy };
})();

/* La app va dentro de SafeAreaProvider: así sabe cuánto miden la barra de arriba y la de abajo en cada teléfono */
export default function App() {
  return <SafeAreaProvider><AppMain /></SafeAreaProvider>;
}
function AppMain() {
  return (
    <View style={{ flex: 1 }} onStartShouldSetResponderCapture={e => {
      const n = e.nativeEvent; if (n && n.pageX != null) DROP.pt = { x: n.pageX, y: n.pageY };
      return false;
    }}>
      <NotesApp />
    </View>
  );
}

function NotesApp() {
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
  const { width, height: winH } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  /* Animación del menú: entra deslizando; al cerrar se "apaga" como una pantalla
     futurista: se aplasta en una línea de luz y la línea se encoge hasta desaparecer */
  const menuIn = useRef(new Animated.Value(0)).current;     // 0 → 1 al abrir
  const menuOff = useRef(new Animated.Value(0)).current;    // 0 → 1 → 2 al cerrar
  const menuClosing = useRef(false);
  const [menuLeaving, setMenuLeaving] = useState(false);   // cerrándose: ya deja tocar lo de abajo
  /* En la vista web, la animación la hace el navegador directamente en la tarjeta
     gráfica (Web Animations): así va igual de fluida que en el teléfono. */
  const panelRef = useRef(null), glowRef = useRef(null), scrimRef = useRef(null), starRefs = useRef([]);
  const webAnims = useRef([]);
  const canWeb = () => Platform.OS === 'web' && panelRef.current && typeof panelRef.current.animate === 'function';
  const stopWebAnims = () => { webAnims.current.forEach(a => { try { a.cancel(); } catch (e) {} }); webAnims.current = []; };
  useEffect(() => {
    if (!menuOpen) { setMenuLeaving(false); return; }
    menuClosing.current = false;
    setMenuLeaving(false);
    menuOff.setValue(0);
    if (Platform.OS === 'web') {
      menuIn.setValue(1);
      requestAnimationFrame(() => {
        stopWebAnims();
        if (!canWeb()) return;
        const ease = 'cubic-bezier(.34,1.22,.64,1)';
        webAnims.current.push(panelRef.current.animate([{ transform: 'translateX(-320px)', opacity: 0 }, { transform: 'translateX(0px)', opacity: 1 }], { duration: 560, easing: ease }));
        if (scrimRef.current) webAnims.current.push(scrimRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' }));
      });
      return;
    }
    menuIn.setValue(0);
    Animated.timing(menuIn, { toValue: 1, duration: 560, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [menuOpen]);
  function closeMenuWeb(after) {
    const T = 1390, N = 70;
    const eCubic = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const eQuad = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const phase = t => (t < 650 ? eCubic(t / 650) : t < 910 ? 1 + 0.2 * (t - 650) / 260 : 1.2 + 0.8 * eQuad(Math.min(1, (t - 910) / 480)));
    const lerp = (v, inR, out) => {
      if (v <= inR[0]) return out[0];
      for (let i = 1; i < inR.length; i++) if (v <= inR[i]) { const k = (v - inR[i - 1]) / ((inR[i] - inR[i - 1]) || 1); return out[i - 1] + (out[i] - out[i - 1]) * k; }
      return out[out.length - 1];
    };
    const P = []; for (let i = 0; i <= N; i++) P.push(phase(T * i / N));
    const opts = { duration: T, easing: 'linear', fill: 'forwards' };
    stopWebAnims();
    const half = (MENU_W / 2) * 0.985;
    webAnims.current.push(panelRef.current.animate(P.map(p => ({
      transform: `translateX(${lerp(p, [0, 1, 2], [0, -half, -half])}px) scaleX(${lerp(p, [0, 1, 2], [1, 0.015, 0.015])}) scaleY(${lerp(p, [0, 1.2, 2], [1, 1, 0.001])})`,
      opacity: lerp(p, [0, 1.8, 2], [1, 1, 0]),
    })), opts));
    if (glowRef.current && glowRef.current.animate) webAnims.current.push(glowRef.current.animate(P.map(p => ({ opacity: lerp(p, [0, 0.5, 1, 1.85, 2], [0, 0.35, 1, 1, 0]) })), opts));
    if (scrimRef.current && scrimRef.current.animate) webAnims.current.push(scrimRef.current.animate(P.map(p => ({ opacity: lerp(p, [0, 2], [1, 0]) })), opts));
    starGroups.forEach((gr, gi) => {
      const el = starRefs.current[gi];
      if (!el || !el.animate) return;
      const r = starRange(gr);
      webAnims.current.push(el.animate(P.map(p => ({ opacity: lerp(p, r.inR, r.op), transform: `translateX(${lerp(p, r.inR, r.tx)}px)` })), opts));
    });
    setTimeout(() => { setMenuOpen(false); stopWebAnims(); if (after) after(); }, T + 20);
  }
  function closeMenu(after) {
    if (menuClosing.current) return;
    menuClosing.current = true;
    setMenuLeaving(true);
    if (canWeb()) { closeMenuWeb(after); return; }
    const nd = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(menuOff, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: nd }),  // se aplasta en línea de luz
      Animated.timing(menuOff, { toValue: 1.2, duration: 260, easing: Easing.linear, useNativeDriver: nd }),              // la línea suelta estrellitas
      Animated.timing(menuOff, { toValue: 2, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: nd }),    // la línea se encoge y se apaga
    ]).start(() => { setMenuOpen(false); menuOff.setValue(0); if (after) after(); });
  }
  const MENU_W = 290;
  const sideTop = (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) + 10;
  const sideH = winH - (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) - 70;
  const starGroups = useMemo(() => makeStarGroups(sideH, Math.floor(sideH), width), [sideH, width]);
  const menuX = Animated.add(
    menuIn.interpolate({ inputRange: [0, 1], outputRange: [-MENU_W - 20, 0] }),
    menuOff.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -(MENU_W / 2) * 0.985, -(MENU_W / 2) * 0.985] }));
  const menuSX = menuOff.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.015, 0.015] });
  const menuSY = menuOff.interpolate({ inputRange: [0, 1.2, 2], outputRange: [1, 1, 0.001] });
  const menuGlow = menuOff.interpolate({ inputRange: [0, 0.5, 1, 1.85, 2], outputRange: [0, 0.35, 1, 1, 0] });
  const menuOpacity = Animated.multiply(menuIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    menuOff.interpolate({ inputRange: [0, 1.8, 2], outputRange: [1, 1, 0] }));
  const menuScrim = Animated.multiply(menuIn, menuOff.interpolate({ inputRange: [0, 2], outputRange: [1, 0] }));
  const [currentId, setCurrentId] = useState(null);
  const revP = useRef(new Animated.Value(1)).current;   // portal: 0 = puntito, 1 = pantalla completa
  const [revealing, setRevealing] = useState(false);
  const revBusy = useRef(false);
  const revPending = useRef(null);          // 'open' mientras espera para empezar a crecer
  const revEl = useRef(null);
  const starAnim = useRef(new Animated.Value(0)).current;  // estrellitas del portal (teléfono)
  const [portalStars, setPortalStars] = useState(null);
  function startStars(o, opening, M) {
    const Rmax = Math.hypot(Math.max(o.x, width - o.x), Math.max(o.y, winH - o.y)) + 12;
    const groups = ringStars(o, width, winH, opening, Rmax);
    if (Platform.OS === 'web') { playRingStars(groups, M); return; }
    starAnim.setValue(0);
    setPortalStars(groups);
    Animated.timing(starAnim, { toValue: 2, duration: M * 2, easing: Easing.linear, useNativeDriver: true })
      .start(() => setPortalStars(null));
  }               // la capa del editor (en la web se recorta con el círculo)
  useEffect(() => {
    if (!currentId && revBusy.current) { revP.setValue(1); setRevealing(false); revBusy.current = false; }
  }, [currentId]);
  // Empieza a abrir cuando el editor ya está puesto (así no se traba)
  React.useLayoutEffect(() => {
    if (revPending.current !== 'open' || !currentId) return;
    revPending.current = null;
    const o = DROP.openPt;
    const finish = () => { setRevealing(false); revBusy.current = false; };
    if (Platform.OS === 'web') {
      const el = revEl.current;
      if (!el || !el.animate) { finish(); return; }
      const fr = liquidFrames(o.x, o.y, width, winH, true);
      el.style.clipPath = fr[0].clipPath;
      let started = false;
      const go = () => {
        if (started) return; started = true;
        requestAnimationFrame(() => {
          const an = el.animate(fr, { duration: 470, easing: 'linear', fill: 'forwards' });
          startStars(o, true, 470);           // ✦ poquitas estrellitas, en la misma vuelta que el círculo
          an.onfinish = () => { el.style.clipPath = ''; an.cancel(); finish(); };
        });
      };
      const fr2 = iframeRef.current;
      if (fr2) fr2.addEventListener('load', () => setTimeout(go, 30), { once: true });
      setTimeout(go, 150);                 // no espera más que esto: se siente al instante
    } else {
      revP.setValue(0);
      setTimeout(() => {
        Animated.timing(revP, { toValue: 1, duration: 460, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true }).start(finish);
        startStars(o, true, 460);
      }, 60);
    }
  }, [currentId]);
  const [cropOpen, setCropOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastUndo, setToastUndo] = useState(null);       // acción "Deshacer" del aviso
  const [appLock, setAppLock] = useState(false);          // pedir PIN al abrir la app
  const [colorFor, setColorFor] = useState(null);          // 'note' (nota abierta) o 'sel' (notas elegidas)
  const bgAt = useRef(0);                                  // cuándo se fue la app al fondo
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
  const [spellOn, setSpellOn] = useState(false);   // revisando ortografía
  const [rwOn, setRwOn] = useState(false);         // panel de reescribir abierto
  const [clearAsk, setClearAsk] = useState(false);  // aviso antes de borrar todo
  const [calcOpen, setCalcOpen] = useState(null);   // calculadora: null, 'home' o 'note'
  const [shareFor, setShareFor] = useState(null);   // ids de notas para "Compartir como"
  const [transferOpen, setTransferOpen] = useState(false);  // pasar notas a otro teléfono
  const [reportOpen, setReportOpen] = useState(false);     // 📊 reporte del día
  const [pendOpen, setPendOpen] = useState(false);         // ✅ todos los pendientes
  const [matOpen, setMatOpen] = useState(false);           // 📦 lista de materiales
  const [todoOpen, setTodoOpen] = useState(true);          // ✅ pendientes en la pantalla principal (abierto / cerrado)
  const [matSum, setMatSum] = useState({ n: 0, urg: 0 });  // 📦 cuántos materiales faltan por pedir
  const [guideOpen, setGuideOpen] = useState(false);       // 📖 guía de la app
  const [guideNew, setGuideNew] = useState(false);         // hay algo nuevo en la guía
  useEffect(() => { guideSeen().then(v => setGuideNew(v < GUIDE_VERSION)); }, []);
  const [reminders, setReminders] = useState([]);          // ⏰ recordatorios [{ id, noteId, text, at, notifId }]
  const [remTarget, setRemTarget] = useState(null);        // { noteId, text } al que se le pone recordatorio
  const [vaultOpen, setVaultOpen] = useState(false);        // la bóveda cifrada
  const [exportJob, setExportJob] = useState(null); // archivo (PDF / imagen) que se está creando
  const [webFile, setWebFile] = useState(null);     // vista web: archivo listo para compartir/descargar
  const exportFrame = useRef(null);
  const aiChain = useRef(Promise.resolve()), aiLast = useRef(0);   // pedidos a la IA de uno en uno
  useEffect(() => { if (Platform.OS === 'web') { try { document.title = 'Best Notes'; } catch (e) {} } }, []);
  useEffect(() => { AsyncStorage.getItem('homeTodoOpen').then(v => { if (v === '0') setTodoOpen(false); }).catch(() => {}); }, []);
  useEffect(() => {
    if (matOpen) return;                                   // al cerrar la lista de materiales se actualiza el resumen
    loadMaterials(AsyncStorage).then(es => {
      const gs = matGroupsOf(es.filter(e => e.status === 'pending'));
      setMatSum({ n: gs.length, urg: gs.filter(g => g.urgent).length });
    });
  }, [matOpen]);
  const calcState = useRef({});                     // lo que la calculadora recuerda
  const colorPrefs = useRef({});                    // colores recientes y favoritos
  const calcWeb = useRef(null), calcFrame = useRef(null);
  const fxCache = useRef(null);                     // tasas de cambio guardadas
  useEffect(() => {
    AsyncStorage.getItem('calcState').then(v => { if (v) calcState.current = JSON.parse(v); }).catch(() => {});
    AsyncStorage.getItem('colorPrefs').then(v => { if (v) colorPrefs.current = JSON.parse(v); }).catch(() => {});
    AsyncStorage.getItem('fxRates').then(v => { if (v) fxCache.current = JSON.parse(v); }).catch(() => {});
  }, []);
  /* Web: el editor se "calienta" en secreto (fuera de la pantalla) al arrancar y luego
     cada ratito mientras estás en la pantalla de inicio. Así, aunque dejes la app quieta un
     tiempo, la nota abre rápido (el navegador no "se duerme" ni olvida lo que ya preparó). */
  const warmBusy = useRef(false);
  const curRef = useRef(null);
  curRef.current = currentId;
  useEffect(() => {
    if (Platform.OS !== 'web' || !loaded || typeof document === 'undefined') return;
    const warm = () => {
      if (warmBusy.current || curRef.current || document.visibilityState !== 'visible') return;   // solo en la pantalla de inicio
      warmBusy.current = true;
      try {
        try { new Intl.Segmenter(LOCALE, { granularity: 'word' }).segment('a b'); new Date().toLocaleString(LOCALE, { month: 'short' }); } catch (e) {}
        const f = document.createElement('iframe');
        f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
        f.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + width + 'px;height:' + winH + 'px;border:0;opacity:0;pointer-events:none';
        f.srcdoc = buildEditorHtml({ id: 'warm', content: '<div>Hola</div>', titleHtml: 'T', updated: Date.now(), editable: true, c,
          kind: 'text', ink: [], tr, locale: LOCALE, colors: colorPrefs.current });
        document.body.appendChild(f);
        setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); warmBusy.current = false; }, 2500);
      } catch (e) { warmBusy.current = false; }
    };
    const first = setTimeout(warm, 1200);
    const every = setInterval(warm, 40000);                     // cada 40 segundos
    const onVis = () => { if (document.visibilityState === 'visible') setTimeout(warm, 400); };   // al volver a la app
    document.addEventListener('visibilitychange', onVis);
    return () => { clearTimeout(first); clearInterval(every); document.removeEventListener('visibilitychange', onVis); };
  }, [loaded]);
  const webRef = useRef(null);

  const c = dark ? THEMES.dark : THEMES.light;
  const ins = useInsets();
  const s = useMemo(() => makeStyles(c, ins), [dark, ins.top, ins.bottom]);

  /* ---------- Cargar notas guardadas ---------- */
  useEffect(() => {
    /* En el navegador: los audios viejos llenaban el espacio (estaban copiados en cada versión del historial).
       Se quitan del historial para que las notas se puedan guardar otra vez. */
    if (Platform.OS === 'web') {
      try {
        const ls = window.localStorage, keys = [];
        for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.indexOf(HIST_KEY + '_') === 0) keys.push(k); }
        keys.forEach(k => {
          const v = ls.getItem(k);
          if (!v || v.indexOf('data:audio') === -1) return;
          const list = JSON.parse(v).map(x => ({ ...x, content: String(x.content || '').replace(/ src="data:audio[^"]*"/g, '') }));
          ls.removeItem(k);
          try { ls.setItem(k, JSON.stringify(list)); } catch (e) {}
        });
      } catch (e) {}
    }
    loadWallpaper().then(w => { if (w) setWallpaper(w); }).catch(() => {});
    loadData()
      .then(data => {
        if (!data) return;
        setNotes((data.notes || []).filter(n => !(n.keep && !n.deleted && isEmpty(n) && Date.now() - (n.updated || 0) > 48 * 3600 * 1000)));   // notas vaciadas hace más de 48 h: se borran antes de mostrarse
        setLayout(data.layout || 'grid');
        setDark(!!data.dark);
        setTranslucent(!!data.translucent);
        if (data.lang) setLang(data.lang);
        if (typeof data.wallBlur === 'number') setWallBlur(data.wallBlur);
        setFolders(data.folders || []);
        if (data.sortBy) setSortBy(data.sortBy);
        if (data.pinHash) setPinHash(data.pinHash);
        if (data.appLock && data.pinHash) {
          setAppLock(true);
          pinOkRef.current = null;
          setPinPad({ mode: 'app', title: tr('appLockedTitle') });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  /* ---------- Guardado automático ---------- */
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveData({ notes, layout, dark, translucent, lang, wallBlur, folders, sortBy, pinHash, appLock }).catch(() => showToast(tr('saveFail')));
    }, 500);
    return () => clearTimeout(t);
  }, [notes, layout, dark, translucent, lang, wallBlur, folders, sortBy, pinHash, appLock, loaded]);

  /* Aviso abajo. Si se pasa "undo", muestra el botón Deshacer por 4 segundos */
  function showToast(msg, undo) {
    setToastMsg(msg);
    setToastUndo(() => undo || null);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToastMsg(''); setToastUndo(null); }, undo ? 4000 : 1800);
  }
  function runUndo() {
    const fn = toastUndo;
    clearTimeout(toastTimer.current);
    setToastMsg(''); setToastUndo(null);
    fn && fn();
  }

  /* ---------- Acciones con notas ---------- */
  const current = notes.find(n => n.id === currentId);
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

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
    openWithDrop(n.id);
    // Nota con dibujo: primero elegir un fondo (se puede omitir con "Listo")
    if (kind === 'draw') setTimeout(() => openWall(n.id), 1100);
  }

  /* ⏰ Recordatorios: cargar, guardar, avisar */
  const remRef = useRef(reminders);
  remRef.current = reminders;
  const remLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem('misnotas_reminders').then(v => {
      try {
        const list = JSON.parse(v || '[]').filter(r => r && r.at > Date.now() - 24 * 3600000);
        setReminders(list);
      } catch (e) {}
      remLoaded.current = true;
    });
    let off = () => {};
    setupNotifications(noteId => {
      const n = notesRef.current.find(x => x.id === noteId && !x.deleted);
      if (n) { setMenuOpen(false); setPendOpen(false); setTimeout(() => openNote(n), 300); }
    }).then(f => { off = f; });
    return () => off();
  }, []);
  useEffect(() => {
    if (remLoaded.current) AsyncStorage.setItem('misnotas_reminders', JSON.stringify(reminders)).catch(() => {});
  }, [reminders]);
  // En el navegador no hay avisos del sistema: se avisa mientras la app está abierta
  useEffect(() => {
    if (canNotify()) return;
    const id = setInterval(() => {
      const due = remRef.current.filter(r => !r.fired && r.at <= Date.now());
      if (!due.length) return;
      due.forEach(r => {
        const n = notesRef.current.find(x => x.id === r.noteId);
        const msg = '⏰ ' + ((n && n.title) || tr('note')) + (r.text ? ' — ' + r.text : '');
        showToast(msg);
        try { if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') new Notification(msg); } catch (e) {}
      });
      setReminders(rs => rs.map(r => (due.some(d => d.id === r.id) ? { ...r, fired: true } : r)));
    }, 15000);
    return () => clearInterval(id);
  }, []);
  async function addReminder(at) {
    const tg = remTarget;
    if (!tg) return;
    const n = notesRef.current.find(x => x.id === tg.noteId);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let notifId = null;
    try {
      notifId = await scheduleAt({
        title: '⏰ ' + ((n && n.title && n.title.trim()) || tr('note')),
        body: tg.text || (n ? toPlain(n).split('\n').find(x => x.trim()) || '' : '').slice(0, 140) || tr('rmTitle'),
        at, data: { noteId: tg.noteId, rid: id },
      });
    } catch (e) { showToast(tr('rmNoPerm')); return; }
    if (!canNotify()) { try { if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
    setReminders(rs => [...rs, { id, noteId: tg.noteId, text: tg.text || '', at, notifId }]);
    setRemTarget(null);
    showToast('⏰ ' + tr('rmSaved', { when: fmtWhen(at, LOCALE) }));
  }
  function removeReminder(r) {
    cancelAt(r.notifId);
    setReminders(rs => rs.filter(x => x.id !== r.id));
    showToast(tr('rmDeleted'));
  }
  const remFor = id => reminders.filter(r => r.noteId === id && r.at > Date.now());

  /* ✅ Cuántos pendientes hay en todas las notas */
  const pendCount = useMemo(() => countPending(notes), [notes]);

  /* 📊 El reporte del día se guarda como una nota nueva y se abre */
  function createReport({ title, content }) {
    const now = Date.now();
    const n = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      title, content, html: true, created: now, updated: now,
      fav: false, pinned: false, deleted: false, kind: 'text', isReport: true,
      folderId: view.startsWith('f:') ? view.slice(2) : undefined,
    };
    setMenuOpen(false);
    setNotes(ns => [...ns, n]);
    setTimeout(() => openWithDrop(n.id), 350);
  }

  // Cambia algo de una nota. "touch" = actualizar la fecha de modificación
  function patch(id, changes, touch = true) {
    setNotes(ns => ns.map(n =>
      n.id === id ? { ...n, ...changes, ...(touch ? { updated: Date.now() } : {}) } : n));
  }

  function isEmpty(n) {
    return !n.title.trim() && !toPlain(n).trim() && !firstImg(n) && !n.hasWall && !(n.ink && n.ink.length);
  }

  /* Notas que vaciaste con "Vaciar chat": si siguen vacías después de 48 horas, se borran solas */
  const EMPTY_LIFE = 48 * 60 * 60 * 1000;
  useEffect(() => {
    if (!loaded) return;
    const sweep = () => setNotes(ns => {
      const now = Date.now();
      const keep = ns.filter(n => !(n.keep && !n.deleted && n.id !== currentIdRef.current && isEmpty(n) && now - (n.updated || 0) > EMPTY_LIFE));
      return keep.length === ns.length ? ns : keep;
    });
    sweep();
    const iv = setInterval(sweep, 10 * 60 * 1000);                 // revisa cada 10 minutos
    const sub = AppState.addEventListener('change', st => { if (st === 'active') sweep(); });
    return () => { clearInterval(iv); sub && sub.remove && sub.remove(); };
  }, [loaded]);

  // 🌀 Al cerrar, el portal se encoge de vuelta hacia la nota (en reversa)
  function closeEditor() {
    if (revBusy.current) { closeEditorNow(); return; }
    revBusy.current = true;
    setRevealing(true);                    // la pantalla de inicio aparece detrás
    const o = DROP.openPt || { x: width / 2, y: winH * 0.4 };
    if (Platform.OS === 'web') {
      const el = revEl.current;
      if (!el || !el.animate) { closeEditorNow(); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const an = el.animate(liquidFrames(o.x, o.y, width, winH, false), { duration: 440, easing: 'linear', fill: 'forwards' });
        startStars(o, false, 440);
        an.onfinish = () => closeEditorNow();
      }));
    } else {
      setTimeout(() => {
        Animated.timing(revP, { toValue: 0, duration: 440, easing: Easing.bezier(0.6, 0, 0.35, 1), useNativeDriver: true })
          .start(() => closeEditorNow());
        startStars(o, false, 440);
      }, 60);
    }
  }
  function closeEditorNow() {
    const id = currentId;
    const finish = () => {
      // Si la nota quedó vacía, se descarta (menos si la vaciaste con "Vaciar chat")
      setNotes(ns => ns.filter(n => !(n.id === id && isEmpty(n) && !n.keep)));
      setCurrentId(cur => (cur === id ? null : cur));
      setCropOpen(false); setSpellOn(false); setRwOn(false);
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
    const next = [v, ...list];                         // sin límite: solo el espacio del teléfono
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
    if (isEmpty(current) && !current.keep) { closeEditor(); return; }
    const id = current.id;
    patch(id, { deleted: true }, false);
    setCurrentId(null);
    showToast(tr('movedTrash'), () => patch(id, { deleted: false }, false));
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
  /* ---------- Transferir notas (archivo de respaldo) ---------- */
  async function makeTransferFile(password) {
    await new Promise(r => (currentId ? flushEditor(r) : r()));
    const all = notesRef.current;
    const walls = {};
    for (const n of all) if (n.hasWall) { try { const w = await loadWallpaper(n.id); if (w) walls[n.id] = w; } catch (e) {} }
    let mainWall = null; try { mainWall = await loadWallpaper(); } catch (e) {}
    const data = {
      v: 1, made: Date.now(), notes: all, folders, walls, wallpaper: mainWall, calc: calcState.current,
      settings: { layout, dark, translucent, lang, wallBlur, sortBy, pinHash, appLock },
      vault: await exportVaultRaw().catch(() => null),
    };
    const text = await makeBackup(data, password);
    const d = new Date(), pad = x => String(x).padStart(2, '0');
    const name = `MisNotas_respaldo_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    if (Platform.OS === 'web') {
      const file = new File([text], name, { type: 'application/json' });
      setWebFile({ file, url: URL.createObjectURL(file), name });
      return 'web';
    }
    const f = new FS.File(FS.Paths.cache, name);
    try { if (f.exists) f.delete(); } catch (e) {}
    try { f.create(); } catch (e) {}
    f.write(text);
    const ok = await shareFile(f.uri, 'application/json', name);
    if (!ok) throw new Error('share');
  }
  async function importTransferFile(text, password) {
    const b = await openBackup(text, password);          // lanza 'pass' o 'file'
    const incoming = Array.isArray(b.notes) ? b.notes : [];
    const wasEmpty = notesRef.current.length === 0;
    const set = b.settings || {};
    // Notas: se juntan; si una nota ya existe, se queda la más nueva
    setNotes(ns => {
      const map = {}; ns.forEach(n => { map[n.id] = n; });
      incoming.forEach(n => { if (!n || !n.id) return; const old = map[n.id]; if (!old || (n.updated || 0) > (old.updated || 0)) map[n.id] = n; });
      return Object.values(map);
    });
    setFolders(fs => {
      const map = {}; fs.forEach(f => { map[f.id] = f; });
      (b.folders || []).forEach(f => { if (f && f.id && !map[f.id]) map[f.id] = f; });
      return Object.values(map);
    });
    for (const id in (b.walls || {})) { try { await saveWallpaper(b.walls[id], id); } catch (e) {} }
    if (set.pinHash && !pinHash) setPinHash(set.pinHash);   // así las notas con PIN se abren con tu mismo PIN
    if (wasEmpty) {                                          // teléfono nuevo: también tus ajustes
      if (set.layout) setLayout(set.layout);
      if (typeof set.dark === 'boolean') setDark(set.dark);
      if (typeof set.translucent === 'boolean') setTranslucent(set.translucent);
      if (set.lang) setLang(set.lang);
      if (typeof set.wallBlur === 'number') setWallBlur(set.wallBlur);
      if (set.sortBy) setSortBy(set.sortBy);
      if (set.appLock && set.pinHash) setAppLock(true);
      if (b.wallpaper) { setWallpaper(b.wallpaper); try { await saveWallpaper(b.wallpaper); } catch (e) {} }
      if (b.calc) { calcState.current = b.calc; AsyncStorage.setItem('calcState', JSON.stringify(b.calc)).catch(() => {}); }
    }
    // La bóveda llega todavía cerrada: se abre con SU contraseña de siempre
    let vaultMsg = '';
    if (b.vault) {
      const r = await importVaultRaw(b.vault).catch(() => 'fail');
      vaultMsg = r === 'ok' ? tr('bkVaultOk') : r === 'exists' ? tr('bkVaultExists') : '';
    }
    return { n: incoming.length, vaultMsg };
  }

  /* ---------- Compartir ---------- */
  async function shareText(list) {
    const text = list.map(n => {
      const t = (n.title || '').trim() || tr('untitled');
      return n.locked && !unlocked[n.id] ? `${t}\n(${tr('lockedNote')})` : `${t}\n${toPlain(n)}`.trim();
    }).join('\n\n────────\n\n');
    try {
      await Share.share({ message: text, title: list.length === 1 ? (list[0].title || tr('note')) : tr('myNotes') });
    } catch (e) {
      showToast(tr('shareFail'));
    }
  }
  function shareSelected() { setShareFor(selIds); }
  /* Crea el PDF o la imagen "tal como se ve" (lo hace un editor invisible) */
  function exportNotes(kind, ids) {
    setShareFor(null);
    const go = async () => {
      const list = notesRef.current.filter(n => ids.includes(n.id));
      if (!list.length) return;
      if (selMode) clearSelection();
      if (kind === 'text') { shareText(list); return; }
      const items = [];
      for (const n of list) {
        const locked = !!n.locked && !unlocked[n.id];
        let wall = null;
        if (n.hasWall && !locked) { try { wall = await loadWallpaper(n.id); } catch (e) {} }
        const blur = n.wallBlur ?? 8;
        items.push({
          t: toTitleHtml(n), h: toHtml(n), k: n.ink || [], u: n.updated, locked, lockedTxt: tr('lockedNote'),
          bg: wall ? { color: c.grad[0], img: wall, blur: blur > 0 ? blur : 0, dim: blur >= 0 ? c.wallDim : null }
                   : { color: c.grad[0], img: c.bgImage, blur: 0, dim: c.frost },
        });
      }
      const base = list.length === 1 ? ((list[0].title || '').trim() || tr('note')) : tr('myNotes');
      const name = base.replace(/[\\/:*?"<>|#%]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'nota';
      const html = buildEditorHtml({ id: 'export', content: '', titleHtml: '', updated: Date.now(), editable: false, c,
        kind: 'text', ink: [], tr, locale: LOCALE, exportJob: { kind, name, notes: items, app: tr('appName') } });
      setExportJob({ html, key: Date.now() });
    };
    if (currentId) flushEditor(go); else go();
  }
  function b64ToBytes(b64) {
    const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const map = new Uint8Array(128); for (let i = 0; i < 64; i++) map[T.charCodeAt(i)] = i;
    const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
    const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
    let o = 0;
    for (let i = 0; i < clean.length; i += 4) {
      const a = map[clean.charCodeAt(i)], b2 = map[clean.charCodeAt(i + 1)];
      const c2 = map[clean.charCodeAt(i + 2)] || 0, d = map[clean.charCodeAt(i + 3)] || 0;
      out[o++] = (a << 2) | (b2 >> 4);
      if (i + 2 < clean.length) out[o++] = ((b2 & 15) << 4) | (c2 >> 2);
      if (i + 3 < clean.length) out[o++] = ((c2 & 3) << 6) | d;
    }
    return out.slice(0, o);
  }
  async function onExported(data) {
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (m.type !== 'exported') return;
    setExportJob(null);
    if (m.error || (!m.b64 && !m.text)) { showToast(tr('exportFail')); return; }
    if (Platform.OS === 'web') {
      try {
        const bytes = m.text != null ? m.text : b64ToBytes(m.b64);
        const file = new File([bytes], m.name, { type: m.mime });
        setWebFile({ file, url: URL.createObjectURL(file), name: m.name });
      } catch (e) { showToast(tr('exportFail')); }
      return;
    }
    try {
      const f = new FS.File(FS.Paths.cache, m.name);
      try { if (f.exists) f.delete(); } catch (e) {}
      try { f.create(); } catch (e) {}
      f.write(m.text != null ? m.text : b64ToBytes(m.b64));
      const ok = await shareFile(f.uri, m.mime, m.name);
      if (!ok) showToast(tr('shareFail'));
    } catch (e) {
      showToast(tr('exportFail'));
    }
  }
  useEffect(() => {
    if (Platform.OS !== 'web' || !exportJob) return;
    const h = e => { if (exportFrame.current && e.source === exportFrame.current.contentWindow) onExported(e.data); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [exportJob]);
  async function webShare() {
    if (!webFile) return;
    try {
      if (navigator.canShare && navigator.canShare({ files: [webFile.file] })) {
        await navigator.share({ files: [webFile.file], title: webFile.name });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    webDownload();
  }
  function webDownload() {
    if (!webFile) return;
    const a = document.createElement('a'); a.href = webFile.url; a.download = webFile.name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function trashSelected() {
    const ids = selIds;
    const wasPinned = {};
    notes.forEach(n => { if (selected[n.id]) wasPinned[n.id] = !!n.pinned; });
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: true, pinned: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? tr('movedTrash') : tr('nMovedTrash', { n: ids.length }),
      () => setNotes(ns => ns.map(n => (n.id in wasPinned ? { ...n, deleted: false, pinned: wasPinned[n.id] } : n))));
  }
  function restoreSelected() {
    const ids = selIds;
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? tr('noteRecovered') : tr('nRecovered', { n: ids.length }),
      () => setNotes(ns => ns.map(n => (ids.includes(n.id) ? { ...n, deleted: true } : n))));
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

  // Bloqueo de la app: si estuvo fuera más de 1 minuto, pide el PIN al volver
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st === 'background') { bgAt.current = Date.now(); return; }
      if (st === 'active' && appLock && pinHash && bgAt.current && Date.now() - bgAt.current > 60000) {
        bgAt.current = 0;
        pinOkRef.current = null;
        setPinEntry('');
        setPinPad({ mode: 'app', title: tr('appLockedTitle') });
      }
    });
    return () => sub.remove();
  }, [appLock, pinHash]);

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
    setMoveOpen(false);
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

  /* ---------- Bloquear toda la app con PIN ---------- */
  function toggleAppLock() {
    if (appLock) {
      askPin('unlock', tr('pinToUnlock'), () => { setAppLock(false); showToast(tr('appLockOff')); });
      return;
    }
    const on = () => { setAppLock(true); showToast(tr('appLockOn')); };
    if (!pinHash) askPin('set1', tr('pinCreate'), on);
    else askPin('unlock', tr('pinCurrent'), on);
  }

  /* ---------- Color de la nota ---------- */
  function setNoteColor(col) {
    if (colorFor === 'sel') {
      setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, color: col || undefined } : n)));
      clearSelection();
    } else if (current) {
      patch(current.id, { color: col || undefined }, false);
    }
    setColorFor(null);
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
      if (pad.mode === 'unlock' || pad.mode === 'app') {
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
    if (!pinHash) { askPin('set1', tr('pinCreate'), () => showToast(tr('pinCreated'))); return; }
    askPin('unlock', tr('pinCurrent'), () => {
      setTimeout(() => askPin('set1', tr('pinNew'), () => showToast(tr('pinChanged'))), 200);
    });
  }
  function openNote(n) {
    if (n.locked && !unlocked[n.id]) {
      askPin('unlock', tr('lockedNote'), () => {
        setUnlocked(u => ({ ...u, [n.id]: true }));
        openWithDrop(n.id);
      });
      return;
    }
    openWithDrop(n.id);
  }
  // 🌀 La nota se abre como un portal: un círculo que crece desde donde tocaste
  function openWithDrop(id) {
    if (revBusy.current) { setCurrentId(id); return; }
    revBusy.current = true;
    DROP.openPt = DROP.pt || { x: width / 2, y: winH / 2 };
    revP.setValue(0);
    revPending.current = 'open';
    setRevealing(true);
    setCurrentId(id);
  }

  function toggleSearch() {
    if (searchOpen) setQuery('');
    else searchFocus.current = true;
    setSearchOpen(!searchOpen);
  }

  /* ---------- Reescribir con IA (Pollinations: gratis, sin cuenta) ---------- */
  const RW_HOW = {
    formal: 'Rewrite it in a formal, polite and respectful tone.',
    pro: 'Rewrite it in a clear, confident, professional tone suitable for work.',
    biz: 'Rewrite it as polished business communication: concise, results-oriented, with a courteous corporate tone.',
    friendly: 'Rewrite it in a warm, friendly and relaxed tone.',
    funny: 'Rewrite it so it is funny and witty, keeping the same meaning. Light, good-natured humor.',
    persuasive: 'Rewrite it to be persuasive and convincing, with a strong call to action when it fits.',
    short: 'Rewrite it much shorter and more concise, keeping the key information.',
    long: 'Rewrite it longer and more detailed, expanding naturally on the ideas without inventing facts.',
    clear: 'Rewrite it in simple, clear words that are very easy to understand.',
    fix: 'Correct spelling, grammar and punctuation only. Keep the wording and style as close as possible to the original.',
    emoji: 'Rewrite it in a lively tone and add fitting emojis.',
    /* 👔 Asistente de trabajo (la persona trabaja en campo y necesita que sus compañeros y jefes entiendan todo) */
    report: 'Turn these rough field notes into a clear, professional WORK REPORT that a supervisor can understand. Use short section titles on their own line ending with a colon, ' +
      'only for the sections that have information: Location, Work performed, Materials used, Issues found, Pending / next steps. Use "- " bullets inside sections. ' +
      'Write in past tense, formal and precise. Keep every technical detail exactly (device names, cable types, room/door numbers, quantities, times). Do not invent facts. No markdown symbols like ** or #.',
    pronote: 'Rewrite the whole note in a clear, polished, professional tone for work, fixing grammar and choosing formal vocabulary. Keep the same structure, all details and technical terms. Do not invent facts. No markdown symbols like ** or #.',
    email: 'Write a professional email to my supervisor based on these notes. Start with a line "Subject: ..." then a blank line, a polite greeting, a concise body (use "- " bullets for lists of work or pending items), and a courteous closing without a name. Keep all technical details. Do not invent facts. No markdown symbols like ** or #.',
    chat: 'Write a short, friendly but professional message for coworkers (for WhatsApp or a team chat) explaining this clearly so they understand exactly what was done and what they need to do. Keep key technical details. Use a few "- " bullets if helpful. No markdown symbols like ** or #.',
    english: 'Translate this into clear, professional workplace English (if it is already English, polish it into professional English). Keep all technical details and numbers exactly. No markdown symbols like ** or #.',
    todo: 'Extract every pending task, follow-up or thing still to do from these notes. Reply with ONE task per line, each starting with a verb, short and specific (include location or device when mentioned). No numbering, no bullets, no extra text. If there are none, reply with the single most logical next step.',
    summary: 'Summarize this in 2 to 4 short professional sentences with the most important information for a supervisor. No markdown.',
    steps: 'Explain this as clear, numbered step-by-step instructions (lines "1. ", "2. "...) that a coworker could follow without asking questions. Keep all technical details exactly. Add a short "Note:" line at the end only if there is a safety or important warning in the text. No markdown symbols like ** or #.',
    xlate: 'Translate this text faithfully, keeping exactly the same meaning, format, line breaks, bullets, numbering and technical terms. Do not add or remove anything.',
    syn: 'The text is a word or short phrase. Give 6 to 8 more formal and professional alternatives that mean the same in this context, one per line, most common first. Only the alternatives, no numbering, no explanations.',
  };
  function rwReply(data) {
    if (Platform.OS === 'web') {
      try { const w = iframeRef.current && iframeRef.current.contentWindow; if (w && w.rewriteResult) w.rewriteResult(data); } catch (e) {}
    } else if (webRef.current) {
      const js = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      webRef.current.injectJavaScript(`window.rewriteResult && window.rewriteResult(${js}); true;`);
    }
  }
  async function runRewrite(m) {
    const appLang = langLabel(langCode).replace(/^\S+\s/, '');
    const LN = c => c === 'es' ? 'Spanish' : c === 'en' ? 'English' : (langLabel(c) || c).replace(/^\S+\s/, '');
    const how = m.style === 'translate'
      ? `If the text is written in ${appLang}, translate it into English; otherwise translate it into ${appLang}. Keep the meaning and tone.`
      : RW_HOW[m.style] || RW_HOW.pro;
    const own = ['report', 'pronote', 'email', 'chat', 'english', 'todo', 'summary', 'steps', 'syn', 'xlate'].indexOf(m.style) >= 0;
    const dual = Array.isArray(m.dual) && m.dual.length === 2 ? m.dual : null;
    const MK = ['<<<VERSION 1>>>', '<<<VERSION 2>>>'];
    const system = 'You are a writing assistant inside a notes app. ' + how +
      (dual
        ? ` Produce the result TWICE: first written in ${LN(dual[0])}, then the same result written in ${LN(dual[1])} (translate naturally; keep technical terms, names and numbers exactly). ` +
          `Use EXACTLY this format: a line "${MK[0]}", then the ${LN(dual[0])} version, then a line "${MK[1]}", then the ${LN(dual[1])} version. Nothing else.`
        : m.style === 'translate' || m.style === 'english' ? ''
        : m.lang ? ` The ENTIRE answer must be written in ${LN(m.lang)} — every sentence, title and list item — translating naturally if the original is in another language (only technical terms, brand names, names and numbers stay as they are).`
        : ' Always answer in the SAME language as the original text.') +
      (own || dual ? ' Reply with ONLY the result, no introductions or explanations.' : ' Reply with ONLY the rewritten text: no quotes, no titles, no explanations, no options.') +
      (m.pieces ? ' IMPORTANT: the text is a note split into numbered pieces like "[1] ...", "[2] ...". Consecutive pieces can be parts of the same sentence with different formatting. ' +
        'Return EVERY piece, each on its own line starting with the same number ("[n] new text"), in the same order, with the new text for that same part. ' +
        'Never merge, split, add or drop pieces; never add text outside the pieces. Keep emojis, names, numbers and technical terms.' : '');
    const fullText = String(m.text || '');
    const clean = t => String(t || '').replace(/^\s*["“”']+|["“”']+\s*$/g, '').trim();
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t)); };
    async function ask(text) {
      // Hasta 4 intentos, esperando cada vez más (el servicio gratis pide esperar entre pedidos)
      const WAITS = [0, 5000, 10000, 16000];
      for (let k = 0; k < WAITS.length; k++) {
        if (WAITS[k]) await sleep(WAITS[k]);
        const since = Date.now() - (aiLast.current || 0);
        if (since < 3000) await sleep(3000 - since);        // un respiro entre un pedido y otro
        aiLast.current = Date.now();
        const seed = Math.floor(Math.random() * 1e6);
        try {
          const r = await withTimeout(fetch('https://text.pollinations.ai/openai', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'openai', seed, private: true, referrer: 'misnotas',
              messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
          }), 45000);
          if (!r.ok) throw new Error('http ' + r.status);
          const j = await r.json();
          const out = String((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
          if (out) return out;
        } catch (e1) {
          if (text.length > 5000) continue;                   // la forma sencilla solo sirve para textos cortos
          try {
            const url = 'https://text.pollinations.ai/' + encodeURIComponent(text) +
              '?model=openai&private=true&referrer=misnotas&seed=' + seed + '&system=' + encodeURIComponent(system);
            const r2 = await withTimeout(fetch(url), 45000);
            if (!r2.ok) throw new Error('http ' + r2.status);
            const out2 = String(await r2.text()).trim();
            if (out2) return out2;
          } catch (e2) {}
        }
      }
      return '';
    }
    // Los pedidos van de uno en uno (si se mandan juntos, el servicio rechaza el segundo)
    const prev = aiChain.current;
    let done;
    aiChain.current = new Promise(r => { done = r; });
    await prev.catch(() => {});
    let out = '';
    try {
      if (m.pieces && fullText.length > 4000) {
        // Nota larga: se trabaja por partes (de pedacito en pedacito) y se juntan; así no hay límite de largo
        const lines = fullText.split('\n'), parts = [];
        let cur = '';
        lines.forEach(l => { if (cur && cur.length + l.length > 4000) { parts.push(cur); cur = ''; } cur += (cur ? '\n' : '') + l; });
        if (cur) parts.push(cur);
        const outs = [];
        for (const part of parts) {
          const o = await ask(part);
          if (!o) { outs.length = 0; break; }
          outs.push(o);
        }
        out = outs.join('\n');
      } else out = await ask(fullText.slice(0, 120000));
    } finally { done(); }
    if (!out) { rwReply({ req: m.req, slot: m.slot, dual: !!dual, ok: false }); return; }
    if (!dual) { rwReply({ req: m.req, slot: m.slot, ok: true, text: clean(out) }); return; }
    // Separar las dos versiones
    const i1 = out.indexOf(MK[0]), i2 = out.indexOf(MK[1]);
    let a = '', b = '';
    if (i2 >= 0) { a = out.slice(i1 >= 0 ? i1 + MK[0].length : 0, i2); b = out.slice(i2 + MK[1].length); }
    else a = i1 >= 0 ? out.slice(i1 + MK[0].length) : out;
    a = clean(a.replace(/<<<[^>]*>>>/g, '')); b = clean(b.replace(/<<<[^>]*>>>/g, ''));
    rwReply({ req: m.req, dual: true, ok: true, outs: [a || null, b || null] });
  }

  /* ---------- Revisar ortografía (LanguageTool, por internet) ---------- */
  function spellReply(data) {
    if (Platform.OS === 'web') {
      try { const w = iframeRef.current && iframeRef.current.contentWindow; if (w && w.spellResult) w.spellResult(data); } catch (e) {}
    } else if (webRef.current) {
      const js = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      webRef.current.injectJavaScript(`window.spellResult && window.spellResult(${js}); true;`);
    }
  }
  async function runSpell(m) {
    let timer;
    try {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (ctl) timer = setTimeout(() => ctl.abort(), 20000);
      const body = 'language=' + encodeURIComponent(spellLang(langCode)) + '&text=' + encodeURIComponent(String(m.text || '').slice(0, 19000));
      const r = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body, ...(ctl ? { signal: ctl.signal } : {}),
      });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      spellReply({
        req: m.req, ok: true,
        matches: (j.matches || []).map(x => ({
          offset: x.offset, length: x.length, message: x.message, shortMessage: x.shortMessage,
          replacements: (x.replacements || []).slice(0, 6).map(v => ({ value: v.value })),
          rule: x.rule ? { id: x.rule.id, issueType: x.rule.issueType } : null,
        })),
      });
    } catch (e) {
      spellReply({ req: m.req, ok: false });
    } finally { clearTimeout(timer); }
  }

  /* ---------- Calculadora ---------- */
  function calcReply(fn, data) {
    if (Platform.OS === 'web') {
      try { const w = calcFrame.current && calcFrame.current.contentWindow; if (w && w[fn]) w[fn](data); } catch (e) {}
    } else if (calcWeb.current) {
      const js = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      calcWeb.current.injectJavaScript(`window.${fn} && window.${fn}(${js}); true;`);
    }
  }
  /* Tasas de cambio del día (gratis, sin llave): open.er-api.com */
  async function getRates() {
    let timer;
    try {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (ctl) timer = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch('https://open.er-api.com/v6/latest/USD', ctl ? { signal: ctl.signal } : undefined);
      const j = await r.json();
      if (j.result !== 'success' || !j.rates) throw new Error('fx');
      const d = { t: (j.time_last_update_unix || Date.now() / 1000) * 1000, rates: j.rates };
      fxCache.current = d;
      AsyncStorage.setItem('fxRates', JSON.stringify(d)).catch(() => {});
      calcReply('fxResult', d);
    } catch (e) {
      calcReply('fxResult', null);
    } finally { clearTimeout(timer); }
  }
  function onCalcMessage(data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'calcClose') setCalcOpen(null);
      if (m.type === 'fxGet') getRates();
      if (m.type === 'calcState') { calcState.current = m.state || {}; AsyncStorage.setItem('calcState', JSON.stringify(calcState.current)).catch(() => {}); }
      if (m.type === 'calcInsert' && m.text) {
        setCalcOpen(null);
        setTimeout(() => {
          if (Platform.OS === 'web') {
            try { const w = iframeRef.current && iframeRef.current.contentWindow; if (w && w.insertCalc) w.insertCalc(m.text); } catch (e) {}
          } else if (webRef.current) {
            const js = JSON.stringify(m.text).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
            webRef.current.injectJavaScript(`window.insertCalc && window.insertCalc(${js}); true;`);
          }
        }, 250);
      }
    } catch (e) {}
  }
  useEffect(() => {
    if (Platform.OS !== 'web' || !calcOpen) return;
    const h = e => { if (calcFrame.current && e.source === calcFrame.current.contentWindow) onCalcMessage(e.data); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [calcOpen]);
  const calcHtml = useMemo(() => (calcOpen ? buildCalcHtml({ c, tr, state: calcState.current, fx: fxCache.current, locale: LOCALE, canInsert: calcOpen === 'note' && !!current && !current.deleted }) : ''),
    [calcOpen, dark, langCode]);
  const calcModal = (
    <Modal visible={!!calcOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setCalcOpen(null)}>
      <View style={[s.screen, { backgroundColor: c.grad[0] }]}>
        {!!calcOpen && (Platform.OS === 'web' ? (
          <iframe ref={calcFrame} srcDoc={calcHtml} title="calc" style={{ border: 'none', width: '100%', height: '100%', backgroundColor: c.grad[0] }} />
        ) : (
          <WebView ref={calcWeb} textZoom={webTextZoom()} originWhitelist={['*']} source={{ html: calcHtml }} onMessage={e => onCalcMessage(e.nativeEvent.data)}
            style={{ flex: 1, backgroundColor: c.grad[0] }} keyboardDisplayRequiresUserAction={false} hideKeyboardAccessoryView />
        ))}
      </View>
    </Modal>
  );

  const shareLayer = (
    <>
      <Sheet visible={!!shareFor} onClose={() => setShareFor(null)} title={tr('shareAs')} s={s} t={c}>
        {!!shareFor && (() => {
          const sz = shareFor.reduce((a, id) => a + sendBytes(notes.find(n => n.id === id)), 0);
          // Por dónde se puede enviar (✅) y por dónde no (❌), según lo que pesa
          const MB = 1048576;
          const ways = [['📧', tr('chEmail'), 20 * MB], ['💬', tr('chWa'), 2048 * MB], ['📱', tr('chRcs'), 100 * MB], ['✉️', tr('chMms'), 1 * MB]];
          return (
            <View style={{ paddingHorizontal: 6, paddingBottom: 10 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>📦 {tr('sizeSend', { s: fmtBytes(sz) })}</Text>
              {ways.map(([ic, label, max]) => {
                const ok = sz <= max;
                return (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
                    <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, width: 26 }}>{ic}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, color: ok ? c.text : c.muted, fontSize: 13.5, textDecorationLine: ok ? 'none' : 'line-through' }}>{label}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, marginLeft: 8 }}>{ok ? '✅' : '❌'}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}
        <Row icon="film" label={tr('sharePage')} s={s} t={c} onPress={() => exportNotes('page', shareFor)} />
        <Row icon="file-text" label={tr('sharePdf')} s={s} t={c} onPress={() => exportNotes('pdf', shareFor)} />
        {shareFor && shareFor.length === 1 && (
          <Row icon="image" label={tr('shareImg')} s={s} t={c} onPress={() => exportNotes('img', shareFor)} />
        )}
        <Row icon="align-left" label={tr('shareText')} s={s} t={c} onPress={() => exportNotes('text', shareFor)} />
      </Sheet>
      {exportJob && (Platform.OS === 'web' ? (
        <iframe key={exportJob.key} ref={exportFrame} srcDoc={exportJob.html} title="export"
          style={{ position: 'absolute', left: 0, top: 0, width: width, height: 800, opacity: 0, pointerEvents: 'none', border: 'none' }} />
      ) : (
        <View key={exportJob.key} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: width, height: 800, opacity: 0.01 }}>
          <WebView originWhitelist={['*']} source={{ html: exportJob.html }} onMessage={e => onExported(e.nativeEvent.data)}
            style={{ flex: 1, backgroundColor: 'transparent' }} />
        </View>
      ))}
      <Modal visible={!!exportJob} transparent animationType="fade" onRequestClose={() => setExportJob(null)}>
        <View style={[s.wallScrim, { backgroundColor: c.scrim }]}>
          <Glass t={c} strong radius={24} inner={{ paddingVertical: 22, paddingHorizontal: 28, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={c.text} />
            <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 16 }}>{tr('exporting')}</Text>
          </Glass>
        </View>
      </Modal>
      <Modal visible={!!webFile} transparent animationType="fade" onRequestClose={() => setWebFile(null)}>
        <Pressable style={[s.wallScrim, { backgroundColor: c.scrim }]} onPress={() => setWebFile(null)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 360 }}>
            <Glass t={c} strong radius={28} inner={{ padding: 22, alignItems: 'center' }}>
              <PanelHead title={tr('fileReady')} onBack={() => setWebFile(null)} s={s} t={c} style={{ alignSelf: 'stretch', marginBottom: 14 }} />
              <Feather name={webFile && webFile.name.endsWith('.pdf') ? 'file-text' : 'image'} size={40} color={c.text} />
              <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 14, textAlign: 'center' }} numberOfLines={2}>{webFile ? webFile.name : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
                <TouchableOpacity onPress={webDownload} activeOpacity={0.8}
                  style={[s.wallBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }]}>
                  <Feather name="download" size={16} color={c.text} />
                  <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.text }]}>{tr('download')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={webShare} activeOpacity={0.8} style={[s.wallBtn, { flex: 1, backgroundColor: c.text }]}>
                  <Feather name="share-2" size={16} color={c.inv} />
                  <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('share')}</Text>
                </TouchableOpacity>
              </View>
            </Glass>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

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
      if (m.type === 'spellOpen') setSpellOn(!!m.open);
      if (m.type === 'spell') runSpell(m);
      if (m.type === 'rwOpen') setRwOn(!!m.open);
      if (m.type === 'shareOut' && m.text) Share.share({ message: String(m.text) }).catch(() => showToast(tr('shareFail')));
      if (m.type === 'rewrite') runRewrite(m);
      if (m.type === 'colorPrefs' && m.prefs) { colorPrefs.current = m.prefs; AsyncStorage.setItem('colorPrefs', JSON.stringify(m.prefs)).catch(() => {}); }
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
      kind: current.kind, ink: current.ink, tr, locale: LOCALE, colors: colorPrefs.current, safeBottom: Platform.OS === 'web' ? 0 : ins.bottom,
    });
  }, [currentId, dark, langCode, current && current.deleted, editorRev, ins.bottom]);

  // Vista previa de una versión del historial con el mismo editor (solo para mirar)
  const histHtml = useMemo(() => {
    if (!current || !histView || histView.rec) return '';
    return buildEditorHtml({
      id: 'preview', content: toHtml(histView), titleHtml: toTitleHtml(histView),
      updated: histView.at, editable: false, c, kind: current.kind, ink: histView.ink, tr, locale: LOCALE, colors: colorPrefs.current,
    });
  }, [histView, dark, langCode]);

  /* ---------- Botón "atrás" de Android ---------- */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (spellOn) { callEditor('spellClose'); return true; }
      if (rwOn) { callEditor('rewriteClose'); return true; }
      if (cropOpen && webRef.current) {
        webRef.current.injectJavaScript('window.closeCrop && window.closeCrop(); true;');
        return true;
      }
      if (pinPad) { if (pinPad.mode !== 'app') setPinPad(null); return pinPad.mode !== 'app' || false; }
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
      if (menuOpen) { closeMenu(); return true; }
      if (query) { setQuery(''); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentId, menuOpen, query, cropOpen, spellOn, rwOn, wallOpen, newOpen, pinPad, folderEdit, moveOpen, optsOpen, sortOpen, histOpen, histView, selMode]);

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
  // ✅ Lo pendiente de todas las notas, en vivo (se recalcula cada vez que cambia una nota)
  const homeTodos = useMemo(() => {
    const out = [];
    notes.filter(n => !n.deleted && !n.locked).sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .forEach(n => pendingOf(n).forEach(it => out.push({ n, it })));
    return out;
  }, [notes]);
  function homeDone(n, it) {
    confirmAsk(tr('ckDoneQ'), tr('ckDoneMsg'), tr('ckDoneYes'), () => {
      const fresh = notesRef.current.find(x => x.id === n.id);
      if (!fresh) return;
      const now = pendingOf(fresh);
      const hit = now.find(x => x.ui === it.ui && x.li === it.li && x.text === it.text) || now.find(x => x.text === it.text);
      if (!hit) return;
      patch(fresh.id, { content: markDoneHtml(fresh.content, hit.ui, hit.li) });
      showToast('✓ ' + tr('ckDoneTip'));
    });
  }
  const folderSize = id => fmtBytes(live.filter(n => n.folderId === id).reduce((a, n) => a + noteBytes(n), 0));
  const totalSize = fmtBytes(live.reduce((a, n) => a + noteBytes(n), 0));
  const allTags = useMemo(() => {
    const m = {};
    notes.forEach(n => { if (!n.deleted) tagsOf(n).forEach(t => { m[t] = (m[t] || 0) + 1; }); });
    return Object.keys(m).sort().map(t => [t, m[t]]);
  }, [notes]);

  const toast = toastMsg ? (
    <View style={s.toastWrap} pointerEvents="box-none">
      <Glass t={c} strong radius={20} inner={toastUndo ? { flexDirection: 'row', alignItems: 'center' } : null}>
        <Text maxFontSizeMultiplier={1.3} style={[s.toastText, toastUndo && { flexShrink: 1, paddingRight: 4 }]}>{toastMsg}</Text>
        {toastUndo && (
          <TouchableOpacity onPress={runUndo} hitSlop={10} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>{tr('undoBtn')}</Text>
          </TouchableOpacity>
        )}
      </Glass>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <BackBtn onPress={() => setWallOpen(false)} t={c} />
              <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { flex: 1, marginBottom: 0 }]}>{wallFor ? tr('bgThisNote') : tr('wallpaper')}</Text>
              <DoneBtn onPress={() => setWallOpen(false)} t={c} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={s.wallHint}>{wallFor ? tr('bgNoteHint') : tr('bgMainHint')}</Text>

            <View style={s.wallPreview}>
              <Background t={c} wall={wallData} blur={wallBlurNow} />
              <Text maxFontSizeMultiplier={1.3} style={[s.wallPreviewText, { color: c.text }]}>{tr('preview')}</Text>
            </View>

            {!wallFor && (
              <TouchableOpacity onPress={toggleTranslucent} style={[s.row, { paddingHorizontal: 4, marginBottom: 12 }]} activeOpacity={0.7}>
                <Feather name="smartphone" size={18} color={c.text} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={s.rowText}>{tr('translucent')}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('translucentHint')}</Text>
                </View>
                <View style={[s.toggle, { borderColor: c.text }, translucent && { backgroundColor: c.text }]}>
                  <View style={[s.toggleKnob, { backgroundColor: translucent ? c.inv : c.text }, translucent && { alignSelf: 'flex-end' }]} />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={pickWallpaper} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
              <Feather name="image" size={18} color={c.inv} />
              <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('pickGallery')}</Text>
            </TouchableOpacity>

            {wallData && (
              <>
                <Text maxFontSizeMultiplier={1.3} style={s.wallLabel}>{tr('blur')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[[tr('blurNone'), -1], [tr('blurLow'), 0], [tr('blurSoft'), 8], [tr('blurStrong'), 20]].map(([label, v]) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => (wallFor ? patch(wallFor, { wallBlur: v }, false) : setWallBlur(v))}
                      style={[s.blurChip, { borderColor: c.border }, wallBlurNow === v && { backgroundColor: c.text, borderColor: c.text }]}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={{ color: wallBlurNow === v ? c.inv : c.text, fontSize: 15 }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={removeWallpaper} activeOpacity={0.7} style={s.wallRemove}>
                  <Feather name="x" size={16} color={c.muted} />
                  <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 15, marginLeft: 6 }}>{wallFor ? tr('removeNoteBg') : tr('removeMyBg')}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setWallOpen(false)} style={{ alignSelf: 'center', padding: 10, marginTop: 6 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{tr('done')}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <BackBtn onPress={() => setFolderEdit(null)} t={c} />
                <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { flex: 1, marginBottom: 0 }]}>{folderEdit.id ? tr('editFolder') : tr('newFolder')}</Text>
                <DoneBtn onPress={() => setFolderEdit(null)} t={c} />
              </View>
              <View style={[s.folderInputWrap, { borderColor: c.border }]}>
                <Feather name="folder" size={20} color={folderEdit.color} />
                <TextInput maxFontSizeMultiplier={1.3}
                  style={s.folderInput}
                  value={folderEdit.name}
                  onChangeText={tx => setFolderEdit(f => ({ ...f, name: tx }))}
                  placeholder={tr('folderName')}
                  placeholderTextColor={c.muted}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <Text maxFontSizeMultiplier={1.3} style={s.wallLabel}>{tr('color')}</Text>
              <ColorWheel value={folderEdit.color} onChange={col => setFolderEdit(f => ({ ...f, color: col }))} t={c} size={170} />
              <TouchableOpacity onPress={saveFolder} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text, marginTop: 20 }]}>
                <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('save')}</Text>
              </TouchableOpacity>
              {folderEdit.id && (
                <TouchableOpacity onPress={() => deleteFolder(folderEdit)} style={s.wallRemove}>
                  <Feather name="trash-2" size={16} color="#e53935" />
                  <Text maxFontSizeMultiplier={1.3} style={{ color: '#e53935', fontSize: 15, marginLeft: 6 }}>{tr('deleteFolder')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFolderEdit(null)} style={{ alignSelf: 'center', padding: 10, marginTop: 4 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 16 }}>{tr('cancel')}</Text>
              </TouchableOpacity>
            </Glass>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  /* ---------- Teclado del PIN ---------- */
  const pinModal = (
    <Modal visible={!!pinPad} transparent animationType="fade"
      onRequestClose={() => { if (!pinPad || pinPad.mode !== 'app') setPinPad(null); }}>
      <View style={[s.wallScrim, { backgroundColor: pinPad && pinPad.mode === 'app' ? c.grad[0] : c.scrim }]}>
        {pinPad && pinPad.mode === 'app' && <Background t={c} wall={wallpaper} blur={20} />}
        {pinPad && (
          <Glass t={c} strong radius={30} style={{ width: '100%', maxWidth: 340 }} inner={{ padding: 22, alignItems: 'center' }}>
            {pinPad.mode !== 'app' && <BackBtn onPress={() => setPinPad(null)} t={c} style={{ position: 'absolute', left: 14, top: 14 }} />}
            <Feather name="lock" size={28} color={c.text} />
            <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { textAlign: 'center', marginTop: 10 }]}>{pinPad.title}</Text>
            {(pinPad.mode === 'set1') && (
              <Text maxFontSizeMultiplier={1.3} style={[s.wallHint, { textAlign: 'center' }]}>{tr('pinKeepSafe')}</Text>
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
                        : <Text maxFontSizeMultiplier={1.3} style={s.pinKeyText}>{k}</Text>}
                    </Glass>
                  </TouchableOpacity>
                )
              ))}
            </View>
            {pinPad.mode !== 'app' && (
              <TouchableOpacity onPress={() => setPinPad(null)} style={{ padding: 10, marginTop: 4 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 16 }}>{tr('cancel')}</Text>
              </TouchableOpacity>
            )}
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
    <Sheet visible={langOpen} onClose={() => { setLangOpen(false); setLangGroup(null); }} title={tr('language')} s={s} t={c}
      onBack={() => { setLangOpen(false); setLangGroup(null); }}>
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
                <Text maxFontSizeMultiplier={1.3} style={[s.rowText, { fontSize: 15 }]} numberOfLines={1}>{flag + '  ' + region}</Text>
                {check(lang === code)}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </Sheet>
  );

  const colorSheet = (
    <ColorSheet visible={!!colorFor} title={tr('noteColor')} allowNone s={s} t={c}
      value={colorFor === 'note' && current ? current.color
        : (notes.find(n => selected[n.id] && n.color) || {}).color}
      onClose={() => setColorFor(null)} onDone={setNoteColor} />
  );

  const seeNow = translucent && CAN_SEE;
  if (!loaded) return <View style={s.screen} />;

  /* ============================================================
     PANTALLA DEL EDITOR
     ============================================================ */
  let editorView = null;
  if (current) {
    const inTrash = current.deleted;
    editorView = (
      <View style={[s.screen, seeNow && { backgroundColor: 'transparent' }]}>
        {/* Cada nota usa SOLO su propio fondo; si no tiene, el vidrio por defecto (o translúcido) */}
        <Background t={c} wall={noteWall} blur={current.wallBlur ?? 8} see={seeNow} />
        <StatusBar barStyle={c.bar} backgroundColor="transparent" translucent />
        {/* Mientras editas una foto (o la recortas), la pantalla entera es para la foto */}
        <View style={[s.topbar, cropOpen && { display: 'none' }]}>
          <IconBtn name="arrow-left" onPress={closeEditor} s={s} t={c} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            {!inTrash && (
              <Glass t={c} radius={22} inner={s.undoPill}>
                <TouchableOpacity onPress={() => callEditor('undoNow')} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="undo-variant" size={20} color={c.text} style={!undoState.canUndo && { opacity: 0.35 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openHistory} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name={current.histLocked ? 'history' : 'history'} size={20} color={c.text} />
                  {current.histLocked && <Feather name="lock" size={9} color={c.text} style={s.histLockBadge} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => callEditor('redoNow')} style={s.undoBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="redo-variant" size={20} color={c.text} style={!undoState.canRedo && { opacity: 0.35 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => callEditor('spellStart')} style={[s.undoBtn, spellOn && { backgroundColor: c.text, borderRadius: 18 }]} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="spellcheck" size={20} color={spellOn ? c.inv : c.text} />
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
              <IconBtn set="mci" name="wallpaper" onPress={() => openWall(current.id)} s={s} t={c} />
              <IconBtn set="mci" name="calculator-variant-outline" onPress={() => setCalcOpen('note')} s={s} t={c} />
              <IconBtn name="more-vertical" onPress={() => setOptsOpen(true)} s={s} t={c} />
            </>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ paddingHorizontal: 20, paddingTop: inTrash ? 10 : 0 }}>
            {inTrash && (
              <Glass t={c} radius={16} style={{ marginBottom: 12 }} inner={{ padding: 12 }}>
                <Text maxFontSizeMultiplier={1.3} style={s.bannerText}>{tr('inTrashBanner')}</Text>
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
                allow="microphone; autoplay"
                allowTransparency
                style={{ border: 'none', width: '100%', height: '100%', backgroundColor: 'transparent' }}
              />
            ) : (
              <WebView
                textZoom={webTextZoom()}
                ref={webRef}
                originWhitelist={['*']}
                source={{ html: editorHtml }}
                onMessage={e => onEditorMessage(e.nativeEvent.data)}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                containerStyle={{ backgroundColor: 'transparent' }}
                allowFileAccess
                mediaCapturePermissionGrantType="grant"
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView
              />
            )}
          </View>
        </KeyboardAvoidingView>
        {wallModal}
        {colorSheet}
        {calcModal}
        {shareLayer}
        <WarnSheet visible={clearAsk} title={tr('clearAllTitle')} msg={tr('clearAllMsg')} okText={tr('clearAllOk')}
          onClose={() => setClearAsk(false)} onOk={() => { setClearAsk(false); patch(current.id, { keep: true }, false); setTimeout(() => callEditor('clearAll'), 200); }} s={s} t={c} />

        {/* Opciones de la nota */}
        <Sheet visible={optsOpen} onClose={() => setOptsOpen(false)} title={tr('noteOptions')} s={s} t={c}>
          <TouchableOpacity onPress={() => { setOptsOpen(false); setTimeout(() => callEditor('workOpen'), 250); }} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 18, backgroundColor: c.text }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 24 }}>👔</Text>
            <View style={{ flex: 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, fontSize: 16, fontWeight: '800' }}>{tr('workTitle')}</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, opacity: 0.7, fontSize: 12, marginTop: 2 }}>{tr('wHint')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.inv} />
          </TouchableOpacity>
          <Row icon="folder" iconColor={(folders.find(f => f.id === current.folderId) || {}).color} s={s} t={c}
            label={tr('folderLabel', { name: (folders.find(f => f.id === current.folderId) || {}).name || tr('none') })}
            onPress={() => { setOptsOpen(false); setMoveOpen(true); }}
            right={<Feather name="chevron-right" size={18} color={c.muted} />} />
          <Row icon={current.locked ? 'unlock' : 'lock'} s={s} t={c}
            label={current.locked ? tr('unlock') : tr('lockPin')} onPress={toggleLock} />
          <TouchableOpacity onPress={() => { setOptsOpen(false); setColorFor('note'); }} activeOpacity={0.6} style={s.row}>
            <View style={[s.colorDot, { backgroundColor: current.color || 'transparent', borderColor: current.color || c.muted }]} />
            <Text maxFontSizeMultiplier={1.3} style={s.rowText}>{tr('noteColor')}</Text>
            <Feather name="chevron-right" size={18} color={c.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOptsOpen(false); togglePin(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.pinned ? 'pin-off-outline' : 'pin-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text maxFontSizeMultiplier={1.3} style={s.rowText}>{current.pinned ? tr('unpin') : tr('pinTop')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOptsOpen(false); toggleFav(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.fav ? 'star' : 'star-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text maxFontSizeMultiplier={1.3} style={s.rowText}>{current.fav ? tr('favRemove') : tr('favAdd')}</Text>
          </TouchableOpacity>
          <Row icon="bell" label={tr('rmTitle') + (remFor(current.id).length ? ' · ' + fmtWhen(remFor(current.id).sort((a, b) => a.at - b.at)[0].at, LOCALE) : '')} s={s} t={c}
            onPress={() => { setOptsOpen(false); setTimeout(() => setRemTarget({ noteId: current.id, text: '' }), 250); }}
            right={<Feather name="chevron-right" size={18} color={c.muted} />} />
          <Row icon="share-2" label={tr('share')} s={s} t={c} onPress={() => { setOptsOpen(false); setTimeout(() => setShareFor([current.id]), 250); }} />
          <Row icon="clipboard" label={tr('tplTitle')} s={s} t={c} onPress={() => { setOptsOpen(false); setTimeout(() => callEditor('tplOpen'), 250); }} />
          <Row icon="mic" label={tr('recAudio')} s={s} t={c} onPress={() => { setOptsOpen(false); setTimeout(() => callEditor('recStart'), 250); }} />
          <Row icon="file-text" label={tr('makePdf')} s={s} t={c} onPress={() => { setOptsOpen(false); exportNotes('pdf', [current.id]); }} />
          <Row icon="delete" label={tr('clearAll')} danger s={s} t={c} onPress={() => { setOptsOpen(false); setTimeout(() => setClearAsk(true), 250); }} />
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
                      <BackBtn onPress={() => setHistOpen(false)} t={c} />
                      <MaterialCommunityIcons name="history" size={22} color={c.text} style={{ marginLeft: 10 }} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { marginLeft: 8, marginBottom: 0, flex: 1 }]}>{tr('history')}</Text>
                      <DoneBtn onPress={() => setHistOpen(false)} t={c} />
                    </View>
                    <Text maxFontSizeMultiplier={1.3} style={[s.wallHint, { marginTop: 6 }]}>
                      {tr('histIntro')}
                    </Text>
                    <TouchableOpacity onPress={openRecord} activeOpacity={0.7}>
                      <Glass t={c} radius={18} style={{ marginBottom: 12 }} inner={s.histRow}>
                        <View style={[s.recIcon, { backgroundColor: c.text }]}>
                          <Feather name="book-open" size={18} color={c.inv} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text maxFontSizeMultiplier={1.3} style={s.recTitle}>{tr('record')}</Text>
                          <Text maxFontSizeMultiplier={1.3} style={s.histDate}>
                            {tr('recLines', { n: ((recCache.current[current.id] || {}).e || []).length })}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={c.muted} />
                      </Glass>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveVersionNow} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="save" size={18} color={c.inv} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('saveVersionNow')}</Text>
                    </TouchableOpacity>
                    <Text maxFontSizeMultiplier={1.3} style={[s.sideHeaderText, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>{tr('savedVersions')}</Text>
                    <ScrollView style={{ maxHeight: 260 }}>
                      {histList.length === 0 && (
                        <Text maxFontSizeMultiplier={1.3} style={[s.emptyText, { paddingVertical: 16 }]}>{tr('noVersions', { btn: tr('saveVersionNow') })}</Text>
                      )}
                      {histList.map((v, i) => (
                        <TouchableOpacity key={v.at} onPress={() => setHistView(v)} activeOpacity={0.7}>
                          <Glass t={c} radius={16} style={{ marginBottom: 8 }} inner={s.histRow}>
                            <View style={{ flex: 1 }}>
                              <Text maxFontSizeMultiplier={1.3} style={s.histDate}>{fmtDate(v.at)}{i === 0 ? '  · ' + tr('latest') : ''}</Text>
                              <Text maxFontSizeMultiplier={1.3} style={s.histPrev} numberOfLines={2}>
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
                      <Text maxFontSizeMultiplier={1.3} style={s.rowText}>{current.histLocked ? tr('histWithPin') : tr('protectHist')}</Text>
                      <View style={[s.toggle, { borderColor: c.text }, current.histLocked && { backgroundColor: c.text }]}>
                        <View style={[s.toggleKnob, { backgroundColor: current.histLocked ? c.inv : c.text },
                          current.histLocked && { alignSelf: 'flex-end' }]} />
                      </View>
                    </TouchableOpacity>
                  </>
                ) : histView.rec ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <BackBtn onPress={() => setHistView(null)} t={c} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]}>{tr('record')}</Text>
                      <TouchableOpacity onPress={clearRecord} hitSlop={10} style={{ marginRight: 12 }}>
                        <Feather name="trash-2" size={20} color="#e53935" />
                      </TouchableOpacity>
                      <DoneBtn onPress={() => { setHistView(null); setHistOpen(false); }} t={c} />
                    </View>
                    <Text maxFontSizeMultiplier={1.3} style={[s.wallHint, { marginTop: 6, marginBottom: 0 }]}>{tr('recIntro')}</Text>
                    <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                      {recEntries.length === 0 && <Text maxFontSizeMultiplier={1.3} style={[s.emptyText, { paddingVertical: 16 }]}>{tr('recEmpty')}</Text>}
                      {recEntries.map((e, i) => (e[0] === REC_IMG
                        ? <Image key={i} source={{ uri: e.slice(1) }} style={[s.thumb, { height: 120, marginVertical: 4 }]} resizeMode="cover" />
                        : <Text maxFontSizeMultiplier={1.3} key={i} style={[s.histViewText, { marginBottom: 6 }]}>{e}</Text>))}
                    </ScrollView>
                    <TouchableOpacity onPress={restoreRecord} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('putAllInNote')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <BackBtn onPress={() => setHistView(null)} t={c} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]} numberOfLines={1}>{fmtDate(histView.at)}</Text>
                      <TouchableOpacity onPress={() => deleteVersion(histView)} hitSlop={10} style={{ marginRight: 12 }}>
                        <Feather name="trash-2" size={20} color="#e53935" />
                      </TouchableOpacity>
                      <DoneBtn onPress={() => { setHistView(null); setHistOpen(false); }} t={c} />
                    </View>
                    {/* La versión se ve EXACTAMENTE como quedó: fotos en su lugar, colores, tamaños, audios */}
                    <View style={{ height: Math.min(420, winH * 0.48), marginVertical: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
                      {Platform.OS === 'web' ? (
                        <iframe srcDoc={histHtml} title="version" style={{ border: 'none', width: '100%', height: '100%', backgroundColor: c.grad ? c.grad[0] : 'transparent' }} />
                      ) : (
                        <WebView textZoom={webTextZoom()} originWhitelist={['*']} source={{ html: histHtml }} style={{ flex: 1, backgroundColor: 'transparent' }} />
                      )}
                    </View>
                    <TouchableOpacity onPress={() => restoreVersion(histView)} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: c.inv }]}>{tr('restoreThisVersion')}</Text>
                    </TouchableOpacity>
                    <Text maxFontSizeMultiplier={1.3} style={[s.wallHint, { textAlign: 'center', marginTop: 10, marginBottom: 0 }]}>
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

  /* El menú ☰ va en una capa encima (no en una ventana aparte): así, apenas empieza a
     cerrarse, ya no bloquea los toques y puedes abrir una nota al instante */
  const menuLayer = menuOpen && (
      <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]} pointerEvents={menuLeaving ? 'none' : 'box-none'}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View ref={scrimRef} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: menuScrim }]} />
          <Animated.View ref={panelRef} renderToHardwareTextureAndroid shouldRasterizeIOS needsOffscreenAlphaCompositing
            style={[s.sidebar, { opacity: menuOpacity, transform: [{ translateX: menuX }, { scaleX: menuSX }, { scaleY: menuSY }] }]}>
          <Glass t={c} strong radius={28}>
           <ScrollView style={{ height: winH - (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) - 70 }}
             contentContainerStyle={s.sidebarInner} showsVerticalScrollIndicator indicatorStyle="white" persistentScrollbar={false} nestedScrollEnabled>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingLeft: 6 }}>
              <BackBtn onPress={() => closeMenu()} t={c} />
              <Image source={{ uri: ICON_URI }} style={{ width: 32, height: 32, borderRadius: 9, marginLeft: 10 }} />
              <Text maxFontSizeMultiplier={1.3} style={[s.sideTitle, { marginBottom: 0, paddingHorizontal: 10, flex: 1 }]} numberOfLines={1}>{tr('appName')}</Text>
              <DoneBtn onPress={() => closeMenu()} t={c} />
            </View>
            {/* 📖 Guía de la app: siempre primero, para que se note */}
            <TouchableOpacity onPress={() => { setGuideOpen(true); setGuideNew(false); }} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 12, borderRadius: 18, backgroundColor: c.text }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 22 }}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, fontSize: 16, fontWeight: '800' }}>{tr('gdTitle')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, opacity: 0.7, fontSize: 12, marginTop: 2 }}>{tr('gdMenuHint')}</Text>
              </View>
              {guideNew && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: c.inv }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 11, fontWeight: '800' }}>{tr('gdNew')}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={c.inv} />
            </TouchableOpacity>
            {[['all', 'file-text'], ['fav', 'star'], ['trash', 'trash-2']].map(([key, icon]) => (
              <TouchableOpacity key={key} onPress={() => { setView(key); closeMenu(); }} activeOpacity={0.7}>
                {view === key ? (
                  <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>
                    <Feather name={icon} size={19} color={c.text} style={s.navIcon} />
                    <Text maxFontSizeMultiplier={1.3} style={[s.navText, { fontWeight: '700' }]}>{tr(key)}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={s.navCount}>{counts[key]}{key === 'all' ? '  ·  ' + totalSize : ''}</Text>
                  </Glass>
                ) : (
                  <View style={[s.navItem, { marginBottom: 4 }]}>
                    <Feather name={icon} size={19} color={c.muted} style={s.navIcon} />
                    <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr(key)}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={s.navCount}>{counts[key]}{key === 'all' ? '  ·  ' + totalSize : ''}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <View style={s.sep} />

            {/* Carpetas */}
            <View style={s.sideHeader}>
              <Text maxFontSizeMultiplier={1.3} style={s.sideHeaderText}>{tr('folders')}</Text>
              <TouchableOpacity onPress={() => openFolderEdit(null)} hitSlop={10}>
                <Feather name="plus" size={20} color={c.text} />
              </TouchableOpacity>
            </View>
            {folders.length === 0 && (
              <TouchableOpacity style={s.navItem} onPress={() => openFolderEdit(null)} activeOpacity={0.7}>
                <Feather name="folder-plus" size={19} color={c.muted} style={s.navIcon} />
                <Text maxFontSizeMultiplier={1.3} style={[s.navText, { color: c.muted }]}>{tr('createFolder')}</Text>
              </TouchableOpacity>
            )}
            {folders.map(f => {
              const on = view === 'f:' + f.id;
              const body = (
                <>
                  <Feather name="folder" size={19} color={f.color} style={s.navIcon} />
                  <Text maxFontSizeMultiplier={1.3} style={[s.navText, on && { fontWeight: '700' }]} numberOfLines={1}>{f.name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text maxFontSizeMultiplier={1.3} style={s.navCount}>{folderCount(f.id)}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 11, color: c.muted }}>{folderSize(f.id)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openFolderEdit(f)} hitSlop={10} style={{ marginLeft: 10 }}>
                    <Feather name="more-horizontal" size={18} color={c.muted} />
                  </TouchableOpacity>
                </>
              );
              return (
                <TouchableOpacity key={f.id} onPress={() => { setView('f:' + f.id); closeMenu(); }}
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
                <View style={s.sideHeader}><Text maxFontSizeMultiplier={1.3} style={s.sideHeaderText}>{tr('tags')}</Text></View>
                {allTags.map(([tg, n]) => {
                  const on = view === 't:' + tg;
                  const body = (
                    <>
                      <Feather name="hash" size={18} color={on ? c.text : c.muted} style={s.navIcon} />
                      <Text maxFontSizeMultiplier={1.3} style={[s.navText, on && { fontWeight: '700' }]} numberOfLines={1}>{tg}</Text>
                      <Text maxFontSizeMultiplier={1.3} style={s.navCount}>{n}</Text>
                    </>
                  );
                  return (
                    <TouchableOpacity key={tg} onPress={() => { setView('t:' + tg); closeMenu(); }} activeOpacity={0.7}>
                      {on
                        ? <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>{body}</Glass>
                        : <View style={[s.navItem, { marginBottom: 4 }]}>{body}</View>}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <View style={s.sep} />
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => openWall(null)}>
              <MaterialCommunityIcons name="wallpaper" size={19} color={c.muted} style={s.navIcon} />
              <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('wallpaper')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setTransferOpen(true)}>
              <Feather name="smartphone" size={19} color={c.muted} style={s.navIcon} />
              <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('transfer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setPendOpen(true)}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={19} color={c.muted} style={s.navIcon} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('pdTitle')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('pdMenuHint')}</Text>
              </View>
              {pendCount > 0 && (
                <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, fontWeight: '800', fontSize: 12 }}>{pendCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setMatOpen(true)}>
              <MaterialCommunityIcons name="package-variant-closed" size={19} color={c.muted} style={s.navIcon} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('mtTitle')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('mtMenuHint')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setReportOpen(true)}>
              <MaterialCommunityIcons name="file-chart-outline" size={19} color={c.muted} style={s.navIcon} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('rpTitle')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('rpMenuHint')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setVaultOpen(true)}>
              <MaterialCommunityIcons name="shield-lock-outline" size={19} color={c.muted} style={s.navIcon} />
              <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('vault')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={changePin}>
              <Feather name="key" size={19} color={c.muted} style={s.navIcon} />
              <Text maxFontSizeMultiplier={1.3} style={s.navText}>{pinHash ? tr('changePin') : tr('createLockPin')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={toggleAppLock}>
              <Feather name="shield" size={19} color={c.muted} style={s.navIcon} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('lockApp')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{tr('lockAppHint')}</Text>
              </View>
              <View style={[s.toggle, { borderColor: c.text }, appLock && { backgroundColor: c.text }]}>
                <View style={[s.toggleKnob, { backgroundColor: appLock ? c.inv : c.text }, appLock && { alignSelf: 'flex-end' }]} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => setLangOpen(true)}>
              <Feather name="globe" size={19} color={c.muted} style={s.navIcon} />
              <Text maxFontSizeMultiplier={1.3} style={s.navText}>{tr('language')}</Text>
              <Text maxFontSizeMultiplier={1.3} style={s.navCount} numberOfLines={1}>{langName}</Text>
            </TouchableOpacity>
            {/* Sobre la app */}
            <View style={s.sep} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 10 }}>
              <Image source={{ uri: ICON_URI }} style={{ width: 44, height: 44, borderRadius: 12 }} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>Best Notes</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 12.5, marginTop: 2 }}>Developer: Luisell Peña Rodríguez</Text>
              </View>
            </View>
           </ScrollView>
          </Glass>
            {/* destello de "apagado": el panel se vuelve una línea de luz */}
            <Animated.View ref={glowRef} pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, backgroundColor: '#ffffff', opacity: menuGlow,
              shadowColor: '#9fd8ff', shadowOpacity: 1, shadowRadius: 18, elevation: 12 }]} />
          </Animated.View>
          <Pressable style={{ flex: 1 }} onPress={() => closeMenu()} />
          <Sparkles anim={menuOff} screenW={width} groups={starGroups} starRefs={starRefs}
            top={(Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) + 10}
            height={winH - (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) - 70} />
        </View>
      </View>
  );

  const homeView = (
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
            <Text maxFontSizeMultiplier={1.3} style={s.selCount}>{selIds.length}</Text>
          </Glass>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
            <Glass t={c} radius={22} inner={s.selAll}>
              <Feather name={selIds.length === visible.length ? 'minus-square' : 'check-square'} size={18} color={c.text} />
              <Text maxFontSizeMultiplier={1.3} style={s.selAllText}>{selIds.length === visible.length ? tr('none') : tr('selAll')}</Text>
            </Glass>
          </TouchableOpacity>
        </View>
      ) : (
      <View style={[s.topbar, { justifyContent: 'space-between' }]}>
        <IconBtn name="menu" onPress={() => setMenuOpen(true)} s={s} t={c} />
        <IconBtn set="mci" name="calculator-variant-outline" onPress={() => setCalcOpen('home')} s={s} t={c} />
        <IconBtn set="mci" name="shield-lock-outline" onPress={() => setVaultOpen(true)} s={s} t={c} />
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + ins.bottom, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={s.hero}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {viewFolder && <Feather name="folder" size={26} color={viewFolder.color} style={{ marginRight: 10 }} />}
                <Text maxFontSizeMultiplier={1.3} style={[s.heroTitle, { flexShrink: 1 }]} numberOfLines={1}>{viewTitle}</Text>
              </View>
              <Text maxFontSizeMultiplier={1.3} style={s.heroCount}>{tr('nNotes', { n: visible.length })}</Text>
            </View>
            {/* ✅ Pendientes en vivo (y 📦 materiales por pedir) */}
            {view === 'all' && !selMode && !query && (homeTodos.length > 0 || matSum.n > 0) && (
              <Glass t={c} radius={20} style={{ marginBottom: 14 }} inner={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                {homeTodos.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        onPress={() => { const v = !todoOpen; setTodoOpen(v); AsyncStorage.setItem('homeTodoOpen', v ? '1' : '0').catch(() => {}); }}>
                        <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>✅ {tr('hmTodo')}</Text>
                        <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
                          <Text maxFontSizeMultiplier={1.3} style={{ color: c.inv, fontSize: 13, fontWeight: '800' }}>{homeTodos.length}</Text>
                        </View>
                        <Feather name={todoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPendOpen(true)} hitSlop={8}>
                        <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 14, fontWeight: '700' }}>{tr('hmSeeAll')} ›</Text>
                      </TouchableOpacity>
                    </View>
                    {todoOpen && homeTodos.slice(0, 5).map(({ n, it }) => (
                      <View key={n.id + ':' + it.ui + ':' + it.li} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => homeDone(n, it)} hitSlop={10} style={{ paddingTop: 1 }}>
                          <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={22} color={c.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openNote(n)} activeOpacity={0.7} style={{ flex: 1 }}>
                          <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 15 }} numberOfLines={2}>{it.text}</Text>
                          <Text maxFontSizeMultiplier={1.3} style={{ color: titleColorOf(n) || c.muted, fontSize: 12, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                            {(n.title || '').trim() || tr('untitled')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {todoOpen && homeTodos.length > 5 && (
                      <TouchableOpacity onPress={() => setPendOpen(true)} style={{ marginTop: 10, marginLeft: 32 }}>
                        <Text maxFontSizeMultiplier={1.3} style={{ color: c.muted, fontSize: 14, fontWeight: '700' }}>{tr('hmMore', { n: homeTodos.length - 5 })}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                {matSum.n > 0 && (
                  <TouchableOpacity onPress={() => setMatOpen(true)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: homeTodos.length ? 12 : 0, paddingTop: homeTodos.length ? 10 : 0,
                      borderTopWidth: homeTodos.length ? 1 : 0, borderTopColor: c.border }}>
                    <Text maxFontSizeMultiplier={1.3} style={{ color: c.text, fontSize: 15, fontWeight: '700', flex: 1 }}>📦 {tr('hmMat', { n: matSum.n })}</Text>
                    {matSum.urg > 0 && <Text maxFontSizeMultiplier={1.3} style={{ color: '#ff6b61', fontSize: 13, fontWeight: '800' }}>🔴 {tr('hmMatUrg', { n: matSum.urg })}</Text>}
                    <Feather name="chevron-right" size={16} color={c.muted} />
                  </TouchableOpacity>
                )}
              </Glass>
            )}
            {view === 'trash' && counts.trash > 0 && !selMode && (
              <View style={s.trashBtns}>
                <TouchableOpacity onPress={restoreAllTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="rotate-ccw" size={18} color={c.text} />
                    <Text maxFontSizeMultiplier={1.3} style={s.trashBtnText}>{tr('recoverAll')}</Text>
                  </Glass>
                </TouchableOpacity>
                <TouchableOpacity onPress={emptyTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="trash-2" size={18} color="#e53935" />
                    <Text maxFontSizeMultiplier={1.3} style={[s.trashBtnText, { color: '#e53935' }]}>{tr('emptyTrash')}</Text>
                  </Glass>
                </TouchableOpacity>
              </View>
            )}
            {/* Barra de búsqueda fija (el teclado solo sale al tocarla) */}
            <Glass t={c} radius={24} style={{ marginBottom: 14 }} inner={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16 }}>
              <Feather name="search" size={18} color={c.muted} />
              <TextInput maxFontSizeMultiplier={1.3}
                style={[s.search, { flex: 1, minWidth: 0, paddingLeft: 10 }]}
                value={query}
                onChangeText={setQuery}
                placeholder={tr('searchPh')}
                placeholderTextColor={c.muted}
                returnKeyType="search"
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} style={{ paddingHorizontal: 14 }}>
                  <Feather name="x" size={18} color={c.muted} />
                </TouchableOpacity>
              )}
            </Glass>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={{ marginBottom: 14, opacity: 0.6 }}><Feather name={emptyMsg[0]} size={42} color={c.muted} /></View>
            <Text maxFontSizeMultiplier={1.3} style={s.emptyText}>{emptyMsg[1]}</Text>
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
                {!!item.color && (
                  <>
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: item.color, opacity: 0.16 }]} />
                    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 2, backgroundColor: item.color }} />
                  </>
                )}
                {selMode && (
                  <View style={[s.selCheck, { borderColor: c.text }, selected[item.id] && { backgroundColor: c.text }]}>
                    {selected[item.id] && <Feather name="check" size={15} color={c.inv} />}
                  </View>
                )}
                <View style={s.cardHeader}>
                  <Text maxFontSizeMultiplier={1.3} style={s.cardTitle} numberOfLines={1}>
                    {item.title ? titleSegments(item).map((g, i) => (
                      <Text maxFontSizeMultiplier={1.3} key={i} style={{
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
                    {remFor(item.id).length > 0 && <MaterialCommunityIcons name="bell-ring-outline" size={14} color={c.muted} />}
                  </View>
                </View>
                {item.locked ? (
                  <View style={s.lockedBox}>
                    <Feather name="lock" size={22} color={c.muted} />
                    <Text maxFontSizeMultiplier={1.3} style={[s.preview, { flex: 0, marginTop: 6, marginBottom: 0 }]}>{tr('lockedNote')}</Text>
                  </View>
                ) : (
                  <>
                    {thumb && (
                      <Image source={{ uri: thumb }} style={[s.thumb, !isGrid && { height: 120 }]} resizeMode="cover" />
                    )}
                    <Text maxFontSizeMultiplier={1.3} style={s.preview} numberOfLines={thumb ? 2 : isGrid ? 4 : 2}>{toPlain(item)}</Text>
                  </>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {(() => {
                    const f = !viewFolder && folders.find(x => x.id === item.folderId);
                    return f ? <View style={[s.folderDot, { backgroundColor: f.color }]} /> : null;
                  })()}
                  <Text maxFontSizeMultiplier={1.3} style={[s.date, { flexShrink: 1 }]} numberOfLines={1}>{fmtDate(sortBy === 'created' ? (item.created || item.updated) : item.updated)}</Text>
                  {(() => {
                    const pr = !item.locked && checklistProgress(item);
                    if (!pr) return null;
                    const full = pr.done === pr.total;
                    return (
                      <View style={[s.progPill, { borderColor: c.border }, full && { backgroundColor: c.text, borderColor: c.text }]}>
                        <Feather name="check-square" size={11} color={full ? c.inv : c.muted} />
                        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 11, fontWeight: '700', color: full ? c.inv : c.muted, marginLeft: 4 }}>{pr.done}/{pr.total}</Text>
                      </View>
                    );
                  })()}
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
                  <Text maxFontSizeMultiplier={1.3} style={s.selActionText}>{tr('recover')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={destroySelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color="#e53935" />
                  <Text maxFontSizeMultiplier={1.3} style={[s.selActionText, { color: '#e53935' }]}>{tr('remove')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={shareSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="share-2" size={24} color={c.text} />
                  <Text maxFontSizeMultiplier={1.3} style={s.selActionText}>{tr('share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => exportNotes('pdf', selIds)} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="file-text" size={24} color={c.text} />
                  <Text maxFontSizeMultiplier={1.3} style={s.selActionText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setColorFor('sel')} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="droplet" size={24} color={c.text} />
                  <Text maxFontSizeMultiplier={1.3} style={s.selActionText}>{tr('color')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={trashSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color={c.text} />
                  <Text maxFontSizeMultiplier={1.3} style={s.selActionText}>{tr('trash')}</Text>
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

      {!current && wallModal}
      {!current && colorSheet}
      {!current && calcModal}
      {!current && shareLayer}
      <TransferModal visible={transferOpen} onClose={() => setTransferOpen(false)}
        onMake={makeTransferFile} onImport={importTransferFile} s={s} t={c} />
      <Vault visible={vaultOpen} onClose={() => setVaultOpen(false)} s={s} t={c} tr={tr} Glass={Glass} />
      <Pending visible={pendOpen} onClose={() => setPendOpen(false)} notes={notes} onPatch={(id, ch) => patch(id, ch)}
        onOpen={n => { setPendOpen(false); setMenuOpen(false); setTimeout(() => openNote(n), 350); }}
        onRemind={(n, text) => setRemTarget({ noteId: n.id, text })} reminders={reminders}
        titleSegments={titleSegments} s={s} t={c} tr={tr} Glass={Glass} />
      <RemindSheet visible={!!remTarget} onClose={() => setRemTarget(null)} target={remTarget}
        noteTitle={remTarget ? ((notes.find(x => x.id === remTarget.noteId) || {}).title || '') : ''}
        list={remTarget ? reminders.filter(r => r.noteId === remTarget.noteId && (r.text || '') === (remTarget.text || '')) : []}
        onSave={addReminder} onDelete={removeReminder} s={s} t={c} tr={tr} Glass={Glass} locale={LOCALE} />
      <Guide visible={guideOpen} onClose={() => setGuideOpen(false)} s={s} t={c} tr={tr} Glass={Glass} langCode={langCode} />
      <Materials visible={matOpen} onClose={() => setMatOpen(false)} notes={notes} plainOf={toPlain}
        onOpen={n => { setMatOpen(false); setMenuOpen(false); setTimeout(() => openNote(n), 350); }}
        onCreateNote={createReport} titleSegments={titleSegments} s={s} t={c} tr={tr} Glass={Glass} langCode={langCode} locale={LOCALE} />
      <DailyReport visible={reportOpen} onClose={() => setReportOpen(false)} notes={notes} plainOf={toPlain} onCreate={createReport}
        s={s} t={c} tr={tr} Glass={Glass} langCode={langCode} locale={LOCALE} />
      {sortSheet}
      {langSheet}
      {!current && folderModal}
      {!current && pinModal}


      {!current && toast}
    </View>
  );

  /* El portal: el editor se ve dentro de un círculo líquido que crece (o se encoge) */
  const D = Math.ceil(2 * Math.hypot(width, winH)) + 40;
  const o = DROP.openPt || { x: width / 2, y: winH / 2 };
  const nat = Platform.OS !== 'web' && revealing;
  const nIn = (arr) => revP.interpolate({ inputRange: LIQ.inR, outputRange: arr });
  return (
    <View style={{ flex: 1, backgroundColor: seeNow ? 'transparent' : c.grad[0] }}>
      <View style={[{ flex: 1 }, current && !revealing && { display: 'none' }]}>{homeView}</View>
      {!current && menuLayer}
      {editorView && (
        <View ref={revEl} style={StyleSheet.absoluteFill} pointerEvents={revealing ? 'none' : 'auto'}>
          <Animated.View style={nat ? { position: 'absolute', left: o.x - D / 2, top: o.y - D / 2, width: D, height: D,
            borderRadius: D / 2, overflow: 'hidden', transform: [{ scaleX: nIn(LIQ.sx) }, { scaleY: nIn(LIQ.sy) }] } : { flex: 1 }}>
            <Animated.View style={nat ? { width: D, height: D, transform: [{ scaleX: nIn(LIQ.ix) }, { scaleY: nIn(LIQ.iy) }] } : { flex: 1 }}>
              <View style={nat ? { position: 'absolute', left: D / 2 - o.x, top: D / 2 - o.y, width, height: winH } : { flex: 1 }}>
                {editorView}
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      )}
      {portalStars && Platform.OS !== 'web' && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {portalStars.map((gr, gi) => {
            const r = starRange(gr);
            return (
              <Animated.View key={gi} renderToHardwareTextureAndroid style={[StyleSheet.absoluteFill,
                { opacity: starAnim.interpolate({ inputRange: r.inR, outputRange: r.op, extrapolate: 'clamp' }) }]}>
                {gr.stars.map((st, i) => (
                  <Text maxFontSizeMultiplier={1.3} key={i} style={{ position: 'absolute', left: st.x - st.size / 2, top: st.y - st.size / 2, color: '#ffffff',
                    fontSize: st.size, textShadowColor: 'rgba(180,230,255,0.95)', textShadowRadius: 5,
                    transform: [{ rotate: st.rot + 'deg' }] }}>✦</Text>
                ))}
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
function makeStyles(c, ins = { top: 0, bottom: 0 }) {
  const top = Math.max(Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44, ins.top || 0);
  const bot = ins.bottom || 0;            // barra de gestos / botones del teléfono
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.grad[0], paddingTop: top },
    center: { alignItems: 'center', justifyContent: 'center' },
    topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    iconText: { fontSize: 19, color: c.text },

    hero: { paddingTop: 22, paddingBottom: 16, paddingHorizontal: 4 },
    heroTitle: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.5,
                 textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
    heroCount: { fontSize: 14, color: c.muted, marginTop: 4 },
    search: { color: c.text, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16,
              ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null) },

    cardInner: { padding: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    thumb: { width: '100%', height: 90, borderRadius: 12, marginBottom: 6, backgroundColor: c.border },
    preview: { flex: 1, fontSize: 14, lineHeight: 20, color: c.muted, marginBottom: 6 },
    date: { fontSize: 12, color: c.muted },

    empty: { alignItems: 'center', paddingVertical: 70 },
    emptyText: { color: c.muted, textAlign: 'center', fontSize: 15, lineHeight: 22 },

    fabWrap: {
      position: 'absolute', right: 20, bottom: 30 + bot, borderRadius: 31, elevation: 8,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    },
    fab: {
      width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.text, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)',
    },

    sidebar: { width: 290, maxWidth: '86%', margin: 10, marginTop: top + 10, alignSelf: 'flex-start' },
    sidebarInner: { paddingTop: 22, paddingHorizontal: 12, paddingBottom: 40 + bot },
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
    newScrim: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 40 + bot },
    selPill: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 10, gap: 10 },
    selCount: { fontSize: 20, fontWeight: '700', color: c.text, marginRight: 6, minWidth: 16 },
    selAll: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 14, gap: 8 },
    selAllText: { fontSize: 15, fontWeight: '600', color: c.text },
    selCheck: { position: 'absolute', top: 10, left: 10, zIndex: 2, width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                alignItems: 'center', justifyContent: 'center' },
    cardSel: { transform: [{ scale: 0.95 }], opacity: 0.85 },
    selBarWrap: { position: 'absolute', left: 12, right: 12, bottom: 24 + bot },
    selBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    selAction: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 6, minWidth: 64 },
    selActionText: { fontSize: 14, color: c.text, fontWeight: '500' },
    trashBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    trashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    trashBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
    undoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, height: 44 },
    undoBtn: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
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
    folderInput: { flex: 1, minWidth: 0, width: 0, color: c.text, fontSize: 16, paddingVertical: 12,
                   ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0, borderWidth: 0, backgroundColor: 'transparent' } : null) },
    folderDot: { width: 8, height: 8, borderRadius: 4 },
    colorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginRight: 14 },
    colorBig: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
    progPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
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

    toastWrap: { position: 'absolute', bottom: 110 + bot, alignSelf: 'center', maxWidth: '92%' },
    toastText: { color: c.text, fontSize: 14, paddingHorizontal: 18, paddingVertical: 10 },
  });
}
