import React, { useCallback, useEffect, useState } from 'react';
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
  IonSpinner,
  useIonViewWillEnter,
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
  cogOutline,
  fingerPrintOutline,
  gameControllerOutline,
} from 'ionicons/icons';
import Header from '../../components/layout/Header';
import AlertPopover from '../../components/popovers/AlertPopover';
import MailPopover from '../../components/popovers/MailPopover';
import { usePopovers } from '../../hooks/usePopovers';
import { RoleCode, UiFeature, ROLE_UI, loadRoleCatalog, applyRoleUiFeatures } from '../../config/rolePermissions';
import { updateRoleUiFeatures, fetchUiFeatures, ApiUiFeature } from '../../api/rolesApi';
import { useToast } from '../../hooks/useToast';
import {
  isBiometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateBiometric,
} from '../../utils/biometricAuth';
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

/** Fallback only: the list now comes from the registry (GET /ui_features), where
 * every factory module registers itself. Used when that request fails or is empty. */
const FALLBACK_MODULES: ModuleDef[] = [
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
      { code: 'manufacturing',     label: 'Manufactura',    icon: cogOutline },
      { code: 'voiceCalls', label: 'Llamadas de voz', icon: callOutline },
    ],
  },
  {
    name: 'Administración',
    features: [
      { code: 'users',    label: 'Usuarios',      icon: personOutline },
      { code: 'companyPaymentAccounts', label: 'Cuentas de cobro', icon: cartOutline },
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
      { code: 'iot', label: 'Tablero IOT / LED Status / Water Tanks', icon: bulbOutline },
    ],
  },
];

/** Registry icon names → ionicons. Same set the factory's frontend prompt offers. */
const ICONS: Record<string, string> = {
  cashOutline, qrCodeOutline, waterOutline, peopleOutline, cubeOutline, gridOutline,
  notificationsOutline, mailOutline, personOutline, barChartOutline, trendingDownOutline,
  bulbOutline, settingsOutline, cartOutline, shieldCheckmarkOutline, cogOutline,
  fingerPrintOutline, gameControllerOutline,
};

const SECTION_ORDER = ['POS', 'Catálogo', 'Mensajes', 'Administración', 'IOT', 'Entretenimiento'];

