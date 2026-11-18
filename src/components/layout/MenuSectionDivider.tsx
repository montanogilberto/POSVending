import React from 'react';
import { IonIcon, IonItem, IonLabel } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';

/**
 * Side-menu section header that folds its section. The fold itself is applied by
 * useMenuSearch (it walks the flat menu list), keyed by data-section = title.
 */
const MenuSectionDivider: React.FC<{
  title: string;
  collapsed: boolean;
  onToggle: (title: string) => void;
}> = ({ title, collapsed, onToggle }) => (
  <IonItem button detail={false} lines="none" data-section={title} className="menu-section-header"
    aria-expanded={!collapsed} onClick={() => onToggle(title)}>
    <IonLabel className="menu-section-title">{title}</IonLabel>
    <IonIcon icon={chevronDownOutline} slot="end"
      className={collapsed ? 'menu-section-chevron menu-section-chevron-collapsed' : 'menu-section-chevron'} />
  </IonItem>
);

export default MenuSectionDivider;
