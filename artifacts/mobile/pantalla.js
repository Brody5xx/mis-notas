/* ============================================================
   pantalla.js — para que la app se acomode a cualquier teléfono
   · Espacios seguros: la barra de arriba (hora, cámara/notch) y
     la de abajo (gestos o botones ◁ ○ ▢) nunca tapan botones.
   · Letra del sistema: si la persona agranda la letra del
     teléfono, la app la agranda también, pero hasta un tope
     (FONT_MAX) para que nada se corte ni se salga de su lugar.
   ============================================================ */
import { useContext } from 'react';
import { PixelRatio } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

export const FONT_MAX = 1.3;

/* Cuánto espacio dejar arriba / abajo (0 si no se sabe) */
export function useInsets() {
  const i = useContext(SafeAreaInsetsContext);
  return i || { top: 0, bottom: 0, left: 0, right: 0 };
}

/* Zoom de letra para las páginas web de adentro (el editor de notas, la calculadora) */
export function webTextZoom() {
  let f = 1;
  try { f = PixelRatio.getFontScale() || 1; } catch (e) {}
  return Math.round(Math.max(1, Math.min(f, 1.2)) * 100);
}
