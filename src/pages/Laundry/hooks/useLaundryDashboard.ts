import { useEffect, useState, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useIncome } from '../../../context/IncomeContext';
import { fetchTicket } from '../../../api/ticketApi';
import useInactivityTimer from '../../../hooks/useInactivityTimer';
import { useUser } from '../../../components/UserContext';
import { Transaction, CartItem, LocationState } from '../types';
import { parseSqlDateToUTC, isCurrentMonthUTC, isTodayUTC } from '../../../utils/dateUtils';

type UseLaundryDashboardReturn = {
  location: ReturnType<typeof useLocation>;
  history: ReturnType<typeof useHistory>;
  allIncome: any[];
  showToast: boolean;
  setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
  toastMessage: string;
  setToastMessage: React.Dispatch<React.SetStateAction<string>>;
  transactions: Transaction[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showCart: boolean;
  setShowCart: React.Dispatch<React.SetStateAction<boolean>>;
  showLogoutAlert: boolean;
  setShowLogoutAlert: React.Dispatch<React.SetStateAction<boolean>>;
  authenticated: boolean;
  showReceiptModal: boolean;
  setShowReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
  receiptData: any;
  setReceiptData: React.Dispatch<React.SetStateAction<any>>;
  pieData: any;
  handleStartSeller: () => void;
  handleConfirmSale: () => Promise<void>;
  calculateTotal: () => number;
  calculateDailySales: () => number;
  calculateMonthlyTotal: () => number;
  currentMonthYear: string;
  currentUser: string;
  percentageChange: string;
  popoverState: { showAlertPopover: boolean; showMailPopover: boolean; event?: Event };
  presentAlertPopover: (e: React.MouseEvent) => void;
  dismissAlertPopover: () => void;
  presentMailPopover: (e: React.MouseEvent) => void;
  dismissMailPopover: () => void;
  handleLogoutConfirm: () => void;
  handleShowReceipt: (incomeId: number) => Promise<void>;
  getTitleFromPath: (pathname: string) => string;
};

type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';

const PAYMENT_METHODS: PaymentMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta'];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  Efectivo: '#16A34A',
  Transferencia: '#22C55E',  
  Tarjeta: '#86EFAC',
};

