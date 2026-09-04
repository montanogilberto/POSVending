import { useEffect, useMemo, useState } from 'react';
import { fetchAllExpenses, createExpense, Expense } from '../../../api/expensesApi';
import { getAllSuppliers, Supplier } from '../../../api/supplierApi';
import { getAllEmployees, Employee } from '../../../api/employeesApi';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { fmtMXN, mxDate, toHermosilloDate } from '../../../utils/format';
import { EnrichedExpense, ExpensesSortField, SortDirection, TrendsChartData } from './ExpensesTypes';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const TRENDS_MONTHS = 12;

export const useExpenses = () => {
  const { companyId } = useUser();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState<ExpensesSortField>('paymentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const { showToast, toastProps } = useToast();

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [expenses, supplierList, employeeList] = await Promise.all([
        fetchAllExpenses(),
        companyId ? getAllSuppliers(companyId) : Promise.resolve([]),
        getAllEmployees().catch((error) => {
          console.error('[useExpenses] getAllEmployees failed:', error);
          return [];
        }),
      ]);
      setAllExpenses(expenses);
      setSuppliers(supplierList);
      setEmployees(employeeList);
    } catch (error) {
      console.error('[useExpenses] loadExpenses failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

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

  const enrichedExpenses: EnrichedExpense[] = useMemo(
    () =>
      allExpenses.map((e) => {
        const supplierName =
          e.expenseType === 'payroll'
            ? (e.employeeId != null ? employeeNameById.get(e.employeeId) : undefined) ??
              (e.employeeId != null ? `Empleado ${e.employeeId}` : 'Nómina')
            : (e.supplierId != null ? supplierNameById.get(e.supplierId) : undefined) ??
              (e.supplierId != null ? `Proveedor ${e.supplierId}` : '—');
        return { ...e, supplierName };
      }),
    [allExpenses, supplierNameById, employeeNameById]
  );

  const activeFilterCount = [filterPaymentMethod, filterSupplierId, filterDateFrom, filterDateTo].filter(Boolean).length;

  const filteredExpenses = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return enrichedExpenses.filter((expense) => {
      const matchesSearch =
        !search ||
        expense.expenseId.toString().includes(search) ||
        expense.total.toString().includes(search) ||
        expense.supplierName.toLowerCase().includes(search);

      const matchesPayment = !filterPaymentMethod || expense.paymentMethod === filterPaymentMethod;
      const matchesSupplier = !filterSupplierId || expense.supplierId?.toString() === filterSupplierId;
      const matchesDateFrom = !filterDateFrom || new Date(expense.paymentDate) >= new Date(filterDateFrom);
      const matchesDateTo = !filterDateTo || new Date(expense.paymentDate) <= new Date(filterDateTo);

      return matchesSearch && matchesPayment && matchesSupplier && matchesDateFrom && matchesDateTo;
    });
  }, [enrichedExpenses, searchText, filterPaymentMethod, filterSupplierId, filterDateFrom, filterDateTo]);

  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => {
      let result = 0;
      if (sortField === 'paymentDate') {
        result = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
      } else if (sortField === 'total') {
        result = a.total - b.total;
      } else {
        result = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortDirection === 'asc' ? result : -result;
    });
    return sorted;
  }, [filteredExpenses, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedExpenses = useMemo(
    () => sortedExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedExpenses, currentPage, pageSize]
  );

  const toggleSort = (field: ExpensesSortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const currentMonthYear = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const monthlyTotal = useMemo(() => {
    const now = toHermosilloDate(new Date().toISOString());
    return allExpenses
      .filter((e) => e?.paymentDate)
      .filter((e) => {
        const d = toHermosilloDate(e.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (Number(e.total) || 0), 0);
  }, [allExpenses]);

  const trendsData: TrendsChartData | null = useMemo(() => {
    if (!allExpenses.length) return null;

    const now = toHermosilloDate(new Date().toISOString());
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = TRENDS_MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        total: 0,
      });
    }
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

    allExpenses.forEach((e) => {
      if (!e?.paymentDate) return;
      const d = toHermosilloDate(e.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = bucketByKey.get(key);
      if (bucket) bucket.total += Number(e.total) || 0;
    });

    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ label: 'Egresos', data: buckets.map((b) => b.total), backgroundColor: '#DC2626' }],
    };
  }, [allExpenses]);

  const handleCreateExpense = async (expenseData: any) => {
    try {
      await createExpense(expenseData);
      showToast('Egreso creado exitosamente');
      setShowExpenseForm(false);
      await loadExpenses();
    } catch (error) {
      console.error('[useExpenses] handleCreateExpense failed:', error);
      showToast('Error al crear el egreso', 'danger');
      throw error;
    }
  };

  return {
    loading,
    suppliers,
    expenses: paginatedExpenses,
    totalResults: sortedExpenses.length,

    searchText,
    setSearchText,
    filterPaymentMethod,
    setFilterPaymentMethod,
    filterSupplierId,
    setFilterSupplierId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    showFilters,
    setShowFilters,
    activeFilterCount,

    sortField,
    sortDirection,
    toggleSort,

    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalPages,

    showTrendsModal,
    setShowTrendsModal,
    trendsData,

    showExpenseForm,
    setShowExpenseForm,
    handleCreateExpense,
    toastProps,

    monthlyTotal,
    monthlyTotalFormatted: fmtMXN(monthlyTotal),
    currentMonthYear,
    mxDate,

    refresh: loadExpenses,
  };
};

export type ExpensesVM = ReturnType<typeof useExpenses>;
