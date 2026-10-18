/* ============================================================
   matlista.js — lo que comparten la 📦 Lista de materiales,
   el 📊 Reporte del día y la pantalla principal:
   cómo se guarda la lista y cómo se agrupa por material.
   ============================================================ */
export const KEY = 'misnotas_materials';
export const DAY = 24 * 60 * 60 * 1000;
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9À-￿]+/g, ' ').trim().split(' ').map(w => (w.length <= 3 ? w : /(ch|sh|x|z|ss)es$/.test(w) ? w.slice(0, -2) : /[^s]s$/.test(w) ? w.slice(0, -1) : w)).join(' ');
export const esc = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Agrupar por material: total + detalle por sitio */
export function groupsOf(entries) {
  const map = {};
  entries.forEach(e => {
    const k = norm(e.item);
    if (!map[k]) map[k] = { key: k, item: e.item, entries: [] };
    map[k].entries.push(e);
  });
  return Object.values(map).map(g => {
    const nums = g.entries.map(e => e.qty).filter(q => typeof q === 'number' && isFinite(q));
    const st = g.entries.every(e => e.status === 'arrived') ? 'arrived' : g.entries.every(e => e.status !== 'pending') ? 'ordered' : 'pending';
    return { ...g, total: nums.reduce((a, b) => a + b, 0), allQty: nums.length === g.entries.length, unit: (g.entries.find(e => e.unit) || {}).unit || '', status: st,
      urgent: g.entries.some(e => e.urgent) };
  }).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.item.localeCompare(b.item));      // 🔴 urgentes primero
}
/* La lista guardada (para el reporte y la pantalla principal) */
export async function loadMaterials(AsyncStorage) {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]') || []; } catch (e) { return []; }
}
export const qtyTxt = g => (g.total ? (g.allQty ? g.total : g.total + '+') + ' × ' : '');

