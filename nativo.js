/* ============================================================
   nativo.js — ⚡ EDITOR RÁPIDO (nativo, sin página web por dentro)
   Abre al instante. Hace: texto con negrita/cursiva/subrayado/tachado,
   tamaños, colores y resaltado, checklist, listas y fotos.
   Guarda en el MISMO formato que el editor completo.
   ============================================================ */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Image, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { htmlToBlocks, blocksToHtml, mergeSpans, spansPlain, sameStyle, newKey } from './nativo-html';

const BASE_SIZE = 17;
const SIZES = [13, 15, 17, 20, 24, 30, 38];
const COLORS = [null, '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#8e8e93'];
const HILITES = [null, 'rgba(255, 214, 10, 0.45)', 'rgba(48, 209, 88, 0.40)', 'rgba(10, 132, 255, 0.40)', 'rgba(255, 69, 58, 0.40)', 'rgba(191, 90, 242, 0.40)'];

/* ---------- ayudantes de texto con estilo ---------- */
function styleAt(spans, pos) {
  let i = 0, prev = null;
  for (const sp of spans) {
    const end = i + sp.text.length;
    if (pos > i && pos <= end) {
      const ch = sp.text[pos - i - 1];
      if (ch !== '\n') return sp.st;
      prev = 'nl';
    }
    if (prev === 'nl' && pos === i) return sp.st;   // inicio de renglón: el estilo de lo que sigue
    i = end;
  }
  // inicio del bloque o renglón vacío: el estilo de lo que sigue (si hay)
  let j = 0;
  for (const sp of spans) { if (pos >= j && pos < j + sp.text.length && sp.text[pos - j] !== '\n') return sp.st; j += sp.text.length; }
  return {};
}
function sliceSpans(spans, a, b) {     // los pedazos entre a y b
  const out = []; let i = 0;
  for (const sp of spans) {
    const s = i, e = i + sp.text.length;
    const x = Math.max(a, s), y = Math.min(b, e);
    if (x < y) out.push({ text: sp.text.slice(x - s, y - s), st: sp.st });
    i = e;
  }
  return out;
}
function editSpans(spans, a, b, ins, st) {   // cambia [a,b) por "ins" con estilo st
  const total = spansPlain(spans).length;
  const out = sliceSpans(spans, 0, a);
  if (ins) out.push({ text: ins, st });
  return mergeSpans(out.concat(sliceSpans(spans, b, total)));
}
function mapRange(spans, a, b, fn) {          // aplica fn al estilo de [a,b)
  const total = spansPlain(spans).length;
  const mid = sliceSpans(spans, a, b).map(x => ({ text: x.text, st: fn({ ...x.st }) }));
  return mergeSpans(sliceSpans(spans, 0, a).concat(mid, sliceSpans(spans, b, total)));
}
function lineRange(text, a, b) {              // renglones completos que tocan [a,b]
  let s = text.lastIndexOf('\n', a - 1) + 1;
  let e = text.indexOf('\n', b); if (e < 0) e = text.length;
  return [s, e];
}
function clean(st) { const o = {}; ['b', 'i', 'u', 's'].forEach(k => { if (st[k]) o[k] = 1; }); if (st.size && st.size !== BASE_SIZE) o.size = st.size; if (st.color) o.color = st.color; if (st.bg) o.bg = st.bg; return o; }

