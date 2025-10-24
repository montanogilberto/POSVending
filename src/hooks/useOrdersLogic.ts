import { useState, useEffect } from 'react';
import { Order } from '../data/orderTypes';
import * as ordersApi from '../api/ordersApi';

export const useOrdersLogic = () => {
  const [selectedTab, setSelectedTab] = useState<'enPreparacion' | 'listo' | 'todos'>('enPreparacion');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const [orderProductDetails, setOrderProductDetails] = useState<{ [orderId: number]: any }>({});
  const [loadingProductDetails, setLoadingProductDetails] = useState<{ [orderId: number]: boolean }>({});
  const [errorProductDetails, setErrorProductDetails] = useState<{ [orderId: number]: string | null }>({});

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersData = await ordersApi.fetchOrders();
      setOrders(ordersData);
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderProductDetails = async (orderId: number) => {
    setLoadingProductDetails(prev => ({ ...prev, [orderId]: true }));
    setErrorProductDetails(prev => ({ ...prev, [orderId]: null }));
    try {
      const productDetails = await ordersApi.fetchOrderProductDetails(orderId);
      setOrderProductDetails(prev => ({ ...prev, [orderId]: productDetails }));
    } catch (error) {
      setErrorProductDetails(prev => ({ ...prev, [orderId]: 'Failed to fetch product details' }));
    } finally {
      setLoadingProductDetails(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const updateOrderStatus = async (orderId: number) => {
    try {
      const order = orders.find(o => o.orderId === orderId);
      if (!order) {
        setError('Order not found');
        return;
      }
      const latestStatus = order.orderStatuses[0];
      const currentStatusName = latestStatus?.orderStatusName || 'pending';

      await ordersApi.updateOrderStatus(orderId, currentStatusName);

      fetchOrders();
    } catch (error) {
      setError('Failed to update order status');
    }
  };

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
    if (!expandedOrderIds.includes(orderId)) {
      fetchOrderProductDetails(orderId);
    }
  };

  const filterOrdersByStatus = (statusNames: string[]) => {
    return orders.filter(order => {
      const latestStatus = order.orderStatuses[0];
      return latestStatus && statusNames.includes(latestStatus.orderStatusName.toLowerCase());
    });
  };

  const getStatusChangedAt = (order: Order, statusName: string): number => {
    const status = order.orderStatuses.find(s => s.orderStatusName.toLowerCase() === statusName.toLowerCase());
    if (!status) return 0;
    const dateStr = status.orderTracking[0]?.statusChangedAt || '';
    return dateStr ? new Date(dateStr).getTime() : 0;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    selectedTab,
    setSelectedTab,
    orders,
    loading,
    error,
    expandedOrderIds,
    orderProductDetails,
    loadingProductDetails,
    errorProductDetails,
    fetchOrders,
    fetchOrderProductDetails,
    updateOrderStatus,
    toggleOrderDetails,
    filterOrdersByStatus,
    getStatusChangedAt,
  };
};
