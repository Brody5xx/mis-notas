# Mis Notas 🗒️

App de notas estilo Samsung Notes hecha con React Native / Expo, con diseño Liquid Glass.

## Cómo actualizar la app en Replit

Abre el **Shell** en Replit, pega este comando y presiona Enter:

```
curl -fsSL "https://raw.githubusercontent.com/Brody5xx/mis-notas/main/actualizar.sh?$(date +%s)" | sh
```

Luego detén la app (**Stop**) y dale **Run**.

## Archivos

- `App.js` — pantallas, notas, carpetas, etiquetas, PIN, fondos y menú.
- `editor.js` — el editor (texto, listas, checklist, fotos, recorte, dibujo).
- `idiomas.js` — todos los textos de la app en 39 idiomas (se elige solo según el teléfono; se cambia en ☰ → Idioma).
- `reporte.js` — 📊 Reporte del día: junta las notas de un día y la IA arma un reporte de trabajo profesional (resumen, trabajo hecho, pendientes, materiales).
- `pendientes.js` — ✅ Pendientes: todas las casillas sin marcar de todas las notas en un solo lugar.
- `recordatorios.js` — ⏰ Recordatorios: avisos a una hora para una nota o un pendiente (expo-notifications).
- `translucido-plugin.js` — modo translúcido de Android (se usa al construir la app; `actualizar.sh` lo registra en `app.json`).
- `actualizar.sh` — descarga la última versión a `artifacts/mobile`.
- `archivos.txt` — lista de archivos que descarga `actualizar.sh`.
- `eliminar.txt` — archivos viejos que `actualizar.sh` borra.
