/* ============================================================
   reporte.js — 📊 REPORTE DEL DÍA
   Junta las notas que escribiste un día y la IA las convierte
   en un reporte de trabajo profesional, listo para tu jefe:
     · Resumen
     · Trabajo realizado (por sitio / lugar)
     · Pendientes            → sale como checklist para ir marcando
     · Materiales a pedir    → también como checklist
     · Notas para el supervisor
   Opcional: en inglés, en tu idioma o en los dos, y con las fotos.
   Nunca inventa: solo usa lo que dicen tus notas.
   ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { langLabel } from './idiomas';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const esc = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LN = c => c === 'es' ? 'Spanish' : c === 'en' ? 'English' : (langLabel(c) || c).replace(/^\S+\s/, '');

/* Pregunta a la IA (el mismo servicio gratis que usa "Reescribir con IA") */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t)); };
async function askAI(system, text) {
  const WAITS = [0, 5000, 10000, 16000];
  for (let k = 0; k < WAITS.length; k++) {
    if (WAITS[k]) await sleep(WAITS[k]);
    const seed = Math.floor(Math.random() * 1e6);
    try {
      const r = await withTimeout(fetch('https://text.pollinations.ai/openai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', seed, private: true, referrer: 'misnotas',
          messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
      }), 60000);
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      const out = String((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
      if (out) return out;
    } catch (e) {}
  }
  return '';
}

/* Las instrucciones para la IA */
function systemFor(lang) {
  return 'You write daily work reports for a field technician (low-voltage / IT / security work: cameras, access control, ' +
    'network cabling, switches, fiber, door hardware), using ONLY the notes of the day that the user gives you. ' +
    'Write a clear, professional report that a supervisor can understand quickly. ' +
    'Use EXACTLY these 5 sections, in this order, each title on its own line starting with "## ": ' +
    '1) Summary  2) Work completed  3) Pending / follow-up  4) Materials or purchases needed  5) Notes for the supervisor. ' +
    `Write the section titles and ALL the text in ${LN(lang)}. ` +
    'Summary: 2-3 short sentences. In the other sections use one "- " bullet per item. ' +
    'In "Work completed", group items by site / building / floor when the notes mention them (start the bullet with the place). ' +
    'Keep names, numbers, floors, rooms, port numbers, cable IDs, equipment models and technical terms exactly as written. ' +
    'NEVER invent work, places, quantities or dates that are not in the notes. If a section has nothing, write a single bullet "- " followed by the word for "None". ' +
    'Reply with ONLY the report: no introduction, no closing, no markdown other than "## " titles and "- " bullets.';
}

/* Texto de la IA → HTML de la nota (sección 3 y 4 salen como checklist) */
function reportHtml(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let sec = 0, list = null, out = '';
  const close = () => { if (list) { out += '</ul>'; list = null; } };
  const clean = l => l.replace(/\*\*/g, '').replace(/^__|__$/g, '').trim();
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { close(); continue; }
    const head = l.match(/^#{1,4}\s*(.+)$/) || l.match(/^\*\*(.+?)\*\*:?$/);
    if (head) {
      close(); sec++;
      out += (out ? '<div><br></div>' : '') + `<div><b>${esc(clean(head[1]).replace(/^\d+[.)]\s*/, ''))}</b></div>`;
      continue;
    }
    const bul = l.match(/^(?:[-•*–]|\d+[.)])\s+(.*)$/);
    if (bul) {
      const cls = sec === 3 || sec === 4 ? 'checklist' : '';
      if (!list || list !== (cls || 'ul')) { close(); list = cls || 'ul'; out += cls ? '<ul class="checklist">' : '<ul>'; }
      const body = clean(bul[1]);
      const m = body.match(/^([^:]{2,40}):\s+(.+)$/);       // "Piso 14: ..." → el lugar en negrita
      out += '<li>' + (m && sec === 2 ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(body)) + '</li>';
      continue;
    }
    close();
    out += `<div>${esc(clean(l))}</div>`;
  }
  close();
  return out;
}

