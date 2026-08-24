import React from 'react';
import GameTile from './GameTile';
import type { ArcadeTile } from '../ArcadeTypes';

interface GameRailProps {
  title: string;
  subtitle?: string;
  tiles: ArcadeTile[];
  onOpen: (tile: ArcadeTile) => void;
}

/**
 * Fila con desplazamiento horizontal, como las del referente. Usa scroll nativo
 * con scroll-snap en vez de una libreria de carrusel: en movil el gesto ya es
 * el correcto y no suma peso al bundle.
 */
const GameRail: React.FC<GameRailProps> = ({ title, subtitle, tiles, onOpen }) => {
  if (tiles.length === 0) return null;

  return (
    <section className="arc-section">
      <div className="arc-section__head">
        <h2 className="arc-section__title">{title}</h2>
        {subtitle && <span className="arc-section__count">{subtitle}</span>}
      </div>
      <div className="arc-rail">
        {tiles.map(tile => (
          <div key={tile.gameKey} className="arc-rail__item">
            <GameTile tile={tile} onOpen={onOpen} variant="art" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default GameRail;
