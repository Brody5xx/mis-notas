import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Image, ScrollView,
  Pressable, StyleSheet, StatusBar, BackHandler, Alert, SafeAreaView,
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
  /* Noche: vidrio grafito neutro */
  dark: {
    grad: ['#111215', '#111215', '#111215'],
    blobs: [
      { color: '#7c4dff', x: 0.05, y: 0.12, s: 1.05 },
      { color: '#00d4ff', x: 0.95, y: 0.45, s: 0.95 },
      { color: '#ff5e3a', x: 0.15, y: 0.92, s: 0.9 },
    ],
    bgImage: BG_DARK,
    frost: 'rgba(255,255,255,0.02)',
    text: '#f4f5f7', muted: 'rgba(240,241,244,0.6)', border: 'rgba(255,255,255,0.16)', accent: '#ff8a3d',
    fill: 'rgba(255,255,255,0.04)',            // relleno blanco 4%
    strong: 'rgba(28,29,33,0.80)',             // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.28)'],
    sheen: 'rgba(255,255,255,0.07)',
    hi: 'rgba(255,255,255,0.28)',              // brillo interno arriba
    lo: 'rgba(0,0,0,0.30)',                    // sombra interna abajo
    dockFill: 'rgba(255,255,255,0.05)',
    scrim: 'rgba(0,0,0,0.35)',
    bar: 'light-content',
    inv: '#111215',
    wallDim: 'rgba(0,0,0,0.38)',
    card: 'transparent',
  },
  /* Día: vidrio esmerilado plateado neutro */
  light: {
    grad: ['#e6e7ea', '#e6e7ea', '#e6e7ea'],
    blobs: [
      { color: '#a78bfa', x: 0.05, y: 0.12, s: 1.05 },
      { color: '#38d6f5', x: 0.95, y: 0.45, s: 0.95 },
      { color: '#ffa36b', x: 0.15, y: 0.92, s: 0.9 },
    ],
    bgImage: BG_LIGHT,
    frost: 'rgba(255,255,255,0.04)',
    text: '#16181d', muted: 'rgba(22,24,29,0.55)', border: 'rgba(22,24,29,0.12)', accent: '#ff7a2a',
    fill: 'rgba(255,255,255,0.40)',
    strong: 'rgba(255,255,255,0.85)',
    stroke: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.75)'],
    sheen: 'rgba(255,255,255,0.35)',
    hi: 'rgba(255,255,255,0.90)',
    lo: 'rgba(0,0,0,0.07)',
    dockFill: 'rgba(255,255,255,0.45)',
    scrim: 'rgba(0,0,0,0.15)',
    bar: 'dark-content',
    inv: '#ffffff',
    wallDim: 'rgba(255,255,255,0.40)',
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
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: 0.5 }, style]}
    >
      <View style={{ flexGrow: 1, borderRadius: radius - 0.5, overflow: 'hidden', backgroundColor: strong ? t.strong : t.fill }}>
        {/* reflejo diagonal */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.sheen, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 0.9 }}
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
    const opened = openedRef.current;          // cómo estaba al abrirla (se guarda antes de cerrar)
    const finish = () => {
      // Si la nota quedó vacía, se descarta
      setNotes(ns => ns.filter(n => !(n.id === id && isEmpty(n))));
      setCurrentId(cur => (cur === id ? null : cur));
      setCropOpen(false);
      setTitleColorOpen(false);
      setOptsOpen(false);
      setUnlocked(u => { const c2 = { ...u }; delete c2[id]; return c2; });   // se vuelve a bloquear
      setHistOpen(false); setHistView(null);
      setTimeout(() => saveVersionIfChanged(id, opened), 400);
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
  async function saveVersionIfChanged(id, opened) {
    const n = notesRef.current.find(x => x.id === id);
    if (!n || !opened || opened.id !== id || isEmpty(n)) return;
    const now = versionOf(n);
    if (sameVersion(now, opened.v)) return;              // no cambió nada
    const list = await loadHistory(id);
    if (!list.length && !isEmpty({ ...n, ...opened.v, hasWall: false, ink: opened.v.ink })) {
      await addVersion(id, opened.v);                    // la primera vez, guarda cómo estaba antes
    }
    await addVersion(id, now);
  }
  function openHistory() {
    const id = current.id;
    const show = () => {
      flushEditor(async () => {
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
    flushEditor(async () => {
      const n = notesRef.current.find(x => x.id === id);
      if (n) await addVersion(id, versionOf(n));          // así puedes volver a como estaba
      patch(id, { title: v.title, titleHtml: v.titleHtml, content: v.content, html: v.html, ...(v.ink ? { ink: v.ink } : {}) });
      openedRef.current = { id, v: versionOf({ ...n, ...v }) };
      setHistOpen(false); setHistView(null);
      setEditorRev(r => r + 1);                            // recargar el editor con la versión
      showToast('✓ Versión restaurada');
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

  function destroy() {
    const id = current.id;
    confirmAsk('Eliminar nota', '¿Eliminar esta nota para siempre? No se puede deshacer.', 'Eliminar', () => {
      setNotes(ns => ns.filter(n => n.id !== id));
      saveWallpaper(null, id).catch(() => {});
      saveHistory(id, []).catch(() => {});
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
  }, [currentId]);

  // Si sales de la app con una nota abierta, también se guarda una versión
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active' || !currentId) return;
      const id = currentId, opened = openedRef.current;
      flushEditor(() => saveVersionIfChanged(id, opened));
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
  }, [currentId, menuOpen, searchOpen, cropOpen, wallOpen, newOpen, pinPad, folderEdit, moveOpen, optsOpen, sortOpen, histOpen, histView]);

  /* ---------- Notas que se muestran ---------- */
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
                      Se guarda una versión cada vez que sales de la nota después de cambiarla. Toca una para verla o restaurarla.
                    </Text>
                    <TouchableOpacity onPress={saveVersionNow} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
                      <Feather name="save" size={18} color={c.inv} />
                      <Text style={[s.wallBtnText, { color: c.inv }]}>Guardar versión ahora</Text>
                    </TouchableOpacity>
                    <ScrollView style={{ maxHeight: 340, marginTop: 12 }}>
                      {histList.length === 0 && (
                        <Text style={[s.emptyText, { paddingVertical: 24 }]}>Todavía no hay versiones guardadas.</Text>
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
                      Lo que tienes ahora se guarda en el historial, así puedes volver.
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
      <View style={s.topbar}>
        <IconBtn name="menu" onPress={() => setMenuOpen(true)} s={s} t={c} />
        <View style={{ flex: 1 }} />
        <IconBtn name="search" onPress={toggleSearch} s={s} t={c} />
        <IconBtn set="mci" name="sort" onPress={() => setSortOpen(true)} s={s} t={c} />
        <IconBtn name={isGrid ? 'list' : 'grid'} onPress={() => setLayout(isGrid ? 'list' : 'grid')} s={s} t={c} />
        <IconBtn name={dark ? 'sun' : 'moon'} onPress={() => setDark(!dark)} s={s} t={c} />
      </View>

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
              onPress={() => openNote(item)}
              style={isGrid ? { width: cardW } : null}
            >
              <Glass t={c} radius={22} inner={[s.cardInner, isGrid && { minHeight: 150 }]}>
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
                    {item.kind === 'draw' && <Feather name="edit-2" size={13} color={c.muted} />}
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

      {/* Botón flotante con brillo */}
      {view !== 'trash' && (
        <TouchableOpacity style={s.fabWrap} onPress={() => setNewOpen(true)} activeOpacity={0.85}>
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

      {/* Catálogo: tipo de nota nueva */}
      <Modal visible={newOpen} transparent animationType="fade" onRequestClose={() => setNewOpen(false)}>
        <Pressable style={[s.newScrim, { backgroundColor: c.scrim }]} onPress={() => setNewOpen(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420 }}>
            <Text style={s.newTitle}>Nueva nota</Text>
            {[
              ['text', 'file-text', 'Nota', 'Texto, fotos y formato.'],
              ['draw', 'edit-2', 'Nota con dibujo', 'Escribe y dibuja sobre un fondo. Ideal para estudiar.'],
            ].map(([kind, icon, title, desc]) => (
              <TouchableOpacity key={kind} activeOpacity={0.8} onPress={() => newNote(kind)} style={{ marginBottom: 12 }}>
                <Glass t={c} strong radius={24} inner={s.newCard}>
                  <View style={[s.newIcon, { backgroundColor: c.text }]}>
                    <Feather name={icon} size={22} color={c.inv} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.newCardTitle}>{title}</Text>
                    <Text style={s.newCardDesc}>{desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={c.muted} />
                </Glass>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

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
    heroTitle: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
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
    undoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, height: 44 },
    undoBtn: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
    histLockBadge: { position: 'absolute', right: 8, bottom: 9 },
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
