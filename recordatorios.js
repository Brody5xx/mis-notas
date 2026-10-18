/* ============================================================
   recordatorios.js — ⏰ RECORDATORIOS
   Le pones una alarma a una nota o a un pendiente y el teléfono
   te avisa a esa hora (aunque la app esté cerrada).
   Al tocar el aviso, se abre la nota.
   · En el teléfono usa expo-notifications.
   · En el navegador solo avisa si la app está abierta.
   ============================================================ */
import React, { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => { if (visible) { setDay(sod(Date.now() + DAY)); setH12(8); setMin(0); setPm(false); setCustom(false); } }, [visible]);

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

  const stepper = (val, set, list2, fmt) => (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <TouchableOpacity onPress={() => set(list2[(list2.indexOf(val) + 1) % list2.length])} hitSlop={8} style={{ padding: 6 }}>
        <Feather name="chevron-up" size={24} color={C.text} />
      </TouchableOpacity>
      <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 34, fontWeight: '800', minWidth: 58, textAlign: 'center' }}>{fmt(val)}</Text>
      <TouchableOpacity onPress={() => set(list2[(list2.indexOf(val) - 1 + list2.length) % list2.length])} hitSlop={8} style={{ padding: 6 }}>
        <Feather name="chevron-down" size={24} color={C.text} />
      </TouchableOpacity>
    </View>
  );
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                  {days.map(d => chip('d' + d, dayLabel(d), d === day, () => setDay(d)))}
                </ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 }}>
                  {stepper(h12, setH12, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], x => String(x))}
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 34, fontWeight: '800' }}>:</Text>
                  {stepper(min, setMin, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], pad)}
                  <View style={{ gap: 8, marginLeft: 8 }}>
                    {chip('am', 'AM', !pm, () => setPm(false))}
                    {chip('pm', 'PM', pm, () => setPm(true))}
                  </View>
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
