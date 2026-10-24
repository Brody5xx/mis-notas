/* ============================================================
   nativo-html.js — convierte el HTML de una nota en "bloques" para el
   EDITOR RÁPIDO (nativo) y de vuelta a HTML, en el MISMO formato que usa
   el editor completo. Si la nota tiene algo que el editor rápido no sabe
   mostrar sin dañarlo, devuelve ok:false y la nota se abre en el completo.
   Bloques:
     { t:'text',  text:'línea 1\nlínea 2', st:{ b,i,u,s,size,color,bg } }
     { t:'check', items:[{ text, done }] }
     { t:'img',   raw:'<div class="imgwrap"...>', iid, src, pct, w, h, stamp }
   ============================================================ */

const VOID = { br: 1, img: 1, hr: 1, input: 1, meta: 1, wbr: 1, source: 1, col: 1, area: 1, base: 1, link: 1, embed: 1, track: 1, param: 1 };

export function decodeEnt(s) {
  return String(s).replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n); } catch (x) { return m; } }
    const M = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return M[e] != null ? M[e] : m;
  });
}
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}
function attrsOf(s) {
  const a = {}; const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g; let m;
  while ((m = re.exec(s))) a[m[1].toLowerCase()] = decodeEnt(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : '');
  return a;
}
/* HTML → árbol sencillo (con dónde empieza y termina cada parte, para copiar fotos tal cual) */
export function parseTree(html) {
  const root = { tag: '#root', children: [], start: 0 };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const tok = m[0], top = stack[stack.length - 1];
    if (tok.startsWith('<!--')) continue;
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (m[1]) {                                         // cierre
        let i = stack.length - 1;
        while (i > 0 && stack[i].tag !== tag) i--;
        if (i > 0) { for (let j = stack.length - 1; j >= i; j--) stack[j].end = re.lastIndex; stack.length = i; }
        continue;
      }
      const node = { tag, attrs: attrsOf(m[3] || ''), children: [], start: m.index, end: re.lastIndex };
      top.children.push(node);
      const selfClose = /\/\s*$/.test(m[3] || '');
      if (!VOID[tag] && !selfClose) stack.push(node);
      continue;
    }
    top.children.push({ text: decodeEnt(tok === '<' ? '<' : tok) });
  }
  for (let j = stack.length - 1; j > 0; j--) stack[j].end = html.length;
  return root;
}

