import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, Image, ScrollView,
  Pressable, StyleSheet, StatusBar, BackHandler, Alert, SafeAreaView,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { buildEditorHtml } from './editor';

/* En el teléfono las notas se guardan en un archivo (sin límite de tamaño,
   necesario para las fotos). En la vista previa de Replit se usa AsyncStorage. */
let FS = null;
if (Platform.OS !== 'web') {
  try { FS = require('expo-file-system'); } catch (e) { FS = null; }
}

/* ============================================================
   COLORES (modo claro y oscuro)
   ============================================================ */
const KEY = 'misnotas_v1';
/* Fondos desenfocados (imágenes pequeñas incluidas en el código) */
const BG_DARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAACgCAIAAAADw+wqAAANuklEQVR42u1dWXakOBBU8jjPzJv7Hy7mgwKkVOQiiXK77XKvrgJKCiK3UCLLP//+B6DMfHXn4fjr+NUfifrX8cr1d/X99S39Dz2lHk09quOAc2Svt70pbbNYsOtK8w95Z/4LwUdPj1nB8abrZme2QsbBz8mcvr0FC0myQa6/jTMwywtM3T9sX8MLjPECjzERY2Pc3o8FpkzkMURyp2PYWIbGlDMXhRQWEEF/wQnL2t5qI1Wo0wHvYT87P2AMu9JxLLB+LvD6PcSywfCD4cgy6TsxeasXo+lQHBkOtFNYu9TA2x3nNI6AC4c7LHivY4IUjWHkYoG2kcpJ+UOFNdnt2Zja+HfYA6gmcr01a17P8OL42gexQJxDw/WsJXoXk/5iHQsOx1RRd99ixKO4SA0PAqQ+zraRYSwUHJjPO6FnhcH0GNBu5y7OgeZAtJLBQ7xQkWUBCzuv1BEHVuKI2gnjxAb8VkFxbM666Sn7AhZQ/hPR56KZBgrqkOKdfR6AMulYsgXuPukrbuXLx8KlRjes9ltYcbvWxJIlQjJo7tPOQs+UO2MdUa15AMHtTIZ/kP8O5Hj7bEXGrw71pm1Hl4FcnqKKE+efnP9jM59M3vehKA4V4bzwXGm6Onfs5d8msWw9BeNFIKHAGkQ4vx2DzqInH3z1ARqLUgdKLgK00bTxFLDRGAsidMx7yTtraEi8FLO77db0Lj4UoF0nIPDdB5teYk5bwOVKhzOZMMg3M6mwaF5GA1prNSfwDXylKdNgBvJpZTDvSseAoOxAX3+23HllpmcEN9mhqiMjDZxTw/Y1IJgdacs3gqwKJlU2p50waALal4wYpwaSgTaM1eApCJS9WChcBqJue2MmTqLVEwSkRsRo9rpHxWf3PUOhXZYl7GC4QLPjJBLzuIU4nn4JNlvSwck74OUXZq7Hww3aIY6wA10m0rGggN+x7obMYQGUHU+zo3EZJjs6G7l8hF7ft10Oy7JGnYWyr51iDTulYOygg2sDR0uc3l+gbVYweKEo4GMxknWgTdKRMozea0ExpZ688qqlSyaavMoNqDokaz+JoAiU7GrBjsA6+LSZ41AtLQSCiiPQfxEb4Vg02T0Md9JiIzBB6cRBGDzoFEke5Hhw7UQ803O07pO6i+4ivYqA6PbLcYF26bh3NJodZroFAtmVhkNbCgu4RpZJqdGzg2PROBOhIsP1jxwXFfHEQWc5QK+B9I6qEXAbyGgazoMK1IV6zdjwGjq2BstLaLli5h2ugg+4tUmbJqiR1q5C5xssJ40MpEYF4aKMn5KKIQ7GwhGYf4FuU1AOtC5TmPtUAYe81FR3jcsyHGhieeZ8U4QiAlsrpbwgnoFGWXZ7FRQKL+ssHVI9405icfoQhQh8vQM0JVW5FrEUzQhqHSx2omtMBchwYGpP10jk5VjFCREnIt3CQqCIlmJn3wZhvLjacyF2GabhMi365RvOP07mXsUZb2HByoXROQvCYF6Bopik6F6vkWgrZR3jxI8jN0DiWFCNiGEszHF0KySg2YEDhFXgcU+hQE5WEVMLiRdku41BV7zCCf0MAQ4EVf39jBPDqngqsqInyM79dgQHvcNh07xHgW6RoRUWQyz0fW4MSnpEwNyqaDgoGXX2TRKNvkLjGh9zC+j8UaudBgtraKd9vCYuMcxgumvVEXyhCb0FQ2keiIjQF7pKI9SfAr9riBT5vq3EWckOlmIZod6aaQCEMggmltbB2kyLvUrNdRZVzI3WaGHJsLr4oHeFJZZ0mV5L29CpS6GLBowZeEtP3eFQd9qsS318HzWUpYQ2ootz4ifDxhvMRROUy52IZSnAyY4ecX6jnMl119FBQ8u/BAusJxBiv41YENvbCdDUy6IGjxp9Bodu9ZDKa3i+hRIZG9E1i2kpITXo+mMxUgrW3BQsN9s3XJ7o1WbiIGCtObKw2gpTverBH58EUmudchwgt9ybmbHU4WYFizuyUEQYNdAVuKTFMcj67dFIxQS58blOlshJyJyNkBKOdK9lnWi4OJhqVpPUBEVzSb0htsARA2WqYegzwrrUvqRKFIcddFFmwEEUa+oXl0AvIqf8N9wAtNsdHHPssBarFr9EpJAqQgKARZLRG478w9jBK/O+voJbbshxsow9aKsZ0ak/8IGsxi5+PN7dmIKu9ixGTwe9CQi010mitHPCaUtiMrG3KmuQu9GQ2C0lBOzwPiZvwGJey76rUnkXMfKRhlNenrbTR6XMYKHL+v6icSOOZShCQodLcRixRRhXCVJkgDvP7VlECJ4xwwoJpNKs+AE9GiJOtS8SkBL0PvXNUEqgVxVrIV1qo6bPY0D/rriEknqgJDtBiAhNwxLrCohdwFhnez1rETNG+rFAqrz15VzqIR7voj/FSIjFMBZD+nqgwCy2kTRBQ0J2SDW017xxJSfV7RxkiOyd46BNAKQlLMAETN4O932RLu+yFwSuzOxC4gWQlFvrKegTWgMjAW52wImOxoOMUdcUmaU4IeYGQMRlh3KfNxIiQpRDydBYSOdgth1RK0ZYdqY1YNIgIGapqthRL0Gq208JUo1f+ryDrA/T5VhiSK6nVJZyjUNEl1yaF9KmEh2Qte+4gZBXFaDdKlIZ38axQJIg3UouPHlGClyPWm8FJIPbSUky2QsCbe8VET9GxIiBkayLOBS56FAXeCIhBFClGvWU9XWcO73FByExY8x7jSgMP31RV4jaXAl3sed9KTvJs50dCRaP1G+mhpWytqFK9qk7ibztKAuQGZ5IMmieO0NNb0y2mJY+lvKzs0TqYCT5E7dpLNYz9BVErLrjBEIosxDNY/9SLPJL6cSkTE23cKFY3Af5EESWvJ9Ob8wDO5sd1tDS+2bJyLAHNsoy2vMyWLgROXjostVfIxTmVpgQ5x0z1i7hJ/HtbLouCbvN2Ny2o35In/QMuVthmDhtBtvm4ohzE6uNGKpp0K0tal5EHxR4B6bWeF3c+0OZRSB8nDV01Qh+/gfAUZhLAV6q3n1Ean2vrbhI20y/ogg8YCy+Wtdz+ejEZ3QnPRRovWY610K9qQP7AOS7cXfuOzFEjuR+O6+SVmqPK3LT4Cy9TkVTqjhK9A7Yy6jIGocJx+xehqn1nNZCcPsnqXocpf1QqR7oQ7QXjk1/ZLccOXrDEmYvyQLBz+dPx4EqF2vcyWUxpxZ8auFSnMYNwGkSGFj7MR4rLquN7942fOfcmwcsulT1XCnASy+CnItMDgoORZGkEI8ssOhgrXRKHsHjuTypc/ZrwpVWiOrPqy8q2qqBmijyvOBwGJ8qS1mHU5A0/+D0RoodXC5tW1cnx+LsOVi/J3SFokgRcE12oP0Vr8wCmtLq5cZvpPa79FNBxJuS7N7b8pAeRp6uAOt4US83Cb4hptvlkgxjcbPDbF/jBKlfFCRE9+7b4yy9JFkPW/gD4jCEDJ2BSvWIeRKLEw7HX0QEAWYiceUs6uyiuaWXLO6KDl6vJl0T8wvcWP4hPUaSl0j9edwR9I4hgpYtxVi8kaBdc6rYT6hhevJGU2PBCBYq0p5ylmaLoyOM7yeaED72A2hB0BSO+K00Z8AC7ukv72Ar/JgbIYntRzpo/Ru223M21zgBmVdLEQiCUlPF1E1rXhXnAajRhbLttMTgaNHzuR+WkSUsDNGGqALgGuO5a9DEboFugX9H0GQGIlcrI7M1mf5JC5W9wKFk09WSSIAzTm0LBWj3gJoj5s96mn4S+NKNjYhpSEsLCeOeKtJaL2+lKZQjjz7Ih5ljZeBEss4ips1L4CxMFyTlvV9k52RM3YQtUfl0/G9K9BjN80QZNJVZbBa4uJFZibiXFuN+y9tu9hdhcfxAEqQdpwZNEhSQr8BCzAJ3UPjYBkNJwtE0LcWvY2R+jtO8mHlMcPOvKxKJFy0ioL7zBQoGcJE8JWhj3wAp6nO32HEGH2M5T6GglKgfaYJLVmkrZWDzxeOFLfJDWp5apXUAxoTblWle9CcmOgdTXWuSOFIeT0CexaKQzsFxRCp/IW3EwVvp4cs/rgLgqmHJWE3bV/mD4/LKjPGee8uMNGvI/vNf28jmwCJDnUBCc5MHcq0QC4sa4bNw22BKJCO93q8AK7JkGGaIinGVISyKq5X69MtL5+eGC/AvlHukIGFfwuiR3BV6n6WyJH8aXy+naakEmTMkOUhqJvkdsvdRLGpdtnmce7hNH1HW4ic8PhYygUWJf6hAFEeSGyEs9YN+FRa9K8XclKoe8OeL7i/DovDesNnby5mCOd+UxUIMnzG3o/6+hgVZQE6YzzNYsGcHl7Aoxe8Nm5zVaCROHoUMECtYFN4btoRFB4rcUvZKIprcuGEFi/qx4iex0IukZ3WiJH4k51/CvSuewaKM/3jeMvfgDS2Na4UzkZPKyOfObSCG/UuxMCvl1fLuESxKJA4+gsXbfz71U1hoOP4UFvgeWDS+449hsSCCT6NqlVrbBwsNxweLG44PFo/IPz8Qixn5ZxELLDyj/G4shuWfb4PFTAKeOXH7YGHB8duxKJlmqN+DRSz/REnaj8LiYMcHizjveEdy8d2xCOD4VVh4athfjsW0eoTtg0V94vbBoj5x+2BhPhr412GxEkQoiNsHCxJo/4h48d2wKK44+OuwKM6PnPi5WDzaDLWOxReIWnNY0Lzj92JRJtSwH4xFGVXDfjYWZUgN+/FYlKQa9peKFxOP8G4fLOqv/wF3lXkjkNDrSwAAAABJRU5ErkJggg==';
const BG_LIGHT = 'data:image/png;base64,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';

