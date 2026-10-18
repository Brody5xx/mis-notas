/* ============================================================
   boveda.js — la BÓVEDA: un lugar cifrado con tu contraseña
   para guardar contraseñas, correos, enlaces, notas secretas,
   fotos, videos y archivos.

   - Todo se guarda cifrado (ChaCha20 + sello HMAC, ver respaldo.js).
   - La contraseña nunca se guarda: solo se usa para sacar las llaves,
     que viven en la memoria mientras la bóveda está abierta.
   - Al cerrar la bóveda o salir de la app, se vuelve a bloquear.
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, FlatList, Image,
  ActivityIndicator, Platform, Linking, AppState, KeyboardAvoidingView, StatusBar, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { shareFile } from './compartir';
import { vaultKeys, seal, unseal, randomBytes, b64Encode, b64Decode, utf8Encode, utf8Decode } from './respaldo';

let FS = null;
if (Platform.OS !== 'web') {
  try { FS = require('expo-file-system'); } catch (e) { FS = null; }
}

const MAX_MB = 150;                       // tamaño máximo de un archivo o video
const TYPES = [
  // [tipo, ícono, texto (plural), texto (uno)]
  ['pass', 'key', 'vPasses', 'vPass'],
  ['mail', 'mail', 'vMails', 'vMail'],
  ['link', 'link', 'vLinks', 'vLink'],
  ['note', 'file-text', 'vNotes', 'vNote'],
  ['photo', 'image', 'vPhotos', 'vPhoto'],
  ['video', 'film', 'vVideos', 'vVideo'],
  ['file', 'paperclip', 'vFiles', 'vFile'],
];
const ICON = Object.fromEntries(TYPES.map(x => [x[0], x[1]]));
const FIELDS = {
  pass: ['title', 'user', 'pass', 'url', 'note'],
  mail: ['title', 'email', 'pass', 'note'],
  link: ['title', 'url', 'note'],
  note: ['title', 'note'],
  photo: ['title', 'note'], video: ['title', 'note'], file: ['title', 'note'],
};

/* ---------- Dónde se guarda (archivos en el teléfono / navegador) ----------
   En el navegador NO se usa AsyncStorage (localStorage), porque solo deja ~5 MB
   en total y los videos no caben. Se usa IndexedDB, que deja guardar archivos grandes.
   Lo que ya estaba guardado en localStorage se sigue leyendo y se pasa a IndexedDB. */
const WebDB = {
  db: null,
  open() {
    if (this.db) return this.db;
    this.db = new Promise((ok, no) => {
      try {
        const rq = indexedDB.open('misnotas_boveda', 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore('f'); } catch (e) {} };
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = () => { this.db = null; no(rq.error); };
      } catch (e) { this.db = null; no(e); }
    });
    return this.db;
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((ok, no) => {
      const tx = db.transaction('f', mode), st = tx.objectStore('f');
      let out;
      const rq = fn(st);
      if (rq) rq.onsuccess = () => { out = rq.result; };
      tx.oncomplete = () => ok(out);
      tx.onerror = () => no(tx.error);
      tx.onabort = () => no(tx.error || new Error('abort'));
    });
  },
  get(k) { return this.run('readonly', st => st.get(k)); },
  set(k, v) { return this.run('readwrite', st => st.put(v, k)); },
  del(k) { return this.run('readwrite', st => st.delete(k)); },
  keys() { return this.run('readonly', st => st.getAllKeys()); },
};
const useWebDB = () => !FS && typeof indexedDB !== 'undefined';

