import React, { useState } from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import './ZoomableImage.css';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Wraps a thumbnail <img> so tapping it opens a full-screen view at the
// image's native resolution inside a scrollable/pinch-zoomable container —
// staff need to visually confirm small print (CURP, clave de elector) is
// actually legible, which a fixed-size review thumbnail can't show.
const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, className }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={() => setOpen(true)}
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
        </div>
      </IonModal>
    </>
  );
};

export default ZoomableImage;
