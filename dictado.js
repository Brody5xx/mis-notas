/* 🎙️ DICTAR: el teléfono escucha y va convirtiendo la voz en texto (reconocimiento de voz del propio teléfono) */
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export async function startDict({ lang, onText, onEnd, onError }) {
  let perm = null;
  try { perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync(); } catch (e) { onError('unavailable'); return null; }
  if (!perm || !perm.granted) { onError('perm'); return null; }
  const subs = [];
  try {
    subs.push(ExpoSpeechRecognitionModule.addListener('result', e => {
      const t = e && e.results && e.results[0] && e.results[0].transcript;
      if (t != null) onText(String(t), !!e.isFinal);
    }));
    subs.push(ExpoSpeechRecognitionModule.addListener('end', () => onEnd()));
    subs.push(ExpoSpeechRecognitionModule.addListener('error', e => onError((e && e.error) || 'error', e && e.message)));
    ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: true, addsPunctuation: true });
  } catch (e) {
    subs.forEach(s => { try { s.remove(); } catch (er) {} });
    onError('unavailable'); return null;
  }
  return () => {
    subs.forEach(s => { try { s.remove(); } catch (er) {} });
    try { ExpoSpeechRecognitionModule.stop(); } catch (e) {}
  };
}
