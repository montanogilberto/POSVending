import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonDatetime,
  IonIcon,
  IonChip,
} from '@ionic/react';
import { waterOutline, calendarOutline, chevronForwardOutline, closeOutline, receiptOutline, cashOutline, appsOutline, cardOutline, swapHorizontalOutline, helpCircleOutline } from 'ionicons/icons';
import { toHermosilloDate, fmtMXN } from '../../utils/format';
import { fetchMonthlyLaundry } from '../../api/laundryApi';
import { useUser } from '../../contexts/UserContext';
import EmptyState from '../../components/ui/EmptyState';
import './MovementsPage.css';

interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

type IncomeType = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro';

// DB has inconsistent spelling ("transferir" vs "transferencia") -- normalize
// to one canonical bucket per type so the filter doesn't miss records.
const normalizeIncomeType = (raw: string): IncomeType => {
  const m = (raw || '').toLowerCase();
  if (m === 'efectivo') return 'Efectivo';
  if (m === 'tarjeta') return 'Tarjeta';
  if (m.startsWith('transfer')) return 'Transferencia';
  return 'Otro';
};

const TYPE_FILTERS: { key: IncomeType | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: appsOutline },
  { key: 'Efectivo', label: 'Efectivo', icon: cashOutline },
  { key: 'Tarjeta', label: 'Tarjeta', icon: cardOutline },
  { key: 'Transferencia', label: 'Transferencia', icon: swapHorizontalOutline },
  { key: 'Otro', label: 'Otro', icon: helpCircleOutline },
];

