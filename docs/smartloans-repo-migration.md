# SmartLoans → repo propio: análisis de módulos

**Fecha:** 2026-11-18 · **Origen:** `POSVending` (rama `development`) · **Destino:** `~/PycharmProjects/smartLoans/smartloans` (GitHub `montanogilberto/smartloans`)

**Alcance:** se migra solo el **frontend**. Los backends no cambian: `smartloans_backend` (`API_BASE_URL`) y
`LoanAgents_SmartLoans` (`loanagents-smartloans.azurewebsites.net`) siguen igual; la app nueva consume los mismos endpoints.

El inventario sale de un análisis del grafo de imports (cierre transitivo desde cada página SmartLoans), más una
revisión de cada módulo: de qué depende, quién más lo usa, flujos, endpoints, deuda contra `CLAUDE.md` y riesgos.

---

## 0. Resumen

| # | Módulo | Archivos principales | Líneas | Destino | Estado del código |
|---|---|---|---|---|---|
| 1 | Clientes (alta por staff) | `pages/clients/ClientsPage.tsx` | 2 256 | **Se queda en POS** | Mezcla POS + SmartLoans |
| 2 | Wizards (onboarding) | `ClientFaceRecognitionPage`, `BorrowerOnboarding/`, `Enrollment/` | ~2 000 | Mover | Hay 3 wizards que se traslapan |
| 3 | KYC | `components/kyc/*`, utils de cara/OCR, `ExpedienteDigitalPage` | ~3 000 | Copiar | Compartido con POS |
| 4 | Contratos | `documents/contract.ts`, `pagare.ts`, `contractPdf.ts`, `digitalContractsApi` | ~600 | Mover | Hay 2 formas de crear contratos (ver 4.3) |
| 5 | Stripe | `components/payments/*`, `stripeApi`, `LoanPaymentPage` | ~1 900 | Mover (parcial) | Varios `fetch` sueltos y llave con valor por defecto |
| 6 | Pagos (SPEI / no custodio) | `bankingApi`, `installmentsApi`, `BankAccountLink`, flujo de fondeo | ~1 000 + dentro de páginas | Mover | Lógica embebida en páginas grandes |
| 7 | Dashboard acreditado | `ClientDashboardPage.tsx` | 1 898 | Mover + dividir en MVVM | 8 `fetch`, 34 `style={{}}` |
| 8 | Dashboard prestamista | `LenderDashboard/` | ~900 | Mover | Ya en MVVM ✅ |
| 9 | P2P (marketplace) | `P2PLendingPage.tsx` | 2 392 | Mover + dividir en MVVM | 11 `fetch` |
| 10 | Préstamos y chat | `MyLoans/`, `LoanDetailPage`, `LoanChatPage`, `LoanChatListPage`, `LoanPage` | ~2 400 | Mover | `LoanPage` es de staff |
| 11 | Jurídico | `juridical/` | 235 | Mover | MVVM ✅, funcionalidad mínima |
| 12 | Agentes IA | 6 APIs de agentes + `LoanAgents_SmartLoans` | — | Copiar las APIs | URL del agente fija en el código |
| 13 | Plataforma | auth, perfil, notificaciones, shell, utils | ~14 300 | Copiar | — |

**Total aproximado a mover/copiar:** ~38k líneas (18.8k solo SmartLoans, 5.6k compartidas con POS, 14.3k de plataforma).

---

## Paso previo: el repo destino usa otra versión mayor

El repo `smartloans` es el starter en blanco de Ionic (solo `Home.tsx`):

| | POSVending | smartloans | Impacto |
|---|---|---|---|
| `@ionic/react` | ^8.5 | ^9.0 | Cambios incompatibles de Ionic 9 |
| `@capacitor/*` | 7.4 | 8.x | Los plugins de la comunidad (biometric, speech, TTS) tienen que soportar Cap 8 |
| `react-router-dom` | **^5.3** | **^6.30** | **159 usos** de API v5 (`useHistory`, `<Redirect>`, `history.push`…) en **33 archivos** |
| `appId` | `com.factoryAI.gmo` | `io.ionic.starter` | Hay que definir el bundle id real |

**✅ Decidido (2026-11-18):** el destino usa las **mismas versiones que POS**: `@ionic/react` / `@ionic/react-router` ^8, `@capacitor/*` 7.4.x,
`react-router-dom` ^5.3 (quitar `react-router` v6), `react`/`react-dom` 19.1.1. El código se mueve 1:1, sin cambiar lógica (`CLAUDE.md` §10).
Subir a Ionic 9 / Cap 8 / router v6 será un PR aparte, cuando la app nueva ya esté en producción.

---

## Estructura de carpetas del repo nuevo (según Agent_POSGMO)

