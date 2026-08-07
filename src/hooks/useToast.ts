/**
 * useToast — estado de toast unificado (antes re-implementado en 5+ páginas
 * como toast + toastColor + showToast + <IonToast> a mano).
 *
 * Uso:
 *   const { showToast, toastProps } = useToast({ defaultColor: 'success' });
 *   showToast('✓ Guardado');            // color por defecto
 *   showToast('Falló', 'danger');       // color puntual
 *   <IonToast {...toastProps} />
 */
import { useCallback, useState } from 'react';

interface UseToastOptions {
  defaultColor?: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'middle';
}

export function useToast({ defaultColor = 'success', duration = 3000, position = 'top' }: UseToastOptions = {}) {
  const [message, setMessage] = useState('');
  const [color, setColor] = useState(defaultColor);

  const showToast = useCallback((msg: string, c?: string) => {
    setColor(c ?? defaultColor);
    setMessage(msg);
  }, [defaultColor]);

  const toastProps = {
    isOpen: !!message,
    message,
    color,
    duration,
    position,
    onDidDismiss: () => setMessage(''),
  };

  return { showToast, toastProps };
}
