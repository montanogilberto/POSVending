import React from 'react';
import { IonSpinner } from '@ionic/react';
import './PageLoading.css';

interface PageLoadingProps {
  /** Texto opcional debajo del spinner ("Cargando productos…"). */
  text?: string;
  className?: string;
}

/**
 * Carga inicial de una pantalla que llama al backend: spinner centrado + texto.
 * Mismo lugar y estilo que EmptyState, para que "cargando" y "sin datos" se vean igual.
 */
const PageLoading: React.FC<PageLoadingProps> = ({ text, className = '' }) => (
  <div className={`ui-page-loading ${className}`.trim()} role="status" aria-live="polite">
    <IonSpinner name="crescent" />
    {text && <p>{text}</p>}
  </div>
);

export default PageLoading;
