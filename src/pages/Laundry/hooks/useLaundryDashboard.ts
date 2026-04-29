import { useEffect, useState, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useIncome } from '../../../context/IncomeContext';
import { fetchTicket } from '../../../api/ticketApi';
import useInactivityTimer from '../../../hooks/useInactivityTimer';
import { Transaction, CartItem } from '../types';

type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';

const PAYMENT_METHODS: PaymentMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta'];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  Efectivo: '#16A34A',
  Transferencia: '#22C55E',
  Tarjeta: '#86EFAC',
};

// 🔥 helper to normalize Hermosillo date (reused everywhere)
const toHermosilloDate = (dateStr: string) => {
  const utcDate = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
  return new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
};

export const useLaundryDashboard = () => {
  const location = useLocation();
  const history = useHistory();
  const { allIncome, loadIncomes } = useIncome();

  // 🔹 UI State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // 🔹 Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [pieData, setPieData] = useState<any>(null);

  // 🔹 Popover State ✅ FIXED
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({
    showAlertPopover: false,
    showMailPopover: false,
    event: undefined,
  });

  // ✅ Load incomes
  useEffect(() => {
    const controller = new AbortController();
    loadIncomes(controller.signal);
    return () => controller.abort();
  }, [loadIncomes]);

  // ✅ Refresh on inactivity
  useInactivityTimer(300000, () => {
    const controller = new AbortController();
    loadIncomes(controller.signal);
  });

  // ✅ Clear cart automatically
  useEffect(() => {
    if (!showCart) setCart([]);
  }, [showCart]);

  // ✅ PIE CHART (optimized with useMemo)
  const pieChartData = useMemo(() => {
    if (!allIncome?.length) return null;

    const now = new Date();
    const hermosilloNow = new Date(now.getTime() - 7 * 60 * 60 * 1000);

    const monthly = allIncome.filter((income) => {
      if (!income?.paymentDate) return false;
      const d = toHermosilloDate(income.paymentDate);
      return (
        d.getMonth() === hermosilloNow.getMonth() &&
        d.getFullYear() === hermosilloNow.getFullYear()
      );
    });

    if (!monthly.length) return null;

    const methodMap: Record<string, PaymentMethod> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };

    const totals = monthly.reduce(
      (acc: Record<PaymentMethod, number>, income: any) => {
        const method = methodMap[(income.paymentMethod || '').toLowerCase()];
        if (!method) return acc;
        acc[method] += Number(income.total) || 0;
        return acc;
      },
      { Efectivo: 0, Transferencia: 0, Tarjeta: 0 }
    );

    const values = PAYMENT_METHODS.map((m) => totals[m] || 0);
    if (values.every((v) => v === 0)) return null;

    return {
      labels: PAYMENT_METHODS,
      datasets: [
        {
          data: values,
          backgroundColor: PAYMENT_METHODS.map((m) => PAYMENT_COLORS[m]),
          borderWidth: 0,
        },
      ],
    };
  }, [allIncome]);

  // sync state (optional, keeps compatibility with your component)
  useEffect(() => {
    setPieData(pieChartData);
  }, [pieChartData]);

  // ✅ METRICS
  const calculateTotal = () =>
    allIncome.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  const calculateDailySales = () => {
    const today = toHermosilloDate(new Date().toISOString())
      .toISOString()
      .split('T')[0];

    return allIncome
      .filter((i) => i?.paymentDate)
      .filter((i) => {
        const d = toHermosilloDate(i.paymentDate);
        return d.toISOString().split('T')[0] === today;
      })
      .reduce((sum, i) => {
        return sum + (Number(i.total) || 0) - (Number(i.discountAmount) || 0);
      }, 0);
  };

  const calculateMonthlyTotal = () => {
    const now = new Date();
    const hermosilloNow = new Date(now.getTime() - 7 * 60 * 60 * 1000);

    return allIncome
      .filter((i) => i?.paymentDate)
      .filter((i) => {
        const d = toHermosilloDate(i.paymentDate);
        return (
          d.getMonth() === hermosilloNow.getMonth() &&
          d.getFullYear() === hermosilloNow.getFullYear()
        );
      })
      .reduce((sum, i) => {
        return sum + (Number(i.total) || 0) - (Number(i.discountAmount) || 0);
      }, 0);
  };

  const currentMonthYear = new Date().toLocaleDateString('es-ES', {
    month: 'short',
    year: 'numeric',
  });

  // ✅ ACTIONS
  const handleStartSeller = () => history.push('/category');

  const handleConfirmSale = async () => {
    if (!cart.length) {
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

      if (!response.ok) throw new Error();

      setToastMessage(`Venta confirmada: $${total.toFixed(2)}`);
      setShowToast(true);
      setCart([]);
      setShowCart(false);
      loadIncomes();
    } catch {
      setToastMessage('Error al confirmar la venta.');
      setShowToast(true);
    }
  };

  const handleShowReceipt = async (incomeId: number) => {
    try {
      const ticket = await fetchTicket(incomeId.toString());
      if (!ticket) throw new Error();

      history.push('/receipt', { ticketData: ticket });
    } catch {
      setToastMessage('Error al obtener el recibo.');
      setShowToast(true);
    }
  };

  // ✅ POPOVER HANDLERS (FIXED)
  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({
      showAlertPopover: true,
      showMailPopover: false,
      event: e.nativeEvent,
    });
  };

  const dismissAlertPopover = () => {
    setPopoverState((prev) => ({ ...prev, showAlertPopover: false }));
  };

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({
      showAlertPopover: false,
      showMailPopover: true,
      event: e.nativeEvent,
    });
  };

  const dismissMailPopover = () => {
    setPopoverState((prev) => ({ ...prev, showMailPopover: false }));
  };

  // ✅ TITLE (clean)
  const getTitleFromPath = () => 'Lavandería';

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
    receiptData,
    setReceiptData,
    pieData,

    calculateTotal,
    calculateDailySales,
    calculateMonthlyTotal,
    currentMonthYear,

    handleStartSeller,
    handleConfirmSale,
    handleShowReceipt,

    popoverState,
    presentAlertPopover,
    dismissAlertPopover,
    presentMailPopover,
    dismissMailPopover,

    handleLogoutConfirm: () => history.push('/Login'),

    currentUser: 'admin',
    percentageChange: '+0%',

    getTitleFromPath,
  };
};