/* 🔍 lo que buscaste se ilumina (igual que en la tarjeta) */
const foldCh = ch => { let x = ch; try { x = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {} return (x.length === 1 ? x : ch).toLowerCase(); };
function fold(t) { let f = ''; for (let i = 0; i < t.length; i++) f += foldCh(t[i]); return f; }
function hlSpans(spans, q) {
  if (!q) return spans;
  const txt = spansPlain(spans), f = fold(txt), fq = fold(q);
  if (!fq || f.indexOf(fq) < 0) return spans;
  const marks = []; let at = f.indexOf(fq);
  while (at >= 0) { marks.push([at, at + fq.length]); at = f.indexOf(fq, at + fq.length); }
  const out = []; let pos = 0;                  // se parte en pedazos (sin juntar, para no perder la marca)
  for (const [a, b] of marks) {
    if (a > pos) out.push(...sliceSpans(spans, pos, a));
    out.push(...sliceSpans(spans, a, b).map(x => ({ text: x.text, st: { ...x.st, hl: 1 } })));
    pos = b;
  }
  if (pos < txt.length) out.push(...sliceSpans(spans, pos, txt.length));
  return out;
}
function spanStyle(st, c) {
  const o = {};
  if (st.b) o.fontWeight = '700';
  if (st.i) o.fontStyle = 'italic';
  if (st.u || st.s) o.textDecorationLine = st.u && st.s ? 'underline line-through' : st.u ? 'underline' : 'line-through';
  if (st.size) { o.fontSize = st.size; o.lineHeight = Math.round(st.size * 1.45); }
  if (st.color) o.color = st.color;
  if (st.bg) o.backgroundColor = st.bg;
  if (st.hl) { o.backgroundColor = 'rgba(140,110,255,0.42)'; o.textDecorationLine = 'underline'; o.textDecorationColor = '#c9b6ff'; }
  return o;
}

/* ============================================================ */
const NativeEditor = React.forwardRef(function NativeEditor(props, ref) {
  const { note, c, tr, onSave, getImg, putImg, makeStamp, onUndoState, onFull, fmtDate, bottomPad, pickImage, onPlay, getPoster, playing, highlight } = props;
  const hq = String(highlight || '').trim();
  const scrollRef = useRef(null);
  const hlDone = useRef(false);
  const { width } = useWindowDimensions();
  const T = (k, fb) => { try { const v = tr(k); return v && v !== k ? v : fb; } catch (e) { return fb; } };

  const first = useMemo(() => {
    const r = htmlToBlocks(note.content || '', note.html !== false);
    return r.ok ? r.blocks : [{ k: newKey(), t: 'text', spans: [{ text: String(note.content || ''), st: {} }] }];
  }, [note.id]);
  const [blocks, setBlocksRaw] = useState(first);
  const [title, setTitle] = useState(note.title || '');
  const titleTouched = useRef(false);
  const blocksRef = useRef(blocks); blocksRef.current = blocks;
  const titleRef = useRef(title); titleRef.current = title;

  /* ---------- foco y selección ---------- */
  const inputs = useRef({});                    // key → TextInput
  const focus = useRef({ k: null, item: null, sel: { start: 0, end: 0 } });
  const [focusK, setFocusK] = useState(null);   // para la barra (qué está activo)
  const [selV, setSelV] = useState({ start: 0, end: 0 });
  const pend = useRef(null);                    // estilo para lo próximo que escribas { k, pos, st }
  const [pendV, setPendV] = useState(null);
  const wantFocus = useRef(null);
  const [panel, setPanel] = useState(null);     // 'size' | 'color' | 'hl' | 'photo'
  const [selImg, setSelImg] = useState(null);

  /* ---------- guardar (con un ratito de espera) ---------- */
  const saveT = useRef(null);
  const dirty = useRef(false);
  const lastHtml = useRef(null);
  function doSave() {
    clearTimeout(saveT.current); saveT.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    const html = blocksToHtml(blocksRef.current);
    const tt = titleRef.current;
    const img = blocksRef.current.find(b => b.t === 'img');
    lastHtml.current = html;
    onSave({ html, title: tt, titleHtml: titleTouched.current ? '' : (note.titleHtml || ''), firstImg: img ? (img.iid || img.src || null) : null });
    pushUndo();
  }
  function changed() { dirty.current = true; clearTimeout(saveT.current); saveT.current = setTimeout(doSave, 350); }
  /* ✍️ Mientras escribes en un texto con formato, lo que se ve NO se vuelve a dibujar con cada letra
     (eso hacía parpadear las otras letras). Se actualiza al dar formato o al salir del renglón. */
  const shown = useRef({});
  const [, bump] = useState(0);
  const hasSt = sp => sp.some(x => Object.keys(x.st || {}).length);
  function kids(key, spans) {
    const f = shown.current[key];
    if (f) return f;
    const d = hlSpans(spans, hq);
    return hasSt(d) ? d.map((sp, j) => <Text key={j} style={spanStyle(sp.st, c)}>{sp.text}</Text>) : null;
  }
  const plainMode = (key, spans) => !shown.current[key] && !hasSt(hlSpans(spans, hq));
  function freeze(key, spans0) { const spans = hlSpans(spans0, hq); if (!shown.current[key] && hasSt(spans)) shown.current[key] = spans.map((sp, j) => <Text key={j} style={spanStyle(sp.st, c)}>{sp.text}</Text>); }
  function unfreeze(key) { if (shown.current[key]) { delete shown.current[key]; bump(x => x + 1); } }
  function setBlocks(fn, keep) {
    if (!keep) shown.current = {};
    setBlocksRaw(prev => { const nx = typeof fn === 'function' ? fn(prev) : fn; blocksRef.current = nx; return nx; });
    changed();
  }

  /* ---------- deshacer ---------- */
  const undo = useRef({ list: [JSON.stringify({ b: first, t: note.title || '' })], at: 0 });
  function pushUndo() {
    const u = undo.current, snap = JSON.stringify({ b: blocksRef.current, t: titleRef.current });
    if (u.list[u.at] === snap) return;
    u.list = u.list.slice(0, u.at + 1); u.list.push(snap); if (u.list.length > 80) u.list.shift(); u.at = u.list.length - 1;
    onUndoState && onUndoState({ canUndo: u.at > 0, canRedo: false });
  }
  function restore(i) {
    const u = undo.current; if (i < 0 || i >= u.list.length) return;
    u.at = i; const o = JSON.parse(u.list[i]);
    shown.current = {}; blocksRef.current = o.b; setBlocksRaw(o.b); setTitle(o.t); titleRef.current = o.t; titleTouched.current = true;
    dirty.current = true; clearTimeout(saveT.current);
    const html = blocksToHtml(o.b); const img = o.b.find(b => b.t === 'img');
    dirty.current = false;
    onSave({ html, title: o.t, titleHtml: '', firstImg: img ? (img.iid || img.src || null) : null });
    onUndoState && onUndoState({ canUndo: u.at > 0, canRedo: u.at < u.list.length - 1 });
  }

  useImperativeHandle(ref, () => ({
    flush: () => doSave(),
    undo: () => { doSave(); restore(undo.current.at - 1); },
    redo: () => restore(undo.current.at + 1),
    insertText: (t) => insertTextAtFocus(t),
    hasFocus: () => !!focus.current.k,
  }));
  useEffect(() => () => doSave(), []);          // al salir se guarda lo último
  useEffect(() => {                             // nota nueva (vacía): el teclado sale para escribir
    const b0 = first[0];
    if (!note.title && first.length === 1 && b0.t === 'text' && !spansPlain(b0.spans)) {
      const tm = setTimeout(() => { const inp = inputs.current[b0.k]; try { inp && inp.focus(); } catch (e) {} }, 120);
      return () => clearTimeout(tm);
    }
  }, []);

  /* ---------- poner el foco donde corresponde después de un cambio ---------- */
  useEffect(() => {
    const w = wantFocus.current; if (!w) return;
    wantFocus.current = null;
    const inp = inputs.current[w.key];
    if (!inp) return;
    try { inp.focus(); } catch (e) {}
    try { inp.setSelection && inp.setSelection(w.pos, w.pos); } catch (e) {}
    const n0 = edits.current;                    // otra vez un momentito después (si todavía no escribiste nada)
    setTimeout(() => { if (edits.current === n0) { try { inp.setSelection && inp.setSelection(w.pos, w.pos); } catch (e) {} } }, 40);
  });

  /* ---------- escribir en un bloque de texto ---------- */
  const edits = useRef(0);
  function onTextChange(k, newText) {
    edits.current++;
    { const b0 = blocksRef.current.find(x => x.k === k); const P = pend.current;
      if (b0 && !(P && P.k === k)) freeze(k, b0.spans); else delete shown.current[k]; }
    setBlocks(prev => prev.map(b => {
      if (b.k !== k || b.t !== 'text') return b;
      const old = spansPlain(b.spans);
      if (old === newText) return b;
      const sel = focus.current.k === k ? focus.current.sel : null;
      let a, e, ins;
      const d = newText.length - old.length;
      if (sel && sel.start === sel.end && d > 0 && old.slice(0, sel.start) === newText.slice(0, sel.start) && old.slice(sel.start) === newText.slice(sel.start + d)) {
        a = sel.start; e = sel.start; ins = newText.slice(sel.start, sel.start + d);
      } else {
        let p = 0; const ml = Math.min(old.length, newText.length);
        while (p < ml && old[p] === newText[p]) p++;
        let s = 0; while (s < ml - p && old[old.length - 1 - s] === newText[newText.length - 1 - s]) s++;
        a = p; e = old.length - s; ins = newText.slice(p, newText.length - s);
      }
      const P = pend.current;
      const st = P && P.k === k && P.pos === a ? P.st : styleAt(b.spans, a);
      if (P && P.k === k && P.pos === a && ins) { pend.current = { k, pos: a + ins.length, st: P.st }; }
      return { ...b, spans: editSpans(b.spans, a, e, ins, clean(st)) };
    }), true);
  }
  function onSel(k, item, s) {
    focus.current = { k, item, sel: s };
    setSelV(s);
    const P = pend.current;     // (Android a veces avisa del cursor antes que del texto: 1 de diferencia está bien)
    if (P && (P.k !== (item || k) || s.start !== s.end || (s.start !== P.pos && s.start !== P.pos + 1))) { pend.current = null; setPendV(null); }
  }
  function curText() {
    const b = blocksRef.current.find(x => x.k === focus.current.k);
    if (!b) return null;
    if (b.t === 'text') return b;
    if (b.items && focus.current.item) { const it = b.items.find(x => x.k === focus.current.item); if (it) return { k: it.k, spans: it.spans, item: true, bk: b.k }; }
    return null;
  }
  function setSpansOf(t, fn) {                  // cambia los pedazos de un texto o de un renglón de lista
    if (t.item) setBlocks(prev => prev.map(b => (b.k !== t.bk ? b : { ...b, items: b.items.map(x => (x.k === t.k ? { ...x, spans: fn(x.spans) } : x)) })));
    else setBlocks(prev => prev.map(x => (x.k === t.k ? { ...x, spans: fn(x.spans) } : x)));
  }

  /* ---------- formato (barra de abajo) ---------- */
  function applyStyle(fn) {
    const b = curText(); if (!b) return;
    const { start, end } = focus.current.sel;
    if (start === end) {
      const base = pend.current && pend.current.k === b.k && pend.current.pos === start ? pend.current.st : styleAt(b.spans, start);
      const st = clean(fn({ ...base }));
      pend.current = { k: b.k, pos: start, st }; setPendV(pend.current);
      // si el renglón está vacío, también se ve en el renglón
      return;
    }
    setSpansOf(b, sp => mapRange(sp, start, end, st => clean(fn(st))));
  }
  function toggle(prop) {
    const b = curText(); if (!b) return;
    const { start, end } = focus.current.sel;
    let on;
    if (start === end) { const base = pend.current && pend.current.k === b.k && pend.current.pos === start ? pend.current.st : styleAt(b.spans, start); on = !base[prop]; }
    else on = !sliceSpans(b.spans, start, end).filter(x => x.text.trim()).every(x => x.st[prop]);
    applyStyle(st => { if (on) st[prop] = 1; else delete st[prop]; return st; });
  }
  const activeSt = useMemo(() => {
    const b = curText(); if (!b) return {};
    if (pendV && pendV.k === b.k) return pendV.st;
    const { start, end } = selV;
    if (start !== end) { const parts = sliceSpans(b.spans, start, end).filter(x => x.text.trim()); return parts.length ? parts[0].st : {}; }
    return styleAt(b.spans, start);
  }, [blocks, focusK, selV, pendV]);

  function insertTextAtFocus(t) {
    const b = curText();
    if (!b) {                                              // sin foco: al final de la nota
      setBlocks(prev => {
        const nx = prev.slice(); let last = nx[nx.length - 1];
        if (!last || last.t !== 'text') { last = { k: newKey(), t: 'text', spans: [] }; nx.push(last); }
        const txt = spansPlain(last.spans);
        const add = (txt && !/\s$/.test(txt) ? ' ' : '') + t;
        nx[nx.length - 1] = { ...last, spans: editSpans(last.spans, txt.length, txt.length, add, styleAt(last.spans, txt.length)) };
        return nx;
      });
      return;
    }
    const { start, end } = focus.current.sel;
    const txt = spansPlain(b.spans);
    const add = (start > 0 && !/\s$/.test(txt.slice(0, start)) ? ' ' : '') + t;
    setSpansOf(b, sp => editSpans(sp, start, end, add, clean(styleAt(sp, start))));
    const pos = start + add.length;
    focus.current.sel = { start: pos, end: pos };
    wantFocus.current = { key: b.k, pos };
  }

  /* ---------- checklist / listas ---------- */
  function toChecklist() {
    const fk = focus.current.k;
    const blocks0 = blocksRef.current;
    const bi = blocks0.findIndex(b => b.k === fk);
    if (bi < 0) {                                          // sin foco: checklist nuevo al final
      setBlocks(prev => prev.concat([{ k: newKey(), t: 'check', items: [{ k: newKey(), spans: [], done: false }] }, { k: newKey(), t: 'text', spans: [] }]));
      return;
    }
    const b = blocks0[bi];
    if (b.t === 'check' || b.t === 'ul' || b.t === 'ol') {   // un renglón de la lista vuelve a ser texto
      const ii = b.items.findIndex(x => x.k === focus.current.item); if (ii < 0) return;
      const it = b.items[ii];
      const before = b.items.slice(0, ii), after = b.items.slice(ii + 1);
      const tk = newKey();
      const parts = [];
      if (before.length) parts.push({ ...b, items: before });
      parts.push({ k: tk, t: 'text', spans: it.spans });
      if (after.length) parts.push({ ...b, k: newKey(), items: after });
      setBlocks(prev => joinText(prev.slice(0, bi).concat(parts, prev.slice(bi + 1))));
      wantFocus.current = { key: tk, pos: spansPlain(it.spans).length };
      return;
    }
    if (b.t !== 'text') return;
    const txt = spansPlain(b.spans);
    const { start, end } = focus.current.sel;
    const [ls, le] = lineRange(txt, start, end);
    const lines = txt.slice(ls, le).split('\n');
    let at = ls;
    const items = lines.map(l => { const it = { k: newKey(), spans: mergeSpans(sliceSpans(b.spans, at, at + l.length)), done: false }; at += l.length + 1; return it; });
    const parts = [];
    const pre = ls > 0 ? sliceSpans(b.spans, 0, ls - 1) : null;
    const post = le < txt.length ? sliceSpans(b.spans, le + 1, txt.length) : null;
    if (pre) parts.push({ ...b, spans: mergeSpans(pre) });
    parts.push({ k: newKey(), t: 'check', items });
    parts.push({ k: newKey(), t: 'text', spans: post ? mergeSpans(post) : [] });
    setBlocks(prev => prev.slice(0, bi).concat(parts, prev.slice(bi + 1)));
    wantFocus.current = { key: items[items.length - 1].k, pos: spansPlain(items[items.length - 1].spans).length };
  }
  function joinText(list) {                     // dos bloques de texto seguidos se juntan
    const out = [];
    for (const b of list) {
      const last = out[out.length - 1];
      if (last && last.t === 'text' && b.t === 'text') out[out.length - 1] = { ...last, spans: mergeSpans(last.spans.concat([{ text: '\n', st: {} }], b.spans)) };
      else out.push(b);
    }
    return out;
  }
  function onItemChange(bk, ik, text) {
    edits.current++;
    const b0 = blocksRef.current.find(b => b.k === bk);
    const it0 = b0 && b0.items.find(x => x.k === ik);
    if (!it0) return;
    const old = spansPlain(it0.spans);
    // el texto con estilo se actualiza igual que en el texto normal
    let spans;
    {
      const sel = focus.current.item === ik ? focus.current.sel : null;
      let a, e, ins; const d = text.length - old.length;
      if (sel && sel.start === sel.end && d > 0 && old.slice(0, sel.start) === text.slice(0, sel.start) && old.slice(sel.start) === text.slice(sel.start + d)) { a = sel.start; e = sel.start; ins = text.slice(a, a + d); }
      else {
        let p = 0; const ml = Math.min(old.length, text.length);
        while (p < ml && old[p] === text[p]) p++;
        let q = 0; while (q < ml - p && old[old.length - 1 - q] === text[text.length - 1 - q]) q++;
        a = p; e = old.length - q; ins = text.slice(p, text.length - q);
      }
      const P = pend.current;
      const st = P && P.k === ik && P.pos === a ? P.st : styleAt(it0.spans, a);
      if (P && P.k === ik && P.pos === a && ins) pend.current = { k: ik, pos: a + ins.length, st: P.st };
      spans = editSpans(it0.spans, a, e, ins, clean(st));
    }
    const plain = spansPlain(spans);
    if (plain.includes('\n')) {                 // Enter: renglón nuevo en la lista
      const cut = plain.indexOf('\n');
      const before = mergeSpans(sliceSpans(spans, 0, cut));
      const after = mergeSpans(sliceSpans(spans, cut + 1, plain.length)).map(x => ({ ...x, text: x.text.replace(/\n/g, ' ') }));
      if (!old && !spansPlain(before) && !spansPlain(after)) { exitList(bk, ik); return; }    // Enter en renglón vacío: sale de la lista
      const nk = newKey();
      setBlocks(prev => prev.map(b => {
        if (b.k !== bk) return b;
        const i = b.items.findIndex(x => x.k === ik);
        const items = b.items.slice();
        items[i] = { ...items[i], spans: before };
        items.splice(i + 1, 0, { k: nk, spans: after, done: false });
        return { ...b, items };
      }));
      wantFocus.current = { key: nk, pos: 0 };
      return;
    }
    { const P = pend.current; if (!(P && P.k === ik)) freeze(ik, it0.spans); else delete shown.current[ik]; }
    setBlocks(prev => prev.map(b => (b.k !== bk ? b : { ...b, items: b.items.map(x => (x.k === ik ? { ...x, spans } : x)) })), true);
  }
  function exitList(bk, ik) {
    const list = blocksRef.current; const bi = list.findIndex(b => b.k === bk); if (bi < 0) return;
    const b = list[bi]; const ii = b.items.findIndex(x => x.k === ik);
    const before = b.items.slice(0, ii), after = b.items.slice(ii + 1);
    const tk = newKey();
    const parts = [];
    if (before.length) parts.push({ ...b, items: before });
    parts.push({ k: tk, t: 'text', spans: [] });
    if (after.length) parts.push({ ...b, k: newKey(), items: after });
    setBlocks(prev => joinText(prev.slice(0, bi).concat(parts, prev.slice(bi + 1))));
    wantFocus.current = { key: tk, pos: 0 };
  }
  function onItemKey(bk, ik, e) {
    if (e.nativeEvent.key !== 'Backspace') return;
    const b = blocksRef.current.find(x => x.k === bk); if (!b) return;
    const ii = b.items.findIndex(x => x.k === ik); const it = b.items[ii];
    if (!it || spansPlain(it.spans)) return;
    if (b.items.length === 1) { exitList(bk, ik); return; }
    const prevIt = b.items[ii - 1] || b.items[ii + 1];
    setBlocks(prev => prev.map(x => (x.k !== bk ? x : { ...x, items: x.items.filter(y => y.k !== ik) })));
    if (prevIt) wantFocus.current = { key: prevIt.k, pos: spansPlain(prevIt.spans).length };
  }
  function toggleDone(bk, ik) {
    setBlocks(prev => prev.map(b => (b.k !== bk ? b : { ...b, items: b.items.map(x => (x.k === ik ? { ...x, done: !x.done } : x)) })));
  }

  /* ---------- fotos ---------- */
  const [imgUris, setImgUris] = useState({});
  useEffect(() => {
    let alive = true;
    blocks.forEach(b => {
      if (b.t !== 'img' || !b.iid || imgUris[b.iid]) return;
      getImg(b.iid).then(u => { if (alive && u) setImgUris(m => ({ ...m, [b.iid]: u })); }).catch(() => {});
    });
    return () => { alive = false; };
  }, [blocks]);
  async function addPhoto(fromCamera) {
    setPanel(null);
    const r = await pickImage(fromCamera);
    if (!r || !r.data) return;
    const res = await putImg(r.data);
    if (!res || !res.iid) return;
    const raw = makeStamp(res.iid, r.w || res.w, r.h || res.h);
    setImgUris(m => ({ ...m, [res.iid]: r.data }));
    const ib = { k: newKey(), t: 'img', raw, iid: res.iid, src: null, pct: 40, w: r.w || res.w, h: r.h || res.h, stamp: '' };
    const sm = /<text[^>]*>([^<]*)<\/text>/.exec(raw); if (sm) ib.stamp = sm[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const fk = focus.current.k;
    setBlocks(prev => {
      const bi = prev.findIndex(b => b.k === fk);
      if (bi < 0 || prev[bi].t !== 'text') return prev.concat([ib, { k: newKey(), t: 'text', spans: [] }]);
      const b = prev[bi]; const txt = spansPlain(b.spans);
      const pos = focus.current.sel.end;
      let cut = txt.indexOf('\n', pos); if (cut < 0) cut = txt.length;      // la foto va debajo del renglón
      const pre = { ...b, spans: mergeSpans(sliceSpans(b.spans, 0, cut)) };
      const post = { k: newKey(), t: 'text', spans: mergeSpans(sliceSpans(b.spans, cut + 1, txt.length)) };
      return prev.slice(0, bi).concat([pre, ib, post], prev.slice(bi + 1));
    });
  }
  function imgResize(k, d) {
    setBlocks(prev => prev.map(b => {
      if (b.k !== k) return b;
      const pct = Math.max(20, Math.min(100, Math.round((b.pct || 40) + d)));
      const raw = /style="[^"]*width:\s*[0-9.]+%/.test(b.raw) ? b.raw.replace(/(style="[^"]*width:\s*)[0-9.]+%/, '$1' + pct + '%') : b.raw.replace('<div class="imgwrap"', '<div class="imgwrap" style="width:' + pct + '%"');
      return { ...b, pct, raw: raw.replace(/data-scale="[0-9.]+"/, 'data-scale="' + Math.round(pct / 0.4) + '"') };
    }));
  }
  function imgDelete(k) { setSelImg(null); setBlocks(prev => joinText(prev.filter(b => b.k !== k))); }

  /* ============================================================ */
  const contentW = width - 40;
  const baseTxt = { color: c.text, fontSize: BASE_SIZE, lineHeight: 25, paddingVertical: 2, paddingHorizontal: 0, textAlignVertical: 'top' };
  const onlyEmpty = blocks.length === 1 && blocks[0].t === 'text' && !spansPlain(blocks[0].spans);

  const renderText = (b, i) => (
    <TextInput
      key={b.k}
      ref={r => { if (r) inputs.current[b.k] = r; else delete inputs.current[b.k]; }}
      multiline scrollEnabled={false}
      style={baseTxt}
      placeholder={i === 0 && onlyEmpty ? T('edPh', 'Escribe aquí…') : undefined}
      placeholderTextColor={c.muted}
      onChangeText={t => onTextChange(b.k, t)}
      onSelectionChange={e => onSel(b.k, null, e.nativeEvent.selection)}
      onFocus={() => { setFocusK(b.k); setSelImg(null); }}
      onBlur={() => unfreeze(b.k)}
      onLayout={e => {                            // 🔍 se va a la primera palabra que buscaste
        if (!hq || hlDone.current || !scrollRef.current) return;
        if (fold(spansPlain(b.spans)).indexOf(fold(hq)) < 0) return;
        hlDone.current = true;
        const y = e.nativeEvent.layout.y;
        setTimeout(() => { try { scrollRef.current.scrollTo({ y: Math.max(0, y - 80), animated: false }); } catch (er) {} }, 30);
      }}
      selectionColor={c.text}
      underlineColorAndroid="transparent"
      {...(plainMode(b.k, b.spans) ? { value: spansPlain(b.spans) } : {})}
    >
      {kids(b.k, b.spans)}
    </TextInput>
  );
  const renderList = (b) => {
    const isCk = b.t === 'check';
    const undone = isCk ? b.items.filter(x => !x.done) : b.items;
    const done = isCk ? b.items.filter(x => x.done) : [];
    const row = (x, n) => (
      <View key={x.k} style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: 30 }}>
        {isCk ? (
          <Pressable onPress={() => toggleDone(b.k, x.k)} hitSlop={10} style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: x.done ? c.text : c.muted,
            backgroundColor: x.done ? c.text : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginRight: 10 }}>
            {x.done && <Feather name="check" size={15} color={c.inv} />}
          </Pressable>
        ) : (
          <Text style={{ color: c.text, fontSize: BASE_SIZE, lineHeight: 25, width: 24, marginTop: 2 }}>{b.t === 'ol' ? n + 1 + '.' : '•'}</Text>
        )}
        <TextInput
          ref={r => { if (r) inputs.current[x.k] = r; else delete inputs.current[x.k]; }}
          multiline scrollEnabled={false}
          {...(plainMode(x.k, x.spans) ? { value: spansPlain(x.spans) } : {})}
          onBlur={() => unfreeze(x.k)}
          style={[baseTxt, { flex: 1 }, x.done && { textDecorationLine: 'line-through', opacity: 0.55 }]}
          onChangeText={t => onItemChange(b.k, x.k, t)}
          onKeyPress={e => onItemKey(b.k, x.k, e)}
          onSelectionChange={e => onSel(b.k, x.k, e.nativeEvent.selection)}
          onFocus={() => { setFocusK(b.k); setSelImg(null); focus.current.k = b.k; focus.current.item = x.k; }}
          selectionColor={c.text}
          underlineColorAndroid="transparent"
        >
          {kids(x.k, x.spans)}
        </TextInput>
      </View>
    );
    return (
      <View key={b.k} style={{ marginVertical: 4 }}>
        {undone.map(row)}
        {done.length > 0 && (
          <>
            <Text style={{ color: c.muted, fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 }}>✓ {T('ckDoneHead', 'Completados')} ({done.length})</Text>
            {done.map(row)}
          </>
        )}
      </View>
    );
  };
  const renderImg = (b) => {
    const uri = b.src || (b.iid && imgUris[b.iid]);
    const w = Math.round(contentW * (b.pct || 40) / 100);
    const ratio = b.w && b.h ? b.h / b.w : 0.75;
    const sel = selImg === b.k;
    return (
      <Pressable key={b.k} onPress={() => { Keyboard.dismiss(); setSelImg(sel ? null : b.k); setFocusK(null); focus.current.k = null; }}
        style={{ width: w, marginVertical: 6 }}>
        <View style={{ width: w, height: Math.round(w * ratio), borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(127,127,127,0.15)',
          borderWidth: sel ? 2 : 0, borderColor: '#5ccfff' }}>
          {!!uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
          {!!b.stamp && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: Math.max(9, Math.round(w / 26)), textAlign: 'right' }}>{b.stamp}</Text>
            </View>
          )}
        </View>
        {sel && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => imgResize(b.k, -10)} style={chip(c)}><Feather name="minus" size={16} color={c.text} /></Pressable>
            <Pressable onPress={() => imgResize(b.k, 10)} style={chip(c)}><Feather name="plus" size={16} color={c.text} /></Pressable>
            <Pressable onPress={() => imgDelete(b.k)} style={chip(c)}><Feather name="trash-2" size={16} color="#ff453a" /></Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  /* ---------- audios y videos (se tocan para ver/oír; se reproducen en el reproductor de la app) ---------- */
  const [posters, setPosters] = useState({});
  useEffect(() => {
    let alive = true;
    blocks.forEach(b => {
      if (b.t !== 'media' || b.kind !== 'video' || !b.aid || posters[b.aid] !== undefined || !getPoster) return;
      setPosters(m => ({ ...m, [b.aid]: null }));
      getPoster(b.aid).then(u => { if (alive) setPosters(m => ({ ...m, [b.aid]: u || '' })); }).catch(() => {});
    });
    return () => { alive = false; };
  }, [blocks]);
  const fmtDur = d => { d = Math.round(d || 0); return Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0'); };
  const fmtSize = b => (!b ? '' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
  const renderMedia = (b) => {
    const del = (
      <Pressable onPress={() => setBlocks(prev => joinText(prev.filter(x => x.k !== b.k)))} hitSlop={8}
        style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="trash-2" size={15} color="#ff6b6b" />
      </Pressable>
    );
    if (b.kind === 'video') {
      const w = contentW, h = Math.round(w * 9 / 16), pu = b.aid ? posters[b.aid] : null;
      return (
        <View key={b.k} style={{ width: w, marginVertical: 6 }}>
          <Pressable onPress={() => { Keyboard.dismiss(); onPlay && onPlay(b); }}
            style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
            {!!pu && <Image source={{ uri: pu }} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} resizeMode="cover" />}
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="play" size={26} color="#000" style={{ marginLeft: 3 }} />
            </View>
          </Pressable>
          {del}
          <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>🎬 {fmtSize(b.size)}{b.muted ? '  ·  🔇' : ''}</Text>
        </View>
      );
    }
    const on = playing && playing === (b.aid || b.k);
    return (
      <View key={b.k} style={{ marginVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 46, borderRadius: 22, borderWidth: 1, borderColor: c.border, alignSelf: 'flex-start', minWidth: 190 }}>
        <Pressable onPress={() => onPlay && onPlay(b)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={on ? 'pause' : 'play'} size={18} color={c.inv} style={!on && { marginLeft: 2 }} />
        </Pressable>
        <Text style={{ color: c.text, fontWeight: '700' }}>🎙️ {fmtDur(b.dur)}</Text>
        <Pressable onPress={() => setBlocks(prev => joinText(prev.filter(x => x.k !== b.k)))} hitSlop={8} style={{ position: 'absolute', right: 10 }}>
          <Feather name="trash-2" size={16} color="#ff6b6b" />
        </Pressable>
      </View>
    );
  };

  /* ---------- barra de herramientas ---------- */
  const inText = !!curText();
  const B = Btn;
  const curSize = activeSt.size || BASE_SIZE;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160 + (bottomPad || 0) }}>
        <TextInput
          value={title}
          onChangeText={t => { titleTouched.current = true; setTitle(t.replace(/\n/g, ' ')); titleRef.current = t; changed(); }}
          placeholder={T('ttlPh', 'Título')} placeholderTextColor={c.muted}
          multiline scrollEnabled={false} blurOnSubmit
          onSubmitEditing={() => { const f = blocksRef.current.find(b => b.t === 'text'); if (f) wantFocus.current = { key: f.k, pos: 0 }; setTitle(t => t); }}
          onFocus={() => { setFocusK(null); focus.current.k = null; }}
          style={{ color: c.text, fontSize: 26, fontWeight: '700', lineHeight: 33, paddingVertical: 4, paddingHorizontal: 0 }}
          selectionColor={c.text} underlineColorAndroid="transparent"
        />
        {!!fmtDate && <Text style={{ color: c.muted, fontSize: 13, marginTop: 2, marginBottom: 10 }}>{fmtDate(note.updated)}</Text>}
        {blocks.map((b, i) => (b.t === 'text' ? renderText(b, i) : b.t === 'img' ? renderImg(b) : b.t === 'media' ? renderMedia(b) : renderList(b)))}
        <Pressable style={{ height: 240 }} onPress={() => {         // tocar abajo: escribir al final
          const last = blocksRef.current[blocksRef.current.length - 1];
          if (last && last.t === 'text') { const n = spansPlain(last.spans).length; wantFocus.current = { key: last.k, pos: n }; setFocusK(last.k); setSelV({ start: n, end: n }); setTitle(t => t); }
        }} />
      </ScrollView>

      {/* paneles: tamaños / colores / resaltar / foto */}
      {panel && (
        <View style={{ position: 'absolute', left: 10, right: 10, bottom: 62 + (bottomPad || 0), borderRadius: 20, padding: 10, backgroundColor: c.card || 'rgba(30,30,34,0.97)',
          borderWidth: 1, borderColor: c.border, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {panel === 'size' && SIZES.map(z => (
            <Pressable key={z} onPress={() => { applyStyle(st => { if (z === BASE_SIZE) delete st.size; else st.size = z; return st; }); setPanel(null); }}
              style={[chip(c), curSize === z && { backgroundColor: c.text }]}>
              <Text style={{ color: curSize === z ? c.inv : c.text, fontWeight: '700', fontSize: Math.min(z, 22) }}>{z}</Text>
            </Pressable>
          ))}
          {panel === 'color' && COLORS.map((col, i) => (
            <Pressable key={i} onPress={() => { applyStyle(st => { if (col) st.color = col; else delete st.color; return st; }); setPanel(null); }}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col || c.text, borderWidth: 2, borderColor: (activeSt.color || null) === col ? '#5ccfff' : 'transparent' }} />
          ))}
          {panel === 'hl' && HILITES.map((col, i) => (
            <Pressable key={i} onPress={() => { applyStyle(st => { if (col) st.bg = col; else delete st.bg; return st; }); setPanel(null); }}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col || 'transparent', borderWidth: 2, borderColor: col ? 'transparent' : c.muted, alignItems: 'center', justifyContent: 'center' }}>
              {!col && <Feather name="slash" size={16} color={c.muted} />}
            </Pressable>
          ))}
          {panel === 'photo' && (
            <>
              <Pressable onPress={() => addPhoto(true)} style={[chip(c), { flexDirection: 'row', gap: 6, paddingHorizontal: 14 }]}>
                <Feather name="camera" size={18} color={c.text} /><Text style={{ color: c.text, fontWeight: '700' }}>{T('camera', 'Cámara')}</Text>
              </Pressable>
              <Pressable onPress={() => addPhoto(false)} style={[chip(c), { flexDirection: 'row', gap: 6, paddingHorizontal: 14 }]}>
                <Feather name="image" size={18} color={c.text} /><Text style={{ color: c.text, fontWeight: '700' }}>{T('gallery', 'Galería')}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8 + (bottomPad || 0), height: 50, borderRadius: 25, backgroundColor: c.card || 'rgba(30,30,34,0.97)',
        borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ alignItems: 'center', gap: 2, paddingHorizontal: 2 }}>
          <B c={c} on={inText && activeSt.b} onPress={() => toggle('b')}>B</B>
          <B c={c} on={inText && activeSt.i} onPress={() => toggle('i')}><Text style={{ color: inText && activeSt.i ? c.inv : c.text, fontStyle: 'italic', fontWeight: '700', fontSize: 16 }}>I</Text></B>
          <B c={c} on={inText && activeSt.u} onPress={() => toggle('u')}><Text style={{ color: inText && activeSt.u ? c.inv : c.text, textDecorationLine: 'underline', fontWeight: '700', fontSize: 16 }}>U</Text></B>
          <B c={c} on={inText && activeSt.s} onPress={() => toggle('s')}><Text style={{ color: inText && activeSt.s ? c.inv : c.text, textDecorationLine: 'line-through', fontWeight: '700', fontSize: 16 }}>S</Text></B>
          <B c={c} wide on={panel === 'size'} onPress={() => setPanel(p => (p === 'size' ? null : 'size'))}>
            <Text style={{ color: panel === 'size' ? c.inv : c.text, fontWeight: '800', fontSize: 14 }}>Aa {curSize}</Text>
          </B>
          <B c={c} on={panel === 'color'} onPress={() => setPanel(p => (p === 'color' ? null : 'color'))}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: activeSt.color || c.text, borderWidth: 2, borderColor: c.border }} />
          </B>
          <B c={c} on={panel === 'hl'} onPress={() => setPanel(p => (p === 'hl' ? null : 'hl'))}>
            <MaterialCommunityIcons name="marker" size={19} color={panel === 'hl' ? c.inv : c.text} />
          </B>
          <B c={c} onPress={toChecklist}><Feather name="check-square" size={19} color={c.text} /></B>
          <B c={c} on={panel === 'photo'} onPress={() => setPanel(p => (p === 'photo' ? null : 'photo'))}>
            <Feather name="camera" size={19} color={panel === 'photo' ? c.inv : c.text} />
          </B>
          <B c={c} wide onPress={() => { doSave(); onFull && onFull(); }}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>{T('fullEditor', 'Completo')}</Text>
          </B>
        </ScrollView>
      </View>
    </View>
  );
});

function Btn({ on, onPress, children, wide, c }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => ({ minWidth: wide ? 52 : 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
      backgroundColor: on ? c.text : pressed ? 'rgba(127,127,127,0.25)' : 'transparent' })}>
      {typeof children === 'string' ? <Text style={{ color: on ? c.inv : c.text, fontWeight: '800', fontSize: 16 }}>{children}</Text> : children}
    </Pressable>
  );
}
function chip(c) {
  return { minWidth: 40, height: 36, borderRadius: 18, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border };
}

export default NativeEditor;
