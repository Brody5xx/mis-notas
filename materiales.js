/* ============================================================
   materiales.js — 📦 LISTA DE MATERIALES
   La IA lee tus notas y saca todo lo que hay que pedir o comprar
   (switches, cables, mag locks…). La lista muestra el TOTAL de
   cada material y, debajo, para dónde va cada parte:
       5 × Cable Cat 6
         3 · Inwood – piso 14
         2 · DVSS – sótano
   Cada material tiene su estado: Por pedir → Pedido → Llegó.
   Se puede editar, agregar a mano, compartir con el jefe
   (español, inglés o los dos) o guardar como nota.
   La lista se guarda en el teléfono.
   ============================================================ */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StatusBar, TextInput, ActivityIndicator, Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { askAI, titleColorOf } from './reporte';
import { useInsets } from './pantalla';

import { KEY, DAY, newId, norm, esc, groupsOf, qtyTxt } from './matlista';
const STATES = ['pending', 'ordered', 'arrived'];

/* Las instrucciones para la IA */
function systemFor(lang) {
  const L = lang === 'en' ? 'English' : 'Spanish';
  return 'You extract a MATERIALS / PURCHASE list from a field technician\'s notes (low-voltage, IT, security: cameras, access control, ' +
    'switches, cable, fiber, mag locks, door hardware, power supplies, connectors, tools). ' +
    'Include ONLY materials, equipment, parts or supplies that must be ordered, bought, picked up, replaced or are missing / needed. ' +
    'Do NOT include work that was already done or installed, and do NOT include tasks that are not materials. ' +
    'Return ONLY a JSON array, nothing else. Each element: {"item": short canonical material name in ' + L + ' (keep models, sizes, port counts, ' +
    'e.g. "Switch PoE 16 puertos"; use EXACTLY the same name for the same material across notes), "qty": number or null if not stated, ' +
    '"unit": short unit or "", "site": the place / building / floor / room it is for (from the note text or its title), "note": the note number}. ' +
    'Never invent materials or quantities. If there is nothing, return [].';
}
function parseList(r) {
  const s = String(r || ''), a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a < 0 || b <= a) return null;
  try {
    const j = JSON.parse(s.slice(a, b + 1));
    return Array.isArray(j) ? j : null;
  } catch (e) { return null; }
}