const DEF = {};
function cssOf(str) {
  const o = {}; String(str || '').split(';').forEach(p => { const i = p.indexOf(':'); if (i > 0) o[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim(); });
  return o;
}
/* Estilo que agrega una etiqueta. Devuelve null si tiene algo que no sabemos manejar. */
function tagStyle(node, st) {
  const s = { ...st };
  const t = node.tag;
  if (t === 'b' || t === 'strong') s.b = 1;
  else if (t === 'i' || t === 'em') s.i = 1;
  else if (t === 'u' || t === 'ins') s.u = 1;
  else if (t === 's' || t === 'strike' || t === 'del') s.s = 1;
  else if (t === 'font') {
    if (node.attrs.face || node.attrs.size) return null;
    if (node.attrs.color) s.color = node.attrs.color;
  } else if (t !== 'span') return null;
  const okAttrs = { style: 1, class: 1, color: 1, dir: 1 };
  for (const k in node.attrs) if (!okAttrs[k]) return null;
  if (node.attrs.class && node.attrs.class.trim()) return null;
  const css = cssOf(node.attrs.style);
  for (const k in css) {
    const v = css[k].toLowerCase();
    if (k === 'font-size') { const n = /^([0-9.]+)px$/.exec(v); if (!n) return null; s.size = Math.round(parseFloat(n[1])); }
    else if (k === 'color') s.color = css[k];
    else if (k === 'background-color') { if (v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)') s.bg = css[k]; }
    else if (k === 'font-weight') { if (v === 'bold' || +v >= 600) s.b = 1; else if (v === 'normal' || +v <= 500) delete s.b; else return null; }
    else if (k === 'font-style') { if (v === 'italic') s.i = 1; else if (v === 'normal') delete s.i; else return null; }
    else if (k === 'text-decoration' || k === 'text-decoration-line') {
      if (/underline/.test(v)) s.u = 1; if (/line-through/.test(v)) s.s = 1;
      if (!/underline|line-through|none/.test(v)) return null;
    } else if (k === 'caret-color' || k === 'font-family' && v === 'inherit') { /* sin efecto */ }
    else return null;
  }
  return s;
}
function styleKey(st) { return JSON.stringify([st.b ? 1 : 0, st.i ? 1 : 0, st.u ? 1 : 0, st.s ? 1 : 0, st.size || 0, st.color || '', st.bg || '']); }
export function sameStyle(a, b) { return styleKey(a || DEF) === styleKey(b || DEF); }
function cleanStyle(st) { const o = {}; ['b', 'i', 'u', 's'].forEach(k => { if (st[k]) o[k] = 1; }); if (st.size) o.size = st.size; if (st.color) o.color = st.color; if (st.bg) o.bg = st.bg; return o; }

/* Junta el texto (con su estilo) de una parte de la nota */
function inlineRuns(node, st, out) {
  for (const ch of node.children) {
    if (ch.text != null) { out.runs.push({ text: ch.text, st }); continue; }
    if (ch.tag === 'br') { out.runs.push({ br: 1 }); continue; }
    const s2 = tagStyle(ch, st);
    if (!s2) { out.bad = 1; out.why = ch.tag; return; }
    inlineRuns(ch, s2, out);
    if (out.bad) return;
  }
}
function plainOfRuns(runs) { return runs.map(r => (r.br ? '\n' : r.text)).join('').replace(/\u200B/g, ''); }
function hasStyle(runs) { return runs.some(r => !r.br && r.text.trim() && Object.keys(cleanStyle(r.st)).length); }

function imgInfo(node, raw) {
  const img = node.children.find(x => x.tag === 'img');
  if (!img) return null;
  const css = cssOf(node.attrs.style);
  const pct = /([0-9.]+)%/.exec(css.width || '');
  let stamp = '';
  const svg = node.children.find(x => x.tag === 'svg');
  if (svg) { const txt = (function f(n) { for (const c of n.children || []) { if (c.tag === 'text') return (c.children || []).map(x => x.text || '').join(''); const r = f(c); if (r) return r; } return ''; })(svg); stamp = txt; }
  return {
    t: 'img', raw, iid: img.attrs['data-iid'] || null, src: img.attrs.src && /^data:/.test(img.attrs.src) ? img.attrs.src : null,
    pct: pct ? Math.max(10, Math.min(100, parseFloat(pct[1]))) : 40,
    w: +img.attrs.width || 0, h: +img.attrs.height || 0, stamp,
    rot: +(node.attrs['data-rot'] || 0) || 0,
  };
}

let KEY = 1;
export function newKey() { return 'k' + (KEY++); }

/* Un bloque de texto tiene "pedazos" (spans) con su estilo; '\n' separa renglones */
export function mergeSpans(spans) {
  const out = [];
  for (const sp of spans) {
    if (!sp.text) continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last.st, sp.st)) last.text += sp.text;
    else out.push({ text: sp.text, st: cleanStyle(sp.st || DEF) });
  }
  return out;
}
export function spansPlain(spans) { return spans.map(x => x.text).join(''); }