const Store = {
  dir() {
    const d = new FS.Directory(FS.Paths.document, 'boveda');
    if (!d.exists) d.create();
    return d;
  },
  async get(name) {
    if (FS) {
      try { const f = new FS.File(this.dir(), name); if (!f.exists) return null; return await f.text(); } catch (e) { return null; }
    }
    if (useWebDB()) {
      try {
        const v = await WebDB.get(name);
        if (v != null) return v;
      } catch (e) {}
      // Algo guardado antes en localStorage: pasarlo a IndexedDB
      const old = await AsyncStorage.getItem('boveda_' + name);
      if (old != null) {
        try { await WebDB.set(name, old); await AsyncStorage.removeItem('boveda_' + name); } catch (e) {}
      }
      return old;
    }
    return AsyncStorage.getItem('boveda_' + name);
  },
  async set(name, text) {
    if (FS) {
      const f = new FS.File(this.dir(), name);
      if (!f.exists) f.create();
      f.write(text);
      return;
    }
    if (useWebDB()) {
      await WebDB.set(name, text);
      try { await AsyncStorage.removeItem('boveda_' + name); } catch (e) {}
      return;
    }
    await AsyncStorage.setItem('boveda_' + name, text);
  },
  async del(name) {
    if (FS) { try { const f = new FS.File(this.dir(), name); if (f.exists) f.delete(); } catch (e) {} return; }
    if (useWebDB()) { try { await WebDB.del(name); } catch (e) {} }
    await AsyncStorage.removeItem('boveda_' + name);
  },
  async wipe(names) { for (const n of names) await this.del(n); },
};

/* ---------- Para "Transferir notas": la bóveda viaja tal cual (sigue cifrada con su contraseña) ---------- */
async function vaultNames() {
  if (FS) {
    try {
      const d = new FS.Directory(FS.Paths.document, 'boveda');
      if (!d.exists) return [];
      return d.list().filter(x => !(x instanceof FS.Directory)).map(x => x.name);
    } catch (e) { return []; }
  }
  const all = await AsyncStorage.getAllKeys();
  const names = all.filter(k => k.startsWith('boveda_')).map(k => k.slice(7));
  if (useWebDB()) {
    try { for (const k of await WebDB.keys()) if (!names.includes(String(k))) names.push(String(k)); } catch (e) {}
  }
  return names;
}
export async function exportVaultRaw() {
  const names = await vaultNames();
  if (!names.includes('meta.json')) return null;
  const files = {};
  for (const n of names) { const v = await Store.get(n); if (v != null) files[n] = v; }
  return files;
}
/* Devuelve 'ok' (se copió), 'exists' (este teléfono ya tiene otra bóveda) o 'none' */
export async function importVaultRaw(files) {
  if (!files || !files['meta.json']) return 'none';
  const mine = await Store.get('meta.json');
  if (mine && mine !== files['meta.json']) return 'exists';
  for (const n in files) {
    if (!/^[\w.\-]+$/.test(n)) continue;
    await Store.set(n, files[n]);
  }
  return 'ok';
}

/* Leer los bytes de una foto, video o archivo elegido */
async function readUriBytes(uri) {
  if (Platform.OS === 'web' || !FS) {
    const r = await fetch(uri);
    return new Uint8Array(await r.arrayBuffer());
  }
  const f = new FS.File(uri);
  if (typeof f.bytes === 'function') return await f.bytes();
  if (typeof f.base64 === 'function') return b64Decode(await f.base64());
  throw new Error('read');
}
function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}
function genPassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?-_+='];
  const all = sets.join('');
  const r = randomBytes(20);
  const out = sets.map((s, i) => s[r[i] % s.length]);
  for (let i = 4; i < 16; i++) out.push(all[r[i] % all.length]);
  for (let i = out.length - 1; i > 0; i--) { const j = r[i % 20] % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}
const newId = () => Date.now().toString(36) + b64Encode(randomBytes(6)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);

