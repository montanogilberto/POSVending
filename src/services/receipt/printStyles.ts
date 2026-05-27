export function generateCompactPrintStyles(
  width: string,
  isUltraCompact: boolean
): string {
  const baseFontSize = isUltraCompact ? '9px' : '10px';
  const smallFontSize = isUltraCompact ? '7px' : '8px';
  const titleFontSize = isUltraCompact ? '12px' : '14px';
  const totalFontSize = isUltraCompact ? '13px' : '16px';

  return `
<style>
  @page { size: ${width} auto; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${width};
    font-family: "SF Mono", "Roboto Mono", "Consolas", "Courier New", monospace;
    font-size: ${baseFontSize};
    font-weight: 700;
    color: #000;
    background: #fff;
    line-height: 1.15;
    letter-spacing: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .receipt-container {
    width: 100%;
    max-width: ${width};
    margin: 0 auto;
    padding: ${isUltraCompact ? '0 1px' : '1px 2px'};
  }

  .receipt-title {
    font-size: ${titleFontSize};
    font-weight: 900;
    text-align: center;
    margin: 0;
    line-height: 1.05;
  }

  .receipt-subtitle {
    font-size: ${smallFontSize};
    font-weight: 700;
    text-align: center;
    margin: 0 0 1px 0;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .receipt-field {
    margin: 0;
    font-size: ${baseFontSize};
    display: flex;
    justify-content: space-between;
    gap: 2px;
  }

  .receipt-field strong {
    font-weight: 700;
  }

  .divider {
    border-top: 1px solid #000;
    margin: 1px 0;
  }

  .section-title {
    font-size: ${baseFontSize};
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
    line-height: 1.05;
  }

  .product-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 2px;
    margin: 0;
    font-size: ${baseFontSize};
  }

  .product-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
  }

  .product-price {
    text-align: right;
    min-width: ${isUltraCompact ? '48px' : '62px'};
    font-weight: 900;
  }

  .option-line,
  .pieces-line {
    margin: 0 0 0 3px;
    font-size: ${smallFontSize};
    font-weight: 700;
    line-height: 1.05;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    margin: 0;
    font-size: ${baseFontSize};
    line-height: 1.05;
  }

  .total-label {
    font-weight: 800;
  }

  .total-value {
    text-align: right;
    min-width: ${isUltraCompact ? '48px' : '62px'};
    font-weight: 900;
  }

  .grand-total {
    font-weight: 900;
    font-size: ${totalFontSize};
    margin-top: 0;
    line-height: 1.05;
  }

  .qr-wrapper {
    text-align: center;
    margin: 1px 0 0 0;
  }

  .qr-label {
    font-size: ${smallFontSize};
    margin-bottom: 1px;
    font-weight: 700;
  }

  .qr-image {
    width: ${isUltraCompact ? '42px' : '60px'};
    height: ${isUltraCompact ? '42px' : '60px'};
    image-rendering: pixelated;
  }

  .footer {
    text-align: center;
    margin-top: 0;
  }

  .footer-line {
    margin: 0;
    font-size: ${smallFontSize};
    line-height: 1.0;
    font-weight: 700;
  }

  .footer-line.strong {
    font-size: ${baseFontSize};
    font-weight: 800;
    margin-bottom: 0;
  }

  @media print {
    html, body {
      width: ${width};
    }
    .receipt-container {
      width: ${width};
      max-width: ${width};
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>`;
}