export function htmlToBlocks(html, isHtml = true) {
  const blocks = [];
  let tb = null;                                          // bloque de texto que se está armando
  const addLine = (runs) => {                             // runs de UN renglón (sin <br>)
    if (!tb) { tb = { k: newKey(), t: 'text', spans: [] }; blocks.push(tb); }
    else tb.spans.push({ text: '\n', st: DEF });
    for (const r of runs) { const t = r.text.replace(/​/g, ''); if (t) tb.spans.push({ text: t, st: r.st }); }
  };
  const addRuns = (runs) => {                             // runs con <br> adentro → varios renglones
    let line = [];
    for (const r of runs) { if (r.br) { addLine(line); line = []; } else line.push(r); }
    addLine(line);
  };
  const endText = () => { if (tb) tb.spans = mergeSpans(tb.spans); tb = null; };
  if (!isHtml) {
    String(html || '').split('\n').forEach(l => addLine([{ text: l, st: DEF }]));
    endText();
    if (!blocks.length) blocks.push({ k: newKey(), t: 'text', spans: [] });
    return { ok: true, blocks };
  }
  const src = String(html || '');
  const root = parseTree(src);
  const listBlock = (node, kind) => {
    const items = [];
    for (const li of node.children) {
      if (li.text != null) { if (li.text.trim()) return false; continue; }
      if (li.tag !== 'li') return false;
      for (const k in li.attrs) if (k !== 'class' && k !== 'data-head' && k !== 'data-prev') return false;
      const out = { runs: [] }; inlineRuns(li, DEF, out);
      if (out.bad || hasStyle(out.runs)) return false;       // con formato adentro: en el editor completo
      items.push({ k: newKey(), text: plainOfRuns(out.runs).replace(/\n+$/, '').replace(/\n/g, ' '), done: kind === 'check' && /\bdone\b/.test(li.attrs.class || '') });
    }
    endText();
    blocks.push({ k: newKey(), t: kind, items: items.length ? items : [{ k: newKey(), text: '', done: false }] });
    return true;
  };
  const block = (node) => {
    const cls = (node.attrs && node.attrs.class) || '';
    if (node.tag === 'div' && /\bimgwrap\b/.test(cls)) {
      const info = imgInfo(node, src.slice(node.start, node.end));
      if (!info || info.rot) return false;                  // fotos giradas: mejor en el editor completo
      endText();
      blocks.push({ k: newKey(), ...info });
      return true;
    }
    if (node.tag === 'div' && /\b(audwrap|vidwrap)\b/.test(cls)) {          // 🎙️🎬 audio o video: se guarda tal cual
      const isV = /\bvidwrap\b/.test(cls);
      const el = (function f(n) { for (const ch of n.children || []) { if (ch.tag === (isV ? 'video' : 'audio')) return ch; const r = f(ch); if (r) return r; } return null; })(node);
      if (!el) return false;
      endText();
      blocks.push({ k: newKey(), t: 'media', kind: isV ? 'video' : 'audio', raw: src.slice(node.start, node.end),
        aid: el.attrs['data-aid'] || null, src: el.attrs.src && /^data:/.test(el.attrs.src) ? el.attrs.src : null,
        dur: +(node.attrs['data-dur'] || 0) || 0, size: +(node.attrs['data-size'] || 0) || 0, muted: node.attrs['data-muted'] === '1' });
      return true;
    }
    if (node.tag === 'ul' && /\bchecklist\b/.test(cls)) return listBlock(node, 'check');
    if ((node.tag === 'ul' || node.tag === 'ol') && !cls.trim()) return listBlock(node, node.tag);
    if (node.tag === 'div' || node.tag === 'p') {
      for (const k in node.attrs) if (k !== 'style' && k !== 'dir') return false;
      const css = cssOf(node.attrs.style); for (const k in css) if (!(k === 'text-align' && css[k] === 'left')) return false;
      if (node.children.some(ch => ['div', 'p', 'ul', 'ol'].includes(ch.tag))) {    // bloques dentro de un bloque
        let lo = [];
        const flushLo = () => { if (lo.length) { addRuns(lo); lo = []; } };
        for (const ch of node.children) {
          if (['div', 'p', 'ul', 'ol'].includes(ch.tag)) { flushLo(); if (!block(ch)) return false; }
          else if (ch.text != null) lo.push({ text: ch.text, st: DEF });
          else if (ch.tag === 'br') lo.push({ br: 1 });
          else { const s2 = tagStyle(ch, DEF); if (!s2) return false; const o = { runs: [] }; inlineRuns(ch, s2, o); if (o.bad) return false; lo.push(...o.runs); }
        }
        flushLo();
        return true;
      }
      const out = { runs: [] }; inlineRuns(node, DEF, out);
      if (out.bad) return false;
      const runs = out.runs.slice();
      if (runs.length && runs[runs.length - 1].br) runs.pop();      // <div>texto<br></div> = un renglón
      addRuns(runs);
      return true;
    }
    return false;
  };
  let loose = [];
  for (const node of root.children) {
    const inl = node.text != null || node.tag === 'br' || ['span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'font', 'ins'].includes(node.tag);
    if (inl) {
      if (node.text != null) { const t = node.text.replace(/\n/g, ''); if (t) loose.push({ text: t, st: DEF }); }
      else if (node.tag === 'br') loose.push({ br: 1 });
      else { const s2 = tagStyle(node, DEF); if (!s2) return { ok: false, why: node.tag }; const o = { runs: [] }; inlineRuns(node, s2, o); if (o.bad) return { ok: false, why: o.why }; loose.push(...o.runs); }
      continue;
    }
    if (loose.length) { if (loose.some(r => r.br || r.text.trim())) addRuns(loose); loose = []; }
    if (!block(node)) return { ok: false, why: node.tag + ' ' + ((node.attrs && node.attrs.class) || '') };
  }
  if (loose.length && loose.some(r => r.br || r.text.trim())) addRuns(loose);
  endText();
  if (!blocks.length || blocks[blocks.length - 1].t !== 'text') blocks.push({ k: newKey(), t: 'text', spans: [] });
  return { ok: true, blocks };
}

function cssFrom(st) {
  const p = [];
  if (st.b) p.push('font-weight: 700');
  if (st.i) p.push('font-style: italic');
  if (st.u || st.s) p.push('text-decoration: ' + [st.u ? 'underline' : '', st.s ? 'line-through' : ''].filter(Boolean).join(' '));
  if (st.size) p.push('font-size: ' + st.size + 'px');
  if (st.color) p.push('color: ' + st.color);
  if (st.bg) p.push('background-color: ' + st.bg);
  return p.join('; ');
}
function textHtml(t, first = true, last = true) {
  let x = String(t).replace(/\u200B/g, '').replace(/ {2}/g, ' \u00a0');
  if (first) x = x.replace(/^ /, '\u00a0');
  if (last) x = x.replace(/ $/, '\u00a0');
  return esc(x);
}
export function spansHtml(spans) {
  const lines = [[]];
  for (const sp of spans) {
    const parts = String(sp.text).split('\n');
    parts.forEach((p, i) => { if (i > 0) lines.push([]); if (p) lines[lines.length - 1].push({ text: p, st: sp.st }); });
  }
  return lines.map(l => {
    if (!l.length) return '<div><br></div>';
    return '<div>' + l.map((x, i) => { const tx = textHtml(x.text, i === 0, i === l.length - 1); const css = cssFrom(x.st || DEF); return css ? '<span style="' + css + ';">' + tx + '</span>' : tx; }).join('') + '</div>';
  }).join('');
}
export function blocksToHtml(blocks) {
  let h = '';
  blocks.forEach((b, i) => {
    if (b.t === 'text') h += spansHtml(b.spans);
    else if (b.t === 'check') {
      const items = b.items.filter(x => !x.done).concat(b.items.filter(x => x.done));
      h += '<ul class="checklist">' + items.map(x => '<li' + (x.done ? ' class="done"' : '') + '>' + (x.text ? textHtml(x.text) : '<br>') + '</li>').join('') + '</ul>';
    } else if (b.t === 'ul' || b.t === 'ol') {
      h += '<' + b.t + '>' + b.items.map(x => '<li>' + (x.text ? textHtml(x.text) : '<br>') + '</li>').join('') + '</' + b.t + '>';
    } else if (b.t === 'img' || b.t === 'media') {
      h += b.raw;
      const nx = blocks[i + 1];
      if (!nx || nx.t !== 'text') h += '<div><br></div>';
    }
  });
  return h;
}
/* Texto plano (para buscar, contar palabras, etc.) */
export function blocksPlain(blocks) {
  return blocks.map(b => (b.t === 'text' ? spansPlain(b.spans) : b.items ? b.items.map(x => x.text).join('\n') : '')).join('\n');
}
/* La foto nueva, en el mismo formato del editor completo */
export function newImgRaw(iid, w, h, stampSvg, taken) {
  return '<div class="imgwrap" contenteditable="false" data-scale="100" data-taken="' + (taken || Date.now()) + '" style="width:40%">' +
    '<img data-iid="' + iid + '"' + (w && h ? ' width="' + w + '" height="' + h + '"' : '') + '>' + (stampSvg || '') + '</div>';
}
