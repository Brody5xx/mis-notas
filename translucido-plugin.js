/* ============================================================
   Modo translúcido (solo Android, en la app instalada)
   Hace que la ventana de la app sea transparente para que se vea
   la pantalla de inicio del teléfono detrás (apps y widgets).
   En Android 12 o más nuevo, además la desenfoca como vidrio.
   La app decide si se ve o no con la opción "Translúcido".
   Este archivo solo se usa al construir la app (no en el navegador).
   ============================================================ */
const { withAndroidStyles, withAndroidManifest } = require('expo/config-plugins');

function setItem(style, name, value) {
  style.item = (style.item || []).filter(i => !(i.$ && i.$.name === name));
  style.item.push({ $: { name }, _: value });
}

function withTranslucentStyles(config) {
  return withAndroidStyles(config, cfg => {
    try {
      const styles = (cfg.modResults.resources.style || []);
      for (const st of styles) {
        const name = st.$ && st.$.name;
        if (!name) continue;
        const isApp = name === 'AppTheme';
        const isSplash = name.startsWith('Theme.App.SplashScreen');
        if (!isApp && !isSplash) continue;
        setItem(st, 'android:windowIsTranslucent', 'true');
        setItem(st, 'android:backgroundDimEnabled', 'false');
        setItem(st, 'android:windowBlurBehindEnabled', 'true');   // Android 12+
        setItem(st, 'android:windowBlurBehindRadius', '28dp');    // Android 12+
        if (isApp) setItem(st, 'android:windowBackground', '@android:color/transparent');
      }
    } catch (e) {
      console.warn('[translucido] No se pudo ajustar el tema:', e && e.message);
    }
    return cfg;
  });
}

/* Android 8.0 cierra las apps translúcidas que fijan la orientación,
   así que quitamos ese bloqueo de la pantalla principal. */
function withNoOrientationLock(config) {
  return withAndroidManifest(config, cfg => {
    try {
      const app = cfg.modResults.manifest.application && cfg.modResults.manifest.application[0];
      const acts = (app && app.activity) || [];
      for (const a of acts) {
        if (a.$ && a.$['android:name'] === '.MainActivity') delete a.$['android:screenOrientation'];
      }
    } catch (e) {
      console.warn('[translucido] No se pudo ajustar el manifiesto:', e && e.message);
    }
    return cfg;
  });
}

module.exports = function withTranslucido(config) {
  return withNoOrientationLock(withTranslucentStyles(config));
};
