import React from 'react';
import { IonBadge } from '@ionic/react';
import PlayingCard from './PlayingCard';

interface HandRowProps {
  label: string;
  cards: string[];
  total: number;
  /** Suma un espacio de carta tapada y oculta el total real del crupier. */
  hidden?: boolean;
  soft?: boolean;
  busted?: boolean;
}

/** Una mano de la mesa: etiqueta, cartas y total. */
const HandRow: React.FC<HandRowProps> = ({ label, cards, total, hidden, soft, busted }) => (
  <div className="bj-hand">
    <div className="bj-hand__header">
      <span className="bj-hand__label">{label}</span>
      <IonBadge color={busted ? 'danger' : 'medium'} className="bj-hand__total">
        {hidden ? `${total} + ?` : `${soft && total <= 21 ? 'blando ' : ''}${total}`}
      </IonBadge>
    </div>
    <div className="bj-hand__cards">
      {cards.map((card, i) => <PlayingCard key={`${card}-${i}`} card={card} />)}
      {hidden && <PlayingCard hidden />}
    </div>
  </div>
);

export default HandRow;
