/* editor-2.js — pedazo 2 del editor (va junto a App.js y editor.js) */

export function part2({ c, chips, editable, glass, id, kind, safeContent, safeInk, safeTitle, swatches, updated }) {
  return `  <button class="db" data-img="reset"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 100%</button>
  <button class="db" data-img="del"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  <button class="db" data-img="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
</div>

<div id="rsz">
  <div class="rh" data-r="tl"></div><div class="rh" data-r="tr"></div>
  <div class="rh" data-r="bl"></div><div class="rh" data-r="br"></div>
  <div id="pct">100%</div>
</div>

<div id="crop">
  <div id="cropTitle">Mueve las esquinas para recortar</div>
  <div id="cropArea">
    <img id="cropImg">
    <div id="box"><div class="h" data-c="tl"></div><div class="h" data-c="tr"></div><div class="h" data-c="bl"></div><div class="h" data-c="br"></div></div>
  </div>
  <div id="cropBtns">
    <button id="cropCancel">Cancelar</button>
    <button id="cropReset">Restablecer</button>
    <button class="ok" id="cropOk">Listo</button>
  </div>
</div>
<div id="tip"></div>

<script>
  function $(id){ return document.getElementById(id); }
  var noteId = ${JSON.stringify(id)};
  var editable = ${editable ? 'true' : 'false'};
  var ttl = $('ttl'), cur = null;
  var ed = $('ed'), dock = $('dock'), imgbar = $('imgbar'), fileInput = $('file');
  var sizePanel = $('sizePanel'), colorPanel = $('colorPanel');
  var range = $('range'), sizeNum = $('sizeNum'), sizeBig = $('sizeBig'), sample = $('sample'), colorDot = $('colorDot');
  var saved = null, dirty = false, sendTimer = null;
  ed.innerHTML = ${safeContent};
  ttl.innerHTML = ${safeTitle};
  cur = ed;

  /* Fecha de modificación (se actualiza sola) */
  var MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function fmtDate(t){
    var d = new Date(t), hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ', ' + hh + ':' + mm;
  }
  $('meta').textContent = 'Modificado: ' + fmtDate(${Number(updated) || Date.now()});

  /* ¿El texto tocado está en el título o en la nota? */
  function owner(node){
    if (!node) return null;
    if (ttl.contains(node)) return ttl;
    if (ed.contains(node)) return ed;
    return null;
  }
  function plainTitle(){ return ttl.textContent.replace(/\\u200B/g, '').replace(/\\s+/g, ' ').trim(); }

  /* ---------- Avisar a la app de los cambios ---------- */
  function send(m){
    var s = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage(s, '*');
  }
  function cleanHtml(){ return ed.innerHTML.replace(/imgwrap sel/g, 'imgwrap'); }
  function payload(){
    return { html: cleanHtml(), title: plainTitle(), titleHtml: plainTitle() ? ttl.innerHTML : '', ink: isDraw ? strokes : undefined };
  }
  function changedNow(){
    clearTimeout(sendTimer); dirty = false;
    var p = payload();
    send({ type: 'change', id: noteId, html: p.html, title: p.title, titleHtml: p.titleHtml, ink: p.ink });
    $('meta').textContent = 'Modificado: ' + fmtDate(Date.now());
  }
  function changed(){
    dirty = true; clearTimeout(sendTimer);
    sendTimer = setTimeout(changedNow, 400);
    placeRsz();
    if (isDraw) fitInk();
  }
  window.flushNow = function(){ if (dirty) changedNow(); };
  window.getHtml = function(){
    if (!dirty) return null;
    clearTimeout(sendTimer); dirty = false;
    return payload();
  };
  ed.addEventListener('input', changed);

  /* ---------- Título ---------- */
  ttl.addEventListener('input', function(){
    if (!plainTitle()) ttl.innerHTML = '';      // para que vuelva a mostrarse "Título"
    changed();
  });
  ttl.addEventListener('keydown', function(e){
    if (e.key === 'Enter') {                       // Enter en el título: pasar a la nota
      e.preventDefault();
      ed.focus();
      var r = document.createRange();
      r.setStart(ed, 0); r.collapse(true);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
  ttl.addEventListener('paste', function(e){      // pegar en el título: solo texto, en una línea
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\\s+/g, ' ');
    document.execCommand('insertText', false, t);
  });

  /* ---------- Avisos pequeños (arriba) ---------- */
  var tip = $('tip'), tipTimer;
  function showTip(text){
    tip.textContent = text; tip.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function(){ tip.classList.remove('show'); }, 1200);
  }

  /* ---------- La barra sube junto con el teclado ---------- */
  function placeDock(){
    var d = document.body.classList.contains('drawing') ? $('drawdock') : $('dock');
    if (d && d.offsetHeight) document.documentElement.style.setProperty('--dockH', d.offsetHeight + 'px');
  }
  window.addEventListener('resize', function(){ placeDock(); });
  setTimeout(placeDock, 30);
  function placeKb(){
    var vv = window.visualViewport;
    var off = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty('--kb', off + 'px');
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', placeKb);
    window.visualViewport.addEventListener('scroll', placeKb);
  }

  /* ---------- Teclado: solo aparece al tocar el texto ---------- */
  // Activa el editor SIN teclado. Si el teclado estaba abierto, lo esconde
  // y no vuelve a salir hasta que toques el texto.
  function quietFocus(){
    var el = cur || ed;
    if (el.getAttribute('inputmode') !== 'none') {
      el.setAttribute('inputmode', 'none');
      if (document.activeElement === el) el.blur();   // cerrar el teclado abierto
    }
    if (document.activeElement !== el) {
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    }
  }
  function onTextDown(e){
    var el = e.currentTarget;
    var onImg = e.target.closest ? e.target.closest('.imgwrap') : null;
    if (onImg) { el.setAttribute('inputmode', 'none'); return; }
    closePanels();
    if (el.getAttribute('inputmode') === 'none') {
      el.removeAttribute('inputmode');
      if (document.activeElement === el) el.blur();
    }
  }
  ed.addEventListener('pointerdown', onTextDown);
  ttl.addEventListener('pointerdown', onTextDown);

  /* ---------- Recordar la selección y mostrar su formato ---------- */
  document.addEventListener('selectionchange', function(){
    var s = window.getSelection();
    var o = s.rangeCount ? owner(s.anchorNode) : null;
    if (o) {
      cur = o;
      saved = s.getRangeAt(0).cloneRange();
      updateState();
    }
  });
  function restore(){
    quietFocus();
    if (!saved) return;
    var s = window.getSelection();
    s.removeAllRanges(); s.addRange(saved);
  }
  function keepSelection(){
    var s = window.getSelection();
    if (s.rangeCount) saved = s.getRangeAt(0).cloneRange();
  }
  function updateState(){
    ['bold', 'italic', 'underline'].forEach(function(cmd){
      var b = dock.querySelector('[data-cmd=' + cmd + ']');
      try { b.classList.toggle('on', document.queryCommandState(cmd)); } catch (_) {}
    });
    var n = saved && saved.startContainer;
    var el = n && (n.nodeType === 1 ? n : n.parentElement);
    if (el && owner(el)) {
      var cs = getComputedStyle(el);
      sizeNum.textContent = Math.round(parseFloat(cs.fontSize));
      colorDot.style.background = cs.color;
    }
  }

  /* ---------- Estilo para lo que escribas después ----------
     Si no hay texto seleccionado, se crea un espacio invisible con el estilo
     elegido y el cursor queda dentro: lo siguiente que escribas sale así. */
  var pending = null;
  function collapsedSpan(css){
    var s = window.getSelection();
    if (!s.rangeCount) return false;
    var r = s.getRangeAt(0);
    if (!r.collapsed || !owner(r.startContainer)) return false;
    var sp = document.createElement('span');
    for (var k in css) sp.style[k] = css[k];
    var t = document.createTextNode('\u200B');
    sp.appendChild(t);
    r.insertNode(sp);
    var nr = document.createRange();
    nr.setStart(t, 1); nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
    saved = nr.cloneRange();
    pending = sp;
    return true;
  }
  function blockOf(n){
    var e = n && (n.nodeType === 1 ? n : n.parentElement);
    while (e && e !== ed && e !== ttl && !/^(DIV|P|LI|H[1-6])$/.test(e.tagName)) e = e.parentElement;
    return e;
  }
  // Al tocar para escribir, si no hay letras entre el dedo y el estilo nuevo,
  // el cursor se mete en el estilo nuevo
  function pullIntoPending(){
    if (!pending || !pending.isConnected || pending.textContent !== '\u200B') return;
    var s = window.getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0);
    if (!r.collapsed || pending.contains(r.startContainer)) return;
    if (blockOf(r.startContainer) !== blockOf(pending)) return;
    var sr = document.createRange(); sr.selectNode(pending);
    var cmp = sr.comparePoint(r.startContainer, r.startOffset);
    var between = document.createRange();
    if (cmp > 0) { between.setStartAfter(pending); between.setEnd(r.startContainer, r.startOffset); }
    else if (cmp < 0) { between.setStart(r.startContainer, r.startOffset); between.setEndBefore(pending); }
    else return;
    if (between.toString().replace(/\u200B/g, '') !== '') return;
    var t = pending.firstChild;
    var nr = document.createRange();
    nr.setStart(t, t.length); nr.collapse(true);
    s.removeAllRanges(); s.addRange(nr);
    saved = nr.cloneRange();
  }
  var tapPending = false;
  document.addEventListener('pointerup', function(){
    tapPending = true;
    setTimeout(pullIntoPending, 60);
    setTimeout(pullIntoPending, 300);
  }, true);
  document.addEventListener('selectionchange', function(){
    if (tapPending) { tapPending = false; setTimeout(pullIntoPending, 0); }
  });

  /* ---------- Cambiar tamaño (5 a 100) ---------- */
  function applySize(v){
    v = Math.max(5, Math.min(100, Math.round(v)));
    restore();
    var s = window.getSelection();
    if (!s.rangeCount) return;
    var r = s.getRangeAt(0);
    if (r.collapsed) {
      // Sin selección: lo que escribas después tendrá este tamaño
      collapsedSpan({ fontSize: v + 'px' });
    } else {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      var made = [];
      document.querySelectorAll('#ed font[size="7"], #ttl font[size="7"]').forEach(function(f){
        var span = document.createElement('span');
        span.style.fontSize = v + 'px';
        while (f.firstChild) span.appendChild(f.firstChild);
        f.parentNode.replaceChild(span, f);
        made.push(span);
      });
      if (made.length) {
        // Volver a seleccionar el texto para poder seguir ajustando
        var last = made[made.length - 1];
        var sel = document.createRange();
        sel.setStart(made[0], 0);
        sel.setEnd(last, last.childNodes.length);
        s.removeAllRanges(); s.addRange(sel);
      }
    }
    keepSelection();
    changedNow();
    sizeNum.textContent = v;
    markChip(v);
    showTip('✓ Tamaño ' + v);
  }
  function markChip(v){
    sizePanel.querySelectorAll('.chip').forEach(function(ch){ ch.classList.toggle('on', +ch.dataset.size === v); });
  }
  function showSizePreview(v){
    sizeBig.textContent = v;
    sample.style.fontSize = Math.min(v, 56) + 'px';
    markChip(v);
  }
  range.addEventListener('input', function(){ showSizePreview(+range.value); });
  range.addEventListener('change', function(){ applySize(+range.value); });
  $('chips').addEventListener('click', function(e){
    var ch = e.target.closest('.chip');
    if (!ch) return;
    var v = +ch.dataset.size;
    range.value = v; showSizePreview(v); applySize(v);
  });

  /* ---------- Cambiar color ---------- */
  $('sws').addEventListener('click', function(e){
    var sw = e.target.closest('.sw');
    if (!sw) return;
    if (drawing) {                      // en modo dibujo: color del lápiz
      penColor = sw.dataset.color;
      $('penDot').style.background = penColor;
      if (tool === 'eraser') setTool('pen');
      colorPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.toggle('on', x === sw); });
      closePanels();
      return;
    }
    restore();
    if (!collapsedSpan({ color: sw.dataset.color })) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, sw.dataset.color);
    }
    keepSelection();
    changedNow();
    colorDot.style.background = sw.dataset.color;
    colorPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.toggle('on', x === sw); });
    showTip('✓ Color aplicado');
  });

  /* ---------- Resaltador y contorno de letras ---------- */
  var fxPanel = $('fxPanel'), fxMode = 'hl';
  function withAlpha(col, a){
    var m = /^#([0-9a-f]{6})$/i.exec(col || '');
    if (!m) return col;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // Contorno: una sombra fina alrededor de cada letra (se lee bien sobre cualquier fondo)
  var STROKE_OK = !!(window.CSS && CSS.supports && CSS.supports('paint-order', 'stroke fill'));
  function outlineStyle(col){
    if (!col) return { webkitTextStroke: '0', textShadow: 'none' };
    if (STROKE_OK) {
      // borde por FUERA de la letra, sin hacerla más delgada
      return { webkitTextStroke: '3px ' + col, paintOrder: 'stroke fill', textShadow: 'none' };
    }
    return { webkitTextStroke: '0',
             textShadow: '-1px -1px 0 ' + col + ',1px -1px 0 ' + col + ',-1px 1px 0 ' + col + ',1px 1px 0 ' + col };
  }
  function setStyles(el, css){ for (var k in css) el.style[k] = css[k]; }
  function reselect(made){
    if (!made.length) return;
    var last = made[made.length - 1], r = document.createRange();
    r.setStart(made[0], 0); r.setEnd(last, last.childNodes.length);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function applyHighlight(col){
    restore();
    var bg = col ? withAlpha(col, 0.45) : 'transparent';
    if (!collapsedSpan({ backgroundColor: bg })) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('hiliteColor', false, bg);
    }
    keepSelection(); changedNow();
`;
}