Misma convención que `Agent_POSGMO` (`frontend_layout.py`, `Conventions/repo_conventions.json`) y el `CLAUDE.md` de POS:
cada pantalla es `pages/{area}/{Feature}Page.tsx` (shell del router) más una carpeta `pages/{area}/{Feature}/` que contiene todo lo privado
de esa pantalla: `{Feature}View.tsx`, `{Feature}Logic.ts`, `{Feature}Types.ts` / `{Feature}Constants.ts` / `{Feature}Api.ts`, `{Feature}.css`,
`components/` y `documents/`. Lo que comparten dos o más pantallas sube a las capas comunes: `api/`, `components/{dominio}/`, `contexts/`, `hooks/`, `utils/`.
Las carpetas van en minúsculas; la única excepción es la carpeta de la pantalla (`{Feature}`), en PascalCase.

```
src/
├── api/                       {module}Api.ts compartidos (loanApi, bankingApi, stripeApi, clientFaceRecognitionApi,
│                              digitalContractsApi, loanMarketplaceApi, installmentsApi, loanChatApi, agentes IA…)
├── components/
│   ├── ui/                    ✅ PinInput, CountryPhoneInput · EmptyState, StatusBadge, PageLoading…
│   ├── routing/               ✅ PrivateRoute
│   ├── layout/                Header, barras inferiores (acreditado / prestamista)
│   ├── kyc/                   GuidedDocumentCapture, FaceLivenessCapture, PresenceCapture, SignaturePad…
│   ├── payments/              NativeConnectOnboarding, SavedCardSetup, BankAccountLink
│   └── loans/                 LoanCompletionRing
├── contexts/                  ✅ UserContext, ObservabilityContext
├── config/                    ✅ rolePermissions
├── hooks/                     ✅ useToast · usePopovers, useFundingFlow (sección 6)
├── utils/                     ✅ appEnv, observability, sessionTokens, biometricAuth, pin, phone, smartLoansLanding…
│                              · faceLiveness, idOcr, contractPdf, stripeFee, format, refreshBus
├── theme/
└── pages/
    ├── authentication/        ✅ LoginPage.tsx + Login/ (View, Logic, Constants, Login.css, components/ClientPhoneLogin*)
    ├── session/               ✅ InicioPage.tsx + Inicio/ · PendingModulePage.tsx + PendingModule/ (temporal)
    ├── onboarding/            BorrowerOnboarding/ (+ documents/) · KycVerification/ (hoy ClientFaceRecognitionPage) · Enrollment/
    ├── dashboard/             BorrowerDashboard/ (hoy ClientDashboardPage, se divide) · LenderDashboard/
    ├── loans/                 P2PLending/ · MyLoans/ · LoanDetail/ · LoanPayment/ · LoanChat/ · LoanChatList/
    ├── clients/               Expediente/ (hoy ExpedienteDigitalPage)
    ├── juridical/             JuridicalDashboard/
    ├── profile/               Profile/
    └── messaging/             NotificationsInbox/ · NotificationDetail/
```

✅ = ya existe en el repo nuevo (2026-11-18).

Los textos legales (`contract.ts`, `pagare.ts`) viven en `onboarding/BorrowerOnboarding/documents/`. Como también los usa Jurídico,
la regla de promoción de `CLAUDE.md` §3 pide subirlos a una carpeta compartida cuando se migre Jurídico. Las rutas no cambian
(`/client-dashboard/:clientId`, `/lender-dashboard/:clientId`, …); solo cambia dónde vive el código.

---

## 1. Clientes (alta por staff)

**Qué es:** `ClientsPage.tsx` (`/clients`, staff). Lista de clientes más un **wizard de 7 pasos**:
`Cliente → Código QR → Documento → Captura → Verificación → Contrato → Cuenta`.
Asigna los productos del cliente (`clientCapabilities`): POS, REWARDS, ARCADE, **SMARTLOANS_BORROWER / LENDER / JURIDICAL**, FACTORY_AI.
Para clientes que solo son POS, el wizard termina en el QR (`handleFinishWithoutKyc`). Para SmartLoans sigue con KYC, contrato y Stripe.

**Dependencias SmartLoans:** los 5 componentes KYC, `faceLiveness`, `idOcr`, `signatureCrop`, `LoanCompletionRing`,
`SavedCardSetup`, `StripeAccountOnboarding`, `clientFaceRecognitionApi.submitContract…`, `clientCapabilitiesApi`.

**Decisión:** **se queda en POS**. Es una herramienta de staff y ahí se dan de alta clientes de todos los productos.
Por eso todo lo de KYC que usa se **copia**, no se mueve (ver 3).

**Deuda / riesgos encontrados:**
- Tiene `fetch()` dentro de la página (`stripeCreateAccount`, `stripeGetAccountStatus`), lo que viola `CLAUDE.md` §5.
- ⚠️ **El contrato que se guarda es de relleno:** `contractPdfBase64: btoa('Contrato de crédito aceptado electrónicamente')`
  y lo mismo con el pagaré. En cambio, `ClientFaceRecognitionPage` sí genera el PDF real con `contractPdf.ts`.
  Los expedientes dados de alta por staff no tienen el contrato real. Hay que corregirlo en POS; no bloquea la migración.
