// CreateAccount.tsx — 3-step wizard (styled to match client wizard)
import React, { useEffect, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonFooter,
  IonToast, IonRouterLink, IonIcon, IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './CreateAccount.css';
import {
  eye, eyeOff, chevronBack, chevronForward, checkmark,
  personOutline, businessOutline, lockClosedOutline,
  buildOutline, walletOutline, cartOutline,
} from 'ionicons/icons';
import { getAllCompanies, getBranchesByCompany, Company, CompanyBranch } from '../../api/companiesApi';
import { RoleCode, ROLE_GROUPS } from '../../config/rolePermissions';
import { createUser, updateUser } from '../../api/usersApi';

// ── Application profiles ────────────────────────────────────────────────────

interface AppProfile {
  id: string;
  label: string;
  description: string;
  icon: string;
  modules: string[];
  color: string;
  bgColor: string;
}

const APP_PROFILES: AppProfile[] = [
  {
    id: 'pos',
    label: 'Punto de Venta',
    description: 'Ventas, carrito, caja, inventario y recompensas.',
    icon: '🏪',
    modules: ['pos_cart', 'cash_register', 'inventory_products', 'receipts_printing', 'accounting_ledger', 'rewards'],
    color: '#2563eb',
    bgColor: '#EFF6FF',
  },
  {
    id: 'loans',
    label: 'Préstamos P2P',
    description: 'Créditos, chat, validación facial y pagos Stripe.',
    icon: '💰',
    modules: ['clients', 'clientFaceRecognition', 'pushNotifications', 'loanChat', 'accounting_ledger'],
    color: '#7c3aed',
    bgColor: '#F5F3FF',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Elige exactamente los módulos que necesitas.',
    icon: '🔧',
    modules: [],
    color: '#d97706',
    bgColor: '#FFFBEB',
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
  { id: 'rewards',               label: 'Puntos de Recompensa' },
  { id: 'loanChat',              label: 'Chat de Préstamos' },
];

const ROLE_COLOR: Record<string, string> = {
  admin: '#dc2626', manager: '#d97706', employee: '#2563eb',
  borrower: '#059669', lender: '#7c3aed', business: '#0369a1', viewer: '#6b7280',
};

const STEPS = ['Cuenta', 'Perfil', 'Acceso'];

// ── Component ───────────────────────────────────────────────────────────────

const CreateAccount: React.FC = () => {
  const history = useHistory();

  const [step, setStep] = useState(0);

  // Step 0 — credentials
  const [email, setEmail]               = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 — profile
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [enabledModules, setEnabledModules]     = useState<string[]>([]);

  // Step 2 — role + company + branch
  const [userRole, setUserRole]             = useState<RoleCode>('employee');
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches]             = useState<CompanyBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | null>(null);
  const [branchScreen, setBranchScreen]     = useState(false);

  // Persisted user ID from step 0 save — used for step 1 & 2 updates
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  const [stepSaved, setStepSaved] = useState<boolean[]>([false, false, false]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getAllCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const pwdStrength = (pwd: string) => {
    if (!pwd) return '';
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd)) return 'strong';
    if (pwd.length >= 8) return 'medium';
    return 'weak';
  };

  const pwdStrengthColor = (s: string) =>
    s === 'strong' ? '#059669' : s === 'medium' ? '#d97706' : '#ef4444';

  const pwdStrengthLabel = (s: string) =>
    s === 'strong' ? 'Segura' : s === 'medium' ? 'Media' : s === 'weak' ? 'Débil' : '';

  const handleEmailChange = (v: string) => {
    setEmail(v);
    setIsEmailValid(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v));
  };

  const strength = pwdStrength(password);

  const step0Valid = isEmailValid && username.trim() && strength !== '' && password === confirmPassword;

  const selectProfile = (profile: AppProfile) => {
    setSelectedProfile(profile.id);
    setEnabledModules(profile.id === 'custom' ? [] : [...profile.modules]);
    const defaults: Record<string, RoleCode> = { pos: 'employee', loans: 'borrower', custom: 'employee' };
    setUserRole(defaults[profile.id] ?? 'employee');
  };

  const toggleModule = (id: string) =>
    setEnabledModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setSelectedBranch(null);
    setBranches([]);
    setBranchScreen(true);
    try { setBranches(await getBranchesByCompany(company.companyId)); }
    catch { setBranches([]); }
  };

  const markSaved = (s: number) =>
    setStepSaved(prev => { const n = [...prev]; n[s] = true; return n; });

  // Step 0 → create user with credentials, get back userId
  const handleStep0Next = async () => {
    if (!step0Valid) { setMessage('Completa todos los campos correctamente.'); return; }
    setLoading(true);
    try {
      const data = await createUser({ email, username, password });
      // SP may return userId under different keys — try all common shapes
      const uid = data.userId ?? data.id ?? (data as any).users?.[0]?.userId;
      if (uid) setCreatedUserId(Number(uid));
      markSaved(0);
      setStep(1);
    } catch (err) {
      setMessage((err as Error).message ?? 'Error al guardar las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 → update user with app profile + enabled modules
  const handleStep1Next = async () => {
    if (!selectedProfile) { setMessage('Selecciona un perfil de aplicación.'); return; }
    setLoading(true);
    try {
      if (createdUserId) {
        await updateUser(createdUserId, { appProfile: selectedProfile, enabledModules });
      }
      markSaved(1);
      setStep(2);
    } catch (err) {
      setMessage((err as Error).message ?? 'Error al guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → update user with role + company + branch → finalise
  const handleStep2Submit = async () => {
    setLoading(true);
    try {
      if (createdUserId) {
        await updateUser(createdUserId, {
          roleCode:  userRole,
          companyId: selectedCompany?.companyId ?? 0,
          branchId:  selectedBranch?.branchId  ?? 0,
        });
      }
      markSaved(2);
      setMessage('¡Cuenta creada exitosamente!');
      setTimeout(() => history.push('/login'), 1200);
    } catch (err) {
      setMessage((err as Error).message ?? 'Error al finalizar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (step === 0) { handleStep0Next(); return; }
    if (step === 1) { handleStep1Next(); return; }
  };

  const goBack = () => {
    if (branchScreen) { setBranchScreen(false); return; }
    setStep(s => s - 1);
  };

  // ── Step bar ──────────────────────────────────────────────────────────────

  const StepBar = () => (
    <div className="ca-step-bar">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="ca-step-item">
            <div className={`ca-step-circle${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
              {i < step ? <IonIcon icon={checkmark} /> : i + 1}
            </div>
            <span className={`ca-step-label${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>{s}</span>
            {stepSaved[i] && i !== step && (
              <span className="ca-step-saved-badge">guardado ✓</span>
            )}
          </div>
          {i < STEPS.length - 1 && <div className={`ca-step-connector${i < step ? ' done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Step 0: Credentials ───────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="ca-step-body">
      <div className="ca-step-header">
        <div className="ca-step-icon-wrap" style={{ background: '#EFF6FF' }}>
          <IonIcon icon={personOutline} style={{ fontSize: 36, color: '#2563eb' }} />
        </div>
        <h2 className="ca-step-title">Crea tu cuenta</h2>
        <p className="ca-step-desc">Ingresa tus credenciales de acceso.</p>
      </div>

      <div className="ca-form-fields">
        <IonInput
          fill="outline" label="Email" labelPlacement="floating"
          type="email" value={email}
          onIonInput={e => handleEmailChange(e.detail.value || '')}
          className={email && !isEmailValid ? 'ion-invalid ion-touched' : ''}
          errorText="Email inválido"
        />

        <IonInput
          fill="outline" label="Nombre de usuario" labelPlacement="floating"
          type="text" value={username}
          onIonInput={e => setUsername(e.detail.value || '')}
        />

        <div className="ca-password-wrap">
          <IonInput
            fill="outline" label="Contraseña" labelPlacement="floating"
            type={showPassword ? 'text' : 'password'} value={password}
            onIonInput={e => setPassword(e.detail.value || '')}
          />
          <button type="button" className="ca-eye-btn" onClick={() => setShowPassword(v => !v)}>
            <IonIcon icon={showPassword ? eye : eyeOff} />
          </button>
        </div>

        {strength && (
          <div className="ca-strength-bar-wrap">
            <div className="ca-strength-track">
              <div
                className="ca-strength-fill"
                style={{
                  width: strength === 'strong' ? '100%' : strength === 'medium' ? '60%' : '25%',
                  background: pwdStrengthColor(strength),
                }}
              />
            </div>
            <span className="ca-strength-label" style={{ color: pwdStrengthColor(strength) }}>
              {pwdStrengthLabel(strength)}
            </span>
          </div>
        )}
        <p className="ca-hint">Mínimo 8 caracteres, mayúscula, número y símbolo.</p>

        <div className="ca-password-wrap">
          <IonInput
            fill="outline" label="Confirmar contraseña" labelPlacement="floating"
            type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
            onIonInput={e => setConfirmPassword(e.detail.value || '')}
            className={confirmPassword && password !== confirmPassword ? 'ion-invalid ion-touched' : ''}
            errorText="Las contraseñas no coinciden"
          />
          <button type="button" className="ca-eye-btn" onClick={() => setShowConfirmPassword(v => !v)}>
            <IonIcon icon={showConfirmPassword ? eye : eyeOff} />
          </button>
        </div>
      </div>

      <div className="ion-text-center" style={{ marginTop: 20 }}>
        <IonRouterLink href="/login" className="ca-login-link">
          ¿Ya tienes cuenta? Inicia sesión
        </IonRouterLink>
      </div>
    </div>
  );

  // ── Step 1: App profile ───────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="ca-step-body">
      <div className="ca-step-header">
        <div className="ca-step-icon-wrap" style={{ background: '#F5F3FF' }}>
          <IonIcon icon={buildOutline} style={{ fontSize: 36, color: '#7c3aed' }} />
        </div>
        <h2 className="ca-step-title">Perfil de aplicación</h2>
        <p className="ca-step-desc">¿Qué tipo de sistema necesitas?</p>
      </div>

      {/* Profile selector — same card pattern as wizard-doc-type-btn */}
      <div className="ca-profile-list">
        {APP_PROFILES.map(p => {
          const selected = selectedProfile === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`ca-profile-btn${selected ? ' selected' : ''}`}
              style={selected ? { borderColor: p.color, background: p.bgColor } : undefined}
              onClick={() => selectProfile(p)}
            >
              <div className="ca-profile-icon-wrap" style={selected ? { background: p.bgColor, color: p.color } : undefined}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
              </div>
              <div className="ca-profile-text">
                <span className="ca-profile-name" style={selected ? { color: p.color } : undefined}>{p.label}</span>
                <span className="ca-profile-desc">{p.description}</span>
              </div>
              <div className={`ca-radio-dot${selected ? ' selected' : ''}`}
                style={selected ? { borderColor: p.color, background: p.color } : undefined} />
            </button>
          );
        })}
      </div>

      {/* Active modules summary */}
      {selectedProfile && selectedProfile !== 'custom' && (
        <div className="ca-modules-summary">
          <p className="ca-modules-title">Módulos incluidos:</p>
          <div className="ca-modules-tags">
            {enabledModules.map(id => (
              <span key={id} className="ca-module-tag">
                {ALL_MODULES.find(m => m.id === id)?.label ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Custom module picker — checkbox cards */}
      {selectedProfile === 'custom' && (
        <div className="ca-modules-custom">
          <div className="ca-modules-custom-header">
            <p className="ca-modules-title">Selecciona los módulos:</p>
            <label className="ca-select-all-label">
              <input
                type="checkbox"
                checked={enabledModules.length === ALL_MODULES.length}
                ref={el => { if (el) el.indeterminate = enabledModules.length > 0 && enabledModules.length < ALL_MODULES.length; }}
                onChange={e => setEnabledModules(e.target.checked ? ALL_MODULES.map(m => m.id) : [])}
              />
              <span>Todos</span>
            </label>
          </div>
          <div className="ca-module-list">
            {ALL_MODULES.map(m => {
              const checked = enabledModules.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`ca-module-btn${checked ? ' checked' : ''}`}
                  onClick={() => toggleModule(m.id)}
                >
                  <div className={`ca-checkbox-box${checked ? ' checked' : ''}`}>
                    {checked && <IonIcon icon={checkmark} />}
                  </div>
                  <span className="ca-module-label">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: Role + company ────────────────────────────────────────────────

  const renderStep2 = () => {
    const roleGroup = ROLE_GROUPS[(selectedProfile as keyof typeof ROLE_GROUPS)] ?? ROLE_GROUPS.pos;
    return (
      <div className="ca-step-body">
        <div className="ca-step-header">
          <div className="ca-step-icon-wrap" style={{ background: '#F0FDF4' }}>
            <IonIcon icon={lockClosedOutline} style={{ fontSize: 36, color: '#059669' }} />
          </div>
          <h2 className="ca-step-title">Acceso y empresa</h2>
          <p className="ca-step-desc">Define el rol y vincula la empresa.</p>
        </div>

        {/* Role selector */}
        <p className="ca-section-label">Rol de acceso:</p>
        <div className="ca-profile-list" style={{ marginBottom: 20 }}>
          {roleGroup.map(r => {
            const selected = userRole === r.id;
            const color = ROLE_COLOR[r.id] ?? '#6b7280';
            return (
              <button
                key={r.id}
                type="button"
                className={`ca-profile-btn${selected ? ' selected' : ''}`}
                style={selected ? { borderColor: color, background: `${color}0f` } : undefined}
                onClick={() => setUserRole(r.id)}
              >
                <div className="ca-profile-icon-wrap" style={selected ? { background: `${color}20`, color } : undefined}>
                  <span style={{ fontSize: 20 }}>{r.emoji}</span>
                </div>
                <div className="ca-profile-text">
                  <span className="ca-profile-name" style={selected ? { color } : undefined}>{r.label}</span>
                  <span className="ca-profile-desc">{r.desc}</span>
                </div>
                <div className={`ca-radio-dot${selected ? ' selected' : ''}`}
                  style={selected ? { borderColor: color, background: color } : undefined} />
              </button>
            );
          })}
        </div>

        {/* Company / branch */}
        <p className="ca-section-label">
          {branchScreen ? (
            <button type="button" className="ca-back-inline" onClick={() => setBranchScreen(false)}>
              <IonIcon icon={chevronBack} /> {selectedCompany?.name}
            </button>
          ) : 'Empresa:'}
        </p>

        <div className="ca-company-list">
          {!branchScreen ? (
            companies.length === 0
              ? <p className="ca-empty-msg">No hay empresas disponibles.</p>
              : companies.map(c => (
                <button
                  key={c.companyId}
                  type="button"
                  className={`ca-company-btn${selectedCompany?.companyId === c.companyId ? ' selected' : ''}`}
                  onClick={() => handleSelectCompany(c)}
                >
                  <div className="ca-company-icon">🏢</div>
                  <span className="ca-company-name">{c.name}</span>
                  <IonIcon icon={chevronForward} className="ca-company-arrow" />
                </button>
              ))
          ) : (
            branches.length === 0
              ? <p className="ca-empty-msg">Sin sucursales — se vinculará solo la empresa.</p>
              : branches.map(b => (
                <button
                  key={b.branchId}
                  type="button"
                  className={`ca-company-btn${selectedBranch?.branchId === b.branchId ? ' selected' : ''}`}
                  onClick={() => setSelectedBranch(prev => prev?.branchId === b.branchId ? null : b)}
                >
                  <div className="ca-company-icon">📍</div>
                  <span className="ca-company-name">{b.name}</span>
                  {selectedBranch?.branchId === b.branchId
                    ? <IonIcon icon={checkmark} className="ca-company-check" />
                    : <IonIcon icon={chevronForward} className="ca-company-arrow" />}
                </button>
              ))
          )}
        </div>

        {/* Summary */}
        <div className="ca-summary-box">
          <div className="ca-summary-row"><span>Perfil</span><strong>{APP_PROFILES.find(p => p.id === selectedProfile)?.label}</strong></div>
          <div className="ca-summary-row"><span>Módulos activos</span><strong>{enabledModules.length}</strong></div>
          <div className="ca-summary-row"><span>Rol</span><strong>{ROLE_GROUPS.custom.find(r => r.id === userRole)?.label}</strong></div>
          <div className="ca-summary-row"><span>Empresa</span><strong>{selectedCompany?.name ?? '—'}</strong></div>
          {selectedBranch && <div className="ca-summary-row"><span>Sucursal</span><strong>{selectedBranch.name}</strong></div>}
        </div>

        {/* Submit */}
        <button
          type="button"
          className="ca-submit-btn"
          onClick={handleStep2Submit}
          disabled={loading}
        >
          {loading
            ? <IonSpinner name="crescent" className="ca-submit-spinner" />
            : <><IonIcon icon={checkmark} /> Crear cuenta</>}
        </button>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonContent className="ca-content">
        <IonToast
          isOpen={!!message}
          message={message || ''}
          duration={3000}
          onDidDismiss={() => setMessage(null)}
          color={message?.includes('exitosamente') ? 'success' : 'danger'}
          position="top"
        />

        <div className="ca-page-wrap">
          <StepBar />
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          <div style={{ height: 100 }} />
        </div>
      </IonContent>

      <IonFooter className="ca-footer">
        <div className={`ca-footer-inner${step === 0 ? ' ca-footer-inner--single' : ''}`}>
          {step > 0 && (
            <button type="button" className="ca-btn-back" onClick={goBack}>
              <IonIcon icon={chevronBack} />
              <span>Atrás</span>
            </button>
          )}
          {step < 2 && (
            <button type="button" className="ca-btn-next" onClick={goNext}>
              Siguiente <IonIcon icon={chevronForward} />
            </button>
          )}
        </div>
      </IonFooter>
    </IonPage>
  );
};

export default CreateAccount;
