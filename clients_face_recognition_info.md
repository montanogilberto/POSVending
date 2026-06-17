# Clients Face Recognition Information

Source endpoint:
- `POST https://smartloansbackend.azurewebsites.net/all_clientFaceRecognitions`
- Request body used:
```json
{
  "clientFaceRecognitions": [
    { "companyId": 1 }
  ]
}
```

Response received:
```json
{
  "clientFaceRecognitions": []
}
```

## Summary
- Total face-recognition records found: **0**
- No client face recognition rows are currently available for `companyId = 1`.

## Module Data Structure (from `src/api/clientFaceRecognitionApi.ts`)
Each record is expected to have:

| Field | Type | Description |
|---|---|---|
| clientFaceRecognitionId | number | Unique record id |
| companyId | number | Company identifier |
| documentType | string | Selected document type |
| idFrontImageBlobUrl | string | Uploaded document front image URL |
| clientSelfieBlobUrl | string | Uploaded selfie image URL |
| confidenceScore | number | Face match confidence score |
| isVerified | boolean | Verification result |
| contractAccepted | boolean | Contract acceptance flag |
| acceptedAt | string | Acceptance timestamp |
| created_At | string? | Creation timestamp |
| updated_at | string? | Last update timestamp |

## Workflow actualizado (ClientFaceRecognitionPage - Wizard)

La página ahora sigue un **wizard similar al módulo de productos** y reutiliza el componente existente **`ClientSelector`**.

1. **Paso 1: Cliente y documento**
   - Usuario selecciona cliente usando modal `ClientSelector`.
   - Usuario elige tipo de documento:
     - `INE`
     - `Passport`
     - `Driver License`
   - Validaciones:
     - Si no hay cliente seleccionado, se muestra error y no avanza.
     - Si no hay tipo de documento, se muestra error y no avanza.

2. **Paso 2: Captura de imágenes**
   - Se usa `@capacitor/camera` para capturar:
     - Foto frontal del documento (`idFrontImageBase64`)
     - Selfie del cliente (`clientSelfieBase64`)
   - Validación:
     - Si falta alguna imagen, se muestra error y no avanza.

3. **Paso 3: Verificación biométrica**
   - Se llama:
     - `POST /api/clientFaceRecognition/verify`
   - Payload enviado:
     - `companyId`
     - `documentType`
     - `idFrontImageBase64` (sin prefijo data URI)
     - `clientSelfieBase64` (sin prefijo data URI)
   - Respuesta esperada:
     - `isVerified`
     - `confidenceScore`
     - `idFrontImageBlobUrl`
     - `clientSelfieBlobUrl`
   - UI:
     - Muestra resumen de cliente/documento/estado de imágenes antes de verificar.
     - Si es exitoso, avanza al paso de contrato.

4. **Paso 4: Contrato y envío**
   - Muestra resumen:
     - Cliente
     - Documento
     - Puntaje de confianza
     - Estado de verificación
   - Usuario acepta términos del contrato (`contractAccepted`).
   - Se llama:
     - `POST /api/clientFaceRecognition/contract`
   - Payload enviado:
     - `companyId`
     - `documentType`
     - `idFrontImageBlobUrl`
     - `clientSelfieBlobUrl`
     - `confidenceScore`
     - `isVerified`
     - `contractAccepted: true`
     - `acceptedAt` (timestamp ISO)
   - Si es exitoso:
     - Muestra mensaje de éxito.
     - Reinicia wizard (cliente, documento, imágenes y estado).

5. **Navegación tipo wizard**
   - Indicador visual de pasos.
   - Botones persistentes de navegación:
     - `Atrás`
     - `Siguiente`
     - `Verificar biometría`
     - `Enviar contrato`
   - Permite volver a pasos previos desde el indicador.

6. **Consulta/Administración de registros (API)**
   - Listado:
     - `POST /all_clientFaceRecognitions`
   - CRUD:
     - `POST /clientFaceRecognitions` con acción:
       - `action: 1` crear
       - `action: 2` actualizar
       - `action: 3` eliminar

## Related endpoints used by the module
- Verify face:
  - `POST /api/clientFaceRecognition/verify`
- Submit contract:
  - `POST /api/clientFaceRecognition/contract`
- CRUD records:
  - `POST /all_clientFaceRecognitions`
  - `POST /clientFaceRecognitions`
