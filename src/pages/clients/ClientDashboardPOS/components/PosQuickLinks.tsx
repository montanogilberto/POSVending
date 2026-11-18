import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { barChartOutline, walletOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Customer only: SmartLoans entry points (lender dashboard / borrower onboarding). */
const PosQuickLinks: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  const history = useHistory();
  const links = [
    { icon: walletOutline, label: 'Prestamista', sub: 'Conecta, financia, haz crecer.', color: 'green',
      onClick: () => history.push(`/lender-dashboard/${vm.clientId}`) },
    { icon: barChartOutline, label: 'Prestatario', sub: 'Solicita tu préstamo aquí.', color: 'blue',
      onClick: () => history.push('/borrower-onboarding') },
  ];
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <h2 className="cpos-section-title">Accesos rápidos</h2>
        <div className="cpos-quick-links">
          {links.map((link) => (
            <IonButton key={link.label} fill="clear" onClick={link.onClick}
              className={`cpos-quick-link cpos-quick-link--${link.color}`}>
              <span className="cpos-quick-link-content">
                <span className="cpos-quick-link-icon"><IonIcon icon={link.icon} aria-hidden="true" /></span>
                <span className="cpos-quick-link-text">
                  <strong>{link.label}</strong>
                  <span>{link.sub}</span>
                </span>
              </span>
            </IonButton>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosQuickLinks;