- Usa `StripeAccountOnboarding` (Connect embebido, hospedado por Stripe). Es el flujo que se está retirando (ver 5).

---

## 2. Wizards de onboarding

Hoy hay **tres** wizards SmartLoans, más el alta por staff:

| Wizard | Ruta | Pasos | Se abre desde | Termina en |
|---|---|---|---|---|
| **KYC autoservicio** — `ClientFaceRecognitionPage.tsx` (1 621 líneas, monolito) | `/clientFaceRecognitions` (state `{clientId, continueToPayments}`) | Cliente y documento → Captura → Verificación → Contrato → Firma → *(Pagos)* | `ClientDashboardPage` (l. 524), `LenderDashboardLogic` (l. 67) | `submitContractClientFaceRecognition` con PDFs reales (`generateContractPdfBase64` / `generatePagarePdfBase64`), `SavedCardSetup`, `NativeConnectOnboarding` |
| **Onboarding acreditado** — `BorrowerOnboarding/` (MVVM ✅, plantilla del proyecto) | `/borrower-onboarding` | Biometría → Pagaré → Contrato | `P2PLendingPage` cuando `!profileComplete` (l. 619, 1452, 1463, 1662) | `updateClientFaceRecognition` + `POST /signatures/upload` |
| **Enrolamiento de producto** — `Enrollment/` (MVVM ✅) | `/enroll/:product` | Aceptar → otorgar capability | `DiscoverProductModal` (menú lateral) | `grantClientCapability` + `notifyDataChanged` |

**Observaciones:**
- KYC autoservicio y BorrowerOnboarding hacen **la misma captura y firma dos veces**, con código distinto.
  En la app nueva conviene un solo flujo: **Enrolar → KYC (captura/verificación) → Pagaré + Contrato + Firma → Pagos (Connect / tarjeta)**.
  No mezclarlo con la migración: primero mover tal cual y unificar en un PR posterior.
- `ClientFaceRecognitionPage` debe pasar a MVVM (supera por mucho las ~200 líneas). Tiene 10 `style={{}}` y 22 elementos HTML crudos (`<button>`, `<input>`…), lo que viola §4.
- Lógica de reanudar: el wizard retoma en `resumeStep` según el registro existente. Hay que conservar ese comportamiento.
- `Enrollment` también sirve a Factory AI (`/enroll/factory`). En SmartLoans, limitarlo a `borrower | lender | juridical`.

---

## 3. KYC

| Pieza | Archivo | Líneas | También lo usa POS |
|---|---|---|---|
| Captura guiada de INE (frente/reverso) | `components/kyc/GuidedDocumentCapture.tsx` + `utils/documentCaptureAnalysis.ts` | 686 + 445 | ClientsPage |
| Prueba de vida + selfie | `components/kyc/FaceLivenessCapture.tsx` + `utils/faceLiveness.ts` (`@vladmandic/face-api`) | 543 + 412 | ClientsPage |
| Presencia (video + GPS) | `components/kyc/PresenceCapture.tsx` | 197 | ClientsPage |
| Firma | `components/kyc/SignaturePad.tsx` + `utils/signatureCrop.ts` | 135 + 52 | ClientsPage |
| OCR de INE | `utils/idOcr.ts` → **agente** `POST /extract-id-fields` + `IdExtractedFieldsSummary.tsx` | 151 + 71 | ClientsPage |
| Prellenado Connect | `utils/kycPrefill.ts` | 248 | — (solo SmartLoans) |
| Veredicto remoto de cara | `api/faceValidationApi.ts` → **agente** `POST /validate-face` | 119 | — |
| Registro KYC | `api/clientFaceRecognitionApi.ts` (`/clientFaceRecognitions`, `/api/clientFaceRecognition/{upload-image,upload-presence,contract}`, `/api/geocode/reverse`) | 276 | ClientsPage, ClientDashboardPOS, ClientsMap, Profile |
| Vista del expediente | `pages/clients/ExpedienteDigitalPage.tsx` (`/client-expediente/:id`) | 274 | Se abre desde ClientsPage (staff) **y** ClientDashboard |

**Assets:** `public/models/face-api/` (modelos de face-api). Sin ellos la prueba de vida falla en tiempo de ejecución.

**Regla de negocio que hay que conservar:** el KYC extrae datos de la INE y verifica prueba de vida; no es forense.
El veredicto del agente remoto es **orientativo**: si la comparación local coincide, se continúa.

**Plan:** copiar el bloque completo a la app nueva. A mediano plazo, extraerlo a un paquete compartido (`@gmo/kyc`) para no mantener dos copias de ~3k líneas.

---

## 4. Contratos

