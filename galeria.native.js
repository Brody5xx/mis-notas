/* Galería del teléfono (solo Android / iPhone). En el navegador se usa galeria.web.js */
let ML = null;
try { ML = require('expo-media-library'); } catch (e) { ML = null; }
export default ML;
