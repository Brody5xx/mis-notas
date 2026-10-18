/* ============================================================
   pendientes.js — ✅ TODOS TUS PENDIENTES EN UN SOLO LUGAR
   Junta las casillas SIN marcar de todas tus notas, agrupadas
   por nota (con el título a color). Desde aquí:
     · marcas una como hecha (con aviso "¿Ya terminaste esto?")
       → en su nota baja a "Completados" y recuerda su lugar,
         igual que si la marcaras dentro de la nota;
     · tocas el título para abrir la nota;
     · tocas la campanita para ponerle un recordatorio.
   Funciona con el HTML de las notas (sin abrirlas).
   ============================================================ */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StatusBar, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/* ---------- Herramientas para el HTML de los checklists ---------- */
// Dónde termina el bloque <tag ...> que empieza en i (contando los que tiene adentro)
function blockEnd(h, i, tag) {
  const re = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'gi');
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(h))) {
    if (m[0][1] === '/') { depth--; if (depth === 0) return re.lastIndex; }
    else depth++;
  }
  return h.length;
}
const decode = t => String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/​/g, '').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"', 'i').exec(tag); return m ? m[1] : null; };
function setAttr(tag, name, val) {
  if (attr(tag, name) != null) return tag.replace(new RegExp('(\\s' + name + '=")[^"]*(")', 'i'), '$1' + val + '$2');
  return tag.replace(/^<(\w+)/, '<$1 ' + name + '="' + val + '"');
}
const hasClass = (tag, c) => (' ' + (attr(tag, 'class') || '') + ' ').indexOf(' ' + c + ' ') >= 0;
const addClass = (tag, c) => hasClass(tag, c) ? tag : setAttr(tag, 'class', ((attr(tag, 'class') || '') + ' ' + c).trim());

/* Todas las listas de casillas de una nota, con sus renglones */
export function parseChecklists(html) {
  const h = String(html || ''), lists = [];
  const re = /<ul\b[^>]*>/gi;
  let m;
  while ((m = re.exec(h))) {
    if (!hasClass(m[0], 'checklist')) continue;
    const start = m.index, openEnd = m.index + m[0].length, end = blockEnd(h, start, 'ul');
    const inner = h.slice(openEnd, end - 5), items = [];
    const lr = /<li\b[^>]*>/gi;
    let l;
    while ((l = lr.exec(inner))) {
      const ls = l.index, le = blockEnd(inner, ls, 'li');
      const open = l[0];
      items.push({ open, body: inner.slice(ls + open.length, le - 5), done: hasClass(open, 'done'), text: decode(inner.slice(ls + open.length, le - 5)) });
      lr.lastIndex = le;
    }
    lists.push({ start, end, open: m[0], items });
    re.lastIndex = end;
  }
  return lists;
}
/* Los renglones sin marcar (con texto) de una nota */
export function pendingOf(n) {
  if (!n || !n.html) return [];
  const out = [];
  parseChecklists(n.content).forEach((L, ui) => L.items.forEach((it, li) => {
    if (!it.done && it.text) out.push({ ui, li, text: it.text });
  }));
  return out;
}
/* Marca como hecho el renglón li de la lista ui: baja al final ("Completados") y recuerda detrás de cuál estaba */
export function markDoneHtml(html, ui, li) {
  const h = String(html || ''), lists = parseChecklists(h), L = lists[ui];
  if (!L || !L.items[li] || L.items[li].done) return h;
  const items = L.items.map(x => ({ ...x }));
  const it = items[li];
  let prev = null;
  for (let k = li - 1; k >= 0; k--) if (!items[k].done) { prev = items[k]; break; }
  if (prev) {
    let id = attr(prev.open, 'data-ck');
    if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); prev.open = setAttr(prev.open, 'data-ck', id); }
    it.open = setAttr(it.open, 'data-prev', id);
  } else it.open = setAttr(it.open, 'data-prev', '^');
  it.open = addClass(it.open, 'done');
  it.done = true;
  items.splice(li, 1);
  items.push(it);
  const ul = L.open + items.map(x => x.open + x.body + '</li>').join('') + '</ul>';
  return h.slice(0, L.start) + ul + h.slice(L.end);
}
export function countPending(notes) {
  let k = 0;
  (notes || []).forEach(n => { if (!n.deleted && !n.locked) k += pendingOf(n).length; });
  return k;
}

/* ============================================================
   PANTALLA
   ============================================================ */
