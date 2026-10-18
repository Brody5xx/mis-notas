#!/bin/sh
# ------------------------------------------------------------
# actualizar.sh — descarga la última versión de la app de notas
# desde GitHub y la pone en artifacts/mobile (donde vive la app).
# ------------------------------------------------------------
BASE="https://raw.githubusercontent.com/Brody5xx/mis-notas/main"
DIR="$HOME/workspace/artifacts/mobile"
T=$(date +%s)

# GitHub guarda una copia vieja por unos minutos. Para bajar SIEMPRE lo más
# nuevo, se pide el código exacto del último cambio y se descarga desde ahí.
SHA=$(curl -fsSL -H "Accept: application/vnd.github.sha" "https://api.github.com/repos/Brody5xx/mis-notas/commits/main?t=$T" 2>/dev/null)
case "$SHA" in
  ????????????????????????????????????????) BASE="https://raw.githubusercontent.com/Brody5xx/mis-notas/$SHA" ;;
esac

cd "$DIR" || { echo "No encontré la carpeta $DIR"; exit 1; }

LISTA=$(curl -fsSL "$BASE/archivos.txt?t=$T") || { echo "No pude conectar con GitHub. Revisa tu internet."; exit 1; }

OK=0; MAL=0
for f in $LISTA; do
  mkdir -p "$(dirname "$f")"
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


# Registrar el modo translúcido en app.json (solo una vez)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    e.plugins = e.plugins || [];
    const ya = e.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "./translucido-plugin.js");
    if (!ya) {
      e.plugins.push("./translucido-plugin.js");
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (modo translúcido registrado)");
    }
  ' || echo "  ✗ No pude registrar el modo translúcido en app.json"
elif [ ! -f app.json ]; then
  echo "  (Aviso: no encontré app.json; el modo translúcido se configura al construir la app)"
fi

# Paquete para compartir archivos (PDF / imagen) en el teléfono — solo la primera vez
if [ -f package.json ] && { ! grep -q '"expo-sharing"' package.json || [ ! -d node_modules/expo-sharing ]; }; then
  echo "  … instalando expo-sharing (para compartir PDF e imágenes). Espera un momento..."
  if npx --yes expo install expo-sharing >/tmp/expo-sharing.log 2>&1; then
    echo "  ✓ expo-sharing instalado"
  else
    echo "  ✗ No pude instalar expo-sharing. Escribe en el Shell:  npx expo install expo-sharing"
  fi
fi

# Paquete para la galería (Bóveda: borrar el original / devolverlo a la galería) — solo la primera vez
if [ -f package.json ] && { ! grep -q '"expo-media-library"' package.json || [ ! -d node_modules/expo-media-library ]; }; then
  echo "  … instalando expo-media-library (para la galería de la Bóveda). Espera un momento..."
  if npx --yes expo install expo-media-library >/tmp/expo-media-library.log 2>&1; then
    echo "  ✓ expo-media-library instalado"
  else
    echo "  ✗ No pude instalar expo-media-library. Escribe en el Shell:  npx expo install expo-media-library"
  fi
fi
# Registrar los permisos de la galería en app.json (solo una vez)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    e.plugins = e.plugins || [];
    const ya = e.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "expo-media-library");
    if (!ya) {
      e.plugins.push(["expo-media-library", {
        photosPermission: "La Bóveda necesita la galería para borrar o devolver tus fotos y videos.",
        savePhotosPermission: "La Bóveda necesita guardar fotos y videos en tu galería.",
        isAccessMediaLocationEnabled: false
      }]);
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (permisos de la galería registrados)");
    }
  ' || echo "  ✗ No pude registrar los permisos de la galería en app.json"
fi

# Paquete para los recordatorios (avisos a una hora) — solo la primera vez
if [ -f package.json ] && { ! grep -q '"expo-notifications"' package.json || [ ! -d node_modules/expo-notifications ]; }; then
  echo "  … instalando expo-notifications (para los recordatorios). Espera un momento..."
  if npx --yes expo install expo-notifications >/tmp/expo-notifications.log 2>&1; then
    echo "  ✓ expo-notifications instalado"
  else
    echo "  ✗ No pude instalar expo-notifications. Escribe en el Shell:  npx expo install expo-notifications"
  fi
fi
# Registrar los recordatorios en app.json (solo una vez)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    e.plugins = e.plugins || [];
    const ya = e.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "expo-notifications");
    if (!ya) {
      e.plugins.push(["expo-notifications", { color: "#ffffff" }]);
      e.android = e.android || {};
      e.android.permissions = Array.from(new Set([...(e.android.permissions || []), "POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM"]));
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (recordatorios registrados)");
    }
  ' || echo "  ✗ No pude registrar los recordatorios en app.json"
fi

# Nombre e ícono de la app: Best Notes (se revisa cada vez; solo escribe si algo cambió)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    const antes = JSON.stringify(j);
    e.name = "Best Notes";
    e.icon = "./assets/bestnotes/icon.png";
    e.android = e.android || {};
    e.android.adaptiveIcon = Object.assign({}, e.android.adaptiveIcon, {
      foregroundImage: "./assets/bestnotes/adaptive-foreground.png",
      backgroundImage: "./assets/bestnotes/adaptive-background.png",
      backgroundColor: "#16161c"
    });
    delete e.android.adaptiveIcon.monochromeImage;
    e.ios = e.ios || {};
    e.ios.icon = "./assets/bestnotes/icon.png";
    e.web = e.web || {};
    e.web.favicon = "./assets/bestnotes/favicon.png";
    e.web.name = "Best Notes";
    e.web.shortName = "Best Notes";
    if (JSON.stringify(j) !== antes) {
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (nombre Best Notes e ícono nuevo)");
    }
  ' || echo "  ✗ No pude poner el nombre y el ícono en app.json"
fi

echo ""
if [ "$MAL" -eq 0 ]; then
  echo "¡Listo! $OK archivos actualizados. Ahora abre la app."
else
  echo "Hubo $MAL archivo(s) con problemas. Intenta de nuevo en un minuto."
fi
