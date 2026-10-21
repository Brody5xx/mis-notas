/* ============================================================
   compartir.native.js — compartir un archivo (PDF o imagen)
   en el teléfono: abre la lista de apps (WhatsApp, Gmail, etc.)
   ============================================================ */
import * as Sharing from 'expo-sharing';

export async function shareFile(uri, mime, title) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: mime,
    dialogTitle: title,
    UTI: mime === 'application/pdf' ? 'com.adobe.pdf' : mime === 'application/json' ? 'public.json' : mime === 'text/html' ? 'public.html' : 'public.jpeg',
  });
  return true;
}
