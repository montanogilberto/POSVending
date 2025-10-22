import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonText,
  IonSpinner,
  IonToggle,
  IonListHeader,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
} from '@ionic/react';
import { Order } from '../data/orderTypes';
import { useOrdersLogic } from '../hooks/useOrdersLogic';
import { useAzureSpeech } from '../hooks/useAzureSpeech';

const OrderItem: React.FC<{
  order: Order;
  expanded: boolean;
  toggleDetails: (orderId: number) => void;
  updateStatus: (orderId: number) => void;
  productDetails: any;
  loadingDetails: boolean;
  errorDetails: string | null;
  selectedTab: string;
}> = ({
  order,
  expanded,
  toggleDetails,
  updateStatus,
  productDetails,
  loadingDetails,
  errorDetails,
  selectedTab,
}) => {
  const latestStatus = order.orderStatuses[0];
  const statusName = latestStatus?.orderStatusName || 'Unknown';
  const statusColor = latestStatus?.orderStatusColor || 'black';
  const statusChangedAt = latestStatus?.orderTracking[0]?.statusChangedAt || '';

  const isInPreparation = statusName.toLowerCase() === 'preparing';

  return (
    <>
      <IonItem>
        <IonLabel>
          <h2>Orden #{order.orderId} - Table {order.tableNumber}</h2>
          <p>Total: ${order.total.toFixed(2)}</p>
          <p>Status: <IonText style={{ color: statusColor, fontWeight: 'bold', borderRadius: '8px' }}>{statusName}</IonText></p>
          <p>Ultima Actualizacion: {new Date(statusChangedAt).toLocaleTimeString()}</p>
          {order.comments && <p>Comments: {order.comments}</p>}
          <p
            style={{ cursor: 'pointer', color: 'blue', marginLeft: '10px', textDecoration: 'underline' }}
            onClick={() => toggleDetails(order.orderId)}
          >
            {expanded ? 'Hide Product Details' : 'Show Product Details'}
          </p>
        </IonLabel>
        {selectedTab === 'enPreparacion' && (
          <IonToggle
            checked={isInPreparation}
            onIonChange={() => updateStatus(order.orderId)}
            slot="end"
            aria-label="Update order status"
          />
        )}
      </IonItem>
      {expanded && (
        <IonList>
          {loadingDetails && <IonItem><IonLabel>Loading product details...</IonLabel></IonItem>}
          {errorDetails && <IonItem><IonLabel color="danger">{errorDetails}</IonLabel></IonItem>}
          {productDetails && (
            <>
              {productDetails.products?.map((product: any, index: number) => (
                <IonCard key={index}>
                  <IonCardHeader>
                    <IonCardTitle>{product.productName}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {product.po?.map((option: any) => (
                      <div key={option.productOptionId} style={{ marginLeft: '10px' }}>
                        <strong>{option.optionName}:</strong>
                        <ul>
                          {option.poc?.map((choice: any) => (
                            <li key={choice.productOptionChoiceId}>
                              {choice.choiceName} {choice.choicePrice > 0 ? `($${choice.choicePrice.toFixed(2)})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </IonCardContent>
                </IonCard>
              ))}
            </>
          )}
        </IonList>
      )}
    </>
  );
};

const OrdersPage: React.FC = () => {
  const {
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
    updateOrderStatus,
    toggleOrderDetails,
    filterOrdersByStatus,
    getStatusChangedAt,
  } = useOrdersLogic();

  const [commands, setCommands] = useState<{ commandId: number; phrase: string; action: string }[]>([]);

  const {
    isListening,
    listeningForCommand,
    transcript,
    toggleListening,
  } = useAzureSpeech({
    commands,
    onFetchOrders: fetchOrders,
    onUpdateOrderStatus: fetchOrders,
    onSpeakOrdersSummary: () => {
      if (orders.length === 0) {
        speakText('No hay órdenes para leer.');
        return;
      }
      let summary = `Hay ${orders.length} órdenes. `;
      orders.forEach(order => {
        const latestStatus = order.orderStatuses[0];
        const statusName = latestStatus?.orderStatusName || 'desconocido';
        summary += `Orden ${order.orderId} en la mesa ${order.tableNumber} está ${statusName}. `;
      });
      speakText(summary);
    },
    onStopListening: () => {
      // Additional stop listening logic if needed
    },
    onFetchOrderProductDetails: (orderId: number) => {
      // Fetch product details logic
    },
    expandedOrderIds,
    orderProductDetails,
    readProductDetails: () => {
      if (expandedOrderIds.length === 0) {
        speakText('No hay órdenes expandidas para leer.');
        return;
      }
      expandedOrderIds.forEach(orderId => {
        const details = orderProductDetails[orderId];
        if (!details) {
          speakText(`No hay detalles disponibles para la orden ${orderId}.`);
          return;
        }
        let speechText = `Detalles de la orden ${orderId}: `;
        details.products.forEach((product: any) => {
          speechText += `${product.productName}, `;
          product.po.forEach((option: any) => {
            speechText += `${option.optionName}: `;
            option.poc.forEach((choice: any) => {
              speechText += `${choice.choiceName}, `;
            });
          });
        });
        speakText(speechText);
      });
    },
  });

  const speakText = (text: string) => {
    console.log('Speaking text:', text);
    // Implement speech synthesis here or delegate to useAzureSpeech if needed
  };

  React.useEffect(() => {
    const fetchCommands = async () => {
      try {
        const response = await fetch('https://smartloansbackend.azurewebsites.net/all_commands');
        if (!response.ok) {
          throw new Error('Failed to fetch commands');
        }
        const data = await response.json();
        setCommands(data.commands || []);
      } catch (error) {
        console.error('Error fetching commands:', error);
      }
    };
    fetchCommands();
  }, []);

  let content;

  if (loading) {
    content = <IonSpinner name="crescent" />;
  } else if (error) {
    content = <IonText color="danger">{error}</IonText>;
  } else {
    if (selectedTab === 'enPreparacion') {
      const preparingOrders = filterOrdersByStatus(['preparing']).sort(
        (a, b) => getStatusChangedAt(a, 'preparing') - getStatusChangedAt(b, 'preparing')
      );
      const pendingOrders = filterOrdersByStatus(['pending']).sort(
        (a, b) => getStatusChangedAt(a, 'pending') - getStatusChangedAt(b, 'pending')
      );

      content = (
        <>
          <IonList>
            <IonListHeader>En preparacion</IonListHeader>
            {preparingOrders.length > 0 ? preparingOrders.map(order => (
              <OrderItem
                key={order.orderId}
                order={order}
                expanded={expandedOrderIds.includes(order.orderId)}
                toggleDetails={toggleOrderDetails}
                updateStatus={updateOrderStatus}
                productDetails={orderProductDetails[order.orderId]}
                loadingDetails={loadingProductDetails[order.orderId]}
                errorDetails={errorProductDetails[order.orderId]}
                selectedTab={selectedTab}
              />
            )) : (
              <IonItem>
                <IonLabel>No orders preparing.</IonLabel>
              </IonItem>
            )}
          </IonList>
          <IonList>
            <IonListHeader>Pendientes</IonListHeader>
            {pendingOrders.length > 0 ? pendingOrders.map(order => (
              <OrderItem
                key={order.orderId}
                order={order}
                expanded={expandedOrderIds.includes(order.orderId)}
                toggleDetails={toggleOrderDetails}
                updateStatus={updateOrderStatus}
                productDetails={orderProductDetails[order.orderId]}
                loadingDetails={loadingProductDetails[order.orderId]}
                errorDetails={errorProductDetails[order.orderId]}
                selectedTab={selectedTab}
              />
            )) : (
              <IonItem>
                <IonLabel>No orders pending.</IonLabel>
              </IonItem>
            )}
          </IonList>
        </>
      );
    } else if (selectedTab === 'listo') {
      const filtered = filterOrdersByStatus(['done']);
      content = filtered.length > 0 ? (
        <IonList>{filtered.map(order => (
          <OrderItem
            key={order.orderId}
            order={order}
            expanded={expandedOrderIds.includes(order.orderId)}
            toggleDetails={toggleOrderDetails}
            updateStatus={updateOrderStatus}
            productDetails={orderProductDetails[order.orderId]}
            loadingDetails={loadingProductDetails[order.orderId]}
            errorDetails={errorProductDetails[order.orderId]}
            selectedTab={selectedTab}
          />
        ))}</IonList>
      ) : (
        <IonList>
          <IonItem>
            <IonLabel>No orders listos.</IonLabel>
          </IonItem>
        </IonList>
      );
    } else {
      content = orders.length > 0 ? (
        <IonList>{orders.map(order => (
          <OrderItem
            key={order.orderId}
            order={order}
            expanded={expandedOrderIds.includes(order.orderId)}
            toggleDetails={toggleOrderDetails}
            updateStatus={updateOrderStatus}
            productDetails={orderProductDetails[order.orderId]}
            loadingDetails={loadingProductDetails[order.orderId]}
            errorDetails={errorProductDetails[order.orderId]}
            selectedTab={selectedTab}
          />
        ))}</IonList>
      ) : (
        <IonList>
          <IonItem>
            <IonLabel>No orders.</IonLabel>
          </IonItem>
        </IonList>
      );
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Orders</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={selectedTab} onIonChange={e => setSelectedTab(e.detail.value as any)}>
            <IonSegmentButton value="enPreparacion">
              <IonLabel>Preparacion</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="listo">
              <IonLabel>Listos</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="todos">
              <IonLabel>Todos</IonLabel>
            </IonSegmentButton>
          </IonSegment>
          <IonButton onClick={toggleListening} fill="clear" slot="end" aria-label="Toggle Assistant">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isListening ? 'red' : 'black'}
              width="24px"
              height="24px"
            >
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="23" stroke={isListening ? 'red' : 'black'} strokeWidth="2" />
              <line x1="8" y1="23" x2="16" y2="23" stroke={isListening ? 'red' : 'black'} strokeWidth="2" />
            </svg>
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>{content}</IonContent>
    </IonPage>
  );
};

export default OrdersPage;
