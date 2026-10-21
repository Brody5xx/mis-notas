/* ⏰ Formato de la hora en toda la app: 12 h (AM/PM) o 24 h.
   Se cambia una sola vez aquí y todas las fechas con hora lo respetan. */
let H12 = null;            // null = como venga el idioma del teléfono; true = 12 h; false = 24 h
let installed = false;

export function getHour12() { return H12; }
export function setHour12(v) { H12 = (v === true || v === false) ? v : null; install(); }

function withFmt(o, isTime) {
  if (H12 === null) return o;
  const x = Object.assign({}, o || {});
  const hasTime = isTime || x.hour !== undefined || x.timeStyle !== undefined ||
    (!o || (x.weekday === undefined && x.year === undefined && x.month === undefined && x.day === undefined && x.dateStyle === undefined));
  if (hasTime) { delete x.hourCycle; x.hour12 = H12; }
  return x;
}
export function install() {
  if (installed) return;
  installed = true;
  const P = Date.prototype;
  const oS = P.toLocaleString, oT = P.toLocaleTimeString, oD = P.toLocaleDateString;
  P.toLocaleString = function (loc, o) { try { return oS.call(this, loc, withFmt(o, false)); } catch (e) { return oS.call(this, loc, o); } };
  P.toLocaleTimeString = function (loc, o) { try { return oT.call(this, loc, withFmt(o, true)); } catch (e) { return oT.call(this, loc, o); } };
  P.toLocaleDateString = function (loc, o) {
    const x = o && (o.hour !== undefined || o.timeStyle !== undefined) ? withFmt(o, true) : o;
    try { return oD.call(this, loc, x); } catch (e) { return oD.call(this, loc, o); }
  };
}

/* Lo mismo, como texto para meterlo dentro del editor (que es una página aparte) */
export function hourScript(v) {
  const val = v === true || v === false ? String(v) : 'null';
  return '(function(H){if(H===null)return;var P=Date.prototype,oS=P.toLocaleString,oT=P.toLocaleTimeString,oD=P.toLocaleDateString;' +
    'function f(o,t){var x={};if(o)for(var k in o)x[k]=o[k];var has=t||x.hour!==undefined||x.timeStyle!==undefined||(!o||(x.weekday===undefined&&x.year===undefined&&x.month===undefined&&x.day===undefined&&x.dateStyle===undefined));' +
    'if(has){delete x.hourCycle;x.hour12=H;}return x;}' +
    'P.toLocaleString=function(l,o){try{return oS.call(this,l,f(o,false))}catch(e){return oS.call(this,l,o)}};' +
    'P.toLocaleTimeString=function(l,o){try{return oT.call(this,l,f(o,true))}catch(e){return oT.call(this,l,o)}};' +
    'P.toLocaleDateString=function(l,o){var x=o&&(o.hour!==undefined||o.timeStyle!==undefined)?f(o,true):o;try{return oD.call(this,l,x)}catch(e){return oD.call(this,l,o)}};' +
    '})(' + val + ');';
}
