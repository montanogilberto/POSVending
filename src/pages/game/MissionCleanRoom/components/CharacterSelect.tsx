import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardTitle } from '@ionic/react';
import React, { useState } from 'react';
import { getCharacterAssetPath } from '../game/characterAsset';
import type { Avatar } from '../MissionCleanRoomTypes';
import './CharacterSelect.css';

interface CharacterSelectProps {
  avatars: Avatar[];
  selectedAvatarId: string | null;
  onSelect: (avatarId: string) => void;
  onStart: () => void;
}

/** Shows real character art when it's been dropped in public/assets/characters/; falls back to the emoji placeholder otherwise. */
const CharacterPortrait: React.FC<{ avatar: Avatar }> = ({ avatar }) => {
  const assetPath = getCharacterAssetPath(avatar.id);
  const [imageFailed, setImageFailed] = useState(false);

  if (!assetPath || imageFailed) {
    return <span className="character-card__avatar" aria-hidden="true">{avatar.thumbnail}</span>;
  }

  return (
    <IonAvatar className="character-card__portrait">
      <img src={assetPath} alt="" onError={() => setImageFailed(true)} />
    </IonAvatar>
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
  </div>
);

export default CharacterSelect;