/* Fotos de una nota (src de cada <img> de las fotos, no de audios ni videos) */
function photosOf(n) {
  const h = String((n && n.content) || ''), out = [];
  const re = /<div class="imgwrap[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(h)) && out.length < 4) out.push(m[1]);
  return out;
}

export default function DailyReport({ visible, onClose, notes, plainOf, onCreate, s, t, tr, Glass, langCode, locale }) {
  const C = t;
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [off, setOff] = useState({});           // notas que quitaste del reporte
  const [lang, setLang] = useState('app');      // 'app' | 'en' | 'both'
  const [photos, setPhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { if (visible) { setDay(startOfDay(Date.now())); setOff({}); setErr(''); } }, [visible]);

  const base = String(langCode || 'es');
  const second = base.slice(0, 2) === 'en' ? 'es' : 'en';
  const today = startOfDay(Date.now());

  const dayNotes = useMemo(() => (notes || [])
    .filter(n => !n.deleted && !n.isReport && ((n.updated >= day && n.updated < day + DAY) || (n.created >= day && n.created < day + DAY)))
    .sort((a, b) => (a.updated || 0) - (b.updated || 0)), [notes, day]);
  const usable = dayNotes.filter(n => !n.locked && (plainOf(n).trim() || (n.title || '').trim()));
  const chosen = usable.filter(n => !off[n.id]);

  const fmtDay = ms => {
    try { return new Date(ms).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return new Date(ms).toDateString(); }
  };
  const fmtTime = ms => { try { return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const dayName = day === today ? tr('rpToday') : day === today - DAY ? tr('rpYesterday') : '';

  async function make() {
    if (!chosen.length || busy) return;
    setBusy(true); setErr('');
    try {
      const input = chosen.map((n, i) => {
        const body = plainOf(n).slice(0, 6000);
        return `### Note ${i + 1}: ${(n.title || '').trim() || '(no title)'}\nEdited: ${fmtTime(n.updated)}\n${body}`;
      }).join('\n\n').slice(0, 40000);
      const L1 = lang === 'en' ? 'en' : base;
      const r1 = await askAI(systemFor(L1), input);
      if (!r1) throw new Error('ai');
      let r2 = '';
      if (lang === 'both') r2 = await askAI(systemFor(second), input);
      if (!alive.current) return;

      let html = `<div style="color:#8e8e93">📅 ${esc(fmtDay(day))} · ${esc(tr('rpNotes', { n: chosen.length }))}</div><div><br></div>` + reportHtml(r1);
      if (r2) html += `<div><br></div><div>— — —</div><div><b>${esc(langLabel(second))}</b></div><div><br></div>` + reportHtml(r2);
      if (photos) {
        const ph = [];
        chosen.forEach(n => photosOf(n).forEach(src => { if (ph.length < 12) ph.push({ src, cap: (n.title || '').trim() }); }));
        if (ph.length) {
          html += `<div><br></div><div><b>📷 ${esc(tr('rpPhotosHead'))}</b></div>`;
          ph.forEach(p => { html += (p.cap ? `<div style="color:#8e8e93">${esc(p.cap)}</div>` : '') + `<div class="imgwrap"><img src="${p.src}"></div><div><br></div>`; });
        }
      }
      onCreate({ title: `${tr('rpTitle')} — ${fmtDay(day)}`, content: html });
      setBusy(false);
      onClose();
    } catch (e) {
      if (!alive.current) return;
      setBusy(false); setErr(tr('rpFail'));
    }
  }

  const chip = (k, label) => {
    const on = lang === k;
    return (
      <TouchableOpacity key={k} onPress={() => setLang(k)} activeOpacity={0.7}
        style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: on ? C.text : C.border, backgroundColor: on ? C.text : 'transparent' }}>
        <Text style={{ color: on ? C.inv : C.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      </TouchableOpacity>
    );
  };
  const box = on => (
    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.text, backgroundColor: on ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Feather name="check" size={15} color={C.inv} />}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}>
      <View style={[s.screen, { backgroundColor: C.grad[0] }]}>
        <StatusBar barStyle={C.bar} backgroundColor="transparent" translucent />
        <View style={[s.topbar, { paddingTop: 6 }]}>
          <TouchableOpacity onPress={() => { if (!busy) onClose(); }} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
            <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name="arrow-left" size={20} color={C.text} /></Glass>
          </TouchableOpacity>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginLeft: 10, flex: 1 }} numberOfLines={1}>📊 {tr('rpTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
          <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{tr('rpHint')}</Text>

          {/* Elegir el día */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingVertical: 6 }}>
            <TouchableOpacity onPress={() => { setDay(d => d - DAY); setOff({}); }} hitSlop={10} style={{ padding: 10 }}>
              <Feather name="chevron-left" size={22} color={C.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {!!dayName && <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{dayName}</Text>}
              <Text style={{ color: dayName ? C.muted : C.text, fontSize: dayName ? 13 : 16, fontWeight: dayName ? '400' : '700' }}>{fmtDay(day)}</Text>
            </View>
            <TouchableOpacity onPress={() => { if (day < today) { setDay(d => d + DAY); setOff({}); } }} hitSlop={10} style={{ padding: 10, opacity: day < today ? 1 : 0.25 }}>
              <Feather name="chevron-right" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Las notas de ese día */}
          <View style={{ marginTop: 14 }}>
            {!dayNotes.length && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <MaterialCommunityIcons name="note-off-outline" size={40} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 15, marginTop: 8 }}>{tr('rpNone')}</Text>
              </View>
            )}
            {dayNotes.map(n => {
              const locked = !!n.locked, empty = !usable.includes(n), on = !locked && !empty && !off[n.id];
              const sub = locked ? '🔒 ' + tr('rpLocked') : (plainOf(n).split('\n').find(x => x.trim()) || '').slice(0, 90);
              return (
                <TouchableOpacity key={n.id} activeOpacity={0.7} disabled={locked || empty}
                  onPress={() => setOff(o => ({ ...o, [n.id]: !o[n.id] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
                    borderWidth: 1, borderColor: C.border, marginBottom: 8, opacity: locked || empty ? 0.45 : 1 }}>
                  {box(on)}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{(n.title || '').trim() || tr('note')}</Text>
                    {!!sub && <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{sub}</Text>}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{fmtTime(n.updated)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Idioma */}
          <Text style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>{tr('rpLang')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {chip('app', langLabel(base))}
            {base.slice(0, 2) !== 'en' && chip('en', langLabel('en'))}
            {chip('both', tr('rpBoth'))}
          </View>

          {/* Fotos */}
          <TouchableOpacity onPress={() => setPhotos(p => !p)} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
            {box(photos)}
            <Text style={{ color: C.text, fontSize: 15 }}>{tr('rpPhotos')}</Text>
          </TouchableOpacity>

          {!!err && <Text style={{ color: '#ff6b6b', fontSize: 14, marginTop: 16 }}>{err}</Text>}
        </ScrollView>

        {/* Botón de crear */}
        <View style={{ position: 'absolute', left: 18, right: 18, bottom: 28 }}>
          <TouchableOpacity onPress={make} disabled={!chosen.length || busy} activeOpacity={0.8}
            style={[s.wallBtn, { backgroundColor: C.text, flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: !chosen.length ? 0.4 : 1 }]}>
            {busy ? <ActivityIndicator color={C.inv} /> : <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={C.inv} />}
            <Text style={[s.wallBtnText, { color: C.inv }]}>
              {busy ? tr('rpWorking') : chosen.length ? `${tr('rpMake')} · ${tr('rpNotes', { n: chosen.length })}` : tr('rpMake')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
