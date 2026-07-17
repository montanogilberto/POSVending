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
import { createUser, updateUser, sendVerificationCode, verifyCode, checkContact, checkUsername, ContactCheckResult } from '../../api/usersApi';
import { createOrUpdateClient, getAllClients, ClientType } from '../../api/clientsApi';

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

// Client type is a real choice the client makes at signup (previously
// hardcoded to 'borrower' for every phone-based registration) — mirrors
// the selector in ClientsPage.tsx's client wizard.
const CLIENT_TYPES: { id: ClientType; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'borrower', icon: '📋', label: 'Acreditado',            desc: 'Solicita préstamo',          color: '#2563eb' },
  { id: 'lender',   icon: '💼', label: 'Prestamista',           desc: 'Financia préstamos',         color: '#15803d' },
  { id: 'both',     icon: '🔄', label: 'Ambos',                 desc: 'Acreditado y prestamista',   color: '#7c3aed' },
  { id: 'lawyer',   icon: '⚖️', label: 'Licenciado en derecho', desc: 'Asesoría legal',             color: '#b45309' },
];

const ROLE_COLOR: Record<string, string> = {
  admin: '#dc2626', manager: '#d97706', employee: '#2563eb',
  borrower: '#059669', lender: '#7c3aed', business: '#0369a1', viewer: '#6b7280',
};

const STEPS = ['Cuenta', 'Perfil', 'Verificar', 'Acceso'];

// ── Component ───────────────────────────────────────────────────────────────

