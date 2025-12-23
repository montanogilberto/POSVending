import { useCallback } from 'react';

export const useReceiptPrint = (receiptHTML: string) => {
  const handlePrint = useCallback(() => {
    try {
      const printWindow = window.open(
        '',
        '_blank',
        'width=600,height=800,scrollbars=yes,resizable=yes'
      );

      if (!printWindow) {
        alert(
          'Por favor, permita popups para imprimir el recibo. Desactive el bloqueador de popups para este sitio.'
        );
        return;
      }

      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error('Error printing:', error);
          alert('Error al imprimir. Intente nuevamente.');
        }
      };

      // Fallback por si onload no se dispara
      setTimeout(() => {
        if (!printWindow.closed) {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (error) {
            console.error('Fallback print error:', error);
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error opening print window:', error);
      alert(
        'Error al abrir la ventana de impresión. Verifique su navegador.'
      );
    }
  }, [receiptHTML]);

  return { handlePrint };
};
