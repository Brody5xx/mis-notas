/* editor-4.js — pedazo 4 del editor (va junto a App.js y editor.js) */

export function part4({ c, chips, editable, glass, id, kind, safeContent, safeInk, safeTitle, swatches, updated }) {
  return `      return;
    }
    if (n > 2) return;
    try { live.setPointerCapture(e.pointerId); } catch (_) {}
    closePanels();
    var W = inkW(), base = PEN[penSize];
    stroke = {
      t: tool,
      c: tool === 'eraser' ? '#000' : penColor,
      w: (tool === 'hl' ? base * 3 : tool === 'eraser' ? base * 4 : base) / W,
      p: [pt(e)],
    };
    e.preventDefault();
  });
  live.addEventListener('pointermove', function(e){
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pan) {
      var y = avgY();
      window.scrollBy(0, -(y - pan.y));
      pan.y = y;
      return;
    }
    if (!stroke) return;
    var p = pt(e), last = stroke.p[stroke.p.length - 1], W = inkW();
    if (Math.abs(p[0] - last[0]) * W < 1 && Math.abs(p[1] - last[1]) * W < 1) return;
    stroke.p.push(p);
    if (stroke.t === 'eraser') {
      drawStroke(ictx, { t: 'eraser', c: '#000', w: stroke.w, p: [last, p] }, W);
    } else {
      lctx.clearRect(0, 0, live.width, live.height);
      drawStroke(lctx, stroke, W);
    }
  });
  function endPointer(e){
    delete pointers[e.pointerId];
    if (pan) { if (Object.keys(pointers).length < 2) pan = null; return; }
    if (!stroke) return;
    var W = inkW();
    lctx.clearRect(0, 0, live.width, live.height);
    if (stroke.t !== 'eraser') drawStroke(ictx, stroke, W);
    strokes.push(stroke);
    // Si dibujas cerca del final, la hoja crece para que sigas dibujando
    var maxY = Math.max.apply(null, stroke.p.map(function(q){ return q[1]; })) * W;
    stroke = null;
    if (maxY > parseFloat(ink.style.height) - 300) {
      ed.style.minHeight = (ed.offsetHeight + 600) + 'px';
      sizeInk();
    }
    changed();
  }
  live.addEventListener('pointerup', endPointer);
  live.addEventListener('pointercancel', endPointer);

  if (isDraw) {
    setTimeout(sizeInk, 50);
    window.addEventListener('load', sizeInk);
    Array.prototype.forEach.call(document.images, function(im){ if (!im.complete) im.addEventListener('load', sizeInk); });
  }
  if (editable && !isDraw && !plainTitle() && !ed.textContent.trim() && !ed.querySelector('img')) {
    setTimeout(function(){ cur = ttl; ttl.focus(); }, 300);
  }

  /* ---------- Recortar ---------- */
  var crop = $('crop'), area = $('cropArea'), cimg = $('cropImg'), box = $('box');
  var target = null, L = {}, B = {}, drag = null;
  function openCrop(img){
    target = img; ed.blur();
    crop.classList.add('show');
    send({ type: 'crop', open: true });
    cimg.onload = layout; cimg.src = img.src;
    if (cimg.complete) layout();
  }
  window.closeCrop = function(){
    crop.classList.remove('show'); target = null; drag = null;
    send({ type: 'crop', open: false });
  };
  function layout(){
    var W = area.clientWidth, H = area.clientHeight, nw = cimg.naturalWidth, nh = cimg.naturalHeight;
    if (!nw || !W) return;
    var pad = 24, k = Math.min((W - pad * 2) / nw, (H - pad * 2) / nh);
    L = { k: k, w: nw * k, h: nh * k }; L.x = (W - L.w) / 2; L.y = (H - L.h) / 2;
    cimg.style.left = L.x + 'px'; cimg.style.top = L.y + 'px';
    cimg.style.width = L.w + 'px'; cimg.style.height = L.h + 'px';
    B = { x: L.x, y: L.y, w: L.w, h: L.h }; draw();
  }
  function draw(){
    box.style.left = B.x + 'px'; box.style.top = B.y + 'px';
    box.style.width = B.w + 'px'; box.style.height = B.h + 'px';
  }
  area.addEventListener('pointerdown', function(e){
    var corner = e.target.dataset ? e.target.dataset.c : null;
    if (!corner && e.target !== box) return;
    drag = { c: corner || 'move', sx: e.clientX, sy: e.clientY, b: { x: B.x, y: B.y, w: B.w, h: B.h } };
    try { area.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  area.addEventListener('pointermove', function(e){
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, b = drag.b, M = 50;
    var minX = L.x, minY = L.y, maxX = L.x + L.w, maxY = L.y + L.h;
    if (drag.c === 'move') {
      B.x = Math.min(Math.max(b.x + dx, minX), maxX - b.w);
      B.y = Math.min(Math.max(b.y + dy, minY), maxY - b.h);
    } else {
      var x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      if (drag.c.indexOf('l') > -1) x1 = Math.min(Math.max(b.x + dx, minX), x2 - M);
      if (drag.c.indexOf('r') > -1) x2 = Math.max(Math.min(b.x + b.w + dx, maxX), x1 + M);
      if (drag.c.indexOf('t') > -1) y1 = Math.min(Math.max(b.y + dy, minY), y2 - M);
      if (drag.c.indexOf('b') > -1) y2 = Math.max(Math.min(b.y + b.h + dy, maxY), y1 + M);
      B = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    draw();
  });
  function endDrag(){ drag = null; }
  area.addEventListener('pointerup', endDrag);
  area.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', function(){ if (crop.classList.contains('show')) layout(); });
  $('cropCancel').onclick = function(){ window.closeCrop(); };
  $('cropReset').onclick = layout;
  $('cropOk').onclick = function(){
    if (!target) { window.closeCrop(); return; }
    var sx = (B.x - L.x) / L.k, sy = (B.y - L.y) / L.k, sw = B.w / L.k, sh = B.h / L.k;
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(sw)); cv.height = Math.max(1, Math.round(sh));
    var ctx = cv.getContext('2d');
    ctx.drawImage(cimg, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    target.onload = placeRsz;
    target.src = canvasToData(cv, ctx, 0.85);
    window.closeCrop(); changedNow(); showTip('✓ Foto recortada');
  };
</script></body></html>`;
}