/** Group registry rows into /setting cards; rows without a section are not configurable here. */
function modulesFromRegistry(rows: ApiUiFeature[]): ModuleDef[] {
  const bySection = new Map<string, FeatureDef[]>();
  for (const row of rows) {
    if (!row.section) continue;
    const list = bySection.get(row.section) ?? [];
    list.push({
      code: row.featureCode as UiFeature,
      label: row.label || row.displayName || row.featureCode,
      icon: ICONS[row.icon ?? ''] ?? settingsOutline,
    });
    bySection.set(row.section, list);
  }
  const rank = (name: string) => {
    const i = SECTION_ORDER.indexOf(name);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return Array.from(bySection.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([name, features]) => ({ name, features }));
}

const ROLE_LABELS: Record<RoleCode, string> = {
  admin:    'Administrador',
  manager:  'Gerente',
  employee: 'Empleado',
  borrower: 'Prestatario',
  lender:   'Prestamista',
  business: 'Negocio',
  viewer:   'Lector',
  pos:      'Cliente',
};

const ROLE_COLORS: Record<RoleCode, string> = {
  admin:    'danger',
  manager:  'warning',
  employee: 'primary',
  borrower: 'success',
  lender:   'tertiary',
  business: 'secondary',
  viewer:   'medium',
  pos:      'secondary',
};

// ── Types ───────────────────────────────────────────────────────────────────

type PermissionMap = Record<RoleCode, Set<UiFeature>>;

function buildInitialPermissions(): PermissionMap {
  return {
    admin:    new Set(ROLE_UI.admin    as UiFeature[]),
    manager:  new Set(ROLE_UI.manager  as UiFeature[]),
    employee: new Set(ROLE_UI.employee as UiFeature[]),
    borrower: new Set(ROLE_UI.borrower as UiFeature[]),
    lender:   new Set(ROLE_UI.lender   as UiFeature[]),
    business: new Set(ROLE_UI.business as UiFeature[]),
    viewer:   new Set(ROLE_UI.viewer   as UiFeature[]),
    pos:      new Set(ROLE_UI.pos      as UiFeature[]),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

const Setting: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleCode>('admin');
  const [permissions, setPermissions]   = useState<PermissionMap>(buildInitialPermissions);
  const [savedPerms, setSavedPerms]     = useState<PermissionMap>(buildInitialPermissions);
  const [loading, setLoading]           = useState(true);
  const [modules, setModules]           = useState<ModuleDef[]>(FALLBACK_MODULES);
  const [saving, setSaving]             = useState(false);
  const { showToast, toastProps }       = useToast({ defaultColor: 'success', duration: 2500 });

  // ROLE_UI is overwritten by GET /roles; read it fresh every time the page is
  // entered (Ionic keeps it mounted) instead of the snapshot taken at mount.
  const load = useCallback(async () => {
    setLoading(true);
    const [, registry] = await Promise.all([
      loadRoleCatalog(),
      fetchUiFeatures().catch(err => {
        console.warn('[Setting] GET /ui_features failed, using fallback list:', err);
        return [] as ApiUiFeature[];
      }),
    ]);
    const fromRegistry = modulesFromRegistry(registry);
    setModules(fromRegistry.length ? fromRegistry : FALLBACK_MODULES);
    const fresh = buildInitialPermissions();
    setPermissions(fresh);
    setSavedPerms(buildInitialPermissions());
    setLoading(false);
  }, []);
  useIonViewWillEnter(() => { load(); });

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      const [available, enabled] = await Promise.all([
        isBiometricAvailable(),
        isBiometricLockEnabled(),
      ]);
      setBiometricSupported(available);
      setBiometricEnabledState(available && enabled);
    })();
  }, []);

  const handleBiometricToggle = async (nextValue: boolean) => {
    if (nextValue) {
      const confirmed = await authenticateBiometric('Confirma tu identidad para activar el bloqueo biométrico');
      if (!confirmed) return;
    }
    await setBiometricLockEnabled(nextValue);
    setBiometricEnabledState(nextValue);
    showToast(nextValue ? 'Bloqueo biométrico activado' : 'Bloqueo biométrico desactivado');
  };

  const pops = usePopovers();

  const currentPerms = permissions[selectedRole];

  const toggle = (feature: UiFeature, on: boolean) => {
    setPermissions(prev => {
      const next = new Set(prev[selectedRole]);
      if (on) next.add(feature); else next.delete(feature);
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
    const role = selectedRole;
    setSaving(true);
    try {
      const granted = await updateRoleUiFeatures(role, Array.from(permissions[role]));
      // Apply what the backend actually stored, and push it to the menu/routes now.
      applyRoleUiFeatures(role, granted);
      const stored = new Set(granted as UiFeature[]);
      setPermissions(prev => ({ ...prev, [role]: new Set(stored) }));
      setSavedPerms(prev => ({ ...prev, [role]: stored }));
      showToast(`Permisos de ${ROLE_LABELS[role]} guardados (aplica a todas las compañías)`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudieron guardar los permisos', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions(prev => ({ ...prev, [selectedRole]: new Set(savedPerms[selectedRole]) }));
  };

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Configuración" />

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent className="setting-content">

        {/* ── Security ── */}
        <IonCard className="setting-module-card">
          <IonCardHeader className="setting-module-header">
            <IonCardTitle className="setting-module-title">Seguridad</IonCardTitle>
          </IonCardHeader>
          <IonCardContent className="setting-module-content">
            <IonItem lines="none" className="setting-feature-item">
              <IonIcon icon={fingerPrintOutline} slot="start" className={`setting-feature-icon ${biometricEnabled ? 'icon-active' : 'icon-inactive'}`} />
              <IonLabel className="setting-feature-label">
                Bloqueo biométrico
                <p className="setting-feature-code">
                  {biometricSupported
                    ? 'Solicita huella digital o Face ID al abrir la app'
                    : 'No disponible en este dispositivo'}
                </p>
              </IonLabel>
              <IonToggle
                slot="end"
                checked={biometricEnabled}
                disabled={!biometricSupported}
                onIonChange={e => handleBiometricToggle(e.detail.checked)}
                color="primary"
              />
            </IonItem>
          </IonCardContent>
        </IonCard>

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
        {loading ? (
          <div className="setting-loading">
            <IonSpinner name="crescent" />
            <p>Cargando permisos…</p>
          </div>
        ) : (
        <div className="setting-modules">
          {modules.map(mod => {
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
                        onIonChange={e => toggle(feature.code, e.detail.checked)}
                        color="primary"
                        disabled={selectedRole === 'admin' || saving}
                      />
                    </IonItem>
                  ))}
                </IonCardContent>
              </IonCard>
            );
          })}
        </div>
        )}

        {/* ── Admin lock notice ── */}
        {selectedRole === 'admin' && (
          <div className="setting-admin-notice">
            <IonIcon icon={shieldCheckmarkOutline} />
            <span>El rol Administrador siempre tiene acceso completo a todos los módulos.</span>
          </div>
        )}

        {/* ── Actions ── */}
        {selectedRole !== 'admin' && !loading && (
          <div className="setting-actions">
            <IonButton fill="outline" color="medium" onClick={handleReset} disabled={!hasChanges() || saving}>
              Descartar
            </IonButton>
            <IonButton color="primary" onClick={handleSave} disabled={!hasChanges() || saving}>
              {saving ? <IonSpinner name="dots" /> : 'Guardar cambios'}
            </IonButton>
          </div>
        )}

        <IonToast {...toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default Setting;
