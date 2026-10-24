/* ============================================================
   medir.js — ⏱ MEDIR VELOCIDAD
   Anota con cronómetro lo que pasa en el teléfono (tocar, abrir,
   salir, guardar, cuándo la app se traba...) para saber EXACTAMENTE
   qué la pone lenta. Solo trabaja cuando lo activas en el menú.
   ============================================================ */
const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

export const PERF = { on: false, log: [], t0: 0 };
/* 🧪 Prueba automática: apaga UNA cosa a la vez para ver cuál traba al entrar */
export const LAB = { keepHome: 0, noChrome: 0, noFrame: 0, noBoot: 0 };
export const perfNow = () => now() - PERF.t0;
let stallTimer = null;

export function mark(ev, ms) {
  if (!PERF.on) return;
  PERF.log.push({ t: now() - PERF.t0, ev, ms: ms == null ? null : Math.round(ms) });
  if (PERF.log.length > 600) PERF.log.shift();
}
export function timed(ev, fn) {
  if (!PERF.on) return fn();
  const a = now();
  try { return fn(); } finally { const d = now() - a; if (d >= 4) mark(ev, d); }
}
export function perfStart() {
  PERF.on = true; PERF.log = []; PERF.t0 = now();
  let last = now();
  clearInterval(stallTimer);
  stallTimer = setInterval(() => {                       // si la app estuvo ocupada, este reloj llega tarde
    const n = now(), late = n - last - 50;
    if (late > 60) mark('⛔ APP TRABADA', late);
    last = n;
  }, 50);
}
export function perfStop() { PERF.on = false; clearInterval(stallTimer); stallTimer = null; }

/* Cuánto tarda en dibujarse la app completa cada vez que algo cambia */
let rs = 0;
export function renderStart() { if (PERF.on) rs = now(); }
export function renderEnd(what) { if (PERF.on && rs) { const d = now() - rs; rs = 0; if (d >= 8) mark('🎨 dibujar ' + what, d); } }

export function perfReport() {
  const L = PERF.log;
  const stalls = L.filter(x => x.ev.startsWith('⛔'));
  const draws = L.filter(x => x.ev.startsWith('🎨'));
  const sum = a => a.reduce((s, x) => s + (x.ms || 0), 0);
  const head = [
    '⏱ Best Notes — medición',
    'Eventos: ' + L.length + ' · Tiempo: ' + Math.round((L.length ? L[L.length - 1].t : 0) / 1000) + ' s',
    'Trabadas: ' + stalls.length + ' (total ' + sum(stalls) + ' ms, la peor ' + Math.max(0, ...stalls.map(x => x.ms || 0)) + ' ms)',
    'Dibujos: ' + draws.length + ' (total ' + sum(draws) + ' ms, el peor ' + Math.max(0, ...draws.map(x => x.ms || 0)) + ' ms)',
    '----------------------------------------',
  ];
  const lines = L.map(x => (x.t / 1000).toFixed(2).padStart(7) + 's  ' + x.ev + (x.ms != null ? '  ' + x.ms + ' ms' : ''));
  return head.concat(lines).join('\n');
}