/* Mini página para elegir un archivo cualquiera (en el teléfono) */
const PICK_FILE_HTML = (label, c) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:transparent;height:100%}label{display:flex;align-items:center;justify-content:center;height:100%;
border:1.5px dashed ${c.border};border-radius:16px;color:${c.text};font:600 16px -apple-system,Roboto,sans-serif;box-sizing:border-box}
input{display:none}</style></head><body><label>📎 ${String(label).replace(/</g, '&lt;')}<input id="f" type="file"></label>
<script>document.getElementById('f').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;
if(f.size>${MAX_MB}*1048576){window.ReactNativeWebView.postMessage(JSON.stringify({big:true}));return;}
var r=new FileReader();r.onload=function(){window.ReactNativeWebView.postMessage(JSON.stringify({name:f.name,mime:f.type||'application/octet-stream',size:f.size,data:String(r.result).split(',')[1]||''}));};
r.readAsDataURL(f);});</script></body></html>`;

/* ============================================================
   LA BÓVEDA
   ============================================================ */
export default function Vault({ visible, onClose, s, t, tr, Glass }) {
  const [msg, setMsg] = useState('');
  const msgTimer = useRef(null);
  const toast = m => { setMsg(m); clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(''), 2200); };
  const [phase, setPhase] = useState('check');    // 'check' | 'create' | 'locked' | 'open'
  const [keys, setKeys] = useState(null);
  const [items, setItems] = useState([]);
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [show, setShow] = useState(false);
  const [err, setErr] = useState(''), [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [edit, setEdit] = useState(null);         // elemento abierto (copia para editar)
  const [media, setMedia] = useState(null);       // { kind, uri } vista de foto / video
  const [pickFile, setPickFile] = useState(false); // elegir archivo (teléfono)
  const [changePass, setChangePass] = useState(false);
  const tmpFiles = useRef([]);

  /* Al abrir: ¿ya existe una bóveda? */
  useEffect(() => {
    if (!visible) { lock(); return; }
    setErr(''); setP1(''); setP2(''); setShow(false);
    Store.get('meta.json').then(m => setPhase(m ? 'locked' : 'create')).catch(() => setPhase('create'));
  }, [visible]);
  /* Si la app se va al fondo, la bóveda se bloquea */
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st !== 'active' && keys) { lock(); setPhase('locked'); } });
    return () => sub && sub.remove && sub.remove();
  }, [keys]);

  function lock() {
    setKeys(null); setItems([]); setEdit(null); setMedia(null); setAddOpen(false); setMenuOpen(false);
    setPickFile(false); setChangePass(false); setQuery(''); setFilter('all');
    cleanTmp();
  }
  function cleanTmp() {
    if (FS) tmpFiles.current.forEach(f => { try { if (f.exists) f.delete(); } catch (e) {} });
    if (Platform.OS === 'web') tmpFiles.current.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    tmpFiles.current = [];
  }

  /* ---------- Guardar y leer cifrado ---------- */
  async function saveIndex(list, k = keys) {
    const sealed = await seal(k, utf8Encode(JSON.stringify(list)));
    await Store.set('index.bin', b64Encode(sealed));
  }
  async function loadIndex(k) {
    const txt = await Store.get('index.bin');
    if (!txt) return [];
    return JSON.parse(utf8Decode(await unseal(k, b64Decode(txt))));
  }
  async function readBlob(id) {
    const txt = await Store.get('f_' + id + '.bin');
    if (!txt) throw new Error('file');
    return unseal(keys, b64Decode(txt));
  }

  /* ---------- Crear / abrir ---------- */
  async function doCreate() {
    setErr('');
    if (p1.length < 6) { setErr(tr('bkShort')); return; }
    if (p1 !== p2) { setErr(tr('bkMismatch')); return; }
    setBusy(tr('bkWorking'));
    try {
      const salt = randomBytes(16);
      const k = await vaultKeys(p1, salt);
      const check = await seal(k, utf8Encode('boveda-ok'));
      await Store.set('meta.json', JSON.stringify({ v: 1, salt: b64Encode(salt), iter: 40000, check: b64Encode(check) }));
      await saveIndex([], k);
      setKeys(k); setItems([]); setPhase('open'); setP1(''); setP2('');
    } catch (e) { setErr(tr('exportFail')); }
    setBusy('');
  }
  async function doUnlock() {
    setErr('');
    if (!p1) return;
    setBusy(tr('vaultOpening'));
    try {
      const m = JSON.parse(await Store.get('meta.json'));
      const k = await vaultKeys(p1, b64Decode(m.salt), m.iter);
      await unseal(k, b64Decode(m.check));               // si la contraseña está mal, falla aquí
      const list = await loadIndex(k);
      setKeys(k); setItems(list); setPhase('open'); setP1('');
    } catch (e) {
      setErr(e && e.message === 'pass' ? tr('bkWrongPass') : tr('exportFail'));
    }
    setBusy('');
  }
  function askReset() {
    const go = async () => {
      setBusy('…');
      try {
        const names = ['meta.json', 'index.bin'];
        if (FS) { try { const d = new FS.Directory(FS.Paths.document, 'boveda'); if (d.exists) d.delete(); } catch (e) {} }
        else {
          const all = await AsyncStorage.getAllKeys();
          await AsyncStorage.multiRemove(all.filter(x => x.startsWith('boveda_')));
        }
        await Store.wipe(names);
      } catch (e) {}
      setBusy(''); lock(); setPhase('create');
    };
    if (Platform.OS === 'web') { if (window.confirm(tr('vaultResetMsg'))) go(); return; }
    Alert.alert(tr('vaultReset'), tr('vaultResetMsg'), [{ text: tr('cancel'), style: 'cancel' }, { text: tr('vaultReset'), style: 'destructive', onPress: go }]);
  }

  /* ---------- Cambiar contraseña: se vuelve a cifrar todo ---------- */
  async function doChangePass() {
    setErr('');
    if (p1.length < 6) { setErr(tr('bkShort')); return; }
    if (p1 !== p2) { setErr(tr('bkMismatch')); return; }
    setBusy(tr('bkWorking'));
    try {
      const salt = randomBytes(16);
      const k2 = await vaultKeys(p1, salt);
      for (const it of items) {
        if (!it.file) continue;
        const bytes = await readBlob(it.id);
        await Store.set('f_' + it.id + '.bin', b64Encode(await seal(k2, bytes)));
      }
      await saveIndex(items, k2);
      const check = await seal(k2, utf8Encode('boveda-ok'));
      await Store.set('meta.json', JSON.stringify({ v: 1, salt: b64Encode(salt), iter: 40000, check: b64Encode(check) }));
      setKeys(k2); setChangePass(false); setP1(''); setP2('');
      toast && toast(tr('vPassChanged'));
    } catch (e) { setErr(tr('exportFail')); }
    setBusy('');
  }

  /* ---------- Agregar ---------- */
  async function addMedia(kind, picked) {
    // picked = { bytes, name, mime }
    if (picked.bytes.length > MAX_MB * 1048576) { toast && toast(tr('vTooBig', { n: MAX_MB })); return; }
    setBusy(tr('vSaving'));
    try {
      const id = newId(), now = Date.now();
      await Store.set('f_' + id + '.bin', b64Encode(await seal(keys, picked.bytes)));
      const it = { id, type: kind, title: picked.name || tr(kind === 'photo' ? 'vPhoto' : kind === 'video' ? 'vVideo' : 'vFile'),
        note: '', created: now, updated: now, file: { name: picked.name || id, mime: picked.mime, size: picked.bytes.length } };
      const list = [it, ...items];
      await saveIndex(list);
      setItems(list);
      toast && toast(tr('vSaved'));
    } catch (e) { toast && toast(tr('exportFail')); }
    setBusy('');
  }
  async function pickMedia(kind) {
    setAddOpen(false);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [kind === 'video' ? 'videos' : 'images'], quality: 1, base64: kind === 'photo' });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      setBusy(tr('vSaving'));
      const bytes = a.base64 ? b64Decode(a.base64) : await readUriBytes(a.uri);
      const name = a.fileName || (kind === 'video' ? 'video.mp4' : 'foto.jpg');
      await addMedia(kind, { bytes, name, mime: a.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg') });
    } catch (e) { setBusy(''); toast && toast(tr('exportFail')); }
  }
  function pickAnyFile() {
    setAddOpen(false);
    if (Platform.OS === 'web') {
      const inp = document.createElement('input'); inp.type = 'file';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        if (f.size > MAX_MB * 1048576) { toast && toast(tr('vTooBig', { n: MAX_MB })); return; }
        const bytes = new Uint8Array(await f.arrayBuffer());
        addMedia('file', { bytes, name: f.name, mime: f.type || 'application/octet-stream' });
      };
      inp.click();
      return;
    }
    setPickFile(true);
  }
  function addText(type) {
    setAddOpen(false);
    setEdit({ id: null, type, title: '', user: '', email: '', pass: '', url: '', note: '' });
  }

  /* ---------- Guardar / borrar un elemento ---------- */
  async function saveEdit() {
    const e = edit; if (!e) return;
    setBusy(tr('vSaving'));
    try {
      const now = Date.now();
      const title = (e.title || '').trim() || (e.user || e.email || e.url || '').trim() || tr(TYPES.find(x => x[0] === e.type)[3]);
      let list;
      if (e.id) list = items.map(x => (x.id === e.id ? { ...x, ...e, title, updated: now } : x));
      else list = [{ ...e, id: newId(), title, created: now, updated: now }, ...items];
      await saveIndex(list);
      setItems(list); setEdit(null);
      toast && toast(tr('vSaved'));
    } catch (er) { toast && toast(tr('exportFail')); }
    setBusy('');
  }
  function askDelete(it) {
    const go = async () => {
      setBusy('…');
      try {
        const list = items.filter(x => x.id !== it.id);
        await saveIndex(list);
        if (it.file) await Store.del('f_' + it.id + '.bin');
        setItems(list); setEdit(null); setMedia(null);
      } catch (e) { toast && toast(tr('exportFail')); }
      setBusy('');
    };
    if (Platform.OS === 'web') { if (window.confirm(tr('vDelMsg'))) go(); return; }
    Alert.alert(tr('del'), tr('vDelMsg'), [{ text: tr('cancel'), style: 'cancel' }, { text: tr('del'), style: 'destructive', onPress: go }]);
  }

  /* ---------- Ver fotos / videos / archivos ---------- */
  async function openMedia(it) {
    setBusy(tr('vaultOpening'));
    try {
      const bytes = await readBlob(it.id);
      if (it.type === 'photo') {
        setMedia({ kind: 'photo', item: it, uri: 'data:' + (it.file.mime || 'image/jpeg') + ';base64,' + b64Encode(bytes) });
      } else if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([bytes], { type: it.file.mime }));
        tmpFiles.current.push(url);
        setMedia({ kind: it.type, item: it, uri: url });
      } else {
        const f = new FS.File(FS.Paths.cache, 'b_' + it.id + '_' + (it.file.name || 'archivo').replace(/[^\w.\-]+/g, '_'));
        try { if (f.exists) f.delete(); } catch (e) {}
        try { f.create(); } catch (e) {}
        f.write(bytes);
        tmpFiles.current.push(f);
        setMedia({ kind: it.type, item: it, uri: f.uri });
      }
    } catch (e) { toast && toast(tr('exportFail')); }
    setBusy('');
  }
  async function shareMedia() {
    if (!media) return;
    const it = media.item;
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = media.kind === 'photo' ? media.uri : media.uri; a.download = it.file.name || 'archivo';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    let uri = media.uri;
    if (media.kind === 'photo') {           // la foto está en memoria: se escribe un archivo temporal
      const f = new FS.File(FS.Paths.cache, 'b_' + it.id + '.jpg');
      try { if (f.exists) f.delete(); } catch (e) {}
      try { f.create(); } catch (e) {}
      f.write(b64Decode(media.uri.split(',')[1]));
      tmpFiles.current.push(f);
      uri = f.uri;
    }
    try { await shareFile(uri, it.file.mime || 'application/octet-stream', it.file.name || 'archivo'); } catch (e) {}
  }

  /* ============================================================
     PANTALLAS
     ============================================================ */
  const C = t;
  const pwInput = (val, set, ph, onSubmit) => (
    <View style={[s.folderInputWrap, { borderColor: C.border, marginTop: 10 }]}>
      <Feather name="lock" size={16} color={C.muted} />
      <TextInput style={s.folderInput} value={val} onChangeText={v => { set(v); setErr(''); }} placeholder={ph}
        placeholderTextColor={C.muted} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
        onSubmitEditing={onSubmit} returnKeyType={onSubmit ? 'go' : 'next'} />
      <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10}><Feather name={show ? 'eye-off' : 'eye'} size={18} color={C.muted} /></TouchableOpacity>
    </View>
  );
  const bigBtn = (label, onPress, danger) => (
    <TouchableOpacity onPress={onPress} disabled={!!busy} activeOpacity={0.8}
      style={[s.wallBtn, { backgroundColor: danger ? '#e53935' : C.text, marginTop: 16, opacity: busy ? 0.5 : 1 }]}>
      <Text style={[s.wallBtnText, { color: danger ? '#fff' : C.inv }]}>{label}</Text>
    </TouchableOpacity>
  );
  const header = (title, left, right) => (
    <View style={[s.topbar, { paddingTop: 6 }]}>
      {left}
      <Text style={{ flex: 1, color: C.text, fontSize: 20, fontWeight: '800', marginLeft: 6 }} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
  const iconBtn = (name, onPress, color) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
      <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name={name} size={20} color={color || C.text} /></Glass>
    </TouchableOpacity>
  );

  /* Pantalla de contraseña (crear / abrir / cambiar) */
  function passScreen() {
    const creating = phase === 'create' || changePass;
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 22 }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={creating ? 'shield-lock-outline' : 'safe-square-outline'} size={44} color={C.text} />
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', marginTop: 14 }}>
            {changePass ? tr('vChangePass') : creating ? tr('vaultCreate') : tr('vaultLocked')}
          </Text>
          {creating && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 }}>{tr('vaultCreateHint')}</Text>}
        </View>
        {pwInput(p1, setP1, changePass ? tr('vNewPass') : tr('bkPass'), creating ? undefined : doUnlock)}
        {creating && pwInput(p2, setP2, tr('bkPass2'))}
        {!!err && <Text style={{ color: '#ff6b6b', marginTop: 10, fontSize: 14 }}>{err}</Text>}
        {busy ? (
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
            <ActivityIndicator size="large" color={C.text} /><Text style={{ color: C.text }}>{busy}</Text>
          </View>
        ) : (
          <>
            {bigBtn(changePass ? tr('save') : creating ? tr('vaultCreate') : tr('vaultOpen'), changePass ? doChangePass : creating ? doCreate : doUnlock)}
            {phase === 'locked' && !changePass && (
              <TouchableOpacity onPress={askReset} style={{ alignSelf: 'center', padding: 12, marginTop: 6 }}>
                <Text style={{ color: C.muted, fontSize: 14 }}>{tr('vaultForgot')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }

  /* Formulario de un elemento de texto (contraseña, correo, enlace, nota) */
  function editScreen() {
    const e = edit;
    const typeRow = TYPES.find(x => x[0] === e.type);
    const set = (k, v) => setEdit(x => ({ ...x, [k]: v }));
    const label = { title: tr('fTitle'), user: tr('fUser'), email: tr('fEmail'), pass: tr('bkPass'), url: tr('fUrl'), note: tr('fNote') };
    const isMedia = !!e.file;
    return (
      <View style={{ flex: 1 }}>
        {header(tr(typeRow[3]),
          iconBtn('arrow-left', () => setEdit(null)),
          e.id ? iconBtn('trash-2', () => askDelete(e), '#ff6b6b') : null)}
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {isMedia && (
            <TouchableOpacity onPress={() => openMedia(e)} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 8 }}>
              <Feather name={ICON[e.type]} size={26} color={C.text} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{e.file.name}</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{fmtSize(e.file.size)}</Text>
              </View>
              <Feather name="eye" size={20} color={C.text} />
            </TouchableOpacity>
          )}
          {FIELDS[e.type].map(k => (
            <View key={k} style={{ marginTop: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label[k]}</Text>
              <View style={[s.folderInputWrap, { borderColor: C.border, marginTop: 0, alignItems: k === 'note' ? 'flex-start' : 'center' }]}>
                <TextInput style={[s.folderInput, k === 'note' && { minHeight: 110, textAlignVertical: 'top' }]}
                  value={e[k] || ''} onChangeText={v => set(k, v)} placeholder={label[k]} placeholderTextColor={C.muted}
                  secureTextEntry={k === 'pass' && !show} autoCapitalize={k === 'title' || k === 'note' ? 'sentences' : 'none'}
                  autoCorrect={k === 'title' || k === 'note'} multiline={k === 'note'}
                  keyboardType={k === 'email' ? 'email-address' : k === 'url' ? 'url' : 'default'} selectTextOnFocus={false} />
                {k === 'pass' && (
                  <>
                    <TouchableOpacity onPress={() => setShow(!show)} hitSlop={8}><Feather name={show ? 'eye-off' : 'eye'} size={18} color={C.muted} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => { set('pass', genPassword()); setShow(true); }} hitSlop={8}
                      style={{ marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="refresh-cw" size={16} color={C.text} />
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{tr('vGen')}</Text>
                    </TouchableOpacity>
                  </>
                )}
                {k === 'url' && !!(e.url || '').trim() && (
                  <TouchableOpacity hitSlop={8} onPress={() => {
                    const u = e.url.trim(); Linking.openURL(/^\w+:/.test(u) ? u : 'https://' + u).catch(() => {});
                  }}><Feather name="external-link" size={18} color={C.text} /></TouchableOpacity>
                )}
                {k === 'email' && !!(e.email || '').trim() && (
                  <TouchableOpacity hitSlop={8} onPress={() => Linking.openURL('mailto:' + e.email.trim()).catch(() => {})}>
                    <Feather name="send" size={18} color={C.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {bigBtn(tr('save'), saveEdit)}
        </ScrollView>
      </View>
    );
  }

  /* Ver una foto o un video */
  function mediaScreen() {
    const it = media.item;
    const close = () => { setMedia(null); cleanTmp(); };
    let body = null;
    if (media.kind === 'photo') {
      body = <Image source={{ uri: media.uri }} style={{ flex: 1 }} resizeMode="contain" />;
    } else if (media.kind === 'video') {
      body = Platform.OS === 'web'
        ? React.createElement('video', { src: media.uri, controls: true, autoPlay: true, playsInline: true, style: { width: '100%', height: '100%', background: '#000' } })
        : <WebView originWhitelist={['*']} allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs
            mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback style={{ flex: 1, backgroundColor: '#000' }}
            source={{ baseUrl: 'file:///', html: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh"><video src="${media.uri}" controls autoplay playsinline style="max-width:100%;max-height:100%"></video></body></html>` }} />;
    } else {
      body = (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Feather name="file" size={64} color={C.text} />
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>{it.file.name}</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{fmtSize(it.file.size)}</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {header(it.title, iconBtn('arrow-left', close), iconBtn('share-2', shareMedia))}
        <View style={{ flex: 1 }}>{body}</View>
        {media.kind === 'file' && <View style={{ padding: 20 }}>{bigBtn(tr('vOpenFile'), shareMedia)}</View>}
      </View>
    );
  }

  /* Lista de la bóveda */
  function listScreen() {
    const q = query.trim().toLowerCase();
    const shown = items.filter(x => (filter === 'all' || x.type === filter) &&
      (!q || [x.title, x.user, x.email, x.url, x.note, x.file && x.file.name].some(v => v && String(v).toLowerCase().includes(q))));
    const sub = x => x.type === 'pass' ? (x.user || x.url || '') : x.type === 'mail' ? (x.email || '') : x.type === 'link' ? (x.url || '')
      : x.type === 'note' ? (x.note || '').split('\n')[0] : x.file ? fmtSize(x.file.size) : '';
    return (
      <View style={{ flex: 1 }}>
        {header('🔐 ' + tr('vault'), iconBtn('arrow-left', onClose),
          <>{iconBtn('more-vertical', () => setMenuOpen(true))}</>)}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[s.folderInputWrap, { borderColor: C.border, marginTop: 4 }]}>
            <Feather name="search" size={16} color={C.muted} />
            <TextInput style={s.folderInput} value={query} onChangeText={setQuery} placeholder={tr('vSearch')} placeholderTextColor={C.muted} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {[['all', 'grid', 'vaultAll'], ...TYPES].map(([k, ic, lb]) => {
              const on = filter === k, n = k === 'all' ? items.length : items.filter(x => x.type === k).length;
              return (
                <TouchableOpacity key={k} onPress={() => setFilter(k)} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
                    borderWidth: 1, borderColor: on ? C.text : C.border, backgroundColor: on ? C.text : 'transparent' }}>
                  <Feather name={ic} size={14} color={on ? C.inv : C.text} />
                  <Text style={{ color: on ? C.inv : C.text, fontSize: 14, fontWeight: '600' }}>{tr(lb)}{n ? '  ' + n : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <FlatList
          data={shown}
          keyExtractor={x => x.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
          ListEmptyComponent={<Text style={[s.emptyText, { marginTop: 50 }]}>{tr('vaultEmpty')}</Text>}
          renderItem={({ item: x }) => (
            <TouchableOpacity activeOpacity={0.75} onPress={() => (x.file && x.type !== 'file' ? openMedia(x) : setEdit({ ...x }))}
              onLongPress={() => setEdit({ ...x })}>
              <Glass t={C} radius={18} inner={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={ICON[x.type]} size={19} color={C.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{x.title}</Text>
                  {!!sub(x) && <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{sub(x)}</Text>}
                </View>
                {x.file && x.type !== 'file'
                  ? <TouchableOpacity onPress={() => setEdit({ ...x })} hitSlop={10}><Feather name="edit-2" size={17} color={C.muted} /></TouchableOpacity>
                  : <Feather name="chevron-right" size={18} color={C.muted} />}
              </Glass>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={s.fabWrap} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
          <View style={s.fab}><Feather name="plus" size={28} color={C.inv} /></View>
        </TouchableOpacity>

        {/* Qué quieres guardar */}
        <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
          <Pressable style={[s.newScrim, { backgroundColor: C.scrim }]} onPress={() => setAddOpen(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
              <Glass t={C} strong radius={26} inner={{ paddingVertical: 10 }}>
                {TYPES.map(([k, ic, , one]) => (
                  <TouchableOpacity key={k} style={s.row} activeOpacity={0.6}
                    onPress={() => (k === 'photo' || k === 'video' ? pickMedia(k) : k === 'file' ? pickAnyFile() : addText(k))}>
                    <Feather name={ic} size={19} color={C.text} style={{ marginRight: 14 }} />
                    <Text style={s.rowText}>{tr(one)}</Text>
                  </TouchableOpacity>
                ))}
              </Glass>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Menú: cambiar contraseña, bloquear */}
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={[s.newScrim, { backgroundColor: C.scrim }]} onPress={() => setMenuOpen(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
              <Glass t={C} strong radius={26} inner={{ paddingVertical: 10 }}>
                <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => { setMenuOpen(false); setP1(''); setP2(''); setErr(''); setChangePass(true); }}>
                  <Feather name="key" size={19} color={C.text} style={{ marginRight: 14 }} /><Text style={s.rowText}>{tr('vChangePass')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => { setMenuOpen(false); lock(); setPhase('locked'); }}>
                  <Feather name="lock" size={19} color={C.text} style={{ marginRight: 14 }} /><Text style={s.rowText}>{tr('vLock')}</Text>
                </TouchableOpacity>
              </Glass>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Elegir archivo (teléfono) */}
        <Modal visible={pickFile} transparent animationType="fade" onRequestClose={() => setPickFile(false)}>
          <Pressable style={[s.wallScrim, { backgroundColor: C.scrim }]} onPress={() => setPickFile(false)}>
            <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 400 }}>
              <Glass t={C} strong radius={26} inner={{ padding: 18 }}>
                <Text style={[s.wallTitle, { marginBottom: 12 }]}>{tr('vFile')}</Text>
                <View style={{ height: 64 }}>
                  {pickFile && Platform.OS !== 'web' && (
                    <WebView originWhitelist={['*']} source={{ html: PICK_FILE_HTML(tr('vPickFile'), C) }} style={{ flex: 1, backgroundColor: 'transparent' }}
                      scrollEnabled={false} allowFileAccess
                      onMessage={ev => {
                        try {
                          const m = JSON.parse(ev.nativeEvent.data);
                          setPickFile(false);
                          if (m.big) { toast && toast(tr('vTooBig', { n: MAX_MB })); return; }
                          addMedia('file', { bytes: b64Decode(m.data), name: m.name, mime: m.mime });
                        } catch (_) {}
                      }} />
                  )}
                </View>
              </Glass>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  let screen;
  if (phase === 'check') screen = <View style={{ flex: 1 }} />;
  else if (phase !== 'open' || changePass) {
    screen = (
      <View style={{ flex: 1 }}>
        {header('', iconBtn('arrow-left', () => (changePass ? setChangePass(false) : onClose())), null)}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{passScreen()}</KeyboardAvoidingView>
      </View>
    );
  } else if (media) screen = mediaScreen();
  else if (edit) screen = editScreen();
  else screen = listScreen();

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => {
      if (busy) return;
      if (media) { setMedia(null); cleanTmp(); return; }
      if (edit) { setEdit(null); return; }
      if (changePass) { setChangePass(false); return; }
      onClose();
    }}>
      <View style={[s.screen, { backgroundColor: C.grad[0] }]}>
        <StatusBar barStyle={C.bar} backgroundColor="transparent" translucent />
        {screen}
        {!!msg && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 110, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(20,20,20,0.92)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 }}>
              <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>{msg}</Text>
            </View>
          </View>
        )}
        {!!busy && phase === 'open' && !changePass && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
            <Glass t={C} strong radius={22} inner={{ paddingVertical: 20, paddingHorizontal: 26, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={C.text} />
              <Text style={{ color: C.text, fontSize: 15 }}>{busy}</Text>
            </Glass>
          </View>
        )}
      </View>
    </Modal>
  );
}
