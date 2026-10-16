/* ============================================================
   calc.js — calculadora gráfica (va junto a App.js)
   Pestañas: Calc · Y= · Gráfica · Tabla
   ============================================================ */

export function buildCalcHtml({ c, tr, state, canInsert, fx, locale }) {
  const T = (k) => (tr ? tr(k) : k);
  const H = (k) => String(T(k)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const J = (k) => JSON.stringify(String(T(k))).replace(/</g, '\\u003c');
  const st = JSON.stringify(state || {}).replace(/</g, '\\u003c');
  const fxs = JSON.stringify(fx || null).replace(/</g, '\\u003c');
  const loc = JSON.stringify(locale || 'es');
  const bg = (c.grad && c.grad[0]) || '#1c1c1c';

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
  html,body{margin:0;height:100%;background:${bg};color:${c.text};font-family:-apple-system,Roboto,"Segoe UI",sans-serif;overflow:hidden}
  body{display:flex;flex-direction:column}
  #top{display:flex;align-items:center;gap:6px;padding:10px 10px 6px}
  .tabs{flex:1;display:flex;background:rgba(255,255,255,.07);border:1px solid ${c.border};border-radius:20px;padding:3px}
  .tab{flex:1;min-width:0;border:none;background:transparent;color:${c.text};font-size:13px;font-weight:600;padding:8px 0;border-radius:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tab.on{background:${c.text};color:${c.inv}}
  .ibtn{flex:none;width:40px;height:40px;border-radius:20px;border:1px solid ${c.border};background:rgba(255,255,255,.06);color:${c.text};
        font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}
  #sub{display:flex;align-items:center;gap:8px;padding:0 12px 6px;min-height:34px}
  .pill{border:1px solid ${c.border};background:rgba(255,255,255,.06);color:${c.text};border-radius:16px;padding:6px 12px;font-size:13px;font-weight:600}
  .pill.on{background:${c.text};color:${c.inv}}
  .grow{flex:1}
  .view{display:none;flex:1;min-height:0;flex-direction:column}
  .view.show{display:flex}

  /* ---- Calc ---- */
  #hist{flex:1;overflow-y:auto;padding:4px 14px;display:flex;flex-direction:column}
  #hist .sp{flex:1}
  .he{padding:6px 0;border-bottom:1px solid rgba(255,255,255,.07)}
  .he .q{font-size:16px;color:${c.muted};word-break:break-all}
  .he .a{font-size:24px;font-weight:700;text-align:right;word-break:break-all}
  .he .a.err{color:#ff6b6b;font-size:18px}
  .inwrap{padding:4px 12px 8px}
  input.ln{width:100%;font-size:24px;padding:10px 12px;border-radius:14px;border:1.5px solid ${c.border};background:rgba(0,0,0,.18);
           color:${c.text};outline:none;font-family:inherit;-webkit-user-select:text;user-select:text;caret-color:${c.text}}
  input.ln.act{border-color:${c.text}}
  #preview{min-height:20px;text-align:right;color:${c.muted};font-size:15px;padding:2px 4px 0}

  /* ---- Y= ---- */
  #yv{flex:1;overflow-y:auto;padding:4px 12px}
  .yrow{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .ytog{flex:none;width:52px;height:46px;border-radius:12px;border:2px solid;background:transparent;font-weight:800;font-size:15px}
  .ytog.off{opacity:.35}
  .yrow input.ln{font-size:20px;padding:9px 10px}

  /* ---- Gráfica ---- */
  #gwrap{flex:1;position:relative;min-height:0;touch-action:none}
  #gc{position:absolute;inset:0;width:100%;height:100%}
  #tinfo{position:absolute;left:10px;bottom:10px;right:10px;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.55);
         font-size:15px;font-variant-numeric:tabular-nums;display:none}
  #gbtns{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:8px}
  #gbtns .ibtn{background:rgba(0,0,0,.45);font-size:18px}

  /* ---- Tabla ---- */
  #tv{flex:1;overflow:auto;padding:0 12px 12px}
  .tset{display:flex;gap:10px;margin-bottom:8px}
  .tset label{flex:1;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:.05em}
  .tset input{display:block;width:100%;margin-top:4px;font-size:17px;padding:8px 10px;border-radius:12px;border:1.5px solid ${c.border};
              background:rgba(0,0,0,.18);color:${c.text};outline:none;-webkit-user-select:text;user-select:text}
  table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
  th,td{padding:8px 6px;text-align:right;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px;white-space:nowrap}
  th{position:sticky;top:0;background:${bg};font-size:14px}
  td:first-child,th:first-child{text-align:left;color:${c.muted}}
  td.mul,th.mul{color:${c.muted};font-size:14px}

  /* ---- Divisas ---- */
  #fxv{flex:1;overflow-y:auto;padding:4px 14px 20px}
  .cur{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;border:1px solid ${c.border};
       background:rgba(255,255,255,.06);color:${c.text};font-family:inherit;text-align:left}
  .cur .fl{font-size:28px;line-height:1}
  .cur .cd{font-size:18px;font-weight:800}
  .cur .nm{flex:1;font-size:14px;color:${c.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #fxAmt{width:100%;margin:10px 0 0;font-size:32px;font-weight:700;padding:10px 14px;border-radius:16px;border:1.5px solid ${c.border};
         background:rgba(0,0,0,.18);color:${c.text};outline:none;font-family:inherit;-webkit-user-select:text;user-select:text}
  #fxSwap{display:block;margin:12px auto;width:48px;height:48px;border-radius:24px;border:1px solid ${c.border};background:rgba(255,255,255,.1);
          color:${c.text};font-size:22px}
  #fxRes{margin-top:10px;font-size:36px;font-weight:800;word-break:break-all;padding:4px 4px 0}
  .fxl{font-size:15px;color:${c.muted};padding:4px 4px 0;font-variant-numeric:tabular-nums}
  #fxInfo{margin-top:16px;font-size:12px;color:${c.muted};padding:0 4px;line-height:1.5}
  #fxPick{position:fixed;inset:0;z-index:20;background:${bg};display:none;flex-direction:column}
  #fxPick.show{display:flex}
  #fxPick .ph{display:flex;gap:8px;padding:12px}
  #fxQ{flex:1;font-size:17px;padding:10px 14px;border-radius:14px;border:1.5px solid ${c.border};background:rgba(0,0,0,.18);color:${c.text};
       outline:none;-webkit-user-select:text;user-select:text;font-family:inherit}
  #fxList{flex:1;overflow-y:auto;padding:0 12px 20px}
  #fxList .cur{border:none;border-bottom:1px solid rgba(255,255,255,.07);border-radius:0;background:transparent}
  #fxList .cur.on{background:rgba(255,255,255,.1);border-radius:12px}

  /* ---- Teclado ---- */
  #pad{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px 10px 12px}
  #pad.hide{display:none}
  .k{position:relative;height:44px;border-radius:14px;border:1px solid ${c.border};background:rgba(255,255,255,.07);color:${c.text};
     font-size:17px;font-weight:600;padding:8px 0 0;font-family:inherit;display:flex;align-items:center;justify-content:center}
  .k:active{transform:scale(.95);background:rgba(255,255,255,.18)}
  .k .s{position:absolute;top:2px;left:0;right:0;font-size:10px;font-weight:700;color:#7fb2ff;line-height:1;text-align:center}
  .k.num{background:rgba(255,255,255,.14);font-size:20px}
  .k.op{background:rgba(255,255,255,.10);font-size:21px}
  .k.sec{color:#7fb2ff}
  body.second .k.sec{background:#7fb2ff;color:#111}
  body.second .k .s{color:${c.text}}
  .k.ent{background:${c.text};color:${c.inv};font-size:15px;font-weight:800}
  .k.clr{color:#ff6b6b}
  #tip{position:fixed;left:50%;top:60px;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;padding:8px 14px;border-radius:14px;
       font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:9}
  #tip.show{opacity:1}
</style></head><body>

<div id="top">
  <button class="ibtn" id="close">✕</button>
  <div class="tabs">
    <button class="tab on" data-tab="calc">Calc</button>
    <button class="tab" data-tab="y">Y=</button>
    <button class="tab" data-tab="graph">${H('calcGraph')}</button>
    <button class="tab" data-tab="table">${H('calcTable')}</button>
    <button class="tab" data-tab="fx">${H('calcFx')}</button>
  </div>
</div>
<div id="sub">
  <button class="pill" id="ang">RAD</button>
  <span class="grow"></span>
  ${canInsert ? `<button class="pill" id="ins">↧ ${H('calcInsert')}</button>` : ''}
</div>

<div class="view show" id="v-calc">
  <div id="hist"><div class="sp"></div></div>
  <div class="inwrap"><input class="ln act" id="in" inputmode="none" autocomplete="off" autocorrect="off" spellcheck="false"><div id="preview"></div></div>
</div>
<div class="view" id="v-y"><div id="yv"></div></div>
<div class="view" id="v-graph">
  <div id="gwrap"><canvas id="gc"></canvas>
    <div id="gbtns">
      <button class="ibtn" id="zin">+</button>
      <button class="ibtn" id="zout">−</button>
      <button class="ibtn" id="zstd">⟲</button>
      <button class="ibtn" id="trc">⌖</button>
    </div>
    <div id="tinfo"></div>
  </div>
</div>
<div class="view" id="v-table"><div id="tv">
  <div class="tset">
    <label>${H('calcStart')}<input id="tstart" inputmode="decimal" value="0"></label>
    <label>${H('calcStep')}<input id="tstep" inputmode="decimal" value="1"></label>
  </div>
  <table id="tbl"></table>
</div></div>

<div class="view" id="v-fx"><div id="fxv">
  <button class="cur" id="fxFrom"></button>
  <input id="fxAmt" inputmode="decimal" value="1" autocomplete="off">
  <button id="fxSwap">⇅</button>
  <button class="cur" id="fxTo"></button>
  <div id="fxRes"></div>
  <div class="fxl" id="fxL1"></div>
  <div class="fxl" id="fxL2"></div>
  <div id="fxInfo"></div>
</div></div>
<div id="fxPick"><div class="ph"><button class="ibtn" id="fxBack">✕</button><input id="fxQ" placeholder="${H('fxSearch')}" autocomplete="off"></div><div id="fxList"></div></div>

<div id="pad"></div>
<div id="tip"></div>

<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var S = ${st};
  var COLORS = ['#4f8dff', '#ff5a5a', '#3ecf6e', '#c77dff'];
  S.hist = S.hist || [];
  S.ys = S.ys || ['', '', '', ''];
  S.on = S.on || [true, true, true, true];
  S.deg = !!S.deg;
  S.win = S.win || null;
  var ERR = ${J('calcError')};
  var ans = S.ans || 0;

  function send(m){
    var s = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage(s, '*');
  }
  var saveT;
  function save(){ clearTimeout(saveT); saveT = setTimeout(function(){
    S.ans = ans; send({ type: 'calcState', state: { hist: S.hist.slice(-60), ys: S.ys, on: S.on, deg: S.deg, win: S.win, ans: ans, fx: S.fx } });
  }, 300); }
  var tipT;
  function tip(t){ var e = $('tip'); e.textContent = t; e.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(function(){ e.classList.remove('show'); }, 1400); }

  /* =========================================================
     LECTOR DE FÓRMULAS (sin eval): convierte el texto en una
     función que se puede calcular con cualquier valor de x.
     ========================================================= */
  var FUN = {
    sin: function(v){ return Math.sin(toR(v)); }, cos: function(v){ return Math.cos(toR(v)); }, tan: function(v){ return Math.tan(toR(v)); },
    asin: function(v){ return fromR(Math.asin(v)); }, acos: function(v){ return fromR(Math.acos(v)); }, atan: function(v){ return fromR(Math.atan(v)); },
    ln: Math.log, log: function(v){ return Math.log10(v); }, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    exp: Math.exp, tenx: function(v){ return Math.pow(10, v); }
  };
  function toR(v){ return S.deg ? v * Math.PI / 180 : v; }
  function fromR(v){ return S.deg ? v * 180 / Math.PI : v; }
  var NAMES = ['asin', 'acos', 'atan', 'sqrt', 'cbrt', 'tenx', 'sin', 'cos', 'tan', 'abs', 'exp', 'log', 'ln', 'Ans', 'pi', 'e', 'x'];
  function fact(n){
    if (n < 0 || n !== Math.floor(n) || n > 170) return NaN;
    var r = 1; for (var i = 2; i <= n; i++) r *= i; return r;
  }
  function norm(t){
    return t.replace(/×/g, '*').replace(/÷/g, '/').replace(/[−‐]/g, '-')
      .replace(/sin⁻¹/g, 'asin').replace(/cos⁻¹/g, 'acos').replace(/tan⁻¹/g, 'atan')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁻¹/g, '^(-1)')
      .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt').replace(/ᴇ/g, '*10^')
      .replace(/10\\^\\(/g, 'tenx(').replace(/e\\^\\(/g, 'exp(');
  }
  function isDigit(ch){ return ch >= '0' && ch <= '9'; }
  function tokenize(t){
    var out = [], i = 0;
    while (i < t.length) {
      var ch = t.charAt(i);
      if (ch === ' ') { i++; continue; }
      if (isDigit(ch) || (ch === '.' && isDigit(t.charAt(i + 1)))) {
        var j = i; while (j < t.length && (isDigit(t.charAt(j)) || t.charAt(j) === '.')) j++;
        var num = t.slice(i, j);
        if ((num.match(/[.]/g) || []).length > 1) throw 0;
        out.push({ k: 'n', v: parseFloat(num) }); i = j; continue;
      }
      if ('+-*/^()!%,'.indexOf(ch) >= 0) { out.push({ k: ch }); i++; continue; }
      var hit = null;
      for (var n = 0; n < NAMES.length; n++) if (t.substr(i, NAMES[n].length) === NAMES[n]) { hit = NAMES[n]; break; }
      if (!hit) throw 0;
      out.push(FUN[hit] ? { k: 'f', v: hit } : { k: 'id', v: hit }); i += hit.length;
    }
    var open = 0; out.forEach(function(x){ if (x.k === '(') open++; if (x.k === ')') open--; });
    while (open-- > 0) out.push({ k: ')' });           // cerrar paréntesis que faltan (como la TI)
    return out;
  }
  function compile(text){
    var tk = tokenize(norm(text)), p = 0;
    if (!tk.length) throw 0;
    function peek(){ return tk[p]; }
    function eat(k){ if (tk[p] && tk[p].k === k) { p++; return true; } return false; }
    function startsPrimary(x){ return x && (x.k === 'n' || x.k === 'id' || x.k === 'f' || x.k === '('); }
    function expr(){
      var a = term();
      while (peek() && (peek().k === '+' || peek().k === '-')) {
        var op = tk[p++].k, b = term();
        a = (function(a, b, op){ return op === '+' ? function(x){ return a(x) + b(x); } : function(x){ return a(x) - b(x); }; })(a, b, op);
      }
      return a;
    }
    function term(){
      var a = unary();
      for (;;) {
        var t = peek();
        if (t && (t.k === '*' || t.k === '/')) {
          p++; var b = unary();
          a = (function(a, b, op){ return op === '*' ? function(x){ return a(x) * b(x); } : function(x){ return a(x) / b(x); }; })(a, b, t.k);
        } else if (startsPrimary(t)) {             // 2x, 3(4), 2π
          var c2 = power();
          a = (function(a, b){ return function(x){ return a(x) * b(x); }; })(a, c2);
        } else break;
      }
      return a;
    }
    function unary(){
      if (eat('-')) { var a = unary(); return function(x){ return -a(x); }; }
      if (eat('+')) return unary();
      return power();
    }
    function power(){
      var a = postfix();
      if (eat('^')) { var b = unary(); return function(x){ return Math.pow(a(x), b(x)); }; }
      return a;
    }
    function postfix(){
      var a = primary();
      for (;;) {
        if (eat('!')) { a = (function(a){ return function(x){ return fact(a(x)); }; })(a); continue; }
        if (eat('%')) { a = (function(a){ return function(x){ return a(x) / 100; }; })(a); continue; }
        break;
      }
      return a;
    }
    function primary(){
      var t = tk[p++];
      if (!t) throw 0;
      if (t.k === 'n') { var v = t.v; return function(){ return v; }; }
      if (t.k === '(') { var a = expr(); if (!eat(')')) throw 0; return a; }
      if (t.k === 'id') {
        if (t.v === 'pi') return function(){ return Math.PI; };
        if (t.v === 'e') return function(){ return Math.E; };
        if (t.v === 'Ans') { var an = ans; return function(){ return an; }; }
        if (t.v === 'x') return function(x){ return x; };
      }
      if (t.k === 'f') {
        var f = FUN[t.v], arg;
        if (peek() && peek().k === '(') { p++; arg = expr(); if (!eat(')')) throw 0; }
        else arg = power();
        return function(x){ return f(arg(x)); };
      }
      throw 0;
    }
    var fn = expr();
    if (p < tk.length) throw 0;
    return fn;
  }

  /* Mostrar números bonitos: 10 cifras, 1.5ᴇ12 para muy grandes */
  function fmt(v){
    if (typeof v !== 'number' || isNaN(v)) return ERR;
    if (!isFinite(v)) return ERR;
    if (Math.abs(v) < 1e-12) return '0';
    var a = Math.abs(v), s;
    if (a >= 1e10 || a < 1e-6) {
      s = v.toExponential(9).split('e');
      return trimZ(s[0]) + 'ᴇ' + (+s[1]);
    }
    s = String(parseFloat(v.toPrecision(10)));
    return s.replace('-', '−');
  }
  function trimZ(s){ return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/[.]$/, '') : s; }

  /* =========================================================
     PESTAÑAS
     ========================================================= */
  var tab = 'calc';
  function setTab(t){
    tab = t;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    document.querySelectorAll('.view').forEach(function(v){ v.classList.toggle('show', v.id === 'v-' + t); });
    $('pad').classList.toggle('hide', t === 'graph' || t === 'table' || t === 'fx');
    if (t === 'fx') fxOpen();
    $('ang').style.visibility = t === 'fx' || t === 'table' ? 'hidden' : '';
    if (t === 'calc') setActive($('in'));
    if (t === 'y') setActive(document.querySelector('.yrow input'));
    if (t === 'graph') setTimeout(drawGraph, 30);
    if (t === 'table') buildTable();
  }
  document.querySelectorAll('.tab').forEach(function(b){ b.addEventListener('click', function(){ setTab(b.getAttribute('data-tab')); }); });
  $('close').addEventListener('click', function(){ send({ type: 'calcClose' }); });
  function syncAng(){ $('ang').textContent = S.deg ? 'DEG' : 'RAD'; $('ang').classList.toggle('on', S.deg); }
  $('ang').addEventListener('click', function(){ S.deg = !S.deg; syncAng(); preview(); save(); if (tab === 'graph') drawGraph(); });
  syncAng();

  /* =========================================================
     ESCRIBIR CON EL TECLADO DE LA CALCULADORA
     ========================================================= */
  var active = $('in');
  function setActive(el){
    if (!el) return;
    active = el;
    document.querySelectorAll('input.ln').forEach(function(i){ i.classList.toggle('act', i === el); });
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }
  function insert(t, raw){
    var el = active, a = el.selectionStart == null ? el.value.length : el.selectionStart, b = el.selectionEnd == null ? a : el.selectionEnd;
    if (!raw && el === $('in') && !el.value && /^([+×÷^!]|[−]$|²|³|⁻¹)/.test(t)) { t = 'Ans' + t; }   // como la TI: empieza con Ans
    el.value = el.value.slice(0, a) + t + el.value.slice(b);
    var pos = a + t.length;
    el.setSelectionRange(pos, pos);
    changed(el);
  }
  function back(){
    var el = active, a = el.selectionStart, b = el.selectionEnd;
    if (a !== b) { el.value = el.value.slice(0, a) + el.value.slice(b); el.setSelectionRange(a, a); }
    else if (a > 0) {
      var cut = 1, before = el.value.slice(0, a);
      var m = before.match(/(sin⁻¹\\(|cos⁻¹\\(|tan⁻¹\\(|sin\\(|cos\\(|tan\\(|abs\\(|log\\(|ln\\(|10\\^\\(|e\\^\\(|Ans|√\\(|∛\\(|⁻¹)$/);
      if (m) cut = m[0].length;
      el.value = before.slice(0, a - cut) + el.value.slice(a);
      el.setSelectionRange(a - cut, a - cut);
    }
    changed(el);
  }
  function changed(el){
    if (el === $('in')) preview();
    else { var i = +el.getAttribute('data-i'); S.ys[i] = el.value; save(); }
  }
  function preview(){
    var v = $('in').value.trim(), out = '';
    if (v) { try { var r = compile(v)(0); if (!isNaN(r)) out = '= ' + fmt(r); } catch (e) {} }
    $('preview').textContent = out;
  }

  /* Historial */
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function renderHist(){
    var h = '<div class="sp"></div>';
    S.hist.forEach(function(x, i){
      h += '<div class="he" data-i="' + i + '"><div class="q">' + esc(x.e) + '</div><div class="a' + (x.r === ERR ? ' err' : '') + '">' + esc(x.r) + '</div></div>';
    });
    $('hist').innerHTML = h;
    $('hist').scrollTop = 1e9;
  }
  $('hist').addEventListener('click', function(e){         // tocar un resultado lo usa
    var he = e.target.closest('.he'); if (!he) return;
    var x = S.hist[+he.getAttribute('data-i')]; if (!x) return;
    setActive($('in'));
    insert(e.target.closest('.q') ? x.e : (x.r === ERR ? '' : x.r), true);
  });
  function enter(){
    var el = $('in'), v = el.value.trim();
    if (!v && S.hist.length) v = S.hist[S.hist.length - 1].e;     // ENTER vacío: repetir lo último
    if (!v) return;
    var r, av = fmt(ans);
    try { var n = compile(v)(0); r = fmt(n); if (isFinite(n)) ans = n; } catch (e) { r = ERR; }
    S.hist.push({ e: v, r: r, av: av });
    if (S.hist.length > 60) S.hist.shift();
    el.value = ''; $('preview').textContent = '';
    renderHist(); save();
  }
  function clearAll(){
    if (active === $('in') && !$('in').value) { S.hist = []; renderHist(); }
    active.value = ''; changed(active);
  }

  /* Insertar el último cálculo en la nota */
  if ($('ins')) $('ins').addEventListener('click', function(){
    if (tab === 'fx') { var ft = fxText(); if (ft) send({ type: 'calcInsert', text: ft }); else tip('—'); return; }
    var x = S.hist[S.hist.length - 1];
    if (!x || x.r === ERR) { tip('—'); return; }
    send({ type: 'calcInsert', text: x.e.replace(/Ans/g, x.av ? '(' + x.av + ')' : 'Ans') + ' = ' + x.r });
  });

  /* Las teclas: [principal, valor, 2nd, valor 2nd, clase] */
  var KEYS = [
    ['2nd', '#2nd', '', '', 'sec'], ['x', 'x', '', '', ''], ['π', 'π', '', '', ''], ['e', 'e', '', '', ''], ['⌫', '#back', '', '', 'clr'],
    ['sin', 'sin(', 'sin⁻¹', 'sin⁻¹(', ''], ['cos', 'cos(', 'cos⁻¹', 'cos⁻¹(', ''], ['tan', 'tan(', 'tan⁻¹', 'tan⁻¹(', ''], ['^', '^', 'ᴇ', 'ᴇ', ''], ['AC', '#clear', '', '', 'clr'],
    ['ln', 'ln(', 'eˣ', 'e^(', ''], ['log', 'log(', '10ˣ', '10^(', ''], ['√', '√(', '∛', '∛(', ''], ['x²', '²', 'x³', '³', ''], ['x⁻¹', '⁻¹', '!', '!', ''],
    ['7', '7', '', '', 'num'], ['8', '8', '', '', 'num'], ['9', '9', '', '', 'num'], ['(', '(', 'abs', 'abs(', ''], [')', ')', '%', '%', ''],
    ['4', '4', '', '', 'num'], ['5', '5', '', '', 'num'], ['6', '6', '', '', 'num'], ['×', '×', '', '', 'op'], ['÷', '÷', '', '', 'op'],
    ['1', '1', '', '', 'num'], ['2', '2', '', '', 'num'], ['3', '3', '', '', 'num'], ['+', '+', '', '', 'op'], ['−', '−', '', '', 'op'],
    ['0', '0', '', '', 'num'], ['.', '.', '', '', 'num'], ['(−)', '-', '', '', 'num'], ['Ans', 'Ans', '', '', ''], ['ENTER', '#enter', '', '', 'ent']
  ];
  var second = false;
  $('pad').innerHTML = KEYS.map(function(k, i){
    return '<button class="k ' + k[4] + '" data-k="' + i + '">' + (k[2] ? '<span class="s">' + k[2] + '</span>' : '') + k[0] + '</button>';
  }).join('');
  $('pad').addEventListener('pointerdown', function(e){ e.preventDefault(); });     // no quitar el cursor de la línea
  $('pad').addEventListener('click', function(e){
    var b = e.target.closest('.k'); if (!b) return;
    var k = KEYS[+b.getAttribute('data-k')];
    var v = second && k[3] ? k[3] : k[1];
    if (v !== '#2nd') { second = false; document.body.classList.remove('second'); }
    if (v === '#2nd') { second = !second; document.body.classList.toggle('second', second); return; }
    if (v === '#back') return back();
    if (v === '#clear') return clearAll();
    if (v === '#enter') {
      if (active === $('in')) return enter();
      var nx = document.querySelector('.yrow input[data-i="' + ((+active.getAttribute('data-i') + 1) % 4) + '"]');  // Y=: pasar a la siguiente
      return setActive(nx);
    }
    insert(v);
  });
  $('in').addEventListener('input', preview);
  $('in').addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); enter(); } });
  $('in').addEventListener('focus', function(){ setActive($('in')); });

  /* =========================================================
     Y= (hasta 4 funciones)
     ========================================================= */
  $('yv').innerHTML = [0, 1, 2, 3].map(function(i){
    return '<div class="yrow"><button class="ytog' + (S.on[i] ? '' : ' off') + '" data-t="' + i + '" style="border-color:' + COLORS[i] + ';color:' + COLORS[i] + '">Y' + (i + 1) + '</button>' +
      '<input class="ln" data-i="' + i + '" inputmode="none" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="x²−4"></div>';
  }).join('');
  document.querySelectorAll('.yrow input').forEach(function(inp){
    inp.value = S.ys[+inp.getAttribute('data-i')] || '';
    inp.addEventListener('focus', function(){ setActive(inp); });
    inp.addEventListener('input', function(){ changed(inp); });
  });
  document.querySelectorAll('.ytog').forEach(function(b){
    b.addEventListener('click', function(){ var i = +b.getAttribute('data-t'); S.on[i] = !S.on[i]; b.classList.toggle('off', !S.on[i]); save(); });
  });
  function funcs(){
    var out = [];
    S.ys.forEach(function(t, i){
      if (!S.on[i] || !t || !t.trim()) return;
      try { out.push({ i: i, f: compile(t) }); } catch (e) {}
    });
    return out;
  }

  /* =========================================================
     GRÁFICA: mover con un dedo, zoom con dos, botón de rastreo
     ========================================================= */
  var cv = $('gc'), ctx = cv.getContext('2d');
  var W = { cx: 0, cy: 0, sc: 0 };       // centro y unidades por píxel
  function stdWin(){ var r = cv.getBoundingClientRect(); W.cx = 0; W.cy = 0; W.sc = 20 / Math.max(1, Math.min(r.width, r.height)); }
  if (S.win && S.win.sc) W = S.win;
  var trace = false, tr = { fi: 0, x: 0 };
  function niceStep(range){
    var raw = range / 8, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
  }
  function drawGraph(){
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    if (!W.sc) stdWin();
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = r.width, h = r.height;
    var X = function(x){ return w / 2 + (x - W.cx) / W.sc; }, Y = function(y){ return h / 2 - (y - W.cy) / W.sc; };
    var x0 = W.cx - w / 2 * W.sc, x1 = W.cx + w / 2 * W.sc, y0 = W.cy - h / 2 * W.sc, y1 = W.cy + h / 2 * W.sc;
    ctx.clearRect(0, 0, w, h);
    // cuadrícula
    var step = niceStep(x1 - x0);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    for (var gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), h); }
    for (var gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) { ctx.moveTo(0, Y(gy)); ctx.lineTo(w, Y(gy)); }
    ctx.stroke();
    // ejes
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), h); ctx.stroke();
    // números de los ejes
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    var ay = Math.min(h - 4, Math.max(12, Y(0) + 14));
    for (gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) if (Math.abs(gx) > step / 2) ctx.fillText(fmt(+gx.toPrecision(6)), X(gx), ay);
    ctx.textAlign = 'left';
    var axx = Math.min(w - 30, Math.max(4, X(0) + 4));
    for (gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) if (Math.abs(gy) > step / 2) ctx.fillText(fmt(+gy.toPrecision(6)), axx, Y(gy) + 4);
    // funciones
    var fs = funcs();
    fs.forEach(function(F){
      ctx.strokeStyle = COLORS[F.i]; ctx.lineWidth = 2.4; ctx.beginPath();
      var pen = false, prev = null;
      for (var px = 0; px <= w; px += 1) {
        var xv = x0 + px * W.sc, yv;
        try { yv = F.f(xv); } catch (e) { yv = NaN; }
        var py = Y(yv);
        if (!isFinite(yv) || Math.abs(py) > 1e5) { pen = false; prev = null; continue; }
        if (pen && prev !== null && Math.abs(py - prev) > h * 0.6) pen = false;   // asíntota: no unir
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        prev = py;
      }
      ctx.stroke();
    });
    // rastreo
    var ti = $('tinfo');
    if (trace && fs.length) {
      var F = fs.filter(function(f){ return f.i === tr.fi; })[0] || fs[0]; tr.fi = F.i;
      var yv = F.f(tr.x);
      ti.style.display = 'block';
      ti.innerHTML = '<b style="color:' + COLORS[F.i] + '">Y' + (F.i + 1) + '</b>&nbsp;&nbsp;x = ' + fmt(tr.x) + '&nbsp;&nbsp;&nbsp;y = ' + fmt(yv);
      if (isFinite(yv)) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(tr.x), 0); ctx.lineTo(X(tr.x), h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COLORS[F.i]; ctx.beginPath(); ctx.arc(X(tr.x), Y(yv), 6, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
    } else ti.style.display = 'none';
  }
  function saveWin(){ S.win = { cx: W.cx, cy: W.cy, sc: W.sc }; save(); }
  function zoom(f){ W.sc *= f; saveWin(); drawGraph(); }
  $('zin').addEventListener('click', function(){ zoom(0.5); });
  $('zout').addEventListener('click', function(){ zoom(2); });
  $('zstd').addEventListener('click', function(){ stdWin(); saveWin(); drawGraph(); });
  $('trc').addEventListener('click', function(){
    var fs = funcs();
    if (!trace) { trace = true; tr.x = W.cx; tr.fi = fs.length ? fs[0].i : 0; }
    else if (fs.length > 1) {                       // tocar otra vez: siguiente función; al final se apaga
      var k = fs.map(function(f){ return f.i; }).indexOf(tr.fi);
      if (k < fs.length - 1) tr.fi = fs[k + 1].i; else trace = false;
    } else trace = false;
    $('trc').classList.toggle('pill', false);
    $('trc').style.background = trace ? '${c.text}' : '';
    $('trc').style.color = trace ? '${c.inv}' : '';
    drawGraph();
  });
  var pts = {}, g0 = null;
  var gw = $('gwrap');
  gw.addEventListener('pointerdown', function(e){
    if (e.target.closest('#gbtns')) return;
    gw.setPointerCapture(e.pointerId);
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    g0 = null;
    if (trace) moveTrace(e.clientX);
  });
  function moveTrace(cx){
    var r = cv.getBoundingClientRect();
    tr.x = W.cx + (cx - r.left - r.width / 2) * W.sc;
    drawGraph();
  }
  gw.addEventListener('pointermove', function(e){
    if (!pts[e.pointerId]) return;
    var ids = Object.keys(pts);
    if (ids.length === 1) {
      if (trace) { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moveTrace(e.clientX); return; }
      var p = pts[e.pointerId];
      W.cx -= (e.clientX - p.x) * W.sc; W.cy += (e.clientY - p.y) * W.sc;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      drawGraph();
    } else if (ids.length >= 2) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var a = pts[ids[0]], b = pts[ids[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      if (g0) { W.sc *= g0 / d; drawGraph(); }
      g0 = d;
    }
  });
  function up(e){ delete pts[e.pointerId]; g0 = null; if (!Object.keys(pts).length) saveWin(); }
  gw.addEventListener('pointerup', up); gw.addEventListener('pointercancel', up);
  window.addEventListener('resize', function(){ if (tab === 'graph') drawGraph(); });

  /* =========================================================
     TABLA
     ========================================================= */
  function buildTable(){
    var fs = funcs();
    var a = parseFloat(($('tstart').value || '0').replace(',', '.').replace('−', '-')) || 0;
    var s = parseFloat(($('tstep').value || '1').replace(',', '.').replace('−', '-')) || 1;
    var h = '<tr><th>x</th>' + fs.map(function(F){ return '<th style="color:' + COLORS[F.i] + '">Y' + (F.i + 1) + '</th>'; }).join('') + '<th class="mul">' + (a ? fmt(a) + ' + ' : '') + fmt(s) + ' × n</th></tr>';
    for (var k = 0; k < 40; k++) {
      var x = +(a + k * s).toPrecision(12);
      h += '<tr><td>' + fmt(x) + '</td>' + fs.map(function(F){ var y; try { y = F.f(x); } catch (e) { y = NaN; } return '<td>' + fmt(y) + '</td>'; }).join('') +
        '<td class="mul">' + (a ? fmt(a) + ' + ' : '') + fmt(s) + ' × ' + k + '</td></tr>';
    }
    
    $('tbl').innerHTML = h;
  }
  $('tstart').addEventListener('input', buildTable);
  $('tstep').addEventListener('input', buildTable);


  /* =========================================================
     DIVISAS: cambio de moneda (tasas del día por internet)
     ========================================================= */
  var LOC = ${loc}, FX = ${fxs};
  var region = (LOC.split('-')[1] || '').toUpperCase();
  S.fx = S.fx || { from: 'USD', to: '', amt: '1' };
  var POP = ['USD', 'EUR', 'DOP', 'MXN', 'COP', 'GBP', 'CAD', 'ARS', 'CLP', 'PEN', 'BRL', 'JPY', 'CNY', 'CHF', 'VES', 'GTQ', 'HNL', 'CRC', 'UYU', 'BOB', 'PYG', 'NIO', 'CUP', 'INR'];
  var curNames = null;
  try { curNames = new Intl.DisplayNames([LOC, 'en'], { type: 'currency' }); } catch (e) {}
  function cname(cd){ try { var n = curNames && curNames.of(cd); return n && n !== cd ? n : cd; } catch (e) { return cd; } }
  function flag(cd){
    var SPECIAL = { EUR: 'EU', ANG: 'CW', XCD: 'AG', XAF: 'CM', XOF: 'SN', XPF: 'PF', XDR: '', BTC: '' };
    var cc = cd in SPECIAL ? SPECIAL[cd] : cd.slice(0, 2);
    if (!cc) return '🌐';
    return String.fromCodePoint(127397 + cc.charCodeAt(0), 127397 + cc.charCodeAt(1));
  }
  function nf(v, max){
    try { return new Intl.NumberFormat(LOC, { maximumFractionDigits: max, minimumFractionDigits: max > 2 ? 0 : Math.min(2, max) }).format(v); }
    catch (e) { return String(+v.toFixed(max)); }
  }
  function smart(v){ var a = Math.abs(v); return nf(v, a >= 1 ? 2 : a >= 0.01 ? 4 : 6); }
  function fxReady(){ return FX && FX.rates && FX.rates.USD; }
  function fxPickDefault(){
    if (S.fx.to) return;
    var r = FX && FX.rates ? Object.keys(FX.rates) : POP;
    var mine = r.filter(function(c){ return c.slice(0, 2) === region && c !== 'USD'; })[0];
    S.fx.to = mine || (region === 'US' ? 'EUR' : 'EUR');
  }
  function fxAmt(){ var v = parseFloat(($('fxAmt').value || '').replace(/\\s/g, '').replace(',', '.')); return isNaN(v) ? 0 : v; }
  function fxConv(a, f, t){ return a * FX.rates[t] / FX.rates[f]; }
  function curBtn(el, cd){ el.innerHTML = '<span class="fl">' + flag(cd) + '</span><span class="cd">' + cd + '</span><span class="nm">' + esc(cname(cd)) + '</span><span>▾</span>'; }
  function fxDate(){
    if (!FX || !FX.t) return '';
    try { return new Date(FX.t).toLocaleString(LOC, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return new Date(FX.t).toISOString().slice(0, 10); }
  }
  function fxRender(){
    fxPickDefault();
    curBtn($('fxFrom'), S.fx.from); curBtn($('fxTo'), S.fx.to);
    if (!fxReady()) {
      $('fxRes').textContent = ''; $('fxL1').textContent = ''; $('fxL2').textContent = '';
      $('fxInfo').textContent = FX && FX.err ? ${J('fxFail')} : ${J('fxLoading')};
      return;
    }
    var f = S.fx.from, t = S.fx.to;
    if (!FX.rates[f] || !FX.rates[t]) { $('fxRes').textContent = '—'; return; }
    var a = fxAmt();
    $('fxRes').textContent = smart(fxConv(a, f, t)) + ' ' + t;
    $('fxL1').textContent = '1 ' + f + ' = ' + smart(fxConv(1, f, t)) + ' ' + t;
    $('fxL2').textContent = '1 ' + t + ' = ' + smart(fxConv(1, t, f)) + ' ' + f;
    $('fxInfo').textContent = (FX.old ? ${J('fxOffline')} : ${J('fxUpdated')}).replace('{d}', fxDate()) + ' · ExchangeRate-API';
  }
  function fxText(){
    if (!fxReady()) return '';
    var f = S.fx.from, t = S.fx.to, a = fxAmt();
    var as; try { as = new Intl.NumberFormat(LOC, { maximumFractionDigits: 6 }).format(a); } catch (e) { as = String(a); }
    return as + ' ' + f + ' = ' + smart(fxConv(a, f, t)) + ' ' + t;
  }
  var fxAsked = false;
  function fxOpen(){
    $('fxAmt').value = S.fx.amt || '1';
    fxRender();
    var stale = !FX || !FX.t || Date.now() - FX.t > 6 * 3600 * 1000;
    if (stale && !fxAsked) { fxAsked = true; send({ type: 'fxGet' }); }
  }
  window.fxResult = function(d){
    if (d && d.rates) FX = d;
    else if (FX && FX.rates) FX.old = true;
    else FX = { err: true };
    fxRender();
  };
  $('fxAmt').addEventListener('input', function(){ S.fx.amt = $('fxAmt').value; fxRender(); save(); });
  $('fxSwap').addEventListener('click', function(){ var x = S.fx.from; S.fx.from = S.fx.to; S.fx.to = x; fxRender(); save(); });
  var pickFor = null;
  function fxList(){
    var q = $('fxQ').value.trim().toLowerCase();
    var all = fxReady() ? Object.keys(FX.rates) : POP.slice();
    var rest = all.filter(function(c){ return POP.indexOf(c) < 0; }).sort(function(a, b){ return cname(a).localeCompare(cname(b), LOC); });
    var list = POP.filter(function(c){ return all.indexOf(c) >= 0; }).concat(rest);
    if (q) list = list.filter(function(c){ return c.toLowerCase().indexOf(q) >= 0 || cname(c).toLowerCase().indexOf(q) >= 0; });
    var sel = S.fx[pickFor];
    $('fxList').innerHTML = list.map(function(c){
      return '<button class="cur' + (c === sel ? ' on' : '') + '" data-c="' + c + '"><span class="fl">' + flag(c) + '</span><span class="cd">' + c + '</span><span class="nm">' + esc(cname(c)) + '</span></button>';
    }).join('');
  }
  function openPick(which){ pickFor = which; $('fxQ').value = ''; fxList(); $('fxPick').classList.add('show'); $('fxList').scrollTop = 0; }
  $('fxFrom').addEventListener('click', function(){ openPick('from'); });
  $('fxTo').addEventListener('click', function(){ openPick('to'); });
  $('fxBack').addEventListener('click', function(){ $('fxPick').classList.remove('show'); });
  $('fxQ').addEventListener('input', fxList);
  $('fxList').addEventListener('click', function(e){
    var b = e.target.closest('[data-c]'); if (!b) return;
    S.fx[pickFor] = b.getAttribute('data-c');
    $('fxPick').classList.remove('show');
    fxRender(); save();
  });

  window.calcTip = tip;
  renderHist();
  setActive($('in'));
})();
</script></body></html>`;
}
