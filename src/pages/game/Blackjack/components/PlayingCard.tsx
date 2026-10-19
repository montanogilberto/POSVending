import React from 'react';

interface PlayingCardProps {
  /** Notacion del backend: rango + palo, p. ej. "AS", "10H", "KD". */
  card?: string;
  /** Carta tapada del crupier mientras la mano sigue viva. */
  hidden?: boolean;
}

const SUIT_GLYPH: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

/**
 * Carta de la mesa. Los palos rojos se distinguen por clase, no por estilo en
 * linea (CLAUDE.md §4.2), y el rango se separa del palo cortando el ultimo
 * caracter — "10H" tiene dos digitos de rango, asi que no sirve card[0].
 */
const PlayingCard: React.FC<PlayingCardProps> = ({ card, hidden }) => {
  if (hidden || !card) {
    return <div className="bj-card bj-card--back" aria-label="Carta tapada" />;
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const red = suit === 'H' || suit === 'D';

  return (
    <div className={`bj-card${red ? ' bj-card--red' : ''}`} aria-label={`${rank} ${suit}`}>
      <span className="bj-card__rank">{rank}</span>
      <span className="bj-card__suit">{SUIT_GLYPH[suit] ?? suit}</span>
    </div>
  );
};

export default PlayingCard;
