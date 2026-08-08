import React, { useState } from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { closeOutline, swapHorizontalOutline } from 'ionicons/icons';
import './ZoomableImage.css';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Si se pasa, el popup muestra un botón para reemplazar la imagen. */
  onReplace?: () => void;
  /** Texto del botón de reemplazo. Default: "Elegir otra". */
  replaceLabel?: string;
  /** Fallback si src no carga (p. ej. mostrar un avatar por defecto). */
  onError?: () => void;
}

// Wraps a thumbnail <img> so tapping it opens a full-screen view at the
// image's native resolution inside a scrollable/pinch-zoomable container —
// staff need to visually confirm small print (CURP, clave de elector) is
// actually legible, which a fixed-size review thumbnail can't show.
// onReplace is caller-defined on purpose: what "otra" means depends on
// context (retomar una captura KYC vs. iniciar una re-verificación) — este
// componente solo expone el botón, nunca decide qué acción dispara.
const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, className, onReplace, replaceLabel, onError }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={() => setOpen(true)}
        onError={onError}
        role="button"
        tabIndex={0}
      />
      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} className="zoomable-image-modal">
        <div className="zoomable-image-viewport">
          <button
            type="button"
            className="zoomable-image-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            <IonIcon icon={closeOutline} />
          </button>
          <div className="zoomable-image-scroll">
            <img src={src} alt={alt} className="zoomable-image-full" />
          </div>
          {onReplace && (
            <button
              type="button"
              className="zoomable-image-replace"
              onClick={() => { setOpen(false); onReplace(); }}
            >
              <IonIcon icon={swapHorizontalOutline} />
              {replaceLabel ?? 'Elegir otra'}
            </button>
          )}
        </div>
      </IonModal>
    </>
  );
};

export default ZoomableImage;
