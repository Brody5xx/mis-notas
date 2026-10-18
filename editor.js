
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
export function buildEditorHtml({ id, content, titleHtml, updated, editable, c, kind, ink, tr, locale, exportJob, colors, safeBottom }) {
  const SB = Math.max(0, Math.round(+safeBottom || 0));       // barra de gestos / botones del teléfono (para que no tape la barra de abajo)
  /* exportJob = { kind: 'pdf' | 'img', name, notes: [{ t, h, k, u, locked, bg }] } → hace el archivo y lo manda a la app */
  const safeJob = JSON.stringify(exportJob || null).replace(/</g, '\\u003c');
  /* Textos traducidos: H = para HTML, J = para JavaScript, C = para CSS */
  const T = (k, v) => (tr ? tr(k, v) : k);
  const H = (k, v) => String(T(k, v)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const J = (k, v) => JSON.stringify(String(T(k, v))).replace(/</g, '\\u003c');
  const C = (k, v) => '"' + String(T(k, v)).replace(/["\\]/g, '\\$&').replace(/\n/g, ' ') + '"';
  const safeInk = JSON.stringify(ink || []).replace(/</g, '\\u003c');
  const safeContent = JSON.stringify(content).replace(/</g, '\\u003c');
  const safeTitle = JSON.stringify(titleHtml || '').replace(/</g, '\\u003c');
  const safeColors = JSON.stringify(colors || {}).replace(/</g, '\\u003c');
  const glass = c.dockFill;
  const chips = SIZE_CHIPS.map(v => `<button class="chip" data-size="${v}">${v}</button>`).join('');
  const swatches = COLORS.map(col =>
    `<button class="sw" data-color="${col || c.text}" style="background:${col || c.text}"></button>`).join('');

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root{--kb:${SB}px}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;padding:0;background:transparent;color:${c.text};font-family:-apple-system,Roboto,"Segoe UI",sans-serif}
  #ttl{outline:none;padding:14px 20px 2px;font-size:26px;font-weight:700;line-height:1.25;word-wrap:break-word}
  #ttl:empty:before{content:${C('ttlPh')};color:${c.muted}}
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
  #ed ul.checklist>li.donefirst{margin-top:34px}
  #ed ul.checklist>li.donefirst::after{content:attr(data-head);position:absolute;left:0;top:-28px;font-size:13px;font-weight:700;
       letter-spacing:.3px;text-decoration:none;color:${c.text};white-space:nowrap;pointer-events:none}
  #ckAsk{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}
  #ckAsk.show{display:flex}
  #ckAsk .box{width:min(320px,86vw);border-radius:22px;padding:20px 18px 14px;background:${c.strong || 'rgba(38,38,38,.95)'};
       border:1px solid ${c.border};-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:${c.text};font-family:inherit}
  #ckAsk h3{margin:0 0 6px;font-size:18px}
  #ckAsk p{margin:0 0 6px;font-size:14px;line-height:1.4;opacity:.8}
  #ckAsk .it{margin:8px 0 14px;padding:10px 12px;border-radius:12px;border:1px solid ${c.border};font-size:14px;max-height:90px;overflow:hidden}
  #ckAsk .row{display:flex;gap:10px}
  #ckAsk button{flex:1;padding:12px 8px;border-radius:16px;font-size:15px;font-weight:700;border:1px solid ${c.border};
       background:transparent;color:${c.text}}
  #ckAsk button.yes{background:${c.text};color:${c.inv};border-color:${c.text}}
  #ed{outline:none;padding:12px 20px 230px;min-height:80vh;font-size:17px;line-height:1.5;word-wrap:break-word}
  #ed:empty:before{content:${C('edPh')};color:${c.muted}}
  ::selection{background:rgba(255,255,255,0.28)}

  /* ===== Barra flotante de vidrio (abajo) ===== */
  .dock{position:fixed;left:50%;bottom:calc(14px + var(--kb));transform:translateX(-50%);z-index:6;
        display:flex;align-items:center;gap:2px;padding:6px;border-radius:28px;max-width:calc(100% - 20px);
        background:${glass};-webkit-backdrop-filter:blur(18px) saturate(1);backdrop-filter:blur(18px) saturate(1);
        border:1px solid ${c.border};box-shadow:0 10px 30px rgba(0,0,0,.20);
        overflow-x:auto;transition:opacity .2s,transform .2s}
  .dock::-webkit-scrollbar,.chips::-webkit-scrollbar{display:none}
  .dock.hide{opacity:0;pointer-events:none;transform:translateX(-50%) translateY(24px)}
  .db{flex:none;height:42px;min-width:42px;border:none;border-radius:21px;background:transparent;color:${c.text};
      font-size:17px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:5px;
      transition:background .15s,transform .1s,box-shadow .15s;white-space:nowrap}
  .db:active{transform:scale(.9)}
  .db.on{background:rgba(255,255,255,0.92);color:${c.inv};box-shadow:0 4px 14px rgba(0,0,0,.18)}
  .dsep{flex:none;width:1px;height:24px;background:${c.border};margin:0 3px}
  .caret{font-size:10px;opacity:.6}
  #sizeNum{font-weight:700;font-variant-numeric:tabular-nums;min-width:20px}
  #colorDot{width:24px;height:24px;border-radius:12px;border:2px solid #fff;box-shadow:0 0 0 1px ${c.border},0 2px 6px rgba(0,0,0,.2)}

  /* ===== Paneles que salen encima de la barra ===== */
  .panel{position:fixed;left:12px;right:12px;bottom:calc(78px + var(--kb));z-index:7;padding:16px;border-radius:26px;
         background:${glass};-webkit-backdrop-filter:blur(20px) saturate(1);backdrop-filter:blur(20px) saturate(1);
         border:1px solid ${c.border};box-shadow:0 16px 40px rgba(0,0,0,.25);
         opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .18s,transform .18s}
  .panel.show{opacity:1;transform:none;pointer-events:auto}
  .ptitle{display:flex;align-items:center;justify-content:space-between;color:${c.muted};font-size:12px;
          letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
  .pclose{border:none;background:none;color:${c.accent};font-size:15px;font-weight:700;padding:4px 6px;text-transform:none;letter-spacing:0}
  .sizeTop{display:flex;align-items:center;justify-content:space-between;height:64px}
  #sizeBig{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;
           color:${c.text}}
  #sample{color:${c.text};font-weight:600;line-height:1;max-width:60%;overflow:hidden;white-space:nowrap}
  #range{flex:1;min-width:0;width:100%;height:34px;margin:0;accent-color:#ffffff}
  .szRow{display:flex;align-items:center;gap:12px;margin:6px 0 10px}
  .szStep{flex:none;width:40px;height:40px;border-radius:20px;border:1px solid ${c.border};background:rgba(255,255,255,.08);
          color:${c.text};display:flex;align-items:center;justify-content:center;padding:0;touch-action:manipulation;
          transition:transform .12s ease,background .12s ease}
  .szStep:active,.szStep.press{transform:scale(.9);background:rgba(255,255,255,.22)}
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0}
  .chip{flex:none;min-width:46px;height:36px;border-radius:18px;border:1px solid ${c.border};background:transparent;
        color:${c.text};font-size:15px;font-variant-numeric:tabular-nums}
  .chip.on{background:rgba(255,255,255,0.92);color:${c.inv};border-color:transparent}
  .ctabs{display:flex;gap:4px;padding:3px;border-radius:16px;background:rgba(127,127,127,.18);text-transform:none;letter-spacing:0}
  .ctab{border:none;background:none;color:${c.text};padding:4px 14px;border-radius:13px;line-height:0}
  .ctab svg{display:block}
  .ctab.on{background:${c.text};color:${c.inv}}
  #colorPanel #ctitle{display:none}
  body.drawing #colorPanel #ctitle{display:inline}
  body.drawing #colorPanel .ctabs{display:none}
  #olNone{display:none;margin-top:8px}
  #colorPanel.olmode #olNone{display:block}
  body.drawing #colorPanel #olNone{display:none}
  #colorPanel.noOl .ctabs,#colorPanel.noOl #olNone{display:none}
  .pleft{display:flex;align-items:center;gap:8px}
  .pback{flex:none;width:38px;height:38px;border-radius:19px;border:1px solid ${c.border};background:rgba(255,255,255,.08);
         color:${c.text};display:flex;align-items:center;justify-content:center;padding:0;transition:transform .12s}
  .pback:active{transform:scale(.88)}
  .cwrap{position:relative;width:200px;height:200px;margin:2px auto 8px;touch-action:none}
  #wheel{width:200px;height:200px;border-radius:50%;display:block;touch-action:none;
         box-shadow:0 4px 18px rgba(0,0,0,.25)}
  #wheelKnob.glide{transition:left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),background-color .5s}
  #wheelShade{position:absolute;inset:0;border-radius:50%;background:#000;opacity:0;pointer-events:none}
  #wheelKnob{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;
             border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.4);
             pointer-events:none;left:50%;top:50%}
  .crow{display:flex;align-items:center;gap:14px;padding:0 4px}
  #cprev{flex:none;width:40px;height:40px;border-radius:20px;border:2px solid rgba(255,255,255,.8);
         box-shadow:0 2px 8px rgba(0,0,0,.25)}
  .cbright{flex:1}
  #bright{width:100%;height:30px;accent-color:${c.text}}
  .clabel{font-size:12px;color:${c.muted};letter-spacing:.06em}
  #chex{font-variant-numeric:tabular-nums}
  .cbtop{display:flex;align-items:center;justify-content:space-between}
  .cbRow{margin:4px 0 0 !important;gap:10px !important}
  .cbRow .szStep{width:36px;height:36px;border-radius:18px}
  #colorPanel,#fxPanel{max-height:calc(100vh - var(--dockH, 56px) - 40px - var(--kb));overflow-y:auto;overscroll-behavior:contain}
  .cpal{display:flex;align-items:center;gap:10px;padding:8px 2px 0}
  .cplab{flex:none;width:86px;display:flex;align-items:center;gap:6px;font-size:12px;color:${c.muted};letter-spacing:.02em;
         overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .cplab span{overflow:hidden;text-overflow:ellipsis}
  .cprow{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
  .cpsw{flex:1;min-width:0;display:flex;gap:8px;overflow-x:auto;padding:3px 2px;scrollbar-width:none;min-height:40px;align-items:center}
  .cpsw::-webkit-scrollbar{display:none}
  .cpsw .sw{flex:none;width:32px;height:32px;border-radius:16px;touch-action:pan-x;
            transition:transform .18s ease,opacity .18s ease,box-shadow .15s}
  .cpsw .sw.bye{transform:scale(0);opacity:0}
  .cpsw .sw.hold{transform:scale(.82)}
  .cpsw:empty:before{content:'—';color:${c.muted};font-size:14px;padding-left:4px}
  .cpadd{flex:none;width:34px;height:34px;border-radius:17px;border:1.5px dashed ${c.muted};background:transparent;color:${c.text};
         display:flex;align-items:center;justify-content:center;padding:0;transition:transform .12s}
  .cpadd:active{transform:scale(.88)}
  .sw.pop{animation:swPop .35s ease}
  @keyframes swPop{0%{transform:scale(0)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
  .sws{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;justify-items:center;padding:4px 0}
  .sw{width:40px;height:40px;border-radius:20px;border:2px solid rgba(255,255,255,.7);padding:0;
      box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .1s}
  .sw:active{transform:scale(.88)}
  .sw.on{box-shadow:0 0 0 3px ${c.card},0 0 0 6px #ffffff}

  /* ===== Fotos dentro de la nota ===== */
  .imgwrap{margin:10px auto;width:100%;max-width:100%;position:relative;transform-origin:center center;clear:both}
  #ed::after{content:'';display:block;clear:both}
  .imgwrap.sel:not([data-anchor]){touch-action:none;cursor:move}
  /* Guías rojas y medida al mover una foto */
  #gx,#gy{position:fixed;background:#ff3b30;z-index:7;pointer-events:none;display:none}
  #gx{left:0;right:0;height:1px}
  #gy{top:0;bottom:0;width:1px}
  #gx.snap,#gy.snap{background:#ff3b30;box-shadow:0 0 6px #ff3b30}
  #mvinfo{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:8;display:none;pointer-events:none;
          background:rgba(0,0,0,.72);color:#fff;font-size:14px;font-weight:700;padding:7px 14px;border-radius:16px;
          font-variant-numeric:tabular-nums;white-space:nowrap}
  #mvinfo b{color:#ff6b61;font-weight:800}
  /* Botones de anclar debajo de la foto */
  #anchorBar{position:absolute;display:none;z-index:6;gap:8px;transform:translateX(-50%);white-space:nowrap}
  #anchorBar.show{display:flex}
  #anchorBar button{border:1px solid rgba(255,255,255,.35);background:rgba(30,30,30,.72);color:#fff;font-size:14px;font-weight:700;
          padding:8px 14px;border-radius:18px;display:flex;align-items:center;gap:6px;
          -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
  #anchorBar button.on{background:#fff;color:#111}
  .imgwrap.sel[data-anchor]::after{content:'📌';position:absolute;top:-10px;left:-10px;font-size:18px;pointer-events:none}
  .imgwrap img{width:100%;height:auto;display:block;background:transparent}
  .imgwrap svg.stamp{position:absolute;left:0;bottom:0;width:100%;height:auto;pointer-events:none;display:block}
  /* Foto elegida: borde azul hielo con brillo + 2 luces blancas que giran alrededor */
  @property --spin{syntax:'<angle>';inherits:false;initial-value:0deg}
  #rsz{position:absolute;display:none;pointer-events:none;border:2px solid #5ccfff;border-radius:6px;z-index:3;
        transform-origin:center center;
        box-shadow:0 0 0 1px rgba(0,0,0,.35),0 0 12px 2px rgba(92,207,255,.55),inset 0 0 10px rgba(92,207,255,.35)}
  #rsz::before{content:'';position:absolute;inset:-5px;border-radius:9px;padding:3px;pointer-events:none;
        background:conic-gradient(from var(--spin),transparent 0deg,transparent 20deg,rgba(255,255,255,.9) 60deg,#fff 72deg,transparent 78deg,
          transparent 200deg,rgba(255,255,255,.9) 240deg,#fff 252deg,transparent 258deg,transparent 360deg);
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
        mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);
        filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px rgba(92,207,255,.9));
        animation:rszSpin 2.2s linear infinite}
  @keyframes rszSpin{to{--spin:360deg}}
  /* Esquinas invisibles: no se ven, pero arrastrándolas cambia el tamaño */
  .rh{position:absolute;width:44px;height:44px;background:transparent;border:none;pointer-events:auto;touch-action:none}
  .rh[data-r=tl]{left:-22px;top:-22px}.rh[data-r=tr]{right:-22px;top:-22px}
  .rh[data-r=bl]{left:-22px;bottom:-22px}.rh[data-r=br]{right:-22px;bottom:-22px}
  #pct{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.75);color:#fff;
       font-size:22px;font-weight:700;padding:8px 16px;border-radius:14px;display:none;white-space:nowrap}
  #pct.show{display:none}
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
  /* Barra de fotos en 2 filas: botones arriba, giro abajo */
  #imgbar{flex-direction:column;align-items:stretch;flex-wrap:nowrap;padding:4px 8px;border-radius:24px;row-gap:0}
  #imgbar .drow{display:flex;align-items:center;justify-content:space-between;gap:2px}
  #imgbar .db{height:40px;padding:0 6px;min-width:36px;font-size:14px}
  #imgbar .rotrow{padding:0 2px 2px}
  #imgbar .presets{justify-content:flex-start;padding:2px 0 0;gap:5px;overflow-x:auto;scroll-behavior:smooth;
          -webkit-overflow-scrolling:touch;scrollbar-width:none}
  #imgbar .presets::-webkit-scrollbar{display:none}
  #imgbar .presets button{flex:0 0 auto;min-width:48px;height:30px;border-radius:15px;border:1px solid ${c.border};background:transparent;
          color:${c.text};font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;padding:0}
  #imgbar .presets button.on{background:#ff3b30;border-color:#ff3b30;color:#fff}
  #imgbar .db.pm{min-width:34px;width:34px;height:34px;padding:0;border-radius:17px;font-size:22px;font-weight:700;
          border:1px solid ${c.border};touch-action:manipulation}
  #imgbar .lbl{font-size:13px;font-weight:700;color:${c.text};font-variant-numeric:tabular-nums;min-width:52px;text-align:center}
  #rotRange{flex:1;min-width:60px;accent-color:#ff3b30;height:30px;touch-action:none}
  /* Editor de foto: escribir y dibujar encima (con la misma barra de las notas) */
  #imged{position:fixed;inset:0;background:#000;z-index:10;display:none;flex-direction:column}
  #imged.show{display:flex}
  #ieHead{display:flex;justify-content:space-between;padding:8px 10px 2px}
  #ieHead button{background:none;border:none;color:#fff;font-size:17px;padding:10px 14px}
  #ieHead .ok{font-weight:800}
  #ieText{display:none;gap:8px;padding:6px 12px}
  #ieText.show{display:flex}
  #ieInput{flex:1;font-size:17px;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.4);background:#1d1d1d;color:#fff;outline:none}
  #ieTextOk{border:none;background:#fff;color:#111;font-size:18px;font-weight:800;border-radius:14px;padding:0 16px}
  #ieHint{color:rgba(255,255,255,.7);text-align:center;font-size:13px;padding:2px 12px 4px;display:none}
  #ieHint.show{display:block}
  #ieArea{position:absolute;inset:0;overflow:hidden;touch-action:none;display:flex;align-items:center;justify-content:center;
          padding-top:var(--ieTopH,90px);padding-bottom:var(--ieBarH,120px)}
  /* Al acercar la foto, las barras se esconden (arriba sube, abajo baja) */
  #ieTop{position:absolute;left:0;right:0;top:0;z-index:12;background:#000;transition:transform .28s ease,opacity .28s ease}
  #imged.zoomed #ieTop{transform:translateY(-110%);opacity:0;pointer-events:none}
  #imged #iebar{transition:transform .28s ease,opacity .28s ease !important}
  #imged.zoomed #iebar{transform:translateY(160%) !important;opacity:0;pointer-events:none}
  #ieCanvas{touch-action:none;box-shadow:0 0 0 1px rgba(255,255,255,.25);transform-origin:center center;will-change:transform}
  #iebar{left:10px !important;right:10px;transform:none !important;max-width:none !important;bottom:${14 + SB}px !important;
         flex-direction:column;align-items:stretch;flex-wrap:nowrap;padding:4px 6px;border-radius:24px;row-gap:0}
  #iebar .drow{display:flex;align-items:center;justify-content:space-between;gap:0}
  #imged #iebar{background:rgba(22,22,22,.88) !important;z-index:12}
  #iebar .db{flex:1 1 0;min-width:0;height:40px;padding:0 2px}
  #iebar .db[data-ie=size]{flex:1.6 1 0}
  #iebar .db[data-ie=color]{flex:1.2 1 0}
  #iebar .db[data-ie=edit]{flex:2.2 1 0;gap:6px}
  #iebar .ielbl{font-size:14px;font-weight:700}
  #iebar .ietxt.off{opacity:.3;pointer-events:none}
  #iebar .db.on{background:${c.text};color:${c.inv}}
  #ieColorDot{width:22px;height:22px;border-radius:11px;display:inline-block;border:2px solid rgba(255,255,255,.6)}
  /* Los paneles de tamaño y color se ven encima del editor de foto */
  body.ie .panel{z-index:13 !important;bottom:calc(var(--ieBarH,120px) + 24px) !important}

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
  /* sombrita en los íconos para que se lean sobre fotos claras */
  .dock .db,.dock .db svg{text-shadow:0 0 4px rgba(0,0,0,.85),0 1px 2px rgba(0,0,0,.8);filter:drop-shadow(0 0 2px rgba(0,0,0,.75)) drop-shadow(0 1px 2px rgba(0,0,0,.6))}
  .dock,.panel{
    border:none !important;
    /* vidrio oscuro: los botones blancos se ven aunque detrás haya una foto blanca */
    background:rgba(14,14,16,.04) !important;
    -webkit-backdrop-filter:blur(18px) brightness(.93) saturate(1.2) !important;
    backdrop-filter:blur(18px) brightness(.93) saturate(1.2) !important;
    box-shadow:inset 0 0 0 2.5px ${c.rim || 'rgba(255,255,255,.2)'},inset 0 0 14px ${c.rim || 'rgba(255,255,255,.2)'},inset 0 2px 2px ${c.hi},0 14px 36px rgba(0,0,0,.12) !important;
  }
  /* borde de colores solo en la orilla (rosa arriba, azul abajo) */
  .dock::before,.panel::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.2px;pointer-events:none;
    background:linear-gradient(135deg,${c.stroke[0]},${c.stroke[1]} 40%,${c.stroke[c.stroke.length - 2]} 60%,${c.stroke[c.stroke.length - 1]});
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
    mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
  .chip{border-color:${c.border} !important}
  .db.on,.chip.on{background:${c.text} !important;color:${c.inv} !important;box-shadow:none !important;border-color:transparent !important}
  .db svg{display:block}
  #sizeBig{background:none !important;-webkit-background-clip:initial !important;background-clip:initial !important;color:${c.text} !important}
  .rh{border:none !important}
  /* La barra se acomoda en 2 filas si no cabe (así ningún botón queda escondido) */
  .dock{flex-wrap:wrap;justify-content:center;overflow:visible !important;row-gap:2px}
  /* Barra de texto: ancha, 2 filas fijas */
  #dock{left:10px !important;right:10px;transform:none !important;max-width:none !important;
        flex-direction:column;align-items:stretch;flex-wrap:nowrap;padding:4px 6px;border-radius:24px;row-gap:0}
  #dock.hide{transform:translateY(24px) !important}
  #dock .drow{display:flex;align-items:center;justify-content:space-between;gap:0}
  #dock .db{flex:1 1 0;min-width:0;height:40px;padding:0 2px}
  #dock .db[data-act=size]{flex:1.7 1 0}
  #dock .db[data-act=color]{flex:1.2 1 0}
  #dock .dsep{margin:0 2px}
  /* Barra de dibujo y de fotos: también anchas */
  #drawdock,#imgbar{left:10px !important;right:10px;transform:none !important;max-width:none !important;justify-content:space-around}
  #drawdock.hide,#imgbar.hide{transform:translateY(24px) !important}
  #drawdock{flex-direction:column;align-items:stretch;flex-wrap:nowrap;padding:4px 6px;border-radius:24px;row-gap:0}
  #drawdock .drow{display:flex;align-items:center;justify-content:space-between;gap:0}
  #drawdock .db{flex:1 1 0;min-width:0;height:40px;padding:0 2px}
  #drawdock .db.ddone{flex:1.6 1 0;font-size:15px;font-weight:700;background:${c.text};color:${c.inv};margin-left:4px;text-shadow:none;filter:none}
  #drawdock .db.dim{opacity:.35}
  .db{min-width:40px;padding:0 8px}
  .panel{bottom:calc(var(--dockH, 56px) + 24px + var(--kb)) !important}
  .fxNone{display:block;margin:14px auto 0;border:none;background:none;color:${c.muted};font-size:15px;padding:6px 12px}
  .sw.on{box-shadow:0 0 0 3px rgba(0,0,0,.35),0 0 0 6px ${c.text} !important}
  #tip{background:rgba(20,20,40,.55);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
       border:0.5px solid rgba(255,255,255,.35);box-shadow:inset 0 2px 2px rgba(255,255,255,.2)}
  /* ===== Reescribir con IA ===== */
  #rwChip{position:absolute;z-index:8;display:none;border:none;border-radius:18px;padding:9px 16px;font-size:15px;font-weight:700;
          color:#111;background:linear-gradient(135deg,#ffffff,#d9f1ff);box-shadow:0 6px 20px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.5);
          font-family:inherit;transform:translateX(-50%);animation:rwPop .18s ease-out}
  #rwChip.show{display:block}
  @keyframes rwPop{from{opacity:0;transform:translateX(-50%) scale(.85)}to{opacity:1;transform:translateX(-50%) scale(1)}}
  body.rw #dock{display:none !important}
  /* ===== Audio grabado dentro de la nota ===== */
  .audwrap{display:flex;align-items:center;gap:12px;margin:12px 0;padding:12px 14px;border-radius:16px;
           background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.08);user-select:none;-webkit-user-select:none}
  .audwrap button{flex:none;border:none;background:none;color:${c.text};padding:0;display:flex;align-items:center;justify-content:center}
  .audwrap .audp{width:40px;height:40px}
  .audwrap .audbar{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.22);position:relative;overflow:hidden;cursor:pointer}
  .audwrap .audfill{position:absolute;left:0;top:0;bottom:0;width:0;background:#9fb4ff;border-radius:3px}
  .audwrap .audt{flex:none;font-size:15px;color:${c.muted};font-variant-numeric:tabular-nums;min-width:40px;text-align:right}
  .audwrap .audx{width:34px;height:34px;opacity:.85}
  .audwrap audio{display:none}
  .audwrap{flex-wrap:wrap;row-gap:8px}
  .audwrap .audctl{flex-basis:100%;display:flex;align-items:center;justify-content:center;gap:26px}
  .audwrap .audctl button{height:36px;min-width:44px;border-radius:18px;color:${c.text};gap:4px;font-size:13px;font-weight:700}
  .audwrap .audctl .audsp{min-width:58px;padding:0 12px;background:rgba(255,255,255,.12);font-size:15px;font-variant-numeric:tabular-nums}
  .audwrap .audctl button:active{background:rgba(255,255,255,.18)}
  .audtx{color:${c.muted};font-style:italic}
  /* ===== Videos dentro de la nota ===== */
  .vidwrap{margin:12px 0;border-radius:16px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,.1);user-select:none;-webkit-user-select:none}
  .vidwrap video{display:block;width:100%;max-height:70vh;background:#000}
  .vidbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.08)}
  .vidbar .vidsz{flex:1;font-size:13px;color:${c.muted};font-variant-numeric:tabular-nums}
  .vidbar button{border:1px solid ${c.border};background:transparent;color:${c.text};border-radius:14px;padding:5px 12px;font-size:13px;font-weight:700;font-family:inherit;display:flex;align-items:center;gap:4px}
  .vidbar .vidx{padding:5px 8px}
  ${editable ? '' : '.vidbar button,.audwrap .audx{display:none !important}'}
  #recP{bottom:calc(14px + var(--kb)) !important;z-index:9}
  body.recording #dock,body.recording #rwChip{display:none !important}
  #recP .recTop{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  #recP .recDot{width:14px;height:14px;border-radius:7px;background:#ff4d4d;box-shadow:0 0 0 0 rgba(255,77,77,.6);animation:recPulse 1.2s infinite}
  @keyframes recPulse{0%{box-shadow:0 0 0 0 rgba(255,77,77,.55)}70%{box-shadow:0 0 0 12px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}
  #recP .recLbl{flex:1;color:${c.muted};font-size:13px;letter-spacing:.05em;text-transform:uppercase}
  #recP .recTime{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;color:${c.text}}
  #recP .recTxt{min-height:70px;max-height:34vh;overflow:auto;font-size:17px;line-height:1.45;color:${c.text};padding:4px 2px 10px}
  #recP .recTxt i{color:${c.muted};font-style:normal}
  #recP .recBtns{display:flex;gap:10px}
  #recP .recUp{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:44px;margin:0 0 12px;border-radius:22px;border:1.5px dashed ${c.border};background:transparent;color:${c.text};font-size:15px;font-weight:600}
  #recP .recLangs{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}
  #recP .recLangs::-webkit-scrollbar{display:none}
  #recP .recLangs button{flex:none;height:34px;padding:0 14px;border-radius:17px;border:1px solid ${c.border};background:transparent;color:${c.text};font-size:14px}
  #recP .recLangs button.on{background:${c.text};color:${c.inv};border-color:transparent;font-weight:700}
  #recP .recBtns button{flex:1;height:46px;border-radius:23px;font-size:16px;font-weight:700;border:1px solid ${c.border};background:transparent;color:${c.text}}
  #recP .recBtns .recOk{background:${c.text};color:${c.inv};border-color:transparent}
  #rw{bottom:calc(14px + var(--kb)) !important;z-index:9;padding:0;overflow:hidden}
  #rwIn{padding:14px 14px 12px;max-height:72vh;overflow:auto;overscroll-behavior:contain;border-radius:inherit}
  #rw .rwHead{display:flex;align-items:center;justify-content:space-between;color:${c.muted};font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
  #rw .rwX{border:none;background:none;color:${c.text};font-size:20px;padding:2px 6px;line-height:1}
  #rw .rwGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  #rw .rwOpt{border:1px solid ${c.border};background:rgba(255,255,255,.06);color:${c.text};border-radius:16px;padding:10px 4px;font-size:13px;
             font-weight:600;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:inherit}
  #rw .rwOpt b{font-size:20px;font-weight:400}
  #rw .rwGrid.many{grid-template-columns:repeat(4,1fr);gap:6px}
  #rw .rwGrid.many .rwOpt{padding:7px 2px;font-size:11.5px;line-height:1.2;border-radius:14px;gap:2px}
  #rw .rwGrid.many .rwOpt b{font-size:18px}
  #rw .rwTabs{display:flex;gap:6px;margin:0 0 10px}
  #rw .rwTabs button{flex:1;border:1px solid ${c.border};background:transparent;color:${c.text};border-radius:16px;padding:8px 4px;font-size:13px;font-weight:700;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #rw .rwTabs button.on{background:${c.text};color:${c.inv};border-color:transparent}
  #rw .rwSec{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${c.muted};margin:12px 2px 6px}
  #rw .rwOpt:active{transform:scale(.96);background:rgba(255,255,255,.15)}
  #rw .rwOrig{font-size:13px;color:${c.muted};margin-bottom:10px;max-height:3.6em;overflow:hidden;font-style:italic}
  #rw .rwOut{font-size:16px;line-height:1.45;color:${c.text};white-space:pre-wrap;padding:12px;border-radius:14px;background:rgba(255,255,255,.07);
             border:1px solid ${c.border};max-height:38vh;overflow:auto;-webkit-user-select:text;user-select:text}
  #rw .rwRow{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  #rw .rwRow button{flex:1;min-width:30%;border:1px solid ${c.border};background:transparent;color:${c.text};border-radius:16px;padding:10px 8px;font-size:14px;font-weight:700;font-family:inherit}
  #rw .rwRow .main{background:${c.text};color:${c.inv};border-color:transparent}
  #rw .rwWait{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 0;color:${c.text};font-size:15px}
  #rw .rwDots{display:flex;gap:6px}
  #rw .rwDots i{width:9px;height:9px;border-radius:50%;background:${c.text};animation:rwDot 1s ease-in-out infinite}
  #rw .rwDots i:nth-child(2){animation-delay:.15s}#rw .rwDots i:nth-child(3){animation-delay:.3s}
  @keyframes rwDot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-6px)}}
  #rw .rwTip{margin:0 0 12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.07);font-size:14px;line-height:1.4;color:${c.text};display:flex;gap:10px;align-items:center}
  #rw .rwTip div{flex:1}
  #rw .rwTip small{display:block;color:${c.muted};font-size:11px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:3px}
  #rw .rwTip s{text-decoration:line-through;opacity:.6}
  #rw .rwTip button{flex:none;border:1px solid ${c.border};background:transparent;color:${c.text};border-radius:14px;padding:6px 10px;font-size:13px;font-family:inherit}
  #rw .rwHint{font-size:13px;color:${c.muted};margin:-4px 0 10px}
  #rw .synList{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  #rw .synList button{border:1px solid ${c.border};background:rgba(255,255,255,.07);color:${c.text};border-radius:18px;padding:9px 14px;font-size:15px;font-family:inherit}
  #rw .synList button:active{background:rgba(255,255,255,.18)}
  #rw .tplList{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  #rw .tplList button{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid ${c.border};background:rgba(255,255,255,.06);color:${c.text};border-radius:16px;padding:12px 12px;font-size:14px;font-weight:600;font-family:inherit}
  #rw .tplList button b{font-size:20px;font-weight:400}
  .audpro{margin:4px 0 10px;user-select:none;-webkit-user-select:none}
  .audpro button{border:1px solid ${c.border};background:rgba(255,255,255,.08);color:${c.text};border-radius:16px;padding:7px 14px;font-size:14px;font-weight:700;font-family:inherit}
  #rw .rwErr{color:#ff6b6b;font-size:14px;padding:6px 0}
  /* ===== Revisar ortografía ===== */
  #spLayer{position:absolute;left:0;top:0;width:0;height:0;z-index:2;pointer-events:none}
  .spm{position:absolute;border-bottom:2.5px solid #ff5252;pointer-events:none;border-radius:2px}
  .spm.cur{background:rgba(255,82,82,.35);border-radius:5px}
  body.spell #dock{display:none !important}
  #spell{bottom:calc(14px + var(--kb)) !important;z-index:9;padding:14px 16px 12px}
  #spell .spHead{display:flex;align-items:center;justify-content:space-between;color:${c.muted};font-size:12px;letter-spacing:.06em;text-transform:uppercase}
  #spell .spX{border:none;background:none;color:${c.text};font-size:20px;padding:2px 6px;line-height:1}
  #spell .spWord{margin-top:6px;font-size:19px;font-weight:700;color:#ff6b6b;text-decoration:line-through;word-break:break-word}
  #spell .spMsg{margin-top:4px;font-size:14px;color:${c.muted};line-height:1.35;max-height:3.2em;overflow:hidden}
  #spell .spSug{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  #spell .spSug button{border:none;border-radius:18px;padding:9px 16px;font-size:16px;font-weight:700;background:${c.text};color:${c.inv}}
  #spell .spNo{font-size:14px;color:${c.muted}}
  #spell .spRow{display:flex;align-items:center;gap:6px;margin-top:12px}
  #spell .spRow button{border:1px solid ${c.border};background:transparent;color:${c.text};border-radius:18px;padding:8px 14px;font-size:14px}
  #spell .spRow .grow{flex:1}
  #spell .spRow .nav{width:40px;padding:8px 0;font-size:18px;line-height:1}
  #spell .spInfo{display:flex;align-items:center;gap:10px;font-size:16px;color:${c.text};padding:6px 0 4px}
  .spSpin{width:18px;height:18px;border-radius:50%;border:2.5px solid ${c.muted};border-top-color:${c.text};animation:spSpin .8s linear infinite}
  @keyframes spSpin{to{transform:rotate(360deg)}}
  /* ===== Modo "crear archivo" (PDF / imagen): solo el contenido ===== */
  body.export>*:not(#ttl):not(#meta):not(#ed):not(#ink){display:none !important}
  body.export #ed{padding-bottom:28px !important;min-height:0 !important}
</style></head><body${exportJob ? ' class="export"' : ''}>

<div id="ttl" dir="auto" spellcheck="false" autocorrect="off" contenteditable="${editable}"></div>
<div id="meta"></div>
<div id="ed" dir="auto" spellcheck="false" contenteditable="${editable}"></div>
<canvas id="ink"></canvas>
<canvas id="live"></canvas>
<input type="file" id="file" accept="image/*,video/*" style="display:none">

<!-- Barra flotante -->
<div class="dock" id="dock" ${editable ? '' : 'style="display:none"'}>
 <div class="drow">
  <button class="db draw-only" data-act="draw"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
  <button class="db" data-act="img"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-cmd="bold"><b>B</b></button>
  <button class="db" data-cmd="italic"><i style="font-family:Georgia,serif">I</i></button>
  <button class="db" data-cmd="underline"><u>U</u></button>
  <button class="db" data-act="hl"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg></button>
 </div>
 <div class="drow">
  <button class="db" data-list="ul"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg></button>
  <button class="db" data-list="ol"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 4.5h1.5V9"/><path d="M3.5 13.5c.4-.6 1-1 1.6-1 .8 0 1.4.5 1.4 1.2 0 1-2.9 2.2-2.9 3.3h3"/></svg></button>
  <button class="db" data-list="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><polyline points="8 12.5 11 15.5 16.5 9"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-act="size"><span style="font-size:13px;opacity:.7">Aa</span><span id="sizeNum">17</span><span class="caret">▼</span></button>
  <button class="db" data-act="color"><span id="colorDot" style="background:${c.text}"></span><span class="caret">▼</span></button>
 </div>
</div>

<!-- Barra de dibujo -->
<div class="dock" id="drawdock">
 <div class="drow">
  <button class="db" data-d="text"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></button>
  <span class="dsep"></span>
  <button class="db on" data-tool="pen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
  <button class="db" data-tool="hl"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg></button>
  <button class="db" data-tool="eraser"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-d="color"><span id="penDot" style="background:${c.text}"></span></button>
  <button class="db" data-d="size"><span id="penSizeDot" style="width:10px;height:10px"></span></button>
 </div>
 <div class="drow">
  <button class="db" data-d="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
  <span class="dsep"></span>
  <button class="db" data-d="undo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
  <button class="db" data-d="redo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
  <button class="db" data-d="clear"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  <span class="dsep"></span>
  <button class="db ddone" data-d="done">${H('done')}</button>
 </div>
</div>

<!-- Panel de tamaño -->
<div class="panel" id="sizePanel">
  <div class="ptitle"><div class="pleft"><button class="pback" data-close="1" aria-label="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><span>${H('sizeTitle')}</span></div><button class="pclose" data-close="1">${H('done')}</button></div>
  <div class="sizeTop"><span id="sizeBig">17</span><span id="sample" style="font-size:17px">Aa</span></div>
  <div class="szRow"><button class="szStep" data-step="-1" aria-label="-"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button><input type="range" id="range" min="5" max="100" step="1" value="17"><button class="szStep" data-step="1" aria-label="+"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg></button></div>
  <div class="chips" id="chips">${chips}</div>
</div>

<!-- Panel de resaltador / contorno -->
<div class="panel" id="fxPanel">
  <div class="ptitle"><div class="pleft"><button class="pback" data-close="1" aria-label="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><span id="fxTitle">${H('highlighter')}</span></div><button class="pclose" data-close="1">${H('done')}</button></div>
  <div class="sws" id="fxSws">${swatches}</div>
  <div class="cpal"><div class="cplab"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg><span>${H('colRecent')}</span></div><div class="cpsw" id="fxRecent"></div></div>
  <div class="cpal"><div class="cplab"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><span>${H('colFav')}</span></div><div class="cprow"><div class="cpsw" id="fxFav"></div><button class="cpadd" id="fxFavAdd" title="${H('colFavHint')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg></button></div></div>
  <button class="fxNone" id="fxNone">${H('removeIt')}</button>
</div>

<!-- Panel de colores -->
<div class="panel" id="colorPanel">
  <div class="ptitle">
    <div class="pleft"><button class="pback" data-close="1" aria-label="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
    <span id="ctitle">${H('penColor')}</span>
    <div class="ctabs" id="ctabs">
      <button class="ctab on" data-ctab="text" title="${H('letterColor')}"><svg width="26" height="26" viewBox="0 0 24 24"><defs><linearGradient id="rb" x1="0" x2="1"><stop offset="0" stop-color="#ff3b30"/><stop offset=".25" stop-color="#ffcc00"/><stop offset=".5" stop-color="#34c759"/><stop offset=".75" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs><text x="12" y="16.5" text-anchor="middle" font-size="16" font-weight="800" font-family="Arial,sans-serif" fill="currentColor">A</text><rect x="4" y="19" width="16" height="3.2" rx="1.6" fill="url(#rb)"/></svg></button>
      <button class="ctab" data-ctab="ol" title="${H('outline')}"><svg width="26" height="26" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="12" y="17.3" text-anchor="middle" font-size="15" font-weight="900" font-family="Arial,sans-serif" fill="currentColor" stroke="#ff7a2a" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">A</text></svg></button>
    </div>
    </div>
    <button class="pclose" data-close="1">${H('done')}</button>
  </div>
  <div class="cwrap" id="cwrap">
    <canvas id="wheel" width="440" height="440"></canvas>
    <div id="wheelShade"></div>
    <div id="wheelKnob"></div>
  </div>
  <div class="crow">
    <span id="cprev"></span>
    <div class="cbright">
      <div class="cbtop"><span class="clabel">${H('brightness')}</span><span class="clabel" id="chex"></span></div>
      <div class="szRow cbRow"><button class="szStep" data-bstep="-5" aria-label="-"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button><input type="range" id="bright" min="0" max="100" value="100"><button class="szStep" data-bstep="5" aria-label="+"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg></button></div>
    </div>
  </div>
  <div class="cpal"><div class="cplab"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg><span>${H('colRecent')}</span></div><div class="cpsw" id="cRecent"></div></div>
  <div class="cpal"><div class="cplab"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg><span>${H('colFav')}</span></div><div class="cprow"><div class="cpsw" id="cFav"></div><button class="cpadd" id="cFavAdd" title="${H('colFavHint')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg></button></div></div>
  <button class="fxNone" id="olNone">${H('removeOutline')}</button>
</div>

<!-- Barra de opciones de foto -->
<div class="dock hide" id="imgbar">
 <div class="drow">
  <button class="db" data-img="crop"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg></button>
  <button class="db" data-img="edit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ${H('imgEdit')}</button>
  <button class="db" data-img="stamp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg> ${H('stampBtn')}</button>
  <button class="db" data-img="reset"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
  <button class="db" data-img="del"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  <button class="db" data-img="close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
 </div>
 <div class="drow presets" id="rotPresets">
 </div>
 <div class="drow rotrow">
  <span class="lbl" id="rotLbl">↻ 0°</span>
  <button class="db pm" id="rotMinus">−</button>
  <input type="range" id="rotRange" min="0" max="360" step="1" value="0">
  <button class="db pm" id="rotPlus">+</button>
  <span class="lbl" id="pctLabel">100%</span>
 </div>
</div>

<div id="rsz">
  <div class="rh" data-r="tl"></div><div class="rh" data-r="tr"></div>
  <div class="rh" data-r="bl"></div><div class="rh" data-r="br"></div>
  <div id="pct">100%</div>
</div>

<div id="crop">
  <div id="cropTitle">${H('cropHint')}</div>
  <div id="cropArea">
    <img id="cropImg">
    <div id="box"><div class="h" data-c="tl"></div><div class="h" data-c="tr"></div><div class="h" data-c="bl"></div><div class="h" data-c="br"></div></div>
  </div>
  <div id="cropBtns">
    <button id="cropCancel">${H('cancel')}</button>
    <button id="cropReset">${H('resetIt')}</button>
    <button class="ok" id="cropOk">${H('done')}</button>
  </div>
</div>
<div id="tip"></div>
<div id="spLayer"></div>
<div class="panel" id="spell"></div>
<button id="rwChip">${H('rwBtn')}</button>
<div class="panel" id="rw"><div id="rwIn"></div></div>
<div class="panel" id="recP"></div>
<div id="imged">
  <div id="ieTop">
  <div id="ieHead"><button id="ieCancel">${H('cancel')}</button><button class="ok" id="ieOk">${H('done')}</button></div>
  <div id="ieText"><input id="ieInput" type="text" placeholder="${H('imgTextPh')}" maxlength="120"><button id="ieTextOk">✓</button></div>
  <div id="ieHint">${H('imgTapText')}</div>
  </div>
  <div id="ieArea"><canvas id="ieCanvas"></canvas></div>
  <!-- Misma barra de las notas, para la foto -->
  <div class="dock" id="iebar">
   <div class="drow">
    <button class="db" data-ie="draw"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
    <button class="db" data-ie="text"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></button>
    <span class="dsep"></span>
    <button class="db" data-iecmd="b"><b>B</b></button>
    <button class="db" data-iecmd="i"><i style="font-family:Georgia,serif">I</i></button>
    <button class="db" data-iecmd="u"><u>U</u></button>
    <button class="db" data-ie="undo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
    <button class="db" data-ie="redo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
   </div>
   <div class="drow">
    <button class="db" data-ie="arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg></button>
    <button class="db" data-ie="circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="9" ry="7"/></svg></button>
    <button class="db" data-ie="box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1.5"/></svg></button>
    <span class="dsep"></span>
    <button class="db ietxt" data-ie="edit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span class="ielbl">${H('imgEditText')}</span></button>
    <button class="db ietxt" data-ie="del"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    <span class="dsep"></span>
    <button class="db" data-ie="size"><span style="font-size:13px;opacity:.7">Aa</span><span id="ieSizeNum">28</span><span class="caret">▼</span></button>
    <button class="db" data-ie="color"><span id="ieColorDot" style="background:#ff3b30"></span><span class="caret">▼</span></button>
   </div>
  </div>
</div>
<div id="gx"></div><div id="gy"></div><div id="mvinfo"></div>
<div id="anchorBar">
  <button id="anchorBtn"></button>
  <button id="anchorSame"></button>
</div>

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
  Array.prototype.forEach.call(ed.querySelectorAll('.audtx,.audpro'), function(x){ x.parentNode.removeChild(x); });   // transcripción a medias de antes
  // Fotos movidas con la versión anterior: pasarlas al sistema nuevo
  Array.prototype.forEach.call(ed.querySelectorAll('.imgwrap'), function(w){
    var t = parseFloat(w.style.top) || 0;
    if (t && !w.dataset.y) w.dataset.y = Math.round(t);
    // El espacio grande de antes se convierte en líneas vacías donde se puede escribir
    var y0 = +w.dataset.y || 0, LH = lineH();
    if (y0 < 0) w.dataset.y = 0;
    else if (y0 >= LH) { var k = Math.floor(y0 / LH); setSpacers(w, spacersAbove(w) + k); w.dataset.y = Math.round(y0 - k * LH); }
    if (w.style.top || w.dataset.y || w.dataset.rot) {
      var fix = function(){ applyVMargins(w); };
      fix();
      var im = w.querySelector('img');
      if (im && !im.complete) im.addEventListener('load', fix);
    }
  });
  if (editable) ensureLines();
  ttl.innerHTML = ${safeTitle};
  cur = ed;

  /* Fecha de modificación (se actualiza sola) */
  var LOC = ${JSON.stringify(locale || 'es')};
  function fmtDate(t){
    var d = new Date(t);
    try { return d.toLocaleString(LOC, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return d.toLocaleString(); }
  }
  /* Cuántas palabras tiene la nota (sirve también para chino, japonés, tailandés...) */
  function countWords(){
    var t = (document.getElementById('ed').innerText || '').replace(/\u200B/g, '').trim();
    if (!t) return 0;
    try {
      if (window.Intl && Intl.Segmenter) {
        var n = 0, it = new Intl.Segmenter(LOC, { granularity: 'word' }).segment(t)[Symbol.iterator](), x;
        while (!(x = it.next()).done) if (x.value.isWordLike) n++;
        return n;
      }
    } catch (e) {}
    return t.split(/\\s+/).length;
  }
  function modText(t){
    var w = countWords();
    return ${J('modified')}.replace('{d}', fmtDate(t)) + (w ? '  ·  ' + (w === 1 ? ${J('nWords1')} : ${J('nWords')}).replace('{n}', w) : '') +
      '  ·  ' + fmtBytes(noteSize());
  }
  /* 📦 Cuánto pesa la nota (texto, fotos, audios y videos) */
  function fmtBytes(b){
    b = +b || 0;
    var f = function(x, d){ try { return x.toLocaleString(LOC, { maximumFractionDigits: d }); } catch (e) { return x.toFixed(d); } };
    if (b < 1024 * 1024) return f(Math.max(1, Math.round(b / 1024)), 0) + ' KB';
    if (b < 1024 * 1024 * 1024) return f(b / 1048576, 1) + ' MB';
    return f(b / 1073741824, 2) + ' GB';
  }
  function noteSize(){
    var b = cleanHtml().length + ttl.innerHTML.length;
    Array.prototype.forEach.call(ed.querySelectorAll('.audwrap,.vidwrap'), function(w){
      var m = w.querySelector('audio,video');
      if (!m || !m.getAttribute('data-aid')) return;           // si está dentro de la nota, ya se contó arriba
      var sz = +w.getAttribute('data-size');
      b += sz || (+w.getAttribute('data-dur') || 0) * 4000;
    });
    return b;
  }
  // La fecha y el conteo de palabras se calculan un ratito después de abrir
  // (son lentos la primera vez y harían que la animación de abrir se trabe)
  $('meta').innerHTML = '&nbsp;';
  setTimeout(function(){ $('meta').textContent = modText(${Number(updated) || Date.now()}); }, 950);

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
  function cleanHtml(){ return ed.innerHTML.replace(/imgwrap sel/g, 'imgwrap').replace(/ src="blob:[^"]*"/g, ''); }
  function payload(){
    return { html: cleanHtml(), title: plainTitle(), titleHtml: plainTitle() ? ttl.innerHTML : '', ink: isDraw ? strokes : undefined };
  }
  function changedNow(){
    clearTimeout(sendTimer); dirty = false;
    vidHydrate();
    if (editable) ensureLines();                // línea para escribir debajo de cada foto
    record();                                   // guardar el paso para Deshacer
    var p = payload();
    send({ type: 'change', id: noteId, html: p.html, title: p.title, titleHtml: p.titleHtml, ink: p.ink });
    $('meta').textContent = modText(Date.now());
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
    document.documentElement.style.setProperty('--kb', Math.max(off, ${SB}) + 'px');
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
  /* Elemento de la primera letra seleccionada (para saber su color y tamaño reales) */
  function selLetterEl(r){
    if (!r) return null;
    var root = r.commonAncestorContainer;
    if (root.nodeType === 3) return root.parentElement;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t;
    while ((t = w.nextNode())) {
      if (!r.intersectsNode(t)) continue;
      var a = t === r.startContainer ? r.startOffset : 0, b = t === r.endContainer ? r.endOffset : t.length;
      if (t.data.slice(a, b).replace(/[\u200B\s]/g, '')) return t.parentElement;
    }
    var n = r.startContainer;
    return n.nodeType === 1 ? n : n.parentElement;
  }
  function updateState(){
    ['bold', 'italic', 'underline'].forEach(function(cmd){
      var b = dock.querySelector('[data-cmd=' + cmd + ']');
      try { b.classList.toggle('on', document.queryCommandState(cmd)); } catch (_) {}
    });
    var n = saved && saved.startContainer;
    var L = listOf(n), lk = !L ? '' : L.tagName === 'OL' ? 'ol' : L.classList.contains('checklist') ? 'check' : 'ul';
    dock.querySelectorAll('[data-list]').forEach(function(b){ b.classList.toggle('on', b.dataset.list === lk); });
    var el = saved && (saved.collapsed ? (n.nodeType === 1 ? n : n.parentElement) : selLetterEl(saved));
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
    if (ieOn()) { ieApplySize(v); markChip(v); return; }
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
    showTip(${J('sizeTip')}.replace('{n}', v));
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
  /* Botones − / + : un toque cambia 1; mantener presionado sigue cambiando */
  sizePanel.querySelectorAll('.szStep').forEach(function(b){
    var t1 = null, t2 = null, moved = false;
    function step(){
      var v = Math.max(+range.min, Math.min(+range.max, (+range.value || 17) + (+b.dataset.step)));
      if (v === +range.value) return;
      range.value = v; showSizePreview(v); moved = true;
    }
    function stop(){
      clearTimeout(t1); clearInterval(t2); t1 = t2 = null;
      b.classList.remove('press');
      if (moved) { moved = false; applySize(+range.value); }
    }
    b.addEventListener('pointerdown', function(e){
      e.preventDefault(); b.classList.add('press'); step();
      t1 = setTimeout(function(){ t2 = setInterval(step, 70); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){ b.addEventListener(ev, function(){ if (b.classList.contains('press')) stop(); }); });
  });
  $('chips').addEventListener('click', function(e){
    var ch = e.target.closest('.chip');
    if (!ch) return;
    var v = +ch.dataset.size;
    range.value = v; showSizePreview(v); applySize(v);
  });

  /* ---------- Cambiar color ---------- */
  var cmode = 'text', lastOutline = '#000000';
  function setCMode(m){
    cmode = m;
    colorPanel.classList.toggle('olmode', m === 'ol');
    colorPanel.querySelectorAll('.ctab').forEach(function(b){ b.classList.toggle('on', b.dataset.ctab === m); });
    colorPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.remove('on'); });
    knob.classList.add('glide'); setTimeout(function(){ knob.classList.remove('glide'); }, 600);
    syncWheel(m === 'ol' ? lastOutline : getComputedStyle(colorDot).backgroundColor);
  }
  $('ctabs').addEventListener('mousedown', function(e){ e.preventDefault(); });
  $('ctabs').addEventListener('click', function(e){
    var b = e.target.closest('.ctab');
    if (b) setCMode(b.dataset.ctab);
  });
  $('olNone').addEventListener('mousedown', function(e){ e.preventDefault(); });
  $('olNone').addEventListener('click', function(){ applyOutline(null); });
  function applyColor(col, quiet){
    addRecent(col, quiet);                 // con el brillo solo se cambia el último reciente
    if (ieOn()) { if (cmode === 'ol' && IE.mode === 'text') ieApplyOutline(col); else ieApplyColor(col); return; }
    if (!drawing && cmode === 'ol') {   // pestaña Contorno: color del borde de las letras
      lastOutline = col;
      applyOutline(col);
      return;
    }
    if (drawing) {                      // en modo dibujo: color del lápiz
      penColor = col;
      $('penDot').style.background = penColor;
      if (tool === 'eraser') setTool('pen');
      return;
    }
    restore();
    if (!collapsedSpan({ color: col })) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, col);
    }
    keepSelection();
    changedNow();
    colorDot.style.background = col;
    if (!quiet) showTip(${J('colorApplied')});
  }

  /* ---------- Rueda de colores ---------- */
  var wheel = $('wheel'), knob = $('wheelKnob'), shade = $('wheelShade');
  var bright = $('bright'), cprev = $('cprev'), chex = $('chex');
  var HSV = { h: 0, s: 0, v: 1 }, wheelDrawn = false;
  function hsvToHex(h, s, v){
    var f = function(n){ var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    var to = function(x){ var t = Math.round(x * 255).toString(16); return t.length < 2 ? '0' + t : t; };
    return '#' + to(f(5)) + to(f(3)) + to(f(1));
  }
  function cssToHsv(css){
    var m = String(css || '').match(/\\d+(\\.\\d+)?/g);
    var r, g, b;
    if (/^#([0-9a-f]{6})$/i.test(css)) { var n = parseInt(css.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    else if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2]; }
    else return null;
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: h, s: mx ? d / mx : 0, v: mx };
  }
  function drawWheel(){
    if (wheelDrawn) return;
    var ctx = wheel.getContext('2d'), N = wheel.width, R = N / 2;
    var img = ctx.createImageData(N, N), d = img.data;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var dx = x - R, dy = y - R, r = Math.sqrt(dx * dx + dy * dy), i = (y * N + x) * 4;
      if (r > R) { d[i + 3] = 0; continue; }
      var h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, s = r / R;
      var hex = hsvToHex(h, s, 1), n = parseInt(hex.slice(1), 16);
      d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255;
      d[i + 3] = r > R - 1.5 ? Math.round(255 * (R - r) / 1.5) : 255;   // borde suave
    }
    ctx.putImageData(img, 0, 0);
    wheelDrawn = true;
  }
  function showWheel(){
    var hex = hsvToHex(HSV.h, HSV.s, HSV.v);
    var a = HSV.h * Math.PI / 180, rr = HSV.s * 100;
    knob.style.left = (100 + Math.cos(a) * rr) + 'px';
    knob.style.top = (100 + Math.sin(a) * rr) + 'px';
    knob.style.background = hex;
    shade.style.opacity = String(1 - HSV.v);
    bright.value = Math.round(HSV.v * 100);
    cprev.style.background = hex;
    chex.textContent = hex.toUpperCase();
    return hex;
  }
  function syncWheel(css){
    drawWheel();
    var hsv = cssToHsv(css);
    if (hsv) HSV = hsv;
    showWheel();
  }
  var wdrag = false;
  function wheelPick(e){
    var r = wheel.getBoundingClientRect();
    var dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    var R = r.width / 2, dist = Math.min(Math.sqrt(dx * dx + dy * dy), R);
    HSV.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    HSV.s = dist / R;
    if (HSV.v < 0.15) HSV.v = 1;            // si estaba muy oscuro, vuelve a mostrar el color
    colorPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.remove('on'); });
    return showWheel();
  }
  $('cwrap').addEventListener('pointerdown', function(e){
    e.preventDefault();
    wdrag = true;
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    wheelPick(e);
  });
  $('cwrap').addEventListener('mousedown', function(e){ e.preventDefault(); });
  $('cwrap').addEventListener('pointermove', function(e){ if (wdrag) wheelPick(e); });
  function wheelEnd(e){
    if (!wdrag) return;
    wdrag = false;
    applyColor(wheelPick(e));
  }
  $('cwrap').addEventListener('pointerup', wheelEnd);
  $('cwrap').addEventListener('pointercancel', function(){ wdrag = false; });
  bright.addEventListener('input', function(){ HSV.v = bright.value / 100; showWheel(); });
  bright.addEventListener('change', function(){ applyColor(showWheel(), true); });
  /* Botones − / + del brillo (mantener presionado sigue cambiando) */
  colorPanel.querySelectorAll('[data-bstep]').forEach(function(b){
    var t1 = null, t2 = null, moved = false;
    function step(){
      var v = Math.max(0, Math.min(100, (+bright.value) + (+b.dataset.bstep)));
      if (v === +bright.value) return;
      HSV.v = v / 100; showWheel(); moved = true;
    }
    function stop(){
      clearTimeout(t1); clearInterval(t2); t1 = t2 = null;
      b.classList.remove('press');
      if (moved) { moved = false; applyColor(showWheel(), true); }
    }
    b.addEventListener('pointerdown', function(e){
      e.preventDefault(); b.classList.add('press'); step();
      t1 = setTimeout(function(){ t2 = setInterval(step, 70); }, 380);
    });
    b.addEventListener('mousedown', function(e){ e.preventDefault(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){ b.addEventListener(ev, function(){ if (b.classList.contains('press')) stop(); }); });
  });

  /* ---------- Colores recientes y favoritos ---------- */
  var CP = (function(){
    var d = ${safeColors};
    return { recent: Array.isArray(d.recent) ? d.recent.slice(0, 14) : [], fav: Array.isArray(d.fav) ? d.fav.slice(0, 40) : [] };
  })();
  var lastFx = null;
  function toHex(col){
    if (!col) return null;
    if (/^#[0-9a-f]{6}$/i.test(col)) return col.toUpperCase();
    var h = cssToHsv(col);
    return h ? hsvToHex(h.h, h.s, h.v).toUpperCase() : null;
  }
  function saveCP(){ send({ type: 'colorPrefs', prefs: CP }); }
  var recentT = null;
  var lastRecentAt = 0;
  function addRecent(col, tweak){
    var hx = toHex(col); if (!hx) return;
    var rest = CP.recent.filter(function(x){ return x !== hx; });
    if (tweak && Date.now() - lastRecentAt < 15000) rest = rest.slice(1);   // ajuste de brillo: reemplaza el último
    lastRecentAt = Date.now();
    CP.recent = [hx].concat(rest).slice(0, 14);
    clearTimeout(recentT);
    recentT = setTimeout(function(){ renderPal(); saveCP(); }, 250);   // espera un poquito por si estás arrastrando
  }
  function swHtml(col){ return '<button class="sw" data-color="' + col + '" style="background:' + col + '"></button>'; }
  function renderPal(popFav){
    ['c', 'fx'].forEach(function(pre){
      $(pre + 'Recent').innerHTML = CP.recent.map(swHtml).join('');
      $(pre + 'Fav').innerHTML = CP.fav.map(swHtml).join('');
      if (popFav) { var f = $(pre + 'Fav').querySelector('[data-color="' + popFav + '"]'); if (f) { f.classList.add('pop'); f.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
    });
  }
  function useColor(pre, col){
    if (pre === 'c') { syncWheel(col); applyColor(col); }
    else { lastFx = col; if (fxMode === 'hl') applyHighlight(col); else applyOutline(col); }
  }
  ['c', 'fx'].forEach(function(pre){
    var panel = pre === 'c' ? colorPanel : fxPanel;
    // tocar un color reciente
    $(pre + 'Recent').addEventListener('mousedown', function(e){ e.preventDefault(); });
    $(pre + 'Recent').addEventListener('click', function(e){
      var sw = e.target.closest('.sw'); if (!sw) return;
      panel.querySelectorAll('.sw').forEach(function(x){ x.classList.toggle('on', x === sw); });
      useColor(pre, sw.dataset.color);
    });
    // favoritos: tocar = usar, mantener presionado = quitar
    var fav = $(pre + 'Fav'), holdT = null, held = false, sx = 0, sy = 0;
    fav.addEventListener('mousedown', function(e){ e.preventDefault(); });
    fav.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    fav.addEventListener('pointerdown', function(e){
      var sw = e.target.closest('.sw'); if (!sw) return;
      held = false; sx = e.clientX; sy = e.clientY;
      sw.classList.add('hold');
      holdT = setTimeout(function(){
        held = true; sw.classList.remove('hold'); sw.classList.add('bye');
        var col = sw.dataset.color;
        setTimeout(function(){
          CP.fav = CP.fav.filter(function(x){ return x !== col; });
          renderPal(); saveCP();
        }, 200);
        showTip(${J('colFavRemoved')});
      }, 600);
    });
    function cancelHold(){ clearTimeout(holdT); fav.querySelectorAll('.hold').forEach(function(x){ x.classList.remove('hold'); }); }
    fav.addEventListener('pointermove', function(e){ if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancelHold(); });
    fav.addEventListener('pointerup', cancelHold);
    fav.addEventListener('pointercancel', cancelHold);
    fav.addEventListener('pointerleave', cancelHold);
    fav.addEventListener('click', function(e){
      var sw = e.target.closest('.sw'); if (!sw || held) { held = false; return; }
      panel.querySelectorAll('.sw').forEach(function(x){ x.classList.toggle('on', x === sw); });
      useColor(pre, sw.dataset.color);
    });
    // ＋ guarda el color actual
    var add = $(pre + 'FavAdd');
    add.addEventListener('mousedown', function(e){ e.preventDefault(); });
    add.addEventListener('click', function(){
      var col = pre === 'c' ? toHex(hsvToHex(HSV.h, HSV.s, HSV.v)) : toHex(lastFx || CP.recent[0]);
      if (!col) { showTip(${J('colFavHint')}); return; }
      CP.fav = [col].concat(CP.fav.filter(function(x){ return x !== col; })).slice(0, 40);
      renderPal(col); saveCP();
      showTip(${J('colFavSaved')});
    });
  });
  renderPal();

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
    if (col) addRecent(col);
    restore();
    var bg = col ? withAlpha(col, 0.45) : 'transparent';
    if (!collapsedSpan({ backgroundColor: bg })) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('hiliteColor', false, bg);
    }
    keepSelection(); changedNow();
    showTip(col ? ${J('hlOn')} : ${J('hlOff')});
  }
  function applyOutline(col){
    if (col) addRecent(col);
    if (ieOn()) { ieApplyOutline(col); return; }
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
    showTip(col ? ${J('olOn')} : ${J('olOff')});
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
    $('fxTitle').textContent = mode === 'hl' ? ${J('highlighter')} : ${J('outline')};
    $('fxNone').textContent = mode === 'hl' ? ${J('removeHl')} : ${J('removeOutline')};
    fxPanel.querySelectorAll('.sw').forEach(function(x){ x.classList.remove('on'); });
  }
  $('fxSws').addEventListener('click', function(e){
    var sw = e.target.closest('.sw');
    if (!sw) return;
    lastFx = sw.dataset.color;
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
    if (typeof rwPlaceChip === 'function') setTimeout(rwPlaceChip, 60);                 // vuelve a salir si sigue habiendo texto seleccionado
    var ib = document.getElementById('iebar');
    if (ib) ib.querySelectorAll('[data-ie=size],[data-ie=color]').forEach(function(b){ b.classList.remove('on'); });
    dock.querySelectorAll('[data-act=size],[data-act=color],[data-act=hl],[data-act=ol]').forEach(function(b){ b.classList.remove('on'); });
  }
  function togglePanel(p, btn){
    var open = !p.classList.contains('show');
    closePanels();
    if (!open) return;
    p.classList.add('show'); btn.classList.add('on');
    var rc = document.getElementById('rwChip'); if (rc) rc.classList.remove('show');   // ✨ Reescribir se esconde mientras hay un panel abierto
    if (p === sizePanel) {
      var v = ieOn() ? +$('ieSizeNum').textContent : (+sizeNum.textContent || 17);
      range.value = v; showSizePreview(v);
    }
    if (p === colorPanel) {
      if (ieOn()) { setCMode('text'); syncWheel(IE.sel ? IE.sel.c : IE.color); colorPanel.classList.toggle('noOl', IE.mode !== 'text'); return; }
      colorPanel.classList.remove('noOl');
      var picked = null;
      if (!drawing) {                                   // el color que ya tienen las letras seleccionadas
        var se = saved && selLetterEl(saved);
        if (se && owner(se)) {
          var cs = getComputedStyle(se);
          picked = cs.color; colorDot.style.background = picked;
          var olc = cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth) > 0 ? cs.webkitTextStrokeColor : null;
          if (olc) lastOutline = olc;
        }
      }
      knob.classList.add('glide'); setTimeout(function(){ knob.classList.remove('glide'); }, 600);
      syncWheel(drawing ? penColor : (picked || getComputedStyle(colorDot).backgroundColor));
      if (drawing) cmode = 'text';
      else setCMode('text');
      if (picked && saved && !saved.collapsed && toHex(picked) !== toHex(getComputedStyle(ed).color)) addRecent(picked);   // el color normal no cuenta   // queda en Recientes para usarlo en otras letras
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
    if (cur === ttl) { showTip(${J('listsNotTitle')}); return; }
    restore();
    var s = window.getSelection();
    var L = s.rangeCount ? listOf(s.anchorNode) : null;
    var isCheck = L && L.tagName === 'UL' && L.classList.contains('checklist');
    var curKind = !L ? null : L.tagName === 'OL' ? 'ol' : isCheck ? 'check' : 'ul';
    if (curKind === kind) {
      // tocar otra vez el mismo botón: quitar la lista
      document.execCommand(kind === 'ol' ? 'insertOrderedList' : 'insertUnorderedList', false, null);
      showTip(${J('listRemoved')});
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
      showTip(kind === 'ol' ? ${J('olList')} : kind === 'check' ? ${J('checklist')} : ${J('bullets')});
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
  /* ✅ Lo hecho baja a "Completados" (como Google Keep) y lo pendiente queda arriba, limpio.
     Cada casilla recuerda detrás de cuál estaba (data-prev); al desmarcarla vuelve a ese mismo lugar.
     Antes de marcar o desmarcar se pregunta, para que no haya errores. */
  var ckSeq = 0;
  function ckId(li){
    if (!li.dataset.ck || (li.parentElement && li.parentElement.querySelectorAll('li[data-ck="' + li.dataset.ck + '"]').length > 1))
      li.dataset.ck = Date.now().toString(36) + (ckSeq++).toString(36) + Math.random().toString(36).slice(2, 5);
    return li.dataset.ck;
  }
  function ckItems(ul){ return Array.prototype.filter.call(ul.children, function(x){ return x.tagName === 'LI'; }); }
  function ckRefresh(ul){
    var all = ckItems(ul), done = all.filter(function(x){ return x.classList.contains('done'); });
    all.forEach(function(x){ x.classList.remove('donefirst'); x.removeAttribute('data-head'); });
    if (!done.length) return;
    var undone = all.length - done.length;
    if (!undone && done.length) { /* todo hecho: igual se muestra el título */ }
    done[0].classList.add('donefirst');
    done[0].setAttribute('data-head', '✓ ' + ${J('ckDoneHead')}.split('{n}').join(String(done.length)));
  }
  function ckMoveDown(li){
    var ul = li.parentElement, all = ckItems(ul), i = all.indexOf(li), prev = null;
    for (var k = i - 1; k >= 0; k--) { if (!all[k].classList.contains('done')) { prev = all[k]; break; } }
    li.dataset.prev = prev ? ckId(prev) : '^';
    li.classList.add('done');
    ul.appendChild(li);                          // al final de "Completados"
    ckRefresh(ul);
  }
  function ckMoveBack(li){
    var ul = li.parentElement;
    li.classList.remove('done');
    var target = li.dataset.prev, guard = 0, anchor = null;
    while (target && target !== '^' && guard++ < 200) {
      var p = ul.querySelector('li[data-ck="' + target + '"]');
      if (!p || p === li) { target = null; break; }
      if (!p.classList.contains('done')) { anchor = p; break; }
      target = p.dataset.prev;                    // ese también está hecho: seguir buscando hacia atrás
    }
    var firstDone = ckItems(ul).filter(function(x){ return x !== li && x.classList.contains('done'); })[0] || null;
    if (anchor) ul.insertBefore(li, anchor.nextSibling);
    else if (target === '^' || li.dataset.prev === '^') ul.insertBefore(li, ul.firstChild);
    else ul.insertBefore(li, firstDone);           // no se encontró: al final de lo pendiente
    // si quedó debajo de algo hecho (no debería), subirlo antes de "Completados"
    var all = ckItems(ul), fd = all.filter(function(x){ return x.classList.contains('done'); })[0];
    if (fd && all.indexOf(li) > all.indexOf(fd)) ul.insertBefore(li, fd);
    delete li.dataset.prev;
    ckRefresh(ul);
  }
  // Al abrir la nota: lo que ya estaba marcado baja a "Completados", recordando su lugar
  function ckTidy(){
    Array.prototype.forEach.call(ed.querySelectorAll('ul.checklist'), function(ul){
      var all = ckItems(ul), seenDone = false, needs = false;
      all.forEach(function(x){ if (x.classList.contains('done')) seenDone = true; else if (seenDone) needs = true; });
      if (needs && editable) all.forEach(function(x){ if (x.classList.contains('done') && !x.dataset.prev) ckMoveDown(x); else if (x.classList.contains('done')) ul.appendChild(x); });
      ckRefresh(ul);
    });
  }
  ckTidy();
  // La ventanita de "¿Estás seguro?"
  var ckBox = document.createElement('div'); ckBox.id = 'ckAsk';
  ckBox.innerHTML = '<div class="box"><h3></h3><p></p><div class="it"></div><div class="row"><button class="no"></button><button class="yes"></button></div></div>';
  document.body.appendChild(ckBox);
  var ckPending = null, ckOpenedAt = 0, ckClosedAt = 0, ckDownOnBack = false;
  function ckAsk(li){
    var willDo = !li.classList.contains('done');
    ckPending = li;
    ckBox.querySelector('h3').textContent = willDo ? ${J('ckDoneQ')} : ${J('ckUndoQ')};
    ckBox.querySelector('p').textContent = willDo ? ${J('ckDoneMsg')} : ${J('ckUndoMsg')};
    ckBox.querySelector('.it').textContent = (li.textContent || '').replace(/​/g, '').trim() || '—';
    ckBox.querySelector('.no').textContent = ${J('cancel')};
    ckBox.querySelector('.yes').textContent = willDo ? ${J('ckDoneYes')} : ${J('ckUndoYes')};
    ckBox.classList.add('show');
    ckOpenedAt = Date.now();
  }
  ckBox.addEventListener('pointerdown', function(e){ e.stopPropagation(); ckDownOnBack = e.target === ckBox; }, true);
  ckBox.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if (Date.now() - ckOpenedAt < 350) return;          // un toque "fantasma" justo al abrir no cuenta
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b && !(e.target === ckBox && ckDownOnBack)) return;   // tocar afuera solo cierra si empezó afuera
    var li = ckPending; ckPending = null; ckBox.classList.remove('show'); ckClosedAt = Date.now();
    if (!b || !b.classList.contains('yes') || !li || !li.parentElement) return;
    var wasDone = li.classList.contains('done');
    if (wasDone) ckMoveBack(li); else ckMoveDown(li);
    showTip(wasDone ? '↩ ' + ${J('ckUndoTip')} : '✓ ' + ${J('ckDoneTip')});
    changedNow();
  });
  ed.addEventListener('pointerdown', function(e){
    if (!editable || drawing) return;
    var li = checkboxHit(e);
    if (!li) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!(li.textContent || '').replace(/​/g, '').trim()) { li.classList.toggle('done'); ckRefresh(li.parentElement); changedNow(); return; }  // casilla vacía: sin preguntar
    if (ckPending || ckBox.classList.contains('show') || Date.now() - ckClosedAt < 500) return;   // no abrir el aviso dos veces
    ckPending = li;
    // Guardar el teclado: el aviso sale cuando el teclado ya bajó (así no se cancela solo)
    var kbOpen = document.activeElement === ed || document.activeElement === ttl;
    [ed, ttl].forEach(function(x){ x.setAttribute('inputmode', 'none'); });
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (_) {}
    try { window.getSelection().removeAllRanges(); } catch (_) {}
    setTimeout(function(){ ckAsk(li); }, kbOpen ? 320 : 0);
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
      if (li && li.parentElement && li.parentElement.classList.contains('checklist')) {
        delete li.dataset.prev; li.classList.remove('donefirst'); li.removeAttribute('data-head');
        if (li.dataset.ck) li.dataset.ck = '';
        var ul = li.parentElement, its = ckItems(ul), fd = its.filter(function(x){ return x.classList.contains('done'); })[0];
        if (!li.classList.contains('done') && fd && its.indexOf(li) > its.indexOf(fd)) {
          ul.insertBefore(li, fd);
          var r = document.createRange(); r.selectNodeContents(li); r.collapse(true); s.removeAllRanges(); s.addRange(r);
        }
        ckRefresh(ul);
      }
    }, 0);
  });
  ed.addEventListener('click', function(e){ if (checkboxHit(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  var names = { bold: ${J('bold')}, italic: ${J('italic')}, underline: ${J('underline')} };
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
  /* 📅📍 Sello de fecha, hora y sitio (el título de la nota) en la esquina de la foto.
     Es un dibujo encima de la foto: crece con ella, sale en el PDF / imagen / página, y se quita con el botón "Sello". */
  function stampOn(){ try { return localStorage.getItem('misnotas_stamp') !== '0'; } catch (_) { return true; } }
  function stampSvg(taken){
    var d = new Date(+taken || Date.now()), when;
    try { when = d.toLocaleString(LOC, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (_) { when = d.toLocaleString(); }
    var site = plainTitle();
    var txt = '📅 ' + when + (site ? '  ·  📍 ' + site : '');
    var x = function(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var gid = 'sg' + Math.random().toString(36).slice(2, 7);
    return '<svg class="stamp" viewBox="0 0 1000 110" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="1000" height="110" fill="url(#' + gid + ')"/>' +
      '<text x="975" y="82" text-anchor="end" font-family="-apple-system,Roboto,Segoe UI,sans-serif" font-size="38" font-weight="700" fill="#fff" ' +
      'stroke="#000" stroke-width="1.2" paint-order="stroke"' + (txt.length > 52 ? ' textLength="950" lengthAdjust="spacingAndGlyphs"' : '') + '>' + x(txt) + '</text></svg>';
  }
  function insertImage(src, taken){
    taken = +taken || Date.now();
    var html = '<div class="imgwrap" contenteditable="false" data-scale="100" data-taken="' + taken + '" style="width:' + (100 * BASE) +
               '%"><img src="' + src + '">' + (stampOn() ? stampSvg(taken) : '') + '</div><div><br></div>';
    quietFocus();
    if (saved && ed.contains(saved.startContainer)) {
      var s = window.getSelection();
      s.removeAllRanges(); s.addRange(saved);
      document.execCommand('insertHTML', false, html);
    } else {
      ed.insertAdjacentHTML('beforeend', html);
    }
    changedNow();
    showTip(${J('photoAdded')});
  }
  fileInput.addEventListener('change', function(){
    var f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    if (/^video[/]/.test(f.type || '') || /[.](mp4|mov|m4v|3gp|webm|mkv)$/i.test(f.name || '')) { insertVideo(f); return; }
    showTip(${J('addingPhoto')});
    var r = new FileReader(), taken = f.lastModified || Date.now();
    r.onload = function(){
      var im = new Image();
      im.onload = function(){ insertImage(shrink(im, 1280, 0.8), taken); };
      im.onerror = function(){ showTip(${J('photoOpenFail')}); };
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
    if (w.dataset.x != null) setPos(w, +w.dataset.x, +w.dataset.y || 0);   // que no se salga al crecer
    if (w.dataset.rot) fitRotSpace(w);
    pctLabel.textContent = sc + '%';
    pctEl.textContent = sc + '%';
  }
  /* Giro de la foto en grados (-180 a 180) */
  function getRot(w){ var d = Math.round(+w.dataset.rot || 0); return d === 360 ? 360 : ((d % 360) + 360) % 360; }
  function setRot(w, deg){
    deg = Math.round(deg);
    deg = deg === 360 ? 360 : ((deg % 360) + 360) % 360;   // de 0° a 360° (vuelta completa)
    w.dataset.rot = deg;
    w.style.transform = deg ? 'rotate(' + deg + 'deg)' : '';
    if (w === selImg) syncRot();
    fitRotSpace(w);
    return deg;
  }
  /* Al girar, deja espacio arriba y abajo para que no tape lo demás */
  function fitRotSpace(w){ applyVMargins(w); }
  /* Espacio de arriba y abajo de la foto:
     - Subir/bajar la foto la mueve DE VERDAD (no solo se ve movida), así la
       línea de abajo siempre queda pegada debajo de la foto para escribir.
     - Si está girada, deja el espacio que ocupa al girar. */
  function applyVMargins(w){
    var y = +w.dataset.y || 0, deg = getRot(w), extra = 0, W = w.offsetWidth, H = w.offsetHeight;
    if (deg && H) {
      var a = deg * Math.PI / 180, h2 = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
      extra = Math.max(0, (h2 - H) / 2);
    }
    w.style.top = '';
    if (!y && !extra) { w.style.marginTop = w.style.marginBottom = ''; return; }
    w.style.marginTop = Math.round(10 + extra + y) + 'px';
    w.style.marginBottom = Math.round(10 + extra) + 'px';
  }
  /* ---------- Líneas vacías de verdad encima de la foto ----------
     Al bajar una foto se crean líneas vacías arriba (puedes escribir en ellas);
     al subirla se quitan. Solo queda un pequeño espacio menor a una línea. */
  function isEmptyLine(el){
    return !!el && el.nodeType === 1 && !el.classList.contains('imgwrap') && !/^(UL|OL|LI)$/.test(el.tagName) &&
           !el.querySelector('img') && !el.textContent.replace(/[\s\u200B]/g, '');
  }
  function lineH(){ return parseFloat(getComputedStyle(ed).lineHeight) || 25; }
  function spacersAbove(w){ var n = 0, p = w.previousElementSibling; while (isEmptyLine(p)) { n++; p = p.previousElementSibling; } return n; }
  function setSpacers(w, k){
    var cur = spacersAbove(w);
    while (cur < k) { var d = document.createElement('div'); d.appendChild(document.createElement('br')); w.parentNode.insertBefore(d, w); cur++; }
    while (cur > k) { w.parentNode.removeChild(w.previousElementSibling); cur--; }
  }
  /* Pone la foto a "gap" px por debajo de lo que tiene arriba: líneas enteras + un resto pequeño */
  function setGapAbove(w, gap){
    var LH = lineH(); gap = Math.max(0, gap);
    var k = Math.floor(gap / LH), rem = Math.round(gap - k * LH);
    setSpacers(w, k);
    return rem;
  }

  /* Siempre debe haber una línea para escribir justo debajo de cada foto */
  function ensureLines(){
    var ws = ed.querySelectorAll('.imgwrap');
    for (var i = 0; i < ws.length; i++) {
      var n = ws[i].nextSibling;
      while (n && n.nodeType === 3 && !n.textContent.replace(/[\s\u200B]/g, '')) n = n.nextSibling;
      if (!n || (n.nodeType === 1 && n.classList.contains('imgwrap'))) {
        var line = document.createElement('div');
        line.appendChild(document.createElement('br'));
        ws[i].parentNode.insertBefore(line, n || null);
      }
    }
  }
  function placeRsz(){
    placeAnchorBar();
    if (!selImg) { rsz.style.display = 'none'; return; }
    // La línea gira junto con la foto
    var r = selImg.getBoundingClientRect(), w = selImg.offsetWidth, h = selImg.offsetHeight;
    var cx = r.left + r.width / 2 + window.scrollX, cy = r.top + r.height / 2 + window.scrollY;
    rsz.style.display = 'block';
    rsz.style.width = w + 'px';
    rsz.style.height = h + 'px';
    rsz.style.left = (cx - w / 2) + 'px';
    rsz.style.top = (cy - h / 2) + 'px';
    rsz.style.transform = getRot(selImg) ? 'rotate(' + getRot(selImg) + 'deg)' : '';
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
      syncRot();
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
      changedNow(); showTip(${J('photoRemoved')});
      return;
    }
    if (a === 'crop') { openCrop(selImg.querySelector('img')); return; }
    if (a === 'edit') { openImgEdit(selImg.querySelector('img'), 'view'); return; }
    if (a === 'stamp') {
      var st = selImg.querySelector('svg.stamp');
      if (st) { st.parentNode.removeChild(st); try { localStorage.setItem('misnotas_stamp', '0'); } catch (_) {} showTip(${J('stampOff')}); }
      else { selImg.insertAdjacentHTML('beforeend', stampSvg(selImg.dataset.taken)); try { localStorage.setItem('misnotas_stamp', '1'); } catch (_) {} showTip(${J('stampOnTip')}); }
      changedNow(); return;
    }
    if (a === 'reset') { setScale(selImg, 100); setRot(selImg, 0); placeRsz(); changedNow(); showTip(${J('sizeNormal')}); }

  });

  /* =========================================================
     MOVER FOTOS (horizontal y vertical) Y ANCLARLAS
     - Toca la foto para elegirla y luego arrástrala.
     - Al moverla salen dos líneas rojas y cuánto se movió.
     - "Anclar" la deja fija. "Anclar igual" pone la foto en la
       misma posición que la última foto anclada.
     ========================================================= */
  var gx = $('gx'), gy = $('gy'), mvinfo = $('mvinfo');
  var anchorBar = $('anchorBar'), anchorBtn = $('anchorBtn'), anchorSame = $('anchorSame');
  var PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76z"/><path d="M8 2h8"/></svg>';
  function widthPct(w){ return getScale(w) * BASE; }
  function posX(w){ return w.dataset.x != null ? +w.dataset.x : (100 - widthPct(w)) / 2; }   // borde izquierdo en %
  function posY(w){ return +w.dataset.y || 0; }
  function setPos(w, x, y){
    var wp = widthPct(w);
    x = Math.max(0, Math.min(100 - wp, x));
    // Puede subir solo hasta tocar lo que está arriba (no tapa el texto)
    var minY = 0;
    y = Math.round(Math.max(minY, y));
    w.dataset.x = x.toFixed(1);
    w.dataset.y = y;
    // Texto al lado: si la foto está hacia la izquierda, se escribe a su derecha;
    // si está hacia la derecha, se escribe a su izquierda. En el centro va sola.
    var cx = x + wp / 2, side = wp <= 75 ? (cx < 47 ? 'l' : cx > 53 ? 'r' : '') : '';
    w.dataset.wrap = side;
    if (side === 'l') {
      w.style.float = 'left'; w.style.marginLeft = x + '%'; w.style.marginRight = '14px';
    } else if (side === 'r') {
      w.style.float = 'right'; w.style.marginRight = (100 - wp - x) + '%'; w.style.marginLeft = '14px';
    } else {
      w.style.float = ''; w.style.marginLeft = x + '%'; w.style.marginRight = '0';
    }
    applyVMargins(w);
  }
  function anchoredOthers(w){
    return Array.prototype.filter.call(ed.querySelectorAll('.imgwrap[data-anchor]'), function(a){ return a !== w; });
  }
  /* La foto anclada más cercana antes de esta (o la última anclada) */
  function refAnchor(w){
    var list = anchoredOthers(w), before = null;
    list.forEach(function(a){ if (a.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING) before = a; });
    return before || list[list.length - 1] || null;
  }
  function placeAnchorBar(){
    if (!selImg || mdrag) { anchorBar.classList.remove('show'); return; }
    var on = !!selImg.dataset.anchor;
    anchorBtn.innerHTML = PIN + (on ? ${J('unanchor')} : ${J('anchor')});
    anchorBtn.classList.toggle('on', on);
    var ref = !on && refAnchor(selImg);
    anchorSame.style.display = ref ? 'flex' : 'none';
    anchorSame.innerHTML = PIN + ${J('anchorSame')};
    var r = selImg.getBoundingClientRect();
    anchorBar.classList.add('show');
    var below = r.bottom + 22 + 44 < window.innerHeight - 90;
    anchorBar.style.left = (r.left + r.width / 2 + window.scrollX) + 'px';
    anchorBar.style.top = (below ? r.bottom + 22 : r.top - 60) + window.scrollY + 'px';
  }
  anchorBtn.addEventListener('click', function(e){
    e.stopPropagation();
    if (!selImg) return;
    if (selImg.dataset.anchor) { delete selImg.dataset.anchor; showTip(${J('unanchored')}); }
    else { setPos(selImg, posX(selImg), posY(selImg)); selImg.dataset.anchor = '1'; showTip(${J('anchored')}); }
    changedNow(); placeRsz();
  });
  anchorSame.addEventListener('click', function(e){
    e.stopPropagation();
    var ref = selImg && refAnchor(selImg);
    if (!ref) return;
    setPos(selImg, posX(ref), posY(ref));
    setRot(selImg, getRot(ref));                       // también el mismo giro (grados)
    selImg.dataset.anchor = '1';
    changedNow(); placeRsz();
    showTip(${J('anchoredSame')});
  });
  ['pointerdown', 'click'].forEach(function(ev){ anchorBar.addEventListener(ev, function(e){ e.stopPropagation(); }); });

  function showGuides(w, snapX, snapY){
    var r = w.getBoundingClientRect();
    gy.style.left = Math.round(r.left + r.width / 2) + 'px';
    gx.style.top = Math.round(r.top + r.height / 2) + 'px';
    gx.style.display = gy.style.display = 'block';
    gy.classList.toggle('snap', !!snapX); gx.classList.toggle('snap', !!snapY);
  }
  function hideGuides(){ gx.style.display = gy.style.display = 'none'; }
  function fmtMove(v, unit){ return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + unit; }

  /* ---------- Barrita para girar la foto (como la del volumen) ---------- */
  var rotRange = $('rotRange'), rotLbl = $('rotLbl');
  function syncRot(){
    if (!selImg) return;
    var d = getRot(selImg); rotRange.value = d; rotLbl.textContent = '↻ ' + d + '°';
    var row = $('rotPresets'), on = null;
    Array.prototype.forEach.call(row.children, function(b){ var y = +b.dataset.deg === d; b.classList.toggle('on', y); if (y) on = b; });
    // Que se vea el botón del ángulo actual (o el más cercano)
    var near = on || row.children[Math.round(d / 15)];
    if (near) row.scrollLeft = near.offsetLeft - row.clientWidth / 2 + near.offsetWidth / 2;
  }
  /* Botones de grados: de 15° en 15° hasta la vuelta completa (360°). Se deslizan de lado. */
  (function(){
    var h = '';
    for (var g = 0; g <= 360; g += 15) h += '<button data-deg="' + g + '">' + g + '°</button>';
    $('rotPresets').innerHTML = h;
  })();
  function rotTo(d, snap){
    if (!selImg) return;
    d = setRot(selImg, d);
    placeRsz(); showGuides(selImg, snap, snap);
    showMv('↻ <b>' + d + '°</b>', true);
  }
  function rotDone(){ hideGuides(); hideMv(); changedNow(); }
  /* Botones de grados: la foto va directo a ese ángulo */
  $('rotPresets').addEventListener('click', function(e){
    var b = e.target.closest('[data-deg]'); if (!b || !selImg) return;
    rotTo(+b.dataset.deg, true); rotDone();
  });
  /* − y +: un grado cada toque (déjalo presionado para que siga) */
  function nextDeg(step){
    var d = getRot(selImg) + step;
    if (d === 361) return 1;          // después de 360° sigue 1°
    if (d === -1) return 359;
    if (d === 0 && step < 0) return 0;
    return d;
  }
  function holdBtn(btn, step){
    var t1 = null, t2 = null;
    function stop(){ clearTimeout(t1); clearInterval(t2); if (t1 !== null) { t1 = null; rotDone(); } }
    btn.addEventListener('pointerdown', function(e){
      e.preventDefault();
      if (!selImg) return;
      rotTo(nextDeg(step), false);
      t1 = setTimeout(function(){ t2 = setInterval(function(){ rotTo(nextDeg(step), false); }, 70); }, 400);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){ btn.addEventListener(ev, stop); });
  }
  holdBtn($('rotMinus'), -1);
  holdBtn($('rotPlus'), 1);
  rotRange.addEventListener('input', function(){
    if (!selImg) return;
    var d = +rotRange.value, near = Math.round(d / 45) * 45, snap = Math.abs(d - near) < 3;
    if (snap) d = near;                                    // se pega en 0°, 90°, 180°, 270°
    rotTo(d, snap);
  });
  rotRange.addEventListener('change', rotDone);

  var mvTimer = null;
  function showMv(html, stay){
    clearTimeout(mvTimer);
    mvinfo.innerHTML = html; mvinfo.style.display = 'block';
    if (!stay) mvTimer = setTimeout(function(){ mvinfo.style.display = 'none'; }, 1200);
  }
  function hideMv(){ clearTimeout(mvTimer); mvTimer = setTimeout(function(){ mvinfo.style.display = 'none'; }, 700); }

  /* ---------- Dos dedos sobre la foto: pellizcar = tamaño, girar = giro ---------- */
  var touchPts = {}, gest = null;
  function ptsList(){ return Object.keys(touchPts).map(function(k){ return touchPts[k]; }); }
  window.addEventListener('pointerdown', function(e){
    if (e.pointerType === 'mouse') return;
    touchPts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var p = ptsList();
    if (p.length === 2 && selImg && editable && (mdrag || selImg.contains(e.target) || selImg.contains(document.elementFromPoint(p[0].x, p[0].y)))) {
      if (mdrag) { mdrag = null; hideGuides(); }
      gest = { d0: Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1,
               a0: Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x), sc0: getScale(selImg), rot0: getRot(selImg) };
      anchorBar.classList.remove('show'); rsz.style.display = 'none';
      e.preventDefault();
    }
  }, true);
  window.addEventListener('pointermove', function(e){
    if (!touchPts[e.pointerId]) return;
    touchPts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!gest || !selImg) return;
    var p = ptsList(); if (p.length < 2) return;
    e.preventDefault();
    var d = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y), a = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    var sc = gest.sc0 * d / gest.d0;
    if (Math.abs(sc - 100) < 4) sc = 100;
    setScale(selImg, sc);
    var deg = gest.rot0 + (a - gest.a0) * 180 / Math.PI, snap = false;
    var near = Math.round(deg / 90) * 90;
    if (Math.abs(deg - near) < 5) { deg = near; snap = true; }        // se pega en 0°, 90°, 180°...
    deg = setRot(selImg, deg);
    showGuides(selImg, snap, snap);
    showMv('↻ <b>' + deg + '°</b> &nbsp; <b>' + getScale(selImg) + '%</b>', true);
  }, { passive: false });
  function endPt(e){
    delete touchPts[e.pointerId];
    if (gest && ptsList().length < 2) { gest = null; hideGuides(); hideMv(); placeRsz(); changedNow(); }
  }
  window.addEventListener('pointerup', endPt);
  window.addEventListener('pointercancel', endPt);
  // Que la página no se mueva mientras mueves o giras una foto
  document.addEventListener('touchmove', function(e){ if (gest || (mdrag && mdrag.moved)) e.preventDefault(); }, { passive: false });

  var mdrag = null;
  ed.addEventListener('pointerdown', function(e){
    var w = e.target.closest ? e.target.closest('.imgwrap') : null;
    if (gest || !w || w !== selImg || !editable || document.body.classList.contains('drawing')) return;
    if (w.dataset.anchor) { showTip(${J('isAnchored')}); return; }
    e.preventDefault();
    mdrag = { w: w, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: posX(w), y: posY(w),
              x0: w.dataset.ox != null ? +w.dataset.ox : posX(w), y0: w.dataset.oy != null ? +w.dataset.oy : 0,
              cw: contentWidth(), moved: false, gap0: spacersAbove(w) * lineH() + posY(w) };
    if (w.dataset.ox == null) { w.dataset.ox = mdrag.x.toFixed(1); w.dataset.oy = 0; }   // dónde estaba al principio
    try { w.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener('pointermove', function(e){
    if (!mdrag || e.pointerId !== mdrag.id || gest) return;
    var dx = e.clientX - mdrag.sx, dy = e.clientY - mdrag.sy;
    if (!mdrag.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    if (!mdrag.moved) { mdrag.moved = true; anchorBar.classList.remove('show'); rsz.style.display = 'none'; }
    e.preventDefault();
    var w = mdrag.w, wp = widthPct(w), px = mdrag.cw / 100;
    var nx = mdrag.x + dx / px, gap = Math.max(0, mdrag.gap0 + dy), snapX = false, snapY = false;
    // Imán: al centro de la hoja y a la posición de las fotos ancladas
    if (Math.abs(nx + wp / 2 - 50) * px < 8) { nx = 50 - wp / 2; snapX = true; }
    anchoredOthers(w).forEach(function(a){
      if (!snapX && Math.abs(nx - posX(a)) * px < 8) { nx = posX(a); snapX = true; }
    });
    // Imán vertical: justo en una línea (sin resto)
    var LH = lineH(), restLine = gap % LH;
    if (restLine < 6) { gap -= restLine; snapY = true; } else if (LH - restLine < 6) { gap += LH - restLine; snapY = true; }
    var rem = setGapAbove(w, gap);
    setPos(w, nx, rem);
    showGuides(w, snapX, snapY);
    var hx = Math.round((posX(w) - mdrag.x0) * px), vy = Math.round(gap - mdrag.gap0);
    showMv('↔ <b>' + fmtMove(hx, ' px') + '</b> &nbsp; ↕ <b>' + fmtMove(vy, ' px') + '</b>' +
           (getRot(w) ? ' &nbsp; ↻ <b>' + getRot(w) + '°</b>' : ''), true);
  }, { passive: false });
  function endMove(e){
    if (!mdrag || (e && e.pointerId !== mdrag.id)) return;
    var moved = mdrag.moved;
    mdrag = null;
    hideGuides();
    hideMv();
    placeRsz();
    if (moved) { changedNow(); showTip(${J('moveDone')}); }
  }
  window.addEventListener('pointerup', endMove);
  window.addEventListener('pointercancel', endMove);
  window.addEventListener('scroll', function(){ if (selImg && !mdrag) placeAnchorBar(); }, { passive: true });

  var rdrag = null;
  rsz.addEventListener('pointerdown', function(e){
    var h = e.target.dataset ? e.target.dataset.r : null;
    if (!h || !selImg) return;
    e.preventDefault(); e.stopPropagation();
    rdrag = { sign: h.indexOf('r') > -1 ? 1 : -1, sx: e.clientX,
              sw: selImg.getBoundingClientRect().width, base: contentWidth() * BASE };
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    showMv('<b>' + getScale(selImg) + '%</b>', true);
  });
  rsz.addEventListener('pointermove', function(e){
    if (!rdrag || !selImg) return;
    var w = rdrag.sw + rdrag.sign * (e.clientX - rdrag.sx) * 2;   // la foto crece hacia los dos lados
    var sc = w / rdrag.base * 100;
    if (Math.abs(sc - 100) < 4) sc = 100;
    setScale(selImg, sc);
    placeRsz();
    showMv('<b>' + getScale(selImg) + '%</b>', true);
  });
  function endResize(){
    if (!rdrag) return;
    rdrag = null; hideMv(); changedNow();
  }
  rsz.addEventListener('pointerup', endResize);
  rsz.addEventListener('pointercancel', endResize);
  window.addEventListener('resize', function(){ placeRsz(); placeKb(); if (isDraw) sizeInk(); });

  /* =========================================================
     DIBUJO: escribe y dibuja encima (lápiz, resaltador, borrador)
     Los trazos se guardan como líneas (no como foto), así se ven
     nítidos en cualquier pantalla.
     ========================================================= */
  var isDraw = true;                    // todas las notas permiten dibujar
  var strokes = ${safeInk};
  var ink = $('ink'), live = $('live');
  var ictx = ink.getContext('2d'), lctx = live.getContext('2d');
  var drawing = false, tool = 'pen', penColor = ${JSON.stringify(c.text)}, penSize = 1;
  var PEN = [2, 4, 8];
  var drawdock = $('drawdock');

  document.body.classList.add('isdraw');
  if (strokes.length) ed.style.minHeight = '140vh';

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
    if (on && !ed.style.minHeight) ed.style.minHeight = '140vh';   // espacio para dibujar
    drawing = on;
    document.body.classList.toggle('drawing', on);
    setTimeout(placeDock, 0);
    closePanels(); selectImg(null);
    if (on) {
      ed.setAttribute('inputmode', 'none'); ttl.setAttribute('inputmode', 'none');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.getSelection().removeAllRanges();
      sizeInk(); inkBtns();
      showTip(${J('drawMode')});
    } else {
      showTip(${J('textMode')});
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
  var inkRedo = [], inkCleared = null;                       // rehacer trazos / recuperar "borrar todo"
  function inkBtns(){
    var u = drawdock.querySelector('[data-d=undo]'), r = drawdock.querySelector('[data-d=redo]');
    if (u) u.classList.toggle('dim', !strokes.length && !inkCleared);
    if (r) r.classList.toggle('dim', !inkRedo.length);
  }
  drawdock.addEventListener('mousedown', function(e){ if (e.target.closest('button')) e.preventDefault(); });
  drawdock.addEventListener('click', function(e){
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool); closePanels(); return; }
    var d = b.dataset.d;
    if (d === 'text' || d === 'back' || d === 'done') { setDrawMode(false); return; }
    if (d === 'color') { togglePanel(colorPanel, b); return; }
    if (d === 'size') {
      penSize = (penSize + 1) % 3; showPenSize();
      showTip([${J('penFine')}, ${J('penMedium')}, ${J('penThick')}][penSize]);
      return;
    }
    if (d === 'undo') {
      if (!strokes.length && inkCleared) {                 // deshacer "borrar todo"
        strokes = inkCleared; inkCleared = null; inkRedo = [];
        redraw(); changedNow(); inkBtns(); return;
      }
      if (!strokes.length) return;
      inkRedo.push(strokes.pop()); redraw(); changedNow(); inkBtns(); showTip(${J('strokeErased')});
      return;
    }
    if (d === 'redo') {
      if (!inkRedo.length) return;
      strokes.push(inkRedo.pop()); redraw(); changedNow(); inkBtns();
      return;
    }
    if (d === 'clear') {
      if (!strokes.length) return;
      if (!clearArmed) {
        clearArmed = true; showTip(${J('tapAgainClear')});
        clearTimeout(clearTimer); clearTimer = setTimeout(function(){ clearArmed = false; }, 2500);
        return;
      }
      clearArmed = false; inkCleared = strokes; inkRedo = []; strokes = []; redraw(); changedNow(); inkBtns(); showTip(${J('drawingCleared')});
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
    strokes.push(stroke); inkRedo = []; inkCleared = null; inkBtns();
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
  if (editable && !strokes.length && !plainTitle() && !ed.textContent.trim() && !ed.querySelector('img')) {
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
    window.closeCrop(); changedNow(); showTip(${J('photoCropped')});
  };

  /* =========================================================
     ESCRIBIR Y DIBUJAR ENCIMA DE UNA FOTO
     - Dibujar: con el dedo, del color y grosor que elijas.
     - Texto: toca la foto donde quieras el texto, escríbelo y
       luego puedes arrastrarlo. Tocar un texto lo deja editarlo.
     Al tocar Listo, todo queda pegado dentro de la foto.
     ========================================================= */
  var imged = $('imged'), ieCv = $('ieCanvas'), ieCtx = ieCv.getContext('2d'), ieArea = $('ieArea'), iebar = $('iebar');
  var ieInput = $('ieInput'), ieTextBar = $('ieText'), ieHint = $('ieHint');
  var IE = { target: null, base: null, ops: [], redo: [], mode: 'draw', color: '#ff3b30', ol: null, size: 28, pen: 6,
             b: true, i: false, u: false, cur: null, drag: null, sel: null, edit: null, pend: null };
  function ieOn(){ return imged.classList.contains('show'); }
  var IE_SHAPES = { arrow: 1, circle: 1, box: 1 };          // ➚ flecha, ◯ círculo, ▭ recuadro
  function iePen(){ return IE.mode === 'draw' || !!IE_SHAPES[IE.mode]; }
  function ieShape(ctx, op){
    var a = op.a, b = op.b;
    ctx.strokeStyle = op.c; ctx.lineWidth = op.w; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (op.g === 'box') ctx.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    else if (op.g === 'circle') ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(1, Math.abs(b[0] - a[0]) / 2), Math.max(1, Math.abs(b[1] - a[1]) / 2), 0, 0, Math.PI * 2);
    else {
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var hl = Math.min(len * 0.45, Math.max(op.w * 3.5, 14));
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.moveTo(b[0] - hl * Math.cos(ang - 0.5), b[1] - hl * Math.sin(ang - 0.5)); ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0] - hl * Math.cos(ang + 0.5), b[1] - hl * Math.sin(ang + 0.5));
    }
    ctx.stroke();
  }
  function ieK(){ var r = ieCv.getBoundingClientRect(); return r.width ? ieCv.width / r.width : 1; }   // px de la foto por px de pantalla
  function ieSyncBar(){
    iebar.querySelectorAll('[data-ie=draw],[data-ie=text],[data-ie=arrow],[data-ie=circle],[data-ie=box]').forEach(function(b){ b.classList.toggle('on', b.dataset.ie === IE.mode); });
    var t = IE.sel;
    iebar.querySelectorAll('.ietxt').forEach(function(b){ b.classList.toggle('off', !t); });
    var st = t || IE;
    iebar.querySelectorAll('[data-iecmd]').forEach(function(b){ b.classList.toggle('on', IE.mode === 'text' && !!st[b.dataset.iecmd]); });
    $('ieSizeNum').textContent = iePen() ? IE.pen : (t ? t.n : IE.size);
    $('ieColorDot').style.background = t ? t.c : IE.color;
    var ub = iebar.querySelector('[data-ie=undo]'), rb = iebar.querySelector('[data-ie=redo]');
    if (ub) ub.style.opacity = IE.ops.length ? '' : '.35';
    if (rb) rb.style.opacity = IE.redo && IE.redo.length ? '' : '.35';
  }
  function ieSetMode(m){
    IE.mode = m;
    if (m !== 'text') { ieCloseText(true); IE.sel = null; }
    ieHint.textContent = m === 'view' ? ${J('imgZoomHint')} : ${J('imgTapText')};
    ieHint.classList.toggle('show', m === 'text' || m === 'view');
    closePanels(); ieSyncBar(); if (IE.base) ieRedraw();
    if (ieOn()) { ieMeasureTop(); ieFit(); }
  }
  function ieFit(){
    if (!IE.base) return;
    var cs = getComputedStyle(ieArea);
    var W = ieArea.clientWidth - 24, H = ieArea.clientHeight - parseFloat(cs.paddingBottom) - parseFloat(cs.paddingTop) - 24;
    var k = Math.min(W / ieCv.width, H / ieCv.height);
    ieCv.style.width = Math.round(ieCv.width * k) + 'px';
    ieCv.style.height = Math.round(ieCv.height * k) + 'px';
  }
  function ieFont(op){ return (op.i ? 'italic ' : '') + (op.b ? '800 ' : '500 ') + Math.round(op.s) + 'px -apple-system,Roboto,sans-serif'; }
  function ieTextBox(op){
    ieCtx.font = ieFont(op);
    var w = ieCtx.measureText(op.v).width;
    return { x: op.x - w / 2, y: op.y - op.s / 2, w: w, h: op.s };
  }
  function ieDrawText(op){
    var ctx = ieCtx;
    ctx.font = ieFont(op); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    var border = op.ol || ((op.c === '#000000' || /^#0{3,6}$/.test(op.c)) ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.75)');
    if (op.ol !== 'none') { ctx.lineWidth = Math.max(2, op.s / 7); ctx.strokeStyle = border; ctx.strokeText(op.v, op.x, op.y); }
    ctx.fillStyle = op.c; ctx.fillText(op.v, op.x, op.y);
    if (op.u) {
      var b = ieTextBox(op), y = op.y + op.s * 0.45, lw = Math.max(2, op.s / 14);
      ctx.fillStyle = op.c; ctx.fillRect(b.x, y, b.w, lw);
    }
  }
  function ieRedraw(){
    var ctx = ieCtx;
    ctx.clearRect(0, 0, ieCv.width, ieCv.height);
    ctx.drawImage(IE.base, 0, 0, ieCv.width, ieCv.height);
    IE.ops.forEach(function(op){
      if (op.t === 's') {
        ctx.strokeStyle = op.c; ctx.lineWidth = op.w; ctx.lineCap = ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(op.p[0][0], op.p[0][1]);
        for (var i = 1; i < op.p.length; i++) ctx.lineTo(op.p[i][0], op.p[i][1]);
        if (op.p.length === 1) ctx.lineTo(op.p[0][0] + 0.1, op.p[0][1]);
        ctx.stroke();
      } else if (op.t === 'g') ieShape(ctx, op);
      else ieDrawText(op);
    });
    // Texto nuevo mientras lo escribes
    if (IE.pend && ieInput.value.trim() && ieTextBar.classList.contains('show'))
      ieDrawText(ieNewOp(IE.pend.x, IE.pend.y, ieInput.value));
    // Recuadro del texto seleccionado
    var t = IE.sel || IE.edit;
    if (t && IE.mode === 'text') {
      var b = ieTextBox(t), k = ieK();
      ctx.setLineDash([8 * k, 6 * k]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * k;
      ctx.strokeRect(b.x - 8 * k, b.y - 6 * k, b.w + 16 * k, b.h + 12 * k); ctx.setLineDash([]);
    }
  }
  function ieNewOp(x, y, v){ return { t: 'x', x: x, y: y, v: v, c: IE.color, ol: IE.ol, n: IE.size, s: IE.size * ieK(), b: IE.b, i: IE.i, u: IE.u }; }
  function iePt(e){
    var r = ieCv.getBoundingClientRect();
    return [(e.clientX - r.left) * ieCv.width / r.width, (e.clientY - r.top) * ieCv.height / r.height];
  }
  function openImgEdit(img, mode){
    if (!img) return;
    IE.target = img; IE.ops = []; IE.redo = []; IE.sel = null; IE.edit = null; IE.pend = null;
    var base = new Image();
    base.onload = function(){
      var nw = base.naturalWidth, nh = base.naturalHeight, k = Math.min(1, 1600 / Math.max(nw, nh));
      ieCv.width = Math.round(nw * k); ieCv.height = Math.round(nh * k);
      IE.base = base;
      closePanels();
      imged.classList.add('show'); document.body.classList.add('ie');
      document.documentElement.style.setProperty('--ieBarH', (iebar.offsetHeight || 100) + 'px');
      ieMeasureTop();
      send({ type: 'crop', open: true });
      ieFit(); ieZoomReset(); ieSetMode(mode || 'view');
    };
    base.src = img.src;
  }
  function closeImgEdit(){
    closePanels();
    imged.classList.remove('show'); document.body.classList.remove('ie'); ieCloseText(true);
    IE.target = null; IE.base = null; IE.ops = []; IE.sel = null;
    ieZoomReset();
    send({ type: 'crop', open: false });
  }
  var closeCropOld = window.closeCrop;
  window.closeCrop = function(){ if (ieOn()) closeImgEdit(); else closeCropOld(); };

  /* Lo que llega desde los paneles de tamaño y color (los mismos de las notas) */
  function ieApplySize(v){
    if (iePen()) IE.pen = v;
    else { IE.size = v; if (IE.sel) { IE.sel.n = v; IE.sel.s = v * ieK(); } }
    ieSyncBar(); ieRedraw();
  }
  function ieApplyColor(col){
    IE.color = col;
    if (IE.mode === 'text' && IE.sel) IE.sel.c = col;
    ieSyncBar(); ieRedraw();
  }
  function ieApplyOutline(col){
    IE.ol = col || 'none';
    if (IE.sel) IE.sel.ol = IE.ol;
    ieRedraw();
  }

  /* Escribir (el teclado solo sale al crear un texto nuevo o al tocar "Editar texto") */
  function ieOpenText(op, x, y){
    closePanels();
    IE.edit = op || null; IE.pend = op ? null : { x: x, y: y };
    ieInput.value = op ? op.v : '';
    ieTextBar.classList.add('show');
    imged.classList.remove('zoomed');
    setTimeout(function(){ ieInput.focus(); }, 30);
    ieRedraw();
  }
  function ieCloseText(save){
    if (save !== false && ieTextBar.classList.contains('show')) {
      var v = ieInput.value.trim();
      if (IE.edit) { if (v) IE.edit.v = v; else { IE.ops.splice(IE.ops.indexOf(IE.edit), 1); IE.sel = null; } }
      else if (IE.pend && v) { var op = ieNewOp(IE.pend.x, IE.pend.y, v); IE.ops.push(op); IE.redo = []; IE.sel = op; }
    }
    ieTextBar.classList.remove('show'); ieInput.blur();
    if (ieOn()) ieZoomApply();
    IE.edit = null; IE.pend = null;
    if (IE.base) { ieSyncBar(); ieRedraw(); }
  }
  $('ieTextOk').addEventListener('click', function(){ ieCloseText(true); });
  ieInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); ieCloseText(true); } });
  ieInput.addEventListener('input', function(){ if (IE.edit) IE.edit.v = ieInput.value || ' '; ieRedraw(); });

  /* Dedo sobre la foto */
  ieCv.addEventListener('pointerdown', function(e){
    e.preventDefault();
    closePanels();
    if (IE.mode === 'view' || ZM.pinch) return;          // modo ver: solo mover y acercar
    var p = iePt(e);
    try { ieCv.setPointerCapture(e.pointerId); } catch (_) {}
    if (IE_SHAPES[IE.mode]) {
      IE.cur = { t: 'g', g: IE.mode, c: IE.color, w: IE.pen * ieK(), a: p, b: p };
      IE.ops.push(IE.cur); IE.redo = []; ieRedraw();
      return;
    }
    if (IE.mode === 'draw') {
      IE.cur = { t: 's', c: IE.color, w: IE.pen * ieK(), p: [p] };
      IE.ops.push(IE.cur); IE.redo = []; ieRedraw();
      return;
    }
    if (ieTextBar.classList.contains('show')) { ieCloseText(true); return; }
    // ¿Tocó un texto? → se selecciona (sin teclado) y se puede arrastrar
    for (var i = IE.ops.length - 1; i >= 0; i--) {
      var op = IE.ops[i]; if (op.t !== 'x') continue;
      var b = ieTextBox(op), pad = 14 * ieK();
      if (p[0] > b.x - pad && p[0] < b.x + b.w + pad && p[1] > b.y - pad && p[1] < b.y + b.h + pad) {
        IE.sel = op; IE.color = op.c; IE.size = op.n; IE.b = op.b; IE.i = op.i; IE.u = op.u;
        IE.drag = { op: op, sx: p[0], sy: p[1], ox: op.x, oy: op.y };
        ieSyncBar(); ieRedraw();
        return;
      }
    }
    // Tocó un lugar vacío: si había un texto elegido, se suelta; si no, texto nuevo aquí
    if (IE.sel) { IE.sel = null; ieSyncBar(); ieRedraw(); return; }
    ieOpenText(null, p[0], p[1]);
  });
  ieCv.addEventListener('pointermove', function(e){
    if (ZM.pinch) return;
    var p = iePt(e);
    if (IE.cur && IE.cur.t === 'g') { IE.cur.b = p; ieRedraw(); return; }
    if (IE.cur) {
      var last = IE.cur.p[IE.cur.p.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
      IE.cur.p.push(p);
      ieCtx.strokeStyle = IE.cur.c; ieCtx.lineWidth = IE.cur.w; ieCtx.lineCap = ieCtx.lineJoin = 'round';
      ieCtx.beginPath(); ieCtx.moveTo(last[0], last[1]); ieCtx.lineTo(p[0], p[1]); ieCtx.stroke();
    } else if (IE.drag) {
      IE.drag.op.x = IE.drag.ox + p[0] - IE.drag.sx; IE.drag.op.y = IE.drag.oy + p[1] - IE.drag.sy; ieRedraw();
    }
  });
  function ieUp(){
    if (IE.cur) {
      var g = IE.cur;
      if (g.t === 'g' && Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]) < 6 * ieK()) IE.ops.splice(IE.ops.indexOf(g), 1);   // solo un toque: no se dibuja
      IE.cur = null; ieRedraw(); ieSyncBar();
    }
    IE.drag = null;
  }
  ieCv.addEventListener('pointerup', ieUp);
  ieCv.addEventListener('pointercancel', ieUp);


  /* ---------- Acercar / alejar la foto con dos dedos ---------- */
  var ZM = { z: 1, x: 0, y: 0, pts: {}, pinch: null, pan: null, lastTap: 0 };
  function ieZoomApply(){
    var w = ieCv.offsetWidth, h = ieCv.offsetHeight;
    var mx = Math.max(0, (w * ZM.z - ieArea.clientWidth) / 2) + 40, my = Math.max(0, (h * ZM.z - ieArea.clientHeight) / 2) + 40;
    if (ZM.z <= 1.001) { ZM.z = 1; ZM.x = 0; ZM.y = 0; }
    ZM.x = Math.max(-mx, Math.min(mx, ZM.x)); ZM.y = Math.max(-my, Math.min(my, ZM.y));
    ieCv.style.transform = 'translate(' + ZM.x + 'px,' + ZM.y + 'px) scale(' + ZM.z + ')';
    var hide = ZM.z > 1.02 && !ieTextBar.classList.contains('show');
    if (hide && !imged.classList.contains('zoomed')) closePanels();
    imged.classList.toggle('zoomed', hide);
  }
  function ieMeasureTop(){
    var h = $('ieHead').offsetHeight + (ieHint.classList.contains('show') ? ieHint.offsetHeight : 0);
    document.documentElement.style.setProperty('--ieTopH', (h || 60) + 'px');
  }
  function ieZoomReset(){ ZM.z = 1; ZM.x = 0; ZM.y = 0; ZM.pts = {}; ZM.pinch = null; ZM.pan = null; ieZoomApply(); }
  function zDist(){ var k = Object.keys(ZM.pts), a = ZM.pts[k[0]], b = ZM.pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
  function zBase(){ var r = ieCv.getBoundingClientRect(); return { x: r.left + r.width / 2 - ZM.x, y: r.top + r.height / 2 - ZM.y }; }
  function zMid(){ var k = Object.keys(ZM.pts), a = ZM.pts[k[0]], b = ZM.pts[k[1]]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  ieArea.addEventListener('pointerdown', function(e){
    if (!e.target.closest('#ieArea') || e.target.closest('#iebar')) return;
    ZM.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var n = Object.keys(ZM.pts).length;
    if (n === 2) {
      // el segundo dedo: se cancela lo que empezó el primero (trazo o arrastre)
      if (IE.cur) { var k = IE.ops.indexOf(IE.cur); if (k >= 0) IE.ops.splice(k, 1); IE.cur = null; }
      if (IE.drag) { IE.drag.op.x = IE.drag.ox; IE.drag.op.y = IE.drag.oy; IE.drag = null; }
      ieRedraw();
      var m = zMid();
      var bc = zBase();
      ZM.pinch = { d: zDist(), z: ZM.z, x: ZM.x, y: ZM.y, mx: m.x, my: m.y, bx: bc.x, by: bc.y };
      ZM.pan = null;
      e.stopPropagation(); e.preventDefault();
    } else if (n === 1 && IE.mode === 'view') {
      var now = Date.now();
      if (now - ZM.lastTap < 300) {                    // doble toque: acercar / volver
        var bc = zBase(), cx = e.clientX - bc.x, cy = e.clientY - bc.y;
        if (ZM.z > 1.05) { ZM.z = 1; ZM.x = 0; ZM.y = 0; }
        else { ZM.z = 2.5; ZM.x = -cx * 1.5; ZM.y = -cy * 1.5; }
        ieCv.style.transition = 'transform .2s'; ieZoomApply(); setTimeout(function(){ ieCv.style.transition = ''; }, 220);
        ZM.lastTap = 0;
      } else ZM.lastTap = now;
      ZM.pan = { sx: e.clientX, sy: e.clientY, x: ZM.x, y: ZM.y };
    }
  }, true);
  ieArea.addEventListener('pointermove', function(e){
    if (!ZM.pts[e.pointerId]) return;
    ZM.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (ZM.pinch && Object.keys(ZM.pts).length >= 2) {
      var P = ZM.pinch, m = zMid();
      var z = Math.max(1, Math.min(6, P.z * zDist() / P.d));
      // el punto entre los dedos se queda debajo de los dedos
      var ox = P.mx - P.bx, oy = P.my - P.by;
      ZM.z = z;
      ZM.x = (ox - (ox - P.x) * z / P.z) + (m.x - P.mx);
      ZM.y = (oy - (oy - P.y) * z / P.z) + (m.y - P.my);
      ieZoomApply();
      e.stopPropagation(); e.preventDefault();
    } else if (ZM.pan && IE.mode === 'view') {
      ZM.x = ZM.pan.x + e.clientX - ZM.pan.sx; ZM.y = ZM.pan.y + e.clientY - ZM.pan.sy;
      ieZoomApply();
    }
  }, true);
  function zUp(e){
    delete ZM.pts[e.pointerId];
    var n = Object.keys(ZM.pts).length;
    if (n < 2 && ZM.pinch) {
      ZM.pinch = null;
      if (n === 1 && IE.mode === 'view') { var k = Object.keys(ZM.pts)[0]; ZM.pan = { sx: ZM.pts[k].x, sy: ZM.pts[k].y, x: ZM.x, y: ZM.y }; }
      e.stopPropagation();
      ieRedraw();
    }
    if (!n) ZM.pan = null;
  }
  ieArea.addEventListener('pointerup', zUp, true);
  ieArea.addEventListener('pointercancel', zUp, true);

  /* Barra de abajo del editor de foto */
  iebar.addEventListener('mousedown', function(e){ if (e.target.closest('button')) e.preventDefault(); });
  iebar.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    var a = b.dataset.ie, cmd = b.dataset.iecmd;
    if (cmd) {
      if (IE.mode !== 'text') ieSetMode('text');
      IE[cmd] = !(IE.sel ? IE.sel[cmd] : IE[cmd]);
      if (IE.sel) IE.sel[cmd] = IE[cmd];
      ieSyncBar(); ieRedraw(); return;
    }
    if (a === 'draw' || a === 'text' || IE_SHAPES[a]) { ieSetMode(IE.mode === a ? 'view' : a); return; }
    if (a === 'undo') { ieCloseText(false); var gone = IE.ops.pop(); if (gone) IE.redo.push(gone); if (gone === IE.sel) IE.sel = null; ieSyncBar(); ieRedraw(); return; }
    if (a === 'redo') { ieCloseText(false); var back = IE.redo.pop(); if (back) IE.ops.push(back); ieSyncBar(); ieRedraw(); return; }
    if (a === 'edit') { if (IE.sel) ieOpenText(IE.sel); return; }
    if (a === 'del') { if (IE.sel) { IE.ops.splice(IE.ops.indexOf(IE.sel), 1); IE.sel = null; ieSyncBar(); ieRedraw(); } return; }
    if (a === 'size') { togglePanel(sizePanel, b); return; }
    if (a === 'color') { togglePanel(colorPanel, b); return; }
  });
  window.addEventListener('resize', function(){ if (ieOn()) { ieFit(); ieZoomApply(); } });
  $('ieCancel').onclick = function(){ closeImgEdit(); };
  $('ieOk').onclick = function(){
    ieCloseText(true);
    var t = IE.target;
    if (t && IE.ops.length) {
      IE.sel = null; IE.mode = 'draw'; ieRedraw();
      t.onload = placeRsz;
      t.src = canvasToData(ieCv, ieCtx, 0.88);
      changedNow(); showTip(${J('imgEdited')});
    }
    closeImgEdit();
  };

  /* =========================================================
     REVISAR ORTOGRAFÍA (como Google Docs)
     El botón de arriba llama a spellStart(). El texto se manda a la
     app, la app lo revisa por internet (LanguageTool) y devuelve los
     errores con spellResult(). Luego se va de uno en uno.
     ========================================================= */
  var SP = { on: false, list: [], i: 0, ign: {}, req: 0, sent: '' };
  var spEl = $('spell'), spLayer = $('spLayer'), spTimer = null;
  function spEsc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* Todo el texto (título + nota) y en qué parte de la página está cada pedacito */
  function spText(){
    var segs = [], txt = '';
    function nl(){ if (txt && txt.charAt(txt.length - 1) !== '\\n') txt += '\\n'; }
    function walk(n){
      if (n.nodeType === 3) { segs.push({ n: n, s: txt.length }); txt += n.data.replace(/[\\u200B\\u00A0\\uFEFF]/g, ' '); return; }
      if (n.nodeType !== 1) return;
      if (n.classList && n.classList.contains('imgwrap')) { nl(); txt += '\\n'; return; }
      if (n.tagName === 'BR') { txt += '\\n'; return; }
      var block = /^(DIV|P|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE)$/.test(n.tagName);
      if (block) nl();
      for (var k = n.firstChild; k; k = k.nextSibling) walk(k);
      if (block) nl();
    }
    walk(ttl); txt += '\\n\\n'; walk(ed);
    return { t: txt, segs: segs };
  }
  function spPos(m, off, isEnd){
    for (var k = m.segs.length - 1; k >= 0; k--) {
      var g = m.segs[k], L = g.n.data.length;
      if (isEnd ? (off > g.s && off <= g.s + L) : (off >= g.s && off < g.s + L)) return [g.n, off - g.s];
    }
    return null;
  }
  function spRange(m, x){
    var a = spPos(m, x.off, false), b = spPos(m, x.off + x.len, true);
    if (!a || !b) return null;
    var r = document.createRange();
    try { r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); } catch (e) { return null; }
    return r;
  }
  /* Si escribiste algo mientras revisas, se vuelve a buscar cada palabra */
  function spSync(){
    var m = spText();
    SP.list = SP.list.filter(function(x){
      if (m.t.substr(x.off, x.len) === x.word) return true;
      var best = -1, i = m.t.indexOf(x.word, Math.max(0, x.off - 400));
      while (i !== -1 && i < x.off + 400) {
        if (best < 0 || Math.abs(i - x.off) < Math.abs(best - x.off)) best = i;
        i = m.t.indexOf(x.word, i + 1);
      }
      if (best < 0) return false;
      x.off = best; return true;
    });
    if (SP.i >= SP.list.length) SP.i = 0;
    return m;
  }
  /* Rayita roja debajo de cada error; el de ahora, marcado */
  function spDraw(){
    if (!SP.on) { spLayer.innerHTML = ''; return; }
    var m = spSync(), sx = window.scrollX, sy = window.scrollY, h = '';
    SP.list.forEach(function(x, k){
      var r = spRange(m, x); if (!r) return;
      var rs = r.getClientRects();
      for (var j = 0; j < rs.length; j++) {
        var q = rs[j]; if (!q.width) continue;
        h += '<div class="spm' + (k === SP.i ? ' cur' : '') + '" style="left:' + (q.left + sx - 1) + 'px;top:' + (q.top + sy) +
             'px;width:' + (q.width + 2) + 'px;height:' + q.height + 'px"></div>';
      }
    });
    spLayer.innerHTML = h;
  }
  function spCard(html){
    spEl.innerHTML = '<div class="spHead"><div class="pleft"><button class="pback" data-sp="x" aria-label="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><span id="spHd">' + spEsc(${J('spellTitle')}) + '</span></div><button class="pclose" data-sp="x">' + spEsc(${J('done')}) + '</button></div>' + html;
    spEl.classList.add('show');
  }
  function spInfo(text, spin){ spCard('<div class="spInfo">' + (spin ? '<span class="spSpin"></span>' : '') + spEsc(text) + '</div>'); }
  /* Llevar la palabra a la vista (sin que la tape la tarjeta) */
  function spFocus(){
    var m = spText(), x = SP.list[SP.i]; if (!x) return;
    var r = spRange(m, x); if (!r) return;
    var q = r.getBoundingClientRect(), top = spEl.getBoundingClientRect().top || window.innerHeight * 0.6;
    if (q.top < 60 || q.bottom > top - 24) window.scrollTo({ top: Math.max(0, window.scrollY + q.top - Math.min(140, top / 3)), behavior: 'smooth' });
  }
  function spShow(){
    spSync();
    var n = SP.list.length, x = SP.list[SP.i];
    if (!x) { spDraw(); spInfo(${J('spellDone')}); setTimeout(function(){ if (SP.on && !SP.list.length) spClose(); }, 1400); return; }
    var sug = x.reps.length
      ? x.reps.map(function(v, k){ return '<button data-rep="' + k + '">' + spEsc(v) + '</button>'; }).join('')
      : '<span class="spNo">' + spEsc(${J('spellNoSugg')}) + '</span>';
    spCard('<div class="spWord">' + spEsc(x.word) + '</div>' +
      (x.msg ? '<div class="spMsg">' + spEsc(x.msg) + '</div>' : '') +
      '<div class="spSug">' + sug + '</div>' +
      '<div class="spRow"><button data-sp="ign">' + spEsc(${J('spellIgnore')}) + '</button>' +
      '<button data-sp="all">' + spEsc(${J('spellIgnoreAll')}) + '</button><span class="grow"></span>' +
      (n > 1 ? '<button class="nav" data-sp="prev">‹</button><button class="nav" data-sp="next">›</button>' : '') + '</div>');
    $('spHd').textContent = ${J('spellTitle')} + '  ·  ' + ${J('spellOf')}.replace('{i}', SP.i + 1).replace('{n}', n);
    spDraw();
    spFocus();
  }
  function spClose(){
    SP.on = false; SP.list = []; SP.req++;
    spLayer.innerHTML = ''; spEl.classList.remove('show');
    document.body.classList.remove('spell');
    send({ type: 'spellOpen', open: false });
  }
  window.spellClose = function(){ if (SP.on) spClose(); };
  /* Cambiar la palabra por la sugerencia elegida */
  function spReplace(v){
    var m = spText(), x = SP.list[SP.i]; if (!x) return;
    var r = spRange(m, x);
    SP.list.splice(SP.i, 1);
    if (r) {
      r.deleteContents();
      var tn = document.createTextNode(v);
      r.insertNode(tn);
      var d = v.length - x.len;
      SP.list.forEach(function(y){ if (y.off > x.off) y.off += d; });
      changedNow();                       // se guarda (y se puede Deshacer)
    }
    spShow();
  }
  spEl.addEventListener('pointerdown', function(e){ e.preventDefault(); });   // no cerrar el teclado ni mover el cursor
  spEl.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    var x = SP.list[SP.i];
    if (b.hasAttribute('data-rep')) { if (x) spReplace(x.reps[+b.getAttribute('data-rep')]); return; }
    var a = b.getAttribute('data-sp');
    if (a === 'x') spClose();
    else if (a === 'ign') { SP.list.splice(SP.i, 1); spShow(); }
    else if (a === 'all') { if (x) { SP.ign[x.word] = 1; SP.list = SP.list.filter(function(y){ return y.word !== x.word; }); } spShow(); }
    else if (a === 'next') { SP.i = (SP.i + 1) % SP.list.length; spShow(); }
    else if (a === 'prev') { SP.i = (SP.i - 1 + SP.list.length) % SP.list.length; spShow(); }
  });
  /* Tocar una palabra marcada la elige */
  function spPick(){
    if (!SP.on || !SP.list.length) return;
    var sel = window.getSelection(); if (!sel.rangeCount) return;
    var m = spText(), node = sel.anchorNode, off = -1;
    m.segs.forEach(function(g){ if (g.n === node) off = g.s + sel.anchorOffset; });
    if (off < 0) return;
    for (var k = 0; k < SP.list.length; k++) {
      var x = SP.list[k];
      if (off >= x.off && off <= x.off + x.len) { if (k !== SP.i) { SP.i = k; spShow(); } return; }
    }
  }
  ed.addEventListener('click', function(){ setTimeout(spPick, 0); });
  ttl.addEventListener('click', function(){ setTimeout(spPick, 0); });
  function spLater(){ if (!SP.on) return; clearTimeout(spTimer); spTimer = setTimeout(function(){ if (SP.list.length) spShow(); else spDraw(); }, 350); }
  ed.addEventListener('input', spLater);
  ttl.addEventListener('input', spLater);
  window.addEventListener('resize', function(){ if (SP.on) setTimeout(spDraw, 60); });

  window.spellStart = function(){
    if (!editable) return;
    if (SP.on) { spClose(); return; }               // tocar otra vez = cerrar
    if (dirty) changedNow();
    closePanels(); selectImg(null);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // bajar el teclado
    var m = spText();
    if (!m.t.replace(/\\s+/g, '')) { showTip(${J('spellNone')}); return; }
    SP.on = true; SP.list = []; SP.i = 0; SP.req++; SP.sent = m.t;
    document.body.classList.add('spell');
    send({ type: 'spellOpen', open: true });
    spInfo(${J('spellChecking')}, true);
    send({ type: 'spell', text: m.t, req: SP.req });
  };
  window.spellResult = function(res){
    if (!SP.on || !res || res.req !== SP.req) return;
    if (!res.ok) { spInfo(${J('spellNoNet')}); return; }
    var seen = {};
    SP.list = (res.matches || []).filter(function(x){
      var id = x.rule && x.rule.id || '';
      return !(x.rule && x.rule.issueType === 'whitespace') && !/WHITESPACE|DOUBLE_PUNCTUATION/.test(id);
    }).map(function(x){
      return { off: x.offset, len: x.length, word: SP.sent.substr(x.offset, x.length),
               msg: x.shortMessage || x.message || '',
               reps: (x.replacements || []).map(function(r){ return r.value; }).filter(function(v){ return v != null; }).slice(0, 5) };
    }).filter(function(x){
      if (!x.word.trim() || x.word.indexOf('\\n') >= 0 || SP.ign[x.word] || seen[x.off]) return false;
      seen[x.off] = 1; return true;
    });
    SP.i = 0;
    if (!SP.list.length) { spInfo(${J('spellNone')}); setTimeout(function(){ if (SP.on && !SP.list.length) spClose(); }, 1600); return; }
    spShow();
  };

  /* ---------- Poner un cálculo de la calculadora en la nota ---------- */
  window.insertCalc = function(t){
    if (!editable || !t) return;
    var r = saved && ed.contains(saved.startContainer) ? saved.cloneRange() : null;
    if (r) {
      r.collapse(false);
      var before = r.startContainer.nodeType === 3 ? r.startContainer.data.slice(0, r.startOffset) : '';
      var tn = document.createTextNode((before && !/\\s$/.test(before) ? ' ' : '') + t);
      r.insertNode(tn);
      r.setStartAfter(tn); r.collapse(true); saved = r.cloneRange();
    } else {
      var d = document.createElement('div'); d.textContent = t;
      var last = ed.lastElementChild;
      if (last && last.tagName === 'DIV' && !last.textContent.trim() && !last.querySelector('img')) ed.insertBefore(d, last);
      else ed.appendChild(d);
    }
    changedNow();
    showTip(${J('calcInserted')});
  };


  /* =========================================================
     REESCRIBIR CON IA ✨ (como Gmail)
     Seleccionas un texto → sale "✨ Reescribir" → eliges el estilo
     → la app le pide a la IA otra versión → Reemplazar o Insertar.
     ========================================================= */
  /* =========================================================
     🎙️ GRABAR AUDIO con transcripción en vivo
     ========================================================= */
  var PLAY_SVG = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>';
  var PAUSE_SVG = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><rect x="9" y="8" width="2" height="8" fill="currentColor" stroke="none"/><rect x="13" y="8" width="2" height="8" fill="currentColor" stroke="none"/></svg>';
  var DEL_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  function audFmt(sec){ sec = Math.max(0, Math.round(sec || 0)); var m = Math.floor(sec / 60), x = sec % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  var RW_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>';
  var FF_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>';
  var AUD_RATES = [1, 1.5, 2];
  function audRateTxt(r){ var t = String(r); if (/^(es|pt|fr|de|it|ca|nl|sv|nb|da|fi|pl|cs|sk|hu|ro|hr|el|bg|ru|uk|tr|id|vi)/.test(String(LOC))) t = t.replace('.', ','); return t + '×'; }
  function audCtl(){
    return '<div class="audctl"><button class="audrw" type="button">' + RW_SVG + '10</button>' +
      '<button class="audsp" type="button">' + audRateTxt(1) + '</button>' +
      '<button class="audff" type="button">10' + FF_SVG + '</button></div>';
  }
  function audUpgrade(w){                                   // los audios viejos también reciben ⏪ ⏩ y la velocidad
    if (w.querySelector('.audctl')) return;
    var au = w.querySelector('audio'), box = document.createElement('div');
    box.innerHTML = audCtl();
    w.insertBefore(box.firstChild, au);
  }
  /* Los audios se guardan aparte (en el almacén del teléfono / navegador), no dentro del texto de la nota.
     Así la nota no se hace gigante y se puede guardar siempre. */
  var AUDB = null;
  function audDb(){
    if (AUDB) return AUDB;
    AUDB = new Promise(function(ok, no){
      try {
        var rq = indexedDB.open('misnotas_audios', 1);
        rq.onupgradeneeded = function(){ rq.result.createObjectStore('a'); };
        rq.onsuccess = function(){ ok(rq.result); };
        rq.onerror = function(){ no(rq.error); };
      } catch (e) { no(e); }
    });
    AUDB.catch(function(){ AUDB = null; });
    return AUDB;
  }
  function audPut(blob){
    var aid = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return audDb().then(function(db){ return new Promise(function(ok, no){
      var tx = db.transaction('a', 'readwrite'); tx.objectStore('a').put(blob, aid);
      tx.oncomplete = function(){ ok(aid); }; tx.onerror = tx.onabort = function(){ no(tx.error); };
    }); });
  }
  function audGet(aid){
    return audDb().then(function(db){ return new Promise(function(ok, no){
      var rq = db.transaction('a').objectStore('a').get(aid);
      rq.onsuccess = function(){ rq.result ? ok(rq.result) : no(new Error('none')); }; rq.onerror = function(){ no(rq.error); };
    }); });
  }
  function audKeep(blob, cb){                              // guardar aparte; si no se puede, dentro de la nota como antes
    audPut(blob).then(function(aid){ cb('', aid); }, function(){
      var fr = new FileReader(); fr.onload = function(){ cb(String(fr.result), null); }; fr.readAsDataURL(blob);
    });
  }
  function audSrc(au, cb){                                 // pone el sonido en el reproductor antes de usarlo
    if (au.getAttribute('src') || !au.dataset.aid) { cb(); return; }
    audGet(au.dataset.aid).then(function(b){ if (!au.getAttribute('src')) au.src = URL.createObjectURL(b); cb(); }, function(){ cb(); });
  }
  function audBlock(src, dur, aid, size){
    return '<div class="audwrap" contenteditable="false" data-dur="' + Math.round(dur) + '"' + (size ? ' data-size="' + size + '"' : '') + '>' +
      '<button class="audp" type="button">' + PLAY_SVG + '</button>' +
      '<div class="audbar"><div class="audfill"></div></div>' +
      '<span class="audt">' + audFmt(dur) + '</span>' +
      '<button class="audx" type="button">' + DEL_SVG + '</button>' + audCtl() +
      (aid ? '<audio preload="none" data-aid="' + aid + '"></audio></div>' : '<audio preload="none" src="' + src + '"></audio></div>');
  }
  var audNow = null;   // el audio que está sonando
  function audStopAll(){ if (audNow) { try { audNow.pause(); } catch (e) {} } }
  ed.addEventListener('mousedown', function(e){ if (e.target.closest && e.target.closest('.audwrap')) e.preventDefault(); });
  ed.addEventListener('click', function(e){
    var w = e.target.closest && e.target.closest('.audwrap'); if (!w) return;
    e.preventDefault(); e.stopPropagation();
    var au = w.querySelector('audio'), btn = w.querySelector('.audp'), fill = w.querySelector('.audfill'), tt = w.querySelector('.audt');
    var dur = +w.dataset.dur || 0;
    if (!au._wired) {
      au._wired = true;
      au.addEventListener('timeupdate', function(){
        var d = isFinite(au.duration) && au.duration > 0 ? au.duration : dur;
        fill.style.width = (d ? Math.min(100, au.currentTime / d * 100) : 0) + '%';
        tt.textContent = audFmt(au.currentTime > 0 ? au.currentTime : d);
      });
      au.addEventListener('ended', function(){ btn.innerHTML = PLAY_SVG; fill.style.width = '100%'; tt.textContent = audFmt(dur); });
      au.addEventListener('pause', function(){ btn.innerHTML = PLAY_SVG; });
      au.addEventListener('play', function(){ btn.innerHTML = PAUSE_SVG; });
    }
    if (e.target.closest('.audx')) {                       // borrar el audio
      audStopAll(); w.parentNode.removeChild(w); changedNow(); return;
    }
    var tgt = e.target, cx = e.clientX;
    if (!au.getAttribute('src') && au.dataset.aid) { audSrc(au, function(){ audAct(w, au, btn, fill, tt, dur, tgt, cx); }); return; }
    audAct(w, au, btn, fill, tt, dur, tgt, cx);
  }, true);
  function audAct(w, au, btn, fill, tt, dur, tgt, cx){
    if (tgt.closest('.audbar')) {                     // saltar a una parte
      var r = w.querySelector('.audbar').getBoundingClientRect(), d2 = isFinite(au.duration) && au.duration > 0 ? au.duration : dur;
      if (d2) { try { au.currentTime = Math.max(0, Math.min(d2, (cx - r.left) / r.width * d2)); } catch (er) {} }
      if (au.paused) { audStopAll(); audNow = au; au.play().catch(function(){}); }
      return;
    }
    var rwb = tgt.closest('.audrw'), ffb = tgt.closest('.audff');
    if (rwb || ffb) {                                      // devolver / adelantar 10 segundos
      var delta = rwb ? -10 : 10;
      var go = function(){
        var d3 = isFinite(au.duration) && au.duration > 0 ? au.duration : dur;
        try { au.currentTime = Math.max(0, Math.min(d3 || 1e9, (au.currentTime || 0) + delta)); } catch (er) {}
        fill.style.width = (d3 ? Math.min(100, au.currentTime / d3 * 100) : 0) + '%';
        tt.textContent = audFmt(au.currentTime);
      };
      if (au.readyState === 0) { au.preload = 'auto'; au.addEventListener('loadedmetadata', go, { once: true }); try { au.load(); } catch (er) {} }
      else go();
      return;
    }
    var spb = tgt.closest('.audsp');
    if (spb) {                                             // velocidad: 1× → 1,5× → 2× → 1×
      var cur = +w.dataset.rate || 1, nx = AUD_RATES[(AUD_RATES.indexOf(cur) + 1) % AUD_RATES.length];
      w.dataset.rate = nx; au.defaultPlaybackRate = nx; au.playbackRate = nx;
      spb.textContent = audRateTxt(nx);
      return;
    }
    if (tgt.closest('.audp')) {
      au.playbackRate = +w.dataset.rate || 1;
      if (au.paused) { audStopAll(); audNow = au; if (au.ended) au.currentTime = 0; au.play().catch(function(){}); }
      else au.pause();
    }
  }

  (function(){                                            // audios viejos guardados dentro de la nota → pasarlos aparte
    var olds = Array.prototype.filter.call(ed.querySelectorAll('.audwrap audio, .vidwrap video'), function(a){ return /^data:/.test(a.getAttribute('src') || ''); });
    if (!olds.length || !editable) return;
    var left = olds.length, moved = 0;
    olds.forEach(function(a){
      fetch(a.getAttribute('src')).then(function(r){ return r.blob(); }).then(audPut).then(function(aid){
        var keep = a.getAttribute('src');
        a.setAttribute('data-aid', aid); a.removeAttribute('src'); moved++;
        audGet(aid).then(function(b){ if (!a.getAttribute('src')) a.src = URL.createObjectURL(b); }, function(){ a.src = keep; });
      }).catch(function(){}).then(function(){ if (--left === 0 && moved) changedNow(); });
    });
  })();
  Array.prototype.forEach.call(ed.querySelectorAll('.audwrap'), function(w){
    audUpgrade(w);
    var r0 = +w.dataset.rate || 1, sp = w.querySelector('.audsp'); if (sp) sp.textContent = audRateTxt(r0);
  });
  /* =========================================================
     🎬 VIDEOS en la nota: se guardan aparte (como los audios) y
     se ven con su botón de play. Se pueden achicar para enviarlos.
     ========================================================= */
  var VID_SHRINK_SVG = '🗜️';
  function vidBlock(src, aid, size){
    return '<div class="vidwrap" contenteditable="false" data-size="' + (size || 0) + '">' +
      '<video controls playsinline preload="metadata"' + (aid ? ' data-aid="' + aid + '"' : ' src="' + src + '"') + '></video>' +
      '<div class="vidbar"><span class="vidsz">🎬 ' + fmtBytes(size) + '</span>' +
      '<button class="vidsh" type="button">' + VID_SHRINK_SVG + ' ' + rwEsc(${J('vidShrink')}) + '</button>' +
      '<button class="vidx" type="button">' + DEL_SVG + '</button></div></div>';
  }
  function vidHydrate(){
    Array.prototype.forEach.call(ed.querySelectorAll('.vidwrap video[data-aid]'), function(v){
      if (v.getAttribute('src') || v._loading) return;
      v._loading = true;
      audGet(v.getAttribute('data-aid')).then(function(b){ if (!v.getAttribute('src')) v.src = URL.createObjectURL(b) + '#t=0.1'; }, function(){}).then(function(){ v._loading = false; });
    });
  }
  function insertVideo(f){
    showTip(${J('vidAdding')});
    var blob = f.type ? f : new Blob([f], { type: 'video/mp4' });
    audKeep(blob, function(src, aid){
      var html = vidBlock(src, aid, f.size) + '<div><br></div>';
      quietFocus();
      if (saved && ed.contains(saved.startContainer)) {
        var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(saved);
        document.execCommand('insertHTML', false, html);
      } else ed.insertAdjacentHTML('beforeend', html);
      changedNow();
      showTip(${J('vidAdded')});
    });
  }
  function vidShrinkMime(){
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    return ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1', 'video/mp4',
            'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
      .filter(function(m){ try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0] || null;
  }
  function vidShrink(w){
    var mime = vidShrinkMime();
    if (!mime) { showTip(${J('vidNoShrink')}); return; }
    if (w._busy) return; w._busy = true;
    var v0 = w.querySelector('video'), lbl = w.querySelector('.vidsz'), oldSize = +w.getAttribute('data-size') || 0;
    var ac = null;
    var getBlob = v0.getAttribute('data-aid') ? audGet(v0.getAttribute('data-aid')) : fetch(v0.getAttribute('src')).then(function(r){ return r.blob(); });
    getBlob.then(function(blob){
      if (!oldSize) oldSize = blob.size;
      return new Promise(function(ok, no){
        var v = document.createElement('video');
        /* En Android el video y el lienzo tienen que estar en la página (aunque no se vean) para que se graben bien */
        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
        document.body.appendChild(box); w._box = box;
        v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = URL.createObjectURL(blob);
        v.style.cssText = 'width:4px;height:4px'; box.appendChild(v);
        v.onerror = function(){ no(new Error('video')); };
        v.onloadedmetadata = function(){
          var sc = Math.min(1, 1280 / Math.max(v.videoWidth || 1280, v.videoHeight || 720));
          var cw = Math.max(2, Math.round((v.videoWidth || 1280) * sc / 2) * 2), ch = Math.max(2, Math.round((v.videoHeight || 720) * sc / 2) * 2);
          var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          cv.style.cssText = 'width:4px;height:4px'; box.appendChild(cv);
          var g = cv.getContext('2d'), stream = cv.captureStream(30);
          var gotAudio = false;
          try {                                   // el sonido directo del video (lo más seguro en Android)
            var vs = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
            if (vs) vs.getAudioTracks().forEach(function(t){ stream.addTrack(t); gotAudio = true; });
          } catch (e) {}
          if (!gotAudio) try {
            var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
            var sn = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination();
            sn.connect(dst); try { ac.resume(); } catch (e) {}
            dst.stream.getAudioTracks().forEach(function(t){ stream.addTrack(t); });
          } catch (e) {}
          var rec;
          try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000, audioBitsPerSecond: 96000 }); }
          catch (e) { no(e); return; }
          var chunks = [], done = false;
          rec.ondataavailable = function(ev){ if (ev.data && ev.data.size) chunks.push(ev.data); };
          rec.onstop = function(){ ok(new Blob(chunks, { type: mime.split(';')[0] })); };
          var rvfc = typeof v.requestVideoFrameCallback === 'function';
          var draw = function(){
            if (done) return;
            try { g.drawImage(v, 0, 0, cw, ch); } catch (e) {}
            lbl.textContent = ${J('vidShrinking')}.replace('{n}', Math.min(99, Math.round(v.currentTime / (v.duration || 1) * 100)));
            if (rvfc) v.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
          };
          var finish = function(){
            if (done) return; done = true;
            setTimeout(function(){ try { rec.state !== 'inactive' ? rec.stop() : ok(new Blob(chunks, { type: mime.split(';')[0] })); } catch (e) { no(e); } }, 300);
          };
          v.onended = finish;
          v.ontimeupdate = function(){ if (v.duration && v.currentTime >= v.duration - 0.08) finish(); };
          v.onpause = function(){ if (!done && v.duration && v.currentTime < v.duration - 0.3) { try { v.play(); } catch (e) {} } };
          setTimeout(finish, ((v.duration && isFinite(v.duration)) ? v.duration * 1000 : 60000) + 8000);   // por si acaso: nunca se queda pegado
          rec.start(1000);
          v.play().then(function(){ draw(); }, no);
        };
      });
    }).then(function(nb){
      if (!nb.size || nb.size >= oldSize) return null;       // si no quedó más pequeño, se queda el original
      return audPut(nb).then(function(aid){
        v0.removeAttribute('src'); v0.setAttribute('data-aid', aid); v0._loading = false;
        w.setAttribute('data-size', nb.size);
        return nb.size;
      });
    }).then(function(ns){
      lbl.textContent = '🎬 ' + fmtBytes(ns || oldSize);
      if (ns) { vidHydrate(); changedNow(); }
      showTip(${J('vidShrunk')}.replace('{a}', fmtBytes(oldSize)).replace('{b}', fmtBytes(ns || oldSize)));
    }).catch(function(){
      lbl.textContent = '🎬 ' + fmtBytes(oldSize);
      showTip(${J('vidNoShrink')});
    }).then(function(){ w._busy = false; try { ac && ac.close(); } catch (e) {} try { w._box && w._box.parentNode && w._box.parentNode.removeChild(w._box); } catch (e) {} });
  }
  ed.addEventListener('mousedown', function(e){ if (e.target.closest && e.target.closest('.vidbar')) e.preventDefault(); });
  ed.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.vidbar button'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var w = b.closest('.vidwrap'); if (!w || !editable) return;
    if (b.classList.contains('vidx')) { w.parentNode.removeChild(w); changedNow(); return; }
    if (b.classList.contains('vidsh')) vidShrink(w);
  }, true);
  vidHydrate();
  ed.addEventListener('click', function(e){                 // 👔 Hacer profesional (debajo de la transcripción)
    var ch = e.target.closest && e.target.closest('.audpro'); if (!ch) return;
    e.preventDefault(); e.stopPropagation();
    var dv = ch.previousElementSibling;
    ch.parentNode.removeChild(ch);
    if (!dv || !dv.textContent.trim()) return;
    var r = document.createRange(); r.selectNodeContents(dv);
    RW.work = false; RW.tpl = false; RW.range = r; RW.text = dv.textContent;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    closePanels(); document.body.classList.add('rw');
    rwShowStyles();
  }, true);
  ed.addEventListener('mousedown', function(e){ if (e.target.closest && e.target.closest('.audpro')) e.preventDefault(); });
  var REC = null, recEl = $('recP');
  /* Idioma en que vas a hablar (Whisper se enfoca en ese idioma y transcribe mejor) */
  var REC_LANGS = [['auto', '🌐 Auto'], ['spanish', 'Español'], ['english', 'English'], ['portuguese', 'Português'],
    ['french', 'Français'], ['italian', 'Italiano'], ['german', 'Deutsch'], ['chinese', '中文'], ['japanese', '日本語'],
    ['korean', '한국어'], ['russian', 'Русский'], ['arabic', 'العربية'], ['hindi', 'हिन्दी']];
  var REC_BY_CODE = { es: 'spanish', en: 'english', pt: 'portuguese', fr: 'french', it: 'italian', de: 'german', zh: 'chinese', ja: 'japanese', ko: 'korean', ru: 'russian', ar: 'arabic', hi: 'hindi' };
  var recLang = 'auto';
  try { recLang = localStorage.getItem('recLang') || REC_BY_CODE[String(LOC || '').slice(0, 2)] || 'auto'; } catch (e) { recLang = REC_BY_CODE[String(LOC || '').slice(0, 2)] || 'auto'; }
  function recEsc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function recPaint(){
    if (!REC) return;
    var sec = (Date.now() - REC.t0) / 1000;
    var tm = recEl.querySelector('.recTime'); if (tm) tm.textContent = audFmt(sec);
    var tx = recEl.querySelector('.recTxt');
    if (tx) tx.innerHTML = REC.noSR ? '<i>' + recEsc(${J('recNoText')}) + '</i>'
      : (REC.fin || REC.mid) ? recEsc(REC.fin) + ' <i>' + recEsc(REC.mid) + '</i>' : '<i>' + recEsc(${J('recSpeak')}) + '</i>';
  }
  window.recStart = function(){
    if (REC || !editable) return;
    closePanels();
    var sel = window.getSelection();
    var keep = sel.rangeCount && owner(sel.getRangeAt(0).startContainer) === ed ? sel.getRangeAt(0).cloneRange() : null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { showTip(${J('recNoMic')}); return; }
    REC = { t0: Date.now(), chunks: [], fin: '', mid: '', keep: keep, noSR: false, live: true };
    recEl.innerHTML = '<div class="recTop"><span class="recDot"></span><span class="recLbl">' + recEsc(${J('recListening')}) + '</span><span class="recTime">0:00</span></div>' +
      '<div class="recLangs">' + REC_LANGS.map(function(l){ return '<button type="button" data-lang="' + l[0] + '"' + (l[0] === recLang ? ' class="on"' : '') + '>' + l[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="recUp" data-rec="up">📂 ' + recEsc(${J('recUpload')}) + '</button>' +
      '<div class="recBtns"><button type="button" data-rec="x">' + recEsc(${J('recCancel')}) + '</button>' +
      '<button type="button" class="recOk" data-rec="ok">' + recEsc(${J('recStop')}) + '</button></div>';
    recEl.classList.add('show'); document.body.classList.add('recording');
    recPaint();
    REC.tick = setInterval(recPaint, 250);              // sin límite de tiempo: solo el espacio del teléfono
    var me = REC;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
      if (REC !== me) { stream.getTracks().forEach(function(t){ t.stop(); }); return; }
      me.stream = stream;
      var mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].filter(function(m){ try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0];
      me.mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }) : new MediaRecorder(stream);
      me.mr.ondataavailable = function(ev){ if (ev.data && ev.data.size) me.chunks.push(ev.data); };
      me.mr.start(500);                 // solo graba (la transcripción no funciona en Android)
    }).catch(function(){
      showTip(${J('recNoMic')});
      if (REC !== me) return;
      me.noMic = true; clearInterval(me.tick);
      var dot = recEl.querySelector('.recDot'); if (dot) dot.style.display = 'none';
      var lb = recEl.querySelector('.recLbl'); if (lb) lb.textContent = ${J('recNoMic')};
      var tm = recEl.querySelector('.recTime'); if (tm) tm.textContent = '';
      var ok = recEl.querySelector('[data-rec="ok"]'); if (ok) ok.style.display = 'none';
    });
  };
  function recSpeech(me){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { me.noSR = true; recPaint(); return; }
    var nav = (navigator.language || '').toLowerCase(), want = String(LOC || 'es').toLowerCase();
    var lang = nav.indexOf(want.slice(0, 2)) === 0 ? navigator.language : LOC;
    var start = function(){
      if (!me.live || REC !== me) return;
      var r = new SR();
      r.lang = lang; r.continuous = true; r.interimResults = true;
      r.onresult = function(ev){
        var mid = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) me.fin = (me.fin ? me.fin.replace(/ +$/, '') + ' ' : '') + t.trim();
          else mid += t;
        }
        me.mid = mid; recPaint();
      };
      r.onerror = function(ev){ if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture') { me.noSR = true; me.live = false; recPaint(); } };
      r.onend = function(){ if (me.mid) { me.fin = (me.fin ? me.fin + ' ' : '') + me.mid.trim(); me.mid = ''; } if (me.live && REC === me) setTimeout(start, 120); };   // Android la corta en las pausas
      me.sr = r;
      try { r.start(); } catch (e) { me.noSR = true; recPaint(); }
    };
    start();
  }
  function recClose(){
    if (!REC) return;
    var me = REC; REC = null;
    me.live = false;
    clearInterval(me.tick);
    try { me.sr && me.sr.abort(); } catch (e) {}
    try { me.stream && me.stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
    recEl.classList.remove('show'); document.body.classList.remove('recording');
    return me;
  }
  window.recCancel = function(){ var me = recClose(); if (me && me.mr && me.mr.state !== 'inactive') { me.mr.onstop = null; try { me.mr.stop(); } catch (e) {} } };
  window.recStop = function(){
    if (!REC) return;
    var me = REC, dur = (Date.now() - me.t0) / 1000;
    var text = (me.fin + (me.mid ? ' ' + me.mid : '')).trim();
    var finishIt = function(){
      if (!me.chunks.length) { showTip(${J('recNoMic')}); return; }
      var blob = new Blob(me.chunks, { type: (me.mr && me.mr.mimeType) || 'audio/webm' });
      var fr = new FileReader();
      audKeep(blob, function(src, aid){ recInsert(me, text, src, dur, blob, aid); });
    };
    if (me.mr && me.mr.state !== 'inactive') { me.mr.onstop = finishIt; try { me.mr.requestData(); } catch (e) {} me.mr.stop(); recClose(); }
    else { recClose(); finishIt(); }
  };
  /* Transcribir DESPUÉS de grabar (para Android, donde no se puede grabar y transcribir a la vez):
     el audio se convierte a WAV liviano (16 kHz, mono) en pedazos de 40 s y se manda a la IA gratis */
  /* 🧠 WHISPER dentro del teléfono: la IA que convierte voz a texto corre en el propio teléfono
     (en un "trabajador" aparte para no trabar la app). La primera vez descarga el modelo (~40 MB)
     y luego queda guardado en el teléfono: ya no necesita internet. */
  function audTo16k(blob){
    return blob.arrayBuffer().then(function(ab){
      var AC = window.AudioContext || window.webkitAudioContext;
      var ac = new AC();
      return new Promise(function(res, rej){ ac.decodeAudioData(ab, res, rej); }).then(function(buf){
        try { ac.close(); } catch (e) {}
        var len = Math.max(1, Math.ceil(buf.duration * 16000));
        var off = new OfflineAudioContext(1, len, 16000), src = off.createBufferSource();
        src.buffer = buf; src.connect(off.destination); src.start(0);
        return off.startRendering();
      });
    }).then(function(r){ return new Float32Array(r.getChannelData(0)); });
  }
  var WH = null;          // el trabajador de Whisper (se queda listo para la próxima grabación)
  function whisperWorker(){
    if (WH) return WH;
    var NL = String.fromCharCode(10);
    var code = [
      "import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';",
      "env.allowLocalModels = false;",
      "let asr = null;",
      "self.onmessage = async (e) => {",
      "  try {",
      "    if (!asr) asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { dtype: 'q8',",
      "      progress_callback: (p) => { if (p && p.status === 'progress') self.postMessage({ type: 'dl', file: p.file, progress: p.progress || 0 }); } });",
      "    self.postMessage({ type: 'run' });",
      "    const opt = { chunk_length_s: 30, stride_length_s: 5, task: 'transcribe', no_repeat_ngram_size: 4, max_new_tokens: 200 };",
      "    if (e.data.lang && e.data.lang !== 'auto') opt.language = e.data.lang;",
      "    const out = await asr(e.data.audio, opt);",
      "    self.postMessage({ type: 'done', id: e.data.id, text: (out && out.text) || '' });",
      "  } catch (err) { self.postMessage({ type: 'err', id: e.data.id, msg: String((err && err.message) || err) }); }",
      "};"
    ].join(NL);
    var url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    WH = { w: new Worker(url, { type: 'module' }), jobs: {}, n: 0, files: {} };
    WH.w.onmessage = function(ev){
      var m = ev.data || {};
      if (m.type === 'dl') {
        WH.files[m.file] = m.progress;
        var ks = Object.keys(WH.files), tot = 0; ks.forEach(function(k){ tot += WH.files[k]; });
        var pct = Math.round(tot / Math.max(1, ks.length));
        Object.keys(WH.jobs).forEach(function(k){ WH.jobs[k].prog && WH.jobs[k].prog(pct); });
      } else if (m.type === 'run') {
        Object.keys(WH.jobs).forEach(function(k){ WH.jobs[k].prog && WH.jobs[k].prog(-1); });
      } else if (m.type === 'done' || m.type === 'err') {
        var j = WH.jobs[m.id]; delete WH.jobs[m.id];
        if (j) { if (m.type === 'done') j.ok(m.text); else j.no(new Error(m.msg)); }
      }
    };
    WH.w.onerror = function(){ Object.keys(WH.jobs).forEach(function(k){ WH.jobs[k].no(new Error('worker')); }); WH.jobs = {}; WH = null; };
    return WH;
  }
  function audTranscribe(blob, prog, lang){
    return audTo16k(blob).then(function(audio){
      return new Promise(function(ok, no){
        var W = whisperWorker(), id = ++W.n;
        W.jobs[id] = { ok: ok, no: no, prog: prog };
        W.w.postMessage({ id: id, audio: audio, lang: lang }, [audio.buffer]);
      });
    });
  }
  // Whisper a veces se "atasca" repitiendo la misma palabra (four, four, four…): se quitan esas repeticiones
  function audClean(t){
    var w = String(t || '').split(' ').filter(Boolean);
    var nk = function(x){ return x.toLowerCase().replace(/[.,;:!?¡¿"'()…-]/g, ''); };
    for (var n = 1; n <= 6; n++) {
      var out = [], i = 0;
      while (i < w.length) {
        var reps = 1;
        if (i + n <= w.length) {
          var key = w.slice(i, i + n).map(nk).join(' ');
          while (i + (reps + 1) * n <= w.length && w.slice(i + reps * n, i + (reps + 1) * n).map(nk).join(' ') === key) reps++;
        }
        if (reps >= 3) { out = out.concat(w.slice(i, i + n)); i += reps * n; }
        else { out.push(w[i]); i++; }
      }
      w = out;
    }
    return w.join(' ');
  }
  /* Subir una nota de audio (WhatsApp, grabadora, etc.): se pone en la nota igual que una grabación y se transcribe */
  var audIn = document.createElement('input');
  audIn.type = 'file'; audIn.accept = 'audio/*,.opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.amr,.webm,.3gp';
  audIn.style.display = 'none'; document.body.appendChild(audIn);
  var audUpKeep = null;
  function audGuessType(f){
    if (f.type && f.type.indexOf('audio/') === 0) return f.type;
    var ext = String(f.name || '').split('.').pop().toLowerCase();
    return { opus: 'audio/ogg', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg',
      wav: 'audio/wav', webm: 'audio/webm', amr: 'audio/amr', '3gp': 'audio/3gpp' }[ext] || f.type || 'audio/mpeg';
  }
  audIn.addEventListener('change', function(){
    var f = audIn.files && audIn.files[0];
    audIn.value = '';
    if (!f) return;
    var me = { keep: audUpKeep }; audUpKeep = null;
    var blob = new Blob([f], { type: audGuessType(f) });
    showTip(${J('recWorking')});
    blob.arrayBuffer().then(function(buf){                     // se mide cuánto dura (y se comprueba que se puede abrir)
      var AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
      return new Promise(function(ok, no){ ac.decodeAudioData(buf, ok, no); })
        .then(function(b){ try { ac.close(); } catch (e) {} return b.duration; },
              function(e){ try { ac.close(); } catch (er) {} throw e; });
    }).then(function(dur){
      audKeep(blob, function(src, aid){ recInsert(me, '', src, dur, blob, aid); });
    }).catch(function(){ showTip(${J('recBadFile')}); });
  });
  window.audUpload = function(){ if (!editable) return; audUpKeep = null; audIn.click(); };
  function recInsert(me, text, src, dur, blob, aid){
    var wrap = document.createElement('div');
    wrap.innerHTML = audBlock(src, dur, aid, blob && blob.size);
    var block = wrap.firstChild;
    // se pone después de la línea donde estaba el cursor (o al final de la nota)
    var at = null;
    if (me.keep) { var n = me.keep.startContainer; while (n && n.parentNode !== ed) n = n.parentNode; at = n; }
    var frag = document.createDocumentFragment();
    var p = null;
    if (text) { p = document.createElement('div'); p.textContent = text; frag.appendChild(p); }
    else if (blob) {                                   // se transcribe con Whisper al terminar
      p = document.createElement('div'); p.className = 'audtx'; p.setAttribute('contenteditable', 'false');
      p.textContent = ${J('recWorking')}; frag.appendChild(p);
    }
    frag.appendChild(block);
    var after = document.createElement('div'); after.appendChild(document.createElement('br')); frag.appendChild(after);
    if (at && at.parentNode === ed) ed.insertBefore(frag, at.nextSibling); else ed.appendChild(frag);
    changedNow();
    showTip(${J('recSaved')});
    if (!text && blob && p) {
      audTranscribe(blob, function(pct){ /* progreso */
        if (!p.parentNode) return;
        p.textContent = pct >= 0 ? ${J('recDl')}.replace('{n}', pct) : ${J('recWorking')};
      }, recLang).then(function(t){
        t = audClean(t).trim();
        if (!p.parentNode) return;
        if (t) {
          var d = document.createElement('div'); d.textContent = t; p.parentNode.replaceChild(d, p);
          var ch = document.createElement('div'); ch.className = 'audpro'; ch.setAttribute('contenteditable', 'false');
          ch.innerHTML = '<button type="button">👔 ' + rwEsc(${J('audPro')}) + '</button>';
          d.parentNode.insertBefore(ch, d.nextSibling);
        }
        else { p.parentNode.removeChild(p); showTip(${J('recFail')}); }
        changedNow();
      }).catch(function(){ if (p.parentNode) p.parentNode.removeChild(p); changedNow(); showTip(${J('recFail')}); });
    }
    try { block.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }
  recEl.addEventListener('mousedown', function(e){ if (e.target.closest('button')) e.preventDefault(); });
  recEl.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) {                               // elegir idioma (se recuerda para la próxima)
      recLang = b.dataset.lang;
      try { localStorage.setItem('recLang', recLang); } catch (er) {}
      recEl.querySelectorAll('[data-lang]').forEach(function(x){ x.classList.toggle('on', x === b); });
      return;
    }
    if (b.dataset.rec === 'up') { audUpKeep = REC ? REC.keep : null; window.recCancel(); audIn.click(); return; }
    if (b.dataset.rec === 'ok') window.recStop(); else window.recCancel();
  });
  window.recOpen = function(){ return !!REC; };
  var RW = { range: null, text: '', style: null, req: 0, out: '' };
  var rwChip = $('rwChip'), rwBox = $('rw'), rwEl = $('rwIn');   // la caja no se mueve; lo de adentro se desliza
  var RW_STYLES = [
    ['syn', '📖', ${J('rwSyn')}], ['pro', '💼', ${J('rwPro')}], ['formal', '🎩', ${J('rwFormal')}], ['fix', '✅', ${J('rwFix')}],
    ['report', '📋', ${J('wReport')}], ['email', '✉️', ${J('wEmail')}], ['chat', '💬', ${J('wChat')}], ['english', '🇺🇸', ${J('wEnglish')}],
    ['steps', '🔧', ${J('wSteps')}], ['biz', '📈', ${J('rwBiz')}], ['clear', '💡', ${J('rwClear')}], ['short', '✂️', ${J('rwShort')}],
    ['long', '📝', ${J('rwLong')}], ['friendly', '😊', ${J('rwFriendly')}], ['persuasive', '🎯', ${J('rwPersuasive')}], ['funny', '😂', ${J('rwFunny')}],
    ['emoji', '🤩', ${J('rwEmoji')}], ['translate', '🌍', ${J('rwTranslate')}]
  ];
  /* 👔 Asistente de trabajo: trabaja con TODA la nota */
  var WORK_STYLES = [
    ['report', '📋', ${J('wReport')}], ['pronote', '👔', ${J('wPro')}], ['email', '✉️', ${J('wEmail')}],
    ['chat', '💬', ${J('wChat')}], ['english', '🇺🇸', ${J('wEnglish')}], ['todo', '✅', ${J('wTodo')}],
    ['summary', '📌', ${J('wSummary')}], ['steps', '🔧', ${J('wSteps')}], ['fix', '✏️', ${J('rwFix')}]
  ];
  var WK_EXTRA = ['formal', 'biz', 'clear', 'short', 'long', 'friendly', 'persuasive', 'funny', 'emoji', 'translate'];
  function rwLabel(st){
    var a = (RW.work ? WORK_STYLES : RW_STYLES).concat(RW_STYLES, WORK_STYLES).filter(function(s){ return s[0] === st; })[0];
    return a ? a[2] : '';
  }
  var LBL_EN = { report: 'Work report', pronote: 'Professional version', email: 'Email to my boss', chat: 'Message to coworkers', english: 'Polished English',
    todo: 'To-do list', summary: 'Short summary', steps: 'Step-by-step instructions', fix: 'Corrected', formal: 'Formal', pro: 'Professional', biz: 'Business',
    clear: 'Clearer', short: 'Shorter', long: 'Longer', friendly: 'Friendly', persuasive: 'Persuasive', funny: 'Funny', emoji: 'With emojis', translate: 'Translated' };
  var LBL_ES = { report: 'Reporte de trabajo', pronote: 'Versión profesional', email: 'Correo para mi jefe', chat: 'Mensaje para compañeros', english: 'Inglés profesional',
    todo: 'Pendientes', summary: 'Resumen corto', steps: 'Instrucciones paso a paso', fix: 'Corregido', formal: 'Formal', pro: 'Profesional', biz: 'Negocios',
    clear: 'Más claro', short: 'Más corto', long: 'Más largo', friendly: 'Amigable', persuasive: 'Persuasivo', funny: 'Chistoso', emoji: 'Con emojis', translate: 'Traducido' };
  function labelIn(st, cd){ return (cd === 'en' ? LBL_EN[st] : cd === 'es' ? LBL_ES[st] : null) || rwLabel(st); }
  function rwIco(st){ var a = RW_STYLES.concat(WORK_STYLES).filter(function(s){ return s[0] === st; })[0]; return a ? a[1] : '✨'; }
  /* Frases del día a día → cómo decirlas profesionalmente (para ir aprendiendo) */
  var PRO_TIPS = {
    es: [['arreglé', 'reparé / corregí'], ['no sirve', 'no funciona correctamente'], ['lo cambié', 'realicé el reemplazo de'], ['falta…', 'queda pendiente…'],
      ['ya quedó', 'quedó operativo y funcionando correctamente'], ['le avisé al jefe', 'informé al supervisor'], ['se dañó', 'sufrió una avería'],
      ['vamos a ver', 'daremos seguimiento'], ['chequeé', 'verifiqué / inspeccioné'], ['puse', 'instalé'], ['quité', 'retiré'],
      ['no pude porque…', 'no fue posible debido a…'], ['necesito…', 'se requiere…'], ['mañana lo termino', 'se completará mañana'],
      ['el cable está malo', 'el cableado presenta daños'], ['lo probé', 'realicé pruebas de funcionamiento'], ['el cliente quiere…', 'el cliente solicita…'],
      ['hubo un problema', 'se presentó un inconveniente'], ['lo dejé listo', 'quedó instalado y configurado'], ['me di cuenta de…', 'identifiqué…'],
      ['como dijimos', 'según lo acordado'], ['lo antes posible', 'a la mayor brevedad'], ['te mando…', 'le adjunto…'],
      ['gracias por todo', 'agradezco su apoyo'], ['dime si…', 'quedo atento a sus comentarios'], ['está trabado', 'presenta una obstrucción'],
      ['no prende', 'no enciende / no recibe energía'], ['lo moví', 'lo reubiqué'], ['está bien', 'se encuentra en buen estado'], ['ojo con…', 'se recomienda precaución con…']],
    en: [['fixed it', 'resolved the issue'], ['it’s broken', 'it is not functioning properly'], ['swapped out', 'replaced'], ['still need…', 'pending…'],
      ['all good now', 'fully operational'], ['told the boss', 'notified the supervisor'], ['checked', 'inspected / verified'], ['put in', 'installed'],
      ['took out', 'removed'], ['couldn’t because…', 'was unable to due to…'], ['need…', 'require…'], ['will finish tomorrow', 'will be completed tomorrow'],
      ['tested it', 'performed functional testing'], ['customer wants…', 'the client requested…'], ['there was a problem', 'an issue occurred'],
      ['ASAP', 'at your earliest convenience'], ['let me know', 'please advise'], ['as we said', 'as agreed'], ['found out', 'identified'],
      ['here’s…', 'please find attached…'], ['won’t turn on', 'does not power on'], ['moved it', 'relocated it'], ['heads up', 'please note']]
  };
  var tipList = PRO_TIPS[String(LOC).slice(0, 2)] || null, tipI = Math.floor(Math.random() * 1000);
  function tipHtml(){
    if (!tipList) return '';
    var t = tipList[tipI % tipList.length];
    return '<div class="rwTip"><div><small>💡 ' + rwEsc(${J('wTip')}) + '</small><s>' + rwEsc(t[0]) + '</s> → <b>' + rwEsc(t[1]) + '</b></div><button data-rw="tip">' + rwEsc(${J('wAnother')}) + '</button></div>';
  }
  /* El texto de la nota, renglón por renglón (sin audios ni fotos) */
  function noteText(){
    var out = [];
    Array.prototype.forEach.call(ed.childNodes, function(n){
      if (n.nodeType === 3) { if (n.data.trim()) out.push(n.data.trim()); return; }
      if (n.nodeType !== 1 || (n.matches && n.matches('.audwrap,.vidwrap,.imgwrap,.audtx,.audpro'))) return;
      var t = (n.innerText || n.textContent || '');
      if (n.tagName === 'UL' || n.tagName === 'OL') {
        t = Array.prototype.map.call(n.children, function(li){ return '- ' + (li.innerText || li.textContent || '').trim() + (li.classList.contains('done') ? ' (✓)' : ''); }).join('\\n');
      }
      t = t.replace(/​/g, '').trim();
      if (t) out.push(t);
    });
    return out.join('\\n');
  }
  window.workOpen = function(){
    if (!editable) return;
    if (dirty) changedNow();
    var t = noteText();
    if (t.replace(/\\s+/g, '').length < 3) { showTip(${J('wEmpty')}); return; }
    RW.work = true; RW.tpl = false; RW.text = t; RW.range = null;
    rwChip.classList.remove('show');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    closePanels(); document.body.classList.add('rw');
    workShow();
  };
  function workShow(){
    rwEl.innerHTML = rwHead(${J('workTitle')}) + '<div class="rwHint">' + rwEsc(${J('wHint')}) + '</div>' + tipHtml() +
      '<div class="rwGrid">' + WORK_STYLES.map(function(s){ return '<button class="rwOpt" data-style="' + s[0] + '"><b>' + s[1] + '</b>' + rwEsc(s[2]) + '</button>'; }).join('') + '</div>' +
      '<div class="rwSec">✨ ' + rwEsc(${J('rwTitle')}) + '</div>' +
      '<div class="rwGrid many">' + RW_STYLES.filter(function(s){ return WK_EXTRA.indexOf(s[0]) >= 0; }).map(function(s){ return '<button class="rwOpt" data-style="' + s[0] + '"><b>' + s[1] + '</b>' + rwEsc(s[2]) + '</button>'; }).join('') + '</div>';
    rwBox.classList.add('show');
    send({ type: 'rwOpen', open: true });
  }
  /* Convertir el texto de la IA en renglones de la nota (títulos en negrita, viñetas, listas) */
  function wkClean(l){ return l.replace(/\\*\\*/g, '').replace(/^#+\\s*/, '').replace(/^__|__$/g, ''); }
  function wkFrag(text, style){
    var f = document.createDocumentFragment(), lines = String(text).split('\\n'), list = null, blank = false;
    if (style === 'todo') {
      var ul = document.createElement('ul'); ul.className = 'checklist';
      lines.forEach(function(l){
        l = wkClean(l).replace(/^\\s*([-•*–]|\\d+[.)]|\\[ ?x? ?\\]|☐|□)\\s*/i, '').trim();
        if (!l) return;
        var li = document.createElement('li'); li.textContent = l; ul.appendChild(li);
      });
      f.appendChild(ul); return f;
    }
    lines.forEach(function(raw){
      var l = raw.replace(/\\s+$/, '');
      if (!l.trim()) { list = null; if (!blank && f.lastChild) { var e = document.createElement('div'); e.appendChild(document.createElement('br')); f.appendChild(e); } blank = true; return; }
      blank = false;
      var bul = l.match(/^\\s*[-•*–]\\s+(.*)$/), num = l.match(/^\\s*\\d+[.)]\\s+(.*)$/);
      if (bul || num) {
        var tag = bul ? 'UL' : 'OL';
        if (!list || list.tagName !== tag) { list = document.createElement(tag); f.appendChild(list); }
        var li = document.createElement('li'); li.textContent = wkClean((bul || num)[1]); list.appendChild(li); return;
      }
      list = null;
      var d = document.createElement('div'), clean = wkClean(l).trim();
      var isHead = /^\\s*(#+\\s|\\*\\*.+\\*\\*:?\\s*$)/.test(l) || (clean.length < 48 && /:$/.test(clean));
      if (isHead) { var b = document.createElement('b'); b.textContent = clean; d.appendChild(b); }
      else {
        var m = clean.match(/^([^:]{2,30}):\\s+(.+)$/);                // "Ubicación: Hospital…" → la etiqueta en negrita
        if (m && /\\*\\*/.test(l)) { var b2 = document.createElement('b'); b2.textContent = m[1] + ':'; d.appendChild(b2); d.appendChild(document.createTextNode(' ' + m[2])); }
        else d.textContent = clean;
      }
      f.appendChild(d);
    });
    while (f.lastChild && f.lastChild.nodeName === 'DIV' && !f.lastChild.textContent) f.removeChild(f.lastChild);
    return f;
  }
  function wkAppend(){
    if (!RW.out) return;
    var sp = document.createElement('div'); sp.appendChild(document.createElement('br'));
    var hd = document.createElement('div'), hb = document.createElement('b');
    var hl = !RW.dual ? rwLabel(RW.style) : RW.tab === 2 ? labelIn(RW.style, DUAL[0]) + ' / ' + labelIn(RW.style, DUAL[1]) : labelIn(RW.style, DUAL[RW.tab]);
    hb.textContent = rwIco(RW.style) + ' ' + hl; hd.appendChild(hb);
    var frag = document.createDocumentFragment();
    if (ed.textContent.trim() || ed.querySelector('.audwrap,.vidwrap,.imgwrap')) frag.appendChild(sp);
    frag.appendChild(hd);
    frag.appendChild(wkFrag(RW.out, RW.style));
    var first = frag.firstChild;
    ed.appendChild(frag);
    rwClose();
    changedNow();
    showTip(${J('rwDone')});
    try { (first.nodeType === 1 ? first : hd).scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
  }
  function wkReplace(){                                   // el texto de la nota se cambia por el resultado; fotos y audios se quedan
    if (!RW.out) return;
    Array.prototype.slice.call(ed.childNodes).forEach(function(n){
      if (n.nodeType === 1 && n.matches && n.matches('.audwrap,.vidwrap,.imgwrap')) return;
      ed.removeChild(n);
    });
    ed.insertBefore(wkFrag(RW.out, RW.style), ed.firstChild);
    rwClose();
    changedNow();                                          // Deshacer lo regresa como estaba
    showTip(${J('rwDone')});
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
  function copyText(t){
    var ok = false;
    try {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      ok = document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
    if (!ok && navigator.clipboard) { try { navigator.clipboard.writeText(t).catch(function(){}); } catch (e) {} }
    send({ type: 'copyText', text: t });
    showTip(${J('wCopied')});
  }
  /* 📋 Plantillas para el trabajo */
  function tplNow(){ try { return new Date().toLocaleString(LOC, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return new Date().toLocaleString(); } }
  var TPL_TXT = {
    es: { date: 'Fecha', site: 'Sitio / Cliente', tech: 'Técnico', done: 'Trabajo realizado', mat: 'Materiales usados', prob: 'Problemas encontrados',
      pend: 'Pendientes', hours: 'Horas trabajadas', tnum: 'Ticket #', loc: 'Ubicación exacta (edificio / piso / cuarto)', req: 'Solicitado por',
      issue: 'Descripción del problema', diag: 'Diagnóstico', fix: 'Solución aplicada', status: 'Estado', st1: 'Resuelto', st2: 'Pendiente', st3: 'Requiere seguimiento',
      photos: 'Fotos (antes / después)', contact: 'Contacto en sitio', area: 'Área inspeccionada', exist: 'Equipos existentes', obs: 'Observaciones',
      rec: 'Recomendaciones', need: 'Materiales necesarios', proj: 'Proyecto', qty: 'Cant. — Material', who: 'Asistentes', topics: 'Temas', agree: 'Acuerdos',
      tasks: 'Tareas (responsable — fecha)', from: 'Entrega', to: 'Recibe', fin: 'Trabajos terminados', prog: 'En progreso', urgent: 'Pendientes urgentes',
      notes: 'Notas', when: 'Fecha y hora del incidente', where: 'Lugar', ppl: 'Personas involucradas', what: 'Qué pasó', act: 'Acciones tomadas',
      dmg: 'Daños', rep: 'Reportado a' },
    en: { date: 'Date', site: 'Site / Client', tech: 'Technician', done: 'Work performed', mat: 'Materials used', prob: 'Issues found',
      pend: 'Pending', hours: 'Hours worked', tnum: 'Ticket #', loc: 'Exact location (building / floor / room)', req: 'Requested by',
      issue: 'Problem description', diag: 'Diagnosis', fix: 'Solution applied', status: 'Status', st1: 'Resolved', st2: 'Pending', st3: 'Needs follow-up',
      photos: 'Photos (before / after)', contact: 'On-site contact', area: 'Area inspected', exist: 'Existing equipment', obs: 'Observations',
      rec: 'Recommendations', need: 'Materials needed', proj: 'Project', qty: 'Qty — Material', who: 'Attendees', topics: 'Topics', agree: 'Agreements',
      tasks: 'Tasks (owner — date)', from: 'Handed off by', to: 'Received by', fin: 'Completed work', prog: 'In progress', urgent: 'Urgent items',
      notes: 'Notes', when: 'Incident date and time', where: 'Location', ppl: 'People involved', what: 'What happened', act: 'Actions taken',
      dmg: 'Damage', rep: 'Reported to' }
  };
  function tplHtml(k){
    var T = TPL_TXT[String(LOC).slice(0, 2)] || TPL_TXT.en, E = function(x){ return rwEsc(x); };
    var F = function(e, l, v){ return '<div><b>' + e + ' ' + E(l) + ':</b>&nbsp;' + (v ? E(v) : '') + '</div>'; };
    var Hd = function(e, l){ return '<div><br></div><div><b>' + e + ' ' + E(l) + '</b></div>'; };
    var UL = '<ul><li><br></li></ul>', CK = '<ul class="checklist"><li><br></li></ul>';
    var d = tplNow();
    if (k === 'stamp') return '<div><b>🕒 ' + E(d) + '</b> — </div>';
    if (k === 'daily') return F('📅', T.date, d) + F('📍', T.site) + F('👷', T.tech) + Hd('🔧', T.done) + UL + Hd('📦', T.mat) + UL + Hd('⚠️', T.prob) + UL + Hd('✅', T.pend) + CK + '<div><br></div>' + F('⏱️', T.hours);
    if (k === 'ticket') return F('🎫', T.tnum) + F('📅', T.date, d) + F('📍', T.site) + F('🚪', T.loc) + F('🙋', T.req) + Hd('❗', T.issue) + '<div><br></div>' + Hd('🔍', T.diag) + '<div><br></div>' + Hd('🔧', T.fix) + '<div><br></div>' + Hd('📦', T.mat) + UL + Hd('📊', T.status) + '<ul class="checklist"><li>' + E(T.st1) + '</li><li>' + E(T.st2) + '</li><li>' + E(T.st3) + '</li></ul>' + Hd('📸', T.photos) + '<div><br></div>';
    if (k === 'survey') return F('📍', T.site) + F('📅', T.date, d) + F('🙋', T.contact) + F('🏢', T.area) + Hd('🧰', T.exist) + UL + Hd('👀', T.obs) + UL + Hd('💡', T.rec) + UL + Hd('📦', T.need) + CK;
    if (k === 'mat') return F('🏗️', T.proj) + F('📅', T.date, d) + Hd('📦', T.qty) + CK;
    if (k === 'meet') return F('📅', T.date, d) + F('👥', T.who) + Hd('🗒️', T.topics) + UL + Hd('🤝', T.agree) + UL + Hd('✅', T.tasks) + CK;
    if (k === 'shift') return F('📅', T.date, d) + F('👤', T.from) + F('👤', T.to) + Hd('✅', T.fin) + UL + Hd('⏳', T.prog) + UL + Hd('🚨', T.urgent) + CK + Hd('🗒️', T.notes) + '<div><br></div>';
    if (k === 'incident') return F('🕒', T.when, d) + F('📍', T.where) + F('👥', T.ppl) + Hd('❗', T.what) + '<div><br></div>' + Hd('🛠️', T.act) + UL + Hd('💥', T.dmg) + '<div><br></div>' + F('📣', T.rep);
    return '';
  }
  var TPLS = [['stamp', '🕒', ${J('tplStamp')}], ['daily', '📋', ${J('tplDaily')}], ['ticket', '🎫', ${J('tplTicket')}], ['survey', '🔍', ${J('tplSurvey')}],
    ['mat', '📦', ${J('tplMat')}], ['meet', '👥', ${J('tplMeet')}], ['shift', '🔄', ${J('tplShift')}], ['incident', '⚠️', ${J('tplIncident')}]];
  window.tplOpen = function(){
    if (!editable) return;
    if (dirty) changedNow();
    RW.work = false; RW.tpl = true; RW.range = null;
    rwChip.classList.remove('show');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    closePanels(); document.body.classList.add('rw');
    rwEl.innerHTML = rwHead(${J('tplTitle')}) + '<div class="tplList">' + TPLS.map(function(t){ return '<button data-tpl="' + t[0] + '"><b>' + t[1] + '</b>' + rwEsc(t[2]) + '</button>'; }).join('') + '</div>';
    rwBox.classList.add('show');
    send({ type: 'rwOpen', open: true });
  };
  function tplInsert(k){
    var html = tplHtml(k); if (!html) return;
    var empty = !ed.textContent.replace(/​/g, '').trim() && !ed.querySelector('.audwrap,.vidwrap,.imgwrap');
    var box = document.createElement('div'); box.innerHTML = html;
    var firstNew = box.firstChild;
    if (empty) ed.innerHTML = '';
    else if (k !== 'stamp') { var sp = document.createElement('div'); sp.appendChild(document.createElement('br')); ed.appendChild(sp); }
    while (box.firstChild) ed.appendChild(box.firstChild);
    if (!(ttl.innerText || '').trim() && k !== 'stamp') {
      var lbl = (TPLS.filter(function(t){ return t[0] === k; })[0] || [])[2] || '';
      ttl.textContent = lbl;
    }
    rwClose();
    changedNow();
    showTip(${J('tplAdded')});
    // el cursor queda en el primer espacio para escribir
    try {
      var target = firstNew && firstNew.nodeType === 1 ? firstNew : ed.lastChild;
      ed.focus();
      var r = document.createRange(); r.selectNodeContents(target); r.collapse(false);
      var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r);
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (e) {}
  }
  function rwEsc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rwSelRange(){
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    if (!(ed.contains(r.commonAncestorContainer) || ttl.contains(r.commonAncestorContainer))) return null;
    var t = sel.toString();
    if (t.replace(/\\s+/g, '').length < 2) return null;
    return r;
  }
  function rwPlaceChip(){
    if (!editable || document.querySelector('.panel.show') || (typeof SP !== 'undefined' && SP.on) || ieOn()) { rwChip.classList.remove('show'); return; }
    var r = rwSelRange();
    if (!r) { rwChip.classList.remove('show'); return; }
    var b = r.getBoundingClientRect();
    var y = b.bottom + 14;
    var dock = document.getElementById('dock'), lim = window.innerHeight - ((dock && dock.offsetHeight) || 100) - 70;
    if (y > lim) y = Math.max(70, b.top - 56);                     // si no cabe abajo, va arriba
    var x = Math.max(80, Math.min(window.innerWidth - 80, b.left + b.width / 2));
    rwChip.style.left = (x + window.scrollX) + 'px';
    rwChip.style.top = (y + window.scrollY) + 'px';
    rwChip.classList.add('show');
  }
  var rwT = null;
  document.addEventListener('selectionchange', function(){ clearTimeout(rwT); rwT = setTimeout(rwPlaceChip, 180); });
  window.addEventListener('scroll', function(){ if (rwChip.classList.contains('show')) rwPlaceChip(); }, { passive: true });
  rwChip.addEventListener('pointerdown', function(e){ e.preventDefault(); });           // no perder la selección
  rwChip.addEventListener('click', function(){
    var r = rwSelRange(); if (!r) return;
    RW.range = r.cloneRange(); RW.text = window.getSelection().toString();
    rwChip.classList.remove('show');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // bajar el teclado
    closePanels(); document.body.classList.add('rw');
    rwShowStyles();
  });
  function rwHead(title){ return '<div class="rwHead"><div class="pleft"><button class="pback" data-rw="x" aria-label="back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><span>✨ ' + rwEsc(title) + '</span></div><button class="pclose" data-rw="x">' + rwEsc(${J('done')}) + '</button></div>'; }
  function rwShowStyles(){
    if (RW.work) { workShow(); return; }
    if (RW.tpl) { window.tplOpen(); return; }
    rwEl.innerHTML = rwHead(${J('rwTitle')}) + '<div class="rwOrig">“' + rwEsc(RW.text.slice(0, 220)) + (RW.text.length > 220 ? '…' : '') + '”</div>' +
      '<div class="rwGrid many">' + RW_STYLES.map(function(s){ return '<button class="rwOpt" data-style="' + s[0] + '"><b>' + s[1] + '</b>' + rwEsc(s[2]) + '</button>'; }).join('') + '</div>';
    rwBox.classList.add('show');
    send({ type: 'rwOpen', open: true });
  }
  /* 🇪🇸🇺🇸 Cada resultado sale en dos idiomas: el de la app y el inglés (si la app está en inglés: inglés y español) */
  var DUAL = (function(){ var b = String(LOC || 'es').slice(0, 2).toLowerCase(); return b === 'en' ? ['es', 'en'] : [b, 'en']; })();
  var NO_DUAL = { syn: 1, english: 1, translate: 1 };
  function langName(cd){
    if (cd === 'es') return '🇪🇸 Español';
    if (cd === 'en') return '🇺🇸 English';
    try { var n = new Intl.DisplayNames([cd], { type: 'language' }).of(cd); return n.charAt(0).toUpperCase() + n.slice(1); } catch (e) { return cd.toUpperCase(); }
  }
  try { RW.tab = +(localStorage.getItem('rwTab') || 0) || 0; } catch (e) { RW.tab = 0; }
  /* ✍️ Cambiar el texto EN SU LUGAR: cada pedacito de texto se reescribe donde está,
     así las fotos, audios, colores y el orden de la nota no se mueven */
  var INPLACE = { pronote: 1, fix: 1, formal: 1, biz: 1, clear: 1, friendly: 1, persuasive: 1, funny: 1, emoji: 1, translate: 1, english: 1 };
  function wkSegs(){
    var segs = [], b = -1;
    Array.prototype.forEach.call(ed.children, function(top){
      if (top.matches('.audwrap,.vidwrap,.imgwrap,.audtx,.audpro')) return;
      var blocks = (top.tagName === 'UL' || top.tagName === 'OL') ? Array.prototype.slice.call(top.children) : [top];
      blocks.forEach(function(blk){
        b++;
        var tw = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT, null), n;
        while ((n = tw.nextNode())) {
          if (n.parentNode.closest && n.parentNode.closest('.audwrap,.vidwrap,.imgwrap,.audpro,.audtx')) continue;
          var d = n.data.replace(/\\u200B/g, '');
          if (!/[0-9A-Za-z\\u00C0-\\u1FFF\\u3000-\\uD7FF\\uF900-\\uFFEF]/.test(d)) continue;   // solo signos o emojis: se deja igual
          var m = d.match(/^(\\s*)([\\s\\S]*?)(\\s*)$/);
          segs.push({ n: n, b: b, lead: m[1], core: m[2], trail: m[3] });
        }
      });
    });
    return segs;
  }
  function pcParse(raw){
    if (!raw || !RW.segs) return null;
    var arr = new Array(RW.segs.length), got = 0, cur = -1;
    String(raw).split('\\n').forEach(function(l){
      var m = l.match(/^\\s*\\[(\\d+)\\]\\s?(.*)$/);
      if (m) { cur = +m[1] - 1; if (cur >= 0 && cur < arr.length) { if (arr[cur] == null) got++; arr[cur] = m[2].trim(); } else cur = -1; }
      else if (cur >= 0 && l.trim()) arr[cur] = (arr[cur] ? arr[cur] + ' ' : '') + l.trim();
    });
    return got >= Math.max(1, Math.ceil(arr.length * 0.6)) ? arr : null;
  }
  function pcText(arr){
    var out = [], lastB = null;
    RW.segs.forEach(function(sg, i){
      var v = arr[i] != null ? arr[i] : sg.core;
      if (sg.b !== lastB) { out.push(v); lastB = sg.b; }
      else out[out.length - 1] += ' ' + v;
    });
    return out.join('\\n');
  }
  function pcShow(raw){                                     // lo que se ve en el panel (texto normal, no numerado)
    if (!RW.inplace) return raw;
    var a = pcParse(raw);
    return a ? pcText(a) : raw;
  }
  function wkInPlace(){
    var arr = pcParse(RW.tab === 1 && RW.dual ? RW.outs[1] : RW.dual ? RW.outs[0] : RW.raw);
    if (!arr) return;
    RW.segs.forEach(function(sg, i){
      if (!sg.n.parentNode || arr[i] == null) return;
      sg.n.data = sg.lead + arr[i] + sg.trail;
    });
    rwClose();
    changedNow();                                           // Deshacer lo regresa como estaba
    showTip(${J('rwDone')});
  }
  function rwAsk(style){
    RW.style = style; RW.req++; RW.out = '';
    RW.inplace = false; RW.sendText = RW.text;
    if (RW.work && INPLACE[style]) {
      RW.segs = wkSegs();
      if (RW.segs.length) {
        RW.inplace = true;
        RW.sendText = RW.segs.map(function(sg, i){ return '[' + (i + 1) + '] ' + sg.core.replace(/\\s+/g, ' '); }).join('\\n');
      }
    }
    RW.dual = !NO_DUAL[style]; RW.outs = [null, null]; RW.errs = [false, false];
    var lbl = rwLabel(style);
    rwEl.innerHTML = rwHead(lbl) + '<div class="rwWait"><div class="rwDots"><i></i><i></i><i></i></div>' + rwEsc(${J('rwWorking')}) + '</div>';
    if (RW.dual) {
      RW.first = RW.tab === 1 ? 1 : 0;                       // primero el idioma que estás mirando; el otro se traduce de ese mismo resultado
      send({ type: 'rewrite', req: RW.req, style: style, text: RW.sendText, lang: DUAL[RW.first], slot: RW.first, pieces: RW.inplace });
    } else send({ type: 'rewrite', req: RW.req, style: style, text: RW.sendText, pieces: RW.inplace });
  }
  function rwButtons(){
    if (RW.work) return '<div class="rwRow">' +
        (RW.canRep ? '<button class="main" data-rw="wrep">🔄 ' + rwEsc(${J('wReplace')}) + '</button>' : '') +
        '<button' + (RW.canRep ? '' : ' class="main"') + ' data-rw="append">⬇️ ' + rwEsc(${J('wAppend')}) + '</button></div>' +
      '<div class="rwRow"><button data-rw="copy">📋 ' + rwEsc(${J('wCopy')}) + '</button><button data-rw="share">📤 ' + rwEsc(${J('wShare')}) + '</button></div>';
    return '<div class="rwRow"><button class="main" data-rw="replace">' + rwEsc(${J('rwReplace')}) + '</button>' +
      '<button data-rw="insert">' + rwEsc(${J('rwInsert')}) + '</button></div>' +
      '<div class="rwRow"><button data-rw="copy">📋 ' + rwEsc(${J('wCopy')}) + '</button><button data-rw="share">📤 ' + rwEsc(${J('wShare')}) + '</button></div>';
  }
  function rwRenderDual(){
    var lbl = rwLabel(RW.style), o = RW.outs, t = RW.tab;
    var tabs = '<div class="rwTabs">' + [langName(DUAL[0]), langName(DUAL[1]), '🔀 ' + ${J('wBoth')}].map(function(n, i){
      return '<button data-tab="' + i + '"' + (i === t ? ' class="on"' : '') + '>' + rwEsc(n) + '</button>'; }).join('') + '</div>';
    var txt = t === 2 ? (o[0] && o[1] ? langName(DUAL[0]) + ':\\n' + pcShow(o[0]) + '\\n\\n' + langName(DUAL[1]) + ':\\n' + pcShow(o[1]) : null) : (o[t] ? pcShow(o[t]) : null);
    RW.canRep = RW.inplace && t !== 2 && !!pcParse(o[t]);
    var err = t === 2 ? (RW.errs[0] || RW.errs[1]) : RW.errs[t];
    RW.out = txt || '';
    var body = txt ? '<div class="rwOut">' + rwEsc(txt) + '</div>' + rwButtons()
      : err ? '<div class="rwErr">' + rwEsc(${J('rwFail')}) + '</div>'
      : '<div class="rwWait"><div class="rwDots"><i></i><i></i><i></i></div>' + rwEsc(${J('rwWorking')}) + '</div>';
    rwEl.innerHTML = rwHead(lbl) + tabs + body +
      '<div class="rwRow"><button data-rw="back">← ' + rwEsc(${J('rwStyles')}) + '</button><button data-rw="again">↻ ' + rwEsc(${J('rwAgain')}) + '</button></div>';
  }
  window.rewriteResult = function(res){
    if (!res || res.req !== RW.req || !rwBox.classList.contains('show')) return;
    if (RW.dual) {
      if (res.dual) {
        if (!res.ok) { RW.errs = [true, true]; rwRenderDual(); return; }
        [0, 1].forEach(function(i){
          if (res.outs && res.outs[i]) RW.outs[i] = res.outs[i];
          else {                                              // si una versión no llegó, se pide sola
            RW.outs[i] = null;
            send({ type: 'rewrite', req: RW.req, style: RW.style, text: RW.sendText, lang: DUAL[i], slot: i, pieces: RW.inplace });
          }
        });
      } else {
        var sl = res.slot === 1 ? 1 : 0, other = 1 - sl;
        if (res.ok && res.text) {
          RW.outs[sl] = res.text;
          if (sl === RW.first && RW.outs[other] == null && !RW.errs[other])
            send({ type: 'rewrite', req: RW.req, style: 'xlate', text: res.text, lang: DUAL[other], slot: other, pieces: RW.inplace });
        } else {
          RW.errs[sl] = true;
          if (sl === RW.first) RW.errs[other] = true;          // sin el primero no hay qué traducir
        }
      }
      rwRenderDual();
      return;
    }
    var lbl = rwLabel(RW.style);
    if (!res.ok || !res.text) {
      rwEl.innerHTML = rwHead(lbl) + '<div class="rwErr">' + rwEsc(${J('rwFail')}) + '</div>' +
        '<div class="rwRow"><button data-rw="back">←</button><button class="main" data-rw="again">' + rwEsc(${J('rwAgain')}) + '</button></div>';
      return;
    }
    RW.out = res.text;
    if (RW.style === 'syn' && !RW.work) {                    // 📖 palabras formales: se elige una
      RW.syn = res.text.split('\\n').map(function(l){ return wkClean(l).replace(/^\\s*([-•*–]|\\d+[.)])\\s*/, '').replace(/^["“”']+|["“”'.]+$/g, '').trim(); })
        .filter(function(l){ return l && l.length < 80; }).slice(0, 10);
      rwEl.innerHTML = rwHead(lbl) + '<div class="rwOrig">“' + rwEsc(RW.text.slice(0, 120)) + '”</div><div class="rwHint">' + rwEsc(${J('rwSynPick')}) + '</div>' +
        '<div class="synList">' + RW.syn.map(function(w, i){ return '<button data-syn="' + i + '">' + rwEsc(w) + '</button>'; }).join('') + '</div>' +
        '<div class="rwRow"><button data-rw="back">← ' + rwEsc(${J('rwStyles')}) + '</button><button data-rw="again">↻ ' + rwEsc(${J('rwAgain')}) + '</button></div>';
      return;
    }
    if (RW.work) {
      RW.raw = res.text; RW.out = pcShow(res.text); RW.canRep = RW.inplace && !!pcParse(res.text);
      rwEl.innerHTML = rwHead(lbl) + '<div class="rwOut">' + rwEsc(RW.out) + '</div>' + rwButtons() +
        '<div class="rwRow"><button data-rw="back">← ' + rwEsc(${J('rwStyles')}) + '</button><button data-rw="again">↻ ' + rwEsc(${J('rwAgain')}) + '</button></div>';
      return;
    }
    rwEl.innerHTML = rwHead(lbl) + '<div class="rwOut">' + rwEsc(res.text) + '</div>' +
      '<div class="rwRow"><button class="main" data-rw="replace">' + rwEsc(${J('rwReplace')}) + '</button>' +
      '<button data-rw="insert">' + rwEsc(${J('rwInsert')}) + '</button></div>' +
      '<div class="rwRow"><button data-rw="back">← ' + rwEsc(${J('rwStyles')}) + '</button><button data-rw="again">↻ ' + rwEsc(${J('rwAgain')}) + '</button></div>';
  };
  function rwClose(){
    rwBox.classList.remove('show'); document.body.classList.remove('rw');
    RW.req++; RW.range = null; RW.work = false; RW.tpl = false;
    send({ type: 'rwOpen', open: false });
  }
  window.rewriteClose = function(){ if (rwBox.classList.contains('show')) { rwClose(); return true; } return false; };
  function rwFrag(text){
    var f = document.createDocumentFragment(), lines = text.split('\\n');
    lines.forEach(function(l, i){ if (i) f.appendChild(document.createElement('br')); if (l) f.appendChild(document.createTextNode(l)); });
    return f;
  }
  function rwPut(mode){
    var r = RW.range; if (!r || !RW.out) return;
    if (mode === 'replace') {
      r.deleteContents();
      var last = rwFrag(RW.out), lastNode = last.lastChild;
      r.insertNode(last);
      if (lastNode) { var nr = document.createRange(); nr.setStartAfter(lastNode); nr.collapse(true); saved = nr; }
    } else {
      // debajo: en una línea nueva después del bloque donde termina la selección
      var n = r.endContainer; while (n && n.parentNode !== ed && n !== ed) n = n.parentNode;
      var d = document.createElement('div'); d.appendChild(rwFrag(RW.out));
      if (n && n !== ed && n.parentNode === ed) ed.insertBefore(d, n.nextSibling); else ed.appendChild(d);
    }
    window.getSelection().removeAllRanges();
    rwClose();
    changedNow();                          // se guarda (y Deshacer lo regresa)
    showTip(${J('rwDone')});
  }
  rwEl.addEventListener('pointerdown', function(e){ if (!e.target.closest('.rwOut')) e.preventDefault(); });
  rwEl.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.style) return rwAsk(b.dataset.style);
    if (b.dataset.tpl) return tplInsert(b.dataset.tpl);
    if (b.dataset.tab) { RW.tab = +b.dataset.tab; try { localStorage.setItem('rwTab', RW.tab); } catch (er) {} rwRenderDual(); return; }
    if (b.dataset.syn) { RW.out = RW.syn[+b.dataset.syn] || ''; return rwPut('replace'); }
    var a = b.dataset.rw;
    if (a === 'tip') { tipI++; var tp = rwEl.querySelector('.rwTip'); if (tp) tp.outerHTML = tipHtml(); return; }
    if (a === 'append') return wkAppend();
    if (a === 'wrep') return RW.inplace ? wkInPlace() : null;
    if (a === 'copy') return copyText(RW.out);
    if (a === 'share') { send({ type: 'shareOut', text: RW.out }); return; }
    if (a === 'x') rwClose();
    else if (a === 'back') rwShowStyles();
    else if (a === 'again') rwAsk(RW.style);
    else if (a === 'replace' || a === 'insert') rwPut(a);
  });
  /* =========================================================
     BORRAR TODO EL CONTENIDO (con animación suave)
     Las líneas se van desvaneciendo de abajo hacia arriba.
     Se guarda como un paso, así que Deshacer lo trae de vuelta.
     ========================================================= */
  var clearing = false;
  window.clearAll = function(){
    if (!editable || clearing) return;
    if (dirty) changedNow();
    if (SP.on) spClose();
    closePanels(); selectImg(null);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.getSelection().removeAllRanges();
    clearing = true;
    document.body.style.pointerEvents = 'none';
    // el texto suelto se envuelve para poder animarlo
    Array.prototype.slice.call(ed.childNodes).forEach(function(n){
      if (n.nodeType === 3) { if (!n.data.trim()) return; var sp = document.createElement('span'); sp.style.display = 'inline-block'; ed.insertBefore(sp, n); sp.appendChild(n); }
    });
    var items = Array.prototype.slice.call(ed.children).reverse();
    items.push(ttl);
    var step = Math.max(35, Math.min(90, 1100 / Math.max(1, items.length)));
    var inkEl = $('ink');
    if (inkEl) { inkEl.style.transition = 'opacity .6s ease'; inkEl.style.opacity = '0'; }
    items.forEach(function(el, k){
      setTimeout(function(){
        el.style.transition = 'opacity .32s ease, transform .32s ease, filter .32s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-18px) scale(.98)';
        el.style.filter = 'blur(2px)';
      }, k * step);
    });
    setTimeout(function(){
      ed.innerHTML = ''; ttl.innerHTML = '';
      ttl.style.transition = ttl.style.opacity = ttl.style.transform = ttl.style.filter = '';
      if (isDraw) { strokes = []; redraw(); }
      if (inkEl) { inkEl.style.transition = ''; inkEl.style.opacity = ''; }
      document.body.style.pointerEvents = '';
      clearing = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      changedNow();
      showTip(${J('noteCleared')});
    }, items.length * step + 360);
  };

  /* =========================================================
     DESHACER / REHACER: cada cambio (texto, formato, fotos,
     dibujo) se guarda como un paso. La app llama a undoNow()
     y redoNow() desde los botones de arriba.
     ========================================================= */
  var undoStack = [], redoStack = [], lastSnap = null, restoring = false, MAXSTEPS = 100;
  function snap(){
    return { h: cleanHtml(), t: ttl.innerHTML, k: isDraw ? JSON.stringify(strokes) : '' };
  }
  function sameSnap(a, b){ return a && b && a.h === b.h && a.t === b.t && a.k === b.k; }
  function notifyUndo(){ send({ type: 'undo', canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }); }
  function record(){
    if (restoring || !lastSnap) return;
    var s = snap();
    if (sameSnap(s, lastSnap)) return;
    undoStack.push(lastSnap);
    if (undoStack.length > MAXSTEPS) undoStack.shift();
    lastSnap = s;
    redoStack = [];
    notifyUndo();
  }
  function applySnap(s){
    restoring = true;
    selectImg(null); closePanels();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.getSelection().removeAllRanges();
    saved = null;
    ed.innerHTML = s.h;
    ttl.innerHTML = s.t;
    if (isDraw) { strokes = JSON.parse(s.k || '[]'); redraw(); }
    changedNow();
    restoring = false;
    notifyUndo();
  }
  window.undoNow = function(){
    if (dirty) changedNow();                     // guarda lo último que escribiste
    if (!undoStack.length) { showTip(${J('nothingUndo')}); return; }
    redoStack.push(lastSnap);
    lastSnap = undoStack.pop();
    applySnap(lastSnap);
    showTip(${J('undone')});
  };
  window.redoNow = function(){
    if (dirty) changedNow();
    if (!redoStack.length) { showTip(${J('nothingRedo')}); return; }
    undoStack.push(lastSnap);
    lastSnap = redoStack.pop();
    applySnap(lastSnap);
    showTip(${J('redone')});
  };
  lastSnap = snap();

  /* =========================================================
     CREAR PDF O IMAGEN "TAL COMO SE VE"
     Dibuja la nota (texto, fotos, dibujos y fondo) en un lienzo
     y arma un PDF de páginas tamaño carta/A4.
     ========================================================= */
  var JOB = ${safeJob};
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function loadImg(src){ return new Promise(function(res, rej){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = rej; im.src = src; }); }
  function xesc(t){ return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  /* Partes que no se deben cortar entre páginas (líneas de texto y fotos) */
  function blocks(){
    var out = [], sy = window.scrollY;
    [ttl, $('meta'), ed].forEach(function(root){
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, r = document.createRange();
      while ((n = w.nextNode())) {
        if (!n.data.trim()) continue;
        r.selectNodeContents(n);
        var rs = r.getClientRects();
        for (var i = 0; i < rs.length; i++) if (rs[i].height) out.push([rs[i].top + sy, rs[i].bottom + sy]);
      }
    });
    ed.querySelectorAll('.imgwrap, li').forEach(function(el){
      var q = el.getBoundingClientRect();
      if (el.tagName === 'LI') q = { top: q.top, bottom: Math.min(q.bottom, q.top + 40) };
      out.push([q.top + sy, q.bottom + sy]);
    });
    return out;
  }
  async function renderNote(n){
    ttl.innerHTML = n.t || '';
    ed.innerHTML = n.locked ? '<div>🔒 ' + xesc(n.lockedTxt || '') + '</div>' : (n.h || '');
    $('meta').textContent = modText(n.u || Date.now());
    strokes = n.locked ? [] : (n.k || []);
    await Promise.all(Array.prototype.map.call(document.querySelectorAll('#ed img'), function(im){
      return im.complete ? 0 : new Promise(function(r){ im.onload = im.onerror = r; });
    }));
    await wait(60);
    var W = document.documentElement.clientWidth;
    var inkBottom = 0;
    strokes.forEach(function(st){ (st.p || []).forEach(function(pt){ inkBottom = Math.max(inkBottom, pt[1] * W + st.w * W); }); });
    var H = Math.ceil(Math.max(ed.offsetTop + ed.offsetHeight, inkBottom + 20));
    sizeInk(); redraw();
    // 1) el texto y las fotos, tal cual, usando el mismo estilo del editor
    var css = xesc(document.querySelector('style').textContent);
    var ser = new XMLSerializer();
    var body = ser.serializeToString(ttl) + ser.serializeToString($('meta')) + ser.serializeToString(ed);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + W + 'px;height:' + H + 'px;color:${c.text};font-family:-apple-system,Roboto,Segoe UI,sans-serif">' +
      '<style>' + css + '</style>' + body + '</div></foreignObject></svg>';
    var im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    var S = Math.min(2, 30000 / H);
    var big = document.createElement('canvas');
    big.width = Math.round(W * S); big.height = Math.round(H * S);
    var g = big.getContext('2d');
    g.drawImage(im, 0, 0, W * S, H * S);
    // 2) los dibujos encima
    var ih = parseFloat(ink.style.height) || H;
    g.drawImage(ink, 0, 0, ink.width, ink.height, 0, 0, W * S, ih * S);
    return { big: big, W: W, H: H, S: S, cuts: blocks() };
  }
  /* Fondo de la nota (color, foto de fondo con desenfoque y capa) */
  var bgCache = {};
  async function paintBg(g, w, h, bg){
    g.fillStyle = bg && bg.color || '${c.grad[0]}';
    g.fillRect(0, 0, w, h);
    if (!bg || !bg.img) return;
    try {
      var im = bgCache[bg.img] || (bgCache[bg.img] = await loadImg(bg.img));
      var sc = Math.max(w / im.width, h / im.height), dw = im.width * sc, dh = im.height * sc;
      g.save();
      if (bg.blur > 0) g.filter = 'blur(' + bg.blur * (w / 400) + 'px)';
      g.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      g.restore();
      if (bg.dim) { g.fillStyle = bg.dim; g.fillRect(0, 0, w, h); }
    } catch (e) {}
  }
  /* Cortar en páginas sin partir líneas ni fotos */
  function pageCuts(H, pageH, list){
    var cuts = [0], y = 0, guard = 0;
    while (H - y > pageH && guard++ < 500) {
      var avail = cuts.length > 1 ? pageH - 24 : pageH;
      var c = y + avail, moved = true;
      while (moved) {
        moved = false;
        for (var i = 0; i < list.length; i++) {
          var b = list[i];
          if (b[0] < c && b[1] > c && b[0] > y + avail * 0.25) { c = b[0] - 2; moved = true; }
        }
      }
      cuts.push(c); y = c;
    }
    cuts.push(H);
    return cuts;
  }
  function jpegBin(cv){ return atob(cv.toDataURL('image/jpeg', 0.88).split(',')[1]); }
  /* PDF hecho a mano: una foto por página */
  function buildPdf(pages){
    var PW = 595.28, PH = 841.89, out = '%PDF-1.4\\n%\\xE2\\xE3\\xCF\\xD3\\n', offs = [];
    function obj(n, body){ offs[n] = out.length; out += n + ' 0 obj\\n' + body + '\\nendobj\\n'; }
    var kids = [];
    pages.forEach(function(p, i){ kids.push((3 + i * 3) + ' 0 R'); });
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages.length + ' >>');
    pages.forEach(function(p, i){
      var pn = 3 + i * 3, cn = pn + 1, xn = pn + 2;
      obj(pn, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im' + i + ' ' + xn + ' 0 R >> >> /Contents ' + cn + ' 0 R >>');
      var cs = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im' + i + ' Do Q';
      obj(cn, '<< /Length ' + cs.length + ' >>\\nstream\\n' + cs + '\\nendstream');
      obj(xn, '<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.d.length + ' >>\\nstream\\n' + p.d + '\\nendstream');
    });
    var n = 3 + pages.length * 3, xref = out.length;
    out += 'xref\\n0 ' + n + '\\n0000000000 65535 f \\n';
    for (var k = 1; k < n; k++) out += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \\n';
    out += 'trailer\\n<< /Size ' + n + ' /Root 1 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF';
    return btoa(out);
  }
  /* 🌐 Página con todo (texto, fotos, audios y videos) para enviar; se abre en cualquier teléfono */
  function blobToData(b){ return new Promise(function(ok, no){ var fr = new FileReader(); fr.onload = function(){ ok(String(fr.result)); }; fr.onerror = no; fr.readAsDataURL(b); }); }
  async function mediaSrc(el){
    var src = el.getAttribute('src') || '';
    if (/^blob:/.test(src)) src = '';
    if (!src && el.getAttribute('data-aid')) { try { src = await blobToData(await audGet(el.getAttribute('data-aid'))); } catch (e) {} }
    return src;
  }
  var PAGE_CSS = 'body{margin:0;background:#1c1c1e;color:#f2f2f2;font:17px/1.55 -apple-system,BlinkMacSystemFont,Roboto,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}' +
    'main{max-width:760px;margin:0 auto;padding:22px 16px 40px}h1.nt{font-size:28px;line-height:1.2;margin:6px 0 4px}.dt{color:#9a9a9f;font-size:13px;margin-bottom:18px}' +
    '.imgwrap{display:inline-block;max-width:100%;position:relative}.imgwrap img{display:block;width:100%;height:auto;border-radius:12px}.imgwrap svg.stamp{position:absolute;left:0;bottom:0;width:100%;height:auto;border-radius:0 0 12px 12px}' +
    '.vidwrap,.audwrap{margin:14px 0;clear:both}video{display:block;width:100%;max-height:80vh;border-radius:14px;background:#000}audio{width:100%}' +
    'ul.checklist{list-style:none;padding-left:4px}ul.checklist li::before{content:"☐ "}ul.checklist li.done::before{content:"☑ "}ul.checklist li.done{opacity:.6;text-decoration:line-through}' +
    'hr.sep{border:none;border-top:1px solid #3a3a3c;margin:30px 0}footer{color:#6e6e73;font-size:12px;text-align:center;margin-top:34px}a{color:#6ab0ff}';
  var PAGE_JS = 'document.querySelectorAll("video,audio").forEach(function(v){var s=v.getAttribute("src")||"";if(s.indexOf("data:")===0&&window.fetch&&window.URL){fetch(s).then(function(r){return r.blob()}).then(function(b){v.src=URL.createObjectURL(b)}).catch(function(){})}});';
  async function buildPage(){
    var parts = [];
    for (var i = 0; i < JOB.notes.length; i++) {
      var n = JOB.notes[i], box = document.createElement('div');
      if (n.locked) { parts.push('<section><h1 class="nt">' + (n.t || '') + '</h1><p>🔒 ' + xesc(n.lockedTxt || '') + '</p></section>'); continue; }
      box.innerHTML = n.h || '';
      Array.prototype.forEach.call(box.querySelectorAll('.audx,.audctl,.audpro,.audtx,.audp,.audbar,.audt,.vidbar,#rsz'), function(x){ x.parentNode && x.parentNode.removeChild(x); });
      var meds = box.querySelectorAll('.audwrap audio,.vidwrap video');
      for (var k = 0; k < meds.length; k++) {
        var el = meds[k], src = await mediaSrc(el), isV = el.tagName === 'VIDEO';
        var ne = document.createElement(isV ? 'video' : 'audio');
        ne.setAttribute('controls', ''); ne.setAttribute('preload', 'metadata');
        if (isV) ne.setAttribute('playsinline', '');
        if (src) ne.setAttribute('src', isV && src.indexOf('#') < 0 ? src : src);
        el.parentNode.replaceChild(ne, el);
      }
      Array.prototype.forEach.call(box.querySelectorAll('[contenteditable]'), function(x){ x.removeAttribute('contenteditable'); });
      Array.prototype.forEach.call(box.querySelectorAll('.imgwrap.sel'), function(x){ x.classList.remove('sel'); });
      parts.push('<section>' + (n.t ? '<h1 class="nt">' + n.t + '</h1>' : '') + '<div class="dt">' + xesc(fmtDate(n.u)) + '</div><div class="bd">' + box.innerHTML + '</div></section>');
    }
    var html = '<!DOCTYPE html><html lang="' + xesc(LOC) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + xesc(JOB.name) + '</title><style>' + PAGE_CSS + '</style></head><body><main>' + parts.join('<hr class="sep">') +
      '<footer>' + xesc(JOB.app || 'Mis Notas') + '</footer></main><script>' + PAGE_JS + '</scr' + 'ipt></body></html>';
    return { type: 'exported', kind: 'page', name: JOB.name + '.html', mime: 'text/html', text: html };
  }
  async function runExport(){
    if (JOB.kind === 'page') {
      try { send(await buildPage()); } catch (e) { send({ type: 'exported', error: String(e && e.message || e) }); }
      return;
    }
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      var pages = [], single = null;
      for (var i = 0; i < JOB.notes.length; i++) {
        var n = JOB.notes[i], R = await renderNote(n);
        var W = R.W, S = R.S;
        if (JOB.kind === 'img') {
          var cv = document.createElement('canvas');
          cv.width = R.big.width; cv.height = R.big.height;
          var g = cv.getContext('2d');
          await paintBg(g, cv.width, cv.height, n.bg);
          g.drawImage(R.big, 0, 0);
          single = cv.toDataURL('image/jpeg', 0.9).split(',')[1];
          break;
        }
        var pageH = Math.round(W * 841.89 / 595.28);
        var cuts = pageCuts(R.H, pageH, R.cuts);
        for (var k = 0; k < cuts.length - 1; k++) {
          var top = k ? 24 : 0, y0 = cuts[k], y1 = cuts[k + 1];
          var pc = document.createElement('canvas');
          pc.width = Math.round(W * S); pc.height = Math.round(pageH * S);
          var pg = pc.getContext('2d');
          await paintBg(pg, pc.width, pc.height, n.bg);
          pg.drawImage(R.big, 0, y0 * S, W * S, (y1 - y0) * S, 0, top * S, W * S, (y1 - y0) * S);
          pages.push({ w: pc.width, h: pc.height, d: jpegBin(pc) });
          await wait(0);
        }
      }
      if (JOB.kind === 'img') send({ type: 'exported', kind: 'img', name: JOB.name + '.jpg', mime: 'image/jpeg', b64: single });
      else send({ type: 'exported', kind: 'pdf', name: JOB.name + '.pdf', mime: 'application/pdf', b64: buildPdf(pages) });
    } catch (e) {
      send({ type: 'exported', error: String(e && e.message || e) });
    }
  }
  if (JOB) setTimeout(runExport, 150);
  notifyUndo();
  try { send({ type: 'ready' }); } catch (e) {}       // ya está listo: la app quita la vista previa rápida
</script></body></html>`;
}
