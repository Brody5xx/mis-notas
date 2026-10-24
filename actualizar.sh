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

# Paquete para que la app se acomode a cualquier pantalla (notch, barra de gestos) — solo la primera vez
if [ -f package.json ] && { ! grep -q '"react-native-safe-area-context"' package.json || [ ! -d node_modules/react-native-safe-area-context ]; }; then
  echo "  … instalando react-native-safe-area-context (para que se vea bien en cualquier pantalla). Espera un momento..."
  if npx --yes expo install react-native-safe-area-context >/tmp/safe-area.log 2>&1; then
    echo "  ✓ react-native-safe-area-context instalado"
  else
    echo "  ✗ No pude instalarlo. Escribe en el Shell:  npx expo install react-native-safe-area-context"
  fi
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

# Paquete para elegir archivos (Importar notas) — solo la primera vez
if [ -f package.json ] && { ! grep -q '"expo-document-picker"' package.json || [ ! -d node_modules/expo-document-picker ]; }; then
  echo "  … instalando expo-document-picker (para elegir archivos). Espera un momento..."
  if npx --yes expo install expo-document-picker >/tmp/expo-document-picker.log 2>&1; then
    echo "  ✓ expo-document-picker instalado"
  elif node -e '
      const fs = require("fs"); const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
      let v = "*"; try { v = require(require.resolve("expo/bundledNativeModules.json", { paths: [process.cwd()] }))["expo-document-picker"] || "*"; } catch (e) {}
      p.dependencies = p.dependencies || {}; p.dependencies["expo-document-picker"] = v;
      fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n"); console.log("    (versión " + v + ")");
    ' && (cd "$HOME/workspace" && pnpm install --no-frozen-lockfile >/tmp/expo-document-picker2.log 2>&1); then
    echo "  ✓ expo-document-picker instalado (de otra forma)"
  else
    echo "  ✗ No pude instalar expo-document-picker. Escribe en el Shell:  npx expo install expo-document-picker"
    tail -5 /tmp/expo-document-picker.log
  fi
fi

# Paquete para DICTAR (voz a texto) — solo la primera vez
if [ -f package.json ] && { ! grep -q '"expo-speech-recognition"' package.json || [ ! -d node_modules/expo-speech-recognition ]; }; then
  echo "  … instalando expo-speech-recognition (para dictar). Espera un momento..."
  if npx --yes expo install expo-speech-recognition >/tmp/expo-speech.log 2>&1; then
    echo "  ✓ expo-speech-recognition instalado"
  elif node -e '
      const fs = require("fs"); const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
      let v = "*"; try { v = require(require.resolve("expo/bundledNativeModules.json", { paths: [process.cwd()] }))["expo-speech-recognition"] || "*"; } catch (e) {}
      p.dependencies = p.dependencies || {}; p.dependencies["expo-speech-recognition"] = v;
      fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n"); console.log("    (versión " + v + ")");
    ' && (cd "$HOME/workspace" && pnpm install --no-frozen-lockfile >/tmp/expo-speech2.log 2>&1); then
    echo "  ✓ expo-speech-recognition instalado (de otra forma)"
  else
    echo "  ✗ No pude instalar expo-speech-recognition."
    tail -5 /tmp/expo-speech.log /tmp/expo-speech2.log 2>/dev/null
  fi
fi
# Registrar el dictado en app.json (permisos del micrófono y del reconocimiento de voz)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    e.plugins = e.plugins || [];
    const has = e.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "expo-speech-recognition");
    if (!has) {
      e.plugins.push(["expo-speech-recognition", {
        microphonePermission: "Best Notes usa el micrófono para dictar tus notas.",
        speechRecognitionPermission: "Best Notes convierte tu voz en texto para escribir tus notas.",
        androidSpeechServicePackages: ["com.google.android.googlequicksearchbox", "com.google.android.as"]
      }]);
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (dictado registrado)");
    }
  ' || echo "  ✗ No pude registrar el dictado en app.json"
fi

# 📷 Cámara para el editor rápido (tomar fotos dentro de la nota)
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j;
    e.plugins = e.plugins || [];
    const has = e.plugins.some(p => (Array.isArray(p) ? p[0] : p) === "expo-image-picker");
    if (!has) {
      e.plugins.push(["expo-image-picker", {
        photosPermission: "Best Notes usa tus fotos para ponerlas en tus notas.",
        cameraPermission: "Best Notes usa la cámara para tomar fotos dentro de tus notas."
      }]);
      fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
      console.log("  ✓ app.json (cámara registrada)");
    }
  ' || echo "  ✗ No pude registrar la cámara en app.json"
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
      backgroundColor: "#101016"
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

