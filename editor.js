
/* ============================================================
   editor.js — el editor de notas (texto, fotos, recorte y dibujo)
   Va junto a App.js, en la misma carpeta.
   ============================================================ */

/* Opciones de tamaño (botones rápidos) y colores de letra */
export const SIZE_CHIPS = [5, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 90, 100];
export const COLORS = [null, '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1',
                '#1e88e5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#757575'];

/* ============================================================
   EDITOR CON FORMATO, FOTOS Y RECORTE
   (funciona en el teléfono y en la vista previa de Replit)
   ============================================================ */
export function buildEditorHtml({ id, content, titleHtml, updated, editable, c, kind, ink }) {
  const safeInk = JSON.stringify(ink || []).replace(/</g, '\\u003c');
  const safeContent = JSON.stringify(content).replace(/</g, '\\u003c');
  const safeTitle = JSON.stringify(titleHtml || '').replace(/</g, '\\u003c');
  const glass = c.dockFill;
  const chips = SIZE_CHIPS.map(v => `<button class="chip" data-size="${v}">${v}</button>`).join('');
  const swatches = COLORS.map(col =>
    `<button class="sw" data-color="${col || c.text}" style="background:${col || c.text}"></button>`).join('');

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root{--kb:0px}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;padding:0;background:transparent;color:${c.text};font-family:-apple-system,Roboto,"Segoe UI",sans-serif}
  #ttl{outline:none;padding:14px 20px 2px;font-size:26px;font-weight:700;line-height:1.25;word-wrap:break-word}
  #ttl:empty:before{content:'Título';color:${c.muted}}
  #meta{padding:4px 20px 0;font-size:13px;color:${c.muted}}
  #ed ul,#ed ol{margin:4px 0;padding-left:26px}
  #ed li{margin:2px 0}
  #ed ul.checklist{list-style:none;padding-left:2px}
  #ed ul.checklist>li{position:relative;padding-left:32px;min-height:1.5em}
  #ed ul.checklist>li::before{content:'';position:absolute;left:0;top:.2em;width:18px;height:18px;
       border:2px solid currentColor;border-radius:6px;opacity:.75;box-sizing:border-box}
  #ed ul.checklist>li.done::before{content:'✓';opacity:1;background:${c.text};color:${c.inv};border-color:${c.text};
       font-size:13px;font-weight:900;line-height:14px;text-align:center}
  #ed ul.checklist>li.done{text-decoration:line-through;opacity:.55}
  #ed{outline:none;padding:12px 20px 230px;min-height:80vh;font-size:17px;line-height:1.5;word-wrap:break-word}
  #ed:empty:before{content:'Empieza a escribir...';color:${c.muted}}
  ::selection{background:rgba(243,156,18,0.18)}

  /* ===== Barra flotante de vidrio (abajo) ===== */
  .dock{position:fixed;left:50%;bottom:calc(14px + var(--kb));transform:translateX(-50%);z-index:6;
        display:flex;align-items:center;gap:2px;padding:6px;border-radius:28px;max-width:calc(100% - 20px);
        background:${glass};-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);
        border:1px solid ${c.border};box-shadow:0 10px 30px rgba(0,0,0,.20),0 0 24px rgba(243,156,18,.10);
        overflow-x:auto;transition:opacity .2s,transform .2s}
  .dock::-webkit-scrollbar,.chips::-webkit-scrollbar{display:none}
  .dock.hide{opacity:0;pointer-events:none;transform:translateX(-50%) translateY(24px)}
  .db{flex:none;height:42px;min-width:42px;border:none;border-radius:21px;background:transparent;color:${c.text};
      font-size:17px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:5px;
      transition:background .15s,transform .1s,box-shadow .15s;white-space:nowrap}
  .db:active{transform:scale(.9)}
  .db.on{background:linear-gradient(135deg,#f39c12,#ff5e3a);color:#fff;box-shadow:0 4px 14px rgba(255,94,58,.4)}
  .dsep{flex:none;width:1px;height:24px;background:${c.border};margin:0 3px}
  .caret{font-size:10px;opacity:.6}
  #sizeNum{font-weight:700;font-variant-numeric:tabular-nums;min-width:20px}
  #colorDot{width:24px;height:24px;border-radius:12px;border:2px solid #fff;box-shadow:0 0 0 1px ${c.border},0 2px 6px rgba(0,0,0,.2)}

  /* ===== Paneles que salen encima de la barra ===== */
  .panel{position:fixed;left:12px;right:12px;bottom:calc(78px + var(--kb));z-index:7;padding:16px;border-radius:26px;
         background:${glass};-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6);
         border:1px solid ${c.border};box-shadow:0 16px 40px rgba(0,0,0,.25);
         opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .18s,transform .18s}
  .panel.show{opacity:1;transform:none;pointer-events:auto}
  .ptitle{display:flex;align-items:center;justify-content:space-between;color:${c.muted};font-size:12px;
          letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
  .pclose{border:none;background:none;color:${c.accent};font-size:15px;font-weight:700;padding:4px 6px;text-transform:none;letter-spacing:0}
  .sizeTop{display:flex;align-items:center;justify-content:space-between;height:64px}
  #sizeBig{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;
           background:linear-gradient(135deg,#f39c12,#ff5e3a);-webkit-background-clip:text;background-clip:text;color:transparent}
  #sample{color:${c.text};font-weight:600;line-height:1;max-width:60%;overflow:hidden;white-space:nowrap}
  #range{width:100%;height:34px;margin:6px 0 10px;accent-color:#ff7a2a}
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0}
  .chip{flex:none;min-width:46px;height:36px;border-radius:18px;border:1px solid ${c.border};background:transparent;
        color:${c.text};font-size:15px;font-variant-numeric:tabular-nums}
  .chip.on{background:linear-gradient(135deg,#f39c12,#ff5e3a);color:#fff;border-color:transparent}
  .sws{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;justify-items:center;padding:4px 0}
  .sw{width:40px;height:40px;border-radius:20px;border:2px solid rgba(255,255,255,.7);padding:0;
      box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .1s}
  .sw:active{transform:scale(.88)}
  .sw.on{box-shadow:0 0 0 3px ${c.card},0 0 0 6px #ff7a2a}

  /* ===== Fotos dentro de la nota ===== */
  .imgwrap{margin:10px auto;width:100%;max-width:100%}
  .imgwrap img{width:100%;height:auto;display:block;background:transparent}
  #rsz{position:absolute;display:none;pointer-events:none;border:2px solid ${c.accent};border-radius:10px;z-index:3}
  .rh{position:absolute;width:28px;height:28px;background:#fff;border:3px solid ${c.accent};border-radius:14px;
      pointer-events:auto;touch-action:none}
  .rh[data-r=tl]{left:-14px;top:-14px}.rh[data-r=tr]{right:-14px;top:-14px}
  .rh[data-r=bl]{left:-14px;bottom:-14px}.rh[data-r=br]{right:-14px;bottom:-14px}
  #pct{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.75);color:#fff;
       font-size:22px;font-weight:700;padding:8px 16px;border-radius:14px;display:none;white-space:nowrap}
  #pct.show{display:block}
  .lbl{flex:none;color:${c.muted};font-size:14px;padding:0 6px;font-variant-numeric:tabular-nums}

  /* ===== Pantalla de recorte ===== */
  #crop{position:fixed;inset:0;background:#000;z-index:10;display:none;flex-direction:column}
  #crop.show{display:flex}
  #cropTitle{color:#fff;text-align:center;padding:14px;font-size:16px}
  #cropArea{position:relative;flex:1;overflow:hidden;touch-action:none}
  #cropImg{position:absolute;pointer-events:none;user-select:none;-webkit-user-select:none}
  #box{position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.6);touch-action:none}
  #box:before,#box:after{content:'';position:absolute;pointer-events:none;border:1px solid rgba(255,255,255,.35)}
  #box:before{left:33.33%;right:33.33%;top:0;bottom:0;border-top:none;border-bottom:none}
  #box:after{top:33.33%;bottom:33.33%;left:0;right:0;border-left:none;border-right:none}
  .h{position:absolute;width:30px;height:30px;background:#fff;border-radius:15px;touch-action:none}
  .h[data-c=tl]{left:-15px;top:-15px}.h[data-c=tr]{right:-15px;top:-15px}
  .h[data-c=bl]{left:-15px;bottom:-15px}.h[data-c=br]{right:-15px;bottom:-15px}
  #cropBtns{display:flex;justify-content:space-between;padding:14px 16px 26px}
  #cropBtns button{background:none;border:none;color:#fff;font-size:17px;padding:10px 14px}
  #cropBtns .ok{color:${c.accent};font-weight:700}

  #tip{position:fixed;left:50%;top:14px;transform:translateX(-50%) translateY(-8px);background:rgba(20,20,20,.85);color:#fff;
       z-index:20;padding:8px 16px;border-radius:18px;font-size:14px;opacity:0;transition:opacity .2s,transform .2s;
       pointer-events:none;white-space:nowrap}
  #tip.show{opacity:1;transform:translateX(-50%)}

  /* ===== Dibujo ===== */
  #ink,#live{position:absolute;left:0;top:0;pointer-events:none;touch-action:none}
  #ink{z-index:2} #live{z-index:3}
  body.drawing #live{pointer-events:auto}
  body.drawing #ed,body.drawing #ttl{-webkit-user-select:none;user-select:none}
  .draw-only{display:none !important}
  body.isdraw .draw-only{display:flex !important}
  #drawdock{display:none !important}
  body.drawing #drawdock{display:flex !important}
  body.drawing #dock{display:none !important}
  #penDot{width:22px;height:22px;border-radius:11px;border:2px solid #fff;box-shadow:0 0 0 1px ${c.border}}
  #penSizeDot{display:block;border-radius:50%;background:currentColor}

  /* ===== LIQUID GLASS (barra, paneles y avisos) ===== */
  .dock,.panel{
    border:0.5px solid transparent !important;
    background:linear-gradient(${glass},${glass}) padding-box,
               linear-gradient(135deg,${c.stroke[0]},${c.stroke[1]} 50%,${c.stroke[2]}) border-box !important;
    -webkit-backdrop-filter:blur(16px) brightness(1.1) saturate(1.5) !important;
    backdrop-filter:blur(16px) brightness(1.1) saturate(1.5) !important;
    box-shadow:inset 0 2px 2px ${c.hi},inset 0 -2px 2px ${c.lo},0 14px 36px rgba(0,0,0,.30) !important;
  }
  .chip{border-color:${c.border} !important}
  .db.on,.chip.on{background:${c.text} !important;color:${c.inv} !important;box-shadow:none !important;border-color:transparent !important}
  .db svg{display:block}
  #sizeBig{background:none !important;-webkit-background-clip:initial !important;background-clip:initial !important;color:${c.text} !important}
  #rsz{border-color:${c.text} !important}
  .rh{border-color:${c.text} !important}
  /* La barra se acomoda en 2 filas si no cabe (así ningún botón queda escondido) */
  .dock{flex-wrap:wrap;justify-content:center;overflow:visible !important;row-gap:2px}
  .db{min-width:40px;padding:0 8px}
  .panel{bottom:calc(var(--dockH, 56px) + 24px + var(--kb)) !important}
  .fxNone{display:block;margin:14px auto 0;border:none;background:none;color:${c.muted};font-size:15px;padding:6px 12px}
  .sw.on{box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 0 6px ${c.text} !important}
  #tip{background:rgba(20,20,40,.55);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
       border:0.5px solid rgba(255,255,255,.35);box-shadow:inset 0 2px 2px rgba(255,255,255,.2)}
</style></head><body>

<div id="ttl" contenteditable="${editable}"></div>
<div id="meta"></div>
<div id="ed" contenteditable="${editable}"></div>
<canvas id="ink"></canvas>
<canvas id="live"></canvas>
<input type="file" id="file" accept="image/*" style="display:none">

<!-- Barra flotante -->
<div class="dock" id="dock" ${editable ? '' : 'style="display:none"'}>
  <button class="db draw-only" data-act="draw"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
  <button class="db" data-act="img"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-cmd="bold"><b>B</b></button>
  <button class="db" data-cmd="italic"><i style="font-family:Georgia,serif">I</i></button>
  <button class="db" data-cmd="underline"><u>U</u></button>
  <button class="db" data-act="hl"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg></button>
  <button class="db" data-act="ol"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><polyline points="7.5 17 12 7 16.5 17"/><line x1="9.2" y1="13.5" x2="14.8" y2="13.5"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-list="ul"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg></button>
  <button class="db" data-list="ol"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 4.5h1.5V9"/><path d="M3.5 13.5c.4-.6 1-1 1.6-1 .8 0 1.4.5 1.4 1.2 0 1-2.9 2.2-2.9 3.3h3"/></svg></button>
  <button class="db" data-list="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><polyline points="8 12.5 11 15.5 16.5 9"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-act="size"><span style="font-size:13px;opacity:.7">Aa</span><span id="sizeNum">17</span><span class="caret">▼</span></button>
  <button class="db" data-act="color"><span id="colorDot" style="background:${c.text}"></span><span class="caret">▼</span></button>
</div>

<!-- Barra de dibujo -->
<div class="dock" id="drawdock">
  <button class="db" data-d="text"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></button>
  <span class="dsep"></span>
  <button class="db on" data-tool="pen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
  <button class="db" data-tool="hl"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg></button>
  <button class="db" data-tool="eraser"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-d="color"><span id="penDot" style="background:${c.text}"></span></button>
  <button class="db" data-d="size"><span id="penSizeDot" style="width:10px;height:10px"></span></button>
  <button class="db" data-d="undo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
  <button class="db" data-d="clear"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
</div>

<!-- Panel de tamaño -->
<div class="panel" id="sizePanel">
  <div class="ptitle"><span>Tamaño de letra</span><button class="pclose" data-close="1">Listo</button></div>
  <div class="sizeTop"><span id="sizeBig">17</span><span id="sample" style="font-size:17px">Aa</span></div>
  <input type="range" id="range" min="5" max="100" step="1" value="17">
  <div class="chips" id="chips">${chips}</div>
</div>

<!-- Panel de resaltador / contorno -->
<div class="panel" id="fxPanel">
  <div class="ptitle"><span id="fxTitle">Resaltador</span><button class="pclose" data-close="1">Listo</button></div>
  <div class="sws" id="fxSws">${swatches}</div>
  <button class="fxNone" id="fxNone">Quitar</button>
</div>

<!-- Panel de colores -->
<div class="panel" id="colorPanel">
  <div class="ptitle"><span>Color de letra</span><button class="pclose" data-close="1">Listo</button></div>
  <div class="sws" id="sws">${swatches}</div>
</div>

<!-- Barra de opciones de foto -->
<div class="dock hide" id="imgbar">
  <button class="db" data-img="crop"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> Recortar</button>
  <span class="lbl" id="pctLabel">100%</span>
  <button class="db" data-img="reset"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 100%</button>
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
    var L = listOf(n), lk = !L ? '' : L.tagName === 'OL' ? 'ol' : L.classList.contains('checklist') ? 'check' : 'ul';
    dock.querySelectorAll('[data-list]').forEach(function(b){ b.classList.toggle('on', b.dataset.list === lk); });
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
    showTip(col ? '✓ Resaltado' : 'Resaltado quitado');
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
  /* ---------- Listas y checklist ---------- */
  function listOf(node){
    var e = node && (node.nodeType === 1 ? node : node.parentElement);
    while (e && e !== ed && e !== ttl) {
      if (e.tagName === 'UL' || e.tagName === 'OL') return e;
      e = e.parentElement;
    }
    return null;
  }
  function applyList(kind){
    if (cur === ttl) { showTip('Las listas van en la nota, no en el título'); return; }
    restore();
    var s = window.getSelection();
    var L = s.rangeCount ? listOf(s.anchorNode) : null;
    var isCheck = L && L.tagName === 'UL' && L.classList.contains('checklist');
    var curKind = !L ? null : L.tagName === 'OL' ? 'ol' : isCheck ? 'check' : 'ul';
    if (curKind === kind) {
      // tocar otra vez el mismo botón: quitar la lista
      document.execCommand(kind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
      showTip('Lista quitada');
    } else {
      if (curKind === 'check' && kind === 'ul') { L.classList.remove('checklist'); }
      else if (curKind === 'ul' && kind === 'check') { L.classList.add('checklist'); }
      else {
        if (L) document.execCommand(curKind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
        document.execCommand(kind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
        var s2 = window.getSelection();
        var L2 = s2.rangeCount ? listOf(s2.anchorNode) : null;
        if (L2 && kind === 'check') L2.classList.add('checklist');
        if (L2 && kind === 'ul') L2.classList.remove('checklist');
      }
      showTip(kind === 'ol' ? '✓ Lista numerada' : kind === 'check' ? '✓ Checklist' : '✓ Viñetas');
    }
    keepSelection(); changedNow(); updateState();
  }
  // Tocar la casilla de un checklist la marca o desmarca (sin abrir el teclado)
  function checkboxHit(e){
    var li = e.target.closest ? e.target.closest('li') : null;
    if (!li || !li.parentElement || !li.parentElement.classList.contains('checklist')) return null;
    var r = li.getBoundingClientRect();
    return (e.clientX - r.left) < 30 ? li : null;
  }
  ed.addEventListener('pointerdown', function(e){
    if (!editable || drawing) return;
    var li = checkboxHit(e);
    if (!li) return;
    e.preventDefault(); e.stopImmediatePropagation();
    li.classList.toggle('done');
    changedNow();
  }, true);
  ed.addEventListener('mousedown', function(e){ if (checkboxHit(e)) e.preventDefault(); }, true);
  // Al presionar Enter en un checklist, la casilla nueva sale sin marcar
  ed.addEventListener('keydown', function(e){
    if (e.key !== 'Enter') return;
    setTimeout(function(){
      var s = window.getSelection();
      var n = s.rangeCount ? s.anchorNode : null;
      var li = n && (n.nodeType === 1 ? n : n.parentElement);
      li = li && li.closest ? li.closest('li') : null;
      if (li && li.classList.contains('done') && !li.textContent.replace(/\u200B/g, '').trim()) li.classList.remove('done');
    }, 0);
  });
  ed.addEventListener('click', function(e){ if (checkboxHit(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

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
    if (t.dataset.list) { closePanels(); applyList(t.dataset.list); return; }
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
      return;
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
