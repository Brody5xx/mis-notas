/* ============================================================
   ayuda.js — 📖 GUÍA DE LA APP
   Explica TODO lo que trae la app y qué hace cada cosa.
   Es la primera opción del menú ☰.

   ⚠️ REGLA DEL EQUIPO: cada vez que se agrega algo nuevo a la app,
   se agrega aquí también:
     1. Su sección en GUIDE (español + inglés), con  isNew: true
     2. Una línea en NEWS (arriba del todo)
     3. Subir GUIDE_VERSION en 1  → en el menú sale "NUEVO"
   ============================================================ */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StatusBar, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

export const GUIDE_VERSION = 1;
const SEEN_KEY = 'misnotas_guide_seen';
export async function guideSeen() { try { return +(await AsyncStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; } }
export async function markGuideSeen() { try { await AsyncStorage.setItem(SEEN_KEY, String(GUIDE_VERSION)); } catch (e) {} }

/* 🆕 Lo más nuevo (lo último arriba) */
const NEWS = [
  { date: '2026-10-18', es: '📦 Lista de materiales · 📖 Esta guía', en: '📦 Materials list · 📖 This guide' },
  { date: '2026-10-18', es: '✅ Pendientes · 📅 Sello en fotos · ⏰ Recordatorios', en: '✅ To-dos · 📅 Photo stamp · ⏰ Reminders' },
  { date: '2026-10-17', es: '📊 Reporte del día · ✔️ Checklist estilo Keep', en: '📊 Daily report · ✔️ Keep-style checklist' },
];

/* Cada función de la app: ícono, título y qué hace (en español e inglés) */
const GUIDE = [
  /* ---------- Lo nuevo y lo del trabajo ---------- */
  { icon: '📦', isNew: true,
    es: { t: 'Lista de materiales', d: [
      'Menú ☰ → Lista de materiales. Toca "Buscar en mis notas" y la IA saca todo lo que hay que pedir o comprar (switches, cables, mag locks…).',
      'Cada material sale con el TOTAL y, debajo, para dónde va cada parte. Ejemplo: 5 × Cable Cat 6 → 3 para Inwood, 2 para DVSS.',
      'Toca el círculo para cambiar el estado: ○ Por pedir → 🛒 Pedido → ✅ Llegó.',
      'Toca el material para editar el nombre, la cantidad o el sitio. Con ＋ arriba agregas algo a mano.',
      'Puedes buscar solo en las notas de Hoy, de Esta semana o en Todas.',
      '"Mandar a mi jefe" escribe un mensaje profesional en español, inglés o los dos. "Guardar como nota" la convierte en nota (para PDF).',
      'Lo que ya marcaste como Pedido o Llegó no se borra al volver a buscar.'] },
    en: { t: 'Materials list', d: [
      'Menu ☰ → Materials list. Tap "Search my notes" and the AI pulls out everything that needs to be ordered or bought (switches, cable, mag locks…).',
      'Each material shows the TOTAL and, below it, where each part goes. Example: 5 × Cat 6 cable → 3 for Inwood, 2 for DVSS.',
      'Tap the circle to change its status: ○ To order → 🛒 Ordered → ✅ Arrived.',
      'Tap a material to edit its name, quantity or site. Use ＋ at the top to add something by hand.',
      'You can search only Today\'s notes, This week\'s, or All.',
      '"Send to my boss" writes a professional message in English, Spanish or both. "Save as note" turns it into a note (for PDF).',
      'Items already marked Ordered or Arrived are kept when you search again.'] } },
  { icon: '✅', isNew: true,
    es: { t: 'Pendientes', d: [
      'Menú ☰ → Pendientes (el número dice cuántas cosas te faltan).',
      'Junta todas las casillas SIN marcar de todas tus notas, agrupadas por nota y con el título a color.',
      'Toca el cuadro para marcarla como hecha (te pregunta "¿Ya terminaste esto?"). En su nota baja a "Completados".',
      'Toca el título para abrir la nota, o la campanita 🔔 para ponerle un recordatorio.'] },
    en: { t: 'To-dos', d: [
      'Menu ☰ → To-dos (the number shows how many things are left).',
      'Gathers every UNCHECKED box from all your notes, grouped by note, with the title in its color.',
      'Tap the box to mark it done (it asks "Did you finish this?"). In its note it moves down to "Completed".',
      'Tap the title to open the note, or the bell 🔔 to set a reminder.'] } },
  { icon: '⏰', isNew: true,
    es: { t: 'Recordatorios', d: [
      'Dentro de una nota: ⋮ → Recordatorio. También desde Pendientes con la campanita.',
      'Opciones rápidas (En 1 hora, Hoy 7 PM, Mañana 8 AM…) o "Escoger día y hora".',
      'Las notas con recordatorio muestran una campanita en la lista. Al tocar el aviso se abre la nota.',
      'En la app instalada suena aunque esté cerrada. En el navegador solo avisa si la app está abierta.'] },
    en: { t: 'Reminders', d: [
      'Inside a note: ⋮ → Reminder. Also from To-dos with the bell.',
      'Quick options (In 1 hour, Today 7 PM, Tomorrow 8 AM…) or "Pick day and time".',
      'Notes with a reminder show a bell in the list. Tapping the alert opens the note.',
      'In the installed app it rings even when closed. In the browser it only alerts while the app is open.'] } },
  { icon: '📅', isNew: true,
    es: { t: 'Sello en las fotos', d: [
      'Cada foto que pones en una nota sale con una franja abajo: fecha y hora en que se tomó, y el sitio (el título de la nota).',
      'Sirve como prueba del trabajo. Sale en el PDF, en la imagen y en la página que compartes.',
      'Para quitarlo o ponerlo: toca la foto → botón "Sello" 🕒. Si lo quitas, las próximas fotos salen sin sello.'] },
    en: { t: 'Photo stamp', d: [
      'Every photo you add to a note gets a strip at the bottom: date and time it was taken, and the site (the note title).',
      'It works as proof of work. It shows in the PDF, image and shared page.',
      'To remove or add it: tap the photo → "Stamp" button 🕒. If you remove it, next photos come without a stamp.'] } },
  { icon: '📊',
    es: { t: 'Reporte del día', d: [
      'Menú ☰ → Reporte del día. Junta las notas de un día y la IA escribe un reporte profesional para tu jefe.',
      'Secciones: Resumen, Trabajo realizado (por sitio), Pendientes y Materiales (como checklist) y Notas para el supervisor.',
      'Con ‹ › escoges el día. Quita las notas que no quieras incluir.',
      'Idioma: Español, English o Ambos.',
      'Incluir en el reporte: Texto, Fotos, Notas de voz, Videos y Links, cada uno por separado (o Marcar todo).',
      'Nunca inventa nada. Si la IA falla, pone tus notas tal cual para que nunca salga vacío.'] },
    en: { t: 'Daily report', d: [
      'Menu ☰ → Daily report. Gathers a day\'s notes and the AI writes a professional report for your boss.',
      'Sections: Summary, Work completed (by site), Pending and Materials (as checklists) and Notes for the supervisor.',
      'Use ‹ › to pick the day. Unselect notes you don\'t want.',
      'Language: Español, English or Both.',
      'Include in the report: Text, Photos, Voice notes, Videos and Links, each one separately (or Select all).',
      'It never makes things up. If the AI fails, it puts your notes as written so it\'s never empty.'] } },
  { icon: '✔️',
    es: { t: 'Checklist', d: [
      'Botón de checklist en la barra de abajo de la nota.',
      'Al marcar una casilla te pregunta "¿Ya terminaste esto?" y la línea baja a "Completados". Arriba solo queda lo que falta.',
      'Si la desmarcas, vuelve exactamente al lugar donde estaba.',
      'Al tocar la casilla el teclado se guarda solo.'] },
    en: { t: 'Checklist', d: [
      'Checklist button in the note\'s bottom bar.',
      'Checking a box asks "Did you finish this?" and the line moves down to "Completed". Only what\'s left stays on top.',
      'If you uncheck it, it goes back to the exact spot where it was.',
      'Tapping a box hides the keyboard automatically.'] } },
  { icon: '👔',
    es: { t: 'Asistente de trabajo e IA', d: [
      'Nota → ⋮ → Asistente de trabajo: trabaja con TODA la nota (reporte, email, resumen, pasos, lista de tareas…).',
      'Reescribir con IA: cambia el texto a formal, profesional, de negocios, o lo traduce. Cada resultado sale en dos idiomas.',
      'Frases del día a día → cómo decirlas profesionalmente, para ir aprendiendo.',
      'Revisar ortografía: subraya los errores y te da sugerencias.'] },
    en: { t: 'Work assistant & AI', d: [
      'Note → ⋮ → Work assistant: works with the WHOLE note (report, email, summary, steps, to-do list…).',
      'Rewrite with AI: makes the text formal, professional, business-like, or translates it. Each result comes in two languages.',
      'Everyday phrases → how to say them professionally, to keep learning.',
      'Spell check: underlines mistakes and gives suggestions.'] } },
  { icon: '📋',
    es: { t: 'Plantillas', d: [
      'Nota → ⋮ → Plantillas: Fecha y hora, Reporte diario, Ticket de trabajo, Inspección del sitio, Lista de materiales, Reunión, Entrega de turno y Reporte de incidente.',
      'El ticket trae campos listos: número, fecha, sitio, lugar, quién lo pidió, problema, diagnóstico, solución, materiales, estado y fotos.'] },
    en: { t: 'Templates', d: [
      'Note → ⋮ → Templates: Date and time, Daily report, Work ticket, Site inspection, Materials list, Meeting, Shift handoff and Incident report.',
      'The ticket has ready fields: number, date, site, location, requester, issue, diagnosis, fix, materials, status and photos.'] } },
  { icon: '🎤',
    es: { t: 'Notas de voz y transcripción', d: [
      'Nota → ⋮ → Grabar audio. El audio queda dentro de la nota y se puede escuchar ahí mismo.',
      'La voz se convierte en texto (Whisper corre dentro del teléfono). Puedes escoger el idioma en que hablas.',
      'También puedes subir una nota de voz de WhatsApp o de la grabadora y se transcribe igual.'] },
    en: { t: 'Voice notes & transcription', d: [
      'Note → ⋮ → Record audio. The audio stays inside the note and plays right there.',
      'Speech becomes text (Whisper runs on the phone). You can choose the language you speak.',
      'You can also upload a WhatsApp or recorder voice note and it gets transcribed too.'] } },
  { icon: '🖼️',
    es: { t: 'Fotos y videos', d: [
      'Botón de foto en la barra de abajo. Las fotos se mueven con el dedo (salen guías rojas) y se anclan con 📌.',
      'Tamaño con las esquinas o pellizcando con dos dedos; giro con la barrita o con dos dedos.',
      'Recortar ✂️ y Editar ✏️ (escribir y dibujar encima de la foto).',
      'Videos dentro de la nota. "Achicar" reduce el tamaño del video para poder mandarlo.'] },
    en: { t: 'Photos & videos', d: [
      'Photo button in the bottom bar. Drag photos with your finger (red guides show) and pin them with 📌.',
      'Resize with the corners or by pinching; rotate with the slider or two fingers.',
      'Crop ✂️ and Edit ✏️ (write and draw on top of the photo).',
      'Videos inside the note. "Shrink" makes the video smaller so you can send it.'] } },
  { icon: '✍️',
    es: { t: 'Escribir y dar formato', d: [
      'Negrita, cursiva, subrayado, resaltador y contorno de letras.',
      'Tamaño de letra de 5 a 100 y colores (rueda de colores, recientes y favoritos). El título también puede tener color.',
      'Listas con viñetas, numeradas y checklist.',
      'Modo dibujo ✏️: un dedo dibuja, dos dedos mueven la nota.',
      'Deshacer / rehacer, contador de palabras y cuánto pesa la nota.'] },
    en: { t: 'Writing & formatting', d: [
      'Bold, italic, underline, highlighter and text outline.',
      'Font size from 5 to 100 and colors (color wheel, recent and favorites). The title can have color too.',
      'Bulleted, numbered and checklist lists.',
      'Drawing mode ✏️: one finger draws, two fingers move the note.',
      'Undo / redo, word count and how much the note weighs.'] } },
  { icon: '🕘',
    es: { t: 'Historial de la nota', d: [
      'Botón del reloj arriba en la nota.',
      'Registro: guarda solo todo lo que escribes, aunque lo borres.',
      'Versiones: guardas una copia exacta cuando quieras y la puedes restaurar. Se puede proteger con PIN.'] },
    en: { t: 'Note history', d: [
      'Clock button at the top of the note.',
      'Log: automatically keeps everything you type, even what you delete.',
      'Versions: save an exact copy whenever you want and restore it later. Can be protected with a PIN.'] } },
  { icon: '📤',
    es: { t: 'Compartir', d: [
      'PDF o imagen tal como se ve la nota (con fotos y colores), solo texto, o página web con fotos, audios y videos.',
      'La app te dice por dónde se puede mandar según el tamaño: correo, WhatsApp, mensajes RCS o MMS.',
      'Puedes compartir varias notas a la vez: mantén presionada una nota para seleccionar.'] },
    en: { t: 'Sharing', d: [
      'PDF or image exactly as the note looks (with photos and colors), text only, or a web page with photos, audio and videos.',
      'The app tells you where it can be sent by size: email, WhatsApp, RCS messages or MMS.',
      'Share several notes at once: long-press a note to select.'] } },
  { icon: '🔐',
    es: { t: 'Bóveda', d: [
      'Botón del escudo arriba (o menú ☰). Guarda contraseñas, correos, links, notas secretas, fotos, videos y archivos, todo cifrado con tu contraseña.',
      'Al agregar una foto o video te pregunta si quieres borrar el original de la galería.',
      'Botones "A la galería" y "A una carpeta" para recuperar lo que guardaste.'] },
    en: { t: 'Vault', d: [
      'Shield button at the top (or menu ☰). Stores passwords, emails, links, secret notes, photos, videos and files, all encrypted with your password.',
      'When you add a photo or video it asks if you want to delete the original from the gallery.',
      '"To gallery" and "To a folder" buttons to get back what you saved.'] } },
  { icon: '🧮',
    es: { t: 'Calculadora', d: [
      'Botón de calculadora arriba (en la pantalla principal y dentro de la nota).',
      'Incluye cambio de moneda. Desde una nota puedes poner el resultado dentro de la nota.'] },
    en: { t: 'Calculator', d: [
      'Calculator button at the top (home screen and inside a note).',
      'Includes currency exchange. From a note you can insert the result into the note.'] } },
  { icon: '🗂️',
    es: { t: 'Organizar tus notas', d: [
      'Carpetas con color, etiquetas, favoritos ⭐ y fijar arriba 📌.',
      'Buscar notas, ordenar (última modificación, creación o A-Z) y ver en lista o cuadrícula.',
      'Color de la nota y papelera (puedes recuperar lo borrado).'] },
    en: { t: 'Organizing notes', d: [
      'Colored folders, tags, favorites ⭐ and pin to top 📌.',
      'Search notes, sort (last modified, created or A-Z) and view as list or grid.',
      'Note color and trash (you can recover what you deleted).'] } },
  { icon: '🔒',
    es: { t: 'Seguridad', d: [
      'Bloquear una nota con PIN (⋮ → Bloquear con PIN).',
      'Bloquear toda la app (menú ☰ → Bloquear la app con PIN). Crear o cambiar el PIN desde el menú.',
      'Las notas bloqueadas no salen en los reportes, pendientes ni materiales.'] },
    en: { t: 'Security', d: [
      'Lock a note with a PIN (⋮ → Lock with PIN).',
      'Lock the whole app (menu ☰ → Lock the app with PIN). Create or change the PIN from the menu.',
      'Locked notes don\'t appear in reports, to-dos or materials.'] } },
  { icon: '🎨',
    es: { t: 'Apariencia', d: [
      'Modo claro / oscuro (botón del sol o la luna). Diseño de vidrio (Liquid Glass).',
      'Fondo de pantalla con desenfoque, y fondo propio para cada nota.',
      'Modo translúcido: se ve tu pantalla de inicio detrás (app instalada en Android).'] },
    en: { t: 'Appearance', d: [
      'Light / dark mode (sun or moon button). Glass design (Liquid Glass).',
      'Wallpaper with blur, and a separate background for each note.',
      'Translucent mode: your home screen shows behind (installed app on Android).'] } },
  { icon: '📲',
    es: { t: 'Transferir notas e idioma', d: [
      'Menú ☰ → Transferir notas: mueve todas tus notas (y la bóveda) a otro teléfono con un archivo.',
      'Menú ☰ → Idioma: 39 idiomas. Español e inglés siempre están en todas las opciones.'] },
    en: { t: 'Transfer notes & language', d: [
      'Menu ☰ → Transfer notes: moves all your notes (and the vault) to another phone with a file.',
      'Menu ☰ → Language: 39 languages. Spanish and English are always available in every option.'] } },
];

export default function Guide({ visible, onClose, s, t, tr, Glass, langCode }) {
  const C = t;
  const appEs = String(langCode || 'es').slice(0, 2) === 'es';
  const [lang, setLang] = useState(appEs ? 'es' : 'en');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});
  useEffect(() => { if (visible) { setLang(appEs ? 'es' : 'en'); setQ(''); markGuideSeen(); } }, [visible]);

  const qq = q.trim().toLowerCase();
  const items = useMemo(() => GUIDE.filter(g => !qq || g[lang].t.toLowerCase().includes(qq) || g[lang].d.some(x => x.toLowerCase().includes(qq))), [qq, lang]);
  const chip = (k, label) => (
    <TouchableOpacity key={k} onPress={() => setLang(k)} activeOpacity={0.7}
      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: lang === k ? C.text : C.border, backgroundColor: lang === k ? C.text : 'transparent' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ color: lang === k ? C.inv : C.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[s.screen, { backgroundColor: C.grad[0] }]}>
        <StatusBar barStyle={C.bar} backgroundColor="transparent" translucent />
        <View style={[s.topbar, { paddingTop: 6 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
            <Glass t={C} radius={22} style={{ width: 44, height: 44 }} inner={s.center}><Feather name="arrow-left" size={20} color={C.text} /></Glass>
          </TouchableOpacity>
          <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 22, fontWeight: '800', marginLeft: 10, flex: 1 }} numberOfLines={1}>📖 {tr('gdTitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginRight: 6 }}>{chip('es', '🇪🇸')}{chip('en', '🇺🇸')}</View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={[s.folderInputWrap, { borderColor: C.border, marginTop: 0 }]}>
            <Feather name="search" size={16} color={C.muted} />
            <TextInput maxFontSizeMultiplier={1.3} style={s.folderInput} value={q} onChangeText={setQ} placeholder={tr('gdSearch')} placeholderTextColor={C.muted} />
          </View>

          {/* Novedades */}
          {!qq && (
            <View style={{ marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: C.text }}>
              <Text maxFontSizeMultiplier={1.3} style={{ color: C.inv, fontSize: 15, fontWeight: '800', marginBottom: 6 }}>🆕 {lang === 'es' ? 'Novedades' : "What's new"}</Text>
              {NEWS.map((n, i) => (
                <Text maxFontSizeMultiplier={1.3} key={i} style={{ color: C.inv, fontSize: 14, lineHeight: 21, opacity: i ? 0.75 : 1 }}>
                  {n.date.slice(5).replace('-', '/')} · {n[lang]}
                </Text>
              ))}
            </View>
          )}

          {items.map((g, i) => {
            const isOpen = !!open[g.icon] || !!qq;
            const L = g[lang];
            return (
              <View key={g.icon} style={{ marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: 'hidden' }}>
                <TouchableOpacity onPress={() => setOpen(o => ({ ...o, [g.icon]: !o[g.icon] }))} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 24 }}>{g.icon}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 16, fontWeight: '800', flex: 1 }}>{L.t}</Text>
                  {g.isNew && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: C.text }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ color: C.inv, fontSize: 11, fontWeight: '800' }}>{lang === 'es' ? 'NUEVO' : 'NEW'}</Text>
                    </View>
                  )}
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
                </TouchableOpacity>
                {isOpen && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                    {L.d.map((line, k) => (
                      <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>•</Text>
                        <Text maxFontSizeMultiplier={1.3} style={{ color: C.text, fontSize: 14, lineHeight: 21, flex: 1 }}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {!items.length && <Text maxFontSizeMultiplier={1.3} style={{ color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 30 }}>{tr('noMatch')}</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}
