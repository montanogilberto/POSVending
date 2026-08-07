import React from 'react';
import { IonBadge } from '@ionic/react';
import { StatusMeta } from './statusMaps';

interface StatusBadgeProps {
  status: string | undefined | null;
  map: Record<string, StatusMeta>;
  className?: string;
}

/**
 * Badge de estado con mapa compartido (statusMaps.ts) — mismo color y
 * etiqueta para el mismo estado en toda la app. Estados desconocidos se
 * muestran tal cual en gris en vez de romper.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, map, className }) => {
  const meta = map[(status ?? '').toLowerCase()] ?? { label: status ?? '—', color: 'medium' };
  return <IonBadge color={meta.color} className={className}>{meta.label}</IonBadge>;
};

export default StatusBadge;
