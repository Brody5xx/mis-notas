import { part1 } from './editor-1';
import { part2 } from './editor-2';
import { part3 } from './editor-3';
import { part4 } from './editor-4';

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

  const v = { c, chips, editable, glass, id, kind, safeContent, safeInk, safeTitle, swatches, updated };
  return (
    part1(v) +
    part2(v) +
    part3(v) +
    part4(v)
  );
}
