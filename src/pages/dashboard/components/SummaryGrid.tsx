import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { cashOutline, trendingDownOutline, walletOutline, swapHorizontalOutline } from 'ionicons/icons';
import { fmtMXN, fmtInt } from '../../../utils/format';

interface SummaryGridProps {
  ventas: number;
  egresos: number;
  operaciones: number;
}

const SummaryGrid: React.FC<SummaryGridProps> = ({ ventas, egresos, operaciones }) => {
  const neto = ventas - egresos;

  return (
    <IonCard className="dashboard-summary-card">
      <IonCardContent className="summary-card-content">
        <div className="summary-card-title">RESUMEN</div>
        <div className="summary-grid">
          <div className="summary-tile">
            <div className="summary-tile-icon green">
              <IonIcon icon={cashOutline} />
            </div>
            <div>
              <div className="summary-tile-label">Ventas</div>
              <div className="summary-tile-value">{fmtMXN(ventas)}</div>
            </div>
          </div>

          <div className="summary-tile">
            <div className="summary-tile-icon pink">
              <IonIcon icon={trendingDownOutline} />
            </div>
            <div>
              <div className="summary-tile-label">Egresos</div>
              <div className="summary-tile-value">{fmtMXN(egresos)}</div>
            </div>
          </div>

          <div className="summary-tile">
            <div className="summary-tile-icon green">
              <IonIcon icon={walletOutline} />
            </div>
            <div>
              <div className="summary-tile-label">Neto</div>
              <div className="summary-tile-value">{fmtMXN(neto)}</div>
            </div>
          </div>

          <div className="summary-tile">
            <div className="summary-tile-icon pink">
              <IonIcon icon={swapHorizontalOutline} />
            </div>
            <div>
              <div className="summary-tile-label">Operaciones</div>
              <div className="summary-tile-value">{fmtInt(operaciones)}</div>
            </div>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default SummaryGrid;
