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
    grad: ['#1c1a1d', '#1c1a1d', '#1c1a1d'],
    bgImage: BG_DARK,
    frost: 'rgba(255,255,255,0.02)',
    text: '#ffffff', muted: 'rgba(255,255,255,0.68)', border: 'rgba(255,255,255,0.18)', accent: '#ff8a3d',
    fill: 'rgba(255,255,255,0.05)',            // vidrio casi transparente
    strong: 'rgba(40,36,40,0.80)',             // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.40)'],
    rim: 'rgba(255,255,255,0.14)',             // brillo interno del borde
    rim2: 'rgba(255,255,255,0.06)',
    sheen: 'rgba(255,255,255,0.18)',           // brillo de esquina
    hi: 'rgba(255,255,255,0.22)',              // brillo interno arriba
    lo: 'rgba(0,0,0,0.25)',                    // sombra interna abajo
    dockFill: 'rgba(255,255,255,0.08)',
    scrim: 'rgba(0,0,0,0.35)',
    bar: 'light-content',
    inv: '#1c1a1d',
    wallDim: 'rgba(0,0,0,0.30)',
    card: 'transparent',
  },
  /* Día: vidrio lechoso como el Centro de control (gris perla, brillo cálido arriba) */
  light: {
    grad: ['#97919a', '#97919a', '#97919a'],
    bgImage: BG_LIGHT,
    frost: 'rgba(255,255,255,0.05)',
    text: '#ffffff', muted: 'rgba(255,255,255,0.80)', border: 'rgba(255,255,255,0.40)', accent: '#ff7a2a',
    fill: 'rgba(255,255,255,0.06)',            // vidrio casi transparente, como los botones del iPhone
    strong: 'rgba(140,132,138,0.78)',          // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.60)'],
    rim: 'rgba(255,255,255,0.24)',             // brillo interno del borde
    rim2: 'rgba(255,255,255,0.10)',
    sheen: 'rgba(255,255,255,0.32)',           // brillo de esquina
    hi: 'rgba(255,255,255,0.50)',
    lo: 'rgba(0,0,0,0.06)',
    dockFill: 'rgba(255,255,255,0.10)',
    glassBright: 0.95,                         // la barra del editor un poco más oscura para ver los íconos
    scrim: 'rgba(60,54,58,0.28)',
    bar: 'light-content',
    inv: '#3a3538',
    wallDim: 'rgba(40,34,38,0.18)',
    card: 'transparent',
  },
};
const TITLES = { all: 'Todas las notas', fav: 'Favoritos', trash: 'Papelera' };

/* Carpetas, orden y etiquetas */
const FOLDER_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1',
                       '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#757575'];
