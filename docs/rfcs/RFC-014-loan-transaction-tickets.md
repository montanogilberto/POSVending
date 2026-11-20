# RFC-014 — Ticket por cada transacción de GMO Prestamos

> Estado: **APROBADO** 2026-11-19 (Q1: extensión de los módulos de pagos, sin PRD · Q3: mismo número de WhatsApp que Lavandería GMO).
> **Decisión 2026-11-19 (cambia P2/P5):** el **push con `send_azure_push` es el canal central** entre acreditado, prestamista y jurídico: cada paso de una parte avisa a la otra con una plantilla fija. El ticket por WhatsApp/SMS **sólo sale a quien no tiene la app** (sin usuario de app o sin dispositivo, `has_push_device`); el email del ticket sale siempre. Las policies del despachador quedan en `["whatsapp","sms"]` (sin push).
> 2026-11-19 — **Escrito, sin commit ni despliegue** (`smartloans_backend`, rama `development`):
> - `modules/loanPush.py` (nuevo): plantillas + `push_to_client` (clientId → userId, guarda en "Mis notificaciones" con `sp_pushNotifications`, envía con `send_azure_push` con `navigationRoute`, registra la entrega). Plantillas: `loan_requested`, `loan_approved_borrower/_lender`, `loan_rejected`, `loan_countered`, `loan_counter_accepted/_rejected`, `funding_declared`, `funding_evidence_review`.
> - `modules/loanProposals.py`: `loan_proposals_sp` lee la propuesta antes del cambio y manda el push de cada transición (`proposal_notices`), en segundo plano.
> - `modules/fundingTransactions.py`: `declare` → push `funding_declared` al acreditado + ticket; `confirm` → push directo "✅ Préstamo activo" con `send_azure_push` (fase 0, se conserva) + ticket.
> - `modules/transferEvidence.py`: `validate` con `NEEDS_REVIEW`/`INVALID` → push `funding_evidence_review` al acreditado.
> - `modules/loanTickets.py` + `routes_/loanTickets.py`: ticket con enlace firmado `/comprobante/{token}` (`LOAN_TICKET_LINK_SECRET`), email siempre, WhatsApp (`comprobante_listo`) → SMS sólo sin app.
> - `sql/migrations/2026-11-19_loan_ticket_policies.sql`: 4 filas de `notificationDispatch_policy` — **no aplicado**.
> - Pruebas: `tests/test_loan_push.py` (15) y `tests/test_loan_tickets.py` (20). Suite del backend: 636 OK; `check_raw_sql` OK.
> - **Fase 3 hecha** para la conversación de un préstamo: se quitaron 10 `createPushNotification` de `P2PLendingPage`/`LoanDetailPage` en la app GMO Prestamos **y** en POSVending (ahora los manda el backend). Queda en la app el aviso "💰 Capital disponible" a todos los acreditados (difusión, pregunta Q2 abierta).
> - Pendiente para que funcione: aplicar el script de policies (DEV → QA → PROD) y definir `LOAN_TICKET_LINK_SECRET` en cada App Service. **Desplegar el backend antes que las apps**: si salen las apps primero, esos avisos no le llegan a nadie.
> - Fuera de este paso: avisos de jurídico (por definir), fase 2 (rechazo/escalado/cuotas) y fase 4.
> Fecha: 2026-11-19 · Autor: GMO · Alcance: avisos y comprobantes de los eventos de dinero de un préstamo (fondeo, cuotas) y del marketplace (oferta, propuesta), en la app GMO Prestamos (antes SmartLoans) y en el backend `smartloans_backend`.
> Se discute contra `docs/p2p-direct-payments-architecture.md` (§16). Toca el dominio de pagos: necesita RFC.
> Las referencias de la app (`P2PLendingPage.tsx:…`, `LoanDetailPage.tsx:…`) son del repo de la app GMO Prestamos (`smartloans`); en POSVending esas páginas son las mismas.
> Origen: "enviar ticket de cada transacción, como GMO POS".

## 1. Contexto (código al 2026-11-19)

### Cómo lo hace GMO POS
Cada venta llama a `dispatch_notification_connector` (`modules/notificationDispatch.py`) con
`sourceType="income"`, `eventName="income_created"` y `receiptUrl=receipt_link(companyId, incomeId)` (`modules/income.py:422`).
El despachador:
- Intenta en cascada **push → WhatsApp → SMS**, el canal más barato primero. Si el cliente no tiene la app instalada (`has_push_device` falso → `fallbackReason=NO_DEVICE`), salta directo a WhatsApp.
- Si WhatsApp falla después (webhook 131026/131047…), manda el SMS (`sms_after_whatsapp_failure`).
- Registra cada envío en `notificationDispatches` y no reenvía un evento ya resuelto.
- Toma los canales permitidos de `notificationDispatch_policy` (una fila por `eventName`; sin fila responde 400).
- El ticket es un enlace firmado `/recibo/{companyId}-{incomeId}-{firma}` (`modules/receiptLinks.py`): HMAC con `RECEIPT_LINK_SECRET`, sin tabla de tokens, redirige a una URL SAS de 15 min. Sin secreto, no se emiten enlaces.

