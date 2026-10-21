/* Avisos del teléfono (solo Android / iPhone). En el navegador se usa avisos.web.js */
let N = null;
try { N = require('expo-notifications'); } catch (e) { N = null; }
export default N;
