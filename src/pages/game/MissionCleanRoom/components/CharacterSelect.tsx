import { IonBadge, IonButton, IonCard, IonCardContent, IonCardTitle } from '@ionic/react';
import React, { useState } from 'react';
import { getCharacterAssetPath } from '../game/characterAsset';
import type { Avatar } from '../MissionCleanRoomTypes';
import LazyModelPreview from './LazyModelPreview';
import './CharacterSelect.css';

interface CharacterSelectProps {
  avatars: Avatar[];
  selectedAvatarId: string | null;
  onSelect: (avatarId: string) => void;
  onStart: () => void;
}

/**
 * Shows real character art when it's been dropped in public/assets/characters/; falls back to
 * the emoji placeholder otherwise. Deliberately NOT an IonAvatar: IonAvatar forces a small
 * circle with object-fit: cover, which zooms into a full-body portrait and crops off the face
 * and feet — the master spec wants the whole character visible, so this uses a taller frame
 * with object-fit: contain instead (same "Ionic doesn't fit this shape" exception as the
 * touch joystick in GameWorld3D).
 */
const CharacterPortrait: React.FC<{ avatar: Avatar }> = ({ avatar }) => {
  const assetPath = getCharacterAssetPath(avatar.id);
  const [imageFailed, setImageFailed] = useState(false);

  if (!assetPath || imageFailed) {
    return <span className="character-card__avatar" aria-hidden="true">{avatar.thumbnail}</span>;
  }

  return (
    <div className="character-card__portrait">
      <img src={assetPath} alt="" onError={() => setImageFailed(true)} />
    </div>
  );
};

const CharacterSelect: React.FC<CharacterSelectProps> = ({ avatars, selectedAvatarId, onSelect, onStart }) => (
  <div className="character-select">
    <h1 className="character-select__title">Misión: Limpiar el Cuarto</h1>
    <p className="character-select__subtitle">Elige tu personaje</p>

    <div className="character-select__grid">
      {avatars.map((avatar) => {
        const selected = avatar.id === selectedAvatarId;
        return (
          <IonCard
            key={avatar.id}
            button
            className={`character-card${selected ? ' character-card--selected' : ''}`}
            onClick={() => onSelect(avatar.id)}
            aria-pressed={selected}
            aria-label={`Seleccionar a ${avatar.name}`}
          >
            <IonCardContent className="character-card__content">
              <CharacterPortrait avatar={avatar} />
              <IonCardTitle className="character-card__name">{avatar.name}</IonCardTitle>
              <p className="character-card__tagline">{avatar.description}</p>
            </IonCardContent>
          </IonCard>
        );
      })}
    </div>

    <IonButton
      expand="block"
      className="character-select__start"
      disabled={!selectedAvatarId}
      onClick={onStart}
    >
      Empezar
    </IonButton>

    {/* Gilbertito graduated to a real selectable card above (rigged + 4 animations, see
        world3d/GameAvatar.ts) — no longer previewed here. */}

    {/* Same static-preview situation Gilbertito used to be in — no rig/animation yet (see world3d/
        GameAvatar.ts TODOs). Worth noting: this model's shirt literally reads "LITTLE DINO",
        so it may end up being the real dino_boy asset once it's rigged, rather than a third
        roster addition. */}
    <IonCard className="character-preview-card">
      <IonCardContent className="character-preview-card__content">
        <div className="character-preview-card__header">
          <IonCardTitle className="character-preview-card__name">Gael</IonCardTitle>
          <IonBadge color="medium">Próximamente</IonBadge>
        </div>
        <LazyModelPreview
          modelUrl="/assets/models/gael.glb"
          cameraPosition={[0, 0.1, 2.6]}
          cameraTarget={[0, 0, 0]}
        />
        <p className="character-preview-card__note">Vista previa 3D — aún sin animaciones, no jugable todavía.</p>
      </IonCardContent>
    </IonCard>

    {/* Tutu isn't a playable character at all — it's a teddy bear prop (avatars/model_tutu),
        already correctly textured/oriented with no rig needed. Previewed here for now; its real
        home is as room decoration or a mission collectible (see MissionDefinition.ts), not the
        player roster. */}
    <IonCard className="character-preview-card">
      <IonCardContent className="character-preview-card__content">
        <div className="character-preview-card__header">
          <IonCardTitle className="character-preview-card__name">Tutu</IonCardTitle>
          <IonBadge color="tertiary">Mascota</IonBadge>
        </div>
        <LazyModelPreview
          modelUrl="/assets/models/tutu.glb"
          cameraPosition={[0, 0.15, 2.2]}
          cameraTarget={[0, 0, 0]}
        />
        <p className="character-preview-card__note">Vista previa 3D — es un peluche, no un personaje jugable.</p>
      </IonCardContent>
    </IonCard>
  </div>
);

export default CharacterSelect;
