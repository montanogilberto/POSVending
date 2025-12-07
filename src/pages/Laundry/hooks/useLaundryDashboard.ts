import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useIncome } from '../../../context/IncomeContext';
import { fetchTicket } from '../../../api/ticketApi';
import useInactivityTimer from '../../../hooks/useInactivityTimer';
import { Transaction, CartItem, LocationState } from '../types';

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
  Efectivo: '#16A34A',        // verde fuerte
  Transferencia: '#22C55E',  // verde medio
  Tarjeta: '#86EFAC',        // verde claro
};

export const useLaundryDashboard = (): UseLaundryDashboardReturn => {
  const location = useLocation();
  const history = useHistory();
  const { allIncome, loadIncomes } = useIncome();

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

  // Cargar ingresos al entrar
  useEffect(() => {
    loadIncomes();
  }, [loadIncomes]);

  // Timer de inactividad para refrescar
  useInactivityTimer(300000, loadIncomes);

  // Recibir item desde ProductSelection
  useEffect(() => {
    const state = location.state as LocationState | undefined;
    if (state && state.from === 'product-selection' && state.item) {
      const item = state.item;
      setCart((prev) => [...prev, item]);
      setShowCart(true);
      setToastMessage(`Producto "${item.name}" agregado al carrito.`);
      setShowToast(true);
    }
  }, [location.state]);

  // Limpiar carrito cuando se oculta
  useEffect(() => {
    if (!showCart) {
      setCart([]);
    }
  }, [showCart, setCart]);

  // ╔═══════════════════════════════════════════════╗
  // ║   Gráfica: DINERO por método de pago / mes    ║
  // ╚═══════════════════════════════════════════════╝
  useEffect(() => {
    if (allIncome.length === 0) {
      setPieData(null);
      return;
    }

    const now = new Date();
    const hermosilloNow = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    const currentMonth = hermosilloNow.getMonth();
    const currentYear = hermosilloNow.getFullYear();

    // Filtrar ingresos del mes actual
    const monthlyIncomes = allIncome.filter((income) => {
      const utcDate = new Date(
        income.paymentDate + (income.paymentDate.includes('Z') ? '' : 'Z')
      );
      const hermosilloDate = new Date(
        utcDate.getTime() - 7 * 60 * 60 * 1000
      );
      return (
        hermosilloDate.getMonth() === currentMonth &&
        hermosilloDate.getFullYear() === currentYear
      );
    });

    if (monthlyIncomes.length === 0) {
      setPieData(null);
      return;
    }

    // Mapear valores de la BD (minúsculas) → labels de la UI
    const methodMap: Record<string, PaymentMethod> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };

    // Sumar TOTAL de dinero por método de pago
    const paymentTotals = monthlyIncomes.reduce(
      (acc: Record<PaymentMethod, number>, income: any) => {
        const raw = (income.paymentMethod || '').toString().toLowerCase();
        const method = methodMap[raw];

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

    const data = {
      labels: PAYMENT_METHODS, // ['Efectivo', 'Transferencia', 'Tarjeta']
      datasets: [
        {
          data: PAYMENT_METHODS.map((m) => paymentTotals[m] || 0),
          backgroundColor: PAYMENT_METHODS.map((m) => PAYMENT_COLORS[m]),
          borderWidth: 0,
        },
      ],
    };

    setPieData(data);
  }, [allIncome]);

  const handleStartSeller = () => {
    history.push('/category');
  };

  const handleConfirmSale = async () => {
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
        date:
          now.toLocaleDateString('es-ES') +
          ' ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      loadIncomes();
    } catch (error) {
      console.error(error);
      setToastMessage('Error al confirmar la venta.');
      setShowToast(true);
    }
  };

  const calculateTotal = (): number =>
    allIncome.reduce((sum, income) => sum + income.total, 0);

  const calculateDailySales = (): number => {
    const today = new Date();
    const hermosilloToday = new Date(today.getTime() - 7 * 60 * 60 * 1000); // UTC-7
    const todayString = hermosilloToday.toISOString().split('T')[0]; // YYYY-MM-DD
    return allIncome
      .filter((income) => {
        const utcDate = new Date(
          income.paymentDate + (income.paymentDate.includes('Z') ? '' : 'Z')
        );
        const hermosilloDate = new Date(
          utcDate.getTime() - 7 * 60 * 60 * 1000
        );
        const dateString = hermosilloDate.toISOString().split('T')[0];
        return dateString === todayString;
      })
      .reduce((sum, income) => sum + income.total, 0);
  };

  const calculateMonthlyTotal = (): number => {
    const now = new Date();
    const hermosilloNow = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    const currentMonth = hermosilloNow.getMonth();
    const currentYear = hermosilloNow.getFullYear();
    return allIncome
      .filter((income) => {
        const utcDate = new Date(
          income.paymentDate + (income.paymentDate.includes('Z') ? '' : 'Z')
        );
        const hermosilloDate = new Date(
          utcDate.getTime() - 7 * 60 * 60 * 1000
        );
        return (
          hermosilloDate.getMonth() === currentMonth &&
          hermosilloDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, income) => sum + income.total, 0);
  };

  const currentMonthYear = new Date().toLocaleDateString('es-ES', {
    month: 'short',
    year: 'numeric',
  });
  const currentUser = 'admin';
  const percentageChange = '+0%';

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) => {
    setPopoverState({
      ...popoverState,
      showAlertPopover: true,
      event: e.nativeEvent,
    });
  };

  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) => {
    setPopoverState({
      ...popoverState,
      showMailPopover: true,
      event: e.nativeEvent,
    });
  };

  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const handleLogoutConfirm = () => {
    setAuthenticated(false);
    history.push('/Login');
    setShowLogoutAlert(false);
  };

  const handleShowReceipt = async (incomeId: number) => {
    try {
      const ticket = await fetchTicket(incomeId.toString());
      if (ticket) {
        const utcDate = new Date(
          ticket.paymentDate + (ticket.paymentDate.includes('Z') ? '' : 'Z')
        );
        const hermosilloDate = new Date(
          utcDate.getTime() - 7 * 60 * 60 * 1000
        );
        const receiptProps = {
          transactionDate: hermosilloDate.toLocaleDateString('es-ES'),
          transactionTime: hermosilloDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          clientName: ticket.client.name,
          clientPhone: ticket.client.cellphone,
          clientEmail: ticket.client.email,
          userName: ticket.user.name,
          products: ticket.products.map((p: any) => ({
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            subtotal: p.subtotal,
            options: p.options.map((o: any) => o.choiceName),
          })),
          subtotal: ticket.totals.subtotal,
          iva: ticket.totals.iva,
          total: ticket.totals.total,
          paymentMethod: ticket.paymentMethod,
          amountReceived: ticket.totals.total,
          change: 0,
        };
        setReceiptData(receiptProps);
        setShowReceiptModal(true);
      } else {
        setToastMessage('Recibo no encontrado.');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setToastMessage('Error al obtener el recibo.');
      setShowToast(true);
    }
  };

  const getTitleFromPath = (pathname: string): string => {
    switch (pathname) {
      case '/POS':
        return 'Lavandería';
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
  };

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
