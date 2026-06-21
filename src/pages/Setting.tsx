import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToggle,
  IonItem,
  IonIcon,
  IonButton,
  IonToast,
  IonBadge,
  IonChip,
} from '@ionic/react';
import {
  cashOutline,
  qrCodeOutline,
  waterOutline,
  peopleOutline,
  cubeOutline,
  gridOutline,
  notificationsOutline,
  mailOutline,
  personOutline,
  barChartOutline,
  trendingDownOutline,
  bulbOutline,
  settingsOutline,
  cartOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { RoleCode, UiFeature, ROLE_UI } from '../config/rolePermissions';
import './Setting.css';

// ── Module definitions ──────────────────────────────────────────────────────

interface FeatureDef {
  code: UiFeature;
  label: string;
  icon: string;
}

interface ModuleDef {
  name: string;
  features: FeatureDef[];
}

const MODULES: ModuleDef[] = [
  {
    name: 'POS',
    features: [
      { code: 'pos',       label: 'Vending POS', icon: cashOutline },
      { code: 'scannerqr', label: 'Lector QR',   icon: qrCodeOutline },
      { code: 'laundry',   label: 'Lavandería',  icon: waterOutline },
    ],
  },
  {
    name: 'Catálogo',
    features: [
      { code: 'clients',    label: 'Clientes',   icon: peopleOutline },
      { code: 'products',   label: 'Productos',  icon: cubeOutline },
      { code: 'categories', label: 'Categorías', icon: gridOutline },
      { code: 'suppliers', label: 'Proveedores', icon: peopleOutline },
      { code: 'clientDashboards', label: 'Dashboard Cliente', icon: peopleOutline },
    ],
  },
  {
    name: 'Mensajes',
    features: [
      { code: 'alerts', label: 'Alertas',  icon: notificationsOutline },
      { code: 'emails', label: 'Correos',  icon: mailOutline },
      { code: 'pushNotifications', label: 'Notificaciones', icon: notificationsOutline },
    ],
  },
  {
    name: 'Administración',
    features: [
      { code: 'users',    label: 'Usuarios',      icon: personOutline },
      { code: 'ingresos', label: 'Ingresos',      icon: barChartOutline },
      { code: 'egresos',  label: 'Egresos',       icon: trendingDownOutline },
      { code: 'sells',    label: 'Ventas',        icon: cartOutline },
      { code: 'settings', label: 'Configuración', icon: settingsOutline },
      { code: 'loans', label: 'Préstamos', icon: cashOutline },
      { code: 'clientFaceRecognitions', label: 'Reconocimiento Facial', icon: shieldCheckmarkOutline },
    ],
  },
  {
    name: 'IOT',
    features: [
      { code: 'iot', label: 'LED Status / Water Tanks', icon: bulbOutline },
    ],
  },
];

const ROLE_LABELS: Record<RoleCode, string> = {
  admin:    'Administrador',
  manager:  'Gerente',
  employee: 'Empleado',
};

const ROLE_COLORS: Record<RoleCode, string> = {
  admin:    'danger',
  manager:  'warning',
  employee: 'primary',
};

// ── Types ───────────────────────────────────────────────────────────────────

type PermissionMap = Record<RoleCode, Set<UiFeature>>;

function buildInitialPermissions(): PermissionMap {
  return {
    admin:    new Set(ROLE_UI.admin    as UiFeature[]),
    manager:  new Set(ROLE_UI.manager  as UiFeature[]),
    employee: new Set(ROLE_UI.employee as UiFeature[]),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

const Setting: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleCode>('admin');
  const [permissions, setPermissions]   = useState<PermissionMap>(buildInitialPermissions);
  const [savedPerms, setSavedPerms]     = useState<PermissionMap>(buildInitialPermissions);
  const [showToast, setShowToast]       = useState(false);
  const [toastMsg, setToastMsg]         = useState('');

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });

  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const currentPerms = permissions[selectedRole];

  const toggle = (feature: UiFeature) => {
    setPermissions(prev => {
      const next = new Set(prev[selectedRole]);
      next.has(feature) ? next.delete(feature) : next.add(feature);
      return { ...prev, [selectedRole]: next };
    });
  };

  const hasChanges = () => {
    const curr  = permissions[selectedRole];
    const saved = savedPerms[selectedRole];
    if (curr.size !== saved.size) return true;
    for (const f of curr) if (!saved.has(f)) return true;
    return false;
  };

  const handleSave = async () => {
    const payload = {
      roleCode:    selectedRole,
      permissions: Array.from(permissions[selectedRole]),
    };
    console.log('POST /update_role_permissions', payload);

    // TODO: replace with real API call:
    // await fetch('/update_role_permissions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    setSavedPerms(prev => ({ ...prev, [selectedRole]: new Set(permissions[selectedRole]) }));
    setToastMsg(`Permisos de ${ROLE_LABELS[selectedRole]} guardados`);
    setShowToast(true);
  };

  const handleReset = () => {
    setPermissions(prev => ({ ...prev, [selectedRole]: new Set(savedPerms[selectedRole]) }));
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Configuración"
      />

      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <IonContent className="setting-content">

        {/* ── Header ── */}
        <div className="setting-role-header">
          <div className="setting-title-row">
            <IonIcon icon={shieldCheckmarkOutline} className="setting-shield-icon" />
            <h2 className="setting-title">Permisos por Rol</h2>
          </div>
          <p className="setting-subtitle">
            Define qué módulos puede ver cada tipo de usuario.
          </p>

          <IonSegment
            value={selectedRole}
            onIonChange={e => setSelectedRole(e.detail.value as RoleCode)}
            className="setting-segment"
          >
            {(['admin', 'manager', 'employee'] as RoleCode[]).map(role => (
              <IonSegmentButton key={role} value={role}>
                <IonLabel>{ROLE_LABELS[role]}</IonLabel>
                <IonBadge color={ROLE_COLORS[role]} className="setting-badge">
                  {permissions[role].size}
                </IonBadge>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>

        {/* ── Module cards ── */}
        <div className="setting-modules">
          {MODULES.map(mod => {
            const activeCount = mod.features.filter(f => currentPerms.has(f.code)).length;
            return (
              <IonCard key={mod.name} className="setting-module-card">
                <IonCardHeader className="setting-module-header">
                  <IonCardTitle className="setting-module-title">{mod.name}</IonCardTitle>
                  <IonChip
                    color={
                      activeCount === mod.features.length ? 'success'
                      : activeCount === 0 ? 'medium'
                      : 'warning'
                    }
                    className="setting-module-chip"
                  >
                    {activeCount}/{mod.features.length}
                  </IonChip>
                </IonCardHeader>

                <IonCardContent className="setting-module-content">
                  {mod.features.map(feature => (
                    <IonItem key={feature.code} lines="none" className="setting-feature-item">
                      <IonIcon
                        icon={feature.icon}
                        slot="start"
                        className={`setting-feature-icon ${currentPerms.has(feature.code) ? 'icon-active' : 'icon-inactive'}`}
                      />
                      <IonLabel className="setting-feature-label">
                        {feature.label}
                        <p className="setting-feature-code">{feature.code}</p>
                      </IonLabel>
                      <IonToggle
                        slot="end"
                        checked={currentPerms.has(feature.code)}
                        onIonChange={() => toggle(feature.code)}
                        color="primary"
                        disabled={selectedRole === 'admin'}
                      />
                    </IonItem>
                  ))}
                </IonCardContent>
              </IonCard>
            );
          })}
        </div>

        {/* ── Admin lock notice ── */}
        {selectedRole === 'admin' && (
          <div className="setting-admin-notice">
            <IonIcon icon={shieldCheckmarkOutline} />
            <span>El rol Administrador siempre tiene acceso completo a todos los módulos.</span>
          </div>
        )}

        {/* ── Actions ── */}
        {selectedRole !== 'admin' && (
          <div className="setting-actions">
            <IonButton fill="outline" color="medium" onClick={handleReset} disabled={!hasChanges()}>
              Descartar
            </IonButton>
            <IonButton color="primary" onClick={handleSave} disabled={!hasChanges()}>
              Guardar cambios
            </IonButton>
          </div>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={2500}
          color="success"
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default Setting;
