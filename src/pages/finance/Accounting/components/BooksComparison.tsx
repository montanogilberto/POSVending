import React from 'react';
import { fmtMXN } from '../../../../utils/format';
import { currentPeriod, periodKey, periodLabel, samePeriod } from '../../../../utils/monthPeriod';
import type { BooksComparisonData } from '../BooksComparisonLogic';
import type { BooksFigures, BooksTotals } from '../booksComparison';

const FIELDS: { key: keyof BooksFigures; label: string }[] = [
  { key: 'sales', label: 'Ventas' },
  { key: 'commission', label: 'Comisión' },
  { key: 'expenses', label: 'Egresos' },
  { key: 'profit', label: 'Utilidad' },
];

const Cells: React.FC<BooksTotals> = ({ summary, ledger, difference }) => (
  <>
    {FIELDS.map(({ key }) => {
      const differs = summary[key] !== ledger[key] ? ' books-differs' : '';
      return (
        <React.Fragment key={key}>
          <td className={`books-${key}`}>{fmtMXN(summary[key])}</td>
          <td className={`books-${key}${differs}`}>{fmtMXN(ledger[key])}</td>
        </React.Fragment>
      );
    })}
    <td className={difference !== 0 ? 'books-differs' : undefined}>{difference > 0 ? '+' : ''}{fmtMXN(difference)}</td>
  </>
);

/** Resumen mensual vs Balanza, month by month, ending at the selected month. */
const BooksComparison: React.FC<{ comparison: BooksComparisonData }> = ({ comparison: { rows, totals } }) => (
  <>
    <div className="books-scroll">
      <table className="books-table">
        <thead>
          <tr>
            <th rowSpan={2}>Mes</th>
            {FIELDS.map(({ key, label }) => <th key={key} colSpan={2}>{label}</th>)}
            <th rowSpan={2}>Diferencia</th>
          </tr>
          <tr>
            {FIELDS.map(({ key }) => (
              <React.Fragment key={key}><th>Resumen</th><th>Balanza</th></React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={periodKey(row.period)}>
              <th>{periodLabel(row.period)}{samePeriod(row.period, currentPeriod()) ? ' (a hoy)' : ''}</th>
              <Cells {...row} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th>Total</th><Cells {...totals} /></tr>
        </tfoot>
      </table>
    </div>
    <p className="books-note">
      Utilidad = ventas − comisión − egresos. Diferencia = utilidad de Balanza − utilidad de Resumen mensual.
      Los asientos manuales solo aparecen en Balanza.
    </p>
  </>
);

export default BooksComparison;
