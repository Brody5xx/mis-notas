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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groupsOf, loadMaterials, qtyTxt } from './matlista';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const esc = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LN = c => c === 'es' ? 'Spanish' : c === 'en' ? 'English' : (langLabel(c) || c).replace(/^\S+\s/, '');

/* Pregunta a la IA (el mismo servicio gratis que usa "Reescribir con IA") */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t)); };
export async function askAI(system, text) {
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

/* Todo lo que tiene una nota además del texto, tal cual (con su posición, giro, tamaño y ediciones):
   fotos, notas de voz, videos y links — en el mismo orden en que están en la nota */
function blockAt(h, i) {                          // el <div ...> completo que empieza en i (con sus divs de adentro)
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(h))) {
    if (m[0][1] === '/') { depth--; if (depth === 0) return h.slice(i, re.lastIndex); }
    else depth++;
  }
  return null;
}
function attachmentsOf(n) {
  const h = String((n && n.content) || ''), out = [];
  const re = /<div class="(imgwrap|audwrap|vidwrap)[^"]*"/g;
  let m;
  while ((m = re.exec(h))) {
    const blk = blockAt(h, m.index);
    if (!blk) continue;
    out.push({ at: m.index, kind: m[1], html: blk });
    re.lastIndex = m.index + blk.length;
  }
  const seen = {};
  const lr = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = lr.exec(h))) {
    const url = m[1];
    if (seen[url] || /^(data:|blob:|javascript:)/i.test(url)) continue;
    seen[url] = 1;
    const txt = m[2].replace(/<[^>]+>/g, '').trim() || url;
    out.push({ at: m.index, kind: 'link', html: `<li><a href="${url}">${esc(txt)}</a></li>` });
  }
  out.sort((x, y) => x.at - y.at);
  return out;
}
/* Color del título de la nota (el mismo que tiene en la lista) */
export function titleColorOf(n) {
  if (n.titleColor) return n.titleColor;
  const m = /color:\s*([^;"']+)/i.exec(String(n.titleHtml || ''));
  return m ? m[1].trim() : null;
}
function titleHtmlOf(n, fallback) {
  if (n.titleHtml && n.titleHtml.replace(/<[^>]+>/g, '').trim()) return n.titleHtml;
  const t = esc((n.title || '').trim() || fallback);
  return n.titleColor ? `<span style="color:${n.titleColor}">${t}</span>` : t;
}

export default function DailyReport({ visible, onClose, notes, plainOf, onCreate, s, t, tr, Glass, langCode, locale }) {
  const C = t;
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [off, setOff] = useState({});           // notas que quitaste del reporte
  const [lang, setLang] = useState(null);       // un código de idioma, o 'both' (español + inglés)
  const [inc, setInc] = useState({ text: true, mat: true, imgwrap: true, audwrap: true, vidwrap: true, link: true });   // qué incluir
  const [mats, setMats] = useState([]);         // 📦 la lista de materiales guardada
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { if (visible) { setDay(startOfDay(Date.now())); setOff({}); setErr(''); setLang(null); loadMaterials(AsyncStorage).then(setMats); } }, [visible]);

  const base = String(langCode || 'es');
  // Español e inglés siempre están; si la app está en otro idioma, ese también
  const esCode = base.slice(0, 2) === 'es' ? base : 'es';
  const enCode = base.slice(0, 2) === 'en' ? base : 'en';
  const other = base.slice(0, 2) !== 'es' && base.slice(0, 2) !== 'en' ? base : null;
  const pick = lang || base;
  const both = base.slice(0, 2) === 'en' ? [enCode, esCode] : [esCode, enCode];
  const today = startOfDay(Date.now());

  const dayNotes = useMemo(() => (notes || [])
    .filter(n => !n.deleted && !n.isReport && ((n.updated >= day && n.updated < day + DAY) || (n.created >= day && n.created < day + DAY)))
    .sort((a, b) => (a.updated || 0) - (b.updated || 0)), [notes, day]);
  const usable = dayNotes.filter(n => !n.locked && (plainOf(n).trim() || (n.title || '').trim()));
  const chosen = usable.filter(n => !off[n.id]);
  const counts = useMemo(() => {
    const k = { text: chosen.filter(n => plainOf(n).trim()).length, imgwrap: 0, audwrap: 0, vidwrap: 0, link: 0 };
    chosen.forEach(n => attachmentsOf(n).forEach(x => { k[x.kind] = (k[x.kind] || 0) + 1; }));
    return k;
  }, [chosen.map(n => n.id + ':' + n.updated).join(',')]);
  // 📦 Materiales de las notas elegidas (y los que agregaste a mano) que todavía no llegan
  const chosenIds = new Set(chosen.map(n => n.id));
  const matGroups = groupsOf(mats.filter(e => e.status !== 'arrived' && (e.noteId ? chosenIds.has(e.noteId) : e.src === 'manual')));
  counts.mat = matGroups.length;
  const KINDS = [['text', 'type', 'rpIncText'], ['mat', 'package', 'rpIncMat'], ['imgwrap', 'image', 'rpIncPhotos'], ['audwrap', 'mic', 'rpIncVoice'], ['vidwrap', 'film', 'rpIncVideos'], ['link', 'link', 'rpIncLinks']];
  const allInc = KINDS.every(([k]) => inc[k]);
  const anyInc = KINDS.some(([k]) => k !== 'text' && k !== 'mat' && inc[k]);     // algún adjunto
  const nothing = !KINDS.some(([k]) => inc[k]);

  const fmtDay = ms => {
    try { return new Date(ms).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return new Date(ms).toDateString(); }
  };
  const fmtTime = ms => { try { return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const dayName = day === today ? tr('rpToday') : day === today - DAY ? tr('rpYesterday') : '';

  async function make() {
    if (!chosen.length || busy || nothing) return;
    setBusy(true); setErr('');
    try {
      const input = chosen.map((n, i) => {
        const body = plainOf(n).slice(0, 6000);
        return `### Note ${i + 1}: ${(n.title || '').trim() || '(no title)'}\nEdited: ${fmtTime(n.updated)}\n${body}`;
      }).join('\n\n').slice(0, 40000);
      // Una respuesta sirve solo si trae las secciones (a veces la IA responde algo cortado, como un "#")
      const good = r => {
        const heads = String(r || '').split('\n').filter(l => /^\s*(#{1,4}\s*\S|\*\*[^*]+\*\*:?\s*$)/.test(l)).length;
        return String(r || '').replace(/[#*\s-]/g, '').length >= 60 && heads >= 3;
      };
      const askGood = async L => {
        for (let k = 0; k < 3; k++) { const r = await askAI(systemFor(L), input); if (good(r)) return r; }
        return '';
      };
      let html = `<div style="color:#8e8e93">📅 ${esc(fmtDay(day))} · ${esc(tr('rpNotes', { n: chosen.length }))}</div><div><br></div>`;
      if (inc.text) {
        const L1 = pick === 'both' ? both[0] : pick;
        const r1 = await askGood(L1);
        const r2 = r1 && pick === 'both' ? await askGood(both[1]) : '';
        if (!alive.current) return;
        if (r1) {
          html += reportHtml(r1);
          if (r2) html += `<div><br></div><div>— — —</div><div><b>${esc(langLabel(both[1]))}</b></div><div><br></div>` + reportHtml(r2);
        } else {
          // La IA no respondió bien: el texto de tus notas va tal cual, para que nunca falte
          html += `<div><b>${esc(tr('rpFallback'))}</b></div>`;
          chosen.forEach(n => {
            const body = plainOf(n).trim();
            if (!body) return;
            html += `<div><br></div><div><b>${titleHtmlOf(n, tr('note'))}</b></div>` +
              body.split('\n').map(l => l.trim() ? `<div>${esc(l)}</div>` : '<div><br></div>').join('');
          });
        }
      }
      if (!alive.current) return;
      // 📦 Lista de materiales (🔴 urgentes primero)
      if (inc.mat && matGroups.length) {
        const MH = { es: 'Lista de materiales', en: 'Materials list' };
        const head = pick === 'both' ? `${MH[both[0].slice(0, 2)] || tr('rpMatHead')} / ${MH[both[1].slice(0, 2)] || 'Materials list'}`
          : MH[String(pick).slice(0, 2)] || tr('rpMatHead');
        const forW = { es: 'para', en: 'for' }[String(pick === 'both' ? both[0] : pick).slice(0, 2)] || '·';
        html += `<div><br></div><div>— — —</div><div><b>📦 ${esc(head)}</b></div><ul class="checklist">` +
          matGroups.map(g => {
            const sites = g.entries.filter(e => e.site || e.qty != null).map(e => (e.qty != null ? e.qty + ' ' : '') + (e.site ? forW + ' ' + e.site : '')).join('; ');
            return `<li>${g.urgent ? '🔴 ' : ''}<b>${esc(qtyTxt(g) + g.item + (g.unit ? ' (' + g.unit + ')' : ''))}</b>${sites ? ' — ' + esc(sites) : ''}${g.status === 'ordered' ? ' 🛒' : ''}</li>`;
          }).join('') + '</ul>';
      }
      if (anyInc) {
        let att = '';
        chosen.forEach(n => {
          const list = attachmentsOf(n).filter(x => inc[x.kind]);
          if (!list.length) return;
          att += `<div><br></div><div><b>📎 ${titleHtmlOf(n, tr('note'))}</b></div>`;
          let links = '';
          list.forEach(x => {
            if (x.kind === 'link') { links += x.html; return; }
            if (links) { att += `<ul>${links}</ul>`; links = ''; }
            att += x.html + '<div><br></div>';
          });
          if (links) att += `<ul>${links}</ul>`;
        });
        if (att) html += (inc.text ? `<div><br></div><div>— — —</div><div><b>${esc(tr('rpAttachHead'))}</b></div>` : `<div><b>${esc(tr('rpAttachHead'))}</b></div>`) + att;
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
    const on = pick === k;
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
                    <Text style={{ color: titleColorOf(n) || C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{(n.title || '').trim() || tr('note')}</Text>
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
            {chip(esCode, langLabel(esCode))}
            {chip(enCode, langLabel(enCode))}
            {!!other && chip(other, langLabel(other))}
            {chip('both', '🇪🇸 + 🇺🇸 ' + tr('rpBoth'))}
          </View>

          {/* Qué incluir: cada cosa por separado, o todo de un solo toque */}
          <Text style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>{tr('rpIncHead')}</Text>
          <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => { const v = !allInc; setInc({ text: v, mat: v, imgwrap: v, audwrap: v, vidwrap: v, link: v }); }} activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              {box(allInc)}
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', flex: 1 }}>{allInc ? tr('rpNoneInc') : tr('rpAll')}</Text>
            </TouchableOpacity>
            {KINDS.map(([k, ic, lb]) => (
              <TouchableOpacity key={k} onPress={() => setInc(o => ({ ...o, [k]: !o[k] }))} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 24 }}>
                {box(inc[k])}
                <Feather name={ic} size={17} color={C.muted} />
                <Text style={{ color: C.text, fontSize: 15, flex: 1 }}>{tr(lb)}</Text>
                <Text style={{ color: C.muted, fontSize: 14 }}>{counts[k] || 0}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!err && <Text style={{ color: '#ff6b6b', fontSize: 14, marginTop: 16 }}>{err}</Text>}
        </ScrollView>

        {/* Botón de crear */}
        <View style={{ position: 'absolute', left: 18, right: 18, bottom: 28 }}>
          <TouchableOpacity onPress={make} disabled={!chosen.length || busy || nothing} activeOpacity={0.8}
            style={[s.wallBtn, { backgroundColor: C.text, flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: !chosen.length || nothing ? 0.4 : 1 }]}>
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