### 4.1 Piezas
| Pieza | Archivo | Uso |
|---|---|---|
| Texto del contrato P2P | `pages/loans/BorrowerOnboarding/documents/contract.ts` | BorrowerOnboarding (ContractStep), Jurídico (plantillas) |
| Texto del pagaré (LGTOC arts. 170-174) | `.../documents/pagare.ts` | BorrowerOnboarding (PagareStep), Jurídico |
| Generación de PDF (`jspdf`) | `utils/contractPdf.ts` | **Solo** `ClientFaceRecognitionPage` |
| Contratos por préstamo | `api/digitalContractsApi.ts` → `createLoanContract` / `listContractsForClient` (`/digitalContracts`) | Se crean en `P2PLendingPage` (l. 787) y `LoanChatPage` (l. 518) al cerrar un préstamo. Se listan en MyLoans, LoanDetail, LenderDashboard y Perfil (`ContractsCard`) |
| Firma | `BorrowerOnboardingApi.uploadSignatureBlob` → `POST /signatures/upload` | BorrowerOnboarding |

### 4.2 Dos tipos de contrato
1. **Contrato marco + pagaré del cliente** (KYC): se firma una vez y se guarda en `clientFaceRecognitions`.
2. **Contrato por préstamo** (`digitalContracts`): se crea cuando se acepta una propuesta, desde P2P o desde el chat.

### 4.3 Hallazgos
- El alta por staff (`ClientsPage`) guarda PDFs de relleno (ver 1).
- El agente `POST /contract` de LoanAgents **no tiene quien lo llame**: ni el backend ni el frontend lo usan. Decidir si se conecta (genera el contrato cuando una conversación llega a `accepted`) o se elimina.
- **Plan:** mover `documents/` a `src/pages/loans/contracts/` (o `src/documents/`) en la app nueva, porque lo comparten Onboarding y Jurídico.

---

## 5. Stripe

**Configuración:** `VITE_STRIPE_PUBLISHABLE_KEY`. Está leída en **6 archivos**, cada uno con el valor por defecto `'pk_test_YOUR_PUBLISHABLE_KEY'`.
En la app nueva conviene centralizarla en `utils/appEnv.ts` y fallar en voz alta si no está definida.

| Pieza | Qué hace | Quién la usa | ¿Se migra? |
|---|---|---|---|
| `api/stripeApi.ts` | Estado y alta de Connect, KYC Connect, cuenta bancaria externa, tarjeta guardada | Dashboards, Perfil, NativeConnectOnboarding | ✅ |
| `components/payments/NativeConnectOnboarding.tsx` | Connect **Custom nativo** (identidad + cuenta de pago), sin redirección | LoanPayment, KYC autoservicio, ClientDashboard, Lender `PaymentsCard` | ✅ (solo SmartLoans) |
| `components/payments/SavedCardSetup.tsx` | Guarda tarjeta (SetupIntent) para cuotas automáticas | KYC autoservicio, ClientsPage | ✅ copiar |
| `pages/loans/LoanPaymentPage.tsx` (`/payment?mode=top_up\|repayment`) | Payment Element → `/stripe/payment-intents` → `/confirm` | P2P (l. 281, 284), LoanChat (l. 709) | ✅ |
| `components/payments/StripeAccountOnboarding.tsx` | Connect **embebido** de Stripe (`@stripe/connect-js`) | Solo ClientsPage | ❌ es el flujo que se retira |
| `StripePaySheet.tsx`, `hooks/useSaveCardPrompt.ts` | Recargas de saldo POS | MyQr, ClientDashboardPOS | ❌ solo POS |
| `utils/stripeFee.ts` | Comisión 3.6% + $3 + IVA | **Nadie lo importa** | ✅ y usarlo |

**`fetch` sueltos que hay que pasar a `stripeApi.ts`:**
- `ClientDashboardPage`: `/stripe/transactions`, `/stripe/payment-intents`, `/stripe/withdraw`, `/automated-payments/saved-method`.
- `P2PLendingPage`: `/stripe/withdraw`, `/automated-payments/saved-method`.
- `LoanPaymentPage`: `/stripe/payment-intents`, `/stripe/payment-intents/confirm`, `/stripe/connected-accounts/status`.

**Reglas que no se pueden romper al migrar (`CLAUDE.md` §7):**
- El Payment Element debe **seguir montado** durante `stripe.confirmPayment()`. `LoanPaymentPage` ya lo respeta (l. 283); no cambiar el orden de pasos.
- Mostrar siempre la comisión y el **neto**. El neto real viene de `tx.netCreditedMXN`; la fórmula es solo respaldo.
  `LoanPaymentPage` declara su propio `const stripeFee` (l. 124) en lugar de usar `utils/stripeFee.ts`.
- **El principal de un préstamo nunca se fondea por Stripe**, solo por SPEI (`LoanChatPage` l. 555-560). Stripe sirve para recargas y cuotas con tarjeta.
- Cada cargo exitoso envía el comprobante por correo (lo hace el backend).

