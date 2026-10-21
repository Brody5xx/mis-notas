#!/bin/sh
# ------------------------------------------------------------
# subir-proyecto.sh — copia tu proyecto de Replit a GitHub (rama "proyecto")
# para que GitHub pueda construir la app (APK) gratis.
# Uso:  export GH=tu_llave_de_github   y luego   curl ... | sh
# No sube: node_modules, archivos .env, llaves ni claves.
# ------------------------------------------------------------
if [ -z "$GH" ]; then echo "✗ Falta la llave de GitHub. Primero escribe:  export GH=tu_llave"; exit 1; fi
SRC="$HOME/workspace"
cd "$SRC" || { echo "✗ No encontré $SRC"; exit 1; }
TMP=$(mktemp -d)
echo "📦 Preparando tu proyecto..."
if git rev-parse --git-dir >/dev/null 2>&1; then
  git ls-files -co --exclude-standard > "$TMP/todo.txt"
else
  find . -type f | sed 's#^\./##' > "$TMP/todo.txt"
fi
grep -v -E '(^|/)node_modules/|(^|/)\.git/|(^|/)\.cache/|(^|/)\.local/|(^|/)\.expo/|(^|/)\.env|\.(pem|key|jks|keystore|p12|apk|aab)$|^attached_assets/|credentials\.json$' "$TMP/todo.txt" > "$TMP/lista.txt"
mkdir -p "$TMP/p"
tar -cf - -T "$TMP/lista.txt" 2>/dev/null | (cd "$TMP/p" && tar -xf -)
N=$(wc -l < "$TMP/lista.txt")
echo "   $N archivos"
cd "$TMP/p" || exit 1
mkdir -p .github/workflows                       # la receta para que GitHub construya la app
curl -fsSL "https://raw.githubusercontent.com/Brody5xx/mis-notas/main/.github/workflows/construir-apk.yml?$(date +%s)" -o .github/workflows/construir-apk.yml
git init -q
git checkout -q -b proyecto
git add -A
git -c user.name="Luisell" -c user.email="bestnotes@users.noreply.github.com" commit -qm "Proyecto de Replit" || { echo "✗ No pude preparar los archivos"; exit 1; }
echo "⬆️  Subiendo a GitHub..."
if git push -q -f "https://x-access-token:${GH}@github.com/Brody5xx/mis-notas.git" proyecto 2>"$TMP/err.txt"; then
  echo ""
  echo "✅ ¡Listo! Tu proyecto ya está en GitHub."
  echo "   GitHub va a empezar a construir la app solito (tarda unos 20 minutos)."
else
  echo "✗ GitHub no aceptó la subida. Revisa que la llave esté bien copiada y que tenga los permisos 'repo' y 'workflow'."
  sed 's/x-access-token:[^@]*@/x-access-token:***@/g' "$TMP/err.txt" | tail -3
fi
rm -rf "$TMP"
