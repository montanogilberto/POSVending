import { PrintOptions, UnifiedReceiptData } from '../../types/receipt';
import { generatePrintHTML } from './printTemplate';

export function printReceipt(data: UnifiedReceiptData, options: PrintOptions = {}): void {
  const html = generatePrintHTML(data, options);

  // Prefer hidden iframe print to avoid opening a new popup window.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 300);
  };

  iframe.onload = () => {
    try {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) {
        cleanup();
        return;
      }

      if (options.autoPrint !== false) {
        contentWindow.focus();
        contentWindow.print();
      }

      const mediaQueryList = contentWindow.matchMedia?.('print');
      if (mediaQueryList) {
        const listener = (mqlEvent: MediaQueryListEvent) => {
          if (!mqlEvent.matches) {
            cleanup();
            mediaQueryList.removeEventListener?.('change', listener);
          }
        };
        mediaQueryList.addEventListener?.('change', listener);
      }

      contentWindow.onafterprint = () => {
        cleanup();
      };

      // Fallback cleanup in case afterprint is not fired
      setTimeout(cleanup, 1500);
    } catch (error) {
      console.error('Failed to print via iframe:', error);
      cleanup();
    }
  };

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Unable to access iframe document for printing');
    cleanup();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
}

export function generateReceiptBlob(data: UnifiedReceiptData, options: PrintOptions = {}): string {
  const html = generatePrintHTML(data, options);
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}