**Paquetes:** `@stripe/stripe-js`, `@stripe/react-stripe-js`. **No** llevar `@stripe/connect-js` ni `@stripe/react-connect-js`.

---

## 6. Pagos (SPEI, no custodio)

Modelo: SmartLoans **nunca** recibe, guarda ni transfiere dinero. Es SPEI directo entre prestamista y acreditado;
la confirmación es por consenso más evidencia (RFC-002, `docs/p2p-direct-payments-architecture.md`). **Nunca se confirma dinero automáticamente.**

| Pieza | Endpoints / funciones | Dónde vive hoy |
|---|---|---|
| `api/bankingApi.ts` (300) | `listBankAccounts`, `bank-account/{link,verify}`, `ledgerBalance`, `ledgerStatement`, `postLedgerEntry`, `disbursePayment`, `isNonCustodialFundingEnabled` (`/featureFlags`), `snapshotBankAccountsForLoan`, `createFundingIntent`, `declareFunding`, `confirmFunding`, `rejectFunding`, `listFundingIntents`, `getFundingByLoan`, `revealCounterpartyBankAccount`, `submitTransferEvidence`, `uploadTransferEvidenceImage`, `validateTransferEvidence` | Compartido: POS lo usa para el monedero de lavandería y ClientDashboardPOS → **copiar** |
| `api/installmentsApi.ts` | `fetchInstallmentSchedule` (`/automated-payments/schedule`), `payInstallmentSpei` (`/automated-payments/pay-spei`) | ClientDashboard (pestaña Pagos), LoanDetail |
| `components/payments/BankAccountLink.tsx` | Alta y verificación de CLABE | ClientDashboard, P2P |
| Fondeo (declarar → evidencia → validar → confirmar/rechazar) | bankingApi + agente `/validate-transfer-evidence` | **Duplicado** en `P2PLendingPage` (l. 338, 752, 975) y `LoanDetailPage` |
| Retiro a banco | `/stripe/withdraw` (alternativa), SPEI como vía principal | ClientDashboard, P2P |
| Herramientas de prueba | `SHOW_BANKING_TEST_TOOLS = false` (depósito SPEI simulado) | P2P l. 43, ClientDashboard l. 78 |

**Plan:** al dividir P2P y ClientDashboard en MVVM, sacar el flujo de fondeo a un hook compartido (`useFundingFlow`) para que P2P y LoanDetail usen el mismo código.
Cada mutación debe llamar `notifyDataChanged()`. P2P ya lo hace en 12 lugares y LoanDetail en 4; mantenerlo.

---

## 7. Dashboard del acreditado — `ClientDashboardPage.tsx` (`/client-dashboard/:clientId`)

- **1 898 líneas en un solo archivo.** Pestañas `home | loans | payments | activity | profile`, controladas por `?tab=` desde la barra inferior del shell.
- **APIs:** `clientDashboardApi`, `loanApi`, `loanMarketplaceApi` (propuestas pendientes), `installmentsApi`, `bankingApi`, `clientFaceRecognitionApi`, `clientsApi` (QR), `stripeApi`.
- **8 `fetch` sueltos:** `/credit-score`, `/credit-score/available-credit`, `/wallet`, `/stripe/*`, `/automated-payments/saved-method`.
- **34 `style={{}}`** (viola §4) y 1 elemento HTML crudo.
- Frescura de datos ✅ (`useIonViewWillEnter` + `onDataChanged`).
- Lleva a: KYC autoservicio, Expediente, LoanDetail, `/payment`.

**Plan:** después de moverlo, dividirlo en `ClientDashboard/` siguiendo la plantilla de LenderDashboard
(`HomeTab`, `LoansTab`, `PaymentsTab` con cuotas SPEI, `ActivityTab`, `ProfileTab`, `WithdrawModal`) y crear `creditScoreApi.ts` y `walletApi.ts`.

---

## 8. Dashboard del prestamista — `LenderDashboard/` (`/lender-dashboard/:clientId`)

- Ya está en MVVM: `LenderDashboardLogic.ts` (362) + View + Constants + 9 componentes
  (`PortfolioHero`, `GreetingEarnings`, `KpiCards`, `PerformanceGauge`, `StatusSummary`, `LoansList`, `PaymentsCard`, `RecentActivityCard`, `VerificationCard`).
- **APIs:** `loanApi`, `loanMarketplaceApi` (ofertas activas, propuestas pendientes), `clientsApi`, `bankingApi.ledgerStatement`, `clientFaceRecognitionApi`, `digitalContractsApi`, `stripeApi`.
- `PaymentsCard` usa `NativeConnectOnboarding` (cuenta de cobro).
- Barra inferior propia: Inicio / Préstamos / Pagos (`?section=pagos`) / Invertir (→ P2P) / Invitar, definida en `App.tsx` (l. 351-368).
- **Plan:** mover tal cual. Es el módulo listo como referencia.

