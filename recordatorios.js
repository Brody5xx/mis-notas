/* ============================================================
   recordatorios.js — ⏰ RECORDATORIOS
   Le pones una alarma a una nota o a un pendiente y el teléfono
   te avisa a esa hora (aunque la app esté cerrada).
   Al tocar el aviso, se abre la nota.
   · En el teléfono usa expo-notifications.
   · En el navegador solo avisa si la app está abierta.
   ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getHour12 } from './hora';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import Avisos from './avisos';          // avisos.native.js en el teléfono, avisos.web.js en el navegador
const N = Avisos || null;
export const canNotify = () => !!N;

/* Preparar los avisos y qué hacer cuando tocas uno */
export async function setupNotifications(onOpen) {
  if (!N) return () => {};
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch (e) {}
  if (Platform.OS === 'android') {
    try {
      await N.setNotificationChannelAsync('reminders', {
        name: 'Recordatorios / Reminders', importance: N.AndroidImportance ? N.AndroidImportance.MAX : 5,
        sound: 'default', vibrationPattern: [0, 300, 200, 300], lightColor: '#ffffff',
      });
    } catch (e) {}
  }
  let sub = null;
  try {
    sub = N.addNotificationResponseReceivedListener(r => {
      const d = (r && r.notification && r.notification.request && r.notification.request.content && r.notification.request.content.data) || {};
      if (d.noteId) onOpen(d.noteId, d.rid);
    });
  } catch (e) {}
  // La app estaba cerrada y se abrió tocando el aviso
  try {
    const last = await N.getLastNotificationResponseAsync();
    const d = last && last.notification && last.notification.request.content.data;
    if (d && d.noteId) setTimeout(() => onOpen(d.noteId, d.rid), 900);
  } catch (e) {}
  return () => { try { sub && sub.remove(); } catch (e) {} };
}

/* Programar un aviso. Devuelve su id (o null en el navegador) */
export async function scheduleAt({ title, body, at, data }) {
  if (!N) return null;
  let p = await N.getPermissionsAsync();
  if (!p.granted) p = await N.requestPermissionsAsync();
  if (!p.granted) throw new Error('perm');
  const T = N.SchedulableTriggerInputTypes;
  const trigger = T ? { type: T.DATE, date: new Date(at), channelId: 'reminders' } : { date: new Date(at), channelId: 'reminders' };
  return N.scheduleNotificationAsync({ content: { title, body, data, sound: 'default' }, trigger });
}
export async function cancelAt(id) {
  if (!N || !id) return;
  try { await N.cancelScheduledNotificationAsync(id); } catch (e) {}
}