### Qué avisa hoy GMO Prestamos

| Evento | Quién lo emite | Qué se envía | Problema |
|---|---|---|---|
| Capital publicado (`loanOffers`) | Backend | Ticket por email + WhatsApp `capital_publicado` (`loanOffers.py:44`) | Fuera del despachador: sin cascada, sin registro, sin SMS |
| Capital publicado → acreditados | **App** (`P2PLendingPage.tsx:562`) | Push a todos los acreditados | Lo emite el cliente |
| Nueva propuesta → prestamista | **App** (`:657`) | Push | Lo emite el cliente |
| Propuesta aprobada → acreditado | **App** (`:830`, `:841`, `:951`) | Push "¡Solicitud aprobada!" + "Envía el fondeo por SPEI" | Lo emite el cliente |
| Propuesta rechazada → acreditado | **App** (`:1117`) | Push "Solicitud no aprobada" | Lo emite el cliente |
| Negociación (contraoferta, términos aceptados, contraoferta rechazada) | **App** (`:1162`, `:1195`, `:1220`) | Push | Lo emite el cliente |
| Fondeo declarado → acreditado | **App** (`:1049`, `LoanDetailPage.tsx:301`) | Push "Revisa el comprobante de fondeo" | Lo emite el cliente |
| Fondeo confirmado → ambos | Backend (`fundingTransactions.py:175`) | Push "✅ Préstamo activo" | **Bug: se manda a `clientId`, el hub etiqueta por `user_{userId}`** → el push se pierde sin error |
| Fondeo rechazado / escalado (cron cada 6 h, `main.py:381`) / resuelto | — | Nada | Sin aviso; nadie se entera de que su fondeo se escaló |
| PaymentIntent vencido (5 días, D12; cron `main.py:373`) | — | Nada | Sin aviso |
| Cuota pagada → prestamista | Backend (`automatedPayments.py:430`) | Push "💵 Cuota recibida" (resuelve bien `userId`) | El acreditado no recibe comprobante |
| Comprobante validado por IA | App | Modal en pantalla (`evidenceTicket`) | No queda copia para el usuario |

## 2. Problema
1. **No hay ticket** de los movimientos que importan: fondeo declarado/confirmado y cuotas. El usuario no conserva un comprobante con folio.
2. **Sólo push.** Quien desinstaló la app o no dio permiso de notificaciones no se entera de nada.
3. **Avisos emitidos por la app** (11 llamadas a `createPushNotification` en `P2PLendingPage` y `LoanDetailPage`). Si la app se cierra a la mitad, el aviso no sale; y contradice **D7** (toda transición emite su evento en el backend; los avisos son consumidores).
4. **Bug activo:** "Préstamo activo" no le llega a nadie (clientId usado como userId).

## 3. Propuesta

### P1 — Corregir el push de "Préstamo activo" (independiente, puede salir ya)
En `funding_transactions_confirm`, resolver `clientId → userId` con `resolve_push_user_ids` antes de `send_azure_push`, igual que `automatedPayments.py:425`. Bug fix sin cambio de diseño.

### P2 — Todo evento de dinero pasa por el despachador, con ticket
Al terminar con éxito cada transición en el backend, se llama a `dispatch_notification_connector` **en segundo plano** (hilo o `BackgroundTasks`, como hoy `_send_offer_published_ticket`). Nunca bloquea ni cambia la respuesta del flujo de dinero: si el aviso falla, se registra y la transición queda igual.

**Catálogo de eventos** (`sourceType` / `sourceId` / `eventName`, un `eventName` por destinatario, ver P4):