---

## 9. P2P (marketplace) — `P2PLendingPage.tsx` (`/p2p-lending[/:clientId]`)

- **2 392 líneas.** Pestañas `offers | proposals | my`.
- **Flujos** (cada uno marcado con `// ──` en el código):
  publicar oferta (prestamista) · borrar oferta · enviar propuesta (acreditado; si el perfil está incompleto → `/borrower-onboarding`) ·
  **aceptar propuesta** → `createLoan` + `createLoanContract` + fondeo (no custodio: declarar/confirmar, o orquestador SPEI) ·
  rechazar · contraoferta del prestamista · respuesta del acreditado (un solo ciclo) · declarar transferencia SPEI enviada ·
  retiro a banco · alta de CLABE · actividad · depósito simulado (prueba).
- **APIs:** `bankingApi` (14 funciones), `transferEvidenceAgentApi`, `pushNotificationsApi`, `loanApi.createLoan`, `loanChatApi.getChatConfig`, `digitalContractsApi`.
- **11 `fetch` sueltos:** `/all_loanOffers`, `/all_loanProposals`, `/loanOffers`, `/loanProposals`, `/automated-payments/generate-schedule`, `/stripe/withdraw`, `/wallet`. Ya existe `loanMarketplaceApi.ts`, pero la página no lo usa para todo.
- Envía push directamente (`createPushNotification`), siempre con `navigationRoute`. Verificar que el destinatario se resuelva a `userId` y no a `clientId`.
- **Plan:** mover y luego dividir en `P2PLending/` (`OffersTab`, `ProposalsTab`, `MyTab`, hojas Accept/Reject/Counter/Withdraw/BankAccount), con la lógica de fondeo en el hook compartido de la sección 6.

---

## 10. Préstamos y chat

| Página | Ruta | Notas |
|---|---|---|
| `MyLoans/` (MVVM ✅) | `/my-loans[/:clientId]` | Cartera del cliente: `LoanCard`, `PortfolioSummary`; lista contratos; navega a LoanDetail |
| `LoanDetailPage.tsx` (586) | `/loan-detail/:loanId` | Cuotas, pago SPEI, fondeo (confirmar/rechazar con evidencia), contratos. Destino del deep link de push |
| `LoanChatPage.tsx` (941) | `/loan-chat/:conversationId` | Negociación entre acreditado y prestamista. Mensajes `text/proposal/counter/accept/reject/system`. `analyzeProposal` (agente) · al aceptar: `createLoan` + `generateInstallmentSchedule` + `createLoanContract` + `disbursePayment` (solo SPEI). Voz: `@capacitor-community/speech-recognition` + `text-to-speech`. Indicador de "escribiendo" + polling de 2.5 s / 8 s (patrón de referencia para spinners) |
| `LoanChatListPage.tsx` (140) | `/loan-chats` | Pestaña "Chat" de la barra inferior |
| `LoanPage.tsx` (549) | `/loans` (feature `loans`, **staff**) | CRUD de préstamos. **Decidir:** si el staff de SmartLoans opera desde POS, se queda en POS |
| `components/loans/LoanCompletionRing.tsx` | — | Copiar (también lo usa ClientsPage) |

---

## 11. Jurídico — `juridical/` (`/juridical-dashboard/:clientId`)

- Pequeño y en MVVM (Logic 61 + View 96). Capability `SMARTLOANS_JURIDICAL`. El shell lo presenta con la marca SmartLoans.
- **Qué hace hoy:** muestra el registro del propio abogado: "Casos y seguimiento" = `clientFollowUps` de su ficha (el staff los asigna desde Clientes → Seguimiento),
  más "Plantillas legales" (contrato y pagaré, los mismos textos de la sección 4).
- **Qué no hace:** no existe un modelo de asignación de qué contratos de otros clientes puede ver un abogado.
  El backend ya tiene `modules/legalCases.py` + `sql/sp_legalCases.sql`, pero **el frontend no lo usa**.
- **Dependencias:** `clientFollowUpApi` (compartido con POS y Factory), `documents/contract.ts` y `pagare.ts`.
- **Plan:** moverlo tal cual. Conectar `legalCases` es trabajo de producto aparte (si hace falta una tabla nueva, pasa por el PRD de la factory).

---

## 12. Agentes IA

### 12.1 Qué consume la app SmartLoans

Hay dos caminos: el frontend llama directo a `LoanAgents_SmartLoans`, o el backend hace de intermediario.