export const useLaundryDashboard = (): UseLaundryDashboardReturn => {
  const location = useLocation();
  const history = useHistory();
  const { allIncome, loadIncomes } = useIncome();
  const { companyId } = useUser();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);
  const [popoverState, setPopoverState] = useState({
    showAlertPopover: false,
    showMailPopover: false,
  });

  // Cargar ingresos al entrar
  useEffect(() => {
    if (!companyId || Number(companyId) <= 0) {
      console.warn('[LaundryDashboard] skip loadIncomes -> invalid companyId', { companyId });
      return;
    }

    const controller = new AbortController();
    console.log('[LaundryDashboard] mount -> loadIncomes', {
      path: location.pathname,
      hasAuth: !!localStorage.getItem('pos_gmo_auth'),
      companyId,
    });
    loadIncomes({ signal: controller.signal, companyId });

    return () => {
      console.log('[LaundryDashboard] unmount -> abort loadIncomes');
      controller.abort();
    };
  }, [loadIncomes, companyId, location.pathname]);

  // Timer de inactividad
  useInactivityTimer(300000, useCallback(() => {
    if (!companyId || Number(companyId) <= 0) return;
    const controller = new AbortController();
    loadIncomes({ signal: controller.signal, companyId });
  }, [companyId, loadIncomes]));

  // Limpiar carrito cuando se oculta
  useEffect(() => {
    if (!showCart) {
      setCart([]);
    }
  }, [showCart]);

  // Gráfica de pagos por método
  useEffect(() => {
    console.log('[LaundryDashboard] allIncome changed', {
      count: allIncome.length,
      sample: allIncome[0] ?? null,
      dateRanges: {
        oldest: allIncome.length > 0 ? allIncome[allIncome.length-1]?.paymentDate : null,
        newest: allIncome[0]?.paymentDate,
      }
    });

    if (allIncome.length === 0) {
      console.log('[LaundryDashboard] No income data -> pieData=null');
      setPieData(null);
      return;
    }

    // Current month incomes
    const monthlyIncomes = allIncome.filter((income) => {
      const date = parseSqlDateToUTC(income.paymentDate);

      if (!date) {
        console.warn('[LaundryDashboard] Invalid date detected:', income.paymentDate);
        return false;
      }
      
      const isCurrentMonth = isCurrentMonthUTC(date);
      
      if (isCurrentMonth && process.env.NODE_ENV === 'development') {
        console.log('[LaundryDashboard] Current month match:', {
          incomeId: income.incomeId,
          utcDate: date.toISOString().split('T')[0],
        });
      }
      
      return isCurrentMonth;
    });

    const now = new Date();
    console.log('[LaundryDashboard] Monthly filter result:', {
      monthlyCount: monthlyIncomes.length,
      currentMonthYear: `${now.getUTCMonth() + 1}/${now.getUTCFullYear()}`,
      allIncomeCount: allIncome.length
    });

    let incomesForPie = monthlyIncomes;
    let usedMonthYear = `${now.getUTCMonth() + 1}/${now.getUTCFullYear()}`;

    // Fallback: if no current month data, use latest available month
    if (monthlyIncomes.length === 0) {
      // Filter valid dates, sort desc by date
      const validIncomes = allIncome
        .map(income => ({ income, date: parseSqlDateToUTC(income.paymentDate) }))
        .filter(({ date }) => date !== null)
        .sort((a, b) => b.date!.getTime() - a.date!.getTime());

      if (validIncomes.length === 0) {
        console.log('[LaundryDashboard] No valid dates in allIncome -> pieData=null');
        setPieData(null);
        return;
      }

      // Group by month/year until find non-empty group
      const monthGroups: Record<string, any[]> = {};
      for (const { income, date } of validIncomes) {
        const key = `${date!.getUTCMonth() + 1}/${date!.getUTCFullYear()}`;
        if (!monthGroups[key]) monthGroups[key] = [];
        monthGroups[key].push(income);
      }

      // Find latest non-empty month
      const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
        const [ma, ya] = a.split('/').map(Number);
        const [mb, yb] = b.split('/').map(Number);
        return yb * 100 + mb - (ya * 100 + ma);
      });

      if (sortedMonths.length > 0) {
        const latestMonth = sortedMonths[0];
        incomesForPie = monthGroups[latestMonth];
        usedMonthYear = latestMonth;
        console.log(`[LaundryDashboard] Fallback to latest month: ${latestMonth} (${incomesForPie.length} records)`);
      } else {
        console.log('[LaundryDashboard] No monthly groups found -> pieData=null');
        setPieData(null);
        return;
      }
    }

    // Mapear métodos de pago
    const methodMap: Record<string, PaymentMethod> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };

    const paymentTotals = incomesForPie.reduce(
      (acc: Record<PaymentMethod, number>, income: any) => {
        const raw = (income.paymentMethod || '').toString().toLowerCase();
        const method = methodMap[raw] as PaymentMethod;

        if (!method) {
          console.warn('Método de pago desconocido:', income.paymentMethod);
          return acc;
        }

        const totalNumber = Number(income.total) || 0;
        acc[method] = (acc[method] || 0) + totalNumber;
        return acc;
      },
      {
        Efectivo: 0,
        Transferencia: 0,
        Tarjeta: 0,
      }
    );

    console.log(`[LaundryDashboard] Using ${incomesForPie.length} incomes from ${usedMonthYear} for pieData`);

    const data = {
      labels: PAYMENT_METHODS,
      datasets: [{
        data: PAYMENT_METHODS.map((m) => paymentTotals[m] || 0),
        backgroundColor: PAYMENT_METHODS.map((m) => PAYMENT_COLORS[m]),
        borderWidth: 0,
      }],
    };

    console.log('[LaundryDashboard] pieData generated', {
      labels: data.labels,
      values: data.datasets[0]?.data,
    });
    setPieData(data);
  }, [allIncome]);

  const handleStartSeller = useCallback(() => {
    history.push('/category');
  }, [history]);

  const handleConfirmSale = useCallback(async () => {
    if (cart.length === 0) {
      setToastMessage('El carrito está vacío.');
      setShowToast(true);
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const response = await fetch(
        'https://smartloansbackend.azurewebsites.net/pos_laundry',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pos_laundry: {
              details: cart.map((item) => ({
                productId: item.productId,
                cantidad: item.quantity,
                precio_unitario: item.price,
                subtotal: item.subtotal,
              })),
              total,
            },
          }),
        }
      );

      if (!response.ok)
        throw new Error(`Error al crear venta: ${response.status}`);
      const data = await response.json();
      console.log('Venta creada:', data);

      const now = new Date();
      const newTransaction: Transaction = {
        date: now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: total,
        user: 'admin',
        productName: cart.map((item) => item.name).join(', '),
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
      };

      setTransactions((prev) => [newTransaction, ...prev].slice(0, 5));
      setToastMessage(`Venta confirmada: $${total.toFixed(2)}`);
      setShowToast(true);
      setCart([]);
      setShowCart(false);
      loadIncomes({ companyId: Number(companyId) });
    } catch (error) {
      console.error(error);
      setToastMessage('Error al confirmar la venta.');
      setShowToast(true);
    }
  }, [cart, companyId, loadIncomes]);

  const calculateTotal = useCallback((): number =>
    allIncome.reduce((sum, income) => sum + Number(income.total || 0), 0), [allIncome]);

  const calculateDailySales = useCallback((): number => {
    return allIncome
      .filter((income) => {
        const date = parseSqlDateToUTC(income.paymentDate);
        return date ? isTodayUTC(date) : false;
      })
      .reduce((sum, income) => {
        const total = Number(income.total) || 0;
        const discount = Number(income.discountAmount) || 0;
        return sum + total - discount;
      }, 0);
  }, [allIncome]);

  const calculateMonthlyTotal = useCallback((): number => {
    // Reuse same fallback logic as pieData (current or latest month)
    const now = new Date();
    const monthlyIncomes = allIncome.filter((income) => {
      const date = parseSqlDateToUTC(income.paymentDate);
      return date ? isCurrentMonthUTC(date) : false;
    });

    if (monthlyIncomes.length > 0) {
      // Use current month
    } else {
      // Fallback to latest month (same logic as pieData)
      const validIncomes = allIncome
        .map(income => ({ income, date: parseSqlDateToUTC(income.paymentDate) }))
        .filter(({ date }) => date !== null)
        .sort((a, b) => b.date!.getTime() - a.date!.getTime());

      if (validIncomes.length > 0) {
        const monthGroups: Record<string, any[]> = {};
        for (const { income, date } of validIncomes) {
          const key = `${date!.getUTCMonth() + 1}/${date!.getUTCFullYear()}`;
          if (!monthGroups[key]) monthGroups[key] = [];
          monthGroups[key].push(income);
        }
        const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
          const [ma, ya] = a.split('/').map(Number);
          const [mb, yb] = b.split('/').map(Number);
          return yb * 100 + mb - (ya * 100 + ma);
        });
        if (sortedMonths.length > 0) {
          monthlyIncomes.splice(0, 0, ...monthGroups[sortedMonths[0]]);
        }
      }
    }

    return monthlyIncomes.reduce((sum, income) => {
      const total = Number(income.total) || 0;
      const discount = Number(income.discountAmount) || 0;
      return sum + total - discount;
    }, 0);
  }, [allIncome]);

  const currentMonthYear = new Date().toLocaleDateString('es-ES', {
    month: 'short',
    year: 'numeric',
  });
  const currentUser = 'admin';
  const percentageChange = '+0%';

  const presentAlertPopover = useCallback((e: React.MouseEvent) => {
    setPopoverState(prev => ({
      ...prev,
      showAlertPopover: true,
      event: e.nativeEvent as Event,
    }));
  }, []);

  const dismissAlertPopover = useCallback(() => {
    setPopoverState(prev => ({ ...prev, showAlertPopover: false }));
  }, []);

  const presentMailPopover = useCallback((e: React.MouseEvent) => {
    setPopoverState(prev => ({
      ...prev,
      showMailPopover: true,
      event: e.nativeEvent as Event,
    }));
  }, []);

  const dismissMailPopover = useCallback(() => {
    setPopoverState(prev => ({ ...prev, showMailPopover: false }));
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    setAuthenticated(false);
    history.push('/Login');
    setShowLogoutAlert(false);
  }, [history]);

  const handleShowReceipt = useCallback(async (incomeId: number) => {
    try {
      console.log('Fetching ticket for incomeId:', incomeId);
      const ticket = await fetchTicket(incomeId.toString());
      console.log('Fetched ticket result:', ticket);
      
      if (ticket) {
        history.push({
          pathname: '/receipt',
          state: { ticketData: ticket }
        });
      } else {
        console.warn('Ticket is null for incomeId:', incomeId);
        setToastMessage('No se encontró el ticket para este ingreso.');
        setShowToast(true);
      }
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      setToastMessage('Error al obtener el recibo: ' + (error.message || 'Error desconocido'));
      setShowToast(true);
    }
  }, [history, setToastMessage, setShowToast]);

  const getTitleFromPath = useCallback((pathname: string): string => {
    switch (pathname) {
      case '/POS':
      case '/Laundry':
        return 'Lavandería';
      case '/ScannerQR':
        return 'Lector QR';
      case '/Setting':
        return 'Configuración';
      case '/Sells':
        return 'Ventas';
      default:
        return 'POS GMO';
    }
  }, []);

  return {
    location,
    history,
    allIncome,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    transactions,
    cart,
    setCart,
    showCart,
    setShowCart,
    showLogoutAlert,
    setShowLogoutAlert,
    authenticated,
    showReceiptModal,
    setShowReceiptModal,
    receiptData,
    setReceiptData,
    pieData,
    handleStartSeller,
    handleConfirmSale,
    calculateTotal,
    calculateDailySales,
    calculateMonthlyTotal,
    currentMonthYear,
    currentUser,
    percentageChange,
    popoverState,
    presentAlertPopover,
    dismissAlertPopover,
    presentMailPopover,
    dismissMailPopover,
    handleLogoutConfirm,
    handleShowReceipt,
    getTitleFromPath,
  };
};