/* Texto de una fecha: "dom, 19 oct · 8:00 a. m." */
export function fmtWhen(ms, locale) {
  const d = new Date(ms);
  try {
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch (e) { return d.toLocaleString(); }
}

/* ============================================================
   VENTANA PARA ELEGIR LA HORA
   ============================================================ */
const DAY = 24 * 60 * 60 * 1000;
const sod = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export default function RemindSheet({ visible, onClose, target, noteTitle, list, onSave, onDelete, s, t, tr, Glass, locale }) {
  const C = t;
  const [day, setDay] = useState(sod(Date.now() + DAY));
  const [h12, setH12] = useState(8);
  const [min, setMin] = useState(0);
  const [pm, setPm] = useState(false);
  const [custom, setCustom] = useState(false);
  const [hh, setHh] = useState(8);                     // hora en formato 24 h
  useEffect(() => { setPm(hh >= 12); setH12(hh % 12 === 0 ? 12 : hh % 12); }, [hh]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); });
  const is24 = getHour12() === false || (getHour12() === null && /13/.test(new Date(2020, 0, 1, 13).toLocaleTimeString(locale, { hour: 'numeric' })));

  useEffect(() => { if (visible) {
    setDay(sod(Date.now() + DAY)); setH12(8); setMin(0); setPm(false); setCustom(false); setHh(8);
    const d = new Date(Date.now() + DAY); setMonth(new Date(d.getFullYear(), d.getMonth(), 1).getTime());
  } }, [visible]);

  const now = Date.now();
  const at = (dayMs, h24, m) => { const d = new Date(dayMs); d.setHours(h24, m, 0, 0); return d.getTime(); };
  const quick = useMemo(() => {
    const out = [];
    const r = x => Math.ceil(x / (5 * 60000)) * 5 * 60000;
    out.push({ k: 'h1', label: tr('rmIn1h'), at: r(now + 3600000) });
    out.push({ k: 'h3', label: tr('rmIn3h'), at: r(now + 3 * 3600000) });
    const t5 = at(sod(now), 17, 0); if (t5 > now + 10 * 60000) out.push({ k: 't5', label: tr('rmToday5'), at: t5 });
    const t7 = at(sod(now), 19, 0); if (t7 > now + 10 * 60000) out.push({ k: 't7', label: tr('rmToday7'), at: t7 });
    out.push({ k: 'm8', label: tr('rmTomorrow8'), at: at(sod(now + DAY), 8, 0) });
    out.push({ k: 'm7', label: tr('rmTomorrow7'), at: at(sod(now + DAY), 7, 0) });
    return out;
  }, [visible]);
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => sod(now) + i * DAY), [visible]);
  const h24 = (h12 % 12) + (pm ? 12 : 0);
  const pickAt = at(day, h24, min);
  const pickOk = pickAt > Date.now() + 30000;
  const dayLabel = d => d === sod(now) ? tr('rpToday') : d === sod(now + DAY) ? tr('rmTomorrow') : (() => {
    try { return new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }); } catch (e) { return new Date(d).getDate() + ''; }
  })();
  const pad = x => (x < 10 ? '0' : '') + x;

  /* Flechitas: un toque = 1; si la dejas presionada, sigue sola cada vez más rápido */
  const rep = useRef(null);
  const stopRep = () => { if (rep.current) { clearTimeout(rep.current); rep.current = null; } };
  useEffect(() => stopRep, []);
  const startRep = (fn) => {
    stopRep(); let n = 0;
    const go = () => { fn(); n++; rep.current = setTimeout(go, n < 6 ? 170 : 70); };
    rep.current = setTimeout(go, 380);
  };
  const stepper = (val, set, lo, hi, fmt) => {
    const up = () => set(v => (v >= hi ? lo : v + 1));
    const dn = () => set(v => (v <= lo ? hi : v - 1));
    return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <TouchableOpacity onPress={up} onPressIn={() => startRep(up)} onPressOut={stopRep} hitSlop={8} style={{ padding: 6 }}>
          <Feather name="chevron-up" size={26} color={C.text} />
        </TouchableOpacity>
        <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 34, fontWeight: '800', minWidth: 58, textAlign: 'center' }}>{fmt(val)}</Text>
        <TouchableOpacity onPress={dn} onPressIn={() => startRep(dn)} onPressOut={stopRep} hitSlop={8} style={{ padding: 6 }}>
          <Feather name="chevron-down" size={26} color={C.text} />
        </TouchableOpacity>
      </View>
    );
  };
  /* 🗓️ Calendario del mes: sin límite, puedes ir a cualquier mes y año */
  const cal = (() => {
    const m0 = new Date(month), y = m0.getFullYear(), mo = m0.getMonth();
    const first = new Date(y, mo, 1).getDay();             // 0 = domingo
    const nDays = new Date(y, mo + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= nDays; d++) cells.push(new Date(y, mo, d).getTime());
    while (cells.length % 7) cells.push(null);
    let title = '';
    try { title = m0.toLocaleDateString(locale, { month: 'long', year: 'numeric' }); } catch (e) { title = (mo + 1) + '/' + y; }
    const wk = [];
    for (let i = 0; i < 7; i++) { try { wk.push(new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' })); } catch (e) { wk.push('DLMMJVS'[i]); } }
    const today = sod(Date.now());
    const canBack = new Date(y, mo, 1).getTime() > new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const W = '14.2857%';
    return (
      <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <TouchableOpacity disabled={!canBack} onPress={() => setMonth(new Date(y, mo - 1, 1).getTime())} hitSlop={10} style={{ padding: 6, opacity: canBack ? 1 : 0.25 }}>
            <Feather name="chevron-left" size={22} color={C.text} />
          </TouchableOpacity>
          <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' }}>{title}</Text>
          <TouchableOpacity onPress={() => setMonth(new Date(y, mo + 1, 1).getTime())} hitSlop={10} style={{ padding: 6 }}>
            <Feather name="chevron-right" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {wk.map((w, i) => <Text key={i} maxFontSizeMultiplier={1.2} style={{ width: W, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '700' }}>{w}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <View key={'e' + i} style={{ width: W, height: 40 }} />;
            const past = d < today, on = d === day, isToday = d === today;
            return (
              <TouchableOpacity key={d} disabled={past} onPress={() => setDay(d)} activeOpacity={0.7}
                style={{ width: W, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? C.text : 'transparent', borderWidth: isToday && !on ? 1 : 0, borderColor: C.text }}>
                  <Text maxFontSizeMultiplier={1.2} style={{ color: on ? C.inv : past ? C.muted : C.text, opacity: past ? 0.35 : 1, fontSize: 15, fontWeight: on ? '800' : '600' }}>
                    {new Date(d).getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  })();
  const chip = (key, label, on, onPress) => (
    <TouchableOpacity key={key} onPress={onPress} activeOpacity={0.7}
      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: on ? C.text : C.border, backgroundColor: on ? C.text : 'transparent' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ color: on ? C.inv : C.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
  const mine = (list || []).filter(r => r.at > Date.now()).sort((a, b) => a.at - b.at);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ backgroundColor: C.grad[0], borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%', borderWidth: 1, borderColor: C.border }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 34 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 20, fontWeight: '800', flex: 1 }}>⏰ {tr('rmTitle')}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}><Feather name="x" size={22} color={C.text} /></TouchableOpacity>
            </View>
            <View style={{ marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{noteTitle || tr('note')}</Text>
              {!!(target && target.text) && <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14, marginTop: 4 }} numberOfLines={3}>☐ {target.text}</Text>}
            </View>
            {!canNotify() && <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>ⓘ {tr('rmWebHint')}</Text>}

            {/* Ya puestos */}
            {mine.length > 0 && (
              <View style={{ marginTop: 14 }}>
                {mine.map(r => (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                    <MaterialCommunityIcons name="bell-ring" size={18} color={C.text} />
                    <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 15, flex: 1 }}>{fmtWhen(r.at, locale)}</Text>
                    <TouchableOpacity onPress={() => onDelete(r)} hitSlop={10}><Feather name="trash-2" size={18} color="#ff6b6b" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Rápidos */}
            <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 }}>{tr('rmQuick')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quick.map(q => (
                <TouchableOpacity key={q.k} onPress={() => onSave(q.at)} activeOpacity={0.7}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: C.border }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{q.label}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{fmtWhen(q.at, locale)}</Text>
                </TouchableOpacity>
              ))}
              {chip('custom', '🗓️ ' + tr('rmPick'), custom, () => setCustom(v => !v))}
            </View>

            {/* Escoger día y hora */}
            {custom && (
              <View style={{ marginTop: 16 }}>
                {cal}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 }}>
                  {is24
                    ? stepper(hh, setHh, 0, 23, pad)
                    : stepper(h12, setH12, 1, 12, x => String(x))}
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 34, fontWeight: '800' }}>:</Text>
                  {stepper(min, setMin, 0, 59, pad)}
                  {!is24 && (
                    <View style={{ gap: 8, marginLeft: 8 }}>
                      {chip('am', 'AM', !pm, () => setPm(false))}
                      {chip('pm', 'PM', pm, () => setPm(true))}
                    </View>
                  )}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={{ color: pickOk ? C.text : '#ff6b6b', fontSize: 15, textAlign: 'center', marginTop: 12 }}>
                  {pickOk ? fmtWhen(pickAt, locale) : tr('rmPast')}
                </Text>
                <TouchableOpacity onPress={() => pickOk && onSave(pickAt)} disabled={!pickOk} activeOpacity={0.8}
                  style={[s.wallBtn, { backgroundColor: C.text, marginTop: 14, opacity: pickOk ? 1 : 0.4 }]}>
                  <Text maxFontSizeMultiplier={1.3} style={[s.wallBtnText, { color: C.inv }]}>{tr('rmSave')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