const SORTS = [
  ['updated', 'clock', 'Última modificación'],
  ['created', 'calendar', 'Fecha de creación'],
  ['alpha', 'type', 'Alfabético (A-Z)'],
];
const TAG_RE = /#([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ-]*)/g;

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
    { text: 'Cancelar', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: onOk },
  ]);
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
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
    if (!out.includes(t)) out.push(t);
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
function Background({ t, wall, blur }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {wall ? (
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
    <LinearGradient
      colors={t.stroke}
      locations={t.stroke.length === 4 ? [0, 0.4, 0.6, 1] : [0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: 0.5 }, style]}
    >
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
    </LinearGradient>
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
  const [view, setView] = useState('all');        // 'all', 'fav', 'trash'
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
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
      saveData({ notes, layout, dark, wallBlur, folders, sortBy, pinHash }).catch(() => showToast('No se pudo guardar'));
    }, 500);
    return () => clearTimeout(t);
  }, [notes, layout, dark, wallBlur, folders, sortBy, pinHash, loaded]);

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
    try { await saveHistory(id, next); } catch (e) { showToast('No se pudo guardar el historial'); }
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
    confirmAsk('Poner el registro en la nota',
      'La nota tendrá todo lo del registro, incluido lo que habías borrado. Lo que tiene ahora se reemplaza.', 'Restaurar', () => {
        flushEditor(() => {
          patch(id, { content: recordToHtml(recEntries), html: true });
          setHistOpen(false); setHistView(null);
          setEditorRev(r => r + 1);
          showToast('✓ Registro restaurado en la nota');
        });
      });
  }
  function clearRecord() {
    const id = current.id;
    confirmAsk('Vaciar registro', 'Se borra todo el registro de esta nota. La nota no cambia.', 'Vaciar', () => {
      const n = notesRef.current.find(x => x.id === id);
      recCache.current[id] = { e: n ? noteTokens(n) : [], at: Date.now() };
      saveRecord(id, recCache.current[id]).catch(() => {});
      setRecEntries(recCache.current[id].e);
      showToast('Registro vaciado');
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
    if (current.histLocked) askPin('unlock', 'Historial protegido', show);
    else show();
  }
  function saveVersionNow() {
    const id = current.id;
    flushEditor(async () => {
      const n = notesRef.current.find(x => x.id === id);
      if (!n) return;
      const list = await loadHistory(id);
      if (sameVersion(list[0], versionOf(n))) { showToast('Esta versión ya está guardada'); return; }
      setHistList(await addVersion(id, versionOf(n)));
      showToast('✓ Versión guardada');
    });
  }
  function restoreVersion(v) {
    const id = current.id;
    confirmAsk('Restaurar versión', 'La nota volverá a como estaba en esta versión. Lo que escribiste queda en el Registro.', 'Restaurar', () => {
      flushEditor(() => {
        updateRecord(notesRef.current.find(x => x.id === id));
        patch(id, { title: v.title, titleHtml: v.titleHtml, content: v.content, html: v.html, ...(v.ink ? { ink: v.ink } : {}) });
        setHistOpen(false); setHistView(null);
        setEditorRev(r => r + 1);                          // recargar el editor con la versión
        showToast('✓ Versión restaurada');
      });
    });
  }
  function deleteVersion(v) {
    const id = current.id;
    confirmAsk('Borrar versión', '¿Borrar esta versión del historial?', 'Borrar', async () => {
      const next = (await loadHistory(id)).filter(x => x.at !== v.at);
      await saveHistory(id, next);
      setHistList(next); setHistView(null);
    });
  }
  function toggleHistLock() {
    const id = current.id;
    if (current.histLocked) {
      askPin('unlock', 'Escribe tu PIN para quitar la protección', () => {
        patch(id, { histLocked: false }, false); showToast('Historial sin PIN');
      });
      return;
    }
    const lockIt = () => { patch(id, { histLocked: true }, false); showToast('Historial protegido con PIN'); };
    if (!pinHash) askPin('set1', 'Crea un PIN de 4 números', lockIt);
    else lockIt();
  }

  function toggleFav() {
    patch(current.id, { fav: !current.fav }, false);
    showToast(current.fav ? 'Quitada de favoritos' : 'Añadida a favoritos');
  }

  function togglePin() {
    patch(current.id, { pinned: !current.pinned }, false);
    showToast(current.pinned ? 'Nota desfijada' : 'Nota fijada arriba');
  }

  function moveToTrash() {
    if (isEmpty(current)) { closeEditor(); return; }
    patch(current.id, { deleted: true }, false);
    setCurrentId(null);
    showToast('Movida a la papelera');
  }

  function restore() {
    patch(current.id, { deleted: false }, false);
    setCurrentId(null);
    showToast('Nota restaurada');
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
      const t = (n.title || '').trim() || 'Sin título';
      return n.locked ? `${t}\n(Nota bloqueada)` : `${t}\n${toPlain(n)}`.trim();
    }).join('\n\n────────\n\n');
    try {
      await Share.share({ message: text, title: list.length === 1 ? (list[0].title || 'Nota') : 'Mis notas' });
      clearSelection();
    } catch (e) {
      showToast('No se puede compartir desde aquí. Prueba en el teléfono.');
    }
  }
  function trashSelected() {
    const ids = selIds;
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: true, pinned: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? 'Movida a la papelera' : `${ids.length} notas movidas a la papelera`);
  }
  function restoreSelected() {
    const ids = selIds;
    setNotes(ns => ns.map(n => (selected[n.id] ? { ...n, deleted: false } : n)));
    clearSelection();
    showToast(ids.length === 1 ? 'Nota recuperada' : `${ids.length} notas recuperadas`);
  }
  function destroySelected() {
    const ids = selIds;
    confirmAsk('Eliminar para siempre',
      ids.length === 1 ? '¿Eliminar esta nota para siempre? No se puede deshacer.' : `¿Eliminar ${ids.length} notas para siempre? No se puede deshacer.`,
      'Eliminar', () => {
        setNotes(ns => ns.filter(n => !ids.includes(n.id)));
        ids.forEach(purgeFiles);
        clearSelection();
        showToast(ids.length === 1 ? 'Nota eliminada' : `${ids.length} notas eliminadas`);
      });
  }
  function restoreAllTrash() {
    const n = notes.filter(x => x.deleted).length;
    if (!n) return;
    setNotes(ns => ns.map(x => (x.deleted ? { ...x, deleted: false } : x)));
    showToast(n === 1 ? 'Nota recuperada' : `${n} notas recuperadas`);
  }
  function emptyTrash() {
    const ids = notes.filter(x => x.deleted).map(x => x.id);
    if (!ids.length) return;
    confirmAsk('Vaciar papelera',
      `Se eliminarán ${ids.length === 1 ? '1 nota' : ids.length + ' notas'} para siempre. No se puede deshacer.`, 'Vaciar', () => {
        setNotes(ns => ns.filter(x => !x.deleted));
        ids.forEach(purgeFiles);
        clearSelection();
        showToast('Papelera vacía');
      });
  }

  function destroy() {
    const id = current.id;
    confirmAsk('Eliminar nota', '¿Eliminar esta nota para siempre? No se puede deshacer.', 'Eliminar', () => {
      setNotes(ns => ns.filter(n => n.id !== id));
      purgeFiles(id);
      setCurrentId(null);
      showToast('Nota eliminada');
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
        showToast('Fondo aplicado solo a esta nota');
      } else {
        await saveWallpaper(data);
        setWallpaper(data);
        showToast('Fondo de pantalla aplicado');
      }
    } catch (e) {
      showToast('No se pudo usar esa imagen');
    }
  }

  async function removeWallpaper() {
    if (wallFor) {
      await saveWallpaper(null, wallFor).catch(() => {});
      setNoteWall(null);
      patch(wallFor, { hasWall: false }, false);
      showToast('Fondo de la nota quitado');
    } else {
      await saveWallpaper(null).catch(() => {});
      setWallpaper(null);
      showToast('Fondo original restaurado');
    }
  }

  function openWall(target) { setWallFor(target || null); setWallOpen(true); }

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
    if (!name) { showToast('Escribe un nombre para la carpeta'); return; }
    if (folderEdit.id) {
      setFolders(fs => fs.map(f => (f.id === folderEdit.id ? { ...f, name, color: folderEdit.color } : f)));
      showToast('Carpeta actualizada');
    } else {
      const f = { id: 'f' + Date.now().toString(36), name, color: folderEdit.color };
      setFolders(fs => [...fs, f]);
      if (folderEdit.assignTo) { patch(folderEdit.assignTo, { folderId: f.id }, false); showToast('Nota movida a ' + name); }
      else showToast('Carpeta creada');
    }
    setFolderEdit(null);
  }
  function deleteFolder(f) {
    confirmAsk('Eliminar carpeta', 'Las notas de "' + f.name + '" no se borran: quedan en "Todas las notas".', 'Eliminar', () => {
      setFolders(fs => fs.filter(x => x.id !== f.id));
      setNotes(ns => ns.map(n => (n.folderId === f.id ? { ...n, folderId: undefined } : n)));
      if (view === 'f:' + f.id) setView('all');
      setFolderEdit(null);
      showToast('Carpeta eliminada');
    });
  }
  function moveTo(folderId) {
    patch(current.id, { folderId: folderId || undefined }, false);
    setMoveOpen(false);
    const f = folders.find(x => x.id === folderId);
    showToast(f ? 'Movida a ' + f.name : 'Quitada de la carpeta');
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
        else { setPinEntry(''); showToast('PIN incorrecto'); }
      } else if (pad.mode === 'set1') {
        setPinPad({ mode: 'set2', title: 'Confirma tu PIN', first: next });
        setPinEntry('');
      } else if (pad.mode === 'set2') {
        if (next === pad.first) {
          setPinHash(hashPin(next)); setPinPad(null); setPinEntry('');
          pinOkRef.current && pinOkRef.current();
        } else {
          setPinPad({ mode: 'set1', title: 'Los PIN no coinciden. Crea tu PIN otra vez' });
          setPinEntry('');
        }
      }
    }, 120);
  }
  function toggleLock() {
    setOptsOpen(false);
    const id = current.id;
    if (current.locked) {
      askPin('unlock', 'Escribe tu PIN para quitar el bloqueo', () => {
        patch(id, { locked: false }, false); showToast('Bloqueo quitado');
      });
      return;
    }
    const lockIt = () => {
      patch(id, { locked: true }, false);
      setUnlocked(u => ({ ...u, [id]: true }));      // sigue abierta hasta que salgas
      showToast('Nota bloqueada con PIN');
    };
    if (!pinHash) askPin('set1', 'Crea un PIN de 4 números', lockIt);
    else lockIt();
  }
  function changePin() {
    setMenuOpen(false);
    if (!pinHash) { askPin('set1', 'Crea un PIN de 4 números', () => showToast('PIN creado')); return; }
    askPin('unlock', 'Escribe tu PIN actual', () => {
      setTimeout(() => askPin('set1', 'Escribe tu PIN nuevo', () => showToast('PIN cambiado')), 200);
    });
  }
  function openNote(n) {
    if (n.locked && !unlocked[n.id]) {
      askPin('unlock', 'Nota bloqueada', () => {
        setUnlocked(u => ({ ...u, [n.id]: true }));
        setCurrentId(n.id);
      });
      return;
    }
    setCurrentId(n.id);
  }

  function toggleSearch() {
    if (searchOpen) setQuery('');
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
      kind: current.kind, ink: current.ink,
    });
  }, [currentId, dark, current && current.deleted, editorRev]);

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
  const viewTitle = viewFolder ? viewFolder.name : viewTag ? '#' + viewTag : (TITLES[view] || TITLES.all);

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
            <Text style={s.wallTitle}>{wallFor ? 'Fondo de esta nota' : 'Fondo de pantalla'}</Text>
            <Text style={s.wallHint}>{wallFor ? 'Solo se verá dentro de esta nota.' : 'Se verá en el menú principal.'}</Text>

            <View style={s.wallPreview}>
              <Background t={c} wall={wallData} blur={wallBlurNow} />
              <Text style={[s.wallPreviewText, { color: c.text }]}>Vista previa</Text>
            </View>

            <TouchableOpacity onPress={pickWallpaper} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
              <Feather name="image" size={18} color={c.inv} />
              <Text style={[s.wallBtnText, { color: c.inv }]}>Elegir de la galería</Text>
            </TouchableOpacity>

            {wallData && (
              <>
                <Text style={s.wallLabel}>Desenfoque</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[['Nada', -1], ['Poco', 0], ['Suave', 8], ['Fuerte', 20]].map(([label, v]) => (
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
                  <Text style={{ color: c.muted, fontSize: 15, marginLeft: 6 }}>{wallFor ? 'Quitar fondo de la nota' : 'Quitar mi fondo'}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setWallOpen(false)} style={{ alignSelf: 'center', padding: 10, marginTop: 6 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Listo</Text>
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
              <Text style={s.wallTitle}>{folderEdit.id ? 'Editar carpeta' : 'Nueva carpeta'}</Text>
              <View style={[s.folderInputWrap, { borderColor: c.border }]}>
                <Feather name="folder" size={20} color={folderEdit.color} />
                <TextInput
                  style={s.folderInput}
                  value={folderEdit.name}
                  onChangeText={tx => setFolderEdit(f => ({ ...f, name: tx }))}
                  placeholder="Nombre de la carpeta"
                  placeholderTextColor={c.muted}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <Text style={s.wallLabel}>Color</Text>
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
                <Text style={[s.wallBtnText, { color: c.inv }]}>Guardar</Text>
              </TouchableOpacity>
              {folderEdit.id && (
                <TouchableOpacity onPress={() => deleteFolder(folderEdit)} style={s.wallRemove}>
                  <Feather name="trash-2" size={16} color="#e53935" />
                  <Text style={{ color: '#e53935', fontSize: 15, marginLeft: 6 }}>Eliminar carpeta</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFolderEdit(null)} style={{ alignSelf: 'center', padding: 10, marginTop: 4 }}>
                <Text style={{ color: c.muted, fontSize: 16 }}>Cancelar</Text>
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
              <Text style={[s.wallHint, { textAlign: 'center' }]}>Guárdalo bien: si lo olvidas no se puede recuperar.</Text>
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
              <Text style={{ color: c.muted, fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </Glass>
        )}
      </View>
    </Modal>
  );

  /* ---------- Elegir orden ---------- */
  const sortSheet = (
    <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Ordenar por" s={s} t={c}>
      {SORTS.map(([k, icon, label]) => (
        <Row key={k} icon={icon} label={label} s={s} t={c}
          onPress={() => { setSortBy(k); setSortOpen(false); }}
          right={sortBy === k ? <Feather name="check" size={20} color={c.text} /> : null} />
      ))}
    </Sheet>
  );

  if (!loaded) return <View style={s.screen} />;

  /* ============================================================
     PANTALLA DEL EDITOR
     ============================================================ */
  if (current) {
    const inTrash = current.deleted;
    return (
      <View style={s.screen}>
        {/* Cada nota usa SOLO su propio fondo; si no tiene, el vidrio por defecto */}
        <Background t={c} wall={noteWall} blur={current.wallBlur ?? 8} />
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
                <Text style={s.bannerText}>Esta nota está en la papelera. Restáurala para editarla.</Text>
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
        <Sheet visible={optsOpen} onClose={() => setOptsOpen(false)} title="Opciones de la nota" s={s} t={c}>
          <Row icon="folder" iconColor={(folders.find(f => f.id === current.folderId) || {}).color} s={s} t={c}
            label={'Carpeta: ' + ((folders.find(f => f.id === current.folderId) || {}).name || 'Ninguna')}
            onPress={() => { setOptsOpen(false); setMoveOpen(true); }}
            right={<Feather name="chevron-right" size={18} color={c.muted} />} />
          <Row icon={current.locked ? 'unlock' : 'lock'} s={s} t={c}
            label={current.locked ? 'Quitar bloqueo' : 'Bloquear con PIN'} onPress={toggleLock} />
          <TouchableOpacity onPress={() => { setOptsOpen(false); togglePin(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.pinned ? 'pin-off-outline' : 'pin-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text style={s.rowText}>{current.pinned ? 'Desfijar' : 'Fijar arriba'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOptsOpen(false); toggleFav(); }} activeOpacity={0.6} style={s.row}>
            <MaterialCommunityIcons name={current.fav ? 'star' : 'star-outline'} size={20} color={c.text} style={{ marginRight: 14 }} />
            <Text style={s.rowText}>{current.fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}</Text>
          </TouchableOpacity>
          <Row icon="trash-2" label="Mover a la papelera" danger s={s} t={c} onPress={() => { setOptsOpen(false); moveToTrash(); }} />
        </Sheet>

        {/* Mover a carpeta */}
        <Sheet visible={moveOpen} onClose={() => setMoveOpen(false)} title="Mover a carpeta" s={s} t={c}>
          <Row icon="inbox" label="Sin carpeta" s={s} t={c} onPress={() => moveTo(null)}
            right={!current.folderId ? <Feather name="check" size={20} color={c.text} /> : null} />
          {folders.map(f => (
            <Row key={f.id} icon="folder" iconColor={f.color} label={f.name} s={s} t={c} onPress={() => moveTo(f.id)}
              right={current.folderId === f.id ? <Feather name="check" size={20} color={c.text} /> : null} />
          ))}
          <Row icon="plus" label="Nueva carpeta" s={s} t={c} onPress={() => openFolderEdit(null, current.id)} />
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
                      <Text style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]}>Historial</Text>
                      <TouchableOpacity onPress={() => setHistOpen(false)} hitSlop={10}>
                        <Feather name="x" size={22} color={c.muted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.wallHint, { marginTop: 6 }]}>
                      El Registro guarda solo todo lo que escribes, aunque lo borres. Las versiones se guardan cuando tú quieras.
                    </Text>
                    <TouchableOpacity onPress={openRecord} activeOpacity={0.7}>
                      <Glass t={c} radius={18} style={{ marginBottom: 12 }} inner={s.histRow}>
                        <View style={[s.recIcon, { backgroundColor: c.text }]}>
                          <Feather name="book-open" size={18} color={c.inv} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.recTitle}>Registro</Text>
                          <Text style={s.histDate}>
                            {((recCache.current[current.id] || {}).e || []).length} renglón(es) · se actualiza solo
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={c.muted} />
                      </Glass>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveVersionNow} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="save" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>Guardar versión ahora</Text>
                    </TouchableOpacity>
                    <Text style={[s.sideHeaderText, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>VERSIONES GUARDADAS</Text>
                    <ScrollView style={{ maxHeight: 260 }}>
                      {histList.length === 0 && (
                        <Text style={[s.emptyText, { paddingVertical: 16 }]}>Toca "Guardar versión ahora" para guardar una copia exacta de la nota.</Text>
                      )}
                      {histList.map((v, i) => (
                        <TouchableOpacity key={v.at} onPress={() => setHistView(v)} activeOpacity={0.7}>
                          <Glass t={c} radius={16} style={{ marginBottom: 8 }} inner={s.histRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.histDate}>{fmtDate(v.at)}{i === 0 ? '  · más reciente' : ''}</Text>
                              <Text style={s.histPrev} numberOfLines={2}>
                                {(v.title ? v.title + ' — ' : '') + (toPlain(v) || (v.ink && v.ink.length ? 'Dibujo' : 'Vacía'))}
                              </Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={c.muted} />
                          </Glass>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity onPress={toggleHistLock} style={[s.row, { paddingHorizontal: 4, paddingBottom: 4 }]} activeOpacity={0.7}>
                      <Feather name={current.histLocked ? 'lock' : 'unlock'} size={18} color={c.text} style={{ marginRight: 12 }} />
                      <Text style={s.rowText}>{current.histLocked ? 'Historial protegido con PIN' : 'Proteger historial con PIN'}</Text>
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
                      <Text style={[s.wallTitle, { marginLeft: 10, marginBottom: 0, flex: 1 }]}>Registro</Text>
                      <TouchableOpacity onPress={clearRecord} hitSlop={10}>
                        <Feather name="trash-2" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.wallHint, { marginTop: 6, marginBottom: 0 }]}>Todo lo que has escrito en esta nota, incluso lo que borraste.</Text>
                    <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
                      {recEntries.length === 0 && <Text style={[s.emptyText, { paddingVertical: 16 }]}>El registro está vacío.</Text>}
                      {recEntries.map((e, i) => (e[0] === REC_IMG
                        ? <Image key={i} source={{ uri: e.slice(1) }} style={[s.thumb, { height: 120, marginVertical: 4 }]} resizeMode="cover" />
                        : <Text key={i} style={[s.histViewText, { marginBottom: 6 }]}>{e}</Text>))}
                    </ScrollView>
                    <TouchableOpacity onPress={restoreRecord} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>Poner todo en la nota</Text>
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
                        <Text style={[s.histDate, { marginTop: 8 }]}>✏️ Incluye {histView.ink.length} trazo(s) de dibujo</Text>
                      )}
                    </ScrollView>
                    <TouchableOpacity onPress={() => restoreVersion(histView)} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="rotate-ccw" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>Restaurar esta versión</Text>
                    </TouchableOpacity>
                    <Text style={[s.wallHint, { textAlign: 'center', marginTop: 10, marginBottom: 0 }]}>
                      Lo que tienes ahora queda guardado en el Registro.
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
    ? ['search', 'Ninguna nota coincide con la búsqueda.']
    : viewFolder ? ['folder', 'Esta carpeta está vacía.\nToca el lápiz para crear una nota aquí.']
    : viewTag ? ['hash', 'Ninguna nota tiene esta etiqueta.']
    : ({ all: ['file-text', 'No hay notas todavía.\nToca el lápiz para crear la primera.'],
        fav: ['star', 'Aún no tienes favoritos.'],
        trash: ['trash-2', 'La papelera está vacía.'] }[view] || ['file-text', '']);

  return (
    <View style={s.screen}>
      <Background t={c} wall={wallpaper} blur={wallBlur} />
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
              <Text style={s.selAllText}>{selIds.length === visible.length ? 'Ninguna' : 'Todas'}</Text>
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
              <Text style={s.heroCount}>{visible.length} {visible.length === 1 ? 'nota' : 'notas'}</Text>
            </View>
            {view === 'trash' && counts.trash > 0 && !selMode && (
              <View style={s.trashBtns}>
                <TouchableOpacity onPress={restoreAllTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="rotate-ccw" size={18} color={c.text} />
                    <Text style={s.trashBtnText}>Recuperar todo</Text>
                  </Glass>
                </TouchableOpacity>
                <TouchableOpacity onPress={emptyTrash} activeOpacity={0.75} style={{ flex: 1 }}>
                  <Glass t={c} radius={18} inner={s.trashBtn}>
                    <Feather name="trash-2" size={18} color="#e53935" />
                    <Text style={[s.trashBtnText, { color: '#e53935' }]}>Vaciar papelera</Text>
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
                  placeholder="Buscar notas..."
                  placeholderTextColor={c.muted}
                  autoFocus
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
                    )) : 'Sin título'}
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
                    <Text style={[s.preview, { flex: 0, marginTop: 6, marginBottom: 0 }]}>Nota bloqueada</Text>
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
                  <Text style={s.selActionText}>Recuperar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={destroySelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color="#e53935" />
                  <Text style={[s.selActionText, { color: '#e53935' }]}>Eliminar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={shareSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="share-2" size={24} color={c.text} />
                  <Text style={s.selActionText}>Compartir</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={trashSelected} style={s.selAction} activeOpacity={0.6}>
                  <Feather name="trash-2" size={24} color={c.text} />
                  <Text style={s.selActionText}>Papelera</Text>
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
            <Text style={s.sideTitle}>Mis Notas</Text>
            {[['all', 'file-text'], ['fav', 'star'], ['trash', 'trash-2']].map(([key, icon]) => (
              <TouchableOpacity key={key} onPress={() => { setView(key); setMenuOpen(false); }} activeOpacity={0.7}>
                {view === key ? (
                  <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>
                    <Feather name={icon} size={19} color={c.text} style={s.navIcon} />
                    <Text style={[s.navText, { fontWeight: '700' }]}>{TITLES[key]}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </Glass>
                ) : (
                  <View style={[s.navItem, { marginBottom: 4 }]}>
                    <Feather name={icon} size={19} color={c.muted} style={s.navIcon} />
                    <Text style={s.navText}>{TITLES[key]}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <View style={s.sep} />

            {/* Carpetas */}
            <View style={s.sideHeader}>
              <Text style={s.sideHeaderText}>CARPETAS</Text>
              <TouchableOpacity onPress={() => openFolderEdit(null)} hitSlop={10}>
                <Feather name="plus" size={20} color={c.text} />
              </TouchableOpacity>
            </View>
            {folders.length === 0 && (
              <TouchableOpacity style={s.navItem} onPress={() => openFolderEdit(null)} activeOpacity={0.7}>
                <Feather name="folder-plus" size={19} color={c.muted} style={s.navIcon} />
                <Text style={[s.navText, { color: c.muted }]}>Crear carpeta</Text>
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
                <View style={s.sideHeader}><Text style={s.sideHeaderText}>ETIQUETAS</Text></View>
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
              <Text style={s.navText}>Fondo de pantalla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={changePin}>
              <Feather name="key" size={19} color={c.muted} style={s.navIcon} />
              <Text style={s.navText}>{pinHash ? 'Cambiar PIN' : 'Crear PIN de bloqueo'}</Text>
            </TouchableOpacity>
           </ScrollView>
          </Glass>
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {wallModal}
      {sortSheet}
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
