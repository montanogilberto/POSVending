import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Selección de foto vía Capacitor: en iOS/Android muestra el action sheet
 * "Tomar foto / Elegir de galería"; en web degrada al selector de archivos
 * del navegador. Devuelve un data URL, o null si el usuario cancela
 * (Camera.getPhoto rechaza la promesa en ese caso — no es un error real,
 * así que se silencia en vez de propagarse).
 */
async function pickPhoto(labels: { header: string; logTag: string }): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 80,
      promptLabelHeader: labels.header,
      promptLabelPhoto: 'Elegir de galería',
      promptLabelPicture: 'Tomar foto',
    });
    return photo.dataUrl ?? null;
  } catch (e) {
    console.log(`[${labels.logTag}] cancelado o sin permiso:`, String(e));
    return null;
  }
}

/** Foto de perfil (avatar de cuenta — NO la selfie biométrica KYC, esa vive en su propio flujo con liveness). */
export const pickAvatarPhoto = (): Promise<string | null> =>
  pickPhoto({ header: 'Foto de perfil', logTag: 'pickAvatarPhoto' });

/** Foto de comprobante de transferencia SPEI (evidencia de fondeo). */
export const pickEvidencePhoto = (): Promise<string | null> =>
  pickPhoto({ header: 'Comprobante de transferencia', logTag: 'pickEvidencePhoto' });

/** Foto del ticket/recibo físico como evidencia de un egreso. */
export const pickExpenseReceiptPhoto = (): Promise<string | null> =>
  pickPhoto({ header: 'Ticket del egreso', logTag: 'pickExpenseReceiptPhoto' });
