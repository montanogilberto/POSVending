import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Selección de foto de perfil (avatar de cuenta — NO la selfie biométrica
 * KYC, esa vive en su propio flujo con liveness). Usa el plugin nativo de
 * Capacitor: en iOS/Android muestra el action sheet "Tomar foto / Elegir de
 * galería"; en web degrada al selector de archivos del navegador.
 *
 * Devuelve un data URL listo para setAvatarUrl(), o null si el usuario
 * cancela (Camera.getPhoto rechaza la promesa en ese caso — no es un error
 * real, así que se silencia en vez de propagarse).
 */
export async function pickAvatarPhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 80,
      promptLabelHeader: 'Foto de perfil',
      promptLabelPhoto: 'Elegir de galería',
      promptLabelPicture: 'Tomar foto',
    });
    return photo.dataUrl ?? null;
  } catch (e) {
    // Cancelación del usuario (o sin permiso) — no es un error a mostrar.
    console.log('[pickAvatarPhoto] cancelado o sin permiso:', String(e));
    return null;
  }
}

/**
 * Selección de foto de comprobante de transferencia SPEI (evidencia de
 * fondeo) — mismo patrón que pickAvatarPhoto, con etiquetas propias para no
 * confundir al usuario ("Foto de perfil" no aplica aquí).
 */
export async function pickEvidencePhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 80,
      promptLabelHeader: 'Comprobante de transferencia',
      promptLabelPhoto: 'Elegir de galería',
      promptLabelPicture: 'Tomar foto',
    });
    return photo.dataUrl ?? null;
  } catch (e) {
    console.log('[pickEvidencePhoto] cancelado o sin permiso:', String(e));
    return null;
  }
}