const CreateAccount: React.FC = () => {
  const history = useHistory();

  const [step, setStep] = useState(0);

  // Step 0 — credentials
  // Single smart contact field — user types email OR phone; we detect which
  const [contact, setContact]           = useState('');
  const [contactType, setContactType]   = useState<'email' | 'phone' | 'unknown'>('unknown');

  // Contact lookup — debounced check against existing clients/users
  const [contactCheck, setContactCheck] = useState<'idle' | 'checking' | 'found' | 'new'>('idle');
  const [existingRecord, setExistingRecord] = useState<ContactCheckResult | null>(null);
  const lookupTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Known client (matched by phone) missing email on file — optional field to
  // complete their client record while they claim their account.
  const [completeEmail, setCompleteEmail] = useState('');

  // Client type — only asked for brand-new phone-based registrations (a
  // dbo.clients row is only created in that case). Was previously hardcoded
  // to 'borrower'; the client now picks it themselves.
  const [clientType, setClientType] = useState<ClientType>('borrower');

  const [username, setUsername]         = useState('');

  // Username availability — debounced check against dbo.users.name
  const [usernameCheck, setUsernameCheck] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 — profile
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [enabledModules, setEnabledModules]     = useState<string[]>([]);

  // Step 2 — verification (moved before Acceso)
  const [verifyChannel, setVerifyChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [codeSent, setCodeSent]           = useState(false);
  const [enteredCode, setEnteredCode]     = useState('');
  const [sendingCode, setSendingCode]     = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [identityVerified, setIdentityVerified] = useState(false);

  // Step 3 — role + company + branch (Acceso)
  const [userRole, setUserRole]             = useState<RoleCode>('employee');
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branches, setBranches]             = useState<CompanyBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | null>(null);
  const [branchScreen, setBranchScreen]     = useState(false);

  // Persisted user ID from step 0 save — used for steps 1-3 updates
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  // Client stub created at step "Perfil" when profile === 'loans'; patched with
  // companyId at step "Acceso" once it's known (clients.companyId is nullable).
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [stepSaved, setStepSaved] = useState<boolean[]>([false, false, false, false]);

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

  // Normalize a phone number to E.164 format for Twilio (+52XXXXXXXXXX for Mexico)
  // Accepts: 6621408769 (10 digits) → +526621408769
  //          526621408769 (12 digits) → +526621408769
  //          +526621408769 → +526621408769
  const normalizePhone = (v: string): string => {
    const digits = v.replace(/\D/g, '');
    if (digits.length === 10)  return `+52${digits}`;           // local MX number
    if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`; // already has country code
    if (digits.length === 13 && v.startsWith('+'))       return v.trim();     // full E.164 already
    return v.trim(); // pass through as-is; Twilio will reject if wrong
  };

  // Returns true when the phone value is valid enough to send (10 MX digits or full E.164)
  const isPhoneValid = (v: string): boolean => {
    const digits = v.replace(/\D/g, '');
    return digits.length === 10 || (digits.length >= 11 && v.trim().startsWith('+'));
  };

  // Detect whether user typed an email or a phone number
  const detectContactType = (v: string): 'email' | 'phone' | 'unknown' => {
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v)) return 'email';
    if (isPhoneValid(v)) return 'phone';
    return 'unknown';
  };

  const handleContactChange = (v: string) => {
    setContact(v);
    const type = detectContactType(v);
    setContactType(type);

    // Reset previous result
    setContactCheck('idle');
    setExistingRecord(null);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);

    // Debounce: only fire lookup once the field is a valid email or phone
    if (type !== 'unknown') {
      setContactCheck('checking');
      lookupTimerRef.current = setTimeout(async () => {
        try {
          const lookupTarget = type === 'phone' ? normalizePhone(v) : v.trim();
          console.log('[contactLookup] checking contact=', lookupTarget);
          const result = await checkContact(lookupTarget);
          console.log('[contactLookup] result=', result);
          if (result.found) {
            setExistingRecord(result);
            setContactCheck('found');
            // Pre-fill username from existing record if not yet typed
            if (!username && result.firstName) {
              setUsername(`${result.firstName} ${result.lastName ?? ''}`.trim());
            }
          } else {
            setContactCheck('new');
          }
        } catch (err) {
          console.error('[contactLookup] ERROR', err);
          setContactCheck('new'); // fail open — treat as new
        }
      }, 600);
    }
  };

  const handleUsernameChange = (v: string) => {
    setUsername(v);
    setUsernameCheck('idle');
    setUsernameSuggestions([]);
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

    const trimmed = v.trim();
    if (trimmed.length < 3) return; // too short to bother checking

    setUsernameCheck('checking');
    usernameTimerRef.current = setTimeout(async () => {
      try {
        console.log('[usernameCheck] checking username=', trimmed);
        const result = await checkUsername(trimmed);
        console.log('[usernameCheck] result=', result);
        if (result.available) {
          setUsernameCheck('available');
          setUsernameSuggestions([]);
        } else {
          setUsernameCheck('taken');
          setUsernameSuggestions(result.suggestions || []);
        }
      } catch (err) {
        console.error('[usernameCheck] ERROR', err);
        setUsernameCheck('idle'); // fail open — don't block on a check we couldn't run
      }
    }, 500);
  };

  const applyUsernameSuggestion = (s: string) => {
    console.log('[usernameCheck] suggestion applied=', s);
    setUsername(s);
    setUsernameCheck('available');
    setUsernameSuggestions([]);
  };

  // For createUser: route to correct field based on detected type
  const contactEmail    = contactType === 'email' ? contact.trim() : '';
  const contactPhone    = contactType === 'phone' ? normalizePhone(contact) : '';

  // Derived: what target and channel to use in verification
  // Phone is always normalized to E.164 so Twilio accepts it
  const verifyTarget  = contactType === 'phone' ? normalizePhone(contact) : contact.trim();
  const defaultChannel: 'email' | 'sms' = contactType === 'phone' ? 'sms' : 'email';

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => setResendCooldown(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
  };

  const handleSendCode = async () => {
    const channel = verifyChannel || defaultChannel;
    setSendingCode(true);
    console.log('[handleSendCode] channel=%s target=%s', channel, verifyTarget);
    try {
      await sendVerificationCode(verifyTarget, channel);
      setCodeSent(true);
      startResendCooldown();
      console.log('[handleSendCode] OTP sent via', channel);
    } catch (err) {
      console.error('[handleSendCode] ERROR', err);
      setMessage((err as Error).message || 'Error al enviar el código.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (enteredCode.length !== 6) return;
    setVerifyingCode(true);
    console.log('[handleVerifyCode] target=%s code=%s', verifyTarget, enteredCode);
    try {
      const valid = await verifyCode(verifyTarget, enteredCode, createdUserId ?? undefined);
      console.log('[handleVerifyCode] valid=', valid);
      if (!valid) { setMessage('Código incorrecto o expirado. Intenta de nuevo.'); return; }
      setIdentityVerified(true);
      markSaved(2);
      setStep(3);
    } catch (err) {
      console.error('[handleVerifyCode] ERROR', err);
      setMessage((err as Error).message ?? 'Error al verificar.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const strength = pwdStrength(password);

  const contactValid = contactType !== 'unknown';
  const step0Valid = contactValid && username.trim() && usernameCheck !== 'taken' && strength !== '' && password === confirmPassword;

  const selectProfile = (profile: AppProfile) => {
    console.log('[selectProfile] profile=%s modules=%o', profile.id, profile.modules);
    setSelectedProfile(profile.id);
    setEnabledModules(profile.id === 'custom' ? [] : [...profile.modules]);
    const defaults: Record<string, RoleCode> = { pos: 'employee', loans: 'borrower', custom: 'employee' };
    setUserRole(defaults[profile.id] ?? 'employee');
  };

  const toggleModule = (id: string) => {
    console.log('[toggleModule] id=%s', id);
    setEnabledModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSelectCompany = async (company: Company) => {
    console.log('[handleSelectCompany] companyId=%d name=%s', company.companyId, company.name);
    setSelectedCompany(company);
    setSelectedBranch(null);
    setBranches([]);
    setBranchScreen(true);
    try {
      const branchList = await getBranchesByCompany(company.companyId);
      console.log('[handleSelectCompany] branches=%o', branchList);
      setBranches(branchList);
    } catch (err) {
      console.error('[handleSelectCompany] ERROR', err);
      setBranches([]);
    }
  };

  const markSaved = (s: number) =>
    setStepSaved(prev => { const n = [...prev]; n[s] = true; return n; });

  // Step 0 → create or continue with existing user, get userId, advance to profile
  const handleStep0Next = async () => {
    if (!step0Valid) { setMessage('Completa todos los campos correctamente.'); return; }
    setLoading(true);
    console.log('[handleStep0Next] contact=%s type=%s existing=%o', contact, contactType, existingRecord);
    try {
      let uid: number | null = null;
      // Which step to land on next — only existing accounts with an
      // incomplete registration resume anywhere but "Perfil" (step 1).
      let resumeAtStep = 1;

      if (existingRecord?.found && existingRecord.userId) {
        // Existing user account → just update credentials (password reset / link)
        console.log('[handleStep0Next] updating existing userId=', existingRecord.userId);
        await updateUser(existingRecord.userId, { name: username, password });
        uid = existingRecord.userId;

        // Resume at the first incomplete step, prefilling whatever was
        // already saved so it isn't asked again.
        if (existingRecord.stepProfile === 1) {
          if (existingRecord.appProfile) setSelectedProfile(existingRecord.appProfile);
          if (existingRecord.enabledModules) setEnabledModules(existingRecord.enabledModules);
          markSaved(1);
        }
        if (existingRecord.stepVerify === 1) {
          setIdentityVerified(true);
          markSaved(2);
        }
        if (existingRecord.stepProfile !== 1) resumeAtStep = 1;
        else if (existingRecord.stepVerify !== 1) resumeAtStep = 2;
        else if (existingRecord.stepAccess !== 1) resumeAtStep = 3;
        console.log('[handleStep0Next] resuming incomplete registration at step=%d', resumeAtStep);
      } else if (existingRecord?.found && existingRecord.clientId) {
        // Known client (staff-onboarded), no account yet — "Cliente encontrado,
        // completa el registro". Link the new login to that clientId instead of
        // creating a disconnected user row.
        console.log('[handleStep0Next] existing client clientId=%d, no account yet — creating linked user', existingRecord.clientId);
        const data = await createUser({
          email:     contactEmail || completeEmail || undefined,
          cellphone: contactPhone || undefined,
          name:      username,
          password,
          clientId:  existingRecord.clientId,
        });
        console.log('[handleStep0Next] createUser (linked) response', data);
        const rawUid = data.userId ?? data.id ?? (data as any).users?.[0]?.userId;
        uid = rawUid ? Number(rawUid) : null;
        setCreatedClientId(existingRecord.clientId);

        // Client matched via phone and had no email on file — complete it.
        if (completeEmail.trim()) {
          console.log('[handleStep0Next] completing client email=%s for clientId=%d', completeEmail, existingRecord.clientId);
          try {
            const [firstName, ...rest] = (existingRecord.firstName ? `${existingRecord.firstName} ${existingRecord.lastName ?? ''}` : username).trim().split(/\s+/);
            await createOrUpdateClient({
              clients: [{
                clientId: existingRecord.clientId,
                first_name: existingRecord.firstName || firstName || username.trim(),
                last_name:  existingRecord.lastName || rest.join(' ') || '-',
                cellphone:  existingRecord.cellphone || contactPhone,
                email:      completeEmail.trim(),
                action: '2',
              }],
            });
          } catch (completeErr) {
            console.error('[handleStep0Next] complete client email ERROR', completeErr);
          }
        }
      } else {
        // New record — create the client at the same time as the user, not a
        // later step, so they're never left disconnected. Only possible with
        // a real phone number: clients.cellphone is NOT NULL + UNIQUE, so an
        // email-only signup still can't get a client row (same constraint as
        // before — a blank placeholder would collide on the second such signup).
        let newClientId: number | null = null;
        if (contactPhone) {
          const [firstName, ...rest] = username.trim().split(/\s+/);
          const lastName = rest.join(' ') || '-';
          console.log('[handleStep0Next] creating client alongside new user for', firstName, lastName);
          try {
            await createOrUpdateClient({
              clients: [{
                clientId: 0,
                first_name: firstName || username.trim(),
                last_name: lastName,
                cellphone: contactPhone,
                email: contactEmail,
                clientType,
                action: '1',
              }],
            });
            // sp_clients doesn't hand back the new clientId directly — re-fetch
            // and match by contact, same pattern used in ClientSelector.tsx.
            const allClients = await getAllClients();
            const digits = (v: string) => v.replace(/\D/g, '');
            const match = allClients.find(c => digits(c.cellphone || '') === digits(contactPhone));
            console.log('[handleStep0Next] client created, matched clientId=', match?.clientId);
            if (match) newClientId = match.clientId;
          } catch (clientErr) {
            console.error('[handleStep0Next] client creation ERROR', clientErr);
          }
        } else {
          console.log('[handleStep0Next] email-only contact — skipping client creation (no phone to satisfy clients.cellphone NOT NULL+UNIQUE)');
        }

        // New record — create user, already linked to the client if one was created
        const data = await createUser({
          email:     contactEmail || undefined,
          cellphone: contactPhone || undefined,
          name:      username,
          password,
          clientId:  newClientId ?? undefined,
        });
        console.log('[handleStep0Next] createUser response', data);
        const rawUid = data.userId ?? data.id ?? (data as any).users?.[0]?.userId;
        console.log('[handleStep0Next] extracted uid=', rawUid);
        uid = rawUid ? Number(rawUid) : null;
        if (newClientId) setCreatedClientId(newClientId);
      }

      if (uid) setCreatedUserId(uid);
      setVerifyChannel(contactType === 'phone' ? 'sms' : 'email');
      markSaved(0);
      setStep(resumeAtStep);
    } catch (err) {
      console.error('[handleStep0Next] ERROR', err);
      setMessage((err as Error).message ?? 'Error al guardar las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 → save profile + modules → advance to verification.
  // Client creation now happens at step "Cuenta" (handleStep0Next), alongside
  // the user itself, for any signup with a phone — not deferred here anymore.
  const handleStep1Next = async () => {
    if (!selectedProfile) { setMessage('Selecciona un perfil de aplicación.'); return; }
    setLoading(true);
    console.log('[handleStep1Next] userId=%d profile=%s modules=%o', createdUserId, selectedProfile, enabledModules);
    try {
      if (createdUserId) {
        const data = await updateUser(createdUserId, { appProfile: selectedProfile, enabledModules });
        console.log('[handleStep1Next] response', data);
      }

      markSaved(1);
      setStep(2);
    } catch (err) {
      console.error('[handleStep1Next] ERROR', err);
      setMessage((err as Error).message ?? 'Error al guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → save role/company/branch → done
  const handleStep3Submit = async () => {
    setLoading(true);
    console.log('[handleStep3Submit] userId=%d role=%s companyId=%d branchId=%d',
      createdUserId, userRole, selectedCompany?.companyId, selectedBranch?.branchId);
    try {
      if (createdUserId) {
        const data = await updateUser(createdUserId, {
          roleCode:  userRole,
          companyId: selectedCompany?.companyId ?? 0,
          branchId:  selectedBranch?.branchId  ?? 0,
        });
        console.log('[handleStep3Submit] response', data);
      }

      if (createdClientId && selectedCompany?.companyId) {
        // sp_clients' UPDATE action overwrites first_name/last_name/cellphone/email
        // unconditionally (no NULLIF) — must resend the real values, not blanks,
        // or this patch would wipe the client stub created at step "Perfil".
        const [firstName, ...rest] = username.trim().split(/\s+/);
        const lastName = rest.join(' ') || '-';
        console.log('[handleStep3Submit] patching clientId=%d companyId=%d', createdClientId, selectedCompany.companyId);
        try {
          const clientData = await createOrUpdateClient({
            clients: [{
              clientId: createdClientId,
              companyId: selectedCompany.companyId,
              first_name: firstName || username.trim(),
              last_name: lastName,
              cellphone: contactPhone,
              email: contactEmail,
              clientType,
              action: '2',
            }],
          });
          console.log('[handleStep3Submit] client companyId patch response', clientData);
        } catch (clientErr) {
          console.error('[handleStep3Submit] client companyId patch ERROR', clientErr);
        }
      }

      markSaved(3);
      setMessage('¡Cuenta creada exitosamente!');
      setTimeout(() => history.push('/login'), 1400);
    } catch (err) {
      console.error('[handleStep3Submit] ERROR', err);
      setMessage((err as Error).message ?? 'Error al guardar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    console.log('[goNext] from step=%d (%s)', step, STEPS[step]);
    if (step === 0) { handleStep0Next(); return; }
    if (step === 1) { handleStep1Next(); return; }
    // step 2 is verify — handled inline by renderStep2 buttons (no footer Next)
  };

  const goBack = () => {
    console.log('[goBack] from step=%d branchScreen=%s', step, branchScreen);
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
        {/* Smart contact field — detects email vs phone automatically */}
        <div className="ca-contact-wrap">
          <IonInput
            fill="outline"
            label="Email o teléfono"
            labelPlacement="floating"
            type="text"
            inputmode="email"
            value={contact}
            onIonInput={e => handleContactChange(e.detail.value || '')}
            className={contact && contactType === 'unknown' ? 'ion-invalid ion-touched' : ''}
            errorText="Ingresa un email válido o número de teléfono (mín. 8 dígitos)"
          />
          {contact && contactType !== 'unknown' && (
            <span className={`ca-contact-badge ca-contact-badge--${contactType}`}>
              {contactType === 'email'
                ? '✉️ Email'
                : `📱 ${normalizePhone(contact)}`}
            </span>
          )}
        </div>

        {/* Contact lookup status */}
        {contactCheck === 'checking' && (
          <div className="ca-lookup-row">
            <IonSpinner name="crescent" style={{ width: 14, height: 14 }} />
            <span>Buscando en el sistema…</span>
          </div>
        )}

        {contactCheck === 'found' && existingRecord && (() => {
          const hasAcc      = existingRecord.hasAccount === 1;
          const regComplete = existingRecord.regComplete === 1;
          const pct    = existingRecord.completionPct ?? 0;
          const steps  = existingRecord.stepsCompleted ?? 0;

          // ── Account fully registered (Cuenta+Perfil+Verificar+Acceso all
          // done) → prompt to login instead of letting the wizard restart ──
          if (hasAcc && regComplete) {
            return (
              <div className="ca-lookup-card ca-lookup-card--has-account">
                <div className="ca-lookup-card-icon">🔒</div>
                <div className="ca-lookup-card-body">
                  <div className="ca-lookup-card-title">Cuenta existente</div>
                  <div className="ca-lookup-card-name">
                    {existingRecord.firstName} {existingRecord.lastName}
                  </div>
                  <div className="ca-lookup-card-detail">
                    Este número ya tiene una cuenta activa en el sistema.
                  </div>
                  <button
                    type="button"
                    className="ca-goto-login-btn"
                    onClick={() => history.push('/login')}
                  >
                    Ir al inicio de sesión →
                  </button>
                </div>
              </div>
            );
          }

          // ── Account exists but the wizard was abandoned partway → resume
          // at the first incomplete step (handled in handleStep0Next) ─────
          if (hasAcc && !regComplete) {
            const missing = [
              existingRecord.stepProfile !== 1 && 'Perfil de aplicación',
              existingRecord.stepVerify  !== 1 && 'Verificación de identidad',
              existingRecord.stepAccess  !== 1 && 'Rol y empresa (Acceso)',
            ].filter(Boolean) as string[];
            return (
              <div className="ca-lookup-card ca-lookup-card--found">
                <div className="ca-lookup-card-icon">⏳</div>
                <div className="ca-lookup-card-body">
                  <div className="ca-lookup-card-title">Registro incompleto</div>
                  <div className="ca-lookup-card-detail">
                    Ya tienes una cuenta, pero falta completar: {missing.join(', ')}. Continúa donde te quedaste.
                  </div>
                </div>
              </div>
            );
          }

          // ── Client found but no account yet → continue registration ─────
          return (
            <div className="ca-lookup-card ca-lookup-card--found">
              <div className="ca-lookup-card-icon">✅</div>
              <div className="ca-lookup-card-body">
                <div className="ca-lookup-card-title">Cliente encontrado</div>
                <div className="ca-lookup-card-name">
                  {existingRecord.firstName} {existingRecord.lastName}
                </div>
                <div className="ca-lookup-card-detail">
                  Cliente registrado sin cuenta. Completa el registro para otorgar acceso al préstamo.
                </div>
                <div className="ca-lookup-progress">
                  <div className="ca-lookup-progress-bar">
                    <div
                      className="ca-lookup-progress-fill"
                      style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : pct >= 50 ? '#2563eb' : '#d97706' }}
                    />
                  </div>
                  <span className="ca-lookup-progress-label">{pct}% préstamo completado ({steps}/6 pasos)</span>
                </div>
                <div className="ca-lookup-steps">
                  {([
                    { label: 'Info',       done: existingRecord.stepGeneralInfo === 1 },
                    { label: 'QR',         done: existingRecord.stepQr === 1 },
                    { label: 'Pago',       done: false },
                    { label: 'Biométrico', done: existingRecord.stepBiometric === 1 },
                    { label: 'Contrato',   done: existingRecord.stepContract === 1 },
                    { label: 'Pagaré',     done: existingRecord.stepPagare === 1 },
                  ] as {label:string;done:boolean}[]).map(s => (
                    <span key={s.label} className={`ca-lookup-step${s.done ? ' done' : ''}`}>
                      {s.done ? '✓' : '○'} {s.label}
                    </span>
                  ))}
                </div>
                {!existingRecord.email && (
                  <div className="ca-complete-field">
                    <IonInput
                      fill="outline" label="Email (opcional, completa tu registro)" labelPlacement="floating"
                      type="email" value={completeEmail}
                      onIonInput={e => {
                        const v = e.detail.value || '';
                        console.log('[completeEmail] value=', v);
                        setCompleteEmail(v);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {contactCheck === 'new' && contactType !== 'unknown' && (
          <div className="ca-lookup-card ca-lookup-card--new">
            <div className="ca-lookup-card-icon">🆕</div>
            <div className="ca-lookup-card-body">
              <div className="ca-lookup-card-title">Nuevo registro</div>
              <div className="ca-lookup-card-detail">Este contacto no está en el sistema. Se creará una cuenta nueva.</div>
            </div>
          </div>
        )}

        {/* A dbo.clients row is only created for a new phone-based signup —
            let the client pick what kind of client they are instead of
            defaulting everyone to "Acreditado". */}
        {contactCheck === 'new' && contactType === 'phone' && (
          <div style={{ marginBottom: 16 }}>
            <p className="ca-step-desc" style={{ textAlign: 'left', margin: '0 0 8px' }}>Tipo de cliente:</p>
            <div className="ca-profile-list">
              {CLIENT_TYPES.map(t => {
                const selected = clientType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`ca-profile-btn${selected ? ' selected' : ''}`}
                    style={selected ? { borderColor: t.color, background: `${t.color}14` } : undefined}
                    onClick={() => setClientType(t.id)}
                  >
                    <div className="ca-profile-icon-wrap" style={selected ? { background: `${t.color}20`, color: t.color } : undefined}>
                      <span style={{ fontSize: 20 }}>{t.icon}</span>
                    </div>
                    <div className="ca-profile-text">
                      <span className="ca-profile-name" style={selected ? { color: t.color } : undefined}>{t.label}</span>
                      <span className="ca-profile-desc">{t.desc}</span>
                    </div>
                    <div className={`ca-radio-dot${selected ? ' selected' : ''}`}
                      style={selected ? { borderColor: t.color, background: t.color } : undefined} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <IonInput
          fill="outline" label="Nombre de usuario" labelPlacement="floating"
          type="text" value={username}
          onIonInput={e => handleUsernameChange(e.detail.value || '')}
          className={usernameCheck === 'taken' ? 'ion-invalid ion-touched' : ''}
          errorText={usernameCheck === 'taken' ? 'Este nombre de usuario ya existe.' : undefined}
        />

        {usernameCheck === 'checking' && (
          <div className="ca-lookup-row">
            <IonSpinner name="crescent" style={{ width: 14, height: 14 }} />
            <span>Verificando disponibilidad…</span>
          </div>
        )}

        {usernameCheck === 'available' && (
          <div className="ca-lookup-row" style={{ color: '#059669' }}>
            <IonIcon icon={checkmark} style={{ fontSize: 14 }} />
            <span>Nombre de usuario disponible</span>
          </div>
        )}

        {usernameCheck === 'taken' && usernameSuggestions.length > 0 && (
          <div className="ca-username-suggestions">
            <span className="ca-username-suggestions-label">Prueba con:</span>
            {usernameSuggestions.map(s => (
              <button
                key={s}
                type="button"
                className="ca-username-suggestion-chip"
                onClick={() => applyUsernameSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

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

  // ── Step 3: Role + company (Acceso) ──────────────────────────────────────

  const renderStep3 = () => {
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
          onClick={handleStep3Submit}
          disabled={loading}
        >
          {loading
            ? <IonSpinner name="crescent" className="ca-submit-spinner" />
            : <><IonIcon icon={checkmark} /> Crear cuenta</>}
        </button>
      </div>
    );
  };

  // ── Step 2: Identity verification ────────────────────────────────────────

  const renderStep2 = () => {
    const CHANNEL_OPTIONS: Array<{ key: 'email' | 'sms' | 'whatsapp'; icon: string; label: string }> =
      contactType === 'email'
        ? [{ key: 'email', icon: '✉️', label: 'Email' }]
        : [
            { key: 'sms',      icon: '💬', label: 'SMS' },
            { key: 'whatsapp', icon: '📱', label: 'WhatsApp' },
          ];

    const selectedChannelLabel = CHANNEL_OPTIONS.find(c => c.key === verifyChannel)?.label ?? 'Email';
    const selectedChannelIcon  = CHANNEL_OPTIONS.find(c => c.key === verifyChannel)?.icon ?? '✉️';

    return (
      <div className="ca-step-body">
        <div className="ca-step-header">
          <div className="ca-step-icon-wrap" style={{ background: '#F0FDF4' }}>
            <span style={{ fontSize: 32 }}>🔐</span>
          </div>
          <h2 className="ca-step-title">Verificar identidad</h2>
          <p className="ca-step-desc">
            {!codeSent
              ? `Enviaremos un código de 6 dígitos a ${verifyTarget}`
              : `Código enviado a ${verifyTarget}`}
          </p>
        </div>

        {!codeSent ? (
          <div className="ca-form-fields">
            {/* Only show channel selector if phone was provided (SMS vs WhatsApp) */}
            {CHANNEL_OPTIONS.length > 1 && (
              <div className="ca-verify-channels">
                {CHANNEL_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`ca-verify-channel-btn${verifyChannel === opt.key ? ' selected' : ''}`}
                    onClick={() => setVerifyChannel(opt.key)}
                  >
                    <span className="ca-verify-channel-icon">{opt.icon}</span>
                    <span className="ca-verify-channel-label">{opt.label}</span>
                    <span className="ca-verify-channel-target">{verifyTarget}</span>
                    <span className={`ca-radio-dot${verifyChannel === opt.key ? ' selected' : ''}`} />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="ca-submit-btn"
              disabled={sendingCode}
              onClick={handleSendCode}
              style={{ marginTop: 8 }}
            >
              {sendingCode
                ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
                : `Enviar código por ${selectedChannelLabel}`}
            </button>
          </div>
        ) : (
          <div className="ca-form-fields">
            <div className="ca-otp-hint">
              {selectedChannelIcon} Código enviado a <strong>{verifyTarget}</strong> por <strong>{selectedChannelLabel}</strong>
            </div>

            <IonInput
              fill="outline"
              labelPlacement="floating"
              label="Código de 6 dígitos"
              type="text"
              inputmode="numeric"
              maxlength={6}
              value={enteredCode}
              onIonInput={e => setEnteredCode(String(e.detail.value ?? '').replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: 12, fontSize: 24, textAlign: 'center' }}
            />

            <button
              type="button"
              className="ca-submit-btn"
              disabled={enteredCode.length !== 6 || verifyingCode}
              onClick={handleVerifyCode}
              style={{ marginTop: 12 }}
            >
              {verifyingCode
                ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
                : 'Verificar y continuar →'}
            </button>

            <div className="ca-otp-actions">
              <button
                type="button"
                className="ca-otp-link"
                disabled={resendCooldown > 0 || sendingCode}
                onClick={() => { setCodeSent(false); setEnteredCode(''); }}
              >
                ← Cambiar canal
              </button>
              <button
                type="button"
                className="ca-otp-link"
                disabled={resendCooldown > 0 || sendingCode}
                onClick={handleSendCode}
              >
                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
              </button>
            </div>
          </div>
        )}
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
          {step === 3 && renderStep3()}

          <div style={{ height: 100 }} />
        </div>
      </IonContent>

      {/* Step 2 (verify) has its own inline buttons — no footer */}
      {step !== 2 && (
        <IonFooter className="ca-footer">
          <div className="ca-footer-inner">
            {step > 0 && (
              <button type="button" className="ca-btn-back" onClick={goBack} disabled={loading}>
                <IonIcon icon={chevronBack} />
                <span>Atrás</span>
              </button>
            )}
            {/* Steps 0 and 1 use footer Next; step 3 has its own submit inside render */}
            {(step === 0 || step === 1) && (
              <button
                type="button"
                className="ca-btn-next"
                onClick={goNext}
                disabled={loading || (step === 0 && existingRecord?.regComplete === 1)}
              >
                {loading ? <IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> : <>Siguiente <IonIcon icon={chevronForward} /></>}
              </button>
            )}
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default CreateAccount;
