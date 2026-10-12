/* editor-1.js — pedazo 1 del editor (va junto a App.js y editor.js) */

export function part1({ c, chips, editable, glass, id, kind, safeContent, safeInk, safeTitle, swatches, updated }) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root{--kb:0px}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;padding:0;background:transparent;color:${c.text};font-family:-apple-system,Roboto,"Segoe UI",sans-serif}
  #ttl{outline:none;padding:14px 20px 2px;font-size:26px;font-weight:700;line-height:1.25;word-wrap:break-word}
  #ttl:empty:before{content:'Título';color:${c.muted}}
  #meta{padding:4px 20px 0;font-size:13px;color:${c.muted}}
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
`;
}