| Agente (`LoanAgents_SmartLoans/agents/…`) | Endpoint | Quién lo llama | Pantalla |
|---|---|---|---|
| `orchestrator` (+ `negotiation`, `borrower`, `lender`, `risk`, `recommendation`) | `POST /negotiate` | **Backend** `loanChat.py` (env `NEGOTIATION_AGENT_URL`, `LOANCHAT_AGENT_CLIENT_ID`) cuando alguien escribe al "Asistente SmartLoans" | LoanChat |
| `analysis` | `POST /analyze-proposal` | Frontend `loanAnalysisApi.ts` | LoanChat |
| `face_validation` | `POST /validate-face` | Frontend `faceValidationApi.ts` | KYC autoservicio |
| `id_document` | `POST /extract-id-fields` | Frontend `utils/idOcr.ts` | KYC (ambos wizards) |
| `evidence_validation` | `POST /validate-transfer-evidence` | Frontend `transferEvidenceAgentApi.ts` | P2P, LoanDetail |
| `transfer_extraction` | `POST /transfers/extract-evidence` | **Backend** `whatsappEvidence.py` (comprobantes por WhatsApp) | — |
| `client_followup` | `POST /clients/follow-up-suggestion` | Frontend `clientFollowUpAgentApi.ts` | ClientFollowUp (staff) |
| `contract` | `POST /contract` | **Nadie** (huérfano, ver 4.3) | — |
| `service_finder`, `business_menu` | `/signup/service-finder`, `/signup/business-menu` | Frontend (login: `ServiceFinder/`, `BusinessMenu/`) | Alta de cuenta (plataforma) |

**No pertenecen a SmartLoans** (se quedan para POS): `cash_register`, `expense`, `ticket_extraction`, `product_*`, `order_triage`,
`pos_*_support`, `whatsapp_*`, `voice_secretary`. Lo mismo con las páginas de staff `system/Agent` y `system/AgentCompanySetting`.

### 12.2 Hallazgos
- ⚠️ **La URL del agente está fija en el código** (`const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net'`) en 7 archivos.
  DEV y QA del frontend llaman al agente de **producción**. Además, LoanAgents solo se despliega desde `main`, así que no existe agente de DEV.
  En la app nueva, agregar `AGENT_BASE_URL` a `appEnv.ts` (`VITE_AGENT_URL`), como `API_BASE_URL`.
- Los agentes **nunca escriben** (proponen acciones y el backend las ejecuta), así que llamarlos desde la app nueva no cambia el modelo de seguridad.
- El agente y el backend facturan por tokens (`MeteredRunner`) por `companyId`. Las llamadas desde la app nueva deben mandar `companyId = 1008`.
- **El repo LoanAgents no se toca para esta migración.** Lo único es revisar el CORS del FastAPI (`main.py`) si la app nueva corre en otro origen
  (por ejemplo, otro dominio web, o `capacitor://localhost` con un bundle id nuevo).

---

## 13. Plataforma (se copia; SmartLoans la necesita para arrancar)

- **Autenticación:** `pages/authentication/` completo (`Login`, `CreateAccount`, `ClientLogin`, `ForgotPassword`, `Logout`, `LoginAppPicker`, `clientphone/`, `ServiceFinder/`, `BusinessMenu/`). Estas dos últimas **no tienen commit**: commitearlas en POS antes de copiarlas.
- **Perfil:** `profile/` (`BankAccountsCard` con Stripe y CLABE, `ContractsCard`, `IdentificationCard`, `SecurityCard`…). Es casi todo SmartLoans.
- **Notificaciones:** `NotificationsInboxPage`, `NotificationDetail/`.
- **Contexts:** `UserContext`, `ObservabilityContext`, `ExitConfirmContext`. `CartContext` llega por un import; cortar esa dependencia.
- **API:** `usersApi`, `sessionApi`, `clientLoginApi`, `clientsApi`, `clientCapabilitiesApi`, `companiesApi`, `companyTokensApi`, `rolesApi`, `myNotificationsApi`, `pushNotificationsApi`, `loanChatApi`.
- **UI:** `Header`, `TokenBalanceChip`, popovers, `CompanySelector`, `ui/` (`EmptyState`, `PageLoading`, `StatusBadge` + `statusMaps`, `PinInput`, `CountryPhoneInput`, `ConfirmBackButton`, `ZoomableImage`, `FollowUpList`).
- **Hooks / utils:** `useToast`, `usePopovers`, `useTokenBalance`, `useClientQr`, `appEnv`, `format`, `formatters`, `refreshBus`, `routes`, `sessionTokens`, `observability`, `biometricAuth`, `pin`, `phone`, `pickAvatarPhoto`, `postLoginRoute`, `productContext`, `loginApps`, `appLinks`, `clientQrPdf`.
- **Shell (`App.tsx`, 1 528 líneas): reescribir, no copiar.** Llevar solo: rutas SmartLoans, barras inferiores del acreditado y del prestamista más la pestaña Chat,
  selector borrower ↔ lender ↔ juridical, registro de push (`user_{userId}` + `env_{APP_ENV}`, canal Android `push_notifications`, ids int32, deep link con `navigationRoute`),
  `BiometricLockScreen`, `UpdateRequiredGate`, inactividad, app-resume → `notifyDataChanged`, y `getPostLoginRoute`.
