// CreateAccount.tsx — 3-step wizard (styled to match client wizard)
import React, { useEffect, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonFooter,
  IonToast, IonRouterLink, IonIcon, IonSpinner, IonChip, IonLabel, IonButton,
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import './CreateAccount.css';
import {
  eye, eyeOff, chevronBack, chevronForward, checkmark,
  personOutline, businessOutline, lockClosedOutline,
  buildOutline, walletOutline, cartOutline,
} from 'ionicons/icons';
import { getAllCompanies, getBranchesByCompany, createCompany, createBranch, Company, CompanyBranch } from '../../api/companiesApi';
import { RoleCode, ROLE_LABELS } from '../../config/rolePermissions';
import { createUser, updateUser, sendVerificationCode, verifyCode, checkContact, checkUsername, sendAccountCreated, ContactCheckResult } from '../../api/usersApi';
import { createOrUpdateClient, getAllClients, ClientType } from '../../api/clientsApi';
import { grantClientCapability, ClientCapability } from '../../api/clientCapabilitiesApi';
import { useUser } from '../../contexts/UserContext';
import { useObservability } from '../../contexts/ObservabilityContext';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import ServiceFinderView from './ServiceFinder/ServiceFinderView';
import BusinessMenuView from './BusinessMenu/BusinessMenuView';
import type { BusinessMenuResult } from './BusinessMenu/BusinessMenuTypes';
import { SERVICES, serviceFromSearch } from './ServiceFinder/ServiceFinderConstants';
import type { ServiceId } from './ServiceFinder/ServiceFinderTypes';

// ── Application profiles ────────────────────────────────────────────────────

interface AppProfile {
  id: string;
  label: string;
  // Outcome-first phrasing shown on the profile picker ("what do you want to
  // do?"), so the user chooses by goal instead of by system name. `label`
  // stays the brand name, still used in the final summary.
  intent: string;
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
    intent: 'Vender y cobrar en mi negocio',
    description: 'Ventas, carrito, caja, inventario y recompensas.',
    icon: '🏪',
    modules: ['pos_cart', 'cash_register', 'inventory_products', 'receipts_printing', 'accounting_ledger', 'rewards'],
    color: '#2563eb',
    bgColor: '#EFF6FF',
  },
  {
    // Was the 'loans' profile (SmartLoans-only). Broadened into the general
    // GMO customer entry point: selecting a product here is an interest,
    // not an authorization — see INTEREST_OPTIONS. SmartLoans specifically
    // still asks its own borrower/lender/lawyer question afterward (see
    // renderClientTypePicker), it's just no longer the only thing this
    // card can lead to.
    id: 'customer',
    label: 'Cliente GMO',
    intent: 'Comprar, ganar recompensas, jugar o pedir un préstamo',
    description: 'Elige qué quieres usar — puedes agregar más después.',
    icon: '🙋',
    modules: [],
    color: '#7c3aed',
    bgColor: '#F5F3FF',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    intent: 'Armar mi propia combinación',
    description: 'Elige exactamente las herramientas que necesitas.',
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

// Custom profile: instead of a technical checklist of module IDs, ask the user
// what they want to DO — each goal maps to the module(s) that deliver it. The
// union of the chosen goals' modules is what gets saved as enabledModules.
// Covers every id in ALL_MODULES exactly once.
const MODULE_GOALS: { label: string; modules: string[] }[] = [
  { label: 'Vender productos físicos',        modules: ['pos_cart', 'inventory_products', 'receipts_printing'] },
  { label: 'Manejar caja y efectivo',         modules: ['cash_register'] },
  { label: 'Llevar contabilidad y finanzas',  modules: ['accounting_ledger'] },
  { label: 'Administrar clientes',            modules: ['clients'] },
  { label: 'Verificar identidad (facial)',    modules: ['clientFaceRecognition'] },
  { label: 'Enviar notificaciones push',      modules: ['pushNotifications'] },
  { label: 'Dar puntos de recompensa',        modules: ['rewards'] },
  { label: 'Chat de préstamos',               modules: ['loanChat'] },
];

// Client type is a real choice the client makes at signup (previously
// hardcoded to 'borrower' for every phone-based registration) — mirrors
// the selector in ClientsPage.tsx's client wizard.
const CLIENT_TYPES: { id: ClientType; icon: string; label: string; desc: string; color: string }[] = [
  // One capability per account — no "Ambos" (both). A customer is a borrower,
  // a lender, OR a legal advisor (jurídico).
  { id: 'borrower', icon: '📋', label: 'Acreditado',            desc: 'Solicita préstamo',   color: '#2563eb' },
  { id: 'lender',   icon: '💼', label: 'Prestamista',           desc: 'Financia préstamos',  color: '#15803d' },
  { id: 'lawyer',   icon: '⚖️', label: 'Jurídico',              desc: 'Asesoría legal',      color: '#b45309' },
];

// Note the two different 'pos' namespaces here: the KEY 'pos' is a wizard
// *profile* id (the staff/business-owner signup card, "Punto de Venta"),
// unrelated to the VALUE 'pos' below (the roleCode a plain POS customer
// gets — renamed from 'client', see rolePermissions.ts's RoleCode comment).
// Same literal string, two different concepts — selectedProfile vs roleCode.
const DEFAULT_ROLE_BY_PROFILE: Record<string, RoleCode> = { pos: 'employee', customer: 'pos', custom: 'employee' };

// The 'customer' profile's "what do you want to use?" step — multi-select,
// not exclusive. Checking a box records interest, it does not by itself
// grant anything except for pos/rewards/arcade, which ARE the capability
// (there's no separate eligibility question for those — see
// clientCapabilitiesApi.grantClientCapability). SmartLoans is deliberately
// different: checking it only reveals the existing borrower/lender/lawyer
// question (renderClientTypePicker) rather than granting a capability
// directly, since that's a real authorization decision, not a preference.
interface InterestOption {
  id: 'pos' | 'rewards' | 'arcade' | 'loans' | 'factory';
  label: string;
  desc: string;
  icon: string;
  capability?: ClientCapability;
}
const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'pos',     label: 'POS',        desc: 'Comprar en negocios POS GMO',     icon: '🛍️', capability: 'POS' },
  { id: 'rewards', label: 'Rewards',    desc: 'Ganar y canjear puntos',          icon: '🎁', capability: 'REWARDS' },
  { id: 'arcade',  label: 'Juegos Online', desc: 'Jugar y usar tus fichas',         icon: '🕹️', capability: 'ARCADE' },
  { id: 'loans',   label: 'SmartLoans', desc: 'Pedir o dar un préstamo',         icon: '💰' },
  { id: 'factory', label: 'Factory AI', desc: 'Software a la medida con IA',     icon: '🤖', capability: 'FACTORY_AI' },
];