const MovementsPage: React.FC = () => {
  const { companyId } = useUser();
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<Income[]>([]);
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [selectedType, setSelectedType] = useState<IncomeType | 'all'>('all');
  const [showCalendar, setShowCalendar] = useState(true);

  // Movimientos solo muestra el mes actual -- para meses anteriores, el
  // módulo de Incomes permite consultar el histórico completo.
  const fetchMonthlyIncome = async () => {
    console.log('[Movements] fetchMonthlyIncome: requesting /monthly_income, companyId =', companyId);
    try {
      const monthlyIncome = await fetchMonthlyLaundry(companyId);
      console.log('[Movements] fetchMonthlyIncome: length =', monthlyIncome.length);
      setAllIncome(monthlyIncome);
      setFilteredIncome(monthlyIncome);
    } catch (error) {
      console.error('[Movements] fetchMonthlyIncome error:', error);
    }
  };

  useEffect(() => {
    console.log('[Movements] mount effect: calling fetchMonthlyIncome');
    fetchMonthlyIncome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bounds of the current range (rangeStart may be after rangeEnd if the
  // user tapped a second day earlier in the month than the first tap).
  const rangeLo = rangeStart && rangeEnd
    ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd)
    : rangeStart;
  const rangeHi = rangeStart && rangeEnd
    ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart)
    : rangeStart;

  useEffect(() => {
    console.log('[Movements] filter effect: rangeLo =', rangeLo, 'rangeHi =', rangeHi, 'selectedType =', selectedType, 'allIncome length =', allIncome.length);
    const dateFiltered = rangeLo
      ? allIncome.filter(income => {
          const incomeDate = toHermosilloDate(income.paymentDate).toISOString().split('T')[0];
          return incomeDate >= rangeLo && incomeDate <= rangeHi;
        })
      : allIncome;
    const finalFiltered = selectedType === 'all'
      ? dateFiltered
      : dateFiltered.filter(income => normalizeIncomeType(income.paymentMethod) === selectedType);
    console.log('[Movements] filter effect: final length =', finalFiltered.length);
    setFilteredIncome(finalFiltered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeLo, rangeHi, selectedType, allIncome]);

  // Only offer type chips that actually appear in this month's data.
  const availableTypes = new Set(allIncome.map(i => normalizeIncomeType(i.paymentMethod)));
  const visibleTypeFilters = TYPE_FILTERS.filter(f => f.key === 'all' || availableTypes.has(f.key));

  // Two-tap range picking: first tap starts a new range, second tap closes it.
  const handleDatetimeChange = (rawValue: string | null) => {
    const dateOnly = rawValue ? rawValue.split('T')[0] : '';
    console.log('[Movements] IonDatetime onIonChange fired, detail.value =', rawValue, '-> dateOnly =', dateOnly);
    if (!dateOnly) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateOnly);
      setRangeEnd('');
    } else {
      setRangeEnd(dateOnly);
    }
  };

  const clearRange = () => {
    setRangeStart('');
    setRangeEnd('');
  };

  const isInRange = (iso: string) => {
    if (!rangeLo) return false;
    return iso >= rangeLo && iso <= rangeHi;
  };

  const highlightedDates = (isoString: string) => {
    if (isInRange(isoString)) {
      return { textColor: '#0056D2', backgroundColor: '#DBEAFE' };
    }
    return undefined;
  };

  // Group incomes by date
  const groupedIncomes = filteredIncome.reduce((groups, income) => {
    const rawDate = toHermosilloDate(income.paymentDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    // Capitalize only the first letter -- text-transform:capitalize would
    // also capitalize "de" (Spanish preposition), which reads wrong.
    const date = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(income);
    return groups;
  }, {} as Record<string, Income[]>);

  // The calendar is locked to one month (min/max below), so start and end
  // always share month/year -- no need to repeat "de septiembre" twice.
  const rangeLabel = !rangeLo
    ? ''
    : !rangeEnd || rangeLo === rangeHi
      ? new Date(`${rangeLo}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : `${new Date(`${rangeLo}T12:00:00`).getDate()} – ${new Date(`${rangeHi}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  // Movimientos solo trae el mes actual -- acotar el calendario evita
  // navegar a un mes sin datos y ver "sin movimientos" por confusión.
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  // Summary of whatever is currently shown (full month, or the picked range).
  const summaryTotal = filteredIncome.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const summaryCount = filteredIncome.length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Movimientos</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCalendar((v) => !v)}>
              <IonIcon slot="icon-only" icon={calendarOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="movements-content">
        <div className="movements-container">

          {/* ✅ Filtrar por Fecha banner */}
          <IonItem
            button
            lines="none"
            className="movements-filter-banner"
            onClick={() => setShowCalendar((v) => !v)}
          >
            <div className="movements-filter-icon-circle" slot="start">
              <IonIcon icon={waterOutline} />
            </div>
            <IonLabel>
              <div className="movements-filter-title">Filtrar por Fecha</div>
              <div className="movements-filter-subtitle">Selecciona un rango de fechas para ver tus movimientos.</div>
            </IonLabel>
            <IonIcon
              slot="end"
              icon={chevronForwardOutline}
              className={`movements-filter-chevron ${showCalendar ? 'open' : ''}`}
            />
          </IonItem>

          {/* ✅ Calendar */}
          {showCalendar && (
            <IonCard className="movements-calendar-card">
              <IonDatetime
                presentation="date"
                locale="es-MX"
                className="movements-calendar"
                min={monthStart}
                max={monthEnd}
                value={rangeEnd || rangeStart}
                highlightedDates={highlightedDates}
                onIonChange={(e) => handleDatetimeChange(e.detail.value as string | null)}
              />
            </IonCard>
          )}

          {/* ✅ Selected range chip */}
          {rangeLo && (
            <div className="movements-selected-chip">
              <IonIcon icon={calendarOutline} className="calendar-icon" />
              <div className="movements-selected-chip-text">
                <div className="movements-selected-chip-label">
                  {rangeEnd ? 'Rango seleccionado' : 'Fecha seleccionada — toca otro día para cerrar el rango'}
                </div>
                <div className="movements-selected-chip-value">{rangeLabel}</div>
              </div>
              <IonButton
                fill="clear"
                size="small"
                className="movements-selected-chip-clear"
                onClick={clearRange}
              >
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>
          )}

          {/* ✅ Filtrar por tipo de ingreso */}
          <div className="movements-type-filters">
            {visibleTypeFilters.map((f) => (
              <IonChip
                key={f.key}
                outline={selectedType !== f.key}
                color={selectedType === f.key ? 'primary' : 'medium'}
                className="movements-type-chip"
                onClick={() => setSelectedType(f.key)}
              >
                <IonIcon icon={f.icon} />
                <IonLabel>{f.label}</IonLabel>
              </IonChip>
            ))}
          </div>

          {/* ✅ Summary */}
          {summaryCount > 0 && (
            <IonCard className="movements-summary-card">
              <IonCardContent className="movements-summary-content">
                <div className="movements-summary-item">
                  <div className="movements-summary-icon total">
                    <IonIcon icon={cashOutline} />
                  </div>
                  <div>
                    <div className="movements-summary-value">{fmtMXN(summaryTotal)}</div>
                    <div className="movements-summary-label">Total</div>
                  </div>
                </div>
                <div className="movements-summary-item">
                  <div className="movements-summary-icon count">
                    <IonIcon icon={receiptOutline} />
                  </div>
                  <div>
                    <div className="movements-summary-value">{summaryCount}</div>
                    <div className="movements-summary-label">Movimiento{summaryCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* ✅ Movements list */}
          <IonCard className="movements-list-card">
            <IonCardHeader>
              <IonCardTitle>Movimientos del Mes</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {filteredIncome.length === 0 ? (
                <EmptyState
                  className="movements-empty"
                  icon={receiptOutline}
                  text="No hay movimientos con estos filtros."
                />
              ) : (
                <div>
                  {Object.entries(groupedIncomes).map(([date, incomes]) => (
                    <div key={date}>
                      <IonItem lines="none" className="movements-day-group">
                        <IonLabel>
                          <h2>{date}</h2>
                          <p>{incomes.length} movimiento{incomes.length !== 1 ? 's' : ''}</p>
                        </IonLabel>
                      </IonItem>
                      <IonList lines="none">
                        {incomes.map((income, i) => {
                          const time = toHermosilloDate(income.paymentDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                          return (
                            <IonItem key={i}>
                              <div className="movements-row-icon" slot="start">
                                <IonIcon icon={receiptOutline} />
                              </div>
                              <IonLabel>
                                <div className="movements-row-amount">Ingreso — {fmtMXN(income.total)}</div>
                                <div className="movements-row-meta">{time} — {income.paymentMethod}</div>
                              </IonLabel>
                            </IonItem>
                          );
                        })}
                      </IonList>
                    </div>
                  ))}
                </div>
              )}
            </IonCardContent>
          </IonCard>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default MovementsPage;