/* Texto profesional para mandar al jefe */
function shareText(groups, lang, locale) {
  const now = new Date(), hr = now.getHours();
  let date;
  try { date = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { date = now.toDateString(); }
  const T = lang === 'en'
    ? { title: 'Material request', hi: hr < 12 ? 'Good morning.' : 'Good afternoon.', intro: 'Please find below the materials needed:', for: 'for', bye: 'Please let me know once the order is confirmed. Thank you.',
        urg: '🔴 URGENT — needed as soon as possible:', rest: 'Other materials:' }
    : { title: 'Solicitud de materiales', hi: hr < 12 ? 'Buenos días.' : 'Buenas tardes.', intro: 'Les comparto los materiales que se necesitan:', for: 'para', bye: 'Quedo atento a la confirmación del pedido. Gracias.',
        urg: '🔴 URGENTE — se necesita lo antes posible:', rest: 'Otros materiales:' };
  const lines = [T.title + ' — ' + date, '', T.hi + ' ' + T.intro, ''];
  const urg = groups.filter(g => g.urgent), rest = groups.filter(g => !g.urgent);
  groups = urg.concat(rest);
  groups.forEach((g, gi) => {
    if (urg.length && gi === 0) lines.push(T.urg);
    if (urg.length && rest.length && gi === urg.length) lines.push('', T.rest);
    lines.push('• ' + qtyTxt(g) + g.item + (g.unit ? ' (' + g.unit + ')' : ''));
    if (g.entries.length > 1 || g.entries[0].site) {
      g.entries.forEach(e => lines.push('   – ' + (e.qty ? e.qty + ' ' : '') + (e.site ? T.for + ' ' + e.site : '')));
    }
  });
  lines.push('', T.bye);
  return lines.join('\n');
}

export default function Materials({ visible, onClose, notes, plainOf, onOpen, onCreateNote, titleSegments, s, t, tr, Glass, langCode, locale }) {
  const C = t;
  const ins = useInsets();
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState('all');        // 'today' | 'week' | 'all'
  const [tab, setTab] = useState('pending');        // 'pending' | 'ordered' | 'arrived' | 'all'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState(null);           // { key, item, entries: [...] }
  const [shareAsk, setShareAsk] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { try { setEntries(JSON.parse(v || '[]')); } catch (e) {} setLoaded(true); });
  }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(entries)).catch(() => {}); }, [entries, loaded]);

  const base = String(langCode || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  const toast = m => { setMsg(m); setTimeout(() => setMsg(''), 2200); };
  const now = Date.now();
  const sod = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const scope = (notes || []).filter(n => !n.deleted && !n.locked && plainOf(n).trim())
    .filter(n => range === 'all' ? true : range === 'today' ? (n.updated || 0) >= sod() : (n.updated || 0) >= now - 7 * DAY)
    .filter(n => !n.isReport);
  const all = useMemo(() => groupsOf(entries), [entries]);
  const counts = { pending: all.filter(g => g.status === 'pending').length, ordered: all.filter(g => g.status === 'ordered').length, arrived: all.filter(g => g.status === 'arrived').length, all: all.length };
  const shown = all.filter(g => tab === 'all' || g.status === tab);
  const noteById = id => (notes || []).find(n => n.id === id);

  /* Buscar materiales en las notas */
  async function scan() {
    if (!scope.length || busy) return;
    setBusy(true);
    try {
      const list = scope.slice(-40);
      const input = list.map((n, i) => `### Note ${i + 1}: ${(n.title || '').trim() || '(no title)'}\n${plainOf(n).slice(0, 5000)}`).join('\n\n').slice(0, 40000);
      let arr = null;
      for (let k = 0; k < 3 && !arr; k++) arr = parseList(await askAI(systemFor(base), input));
      if (!arr) { toast(tr('mtFail')); setBusy(false); return; }
      const fresh = arr.filter(x => x && x.item && String(x.item).trim()).map(x => {
        const n = list[(parseInt(x.note, 10) || 0) - 1];
        const qty = typeof x.qty === 'number' ? x.qty : (parseFloat(x.qty) || null);
        return { id: newId(), item: String(x.item).trim(), qty, unit: String(x.unit || '').trim(), site: String(x.site || '').trim() || (n ? (n.title || '').trim() : ''),
          noteId: n ? n.id : null, src: 'ai', status: 'pending' };
      });
      setEntries(old => {
        const k = e => norm(e.item) + '|' + norm(e.site) + '|' + (e.noteId || '');
        const oldMap = {};
        old.forEach(e => { oldMap[k(e)] = e; });
        const scanned = new Set(list.map(n => n.id));
        const merged = fresh.map(e => { const o = oldMap[k(e)]; return o ? { ...e, id: o.id, status: o.status, urgent: o.urgent, qty: o.edited ? o.qty : e.qty, item: o.edited ? o.item : e.item, edited: o.edited } : e; });
        const keys = new Set(merged.map(k));
        // lo que pusiste a mano, lo de notas que no se revisaron, y lo ya pedido o recibido se queda
        const keep = old.filter(e => !keys.has(k(e)) && (e.src === 'manual' || e.status !== 'pending' || !scanned.has(e.noteId)));
        return [...merged, ...keep];
      });
      toast(fresh.length ? tr('mtFound', { n: fresh.length }) : tr('mtNoneFound'));
    } catch (e) { toast(tr('mtFail')); }
    setBusy(false);
  }

  function cycle(g) {
    const next = STATES[(STATES.indexOf(g.status) + 1) % STATES.length];
    setEntries(es => es.map(e => (norm(e.item) === g.key ? { ...e, status: next } : e)));
    toast(next === 'ordered' ? '🛒 ' + tr('mtOrdered') : next === 'arrived' ? '✅ ' + tr('mtArrived') : '○ ' + tr('mtPending'));
  }
  function toggleUrgent(g) {
    const v = !g.urgent;
    setEntries(es => es.map(e => (norm(e.item) === g.key ? { ...e, urgent: v } : e)));
    toast(v ? '🔴 ' + tr('mtUrgent') : '⚪ ' + tr('mtNormal'));
  }
  function openEdit(g) {
    setEdit(g ? { key: g.key, item: g.item, urgent: !!g.urgent, entries: g.entries.map(e => ({ ...e, qtyTxt: e.qty == null ? '' : String(e.qty) })) }
      : { key: null, item: '', urgent: false, entries: [{ id: newId(), item: '', qty: null, qtyTxt: '', unit: '', site: '', noteId: null, src: 'manual', status: 'pending' }] });
  }
  function saveEdit() {
    const ed = edit; setEdit(null);
    if (!ed || !ed.item.trim()) return;
    const keepIds = new Set(ed.entries.map(e => e.id));
    const updated = ed.entries.map(e => {
      const q = parseFloat(String(e.qtyTxt).replace(',', '.'));
      return { id: e.id, item: ed.item.trim(), qty: isFinite(q) ? q : null, unit: e.unit || '', site: (e.site || '').trim(), noteId: e.noteId || null,
        src: e.src || 'manual', status: e.status || 'pending', edited: true, urgent: !!ed.urgent };
    });
    setEntries(es => [...es.filter(e => !(ed.key && norm(e.item) === ed.key) && !keepIds.has(e.id)), ...updated]);
  }
  function deleteGroup() {
    const ed = edit; setEdit(null);
    if (ed && ed.key) setEntries(es => es.filter(e => norm(e.item) !== ed.key));
  }
  async function doShare(lang) {
    setShareAsk(false);
    const gs = shown.length ? shown : all;
    if (!gs.length) return;
    const text = lang === 'both' ? shareText(gs, base === 'en' ? 'en' : 'es', locale) + '\n\n— — —\n\n' + shareText(gs, base === 'en' ? 'es' : 'en', locale) : shareText(gs, lang, locale);
    try { await Share.share({ message: text, title: tr('mtTitle') }); }
    catch (e) {
      try { if (Platform.OS === 'web' && navigator.clipboard) { await navigator.clipboard.writeText(text); toast(tr('mtCopied')); } } catch (e2) {}
    }
  }
  function saveAsNote() {
    const gs = shown.length ? shown : all;
    if (!gs.length) return;
    let html = '';
    gs.forEach(g => {
      html += `<div><b>${g.urgent ? '🔴 ' : ''}${esc(qtyTxt(g) + g.item)}</b>${g.status === 'arrived' ? ' ✅' : g.status === 'ordered' ? ' 🛒' : ''}</div><ul>`;
      g.entries.forEach(e => { html += `<li>${e.qty ? esc(e.qty) + ' · ' : ''}${esc(e.site || '')}</li>`; });
      html += '</ul>';
    });
    let date;
    try { date = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { date = new Date().toDateString(); }
    onCreateNote({ title: `📦 ${tr('mtTitle')} — ${date}`, content: html });
    onClose();
  }

  const chip = (k, label, on, onPress) => (
    <TouchableOpacity key={k} onPress={onPress} activeOpacity={0.7}
      style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: on ? C.text : C.border, backgroundColor: on ? C.text : 'transparent' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ color: on ? C.inv : C.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
  const stIcon = st => st === 'arrived' ? 'check-circle' : st === 'ordered' ? 'cart-outline' : 'circle-outline';
  const field = (val, set, ph, extra) => (
    <TextInput maxFontSizeMultiplier={1.3} value={val} onChangeText={set} placeholder={ph} placeholderTextColor={C.muted}
      style={[{ color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }, extra]} />
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => { if (edit) setEdit(null); else if (shareAsk) setShareAsk(false); else onClose(); }}>
      <View style={[s.screen, { backgroundColor: C.grad[0] }]}>
        <StatusBar barStyle={C.bar} backgroundColor="transparent" translucent />
        <View style={[s.topbar, { paddingTop: 6 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
            <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name="arrow-left" size={20} color={C.text} /></Glass>
          </TouchableOpacity>
          <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 22, fontWeight: '800', marginLeft: 10, flex: 1 }} numberOfLines={1}>📦 {tr('mtTitle')}</Text>
          <TouchableOpacity onPress={() => openEdit(null)} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
            <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name="plus" size={20} color={C.text} /></Glass>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + ins.bottom }} keyboardShouldPersistTaps="handled">
          <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{tr('mtHint')}</Text>

          {/* Buscar en las notas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {chip('today', tr('rpToday'), range === 'today', () => setRange('today'))}
            {chip('week', tr('mtWeek'), range === 'week', () => setRange('week'))}
            {chip('all', tr('mtAllNotes'), range === 'all', () => setRange('all'))}
          </View>
          <TouchableOpacity onPress={scan} disabled={busy || !scope.length} activeOpacity={0.8}
            style={[s.wallBtn, { backgroundColor: C.text, marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: !scope.length ? 0.4 : 1 }]}>
            {busy ? <ActivityIndicator color={C.inv} /> : <Feather name="search" size={18} color={C.inv} />}
            <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: C.inv }]}>{busy ? tr('mtReading') : tr('mtScan', { n: scope.length })}</Text>
          </TouchableOpacity>

          {/* Pestañas por estado */}
          {all.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
              {chip('t-p', '○ ' + tr('mtPending') + ' ' + counts.pending, tab === 'pending', () => setTab('pending'))}
              {chip('t-o', '🛒 ' + tr('mtOrdered') + ' ' + counts.ordered, tab === 'ordered', () => setTab('ordered'))}
              {chip('t-a', '✅ ' + tr('mtArrived') + ' ' + counts.arrived, tab === 'arrived', () => setTab('arrived'))}
              {chip('t-all', tr('mtAll') + ' ' + counts.all, tab === 'all', () => setTab('all'))}
            </ScrollView>
          )}

          {!all.length && !busy && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 44 }}>📦</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14, marginTop: 8, textAlign: 'center' }}>{tr('mtEmpty')}</Text>
            </View>
          )}

          {shown.map(g => (
            <View key={g.key} style={{ marginTop: 12, borderWidth: g.urgent ? 1.5 : 1, borderColor: g.urgent && g.status !== 'arrived' ? '#ff453a' : C.border, borderRadius: 18, padding: 14, opacity: g.status === 'arrived' ? 0.6 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => cycle(g)} hitSlop={10} activeOpacity={0.6}>
                  <MaterialCommunityIcons name={stIcon(g.status)} size={26} color={C.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(g)} activeOpacity={0.7} style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 17, fontWeight: '800', textDecorationLine: g.status === 'arrived' ? 'line-through' : 'none' }}>
                    {qtyTxt(g)}{g.item}{g.unit ? ' (' + g.unit + ')' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleUrgent(g)} hitSlop={8} activeOpacity={0.7}
                  style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: g.urgent ? '#ff453a' : C.border, backgroundColor: g.urgent ? 'rgba(255,69,58,0.15)' : 'transparent' }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: g.urgent ? '#ff6b61' : C.muted, fontSize: 12, fontWeight: '800' }}>{g.urgent ? '🔴 ' + tr('mtUrgent') : '⚪ ' + tr('mtNormal')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(g)} hitSlop={10}><Feather name="edit-2" size={16} color={C.muted} /></TouchableOpacity>
              </View>
              {/* Para dónde va cada parte */}
              <View style={{ marginTop: 8, marginLeft: 38, gap: 4 }}>
                {g.entries.map(e => {
                  const n = e.noteId && noteById(e.noteId);
                  return (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14 }}>{e.qty != null ? e.qty + ' · ' : '• '}{e.site || tr('mtNoSite')}</Text>
                      {!!n && (
                        <TouchableOpacity onPress={() => onOpen(n)} hitSlop={6}>
                          <Text maxFontSizeMultiplier={1.3} style={{ color: titleColorOf(n) || C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>↗ {(n.title || '').trim() || tr('note')}</Text>
                        </TouchableOpacity>
                      )}
                      {e.src === 'manual' && <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 12 }}>✍️</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Compartir / guardar */}
        {all.length > 0 && (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 26 + ins.bottom, flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setShareAsk(true)} activeOpacity={0.8}
              style={[s.wallBtn, { flex: 1, backgroundColor: C.text, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
              <Feather name="send" size={17} color={C.inv} />
              <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: C.inv }]} numberOfLines={1}>{tr('mtSend')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveAsNote} activeOpacity={0.8}
              style={[s.wallBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
              <Feather name="file-plus" size={17} color={C.text} />
              <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: C.text }]} numberOfLines={1}>{tr('mtAsNote')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Elegir idioma para mandar */}
        {shareAsk && (
          <Overlay onClose={() => setShareAsk(false)}>
            <Glass t={C} strong radius={22} style={{ width: '86%', maxWidth: 340 }} inner={{ padding: 20, gap: 10 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{tr('mtSendQ')}</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 13 }}>{tr('mtSendHint')}</Text>
              {[['es', '🇪🇸 Español'], ['en', '🇺🇸 English'], ['both', '🇪🇸 + 🇺🇸 ' + tr('rpBoth')]].map(([k, lb]) => (
                <TouchableOpacity key={k} onPress={() => doShare(k)} activeOpacity={0.7}
                  style={{ paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{lb}</Text>
                </TouchableOpacity>
              ))}
            </Glass>
          </Overlay>
        )}

        {/* Editar un material */}
        {!!edit && (
          <Overlay onClose={() => setEdit(null)}>
            <Glass t={C} strong radius={22} style={{ width: '92%', maxWidth: 420, maxHeight: '85%' }} inner={{ padding: 18 }}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>{edit.key ? tr('mtEdit') : tr('mtAdd')}</Text>
                <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('mtItem')}</Text>
                {field(edit.item, v => setEdit(x => ({ ...x, item: v })), tr('mtItemPh'))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {[[false, '⚪ ' + tr('mtNormal')], [true, '🔴 ' + tr('mtUrgent')]].map(([v, lb]) => (
                    <TouchableOpacity key={String(v)} onPress={() => setEdit(x => ({ ...x, urgent: v }))} activeOpacity={0.7}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center',
                        borderColor: edit.urgent === v ? (v ? '#ff453a' : C.text) : C.border, backgroundColor: edit.urgent === v ? (v ? 'rgba(255,69,58,0.15)' : C.text) : 'transparent' }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ color: edit.urgent === v ? (v ? '#ff6b61' : C.inv) : C.text, fontSize: 14, fontWeight: '700' }}>{lb}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 12, marginTop: 14, marginBottom: 6 }}>{tr('mtWhere')}</Text>
                {edit.entries.map((e, i) => (
                  <View key={e.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {field(e.qtyTxt, v => setEdit(x => ({ ...x, entries: x.entries.map((y, j) => (j === i ? { ...y, qtyTxt: v.replace(/[^0-9.,]/g, '') } : y)) })), '#', { width: 64, textAlign: 'center' })}
                    {field(e.site, v => setEdit(x => ({ ...x, entries: x.entries.map((y, j) => (j === i ? { ...y, site: v } : y)) })), tr('mtSitePh'), { flex: 1 })}
                    {edit.entries.length > 1 && (
                      <TouchableOpacity onPress={() => setEdit(x => ({ ...x, entries: x.entries.filter((_, j) => j !== i) }))} hitSlop={8}>
                        <Feather name="x-circle" size={20} color="#ff6b6b" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => setEdit(x => ({ ...x, entries: [...x.entries, { id: newId(), qtyTxt: '', site: '', unit: '', noteId: null, src: 'manual', status: 'pending' }] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                  <Feather name="plus" size={16} color={C.text} />
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{tr('mtAddSite')}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {!!edit.key && (
                    <TouchableOpacity onPress={deleteGroup} activeOpacity={0.7}
                      style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ff6b6b' }}>
                      <Feather name="trash-2" size={18} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setEdit(null)} activeOpacity={0.7}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                    <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{tr('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEdit} activeOpacity={0.7}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: C.text, alignItems: 'center', opacity: edit.item.trim() ? 1 : 0.4 }}>
                    <Text maxFontSizeMultiplier={1.3} style={{ color: C.inv, fontSize: 15, fontWeight: '700' }}>{tr('save')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Glass>
          </Overlay>
        )}

        {!!msg && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 96 + ins.bottom, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(20,20,20,0.92)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>{msg}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Overlay({ onClose, children }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {children}
    </View>
  );
}
