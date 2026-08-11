import { IonButton, IonIcon } from '@ionic/react';
import { cubeOutline } from 'ionicons/icons';
import React, { useState } from 'react';
import CharacterPreview3D from './CharacterPreview3D';
import './LazyModelPreview.css';

interface LazyModelPreviewProps {
  modelUrl: string;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
}

/**
 * Loading all of CharacterSelect's "coming soon" 3D previews eagerly on mount was a real
 * regression: three ~40MB GLBs + three simultaneous WebGL contexts competing for bandwidth/GPU
 * right as the page loads was heavy enough on a real device to make the actual selectable
 * avatar cards above them stop responding to taps. Gating each preview behind an explicit tap
 * means zero extra downloads/contexts happen unless the user actually asks to see one.
 */
const LazyModelPreview: React.FC<LazyModelPreviewProps> = ({ modelUrl, cameraPosition, cameraTarget }) => {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return <CharacterPreview3D modelUrl={modelUrl} cameraPosition={cameraPosition} cameraTarget={cameraTarget} />;
  }

  return (
    <div className="lazy-model-preview">
      <IonButton fill="clear" onClick={() => setLoaded(true)}>
        <IonIcon icon={cubeOutline} slot="start" />
        Ver vista previa 3D
      </IonButton>
    </div>
  );
};

export default LazyModelPreview;
