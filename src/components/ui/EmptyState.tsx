import React from 'react';
import { IonIcon } from '@ionic/react';
import './EmptyState.css';

interface EmptyStateProps {
  icon: string;
  text: string;
  /** Botón u otro contenido opcional debajo del texto. */
  action?: React.ReactNode;
  /** Clase de página existente (p2p-empty, lc-empty, clst-empty…) para conservar su estilo. */
  className?: string;
}

/**
 * Estado vacío estándar: icono grande + texto + acción opcional.
 * Antes el mismo patrón estaba re-implementado en 4 CSS + 4 JSX distintos.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, text, action, className = '' }) => (
  <div className={`ui-empty ${className}`.trim()}>
    <IonIcon icon={icon} />
    <p>{text}</p>
    {action}
  </div>
);

export default EmptyState;
