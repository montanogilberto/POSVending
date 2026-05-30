import React from 'react';
import UnifiedReceipt from '../../../components/UnifiedReceipt';

interface ReceiptBodyProps {
  receiptData: any;
  savedReceiptUrl: string;
  error: string | null;
}

const ReceiptBody: React.FC<ReceiptBodyProps> = ({ receiptData, savedReceiptUrl, error }) => {
  return (
    <div className="receipt-container">
      {!!receiptData ? (
        <>
          <UnifiedReceipt data={receiptData} options={{ width: '46mm', thermal: true }} />
          {!!savedReceiptUrl && (
            <div className="receipt-url">
              <strong>URL Recibo:</strong> {savedReceiptUrl}
            </div>
          )}
        </>
      ) : (
        <div className="receipt-empty-state">{error || 'No hay datos disponibles'}</div>
      )}
    </div>
  );
};

export default ReceiptBody;