| # | Transición | sourceType · sourceId | eventName → destinatario | Ticket |
|---|---|---|---|---|
| E1 | Oferta publicada | `loanOffer` · offerId | `loan_offer_published_lender` → prestamista | Sí (hoy `capital_publicado`) |
| E2 | Propuesta enviada | `loanProposal` · proposalId | `loan_proposal_sent_borrower` → acreditado · `loan_proposal_received_lender` → prestamista | Sí / aviso |
| E3 | Propuesta aceptada (nace el préstamo + PaymentIntent) / rechazada | `loanProposal` · proposalId | `loan_proposal_accepted_borrower` · `loan_proposal_accepted_lender` · `loan_proposal_rejected_borrower` | Aviso con "transfiere a la CLABE en la app" |
| E3b | Negociación: contraoferta, términos aceptados, contraoferta rechazada | `loanProposal` · proposalId | `loan_counteroffer_*` · `loan_terms_accepted_*` · `loan_counteroffer_rejected_*` | Aviso (sin ticket: no hay dinero) |
| E4 | Fondeo declarado | `fundingTransaction` · fundingTransactionId | `funding_declared_lender` (ticket) · `funding_declared_borrower` ("confirma si te llegó") | Sí |
| E5 | Fondeo confirmado (préstamo activo) | `fundingTransaction` · id | `funding_confirmed_lender` · `funding_confirmed_borrower` | Sí |
| E6 | Fondeo rechazado / escalado / resuelto | `fundingTransaction` · id | `funding_rejected_*` · `funding_escalated_*` · `funding_resolved_*` | Sí |
| E6b | PaymentIntent vencido sin fondeo (D12) | `paymentIntent` · paymentIntentId | `payment_intent_expired_borrower` · `_lender` | Aviso |
| E7 | Cuota pagada | `loanInstallment` · installmentId | `installment_paid_borrower` (ticket) · `installment_paid_lender` | Sí |

Los avisos de E1–E4 que hoy crea la app (`createPushNotification`) se **retiran del frontend** cuando el backend los emita (fase 3), para no duplicar.

### P3 — Ticket = enlace firmado a un comprobante generado al momento
`receiptLinks.py` firma `(companyId, incomeId)`. Para préstamos se agrega una variante con **separación de dominio**:
`firma = HMAC(secreto, "loanticket:{companyId}:{sourceType}:{sourceId}:{recipient}")` →
`/comprobante/{companyId}-{sourceType}-{sourceId}-{recipient}-{firma}`.
- La ruta valida la firma y **genera el comprobante HTML en ese momento** desde los datos que ya existen (SPs `one` de `fundingTransactions`, `loanInstallments`, `loanOffers`, `transferEvidence`, más el historial append-only de `paymentHistory` (D16) para los estados). No hay blob ni tabla de tokens.
- Muestra: folio (= id de la transacción), tipo, monto, fecha/hora (Hermosillo), estado actual, historial de estados (D16), banco de origen y **sólo los últimos 4 dígitos** de las CLABE, clave de rastreo y el veredicto del comprobante validado por IA si existe.
- Leyenda fija (D1): *"Comprobante de una declaración/confirmación entre las partes. GMO Prestamos no recibe, retiene ni administra estos fondos."*
- `recipient` ∈ {`borrower`, `lender`} va en la firma: el enlace de uno no sirve para ver el ticket como el otro.
- Secreto: **`LOAN_TICKET_LINK_SECRET`** propio (rotarlo invalida sólo tickets de préstamos). Sin secreto → no se emiten enlaces y el aviso sale sin enlace (falla cerrado, igual que `/recibo`).

### P4 — Despachador: un `eventName` por destinatario
La idempotencia del despachador es por `(companyId, sourceType, sourceId, eventName)` **sin destinatario** (`notificationDispatch.py:188`): si un mismo evento avisa a acreditado y prestamista, el segundo envío se descartaría como "ya resuelto". En vez de cambiar el SP, cada evento usa un `eventName` por destinatario (sufijo `_borrower` / `_lender`, tabla de P2). Cero cambio de esquema.

### P5 — Plantillas de WhatsApp (Meta)
Los avisos salen casi siempre fuera de la ventana de 24 h, así que WhatsApp necesita **plantillas aprobadas** (categoría *Utility*), una por `eventName` con texto fijo y variables (nombre, monto, folio, enlace). Mientras una plantilla no esté aprobada, la policy de ese evento omite WhatsApp y cae a SMS. Un "sent" de Meta = aceptado, no entregado (el webhook ya lo maneja).
Texto SMS (≤ 160 c. cuando se pueda): `GMO Prestamos: fondeo de $5,000.00 confirmado. Folio 1234. Comprobante: {enlace}`.

### P6 — Email como copia durable
Si el cliente tiene email, además del despachador se manda el ticket por correo (como hoy `capital_publicado` y el comprobante de cargos Stripe de CLAUDE.md §7). Es la copia que el usuario guarda; WhatsApp/SMS llevan el enlace.

## 4. Impacto en el dominio
- **D7 se cumple**: los avisos pasan a ser consumidores de las transiciones en el backend; la app deja de emitirlos (fase 3).
- **D1 intacto**: el ticket documenta declaraciones y confirmaciones; nunca dice ni implica que GMO Prestamos movió dinero.
- **D5 intacto**: ningún aviso confirma nada; E4 al acreditado pide que él confirme.
- Sin estados nuevos ni agregados nuevos. Las máquinas de §8 no cambian.

