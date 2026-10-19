import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { fetchMonthlyExpenses, Expense, ExpenseMonthTotal } from '../../../api/expensesApi';
import { getAllSuppliers, Supplier } from '../../../api/supplierApi';
import { getAllEmployees, Employee } from '../../../api/employeesApi';
import { getAllServices, Service } from '../../../api/serviceApi';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { EXPENSE_TYPE } from '../../../components/ui/statusMaps';
import { fmtMXN, mxDate } from '../../../utils/format';
import { onDataChanged } from '../../../utils/refreshBus';
import {
  MonthPeriod, currentPeriod, hermosilloPeriod, periodLabel, periodShortLabel, samePeriod, shiftPeriod,
} from '../../../utils/monthPeriod';
import { EnrichedExpense, TrendsChartData } from './ExpensesTypes';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
/** Rows in the overview's "Actividad Reciente" (same idea as the /dashboard widget). */
const RECENT_COUNT = 8;
const TRENDS_MONTHS = 12;

export const useExpenses = () => {
  const { companyId } = useUser();

  // One company + one month (sp_expense_monthly) — never the full history.
  const [period, setPeriod] = useState<MonthPeriod>(currentPeriod);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<ExpenseMonthTotal[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<EnrichedExpense | null>(null);

  const { showToast, toastProps } = useToast();

  const loadExpenses = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [monthly, supplierList, employeeList, serviceList] = await Promise.all([
        fetchMonthlyExpenses(companyId, period),
        companyId ? getAllSuppliers(companyId) : Promise.resolve([]),
        (companyId ? getAllEmployees(companyId) : Promise.resolve([])).catch((error) => {
          console.error('[useExpenses] getAllEmployees failed:', error);
          return [];
        }),
        getAllServices(companyId).catch((error) => {
          console.error('[useExpenses] getAllServices failed:', error);
          return [];
        }),
      ]);
      // Guard: never list a row outside the requested month under its label.
      setAllExpenses(monthly.expenses.filter((e) => e?.paymentDate && samePeriod(hermosilloPeriod(e.paymentDate), period)));
      setMonthlyTotals(monthly.monthlyTotals);
      setSuppliers(supplierList);
      setEmployees(employeeList);
      setServices(serviceList);
    } catch (error) {
      console.error('[useExpenses] loadExpenses failed:', error);
      showToast('No se pudieron cargar los egresos', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, period, showToast]);

  // Ionic keeps the page mounted: reload on re-entry and on data-changed.
  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useIonViewWillEnter(() => { loadExpenses(); });
  useEffect(() => onDataChanged((reason) => {
    console.log('[useExpenses] data-changed →', reason);
    loadExpenses();
  }), [loadExpenses]);

  // A new month or a new filter starts on page 1.
  useEffect(() => { setPage(1); }, [period, searchText, filterType, filterPaymentMethod, filterSupplierId, filterDateFrom, filterDateTo]);

  const isCurrentPeriod = samePeriod(period, currentPeriod());
  const prevMonth = () => setPeriod((p) => shiftPeriod(p, -1));
  const nextMonth = () => { if (!isCurrentPeriod) setPeriod((p) => shiftPeriod(p, 1)); };

  const supplierNameById = useMemo(() => {
    const map = new Map<number, string>();
    suppliers.forEach((s) => map.set(s.supplierId, s.supplierName));
    return map;
  }, [suppliers]);

  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((e) => map.set(e.employeeId, `${e.firstName} ${e.lastName}`.trim()));
    return map;
  }, [employees]);

  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    services.forEach((s) => map.set(s.serviceId, s.serviceName));
    return map;
  }, [services]);

  // Newest first everywhere (same order as /movements and the dashboard).
  const enrichedExpenses: EnrichedExpense[] = useMemo(
    () =>
      [...allExpenses]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        .map((e) => {
          const supplierName =
            e.expenseType === 'payroll'
              ? (e.employeeId != null ? employeeNameById.get(e.employeeId) : undefined) ??
                (e.employeeId != null ? `Empleado ${e.employeeId}` : 'Nómina')
              : e.expenseType === 'general'
              ? (e.serviceId != null ? serviceNameById.get(e.serviceId) : undefined) ??
                (e.serviceId != null ? `Servicio ${e.serviceId}` : '—')
              : (e.supplierId != null ? supplierNameById.get(e.supplierId) : undefined) ??
                (e.supplierId != null ? `Proveedor ${e.supplierId}` : '—');
          const expenseType = e.expenseType ?? 'inventory';
          const payeeKind = expenseType === 'payroll' ? 'Empleado' : expenseType === 'general' ? 'Servicio' : 'Proveedor';
          return { ...e, expenseType, supplierName, payeeKind };
        }),
    [allExpenses, supplierNameById, employeeNameById, serviceNameById]
  );

  const activeFilterCount = [filterType, filterPaymentMethod, filterSupplierId, filterDateFrom, filterDateTo].filter(Boolean).length;

  const filteredExpenses = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return enrichedExpenses.filter((expense) => {
      const matchesSearch =
        !search ||
        expense.total.toString().includes(search) ||
        expense.supplierName.toLowerCase().includes(search) ||
        (EXPENSE_TYPE[expense.expenseType ?? '']?.label ?? '').toLowerCase().includes(search) ||
        (expense.notes ?? '').toLowerCase().includes(search);

      const matchesType = !filterType || expense.expenseType === filterType;
      const matchesPayment = !filterPaymentMethod || expense.paymentMethod === filterPaymentMethod;
      const matchesSupplier = !filterSupplierId || expense.supplierId?.toString() === filterSupplierId;
      const matchesDateFrom = !filterDateFrom || new Date(expense.paymentDate) >= new Date(filterDateFrom);
      const matchesDateTo = !filterDateTo || new Date(expense.paymentDate) <= new Date(filterDateTo);

      return matchesSearch && matchesType && matchesPayment && matchesSupplier && matchesDateFrom && matchesDateTo;
    });
  }, [enrichedExpenses, searchText, filterType, filterPaymentMethod, filterSupplierId, filterDateFrom, filterDateTo]);

  const sortedExpenses = filteredExpenses;

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedExpenses = useMemo(
    () => sortedExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedExpenses, currentPage, pageSize]
  );

  // Every loaded row is already in `period`.
  const monthlyTotal = useMemo(
    () => allExpenses.reduce((sum, e) => sum + (Number(e.total) || 0), 0),
    [allExpenses]
  );
  const monthlyCount = allExpenses.length;

  const trendsData: TrendsChartData | null = useMemo(() => {
    if (!monthlyTotals.length) return null;
    const buckets = Array.from({ length: TRENDS_MONTHS }, (_, i) => shiftPeriod(period, i - (TRENDS_MONTHS - 1)));
    const totalFor = (b: MonthPeriod) =>
      Number(monthlyTotals.find((t) => samePeriod(t, b))?.total) || 0;

    return {
      labels: buckets.map(periodShortLabel),
      datasets: [{ label: 'Egresos', data: buckets.map(totalFor), backgroundColor: '#DC2626' }],
    };
  }, [monthlyTotals, period]);

  return {
    loading,
    suppliers,
    expenses: paginatedExpenses,
    recentExpenses: enrichedExpenses.slice(0, RECENT_COUNT),
    totalResults: sortedExpenses.length,

    searchText,
    setSearchText,
    filterPaymentMethod,
    setFilterPaymentMethod,
    filterSupplierId,
    filterType,
    setFilterType,
    setFilterSupplierId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    showFilters,
    setShowFilters,
    activeFilterCount,

    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalPages,

    showTrendsModal,
    setShowTrendsModal,
    trendsData,

    selectedExpense,
    openExpenseDetail: setSelectedExpense,
    closeExpenseDetail: () => setSelectedExpense(null),

    toastProps,

    monthlyTotal,
    monthlyTotalFormatted: fmtMXN(monthlyTotal),
    monthlyCount,
    period,
    periodLabel: periodLabel(period),
    isCurrentPeriod,
    prevMonth,
    nextMonth,
    mxDate,

    refresh: loadExpenses,
  };
};

export type ExpensesVM = ReturnType<typeof useExpenses>;