# Preparar la instalación en el teléfono (archivo APK): identificador de la app y perfil "apk"
if [ -f app.json ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
    const e = j.expo || j; const antes = JSON.stringify(j);
    e.android = e.android || {};
    if (!e.android.package) e.android.package = "com.luisell.bestnotes";
    e.ios = e.ios || {};
    if (!e.ios.bundleIdentifier) e.ios.bundleIdentifier = "com.luisell.bestnotes";
    if (JSON.stringify(j) !== antes) { fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n"); console.log("  ✓ app.json (identificador com.luisell.bestnotes)"); }
    let x = {}; try { x = JSON.parse(fs.readFileSync("eas.json", "utf8")); } catch (err) {}
    const a2 = JSON.stringify(x);
    x.cli = x.cli || { appVersionSource: "local" };
    x.build = x.build || {};
    x.build.apk = { android: { buildType: "apk" } };
    const pv = (process.argv[1] || "").trim();
    if (/^\d+\.\d+\.\d+$/.test(pv)) x.build.apk.pnpm = pv;   // la misma versión de pnpm que usa Replit
    if (JSON.stringify(x) !== a2) { fs.writeFileSync("eas.json", JSON.stringify(x, null, 2) + "\n"); console.log("  ✓ eas.json (perfil apk para instalar en el teléfono)"); }
  ' "$(pnpm -v 2>/dev/null)" || echo "  ✗ No pude preparar la instalación (eas.json)"
fi

# Permitir que esbuild se instale bien en los servidores de Expo (si no, falla "Install dependencies")
RAIZ="$HOME/workspace"
if [ -f "$RAIZ/pnpm-workspace.yaml" ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs"); const f = process.argv[1];
    let t = fs.readFileSync(f, "utf8");
    const want = ["esbuild"];
    const lines = t.split("\n");
    let i = lines.findIndex(l => /^onlyBuiltDependencies:/.test(l));
    let changed = false;
    if (i < 0) {
      if (!t.endsWith("\n")) t += "\n";
      t += "onlyBuiltDependencies:\n" + want.map(w => "  - " + w).join("\n") + "\n";
      changed = true;
    } else {
      const inline = lines[i].match(/^onlyBuiltDependencies:\s*\[(.*)\]\s*$/);
      if (inline) {
        const items = inline[1].split(",").map(x => x.trim().replace(/^["\x27]|["\x27]$/g, "")).filter(Boolean);
        want.forEach(w => { if (!items.includes(w)) { items.push(w); changed = true; } });
        lines[i] = "onlyBuiltDependencies:"; lines.splice(i + 1, 0, ...items.map(x => "  - " + x));
      } else {
        let j = i + 1; const have = [];
        while (j < lines.length && /^\s+-\s*/.test(lines[j])) { have.push(lines[j].replace(/^\s+-\s*/, "").replace(/["\x27]/g, "").trim()); j++; }
        want.forEach(w => { if (!have.includes(w)) { lines.splice(j, 0, "  - " + w); j++; changed = true; } });
      }
      t = lines.join("\n");
    }
    if (/^strictDepBuilds:.*$/m.test(t)) { if (!/^strictDepBuilds:\s*false\s*$/m.test(t)) { t = t.replace(/^strictDepBuilds:.*$/m, "strictDepBuilds: false"); changed = true; } }
    else { if (!t.endsWith("\n")) t += "\n"; t += "strictDepBuilds: false\n"; changed = true; }
    if (changed) fs.writeFileSync(f, t);
    console.log("  ✓ pnpm-workspace.yaml (esbuild permitido para construir la app)");
  ' "$RAIZ/pnpm-workspace.yaml" || echo "  ✗ No pude ajustar pnpm-workspace.yaml"
fi

echo ""
if [ "$MAL" -eq 0 ]; then
  echo "¡Listo! $OK archivos actualizados. Ahora abre la app."
else
  echo "Hubo $MAL archivo(s) con problemas. Intenta de nuevo en un minuto."
fi
