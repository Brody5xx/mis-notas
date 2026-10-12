# Mis Notas 🗒️

App de notas estilo Samsung Notes hecha con React Native / Expo, con diseño Liquid Glass.

## Cómo actualizar la app en Replit

Abre el **Shell** en Replit, pega este comando y presiona Enter:

```
curl -fsSL "https://raw.githubusercontent.com/Brody5xx/mis-notas/main/actualizar.sh?$(date +%s)" | sh
```

Luego detén la app (**Stop**) y dale **Run**.

## Archivos

- `App.js` — pantallas, notas, fondos y menú.
- `editor.js` + `editor-1.js` … `editor-4.js` — el editor (texto, fotos, recorte, dibujo).
- `actualizar.sh` — descarga la última versión a `artifacts/mobile`.
- `archivos.txt` — lista de archivos que descarga `actualizar.sh`.
