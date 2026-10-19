import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { walletOutline, barChartOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props { vm: RewardsDashboardVM; }

const RewardsQuickLinks: React.FC<Props> = ({ vm }) => {
  const history = useHistory();

  const links = [
    {
      icon: walletOutline,
      label: 'Prestamista',
      sub: 'Conecta, financia, haz crecer.',
      color: 'green',
      onClick: () => history.push(`/lender-dashboard/${vm.clientId}`),
    },
    {
      icon: barChartOutline,
      label: 'Prestatario',
      sub: 'Solicita tu préstamo aquí.',
      color: 'blue',
      onClick: () => history.push('/borrower-onboarding'),
    },
  ];

  return (
    <section className="rewards-section">
      <h2 className="rewards-section-title">Accesos rápidos</h2>
      <div className="rewards-quick-links">
        {links.map((link) => (
          <IonButton
            key={link.label}
            fill="clear"
            className={`rewards-quick-link-tile rewards-quick-link-tile--${link.color}`}
            onClick={link.onClick}
          >
            <span className="rewards-quick-link-content">
              <span className="rewards-quick-link-icon">
                <IonIcon icon={link.icon} aria-hidden="true" />
              </span>
              <span className="rewards-quick-link-text">
                <strong>{link.label}</strong>
                <span>{link.sub}</span>
              </span>
            </span>
          </IonButton>
        ))}
      </div>
    </section>
  );
};

export default RewardsQuickLinks;