// SmartLoans membership granted once the client row has its company (step
// "Acceso"). "Ambos" = two rows, never a combined value.
const SMARTLOANS_CAPS_BY_CLIENT_TYPE: Record<ClientType, ClientCapability[]> = {
  borrower: ['SMARTLOANS_BORROWER'],
  lender:   ['SMARTLOANS_LENDER'],
  both:     ['SMARTLOANS_BORROWER', 'SMARTLOANS_LENDER'],
  lawyer:   ['SMARTLOANS_JURIDICAL'],
  pos:      [],
};

// For SmartLoans the access role is fully determined by the loan client type
// chosen in step "Perfil" — asking "Rol de acceso" again in step "Acceso" just
// duplicates the same borrower/lender choice (Acreditado≙Prestatario,
// Prestamista≙Prestamista) and lets the two fields drift out of sync (client
// record says one thing, user role another). Derive it instead. POS/custom
// keep their independent role picker, where roles genuinely differ from type.
const ROLE_BY_CLIENT_TYPE: Record<ClientType, RoleCode> = {
  borrower: 'borrower',
  lender:   'lender',
  both:     'borrower', // primary role; the lender view is a toggle inside the app
  // Legal advisor. Was 'viewer' — but viewer is a STAFF role (company
  // Ingresos/Egresos + any clientId by URL). 'pos' is the interim non-staff
  // role until a dedicated juridical role exists in dbo.roles.
  lawyer:   'pos',
  // 'pos' realistically never reaches this table — a POS retail customer is
  // created through the independent POS profile role picker (see
  // DEFAULT_ROLE_BY_PROFILE above), not this loans-profile derivation. Kept
  // here only for exhaustiveness; matches DEFAULT_ROLE_BY_PROFILE.pos so a
  // 'pos' client type never accidentally gets borrower/lender permissions
  // if this table is ever consulted for one.
  pos:      'employee',
};

const STEPS = ['Cuenta', 'Perfil', 'Verificar', 'Acceso'];

// ── Component ───────────────────────────────────────────────────────────────

