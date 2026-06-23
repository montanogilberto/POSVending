// CreateAccount.tsx — 3-step wizard
import React, { useEffect, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonToast, IonRouterLink, IonButton, IonIcon, IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CreateAccount.css';
import { eye, eyeOff, chevronBack, chevronForward, checkmark } from 'ionicons/icons';
import { getAllCompanies, getBranchesByCompany, Company, CompanyBranch } from '../../api/companiesApi';

// ── Application profiles ────────────────────────────────────────────────────

interface AppProfile {
  id: string;
  label: string;
  description: string;
  emoji: string;
  modules: string[];
  color: string;
}

const APP_PROFILES: AppProfile[] = [
  {
    id: 'pos',
    label: 'Punto de Venta',
    description: 'Ventas, carrito, caja, inventario y recibos.',
    emoji: '🏪',
    modules: ['pos_cart', 'cash_register', 'inventory_products', 'receipts_printing', 'accounting_ledger'],
    color: '#2563eb',
  },
  {
    id: 'loans',
    label: 'Préstamos',
    description: 'Créditos, clientes, validación facial y contratos.',
    emoji: '💰',
    modules: ['clients', 'clientFaceRecognition', 'pushNotifications', 'accounting_ledger'],
    color: '#059669',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Elige exactamente los módulos que necesitas.',
    emoji: '🔧',
    modules: [],
    color: '#d97706',
  },
];

const ALL_MODULES = [
  { id: 'pos_cart',              label: 'Carrito / Punto de Venta' },
  { id: 'cash_register',         label: 'Caja Registradora' },
  { id: 'inventory_products',    label: 'Productos e Inventario' },
  { id: 'receipts_printing',     label: 'Recibos e Impresión' },
  { id: 'accounting_ledger',     label: 'Contabilidad y Finanzas' },
  { id: 'clients',               label: 'Gestión de Clientes' },
  { id: 'clientFaceRecognition', label: 'Reconocimiento Facial' },
  { id: 'pushNotifications',     label: 'Notificaciones Push' },
];

const ROLES = [
  { id: 'admin',    label: 'Administrador', emoji: '👑', color: '#dc2626', desc: 'Acceso total al sistema.' },
  { id: 'manager',  label: 'Gerente',       emoji: '🧑‍💼', color: '#d97706', desc: 'Gestión y reportes.' },
  { id: 'employee', label: 'Empleado',      emoji: '👷', color: '#2563eb', desc: 'Operaciones básicas.' },
];

const STEPS = ['Cuenta', 'Perfil', 'Acceso'];

// ── Component ───────────────────────────────────────────────────────────────

const CreateAccount: React.FC = () => {
  const history = useHistory();

  // Wizard
  const [step, setStep] = useState(0);

  // Step 0 — credentials
  const [email, setEmail]               = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBorderColor, setPasswordBorderColor] = useState('transparent');

  // Step 1 — profile
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [enabledModules, setEnabledModules]     = useState<string[]>([]);

  // Step 2 — role + company + branch
  const [userRole, setUserRole]             = useState<string>('employee');
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches]             = useState<CompanyBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | null>(null);
  const [branchScreen, setBranchScreen]     = useState(false);

  // Shared
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<string | null>(null);

  useEffect(() => {
    getAllCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const passwordStrength = (pwd: string) => {
    if (!pwd) return '';
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (strong.test(pwd)) return 'strong';
    if (pwd.length >= 8)  return 'medium';
    return 'weak';
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    const s = passwordStrength(v);
    setPasswordBorderColor(s === 'weak' ? 'red' : s === 'medium' ? 'orange' : s === 'strong' ? 'green' : 'transparent');
  };

  const handleEmailChange = (v: string) => {
    setEmail(v);
    setIsEmailValid(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v));
  };

  const step0Valid = isEmailValid && username && passwordStrength(password) !== '' && password === confirmPassword;

  const selectProfile = (profile: AppProfile) => {
    setSelectedProfile(profile.id);
    setEnabledModules(profile.id === 'custom' ? [] : [...profile.modules]);
  };

  const toggleModule = (id: string) => {
    setEnabledModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setSelectedBranch(null);
    setBranches([]);
    setBranchScreen(true);
    try {
      const data = await getBranchesByCompany(company.companyId);
      setBranches(data);
    } catch { setBranches([]); }
  };

  const goNext = () => {
    if (step === 0 && !step0Valid) { setMessage('Completa todos los campos correctamente.'); return; }
    if (step === 1 && !selectedProfile) { setMessage('Selecciona un perfil de aplicación.'); return; }
    setStep(s => s + 1);
  };

  const goBack = () => setStep(s => s - 1);

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: [{
            id: 0, email, username, password, action: 1,
            appProfile: selectedProfile,
            enabledModules,
            roleCode: userRole,
            companyId: selectedCompany?.companyId ?? 0,
            branchId:  selectedBranch?.branchId  ?? 0,
          }],
        }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || 'Error al crear la cuenta.'); return; }

      setMessage('¡Cuenta creada exitosamente!');
      setTimeout(() => history.push('/login'), 1200);
    } catch {
      setMessage('Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const StepBar = () => (
    <div className="ca-step-bar">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="ca-step-item">
            <div className={`ca-step-circle ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              {i < step ? <IonIcon icon={checkmark} /> : i + 1}
            </div>
            <span className={`ca-step-label ${i === step ? 'active' : ''}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`ca-step-line ${i < step ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep0 = () => (
    <div className="ca-step-body">
      <h2 className="ca-step-title">Crea tu cuenta</h2>
      <p className="ca-step-desc">Ingresa tus credenciales de acceso.</p>

      <IonInput
        type="text" value={email} placeholder="Email"
        onIonInput={(e) => handleEmailChange(e.detail.value || '')}
        className={`ca-input ${email && !isEmailValid ? 'ca-input-error' : ''}`}
      />
      {email && !isEmailValid && <p className="ca-field-error">Email inválido</p>}

      <IonInput
        type="text" value={username} placeholder="Nombre de usuario"
        onIonInput={(e) => setUsername(e.detail.value || '')}
        className="ca-input"
      />

      <div className="ca-password-wrap">
        <IonInput
          type={showPassword ? 'text' : 'password'} value={password} placeholder="Contraseña"
          onIonInput={(e) => handlePasswordChange(e.detail.value || '')}
          className="ca-input"
          style={{ borderBottom: `2px solid ${passwordBorderColor}` }}
        />
        <IonIcon icon={showPassword ? eye : eyeOff} className="ca-eye" onClick={() => setShowPassword(v => !v)} />
      </div>
      <p className="ca-hint">Mínimo 8 caracteres, mayúscula, número y símbolo especial.</p>

      <div className="ca-password-wrap">
        <IonInput
          type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} placeholder="Confirmar contraseña"
          onIonInput={(e) => setConfirmPassword(e.detail.value || '')}
          className="ca-input"
          style={{ borderColor: confirmPassword && password !== confirmPassword ? 'red' : '' }}
        />
        <IonIcon icon={showConfirmPassword ? eye : eyeOff} className="ca-eye" onClick={() => setShowConfirmPassword(v => !v)} />
      </div>
      {confirmPassword && password !== confirmPassword && <p className="ca-field-error">Las contraseñas no coinciden</p>}
    </div>
  );

  const renderStep1 = () => (
    <div className="ca-step-body">
      <h2 className="ca-step-title">Perfil de aplicación</h2>
      <p className="ca-step-desc">¿Qué tipo de sistema necesitas? Tu elección activa los módulos correspondientes.</p>

      <div className="ca-profile-grid">
        {APP_PROFILES.map((p) => (
          <button
            key={p.id}
            className={`ca-profile-card ${selectedProfile === p.id ? 'selected' : ''}`}
            style={{ '--profile-color': p.color } as any}
            onClick={() => selectProfile(p)}
          >
            <span className="ca-profile-emoji">{p.emoji}</span>
            <span className="ca-profile-label">{p.label}</span>
            <span className="ca-profile-desc">{p.description}</span>
            {selectedProfile === p.id && <span className="ca-profile-check">✓</span>}
          </button>
        ))}
      </div>

      {selectedProfile && selectedProfile !== 'custom' && (
        <div className="ca-modules-summary">
          <p className="ca-modules-title">Módulos que se activarán:</p>
          <div className="ca-modules-tags">
            {enabledModules.map(id => (
              <span key={id} className="ca-module-tag">
                {ALL_MODULES.find(m => m.id === id)?.label ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedProfile === 'custom' && (
        <div className="ca-modules-custom">
          <div className="ca-modules-custom-header">
            <p className="ca-modules-title">Selecciona los módulos:</p>
            <label className="ca-module-checkbox ca-select-all">
              <input
                type="checkbox"
                checked={enabledModules.length === ALL_MODULES.length}
                ref={el => { if (el) el.indeterminate = enabledModules.length > 0 && enabledModules.length < ALL_MODULES.length; }}
                onChange={(e) => setEnabledModules(e.target.checked ? ALL_MODULES.map(m => m.id) : [])}
              />
              <span style={{ fontWeight: 700 }}>Seleccionar todos</span>
            </label>
          </div>
          <div className="ca-modules-divider" />
          {ALL_MODULES.map(m => (
            <label key={m.id} className="ca-module-checkbox">
              <input
                type="checkbox"
                checked={enabledModules.includes(m.id)}
                onChange={() => toggleModule(m.id)}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="ca-step-body">
      <h2 className="ca-step-title">Acceso y empresa</h2>
      <p className="ca-step-desc">Define el rol y vincula la empresa del usuario.</p>

      {/* Role picker */}
      <p className="ca-modules-title" style={{ marginBottom: 8 }}>Rol de acceso:</p>
      <div className="ca-profile-grid" style={{ marginBottom: 16 }}>
        {ROLES.map(r => (
          <button
            key={r.id}
            className={`ca-profile-card ${userRole === r.id ? 'selected' : ''}`}
            style={{ '--profile-color': r.color } as any}
            onClick={() => setUserRole(r.id)}
          >
            <span className="ca-profile-emoji">{r.emoji}</span>
            <span className="ca-profile-label">{r.label}</span>
            <span className="ca-profile-desc">{r.desc}</span>
            {userRole === r.id && <span className="ca-profile-check">✓</span>}
          </button>
        ))}
      </div>

      {/* Company / branch selector */}
      {!branchScreen ? (
        <>
          <p className="ca-modules-title" style={{ marginBottom: 8 }}>Empresa:</p>
          <div className="ca-company-list">
            {companies.length === 0 ? (
              <p style={{ color: '#9ca3af', margin: 0 }}>No hay empresas disponibles.</p>
            ) : companies.map(c => (
              <button
                key={c.companyId}
                className={`ca-company-item ${selectedCompany?.companyId === c.companyId ? 'selected' : ''}`}
                onClick={() => handleSelectCompany(c)}
              >
                <span>🏢</span>
                <span className="ca-company-name">{c.name}</span>
                <IonIcon icon={chevronForward} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="ca-branch-header">
            <button className="ca-btn-back" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setBranchScreen(false)}>
              <IonIcon icon={chevronBack} /> {selectedCompany?.name}
            </button>
          </div>
          <p className="ca-modules-title" style={{ margin: '12px 0 8px' }}>Sucursal (opcional):</p>
          <div className="ca-company-list">
            {branches.length === 0 ? (
              <p style={{ color: '#9ca3af', margin: 0 }}>No hay sucursales. Se vinculará solo la empresa.</p>
            ) : branches.map(b => (
              <button
                key={b.branchId}
                className={`ca-company-item ${selectedBranch?.branchId === b.branchId ? 'selected' : ''}`}
                onClick={() => setSelectedBranch(prev => prev?.branchId === b.branchId ? null : b)}
              >
                <span>📍</span>
                <span className="ca-company-name">{b.name}</span>
                {selectedBranch?.branchId === b.branchId && <IonIcon icon={checkmark} style={{ marginLeft: 'auto', color: '#10b981' }} />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Summary */}
      <div className="ca-summary-box" style={{ marginTop: 16 }}>
        <p><strong>Perfil:</strong> {APP_PROFILES.find(p => p.id === selectedProfile)?.label}</p>
        <p><strong>Módulos activos:</strong> {enabledModules.length}</p>
        <p><strong>Rol:</strong> {ROLES.find(r => r.id === userRole)?.label}</p>
        <p><strong>Empresa:</strong> {selectedCompany?.name ?? 'Sin seleccionar'}</p>
        {selectedBranch && <p><strong>Sucursal:</strong> {selectedBranch.name}</p>}
      </div>

      <IonButton expand="block" onClick={handleCreateAccount} disabled={loading} className="ca-submit-btn">
        {loading ? <IonSpinner name="crescent" /> : 'CREAR CUENTA'}
      </IonButton>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">
              <IonToast
                isOpen={!!message}
                message={message || ''}
                duration={3000}
                onDidDismiss={() => setMessage(null)}
                color={message?.includes('exitosamente') ? 'success' : 'danger'}
                position="top"
              />

              <StepBar />

              {step === 0 && renderStep0()}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}

              {/* Footer nav */}
              <div className="ca-footer">
                {step > 0 && (
                  <button className="ca-btn-back" onClick={goBack}>
                    <IonIcon icon={chevronBack} /> Atrás
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {step < 2 && (
                  <button className="ca-btn-next" onClick={goNext}>
                    Siguiente <IonIcon icon={chevronForward} />
                  </button>
                )}
              </div>

              {step === 0 && (
                <div className="ion-text-center" style={{ marginTop: 16 }}>
                  <IonRouterLink href="/login">Volver al inicio de sesión</IonRouterLink>
                </div>
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default CreateAccount;
