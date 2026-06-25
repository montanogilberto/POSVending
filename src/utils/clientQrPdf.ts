import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface ClientQrPdfParams {
  clientId: number;
  firstName: string;
  lastName: string;
  cellphone?: string;
  email?: string;
}

export function buildClientQrValue(clientId: number, firstName: string, lastName: string): string {
  return `CLIENT:${clientId}:${firstName} ${lastName}`;
}

export async function downloadClientQrPdf({
  clientId,
  firstName,
  lastName,
  cellphone,
  email,
}: ClientQrPdfParams): Promise<void> {
  const qrValue = buildClientQrValue(clientId, firstName, lastName);
  const qrDataUrl = await QRCode.toDataURL(qrValue, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
  });

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fullName = `${firstName} ${lastName}`.trim();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('Código QR del Cliente', pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(fullName, pageWidth / 2, 38, { align: 'center' });

  const qrSizeMm = 80;
  const qrX = (pageWidth - qrSizeMm) / 2;
  doc.addImage(qrDataUrl, 'PNG', qrX, 48, qrSizeMm, qrSizeMm);

  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  let y = 48 + qrSizeMm + 14;

  if (cellphone) {
    doc.text(`Teléfono: ${cellphone}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
  }

  if (email) {
    doc.text(`Email: ${email}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
  }

  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text(`ID: ${clientId}`, pageWidth / 2, y, { align: 'center' });

  const safeName = fullName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cliente';
  doc.save(`cliente-qr-${clientId}-${safeName}.pdf`);
}