const CreateAccount: React.FC = () => {
  const history = useHistory();
  const { isAuthenticated, roleCode: sessionRoleCode, clientId: sessionClientId } = useUser();
  const { startWorkflow, endWorkflow } = useObservability();

  // An already-authenticated visitor (e.g. still logged in from a previous
  // session) shouldn't see the signup form or the app's tab bar bleeding
  // through underneath it — send them straight to their own dashboard.
  useEffect(() => {
    if (isAuthenticated) {
      history.replace(getPostLoginRoute(sessionRoleCode, sessionClientId));
    }
  }, [isAuthenticated, sessionRoleCode, sessionClientId, history]);

  const [step, setStep] = useState(0);

  // "Asistente GMO" (ServiceFinder) runs before step "Cuenta" to identify the
  // service. `?service=pos|smartloans|arcade` skips it with that service preset.
  const location = useLocation();
  const [urlService] = useState<ServiceId | null>(() => {
    const id = serviceFromSearch(location.search);
    return id && SERVICES[id].supportedHere ? id : null;
  });
  const [service, setService] = useState<ServiceId | null>(null);
  const [finderDone, setFinderDone] = useState(!!urlService);

  // Sub-step inside the "Perfil" step, so it plays as a quiz (one question per
  // screen, tap to advance) instead of a single scrolling form: 0 = intent
  // ("¿Qué quieres hacer?"), 1 = the branch detail for the chosen objetivo.
  const [q1, setQ1] = useState(0);

  // Step 0 — credentials
  // Single smart contact field — user types email OR phone; we detect which
  const [contact, setContact]           = useState('');
  const [contactType, setContactType]   = useState<'email' | 'phone' | 'unknown'>('unknown');
  // Phone-first (2026-11-18): the phone is the identity (SMS/WhatsApp code,
  // clients.cellphone, WhatsApp follow-up) and email is an optional extra.
  // 'email' mode only exists so an older email-only signup can resume.
  const [contactMode, setContactMode]   = useState<'phone' | 'email'>('phone');
  const [optionalEmailInput, setOptionalEmailInput] = useState('');

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

  // SmartLoans (step "Perfil") requires a dbo.clients row — clients.cellphone
  // is NOT NULL + UNIQUE, so an email-only signup (no client row created at
  // step "Cuenta") needs a phone collected here before it can proceed.
  const [loansPhone, setLoansPhone] = useState('');
  const [loansPhoneCheck, setLoansPhoneCheck] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const loansPhoneTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // 'customer' profile only — which of POS/Rewards/Arcade/SmartLoans they
  // want (multi-select). Empty until they check something.
  const [selectedInterests, setSelectedInterests] = useState<InterestOption['id'][]>([]);
  const wantsLoans = selectedInterests.includes('loans');

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
  // Business signup (POS / custom staff profiles): public signup is owner-only —
  // the person names their business, we create that company (+ a "Matriz"
  // branch) and they become its admin. Employees are added later by that admin
  // from inside POS; nobody can pick an existing company here (2026-11-18).
  const [businessName, setBusinessName] = useState('');
  const [ownCompany, setOwnCompany]     = useState<{ company: Company; branch: CompanyBranch | null } | null>(null);
  // Optional menu/catalog read by the business_menu agent at step "Perfil".
  // Only its suggested modules are saved (enabledModules); the item list is a
  // preview — importing products needs its own backend step.
  const [menuResult, setMenuResult] = useState<BusinessMenuResult | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [, setBranches]                     = useState<CompanyBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | null>(null);
  const [branchScreen, setBranchScreen]     = useState(false);

  // Persisted user ID from step 0 save — used for steps 1-3 updates
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  // Client stub created at step "Perfil" for an email-only 'customer' signup; patched with
  // companyId at step "Acceso" once it's known (clients.companyId is nullable).
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [stepSaved, setStepSaved] = useState<boolean[]>([false, false, false, false]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getAllCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  // The SmartLoans profile only ever runs under one company — auto-select
  // it instead of showing the POS company picker. This also closes the gap
  // that let step "Acceso" finish with no company selected at all (the
  // account would then keep whatever role/company it had before, silently
  // ignoring the role just chosen in the wizard).
  useEffect(() => {
    if (selectedProfile !== 'customer' || !wantsLoans || companies.length === 0) return;
    const smartLoans = companies.find(c => c.name.trim().toLowerCase() === 'smartloans');
    if (!smartLoans || selectedCompany?.companyId === smartLoans.companyId) return;
    console.log('[autoSelectSmartLoans] companyId=', smartLoans.companyId);
    setSelectedCompany(smartLoans);
    setSelectedBranch(null);
    getBranchesByCompany(smartLoans.companyId)
      .then(list => {
        setBranches(list);
        if (list.length > 0) setSelectedBranch(list[0]);
      })
      .catch(() => setBranches([]));
  }, [selectedProfile, wantsLoans, companies, selectedCompany]);

  // SmartLoans: keep the access role locked to the chosen client type so step
  // "Acceso" confirms the role instead of asking the borrower/lender question a
  // second time. This is what handleStep3Submit persists as roleCode. Only
  // applies once SmartLoans is among the checked interests — otherwise the
  // 'customer' profile's role stays 'pos' (its DEFAULT_ROLE_BY_PROFILE).
  useEffect(() => {
    if (selectedProfile !== 'customer' || !wantsLoans) return;
    setUserRole(ROLE_BY_CLIENT_TYPE[clientType]);
  }, [selectedProfile, wantsLoans, clientType]);

  // A 'customer' who did NOT check SmartLoans should never end up labeled
  // 'borrower' (the step-0 clientType picker's default, asked before their
  // interests are even known) — that's a real, empirically-checked-live
  // value (CK_clients_clientType allows 'pos' as of the 2026-09-14
  // migration), not a guess. Only touches a brand-new client row: for
  // someone already pre-registered via a POS sale, handleStep3Submit skips
  // the patch that would carry this (no company is chosen for a plain
  // customer), so their existing clientType is left alone. Skips entirely
  // once SmartLoans is checked — that path owns clientType via the
  // CLIENT_TYPES picker above, this must not fight it.
  // A business owner (POS / custom profile) is never a loan client either:
  // their own dbo.clients row (phone signup) is a plain 'pos' client.
  useEffect(() => {
    if (selectedProfile === 'pos' || selectedProfile === 'custom') {
      console.log('[clientType] business signup — clientType pos');
      setClientType('pos');
      return;
    }
    if (selectedProfile !== 'customer' || wantsLoans) return;
    console.log('[clientType] customer profile without SmartLoans interest — defaulting clientType to pos');
    setClientType('pos');
  }, [selectedProfile, wantsLoans]);

  // Quiz sub-step: entering "Perfil" with an objetivo already chosen (resume,
  // or stepping back and forward) jumps past the intent question to its detail;
  // leaving the step resets it. Back within the step is handled in goBack.
  useEffect(() => {
    if (step === 1) setQ1(selectedProfile ? 1 : 0);
    else setQ1(0);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const isEmailValid = (v: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v.trim());

  // The main field accepts only what its mode asks for (phone, or email when resuming).
  const detectContactType = (v: string): 'email' | 'phone' | 'unknown' => {
    if (contactMode === 'email') return isEmailValid(v) ? 'email' : 'unknown';
    return isPhoneValid(v) ? 'phone' : 'unknown';
  };

  const switchContactMode = (mode: 'phone' | 'email') => {
    console.log('[contactMode] ->', mode);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    setContactMode(mode);
    setContact('');
    setContactType('unknown');
    setContactCheck('idle');
    setExistingRecord(null);
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

  // Phone collected on step "Perfil" for an email-only SmartLoans signup —
  // clients.cellphone is NOT NULL + UNIQUE, so check it's not already taken
  // before letting the client row get created (same checkContact used for
  // the main contact field, same debounce pattern).
  const handleLoansPhoneChange = (v: string) => {
    setLoansPhone(v);
    setLoansPhoneCheck('idle');
    if (loansPhoneTimerRef.current) clearTimeout(loansPhoneTimerRef.current);

    if (!isPhoneValid(v)) return;

    setLoansPhoneCheck('checking');
    loansPhoneTimerRef.current = setTimeout(async () => {
      try {
        const result = await checkContact(normalizePhone(v));
        console.log('[loansPhoneLookup] result=', result);
        setLoansPhoneCheck(result.found ? 'taken' : 'available');
      } catch (err) {
        console.error('[loansPhoneLookup] ERROR', err);
        setLoansPhoneCheck('idle'); // fail open — backend UNIQUE constraint is the real guard
      }
    }, 600);
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

  const isBusinessSignup = selectedProfile === 'pos' || selectedProfile === 'custom';
  const sameCompanyName = (a: string, b: string) =>
    a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();
  const businessTaken = !ownCompany && businessName.trim() !== ''
    && companies.some(c => sameCompanyName(c.name, businessName));
  const businessValid = !!ownCompany || (businessName.trim().length >= 3 && !businessTaken);

  /**
   * Creates the owner's company and a "Matriz" branch once (idempotent across
   * Back/Next). sp_companies doesn't return the new id, so it's found again by
   * name — unambiguous because duplicate names are rejected first.
   */
  const ensureOwnCompany = async (): Promise<{ company: Company; branch: CompanyBranch | null }> => {
    if (ownCompany) return ownCompany;
    const name = businessName.trim().replace(/\s+/g, ' ');
    const before = await getAllCompanies();
    if (before.some(c => sameCompanyName(c.name, name))) {
      setCompanies(before);
      throw new Error('Ya existe un negocio con ese nombre. Agrega tu ciudad o colonia, o pide a su administrador que te agregue.');
    }
    console.log('[ensureOwnCompany] creating company name=%s', name);
    await createCompany(name);
    const after = await getAllCompanies();
    setCompanies(after);
    const company = after.find(c => sameCompanyName(c.name, name));
    if (!company?.companyId) throw new Error('No se pudo crear tu negocio. Intenta de nuevo.');

    let branch: CompanyBranch | null = null;
    try {
      await createBranch('Matriz', company.companyId);
      const list = await getBranchesByCompany(company.companyId);
      branch = list.find(b => b.name === 'Matriz') ?? list[0] ?? null;
    } catch (err) {
      console.warn('[ensureOwnCompany] default branch failed — company only', err);
    }
    console.log('[ensureOwnCompany] companyId=%d branchId=%s', company.companyId, branch?.branchId);
    const created = { company, branch };
    setOwnCompany(created);
    setSelectedCompany(company);
    setSelectedBranch(branch);
    return created;
  };

  const handleMenuResult = (r: BusinessMenuResult | null) => {
    setMenuResult(r);
    if (!r) return;
    // Add (never remove) what the menu shows the business needs.
    setEnabledModules(prev => [...prev, ...r.suggestedModules.filter(m => !prev.includes(m))]);
  };

  // For createUser: route to correct field based on detected type
  // Phone mode: the optional email, when it's a valid address.
  const optionalEmail   = contactMode === 'phone' && isEmailValid(optionalEmailInput) ? optionalEmailInput.trim() : '';
  const optionalEmailBad = contactMode === 'phone' && optionalEmailInput.trim() !== '' && !optionalEmail;
  const contactEmail    = contactType === 'email' ? contact.trim() : optionalEmail;
  const contactPhone    = contactType === 'phone' ? normalizePhone(contact) : '';

  // The phone actually usable for the dbo.clients row — either the original
  // contact (if it was a phone) or the one collected on step "Perfil" for an
  // email-only SmartLoans signup.
  const effectivePhone  = contactPhone || (loansPhone ? normalizePhone(loansPhone) : '');

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

  const contactValid = contactType !== 'unknown' && !optionalEmailBad;
  const step0Valid = contactValid && username.trim() && usernameCheck !== 'taken' && strength !== '' && password === confirmPassword
    && (!isBusinessSignup || businessValid);

  const selectProfile = (profile: AppProfile) => {
    console.log('[selectProfile] profile=%s modules=%o', profile.id, profile.modules);
    setSelectedProfile(profile.id);
    setEnabledModules(profile.id === 'custom' ? [] : [...profile.modules]);
    setUserRole(DEFAULT_ROLE_BY_PROFILE[profile.id] ?? 'employee');
  };

  // Preset the "Perfil" step from the service chosen in the finder, so that
  // step opens on the detail sub-question instead of asking the goal again.
  const applyService = (id: ServiceId) => {
    console.log('[applyService] service=%s', id);
    const profile = APP_PROFILES.find(p => p.id === (id === 'pos' ? 'pos' : 'customer'));
    if (profile) selectProfile(profile);
    setSelectedInterests(id === 'arcade' ? ['arcade'] : id === 'smartloans' ? ['loans'] : []);
    setService(id);
    setFinderDone(true);
  };

  useEffect(() => {
    if (urlService) applyService(urlService);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A goal is "on" only when every module it maps to is enabled; toggling it
  // adds or removes that goal's whole module group as a unit.
  const goalActive = (modules: string[]) => modules.every(m => enabledModules.includes(m));
  const toggleGoal = (modules: string[]) => {
    setEnabledModules(prev =>
      modules.every(m => prev.includes(m))
        ? prev.filter(m => !modules.includes(m))
        : [...prev, ...modules.filter(m => !prev.includes(m))]
    );
  };

  const markSaved = (s: number) =>
    setStepSaved(prev => { const n = [...prev]; n[s] = true; return n; });

  // Step 0 → create or continue with existing user, get userId, advance to profile
  const handleStep0Next = async () => {
    if (!step0Valid) { setMessage('Completa todos los campos correctamente.'); return; }
    setLoading(true);
    // Begin the registration trace — every backend call from here until
    // completion carries this X-Workflow-Id (see ObservabilityContext).
    startWorkflow('client_registration');
    console.log('[handleStep0Next] contact=%s type=%s existing=%o', contact, contactType, existingRecord);
    try {
      let uid: number | null = null;
      let isNewAccount = false; // true only when a brand-new user row is created
      // Which step to land on next — only existing accounts with an
      // incomplete registration resume anywhere but "Perfil" (step 1).
      let resumeAtStep = 1;

      // A new business owner's user is created already inside their company
      // (users.companyId is NOT NULL → companies) — not left on the default.
      const ownCompanyId = isBusinessSignup && !(existingRecord?.found && existingRecord.userId)
        ? (await ensureOwnCompany()).company.companyId
        : undefined;

      if (existingRecord?.found && existingRecord.userId) {
        // Existing user account → just update credentials (password reset / link)
        console.log('[handleStep0Next] updating existing userId=', existingRecord.userId);
        await updateUser(existingRecord.userId, { name: username, password });
        uid = existingRecord.userId;

        // Resume at the first incomplete step, prefilling whatever was
        // already saved so it isn't asked again.
        if (existingRecord.stepProfile === 1) {
          if (existingRecord.appProfile) {
            setSelectedProfile(existingRecord.appProfile);
            setUserRole(DEFAULT_ROLE_BY_PROFILE[existingRecord.appProfile] ?? 'employee');
          }
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
          email:     completeEmail.trim() || contactEmail || undefined,
          cellphone: contactPhone || undefined,
          name:      username,
          password,
          clientId:  existingRecord.clientId,
          companyId: ownCompanyId,
        });
        console.log('[handleStep0Next] createUser (linked) response', data);
        const rawUid = data.userId ?? data.id ?? (data as any).users?.[0]?.userId;
        uid = rawUid ? Number(rawUid) : null;
        isNewAccount = true;
        setCreatedClientId(existingRecord.clientId);

        // Client matched via phone and had no email on file — complete it.
        if (completeEmail.trim() || optionalEmail) {
          console.log('[handleStep0Next] completing client email=%s for clientId=%d', completeEmail, existingRecord.clientId);
          try {
            const [firstName, ...rest] = (existingRecord.firstName ? `${existingRecord.firstName} ${existingRecord.lastName ?? ''}` : username).trim().split(/\s+/);
            await createOrUpdateClient({
              clients: [{
                clientId: existingRecord.clientId,
                first_name: existingRecord.firstName || firstName || username.trim(),
                last_name:  existingRecord.lastName || rest.join(' ') || '-',
                cellphone:  existingRecord.cellphone || contactPhone,
                email:      completeEmail.trim() || optionalEmail,
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
          companyId: ownCompanyId,
        });
        console.log('[handleStep0Next] createUser response', data);
        const rawUid = data.userId ?? data.id ?? (data as any).users?.[0]?.userId;
        console.log('[handleStep0Next] extracted uid=', rawUid);
        uid = rawUid ? Number(rawUid) : null;
        isNewAccount = true;
        if (newClientId) setCreatedClientId(newClientId);
      }

      if (uid) setCreatedUserId(uid);

      // Send the new user their login username via their registration channel
      // (email or SMS). Best-effort — a messaging failure must not block signup.
      if (isNewAccount && uid) {
        const channel: 'email' | 'sms' = contactType === 'phone' ? 'sms' : 'email';
        sendAccountCreated(verifyTarget, username, channel).catch((e) =>
          console.warn('[handleStep0Next] account-created notice failed:', e));
      }

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
  // Client creation normally happens at step "Cuenta" (handleStep0Next),
  // alongside the user itself, for any signup with a phone. An email-only
  // signup that picks the 'customer' profile still needs a dbo.clients row
  // (clients.cellphone is NOT NULL + UNIQUE) — collected and created below.
  // Any customer interest needs a client row, not just SmartLoans, since
  // POS/Rewards/Arcade are all clientId-scoped capabilities too.
  const needsClientPhone = selectedProfile === 'customer' && selectedInterests.length > 0 && !createdClientId && !contactPhone;

  const handleStep1Next = async () => {
    if (!selectedProfile) { setMessage('Selecciona un perfil de aplicación.'); return; }
    if (selectedProfile === 'customer' && selectedInterests.length === 0) {
      setMessage('Elige al menos una opción de lo que te gustaría usar.');
      return;
    }
    if (needsClientPhone) {
      if (!isPhoneValid(loansPhone)) {
        setMessage('Ingresa un teléfono válido para continuar con SmartLoans.');
        return;
      }
      if (loansPhoneCheck !== 'available') {
        setMessage(loansPhoneCheck === 'taken' ? 'Este teléfono ya está registrado.' : 'Espera a que se verifique el teléfono.');
        return;
      }
    }
    setLoading(true);
    console.log('[handleStep1Next] userId=%d profile=%s modules=%o', createdUserId, selectedProfile, enabledModules);
    try {
      if (createdUserId) {
        const data = await updateUser(createdUserId, { appProfile: selectedProfile, enabledModules });
        console.log('[handleStep1Next] response', data);
      }

      if (needsClientPhone && createdUserId) {
        const [firstName, ...rest] = username.trim().split(/\s+/);
        const lastName = rest.join(' ') || '-';
        console.log('[handleStep1Next] creating client for SmartLoans (email-only signup), phone=%s', effectivePhone);
        try {
          await createOrUpdateClient({
            clients: [{
              clientId: 0,
              first_name: firstName || username.trim(),
              last_name: lastName,
              cellphone: effectivePhone,
              email: contactEmail,
              clientType,
              action: '1',
            }],
          });
          // sp_clients doesn't hand back the new clientId directly — re-fetch
          // and match by contact, same pattern used in handleStep0Next.
          const allClients = await getAllClients();
          const digits = (v: string) => v.replace(/\D/g, '');
          const match = allClients.find(c => digits(c.cellphone || '') === digits(effectivePhone));
          console.log('[handleStep1Next] client created, matched clientId=', match?.clientId);
          if (match) {
            setCreatedClientId(match.clientId);
            await updateUser(createdUserId, { clientId: match.clientId, cellphone: effectivePhone });
          }
        } catch (clientErr) {
          console.error('[handleStep1Next] client creation ERROR', clientErr);
          setMessage((clientErr as Error).message ?? 'Error al crear el registro de cliente.');
          return;
        }
      }

      // Persist the clientType='pos' default set above — the earlier
      // useEffect only updates in-memory state; handleStep3Submit's client
      // patch is gated on selectedCompany, which a plain customer (no
      // SmartLoans interest) never has, so without this the DB row is
      // silently left at whatever step "Cuenta" defaulted it to
      // ('borrower'). Caught by actually querying the live row after a
      // real signup, not assumed from the effect firing.
      const clientIdForTypePatch = createdClientId ?? existingRecord?.clientId;
      if (selectedProfile === 'customer' && !wantsLoans && clientIdForTypePatch) {
        const [firstName, ...rest] = username.trim().split(/\s+/);
        try {
          await createOrUpdateClient({
            clients: [{
              clientId: clientIdForTypePatch,
              first_name: existingRecord?.firstName || firstName || username.trim(),
              last_name: existingRecord?.lastName || rest.join(' ') || '-',
              cellphone: existingRecord?.cellphone || effectivePhone,
              email: existingRecord?.email || contactEmail,
              clientType: 'pos',
              action: '2',
            }],
          });
          console.log('[handleStep1Next] persisted clientType=pos for clientId=', clientIdForTypePatch);
        } catch (typeErr) {
          console.warn('[handleStep1Next] clientType=pos patch failed for clientId=', clientIdForTypePatch, typeErr);
        }
      }

      // POS/Rewards/Arcade interests ARE the capability — grant immediately,
      // no separate eligibility step (unlike SmartLoans). Only possible when
      // a companyId is already known for this client, which today only
      // happens for someone pre-registered through an actual POS sale
      // (existingRecord.companyId, set on their clients row by that
      // company's staff). A brand-new direct-download signup with no POS
      // history has no companyId to scope the capability to yet — skipped
      // here, not defaulted to a guessed company. clientCapabilities is
      // company-scoped by design (see sql/sp_clientCapabilities.sql); making
      // "interest before any company relationship" representable is a
      // separate, not-yet-made schema decision, not something to paper over.
      const grantCompanyId = existingRecord?.companyId;
      const clientIdForGrants = createdClientId ?? existingRecord?.clientId;
      if (selectedProfile === 'customer' && clientIdForGrants && grantCompanyId) {
        const toGrant = INTEREST_OPTIONS.filter(o => selectedInterests.includes(o.id) && o.capability);
        for (const opt of toGrant) {
          try {
            await grantClientCapability(grantCompanyId, clientIdForGrants, opt.capability!);
          } catch (capErr) {
            // Best-effort — a capability grant failure must not block signup;
            // it can be retried/backfilled later, same philosophy as the
            // comprobante-email pattern elsewhere in this codebase.
            console.warn('[handleStep1Next] grantClientCapability failed for', opt.capability, capErr);
          }
        }
      } else if (selectedProfile === 'customer') {
        console.log('[handleStep1Next] skipping capability grants — no companyId known yet for clientId=', clientIdForGrants);
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
    // A pure POS/Rewards/Arcade customer (no SmartLoans interest) has no
    // company/branch picker to fill out — see the third branch in
    // renderStep3 — so there's nothing to require here for that case.
    const isPlainCustomer = selectedProfile === 'customer' && !wantsLoans;
    console.log('[handleStep3Submit] isPlainCustomer=%s interests=%o userRole=%s', isPlainCustomer, selectedInterests, userRole);
    if (isBusinessSignup && !businessValid) { setMessage('Escribe el nombre de tu negocio.'); return; }
    if (!isPlainCustomer && !isBusinessSignup && !selectedCompany) { setMessage('Selecciona una empresa.'); return; }
    setLoading(true);
    console.log('[handleStep3Submit] userId=%d role=%s companyId=%d branchId=%d',
      createdUserId, userRole, selectedCompany?.companyId, selectedBranch?.branchId);
    try {
      // Owner-only business signup: always admin of their own company.
      const own = isBusinessSignup ? await ensureOwnCompany() : null;
      if (createdUserId) {
        const data = await updateUser(createdUserId, {
          roleCode:  own ? 'admin' : userRole,
          companyId: own?.company.companyId ?? selectedCompany?.companyId ?? 0,
          branchId:  own?.branch?.branchId ?? selectedBranch?.branchId ?? 0,
        });
        console.log('[handleStep3Submit] response', data);
      }

      const linkCompany = own?.company ?? selectedCompany;
      if (createdClientId && linkCompany?.companyId) {
        // sp_clients' UPDATE action overwrites first_name/last_name/cellphone/email
        // unconditionally (no NULLIF) — must resend the real values, not blanks,
        // or this patch would wipe the client stub created at step "Perfil".
        const [firstName, ...rest] = username.trim().split(/\s+/);
        const lastName = rest.join(' ') || '-';
        console.log('[handleStep3Submit] patching clientId=%d companyId=%d', createdClientId, linkCompany.companyId);
        try {
          const clientData = await createOrUpdateClient({
            clients: [{
              clientId: createdClientId,
              companyId: linkCompany.companyId,
              first_name: firstName || username.trim(),
              last_name: lastName,
              cellphone: effectivePhone,
              email: contactEmail,
              clientType,
              action: '2',
            }],
          });
          console.log('[handleStep3Submit] client companyId patch response', clientData);

          // Now that the client belongs to a company, record its memberships:
          // the SmartLoans type chosen at "Perfil" plus the ticked interests
          // (step "Perfil" could only grant those when a company was already
          // known). Grants are idempotent. Best-effort, like step "Perfil".
          if (selectedProfile === 'customer') {
            const caps: ClientCapability[] = [
              ...(wantsLoans ? SMARTLOANS_CAPS_BY_CLIENT_TYPE[clientType] : []),
              ...INTEREST_OPTIONS.filter(o => selectedInterests.includes(o.id) && o.capability).map(o => o.capability!),
            ];
            for (const capability of caps) {
              try {
                await grantClientCapability(linkCompany.companyId, createdClientId, capability);
              } catch (capErr) {
                console.warn('[handleStep3Submit] grantClientCapability failed for', capability, capErr);
              }
            }
          }
        } catch (clientErr) {
          console.error('[handleStep3Submit] client companyId patch ERROR', clientErr);
        }
      }

      markSaved(3);
      endWorkflow(); // Registration Completed — close the trace.
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
    console.log('[goBack] from step=%d branchScreen=%s q1=%d', step, branchScreen, q1);
    if (branchScreen) { setBranchScreen(false); return; }
    // Within "Perfil": from the detail screen, go back to the objetivo question
    // rather than leaving the step entirely.
    if (step === 1 && q1 === 1) { setQ1(0); return; }
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

  // Shared "Tipo de cliente" picker — rendered wherever a dbo.clients row is
  // about to be created, so clientType is always a real choice (never left
  // at its 'borrower' default) regardless of which signup path got here.
  const renderClientTypePicker = () => (
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
  );

  const renderBusinessName = () => (
    <div className="ca-business">
      <IonInput
        fill="outline" label="Nombre de tu negocio" labelPlacement="floating"
        type="text" value={ownCompany?.company.name ?? businessName} maxlength={100}
        disabled={!!ownCompany || loading}
        onIonInput={e => setBusinessName(e.detail.value || '')}
        className={businessTaken ? 'ion-invalid ion-touched' : ''}
        errorText={businessTaken ? 'Ya existe un negocio con ese nombre.' : undefined}
        helperText={ownCompany
          ? 'Tu negocio ya está creado.'
          : 'Serás el administrador. Después podrás agregar a tus empleados.'}
      />
      {businessTaken && (
        <p className="ca-business-hint">
          Si trabajas ahí, pide a su administrador que te agregue desde POS. Si es otro negocio,
          agrega tu ciudad o colonia (ej. “{businessName.trim()} Hermosillo”).
        </p>
      )}
    </div>
  );

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
        {/* Phone-first contact: the phone identifies the account; email is
            optional below. "email" mode only resumes older email signups. */}
        <div className="ca-contact-wrap">
          <IonInput
            fill="outline"
            label={contactMode === 'phone' ? 'Teléfono celular' : 'Email con el que te registraste'}
            labelPlacement="floating"
            type={contactMode === 'phone' ? 'tel' : 'email'}
            inputmode={contactMode === 'phone' ? 'tel' : 'email'}
            autocomplete={contactMode === 'phone' ? 'tel' : 'email'}
            value={contact}
            onIonInput={e => handleContactChange(e.detail.value || '')}
            className={contact && contactType === 'unknown' ? 'ion-invalid ion-touched' : ''}
            errorText={contactMode === 'phone'
              ? 'Ingresa tu celular a 10 dígitos (o con +código de país).'
              : 'Ingresa un email válido.'}
            helperText={contactMode === 'phone' ? 'Te enviaremos un código por SMS o WhatsApp.' : undefined}
          />
          {contact && contactType !== 'unknown' && (
            <span className={`ca-contact-badge ca-contact-badge--${contactType}`}>
              {contactType === 'email'
                ? '✉️ Email'
                : `📱 ${normalizePhone(contact)}`}
            </span>
          )}
        </div>

        {contactMode === 'phone' ? (
          <>
            <IonInput
              fill="outline" label="Email (opcional)" labelPlacement="floating"
              type="email" inputmode="email" autocomplete="email"
              value={optionalEmailInput}
              onIonInput={e => setOptionalEmailInput(e.detail.value || '')}
              className={optionalEmailBad ? 'ion-invalid ion-touched' : ''}
              errorText={optionalEmailBad ? 'Revisa el email o déjalo vacío.' : undefined}
              helperText="Para recibir tus comprobantes y recuperar tu cuenta."
            />
            <IonButton fill="clear" size="small" className="ca-contact-mode" onClick={() => switchContactMode('email')}>
              ¿Empezaste tu registro con email? Continúa aquí
            </IonButton>
          </>
        ) : (
          <IonButton fill="clear" size="small" className="ca-contact-mode" onClick={() => switchContactMode('phone')}>
            Registrarme con mi celular
          </IonButton>
        )}

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
                {!existingRecord.email && contactMode === 'email' && (
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

        {/* A dbo.clients row is created immediately for a new phone-based
            signup — let the client pick what kind of client they are
            instead of defaulting everyone to "Acreditado". (Email-first
            signups get the same picker later, in renderStep1, once we know
            they'll need a dbo.clients row for SmartLoans — see
            needsClientPhone.) */}
        {/* Only when a loan is (or may be) what they came for: not for a
            business owner, nor a customer who picked Juegos/POS in the finder. */}
        {contactCheck === 'new' && contactType === 'phone' && !isBusinessSignup
          && (selectedProfile !== 'customer' || wantsLoans) && renderClientTypePicker()}

        {isBusinessSignup && !(existingRecord?.found && existingRecord.userId) && renderBusinessName()}

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

  // Step "Perfil" as a quiz. q1 === 0 asks the objetivo and auto-advances on
  // tap; q1 === 1 shows only the detail for that objetivo. The footer "Next"
  // is hidden on q1 === 0 (the card tap is the answer) — see the render footer.
  const selectedProfileObj = APP_PROFILES.find(p => p.id === selectedProfile);

  const renderStep1Intent = () => (
    <div className="ca-step-body">
      <div className="ca-step-header">
        <div className="ca-step-icon-wrap" style={{ background: '#F5F3FF' }}>
          <IonIcon icon={buildOutline} style={{ fontSize: 36, color: '#7c3aed' }} />
        </div>
        <h2 className="ca-step-title">¿Qué quieres hacer?</h2>
        <p className="ca-step-desc">Elige tu objetivo — configuramos el resto por ti.</p>
      </div>

      {/* Objetivo — tapping a card answers and advances to its detail. */}
      <div className="ca-profile-list">
        {APP_PROFILES.map(p => {
          const selected = selectedProfile === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`ca-profile-btn${selected ? ' selected' : ''}`}
              style={selected ? { borderColor: p.color, background: p.bgColor } : undefined}
              onClick={() => { selectProfile(p); setQ1(1); }}
            >
              <div className="ca-profile-icon-wrap" style={selected ? { background: p.bgColor, color: p.color } : undefined}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
              </div>
              <div className="ca-profile-text">
                <span className="ca-profile-name" style={selected ? { color: p.color } : undefined}>{p.intent}</span>
                <span className="ca-profile-desc">{p.description}</span>
              </div>
              <div className={`ca-radio-dot${selected ? ' selected' : ''}`}
                style={selected ? { borderColor: p.color, background: p.color } : undefined} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep1Detail = () => (
    <div className="ca-step-body">
      <div className="ca-step-header">
        <div className="ca-step-icon-wrap" style={{ background: selectedProfileObj?.bgColor ?? '#F5F3FF' }}>
          <span style={{ fontSize: 30 }}>{selectedProfileObj?.icon ?? '🔧'}</span>
        </div>
        <h2 className="ca-step-title">
          {selectedProfile === 'customer' ? '¿Qué te gustaría usar?'
            : selectedProfile === 'custom' ? '¿Qué necesitas hacer?'
            : 'Esto es lo que incluye'}
        </h2>
        <p className="ca-step-desc">
          {selectedProfile === 'customer' ? 'Marca lo que te interese — puedes agregar más después.'
            : selectedProfile === 'custom' ? 'Marca todo lo que apliques.'
            : 'Listo para continuar.'}
        </p>
      </div>

      {/* GMO customer: what they want to use — multi-select, not exclusive.
          Checking a box is an expression of interest; for POS/Rewards/Arcade
          that interest IS the capability (granted in handleStep1Next). For
          SmartLoans it only reveals the borrower/lender/lawyer question
          below — that's the actual authorization decision, kept separate on
          purpose so picking SmartLoans never silently makes someone a
          borrower. */}
      {selectedProfile === 'customer' && (
        <div className="ca-modules-custom">
          <div className="ca-module-list">
            {INTEREST_OPTIONS.map(opt => {
              const checked = selectedInterests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`ca-module-btn${checked ? ' checked' : ''}`}
                  onClick={() => setSelectedInterests(prev => {
                    const next = prev.includes(opt.id) ? prev.filter(i => i !== opt.id) : [...prev, opt.id];
                    console.log('[interests] toggled=%s next=%o', opt.id, next);
                    return next;
                  })}
                >
                  <div className={`ca-checkbox-box${checked ? ' checked' : ''}`}>
                    {checked && <IonIcon icon={checkmark} />}
                  </div>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{opt.icon}</span>
                  <span className="ca-module-label">{opt.label} — {opt.desc}</span>
                </button>
              );
            })}
            {/* Informational only — Factory AI is Factory AI GMO's own separate
                commercial-platform product (a different tenancy model
                entirely, see posgmo-factory/decision_registry ADR-003), not a
                capability this account model grants. Shown as an offering,
                not a checkbox, per the "don't pretend they already have
                access" principle. */}
            <div className="ca-module-btn" style={{ opacity: 0.55, cursor: 'default' }}>
              <div className="ca-checkbox-box" />
              <span style={{ fontSize: 18, marginRight: 8 }}>🏭</span>
              <span className="ca-module-label">Factory AI — próximamente</span>
            </div>
          </div>
        </div>
      )}

      {/* SmartLoans: client type (and, for an email-only signup, the phone a
          dbo.clients row needs). clientType drives the derived roleCode. */}
      {selectedProfile === 'customer' && wantsLoans && renderClientTypePicker()}
      {selectedProfile === 'customer' && needsClientPhone && (
        <div className="ca-form-fields" style={{ marginTop: 16, marginBottom: 4 }}>
          <IonInput
            fill="outline" label="Teléfono (requerido para SmartLoans)" labelPlacement="floating"
            type="tel" value={loansPhone}
            onIonInput={e => handleLoansPhoneChange(e.detail.value || '')}
            className={(loansPhone && !isPhoneValid(loansPhone)) || loansPhoneCheck === 'taken' ? 'ion-invalid ion-touched' : ''}
            errorText={
              loansPhone && !isPhoneValid(loansPhone) ? 'Ingresa un teléfono válido.'
              : loansPhoneCheck === 'taken' ? 'Este teléfono ya está registrado.'
              : undefined
            }
          />
          {loansPhoneCheck === 'checking' && (
            <div className="ca-lookup-row">
              <IonSpinner name="crescent" style={{ width: 14, height: 14 }} />
              <span>Verificando disponibilidad…</span>
            </div>
          )}
          {loansPhoneCheck === 'available' && (
            <div className="ca-lookup-row" style={{ color: '#059669' }}>
              <IonIcon icon={checkmark} style={{ fontSize: 14 }} />
              <span>Teléfono disponible</span>
            </div>
          )}
        </div>
      )}

      {/* Custom goal picker — outcome-first cards; each goal maps to a module
          group (MODULE_GOALS), and the union becomes enabledModules. */}
      {selectedProfile === 'custom' && (
        <div className="ca-modules-custom">
          <div className="ca-modules-custom-header">
            <p className="ca-modules-title">Objetivos</p>
            <label className="ca-select-all-label">
              <input
                type="checkbox"
                checked={enabledModules.length === ALL_MODULES.length}
                ref={el => { if (el) el.indeterminate = enabledModules.length > 0 && enabledModules.length < ALL_MODULES.length; }}
                onChange={e => setEnabledModules(e.target.checked ? ALL_MODULES.map(m => m.id) : [])}
              />
              <span>Todo</span>
            </label>
          </div>
          <div className="ca-module-list">
            {MODULE_GOALS.map(g => {
              const checked = goalActive(g.modules);
              return (
                <button
                  key={g.label}
                  type="button"
                  className={`ca-module-btn${checked ? ' checked' : ''}`}
                  onClick={() => toggleGoal(g.modules)}
                >
                  <div className={`ca-checkbox-box${checked ? ' checked' : ''}`}>
                    {checked && <IonIcon icon={checkmark} />}
                  </div>
                  <span className="ca-module-label">{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Included-modules summary — for objetivos with a fixed bundle
          ('customer' has no module bundle, it has interests instead). */}
      {selectedProfile && selectedProfile !== 'custom' && selectedProfile !== 'customer' && (
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

      {isBusinessSignup && (
        <BusinessMenuView
          businessName={ownCompany?.company.name ?? businessName}
          result={menuResult}
          onResult={handleMenuResult}
          moduleLabel={id => ALL_MODULES.find(m => m.id === id)?.label ?? id}
        />
      )}
    </div>
  );

  const renderStep1 = () => (q1 === 0 ? renderStep1Intent() : renderStep1Detail());

  // ── Step 3: Role + company (Acceso) ──────────────────────────────────────

  const renderStep3 = () => {
    return (
      <div className="ca-step-body">
        <div className="ca-step-header">
          <div className="ca-step-icon-wrap" style={{ background: '#F0FDF4' }}>
            <IonIcon icon={lockClosedOutline} style={{ fontSize: 36, color: '#059669' }} />
          </div>
          <h2 className="ca-step-title">Acceso y empresa</h2>
          <p className="ca-step-desc">Define el rol y vincula la empresa.</p>
        </div>

        {/* Role — SmartLoans derives it from the client type picked in step
            "Perfil" (see ROLE_BY_CLIENT_TYPE), so here we only CONFIRM it
            instead of asking the borrower/lender question again. A plain
            GMO customer (no SmartLoans interest) has no role question at
            all — 'pos' isn't a choice, it's what the interests they
            already picked mean. POS/custom staff still choose their role
            freely, where role ≠ client type. */}
        <p className="ca-section-label">Rol de acceso:</p>
        {isBusinessSignup ? (
          <div className="ca-business-access">
            {!ownCompany && renderBusinessName()}
            <div className="ca-summary-box">
              <div className="ca-summary-row"><span>Rol</span><strong>{ROLE_LABELS.admin} (dueño)</strong></div>
              <div className="ca-summary-row"><span>Negocio</span><strong>{ownCompany?.company.name ?? (businessName.trim() || '—')}</strong></div>
              <div className="ca-summary-row"><span>Sucursal</span><strong>{ownCompany?.branch?.name ?? 'Matriz'}</strong></div>
            </div>
          </div>
        ) : selectedProfile === 'customer' && wantsLoans ? (
          <div className="ca-summary-box" style={{ marginBottom: 20 }}>
            <div className="ca-summary-row">
              <span>Rol</span>
              <strong>{ROLE_LABELS[userRole] ?? userRole}</strong>
            </div>
            <div className="ca-summary-row">
              <span>Según tu tipo de cliente</span>
              <strong>{CLIENT_TYPES.find(t => t.id === clientType)?.label ?? '—'}</strong>
            </div>
          </div>
        ) : selectedProfile === 'customer' ? (
          <div className="ca-summary-box" style={{ marginBottom: 20 }}>
            <div className="ca-summary-row">
              <span>Lo que usarás</span>
              <strong>
                {INTEREST_OPTIONS.filter(o => selectedInterests.includes(o.id)).map(o => o.label).join(', ') || '—'}
              </strong>
            </div>
          </div>
        ) : null}

        {/* Company / branch — SmartLoans interest is scoped to the SmartLoans
            company only, auto-selected above, so there's nothing to pick.
            A plain customer (POS/Rewards/Arcade, no SmartLoans) isn't tied
            to any one company at signup either — see handleStep1Next's
            grant-skip note — so there's nothing to pick for them here. */}
        {selectedProfile === 'customer' && wantsLoans ? (
          <div className="ca-summary-box" style={{ marginBottom: 20 }}>
            <div className="ca-summary-row"><span>Empresa</span><strong>{selectedCompany?.name ?? 'SmartLoans'}</strong></div>
            <div className="ca-summary-row"><span>Sucursal</span><strong>{selectedBranch?.name ?? '—'}</strong></div>
          </div>
        ) : null}

        {/* Summary — the 'customer' profile already showed its own "Lo que
            usarás"/role/company summaries above (module count and
            ROLE_GROUPS.custom labels don't apply to it: it has no module
            bundle, and roleCode 'pos' isn't in ROLE_GROUPS.custom). */}
        <div className="ca-summary-box">
          <div className="ca-summary-row"><span>Perfil</span><strong>{APP_PROFILES.find(p => p.id === selectedProfile)?.label}</strong></div>
          {selectedProfile !== 'customer' && (
            <>
              <div className="ca-summary-row"><span>Módulos activos</span><strong>{enabledModules.length}</strong></div>
            </>
          )}
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
          position="bottom"
        />

        {!finderDone && (
          <div className="ca-page-wrap">
            <ServiceFinderView onContinueHere={applyService} onResume={() => setFinderDone(true)} />
          </div>
        )}

        {finderDone && <div className="ca-page-wrap">
          <StepBar />
          {step === 0 && service && (
            <div className="ca-service-chip-row">
              <IonChip outline onClick={() => setFinderDone(false)} disabled={loading}>
                <IonIcon icon={SERVICES[service].icon} />
                <IonLabel>Registro para {SERVICES[service].label} · Cambiar</IonLabel>
              </IonChip>
            </div>
          )}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <div style={{ height: 100 }} />
        </div>}
      </IonContent>

      {/* Step 2 (verify) has its own inline buttons — no footer */}
      {finderDone && step !== 2 && (
        <IonFooter className="ca-footer">
          <div className="ca-footer-inner">
            {step > 0 && (
              <button type="button" className="ca-btn-back" onClick={goBack} disabled={loading}>
                <IonIcon icon={chevronBack} />
                <span>Atrás</span>
              </button>
            )}
            {/* Step 0 and the "Perfil" detail sub-step use footer Next; the
                objetivo question (step 1, q1 === 0) advances on card tap, and
                step 3 has its own submit inside render. */}
            {(step === 0 || (step === 1 && q1 === 1)) && (
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