export default function Pending({ visible, onClose, notes, onPatch, onOpen, onRemind, reminders, titleSegments, s, t, tr, Glass }) {
  const C = t;
  const [ask, setAsk] = useState(null);       // { note, item }
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const groups = useMemo(() => {
    const out = [];
    (notes || []).filter(n => !n.deleted && !n.locked).forEach(n => {
      const items = pendingOf(n);
      if (items.length) out.push({ n, items });
    });
    out.sort((a, b) => (b.n.updated || 0) - (a.n.updated || 0));
    return out;
  }, [notes]);
  const qq = q.trim().toLowerCase();
  const shown = groups.map(g => ({ ...g, items: qq ? g.items.filter(x => x.text.toLowerCase().includes(qq) || (g.n.title || '').toLowerCase().includes(qq)) : g.items }))
    .filter(g => g.items.length);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const locked = (notes || []).filter(n => !n.deleted && n.locked).length;

  const toast = m => { setMsg(m); setTimeout(() => setMsg(''), 1800); };
  function confirm() {
    const a = ask; setAsk(null);
    if (!a) return;
    const fresh = (notes || []).find(x => x.id === a.note.id);
    if (!fresh) return;
    // buscar el renglón por su texto (por si la nota cambió) y si no, por su posición
    const now = pendingOf(fresh);
    const hit = now.find(x => x.ui === a.item.ui && x.li === a.item.li && x.text === a.item.text) || now.find(x => x.text === a.item.text);
    if (!hit) return;
    onPatch(fresh.id, { content: markDoneHtml(fresh.content, hit.ui, hit.li) });
    toast('✓ ' + tr('ckDoneTip'));
  }
  const hasRem = (noteId, text) => (reminders || []).some(r => r.noteId === noteId && r.text === text && r.at > Date.now());

  const title = n => (
    <Text style={{ fontSize: 16, fontWeight: '800', flex: 1 }} numberOfLines={1}>
      {n.title ? titleSegments(n).map((g, i) => (
        <Text key={i} style={{ color: g.color || C.text, fontWeight: g.bold === false ? '400' : '800', fontStyle: g.italic ? 'italic' : 'normal' }}>{g.text}</Text>
      )) : <Text style={{ color: C.text }}>{tr('untitled')}</Text>}
    </Text>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => { if (ask) setAsk(null); else onClose(); }}>
      <View style={[s.screen, { backgroundColor: C.grad[0] }]}>
        <StatusBar barStyle={C.bar} backgroundColor="transparent" translucent />
        <View style={[s.topbar, { paddingTop: 6 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
            <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name="arrow-left" size={20} color={C.text} /></Glass>
          </TouchableOpacity>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginLeft: 10, flex: 1 }} numberOfLines={1}>✅ {tr('pdTitle')}</Text>
          {total > 0 && (
            <View style={{ minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 8, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Text style={{ color: C.inv, fontWeight: '800', fontSize: 14 }}>{total}</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{tr('pdHint')}</Text>
          {total > 6 && (
            <View style={[s.folderInputWrap, { borderColor: C.border, marginTop: 12 }]}>
              <Feather name="search" size={16} color={C.muted} />
              <TextInput style={s.folderInput} value={q} onChangeText={setQ} placeholder={tr('pdSearch')} placeholderTextColor={C.muted} />
            </View>
          )}

          {!total && (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Text style={{ fontSize: 46 }}>🎉</Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginTop: 10 }}>{tr('pdNone')}</Text>
              <Text style={{ color: C.muted, fontSize: 14, marginTop: 6, textAlign: 'center' }}>{tr('pdNoneHint')}</Text>
            </View>
          )}

          {shown.map(({ n, items }) => (
            <View key={n.id} style={{ marginTop: 16, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: 'hidden' }}>
              {!!n.color && <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: n.color }} />}
              <TouchableOpacity onPress={() => onOpen(n)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                {title(n)}
                <Text style={{ color: C.muted, fontSize: 13 }}>{items.length}</Text>
                <Feather name="chevron-right" size={18} color={C.muted} />
              </TouchableOpacity>
              {items.map(it => (
                <View key={it.ui + ':' + it.li} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 11 }}>
                  <TouchableOpacity onPress={() => setAsk({ note: n, item: it })} hitSlop={10} activeOpacity={0.6}
                    style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.text, marginTop: 1 }} />
                  <Text style={{ color: C.text, fontSize: 15, lineHeight: 21, flex: 1 }}>{it.text}</Text>
                  {!!onRemind && (
                    <TouchableOpacity onPress={() => onRemind(n, it.text)} hitSlop={10} activeOpacity={0.6}>
                      <MaterialCommunityIcons name={hasRem(n.id, it.text) ? 'bell-ring' : 'bell-plus-outline'} size={20} color={hasRem(n.id, it.text) ? C.text : C.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))}

          {locked > 0 && <Text style={{ color: C.muted, fontSize: 13, marginTop: 18, textAlign: 'center' }}>🔒 {tr('pdLocked', { n: locked })}</Text>}
        </ScrollView>

        {/* ¿Ya terminaste esto? */}
        {!!ask && (
          <Pressable0 onPress={() => setAsk(null)}>
            <Glass t={C} strong radius={22} style={{ width: '86%', maxWidth: 340 }} inner={{ padding: 20 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{tr('ckDoneQ')}</Text>
              <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>{tr('ckDoneMsg')}</Text>
              <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginTop: 12 }}>
                <Text style={{ color: C.text, fontSize: 14 }} numberOfLines={4}>{ask.item.text}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setAsk(null)} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{tr('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirm} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: C.text, alignItems: 'center' }}>
                  <Text style={{ color: C.inv, fontSize: 15, fontWeight: '700' }}>{tr('ckDoneYes')}</Text>
                </TouchableOpacity>
              </View>
            </Glass>
          </Pressable0>
        )}
        {!!msg && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 50, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(20,20,20,0.92)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 }}>
              <Text style={{ color: '#fff', fontSize: 15 }}>{msg}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

/* Fondo oscuro que cierra al tocar afuera (lo de adentro no lo cierra) */
function Pressable0({ onPress, children }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {children}
    </View>
  );
}
