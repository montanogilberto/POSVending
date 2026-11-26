import React from 'react';
import { IonButton, IonCard, IonCardContent } from '@ionic/react';
import { fmtMXN } from '../../../../utils/format';
import { periodHref } from '../../../../hooks/usePeriodFromUrl';
import { currentPeriod, periodKey, periodLabel, samePeriod } from '../../../../utils/monthPeriod';
import type { AnnualFigures, AnnualMonth } from '../annualSummaryTotals';

const Cells: React.FC<AnnualFigures> = ({ income, commission, expenses, profit }) => (
  <>
    <td>{fmtMXN(income)}</td>
    <td>{fmtMXN(commission)}</td>
    <td>{fmtMXN(expenses)}</td>
    <td className={`annual-profit${profit < 0 ? ' annual-loss' : ''}`}>{fmtMXN(profit)}</td>
  </>
);

/** One row per month; the month opens its Resumen mensual. */
const AnnualTable: React.FC<{ months: AnnualMonth[]; totals: AnnualFigures }> = ({ months, totals }) => (
  <IonCard className="dashboard-summary-card">
    <IonCardContent className="summary-card-content">
      <div className="summary-card-title">DETALLE POR MES</div>
      <div className="annual-scroll">
        <table className="annual-table">
          <thead>
            <tr><th>Mes</th><th>Ingresos</th><th>Comisión</th><th>Egresos</th><th>Utilidad</th></tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={periodKey(m.period)}>
                <th>
                  <IonButton fill="clear" size="small" routerLink={periodHref('/monthly-summary', periodKey(m.period))}>
                    {periodLabel(m.period)}{samePeriod(m.period, currentPeriod()) ? ' (a hoy)' : ''}
                  </IonButton>
                </th>
                <Cells {...m} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Total</th><Cells {...totals} /></tr>
          </tfoot>
        </table>
      </div>
      <p className="annual-note">Utilidad = ingresos − comisión de terminal − egresos. No incluye asientos manuales.</p>
      {months.some((m) => m.income > 0 && m.expenses === 0) && (
        <p className="annual-note annual-loss">
          Hay meses con ventas y sin egresos registrados: su utilidad puede estar sobrestimada.
        </p>
      )}
    </IonCardContent>
  </IonCard>
);

export default AnnualTable;