- **Podar** lo que es solo de POS en `Header`, `rolePermissions` y `productContext`.

---

## 14. Paquetes, nativo y configuración

**npm:** Ionic/React/router, `@capacitor/{core,app,browser,camera,geolocation,preferences,push-notifications,local-notifications,keyboard,status-bar}`,
`@aparajita/capacitor-biometric-auth`, `@capacitor-community/{speech-recognition,text-to-speech}`, `@stripe/{stripe-js,react-stripe-js}`,
`@vladmandic/face-api`, `jspdf`, `qrcode`, `qrcode.react`, `@ionic/pwa-elements`.
**No llevar:** phaser, three/@react-three, leaflet, `@stripe/*connect*`, microsoft speech SDK, googleapis, react-native, el lector de QR.

**Nativo:** bundle id propio; `ios/` y `android/` nuevos; permisos (cámara, ubicación, Face ID, micrófono, reconocimiento de voz); push con credenciales APNs/FCM del nuevo bundle id en Azure Notification Hub;
`presentationOptions` de iOS; `cap sync` con `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.

**Variables por ambiente (GitHub Actions, `development`→DEV, `qa`→QA, `main`→PROD):** `VITE_API_URL`, `VITE_APP_ENV`, `VITE_STRIPE_PUBLISHABLE_KEY`, **`VITE_AGENT_URL` (nueva)**.

**Assets:** `public/models/face-api/`, logos e iconos de SmartLoans.

---

## 15. Decisiones abiertas

| # | Pregunta | Recomendación |
|---|---|---|
| D1 | Versiones del destino | ✅ **Decidido:** mismas versiones que POS (Ionic 8 / Cap 7 / router v5); subir después |
| D2 | ¿El staff de SmartLoans (`/loans`, `/client-followup`, alta de clientes) usa la app nueva? | ✅ **Decidido (2026-11-19):** no, se queda en POS. La app nueva es solo para clientes (acreditado, prestamista, jurídico). Incluye las secciones del menú de POS **Configuración** (Usuarios, Empleados, Cuentas de cobro, Ajustes generales), **Mensajes** (Alertas, Notificaciones, Correos, Notificaciones Push, Avisos operativos) y **Agentes** (Agente WhatsApp, Agentes IA): todas son de admin/manager. El menú de SmartLoans solo tiene Mis productos, Mensajes → Mis notificaciones, Cuenta → Mi perfil y Cerrar sesión |
| D3 | ¿Tres wizards o uno? | Mover los tres tal cual y unificarlos en un PR posterior |
| D4 | Agente `/contract` huérfano | Conectarlo al pasar a `accepted` o eliminarlo |
| D5 | Contratos de relleno en el alta por staff | Corregir en POS (usar `contractPdf.ts`) |
| D6 | KYC duplicado en dos repos | Copiar ahora y extraer `@gmo/kyc` después |
| D7 | Jurídico con `legalCases` | Fuera del alcance de la migración |

---

## 16. Orden sugerido (cada paso termina con `tsc --noEmit` + `build` + la app arrancando sin errores en consola)

1. Resolver D1-D2. Commitear `ServiceFinder/` y `BusinessMenu/` en POS.
2. Ajustar `package.json` y `capacitor.config.ts` del destino. Agregar `VITE_AGENT_URL` y `VITE_STRIPE_PUBLISHABLE_KEY` a `appEnv.ts`.
3. Plataforma (13) → que el login funcione contra DEV con una cuenta de `companyId` 1008.
4. KYC (3) + Contratos (4) + Wizards (2).
5. Stripe (5) + Pagos (6).
6. Dashboard del prestamista (8) → Dashboard del acreditado (7) → MyLoans/LoanDetail (10).
7. P2P (9) + Chat (10) + APIs de agentes (12).
8. Jurídico (11) + Enrolamiento.
9. Nuevo `App.tsx` (shell) + nativo + CI por ambiente.
10. QA de punta a punta (`docs/e2e-test-runbook.md`): onboarding → propuesta → aceptación → fondeo SPEI con evidencia → cuota → retiro.
11. Ya publicada la app en tiendas: quitar de POSVending lo que solo usa SmartLoans y el menú "SmartLoans" del shell POS, en un PR aparte.
12. Refactors posteriores (uno por PR): MVVM de ClientDashboard, P2P y ClientFaceRecognition · hook `useFundingFlow` · unificar wizards · subir versiones.

**Docs que viajan con el código:** `p2p-direct-payments-architecture.md`, `smartloans-payment-process.md`, `payment-domain-state-machines.md`,
`loan-chat-design.md`, `loan-agents-contract.md`, `client-capabilities.md`, `pushnotification.md`, `environments.md`, las RFC relevantes y un `CLAUDE.md` adaptado.