const THEMES = {
  /* Noche: vidrio grafito neutro */
  dark: {
    grad: ['#111215', '#111215', '#111215'],
    blobs: [
      { color: '#7c4dff', x: 0.05, y: 0.12, s: 1.05 },
      { color: '#00d4ff', x: 0.95, y: 0.45, s: 0.95 },
      { color: '#ff5e3a', x: 0.15, y: 0.92, s: 0.9 },
    ],
    bgImage: BG_DARK,
    frost: 'rgba(255,255,255,0.02)',
    text: '#f4f5f7', muted: 'rgba(240,241,244,0.6)', border: 'rgba(255,255,255,0.16)', accent: '#ff8a3d',
    fill: 'rgba(255,255,255,0.04)',            // relleno blanco 4%
    strong: 'rgba(28,29,33,0.80)',             // vidrio más sólido (menú, avisos)
    stroke: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.28)'],
    sheen: 'rgba(255,255,255,0.07)',
    hi: 'rgba(255,255,255,0.28)',              // brillo interno arriba
    lo: 'rgba(0,0,0,0.30)',                    // sombra interna abajo
    dockFill: 'rgba(255,255,255,0.05)',
    scrim: 'rgba(0,0,0,0.35)',
    bar: 'light-content',
    inv: '#111215',
    wallDim: 'rgba(0,0,0,0.38)',
    card: 'transparent',
  },
  /* Día: vidrio esmerilado plateado neutro */
  light: {
    grad: ['#e6e7ea', '#e6e7ea', '#e6e7ea'],
    blobs: [
      { color: '#a78bfa', x: 0.05, y: 0.12, s: 1.05 },
      { color: '#38d6f5', x: 0.95, y: 0.45, s: 0.95 },
      { color: '#ffa36b', x: 0.15, y: 0.92, s: 0.9 },
    ],
    bgImage: BG_LIGHT,
    frost: 'rgba(255,255,255,0.04)',
    text: '#16181d', muted: 'rgba(22,24,29,0.55)', border: 'rgba(22,24,29,0.12)', accent: '#ff7a2a',
    fill: 'rgba(255,255,255,0.40)',
    strong: 'rgba(255,255,255,0.85)',
    stroke: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.75)'],
    sheen: 'rgba(255,255,255,0.35)',
    hi: 'rgba(255,255,255,0.90)',
    lo: 'rgba(0,0,0,0.07)',
    dockFill: 'rgba(255,255,255,0.45)',
    scrim: 'rgba(0,0,0,0.15)',
    bar: 'dark-content',
    inv: '#ffffff',
    wallDim: 'rgba(255,255,255,0.40)',
    card: 'transparent',
  },
};
const TITLES = { all: 'Todas las notas', fav: 'Favoritos', trash: 'Papelera' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ============================================================
   GUARDAR Y CARGAR
   ============================================================ */
function notesFile() {
  return new FS.File(FS.Paths.document, 'notas.json');
}

const WALL_KEY = 'misnotas_fondo';
/* id vacío = fondo del menú principal; id de nota = fondo solo de esa nota */
function wallFile(id) {
  return new FS.File(FS.Paths.document, id ? `fondo_${id}.txt` : 'fondo.txt');
}
function wallKey(id) { return id ? `${WALL_KEY}_${id}` : WALL_KEY; }
async function loadWallpaper(id) {
  if (FS) {
    try { const f = wallFile(id); if (f.exists) return await f.text(); } catch (e) {}
  }
  return (await AsyncStorage.getItem(wallKey(id))) || null;
}
async function saveWallpaper(data, id) {
  if (FS) {
    try {
      const f = wallFile(id);
      if (!data) { if (f.exists) f.delete(); return; }
      if (!f.exists) f.create();
      f.write(data);
      return;
    } catch (e) {}
  }
  if (data) await AsyncStorage.setItem(wallKey(id), data);
  else await AsyncStorage.removeItem(wallKey(id));
}

async function loadData() {
  if (FS) {
    try {
      const f = notesFile();
      if (f.exists) return JSON.parse(await f.text());
    } catch (e) {}
  }
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

async function saveData(data) {
  const str = JSON.stringify(data);
  if (FS) {
    try {
      const f = notesFile();
      if (!f.exists) f.create();
      f.write(str);
      return;
    } catch (e) {}
  }
  await AsyncStorage.setItem(KEY, str);
}

/* ============================================================
   AYUDANTES
   ============================================================ */
function fmtDate(t) {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/* Texto simple de una nota (para vista previa y búsqueda) */
function toPlain(n) {
  if (!n.html) return n.content || '';
  return (n.content || '')
    .replace(/<(br|\/div|\/p|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* Convierte notas antiguas (texto simple) al nuevo formato */
function toHtml(n) {
  if (n.html) return n.content || '';
  return (n.content || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* Título con formato (colores, tamaños...) */
function toTitleHtml(n) {
  if (n.titleHtml) return n.titleHtml;
  const esc = (n.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return n.titleColor && esc ? `<span style="color:${n.titleColor}">${esc}</span>` : esc;
}
/* Primer color usado en el título (para la tarjeta) */
function titleColorOf(n) {
  const m = n.titleHtml && n.titleHtml.match(/color:\s*([^;"]+)/);
  return m ? m[1].trim() : (n.titleColor || null);
}

/* Divide el título en partes con su color/negrita/cursiva (para la tarjeta) */
function decodeHtml(t) {
  return t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
function titleSegments(n) {
  const html = toTitleHtml(n);
  if (!html) return [];
  const out = [];
  const stack = [{}];
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) {
      const text = decodeHtml(m[3]).replace(/\u200B/g, '');
      if (text) out.push({ text, ...stack[stack.length - 1] });
      continue;
    }
    const tag = m[1].toLowerCase();
    if (tag === 'br') continue;
    if (m[0][1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    const st = { ...stack[stack.length - 1] };
    const attrs = m[2] || '';
    if (tag === 'b' || tag === 'strong') st.bold = true;
    if (tag === 'i' || tag === 'em') st.italic = true;
    if (tag === 'u') st.underline = true;
    const fc = attrs.match(/color="([^"]+)"/);
    if (tag === 'font' && fc) st.color = fc[1];
    const sm = attrs.match(/style="([^"]*)"/);
    if (sm) {
      const css = sm[1];
      const c1 = css.match(/(?:^|;)\s*color:\s*([^;]+)/); if (c1) st.color = c1[1].trim();
      const fw = css.match(/font-weight:\s*([^;]+)/); if (fw) st.bold = /bold|[6-9]00/.test(fw[1]);
      const fs = css.match(/font-style:\s*([^;]+)/); if (fs) st.italic = /italic/.test(fs[1]);
      const td = css.match(/text-decoration[a-z-]*:\s*([^;]+)/); if (td) st.underline = /underline/.test(td[1]);
      const ol = css.match(/(?:-webkit-)?text-stroke:\s*([^;]+)/) || css.match(/text-shadow:\s*([^;]+)/);
      if (ol) {
        const colm = ol[1].match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b(?=\s*$)/);
        st.outline = /none|^\s*0(px)?\s*$/.test(ol[1]) ? null : (colm ? colm[0] : null);
      }
    }
    if (/\/\s*$/.test(attrs)) continue;   // etiqueta que se cierra sola
    stack.push(st);
  }
  return out;
}

/* Primera foto de la nota (para mostrarla en la tarjeta) */
function firstImg(n) {
  if (!n.html || !n.content) return null;
  const m = n.content.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
}

/* ============================================================
   LIQUID GLASS: piezas de vidrio
   ============================================================ */

/* Fondo de vidrio desenfocado (una imagen muy borrosa estirada a toda la pantalla) */
function Background({ t, wall, blur }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {wall ? (
        <>
          {/* blur -1 = "Nada": la imagen tal cual, sin desenfoque ni capa encima */}
          <Image source={{ uri: wall }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={blur > 0 ? blur : 0} />
          {blur >= 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: t.wallDim }]} />}
        </>
      ) : (
        <>
          <Image source={{ uri: t.bgImage }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 2} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: t.frost }]} />
        </>
      )}
    </View>
  );
}

/* Cristal: relleno 4%, borde 0.5 con degradado, brillo arriba y sombra abajo */
function Glass({ t, style, inner, radius = 20, strong, children }) {
  return (
    <LinearGradient
      colors={t.stroke}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, padding: 0.5 }, style]}
    >
      <View style={{ flexGrow: 1, borderRadius: radius - 0.5, overflow: 'hidden', backgroundColor: strong ? t.strong : t.fill }}>
        {/* reflejo diagonal */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.sheen, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
        {/* sombra interna blanca arriba (+2) */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.hi, 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6 }}
        />
        {/* sombra interna negra abajo (-2) */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', t.lo]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6 }}
        />
        <View style={[{ flexGrow: 1 }, inner]}>{children}</View>
      </View>
    </LinearGradient>
  );
}

/* Botón redondo de cristal */
function Ico({ name, set, size = 20, color }) {
  const C = set === 'mci' ? MaterialCommunityIcons : Feather;
  return <C name={name} size={size} color={color} />;
}

function IconBtn({ name, set, onPress, s, t, dim }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={{ marginHorizontal: 3 }}>
      <Glass t={t} radius={22} style={{ width: 44, height: 44 }} inner={s.center}>
        <View style={dim ? { opacity: 0.4 } : null}>
          <Ico name={name} set={set} size={20} color={t.text} />
        </View>
      </Glass>
    </TouchableOpacity>
  );
}

/* ============================================================
   APP PRINCIPAL
   ============================================================ */
export default function App() {
  const [notes, setNotes] = useState([]);
  const [layout, setLayout] = useState('grid');   // 'grid' o 'list'
  const [dark, setDark] = useState(true);
  const [view, setView] = useState('all');        // 'all', 'fav', 'trash'
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [wallpaper, setWallpaper] = useState(null);   // tu imagen de fondo
  const [wallBlur, setWallBlur] = useState(8);        // desenfoque del fondo
  const [newOpen, setNewOpen] = useState(false);      // catálogo de nota nueva
  const [wallOpen, setWallOpen] = useState(false);    // ventana de fondo de pantalla
  const [wallFor, setWallFor] = useState(null);       // null = menú principal; id = una nota
  const [noteWall, setNoteWall] = useState(null);     // fondo propio de la nota abierta
  const [titleColorOpen, setTitleColorOpen] = useState(false);
  const toastTimer = useRef(null);
  const iframeRef = useRef(null);
  const webRef = useRef(null);

  const { width } = useWindowDimensions();
  const c = dark ? THEMES.dark : THEMES.light;
  const s = useMemo(() => makeStyles(c), [dark]);

  /* ---------- Cargar notas guardadas ---------- */
  useEffect(() => {
    loadWallpaper().then(w => { if (w) setWallpaper(w); }).catch(() => {});
    loadData()
      .then(data => {
        if (!data) return;
        setNotes(data.notes || []);
        setLayout(data.layout || 'grid');
        setDark(!!data.dark);
        if (typeof data.wallBlur === 'number') setWallBlur(data.wallBlur);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  /* ---------- Guardado automático ---------- */
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveData({ notes, layout, dark, wallBlur }).catch(() => showToast('No se pudo guardar'));
    }, 500);
    return () => clearTimeout(t);
  }, [notes, layout, dark, wallBlur, loaded]);

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1800);
  }

  /* ---------- Acciones con notas ---------- */
  const current = notes.find(n => n.id === currentId);

  function newNote(kind = 'text') {
    const now = Date.now();
    const n = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      title: '', content: '', html: true, created: now, updated: now,
      fav: false, pinned: false, deleted: false, kind,
      ink: kind === 'draw' ? [] : undefined,
    };
    setNewOpen(false);
    setNotes(ns => [...ns, n]);
    setCurrentId(n.id);
    // Nota con dibujo: primero elegir un fondo (se puede omitir con "Listo")
    if (kind === 'draw') setTimeout(() => openWall(n.id), 350);
  }

  // Cambia algo de una nota. "touch" = actualizar la fecha de modificación
  function patch(id, changes, touch = true) {
    setNotes(ns => ns.map(n =>
      n.id === id ? { ...n, ...changes, ...(touch ? { updated: Date.now() } : {}) } : n));
  }

  function isEmpty(n) {
    return !n.title.trim() && !toPlain(n).trim() && !firstImg(n) && !n.hasWall && !(n.ink && n.ink.length);
  }

  function closeEditor() {
    const id = currentId;
    const finish = () => {
      // Si la nota quedó vacía, se descarta
      setNotes(ns => ns.filter(n => !(n.id === id && isEmpty(n))));
      setCurrentId(cur => (cur === id ? null : cur));
      setCropOpen(false);
      setTitleColorOpen(false);
    };
    // Primero se guarda lo último que escribiste en el editor
    if (Platform.OS === 'web') {
      try {
        const r = iframeRef.current && iframeRef.current.contentWindow.getHtml();
        if (r) patch(id, { content: r.html, html: true, title: r.title, titleHtml: r.titleHtml, ...(r.ink ? { ink: r.ink } : {}) });
      } catch (e) {}
      finish();
    } else if (webRef.current) {
      webRef.current.injectJavaScript('window.flushNow && window.flushNow(); true;');
      setTimeout(finish, 150);
    } else {
      finish();
    }
  }

  function toggleFav() {
    patch(current.id, { fav: !current.fav }, false);
    showToast(current.fav ? 'Quitada de favoritos' : 'Añadida a favoritos');
  }

  function togglePin() {
    patch(current.id, { pinned: !current.pinned }, false);
    showToast(current.pinned ? 'Nota desfijada' : 'Nota fijada arriba');
  }

  function moveToTrash() {
    if (isEmpty(current)) { closeEditor(); return; }
    patch(current.id, { deleted: true }, false);
    setCurrentId(null);
    showToast('Movida a la papelera');
  }

  function restore() {
    patch(current.id, { deleted: false }, false);
    setCurrentId(null);
    showToast('Nota restaurada');
  }

  function destroy() {
    const id = current.id;
    Alert.alert('Eliminar nota', '¿Eliminar esta nota para siempre? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: () => {
          setNotes(ns => ns.filter(n => n.id !== id));
          saveWallpaper(null, id).catch(() => {});
          setCurrentId(null);
          showToast('Nota eliminada');
        },
      },
    ]);
  }

  async function pickWallpaper() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,      // te deja recortar la imagen al tamaño de la pantalla
        aspect: [9, 16],
        quality: 0.5,
        base64: true,
      });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      const data = a.base64 ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` : a.uri;
      if (wallFor) {
        await saveWallpaper(data, wallFor);
        setNoteWall(data);
        patch(wallFor, { hasWall: true }, false);
        showToast('Fondo aplicado solo a esta nota');
      } else {
        await saveWallpaper(data);
        setWallpaper(data);
        showToast('Fondo de pantalla aplicado');
      }
    } catch (e) {
      showToast('No se pudo usar esa imagen');
    }
  }

  async function removeWallpaper() {
    if (wallFor) {
      await saveWallpaper(null, wallFor).catch(() => {});
      setNoteWall(null);
      patch(wallFor, { hasWall: false }, false);
      showToast('Fondo de la nota quitado');
    } else {
      await saveWallpaper(null).catch(() => {});
      setWallpaper(null);
      showToast('Fondo original restaurado');
    }
  }

  function openWall(target) { setWallFor(target || null); setWallOpen(true); }

  // Al abrir una nota, cargar su fondo propio (si tiene)
  useEffect(() => {
    setNoteWall(null);
    const n = notes.find(x => x.id === currentId);
    if (!n || !n.hasWall) return;
    let alive = true;
    loadWallpaper(n.id).then(w => { if (alive) setNoteWall(w); }).catch(() => {});
    return () => { alive = false; };
  }, [currentId]);

  function toggleSearch() {
    if (searchOpen) setQuery('');
    setSearchOpen(!searchOpen);
  }

  /* ---------- Mensajes que llegan desde el editor ---------- */
  function onEditorMessage(data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'change' && m.id) {
        patch(m.id, { content: m.html, html: true, title: m.title || '', titleHtml: m.titleHtml || '', ...(m.ink ? { ink: m.ink } : {}) });
      }
      if (m.type === 'crop') setCropOpen(!!m.open);
    } catch (e) {}
  }

  // En la vista previa de Replit (web) el editor avisa por "postMessage"
  useEffect(() => {
    if (Platform.OS !== 'web' || !currentId) return;
    const handler = e => {
      if (iframeRef.current && e.source === iframeRef.current.contentWindow) onEditorMessage(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [currentId]);

  // El editor se arma una sola vez al abrir la nota
  const editorHtml = useMemo(() => {
    if (!current) return '';
    return buildEditorHtml({
      id: current.id, content: toHtml(current), titleHtml: toTitleHtml(current),
      updated: current.updated, editable: !current.deleted, c,
      kind: current.kind, ink: current.ink,
    });
  }, [currentId, dark, current && current.deleted]);

  /* ---------- Botón "atrás" de Android ---------- */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cropOpen && webRef.current) {
        webRef.current.injectJavaScript('window.closeCrop && window.closeCrop(); true;');
        return true;
      }
      if (wallOpen) { setWallOpen(false); return true; }
      if (newOpen) { setNewOpen(false); return true; }
      if (currentId) { closeEditor(); return true; }
      if (menuOpen) { setMenuOpen(false); return true; }
      if (searchOpen) { setSearchOpen(false); setQuery(''); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentId, menuOpen, searchOpen, cropOpen, wallOpen, newOpen]);

  /* ---------- Notas que se muestran ---------- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => (view === 'trash' ? n.deleted : !n.deleted && (view !== 'fav' || n.fav)))
      .filter(n => !q || (n.title + ' ' + toPlain(n)).toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
  }, [notes, view, query]);

  const counts = {
    all: notes.filter(n => !n.deleted).length,
    fav: notes.filter(n => !n.deleted && n.fav).length,
    trash: notes.filter(n => n.deleted).length,
  };

  const toast = toastMsg ? (
    <View style={s.toastWrap} pointerEvents="none">
      <Glass t={c} strong radius={20}><Text style={s.toastText}>{toastMsg}</Text></Glass>
    </View>
  ) : null;

  /* ---------- Ventana: fondo de pantalla (menú o nota) ---------- */
  const wallNote = wallFor ? notes.find(n => n.id === wallFor) : null;
  const wallData = wallFor ? noteWall : wallpaper;
  const wallBlurNow = wallFor ? ((wallNote && wallNote.wallBlur) ?? 8) : wallBlur;
  const wallModal = (
    <Modal visible={wallOpen} transparent animationType="fade" onRequestClose={() => setWallOpen(false)}>
      <Pressable style={[s.wallScrim, { backgroundColor: c.scrim }]} onPress={() => setWallOpen(false)}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420 }}>
          <Glass t={c} strong radius={28} inner={{ padding: 20 }}>
            <Text style={s.wallTitle}>{wallFor ? 'Fondo de esta nota' : 'Fondo de pantalla'}</Text>
            <Text style={s.wallHint}>{wallFor ? 'Solo se verá dentro de esta nota.' : 'Se verá en el menú principal.'}</Text>

            <View style={s.wallPreview}>
              <Background t={c} wall={wallData} blur={wallBlurNow} />
              <Text style={[s.wallPreviewText, { color: c.text }]}>Vista previa</Text>
            </View>

            <TouchableOpacity onPress={pickWallpaper} activeOpacity={0.8} style={[s.wallBtn, { backgroundColor: c.text }]}>
              <Feather name="image" size={18} color={c.inv} />
              <Text style={[s.wallBtnText, { color: c.inv }]}>Elegir de la galería</Text>
            </TouchableOpacity>

            {wallData && (
              <>
                <Text style={s.wallLabel}>Desenfoque</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[['Nada', -1], ['Poco', 0], ['Suave', 8], ['Fuerte', 20]].map(([label, v]) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => (wallFor ? patch(wallFor, { wallBlur: v }, false) : setWallBlur(v))}
                      style={[s.blurChip, { borderColor: c.border }, wallBlurNow === v && { backgroundColor: c.text, borderColor: c.text }]}
                    >
                      <Text style={{ color: wallBlurNow === v ? c.inv : c.text, fontSize: 15 }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={removeWallpaper} activeOpacity={0.7} style={s.wallRemove}>
                  <Feather name="x" size={16} color={c.muted} />
                  <Text style={{ color: c.muted, fontSize: 15, marginLeft: 6 }}>{wallFor ? 'Quitar fondo de la nota' : 'Quitar mi fondo'}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setWallOpen(false)} style={{ alignSelf: 'center', padding: 10, marginTop: 6 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Listo</Text>
            </TouchableOpacity>
          </Glass>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (!loaded) return <View style={s.screen} />;

  /* ============================================================
     PANTALLA DEL EDITOR
     ============================================================ */
  if (current) {
    const inTrash = current.deleted;
    return (
      <View style={s.screen}>
        {/* Cada nota usa SOLO su propio fondo; si no tiene, el vidrio por defecto */}
        <Background t={c} wall={noteWall} blur={current.wallBlur ?? 8} />
        <StatusBar barStyle={c.bar} backgroundColor="transparent" translucent />
        <View style={s.topbar}>
          <IconBtn name="arrow-left" onPress={closeEditor} s={s} t={c} />
          <View style={{ flex: 1 }} />
          {inTrash ? (
            <>
              <IconBtn name="rotate-ccw" onPress={restore} s={s} t={c} />
              <IconBtn name="x" onPress={destroy} s={s} t={c} />
            </>
          ) : (
            <>
              <IconBtn set="mci" name={current.pinned ? 'pin' : 'pin-outline'} onPress={togglePin} s={s} t={c} />
              <IconBtn set="mci" name={current.fav ? 'star' : 'star-outline'} onPress={toggleFav} s={s} t={c} />
              <IconBtn name="image" onPress={() => openWall(current.id)} s={s} t={c} />
              <IconBtn name="trash-2" onPress={moveToTrash} s={s} t={c} />
            </>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ paddingHorizontal: 20, paddingTop: inTrash ? 10 : 0 }}>
            {inTrash && (
              <Glass t={c} radius={16} style={{ marginBottom: 12 }} inner={{ padding: 12 }}>
                <Text style={s.bannerText}>Esta nota está en la papelera. Restáurala para editarla.</Text>
              </Glass>
            )}
            {/* El título y la fecha ahora están dentro del editor */}
          </View>

          <View style={{ flex: 1 }}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={iframeRef}
                srcDoc={editorHtml}
                title="editor"
                allowTransparency
                style={{ border: 'none', width: '100%', height: '100%', backgroundColor: 'transparent' }}
              />
            ) : (
              <WebView
                ref={webRef}
                originWhitelist={['*']}
                source={{ html: editorHtml }}
                onMessage={e => onEditorMessage(e.nativeEvent.data)}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                containerStyle={{ backgroundColor: 'transparent' }}
                allowFileAccess
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView
              />
            )}
          </View>
        </KeyboardAvoidingView>
        {wallModal}
        {toast}
      </View>
    );
  }

  /* ============================================================
     PANTALLA PRINCIPAL
     ============================================================ */
  const isGrid = layout === 'grid';
  const cols = width >= 700 ? 3 : 2;
  const cardW = (width - 32 - 12 * (cols - 1)) / cols;

  const emptyMsg = query
    ? ['search', 'Ninguna nota coincide con la búsqueda.']
    : { all: ['file-text', 'No hay notas todavía.\nToca el lápiz para crear la primera.'],
        fav: ['star', 'Aún no tienes favoritos.'],
        trash: ['trash-2', 'La papelera está vacía.'] }[view];

  return (
    <View style={s.screen}>
      <Background t={c} wall={wallpaper} blur={wallBlur} />
      <StatusBar barStyle={c.bar} backgroundColor="transparent" translucent />

      {/* Barra superior */}
      <View style={s.topbar}>
        <IconBtn name="menu" onPress={() => setMenuOpen(true)} s={s} t={c} />
        <View style={{ flex: 1 }} />
        <IconBtn name="search" onPress={toggleSearch} s={s} t={c} />
        <IconBtn name={isGrid ? 'list' : 'grid'} onPress={() => setLayout(isGrid ? 'list' : 'grid')} s={s} t={c} />
        <IconBtn name={dark ? 'sun' : 'moon'} onPress={() => setDark(!dark)} s={s} t={c} />
      </View>

      {/* Lista de notas */}
      <FlatList
        key={layout + cols}
        data={visible}
        keyExtractor={n => n.id}
        numColumns={isGrid ? cols : 1}
        columnWrapperStyle={isGrid ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={s.hero}>
              <Text style={s.heroTitle}>{TITLES[view]}</Text>
              <Text style={s.heroCount}>{visible.length} {visible.length === 1 ? 'nota' : 'notas'}</Text>
            </View>
            {searchOpen && (
              <Glass t={c} radius={24} style={{ marginBottom: 14 }}>
                <TextInput
                  style={s.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar notas..."
                  placeholderTextColor={c.muted}
                  autoFocus
                />
              </Glass>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={{ marginBottom: 14, opacity: 0.6 }}><Feather name={emptyMsg[0]} size={42} color={c.muted} /></View>
            <Text style={s.emptyText}>{emptyMsg[1]}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const thumb = firstImg(item);
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setCurrentId(item.id)}
              style={isGrid ? { width: cardW } : null}
            >
              <Glass t={c} radius={22} inner={[s.cardInner, isGrid && { minHeight: 150 }]}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.title ? titleSegments(item).map((g, i) => (
                      <Text key={i} style={{
                        color: g.color || c.text,
                        fontWeight: g.bold === false ? '400' : '700',
                        fontStyle: g.italic ? 'italic' : 'normal',
                        textDecorationLine: g.underline ? 'underline' : 'none',
                        ...(g.outline ? { textShadowColor: g.outline, textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } } : {}),
                      }}>{g.text}</Text>
                    )) : 'Sin título'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {item.pinned && <MaterialCommunityIcons name="pin" size={14} color={c.muted} />}
                    {item.kind === 'draw' && <Feather name="edit-2" size={13} color={c.muted} />}
                    {item.fav && <MaterialCommunityIcons name="star" size={14} color={c.muted} />}
                  </View>
                </View>
                {thumb && (
                  <Image source={{ uri: thumb }} style={[s.thumb, !isGrid && { height: 120 }]} resizeMode="cover" />
                )}
                <Text style={s.preview} numberOfLines={thumb ? 2 : isGrid ? 4 : 2}>{toPlain(item)}</Text>
                <Text style={s.date}>{fmtDate(item.updated)}</Text>
              </Glass>
            </TouchableOpacity>
          );
        }}
      />

      {/* Botón flotante con brillo */}
      {view !== 'trash' && (
        <TouchableOpacity style={s.fabWrap} onPress={() => setNewOpen(true)} activeOpacity={0.85}>
          <View style={s.fab}>
            <Feather name="edit-3" size={24} color={c.inv} />
          </View>
        </TouchableOpacity>
      )}

      {/* Menú lateral de cristal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.scrim }}>
          <Glass t={c} strong radius={28} style={s.sidebar} inner={s.sidebarInner}>
            <Text style={s.sideTitle}>Mis Notas</Text>
            {[['all', 'file-text'], ['fav', 'star'], ['trash', 'trash-2']].map(([key, icon]) => (
              <TouchableOpacity key={key} onPress={() => { setView(key); setMenuOpen(false); }} activeOpacity={0.7}>
                {view === key ? (
                  <Glass t={c} radius={16} style={{ marginBottom: 4 }} inner={s.navItem}>
                    <Feather name={icon} size={19} color={c.text} style={s.navIcon} />
                    <Text style={[s.navText, { fontWeight: '700' }]}>{TITLES[key]}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </Glass>
                ) : (
                  <View style={[s.navItem, { marginBottom: 4 }]}>
                    <Feather name={icon} size={19} color={c.muted} style={s.navIcon} />
                    <Text style={s.navText}>{TITLES[key]}</Text>
                    <Text style={s.navCount}>{counts[key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <View style={s.sep} />
            <TouchableOpacity style={s.navItem} activeOpacity={0.7} onPress={() => { setMenuOpen(false); openWall(null); }}>
              <Feather name="image" size={19} color={c.muted} style={s.navIcon} />
              <Text style={s.navText}>Fondo de pantalla</Text>
            </TouchableOpacity>
            <View style={s.navItem}>
              <Feather name="folder" size={19} color={c.muted} style={s.navIcon} />
              <Text style={[s.navText, { color: c.muted }]}>Carpetas</Text>
              <Text style={s.navCount}>Pronto</Text>
            </View>
          </Glass>
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {wallModal}

      {/* Catálogo: tipo de nota nueva */}
      <Modal visible={newOpen} transparent animationType="fade" onRequestClose={() => setNewOpen(false)}>
        <Pressable style={[s.newScrim, { backgroundColor: c.scrim }]} onPress={() => setNewOpen(false)}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420 }}>
            <Text style={s.newTitle}>Nueva nota</Text>
            {[
              ['text', 'file-text', 'Nota', 'Texto, fotos y formato.'],
              ['draw', 'edit-2', 'Nota con dibujo', 'Escribe y dibuja sobre un fondo. Ideal para estudiar.'],
            ].map(([kind, icon, title, desc]) => (
              <TouchableOpacity key={kind} activeOpacity={0.8} onPress={() => newNote(kind)} style={{ marginBottom: 12 }}>
                <Glass t={c} strong radius={24} inner={s.newCard}>
                  <View style={[s.newIcon, { backgroundColor: c.text }]}>
                    <Feather name={icon} size={22} color={c.inv} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.newCardTitle}>{title}</Text>
                    <Text style={s.newCardDesc}>{desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={c.muted} />
                </Glass>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {toast}
    </View>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
function makeStyles(c) {
  const top = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.grad[0], paddingTop: top },
    center: { alignItems: 'center', justifyContent: 'center' },
    topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    iconText: { fontSize: 19, color: c.text },

    hero: { paddingTop: 22, paddingBottom: 16, paddingHorizontal: 4 },
    heroTitle: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    heroCount: { fontSize: 14, color: c.muted, marginTop: 4 },
    search: { color: c.text, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16 },

    cardInner: { padding: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    thumb: { width: '100%', height: 90, borderRadius: 12, marginBottom: 6, backgroundColor: c.border },
    preview: { flex: 1, fontSize: 14, lineHeight: 20, color: c.muted, marginBottom: 6 },
    date: { fontSize: 12, color: c.muted },

    empty: { alignItems: 'center', paddingVertical: 70 },
    emptyText: { color: c.muted, textAlign: 'center', fontSize: 15, lineHeight: 22 },

    fabWrap: {
      position: 'absolute', right: 20, bottom: 30, borderRadius: 31, elevation: 8,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    },
    fab: {
      width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.text, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)',
    },

    sidebar: { width: 280, maxWidth: '85%', margin: 10, marginTop: top + 10 },
    sidebarInner: { paddingTop: 22, paddingHorizontal: 12, paddingBottom: 16 },
    sideTitle: { fontSize: 21, fontWeight: '800', color: c.text, paddingHorizontal: 12, marginBottom: 18 },
    navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12 },
    navIcon: { marginRight: 14 },
    navText: { flex: 1, fontSize: 16, color: c.text },
    navCount: { fontSize: 14, color: c.muted },
    sep: { height: 0.5, backgroundColor: c.border, marginVertical: 10, marginHorizontal: 12 },

    bannerText: { color: c.muted, fontSize: 14 },
    titleInput: { fontSize: 26, fontWeight: '700', color: c.text, paddingVertical: 6 },
    meta: { fontSize: 13, color: c.muted, marginBottom: 4 },
    titleDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border },

    wallScrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    wallTitle: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 4 },
    wallHint: { fontSize: 13, color: c.muted, marginBottom: 14 },
    newScrim: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 40 },
    newTitle: { fontSize: 22, fontWeight: '800', color: c.text, marginBottom: 14, marginLeft: 6 },
    newCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    newIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    newCardTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    newCardDesc: { fontSize: 13, color: c.muted, marginTop: 2 },
    wallPreview: { height: 180, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    wallPreviewText: { fontSize: 15, fontWeight: '600' },
    wallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
    wallBtnText: { fontSize: 16, fontWeight: '600' },
    wallLabel: { color: c.muted, fontSize: 13, marginTop: 18, marginBottom: 8 },
    blurChip: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2, borderRadius: 14, borderWidth: 1 },
    wallRemove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 6 },

    toastWrap: { position: 'absolute', bottom: 110, alignSelf: 'center' },
    toastText: { color: c.text, fontSize: 14, paddingHorizontal: 18, paddingVertical: 10 },
  });
}
