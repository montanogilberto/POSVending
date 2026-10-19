# Chat de Préstamo — Diseño y Casos de Uso

> Última actualización: 2026-07-30
> Frontend: `src/pages/loans/LoanChatPage.tsx`, `LoanChatListPage.tsx`, `src/api/loanChatApi.ts`
> Backend: `modules/loanChat.py`, `routes_/loanChat.py`, `sql/sp_loanChat.sql`
> Agente IA: servicio independiente [LoanAgents_SmartLoans](https://github.com/montanogilberto/LoanAgents_SmartLoans) (ADK, vía HTTP)

## 1. Componentes

```mermaid
flowchart LR
  subgraph App["📱 App (Ionic/React)"
    ]
    LIST["/loan-chats<br/>Mis chats (lista)"]
    CHAT["/loan-chat/:id<br/>Conversación"]
    P2P["/p2p-lending<br/>Marketplace"]
    BELL["🔔 /notifications<br/>Inbox"]
  end

  subgraph BE["⚙️ Backend (FastAPI)"]
    CFG["GET /loanChat/config"]
    LC["POST /loanChat<br/>(8 actions)"]
    PUSH["send_azure_push"]
  end

  SP[("sp_loanChat<br/>loanConversations<br/>loanMessages")]
  HUB["☁️ Azure Notification Hub<br/>tags user_{userId}"]
  ADK["🤖 LoanAgents_SmartLoans<br/>(servicio ADK)"]

  LIST --> LC
  CHAT --> LC
  P2P -- "Chatear con el prestamista" --> CHAT
  CHAT -.lee config.-> CFG
  LIST -.lee config.-> CFG
  LC --> SP
  LC --> PUSH --> HUB -- FCM/APNs --> BELL
  LC -- "si lender = agente" --> ADK
```

## 2. Identidad del asistente — una sola fuente de verdad

El "Asistente SmartLoans" es una fila reservada de `dbo.clients` (tipo lender) **sin** fila en `users` (sin dispositivo, sin push). Su identidad vive **únicamente** en el backend:

| Variable de entorno | Efecto |
|---|---|
| `LOANCHAT_AGENT_CLIENT_ID` | Activa el asistente. Sin ella: botón oculto en la app y sin auto-respuesta. |
| `NEGOTIATION_AGENT_URL` | URL del servicio ADK. Sin ella (pero con la anterior): el bot responde el mensaje fallback. |

**El frontend nunca hardcodea el clientId.** Lo lee de `GET /loanChat/config`:

```json
{ "agentClientId": 2127, "agentEnabled": true, "agentReplyEnabled": false }
```

Además, el backend etiqueta cada conversación con `isAssistant: true/false` en
`start_conversation` / `get_conversation` / `list_conversations`, así la UI decide
el modo sin comparar ids.

## 3. Casos de uso

### UC-1 · Negociación real (borrower ↔ lender) — camino feliz

La única forma de iniciar una negociación es **desde una oferta** del marketplace
(así ambas partes siempre existen).

```mermaid
sequenceDiagram
  actor B as Borrower (app)
  participant BE as Backend
  participant DB as sp_loanChat
  participant H as Azure Hub
  actor L as Lender (app)

  B->>BE: start_conversation {borrowerId, lenderId, amount}
  BE->>DB: crea/reusa conversación (resuelve userIds por clientId)
  BE->>H: push "📨 Nueva solicitud" → user_{lenderUserId}
  H-->>L: 🔔 notificación + fila en inbox
  B->>BE: send_message msgType=proposal {amount, rate, term}
  BE->>H: push "💰 Nueva propuesta" → lender
  L->>BE: send_message msgType=counter (contrapropuesta)
  BE->>H: push → borrower
  L->>BE: accept_proposal
  BE->>DB: status=accepted, agreedAmount/Rate/Term
  BE->>H: push "✅ Préstamo aceptado" → borrower
  Note over L: triggerDisbursement (dual-rail):<br/>1º SPEI (orchestrator) · 2º Stripe fallback
```

Al aceptar, el frontend ejecuta el desembolso **dual-rail**: SPEI primero
(`disbursePayment`, idempotencyKey `chat:{convId}:disburse:{ts}`), Stripe como
segunda opción. Se crea el préstamo con cuotas.

### UC-2 · Rechazo

`reject_proposal` → status `rejected` + push "❌ Propuesta rechazada" a la contraparte. La conversación queda cerrada para propuestas.

### UC-3 · Chat con el asistente (borrower ↔ bot)

```mermaid
sequenceDiagram
  actor B as Borrower
  participant BE as Backend
  participant ADK as LoanAgents (ADK)

  B->>BE: GET /loanChat/config → agentClientId
  B->>BE: start_conversation {lenderId: agentClientId}
  Note over BE: isAssistant=true · lenderUserId=0<br/>(sin push: el bot no tiene dispositivo)
  B->>BE: send_message (texto libre)
  alt NEGOTIATION_AGENT_URL configurada
    BE->>ADK: POST /negotiate {message, borrowerId...}
    ADK-->>BE: reply (lee datos del borrower por su cuenta)
  else no configurada
    BE->>BE: fallback "Lo siento, no puedo responder…"
  end
  BE->>BE: inserta respuesta como mensaje del agente
  BE-->>B: push "🤖 Asistente SmartLoans" → borrower
```

**Reglas del modo asistente (UI):**
- Título "🤖 Asistente SmartLoans" + banner informativo.
- **Sin botón de propuesta** — el bot no puede aceptar dinero; solo texto.
- Botón de entrada visible solo para borrowers y solo si `agentEnabled`.

### UC-4 · Lista "Mis chats" (`/loan-chats`)

Entrada del menú para ambos roles. Muestra contraparte, estado, monto y última
actividad; tap abre la conversación. Empty-state → marketplace.

### UC-5 · Guard anti-conversación basura

`/loan-chat/new` **sin** ambas partes (o partes iguales) → toast + redirect a
`/loan-chats`. Esto eliminó las conversaciones `lenderId=0` cuyos pushes iban a
`userId 0` (nadie).

### UC-6 · Push y rastreo

1. El dispositivo se registra en el Hub con tag `user_{userId}` (⚠️ userId ≠ clientId).
2. El backend **mapea clientId→userId** antes de enviar (fix: tags vacíos devolvían "success" silencioso).
3. Cada envío inserta en `PushNotifications` + `NotificationDeliveries` (por usuario).
4. La campana 🔔 lee `POST /myNotifications` (badge = no leídas) y marca leídas al abrir.

| Evento | Push a | Título |
|---|---|---|
| start_conversation | lender | 📨 Nueva solicitud de préstamo |
| proposal / counter | contraparte | 💰 Nueva propuesta de préstamo |
| texto | contraparte | 💬 Nuevo mensaje |
| accept_proposal | contraparte | ✅ Préstamo aceptado |
| reject_proposal | contraparte | ❌ Propuesta rechazada |
| respuesta del bot | borrower | 🤖 Asistente SmartLoans |
| cualquier evento → bot | nadie (targetUserId=0 se omite) | — |

## 4. Matriz de configuración

| `LOANCHAT_AGENT_CLIENT_ID` | `NEGOTIATION_AGENT_URL` | Comportamiento |
|---|---|---|
| ✗ | — | Sin asistente: botón oculto, sin auto-reply, sin tag `isAssistant`. |
| ✓ | ✗ | Asistente visible; responde el **fallback**. |
| ✓ | ✓ | Asistente con respuestas reales del agente ADK. |

> **Deploy:** ambas variables deben configurarse en Azure Portal →
> smartloansbackend → Configuration (ya están en el `.env` local).
