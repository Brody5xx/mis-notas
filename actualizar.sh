#!/bin/sh
# ------------------------------------------------------------
# actualizar.sh — descarga la última versión de la app de notas
# desde GitHub y la pone en artifacts/mobile (donde vive la app).
# ------------------------------------------------------------
BASE="https://raw.githubusercontent.com/Brody5xx/mis-notas/main"
DIR="$HOME/workspace/artifacts/mobile"
T=$(date +%s)

cd "$DIR" || { echo "No encontré la carpeta $DIR"; exit 1; }

LISTA=$(curl -fsSL "$BASE/archivos.txt?t=$T") || { echo "No pude conectar con GitHub. Revisa tu internet."; exit 1; }

OK=0; MAL=0
for f in $LISTA; do
  if curl -fsSL "$BASE/$f?t=$T" -o "$f.tmp"; then
    mv "$f.tmp" "$f"; echo "  ✓ $f"; OK=$((OK+1))
  else
    rm -f "$f.tmp"; echo "  ✗ No se pudo descargar $f"; MAL=$((MAL+1))
  fi
done

# Archivos viejos que ya no se usan
VIEJOS=$(curl -fsSL "$BASE/eliminar.txt?t=$T" 2>/dev/null)
for f in $VIEJOS; do
  if [ -f "$f" ]; then rm -f "$f"; echo "  🗑  $f (ya no se usa)"; fi
done

echo ""
if [ "$MAL" -eq 0 ]; then
  echo "¡Listo! $OK archivos actualizados. Ahora abre la app."
else
  echo "Hubo $MAL archivo(s) con problemas. Intenta de nuevo en un minuto."
fi