## 5. Impacto en datos
- **Sin tablas nuevas.** Se reutilizan `notificationDispatches` (registro/idempotencia) y los SPs `one` existentes para armar el comprobante.
- **Filas nuevas** en `notificationDispatch_policy`: una por `eventName` de P2 (canales y si permite SMS). Van como script de datos revisado, aplicado primero en DEV y QA.
- Variables de entorno nuevas: `LOAN_TICKET_LINK_SECRET` (DEV/QA/PROD, distintas). `BACKEND_PUBLIC_URL` ya existe.

**Por qué RFC y no PRD de la fábrica:** el PRD (`PRDInput`) siempre genera tabla + SPs + rutas + página de un módulo **nuevo**. Aquí no hay tabla nueva: se agregan llamadas al despachador en módulos de pagos que ya existen y están escritos a mano (`fundingTransactions`, `automatedPayments`, `loanOffers`, `loanProposals`), más una ruta de comprobante. Encaja en la excepción de "módulos de stripe/payments existentes". **A confirmar en la aprobación** (pregunta abierta Q1).

## 6. Seguridad y privacidad
- Enlace firmado (HMAC), sin datos personales en la URL: sólo ids y firma. Nada de teléfono, nombre ni CLABE en el enlace.
- El comprobante muestra CLABE **enmascarada** (últimos 4) — D4. Nunca la CLABE completa (ésa sólo se revela a la contraparte dentro de la app, auditada).
- Logs: sólo ids, canal y estado. Nunca el teléfono completo, el cuerpo del mensaje ni la imagen del comprobante.
- `smartloans_backend` es **público**: el secreto sólo por variable de entorno.
- Los avisos son **transaccionales** (a las partes de un préstamo que ya existe). Nada de marketing en estas plantillas.
- Validar que el `recipient` del enlace sea parte del préstamo antes de mostrar nada (firma + verificación del rol en la transacción).

## 7. Plan de rollout
| Fase | Qué | Prerrequisito |
|---|---|---|
| 0 | **P1** (bug del push de "Préstamo activo") | Ninguno — PR propio, puede salir antes de aprobar el resto |
| 1 | `LOAN_TICKET_LINK_SECRET` en DEV/QA/PROD · ruta `/comprobante` · policies de E4/E5 · E4/E5 por el despachador + email | Plantillas E4/E5 enviadas a Meta (mientras: SMS) |
| 2 | E6, E6b y E7 (rechazo/escalado/resolución, intento vencido y cuotas); los crons de `main.py` llaman al despachador | Fase 1 estable en QA |
| 3 | E1–E3b al despachador; **quitar** `createPushNotification` de `P2PLendingPage`/`LoanDetailPage` para esos eventos | Backend de fase 1–2 en PROD (si no, se pierden avisos) |
| 4 | Pantalla "Mis comprobantes" en la app (lista de tickets por transacción) | Opcional |

Orden de despliegue en cada fase: policies (datos) → backend → app (D9, `development → qa → main` por PR).

## 8. Alternativas descartadas
- **Generar el ticket como archivo (blob) en cada evento, como POS.** Duplica datos que ya están en tablas y muestra un estado congelado; el comprobante generado al abrirlo siempre refleja el estado y el historial actuales.
- **Seguir emitiendo avisos desde la app.** Se pierden si la app se cierra y viola D7.
- **Cambiar la idempotencia del SP para incluir destinatario.** Correcto a largo plazo, pero toca un SP compartido con POS; el sufijo por destinatario resuelve sin cambio de esquema.
- **Sólo email.** Mucha gente no lo revisa; WhatsApp/SMS con enlace es lo que POS ya usa y llega aunque no haya app instalada.

## 9. Preguntas abiertas
- **Q1.** ¿Se aprueba como extensión de los módulos de pagos existentes (sin PRD de la fábrica)?
- **Q2.** ¿Avisar también al acreditado en E1 (capital publicado) por WhatsApp/SMS, o sólo push dentro de la app? Mandar WhatsApp a *todos* los acreditados es masivo y se acerca a marketing.
- **Q3.** Nombre de remitente en SMS/WhatsApp: "GMO Prestamos". ¿El número de WhatsApp Cloud API es el mismo de Lavandería GMO o uno propio?
- **Q4.** ¿Fase 4 ("Mis comprobantes") entra ahora o después?

## 10. Fuera de alcance
- Mensajes para recuperar a quien desinstaló la app (reactivación/marketing): requieren consentimiento y plantillas *Marketing*; van en otro RFC. Este RFC sí hace que los **avisos de sus préstamos** les lleguen por WhatsApp/SMS aunque no tengan la app (cascada con `NO_DEVICE`).
