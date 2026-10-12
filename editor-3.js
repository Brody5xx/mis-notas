/* editor-3.js — pedazo 3 del editor (va junto a App.js y editor.js) */

export function part3({ c, chips, editable, glass, id, kind, safeContent, safeInk, safeTitle, swatches, updated }) {
  return `    showTip(col ? '✓ Resaltado' : 'Resaltado quitado');
  }
  function applyOutline(col){
    restore();
    var css = outlineStyle(col);
    if (!collapsedSpan(css)) {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontName', false, 'xoutline');
      var made = [];
      document.querySelectorAll('#ed font[face="xoutline"], #ttl font[face="xoutline"]').forEach(function(f){
        var sp = document.createElement('span');
        setStyles(sp, css);
        while (f.firstChild) sp.appendChild(f.firstChild);
        f.parentNode.replaceChild(sp, f);
        made.push(sp);
      });
      document.querySelectorAll('#ed [style*="xoutline"], #ttl [style*="xoutline"]').forEach(function(el){
        el.style.fontFamily = ''; setStyles(el, css); made.push(el);
      });
      reselect(made);
    }
    keepSelection(); changedNow();
    showTip(col ? '✓ Contorno aplicado' : 'Contorno quitado');
  }
  function openFx(mode, btn){
    var open = fxPanel.classList.contains('show');
    if (open && fxMode !== mode) {           // cambiar de resaltador a contorno sin cerrar
      fxMode = mode;
      dock.querySelectorAll('[data-act=hl],[data-act=ol]').forEach(function(b){ b.classList.toggle('on', b === btn); });
    } else {
      fxMode = mode;
      togglePanel(fxPanel, btn);
    }
    $('fxTitle').textContent = mode === 'hl' ? 'Resaltador' : 'Contorno de letras';
    $('fxNone').textContent = mode === 'hl' ? 'Quitar resaltado' : 'Quitar contorno';
    fxPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.remove('on'); });
  }
  $('fxSws').addEventListener('click', function(e){
    var sw = e.target.closest('.sw');
    if (!sw) return;
    if (fxMode === 'hl') applyHighlight(sw.dataset.color); else applyOutline(sw.dataset.color);
    fxPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.toggle('on', x === sw); });
  });
  $('fxNone').addEventListener('click', function(){
    if (fxMode === 'hl') applyHighlight(null); else applyOutline(null);
    fxPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.remove('on'); });
  });

  /* ---------- Paneles ---------- */
  function closePanels(){
    sizePanel.classList.remove('show'); colorPanel.classList.remove('show'); fxPanel.classList.remove('show');
    dock.querySelectorAll('[data-act=size],[data-act=color],[data-act=hl],[data-act=ol]').forEach(function(b){ b.classList.remove('on'); });
  }
  function togglePanel(p, btn){
    var open = !p.classList.contains('show');
    closePanels();
    if (!open) return;
    p.classList.add('show'); btn.classList.add('on');
    if (p === sizePanel) {
      var v = +sizeNum.textContent || 17;
      range.value = v; showSizePreview(v);
    }
  }
  document.querySelectorAll('[data-close]').forEach(function(b){ b.addEventListener('click', closePanels); });

  /* ---------- Botones de la barra ---------- */
  [dock, sizePanel, colorPanel, fxPanel, imgbar].forEach(function(el){
    el.addEventListener('mousedown', function(e){ if (e.target.closest('button')) e.preventDefault(); });
  });
  var names = { bold: 'Negrita', italic: 'Cursiva', underline: 'Subrayado' };
  dock.addEventListener('click', function(e){
    var t = e.target.closest('button');
    if (!t) return;
    var a = t.dataset.act;
    // Cualquier botón de la barra esconde el teclado
    if (saved) { var sNow = window.getSelection(); if (sNow.rangeCount && owner(sNow.anchorNode)) keepSelection(); }
    quietFocus();
    if (saved) { var s0 = window.getSelection(); s0.removeAllRanges(); s0.addRange(saved); }
    if (a === 'draw') { setDrawMode(true); return; }
    if (a === 'img') { closePanels(); fileInput.click(); return; }
    if (a === 'size') { togglePanel(sizePanel, t); return; }
    if (a === 'color') { togglePanel(colorPanel, t); return; }
    if (a === 'hl' || a === 'ol') { openFx(a, t); return; }
    if (t.dataset.cmd) {
      restore();
      var cmd = t.dataset.cmd, isOn = false;
      try { isOn = document.queryCommandState(cmd); } catch (_) {}
      var css = cmd === 'bold' ? { fontWeight: isOn ? 'normal' : 'bold' }
              : cmd === 'italic' ? { fontStyle: isOn ? 'normal' : 'italic' }
              : { textDecoration: isOn ? 'none' : 'underline' };
      if (!collapsedSpan(css)) document.execCommand(cmd, false, null);
      keepSelection();
      changedNow();
      updateState();
      showTip('✓ ' + names[t.dataset.cmd]);
    }
  });

  /* ---------- Agregar foto ---------- */
  var BASE = 0.4, MIN = 10, MAX = 250;   // 100% = 40% del ancho; 250% = todo el ancho
  /* Guarda la foto tal cual: si tiene partes transparentes (como un ícono)
     se guarda en PNG para que NO aparezca un fondo blanco */
  function hasTransparency(ctx, w, h){
    try {
      var d = ctx.getImageData(0, 0, w, h).data;
      for (var i = 3; i < d.length; i += 16) { if (d[i] < 250) return true; }
    } catch (_) {}
    return false;
  }
  function canvasToData(cv, ctx, q){
    return hasTransparency(ctx, cv.width, cv.height)
      ? cv.toDataURL('image/png')
      : cv.toDataURL('image/jpeg', q);
  }
  function shrink(im, max, q){
    var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, max / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    var ctx = cv.getContext('2d');
    ctx.drawImage(im, 0, 0, cv.width, cv.height);
    return canvasToData(cv, ctx, q);
  }
  function insertImage(src){
    var html = '<div class="imgwrap" contenteditable="false" data-scale="100" style="width:' + (100 * BASE) +
               '%"><img src="' + src + '"></div><div><br></div>';
    quietFocus();
    if (saved && ed.contains(saved.startContainer)) {
      var s = window.getSelection();
      s.removeAllRanges(); s.addRange(saved);
      document.execCommand('insertHTML', false, html);
    } else {
      ed.insertAdjacentHTML('beforeend', html);
    }
    changedNow();
    showTip('✓ Foto agregada');
  }
  fileInput.addEventListener('change', function(){
    var f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    showTip('Agregando foto...');
    var r = new FileReader();
    r.onload = function(){
      var im = new Image();
      im.onload = function(){ insertImage(shrink(im, 1280, 0.8)); };
      im.onerror = function(){ showTip('No se pudo abrir la foto'); };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  });

  /* ---------- Tamaño de foto con las esquinas ---------- */
  var rsz = $('rsz'), pctEl = $('pct'), pctLabel = $('pctLabel');
  function getScale(w){
    if (w.dataset.scale) return +w.dataset.scale;
    var pw = parseFloat(w.style.width) || 100;
    return Math.round(pw / BASE);
  }
  function setScale(w, sc){
    sc = Math.round(Math.min(MAX, Math.max(MIN, sc)));
    w.dataset.scale = sc;
    w.style.width = (sc * BASE) + '%';
    pctLabel.textContent = sc + '%';
    pctEl.textContent = sc + '%';
  }
  function placeRsz(){
    if (!selImg) { rsz.style.display = 'none'; return; }
    var r = selImg.getBoundingClientRect();
    rsz.style.display = 'block';
    rsz.style.left = (r.left + window.scrollX) + 'px';
    rsz.style.top = (r.top + window.scrollY) + 'px';
    rsz.style.width = r.width + 'px';
    rsz.style.height = r.height + 'px';
  }
  function contentWidth(){
    var cs = getComputedStyle(ed);
    return ed.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  var selImg = null;
  function selectImg(w){
    if (selImg) selImg.classList.remove('sel');
    selImg = w;
    closePanels();
    if (w) {
      w.classList.add('sel');
      pctLabel.textContent = getScale(w) + '%';
      var im = w.querySelector('img');
      if (im && !im.complete) im.onload = placeRsz;
    }
    // La barra de vidrio cambia a opciones de foto
    imgbar.classList.toggle('hide', !w);
    dock.classList.toggle('hide', !!w);
    placeRsz();
  }
  ed.addEventListener('click', function(e){
    var w = e.target.closest ? e.target.closest('.imgwrap') : null;
    var pick = w && editable && ed.contains(w) ? w : null;
    selectImg(pick);
    if (pick) { window.getSelection().removeAllRanges(); ed.blur(); }
  });
  imgbar.addEventListener('click', function(e){
    var t = e.target.closest('button');
    if (!t || !selImg) return;
    var a = t.dataset.img;
    if (a === 'close') { selectImg(null); return; }
    if (a === 'del') {
      var w = selImg; selectImg(null);
      w.parentNode.removeChild(w);
      changedNow(); showTip('Foto quitada');
      return;
    }
    if (a === 'crop') { openCrop(selImg.querySelector('img')); return; }
    if (a === 'reset') { setScale(selImg, 100); placeRsz(); changedNow(); showTip('✓ Tamaño normal (100%)'); }
  });

  var rdrag = null;
  rsz.addEventListener('pointerdown', function(e){
    var h = e.target.dataset ? e.target.dataset.r : null;
    if (!h || !selImg) return;
    e.preventDefault(); e.stopPropagation();
    rdrag = { sign: h.indexOf('r') > -1 ? 1 : -1, sx: e.clientX,
              sw: selImg.getBoundingClientRect().width, base: contentWidth() * BASE };
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    pctEl.textContent = getScale(selImg) + '%';
    pctEl.classList.add('show');
  });
  rsz.addEventListener('pointermove', function(e){
    if (!rdrag || !selImg) return;
    var w = rdrag.sw + rdrag.sign * (e.clientX - rdrag.sx) * 2;   // la foto crece hacia los dos lados
    var sc = w / rdrag.base * 100;
    if (Math.abs(sc - 100) < 4) sc = 100;
    setScale(selImg, sc);
    placeRsz();
  });
  function endResize(){
    if (!rdrag) return;
    rdrag = null; pctEl.classList.remove('show'); changedNow();
  }
  rsz.addEventListener('pointerup', endResize);
  rsz.addEventListener('pointercancel', endResize);
  window.addEventListener('resize', function(){ placeRsz(); placeKb(); if (isDraw) sizeInk(); });

  /* =========================================================
     DIBUJO: escribe y dibuja encima (lápiz, resaltador, borrador)
     Los trazos se guardan como líneas (no como foto), así se ven
     nítidos en cualquier pantalla.
     ========================================================= */
  var isDraw = ${kind === 'draw' ? 'true' : 'false'};
  var strokes = ${safeInk};
  var ink = $('ink'), live = $('live');
  var ictx = ink.getContext('2d'), lctx = live.getContext('2d');
  var drawing = false, tool = 'pen', penColor = ${JSON.stringify(c.text)}, penSize = 1;
  var PEN = [2, 4, 8];
  var drawdock = $('drawdock');

  if (isDraw) { document.body.classList.add('isdraw'); ed.style.minHeight = '140vh'; }

  function inkW(){ return document.documentElement.clientWidth; }
  function sizeInk(){
    var w = inkW(), h = Math.max(document.body.scrollHeight, window.innerHeight);
    var dpr = window.devicePixelRatio || 1;
    [ink, live].forEach(function(cv){
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    redraw();
  }
  function fitInk(){
    if (Math.abs(document.body.scrollHeight - parseFloat(ink.style.height || 0)) > 2) sizeInk();
  }
  function drawStroke(ctx, s, W){
    var p = s.p;
    if (!p || !p.length) return;
    ctx.save();
    ctx.globalCompositeOperation = s.t === 'eraser' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = s.t === 'hl' ? 0.35 : 1;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w * W;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0][0] * W, p[0][1] * W);
    if (p.length === 1) ctx.lineTo(p[0][0] * W + 0.1, p[0][1] * W);
    for (var i = 1; i < p.length - 1; i++) {
      var mx = (p[i][0] + p[i + 1][0]) / 2 * W, my = (p[i][1] + p[i + 1][1]) / 2 * W;
      ctx.quadraticCurveTo(p[i][0] * W, p[i][1] * W, mx, my);
    }
    if (p.length > 1) { var l = p[p.length - 1]; ctx.lineTo(l[0] * W, l[1] * W); }
    ctx.stroke();
    ctx.restore();
  }
  function redraw(){
    var W = inkW();
    ictx.clearRect(0, 0, ink.width, ink.height);
    strokes.forEach(function(s){ drawStroke(ictx, s, W); });
  }

  function setDrawMode(on){
    drawing = on;
    document.body.classList.toggle('drawing', on);
    setTimeout(placeDock, 0);
    closePanels(); selectImg(null);
    if (on) {
      ed.setAttribute('inputmode', 'none'); ttl.setAttribute('inputmode', 'none');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.getSelection().removeAllRanges();
      sizeInk();
      showTip('Modo dibujo · 2 dedos para moverte');
    } else {
      showTip('Modo texto');
    }
  }
  function setTool(t){
    tool = t;
    drawdock.querySelectorAll('[data-tool]').forEach(function(b){ b.classList.toggle('on', b.dataset.tool === t); });
  }
  function showPenSize(){
    var d = [6, 10, 16][penSize];
    $('penSizeDot').style.width = d + 'px'; $('penSizeDot').style.height = d + 'px';
  }

  var clearArmed = false, clearTimer = null;
  drawdock.addEventListener('mousedown', function(e){ if (e.target.closest('button')) e.preventDefault(); });
  drawdock.addEventListener('click', function(e){
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool); closePanels(); return; }
    var d = b.dataset.d;
    if (d === 'text') { setDrawMode(false); return; }
    if (d === 'color') { togglePanel(colorPanel, b); return; }
    if (d === 'size') {
      penSize = (penSize + 1) % 3; showPenSize();
      showTip(['Trazo fino', 'Trazo medio', 'Trazo grueso'][penSize]);
      return;
    }
    if (d === 'undo') {
      if (!strokes.length) return;
      strokes.pop(); redraw(); changedNow(); showTip('Deshecho');
      return;
    }
    if (d === 'clear') {
      if (!strokes.length) return;
      if (!clearArmed) {
        clearArmed = true; showTip('Toca otra vez para borrar todo el dibujo');
        clearTimeout(clearTimer); clearTimer = setTimeout(function(){ clearArmed = false; }, 2500);
        return;
      }
      clearArmed = false; strokes = []; redraw(); changedNow(); showTip('Dibujo borrado');
    }
  });

  /* Un dedo dibuja · dos dedos mueven la nota */
  var pointers = {}, stroke = null, pan = null;
  function avgY(){
    var ys = Object.keys(pointers).map(function(k){ return pointers[k].y; });
    return ys.reduce(function(a, b){ return a + b; }, 0) / (ys.length || 1);
  }
  function pt(e){
    var r = live.getBoundingClientRect(), W = inkW();
    return [Math.round((e.clientX - r.left) / W * 10000) / 10000, Math.round((e.clientY - r.top) / W * 10000) / 10000];
  }
  live.addEventListener('pointerdown', function(e){
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var n = Object.keys(pointers).length;
    if (n === 2) {                                   // segundo dedo: cancelar trazo y mover
      stroke = null; lctx.clearRect(0, 0, live.width, live.height);
      pan = { y: avgY() };
`;
}
