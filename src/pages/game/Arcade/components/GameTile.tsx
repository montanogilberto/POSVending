import React from 'react';
import { IonIcon } from '@ionic/react';
import * as icons from 'ionicons/icons';
import { chevronForwardOutline, lockClosedOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import type { ArcadeTile } from '../ArcadeTypes';
import { CUSTOM_GAME_GLYPHS } from './gameIcons';
import { GAME_ART } from '../../shared/GameArt';

interface GameTileProps {
  tile: ArcadeTile;
  onOpen: (tile: ArcadeTile) => void;
  /**
   * 'art'      = tarjeta ilustrada (filas con carrusel).
   * 'featured' = fila ancha con chevron.
   * 'compact'  = tile de rejilla, para categorias todas bloqueadas.
   */
  variant: 'art' | 'featured' | 'compact';
}

/**
 * Primero un glifo propio del juego (los que ionicons no cubre, como el topo);
 * si no, el iconName que trae la base ('diamondOutline') resuelto contra
 * ionicons. Un nombre que no exista cae al generico en vez de romper la
 * cuadricula.
 */
const GameGlyph: React.FC<{ tile: ArcadeTile }> = ({ tile }) => {
  const Custom = CUSTOM_GAME_GLYPHS[tile.gameKey];
  if (Custom) return <Custom />;
  const icon = (icons as unknown as Record<string, string>)[tile.iconName]
    ?? icons.gameControllerOutline;
  return <IonIcon icon={icon} />;
};

const SoonBadge: React.FC = () => (
  <span className="arc-soon">
    <IonIcon icon={lockClosedOutline} />
    Próximamente
  </span>
);

const GameTile: React.FC<GameTileProps> = ({ tile, onOpen, variant }) => {
  // El acento vive en una clase por gameKey (CLAUDE.md §4.2: nada de estilos
  // en linea); el .css resuelve el par tinte/tinta con custom properties.
  const iconClass = `arc-ico--${tile.gameKey}`;
  const locked = !tile.playable;

  if (variant === 'art') {
    const Art = GAME_ART[tile.gameKey] ?? GAME_ART.blackjack;
    return (
      <button
        type="button"
        className={`arc-art${locked ? ' arc-locked' : ''}`}
        onClick={e => { e.currentTarget.blur(); onOpen(tile); }}
      >
        <span className="arc-art__frame">
          <Art className="arc-art__img" />
          {locked && (
            <span className="arc-art__lock">
              <IonIcon icon={lockClosedOutline} />
            </span>
          )}
        </span>
        <span className="arc-art__name">{tile.name}</span>
        <span className="arc-art__meta">
          {locked ? 'Próximamente' : `RTP ${(tile.rtp * 100).toFixed(1)}%`}
        </span>
      </button>
    );
  }

  if (variant === 'featured') {
    return (
      <button
        type="button"
        className={`arc-row${locked ? ' arc-locked' : ''}`}
        onClick={e => { e.currentTarget.blur(); onOpen(tile); }}
      >
        <span className={`arc-row__icon ${iconClass}`}>
          <GameGlyph tile={tile} />
        </span>

        <span className="arc-row__text">
          <h3 className="arc-row__name">{tile.name}</h3>
          <p className="arc-row__tagline">{tile.tagline}</p>
          <span className="arc-row__meta">
            {locked ? <SoonBadge /> : (
              <>
                <span className="arc-row__limits">{fmtInt(tile.minBet)}–{fmtInt(tile.maxBet)}</span>
                <span className="arc-rtp">RTP {(tile.rtp * 100).toFixed(1)}%</span>
              </>
            )}
          </span>
        </span>

        {!locked && <IonIcon icon={chevronForwardOutline} className="arc-row__chevron" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`arc-tile${locked ? ' arc-locked' : ''}`}
      onClick={e => { e.currentTarget.blur(); onOpen(tile); }}
    >
      <span className={`arc-tile__icon ${iconClass}`}>
        <GameGlyph tile={tile} />
      </span>
      <h3 className="arc-tile__name">{tile.name}</h3>
      <p className="arc-tile__tagline">{tile.tagline}</p>
      <span className="arc-tile__meta">
        {locked ? <SoonBadge /> : (
          <>
            <span className="arc-tile__limits">{fmtInt(tile.minBet)}–{fmtInt(tile.maxBet)}</span>
            <span className="arc-rtp">RTP {(tile.rtp * 100).toFixed(1)}%</span>
          </>
        )}
      </span>
    </button>
  );
};

export default GameTile;
