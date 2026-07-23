import { jsPDF } from 'jspdf';

export interface ContractPdfParams {
  clientId: number;
  nombre: string;
  domicilio: string;
  curp: string;
  claveElector: string;
  fechaNacimiento: string;
  documentType: string;
  isVerified: boolean;
  confidenceScore: number;
  acceptedAtISO: string;
  signatureDataUrl: string;
}

const FIELD_ROWS: Array<{ label: string; key: keyof ContractPdfParams }> = [
  { label: 'Nombre completo', key: 'nombre' },
  { label: 'Domicilio', key: 'domicilio' },
  { label: 'CURP', key: 'curp' },
  { label: 'Clave de elector', key: 'claveElector' },
  { label: 'Fecha de nacimiento', key: 'fechaNacimiento' },
  { label: 'Documento de identidad', key: 'documentType' },
];

// Shared header: title + a client-data table. Every extracted-ID field this
// document carries came from a human-reviewed, editable form (see
// IdExtractedFieldsSummary.tsx) — never inserted un-reviewed — so a blank
// field here means the client's own review left it blank, not a bug.
function renderHeader(doc: jsPDF, title: string, params: ContractPdfParams): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Cliente ID: ${params.clientId}`, pageWidth / 2, 27, { align: 'center' });

  let y = 40;
  doc.setFontSize(11);
  for (const { label, key } of FIELD_ROWS) {
    const value = String(params[key] ?? '').trim() || '—';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(value, 75, y, { maxWidth: pageWidth - 95 });
    y += 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Verificación biométrica: ${params.isVerified ? 'verificada' : 'no verificada'}` +
      (params.confidenceScore ? ` (${(params.confidenceScore * 100).toFixed(1)}%)` : ''),
    20,
    y + 4
  );

  return y + 16;
}

function renderSignatureAndFooter(doc: jsPDF, startY: number, params: ContractPdfParams, acceptanceLine: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  const lines = doc.splitTextToSize(acceptanceLine, pageWidth - 40);
  doc.text(lines, 20, y);
  y += lines.length * 6 + 10;

  if (params.signatureDataUrl) {
    doc.addImage(params.signatureDataUrl, 'PNG', 20, y, 70, 28);
    y += 32;
  }
  doc.setDrawColor(209, 213, 219);
  doc.line(20, y, 90, y);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Firma electrónica', 20, y + 5);

  const acceptedDate = params.acceptedAtISO ? new Date(params.acceptedAtISO) : new Date();
  doc.text(
    `Aceptado el ${acceptedDate.toLocaleString('es-MX')}`,
    pageWidth - 20,
    y + 5,
    { align: 'right' }
  );
}

// Returns base64 WITHOUT the "data:application/pdf;base64," prefix — matches
// how every other base64 payload field in this flow (contractSignatureBase64,
// idSignatureCropBase64) is already sent to the backend.
function toBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1];
}

export function generateContractPdfBase64(params: ContractPdfParams): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const y = renderHeader(doc, 'Contrato de Crédito', params);
  renderSignatureAndFooter(
    doc,
    y,
    params,
    'El cliente declara haber leído, entendido y aceptado los términos y condiciones de este contrato de crédito, ' +
      'incluyendo el monto, tasa y plazo acordados en la solicitud de préstamo correspondiente.'
  );
  return toBase64(doc);
}

export function generatePagarePdfBase64(params: ContractPdfParams & { hasPhysicalPagare: boolean }): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const y = renderHeader(doc, 'Pagaré', params);
  renderSignatureAndFooter(
    doc,
    y,
    params,
    'El cliente reconoce deber y se compromete a pagar la cantidad acordada en los términos establecidos en el contrato de crédito. ' +
      `Pagaré físico en resguardo: ${params.hasPhysicalPagare ? 'sí' : 'no'}.`
  );
  return toBase64(doc);
}
