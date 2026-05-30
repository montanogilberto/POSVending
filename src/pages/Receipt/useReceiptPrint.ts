import { useCallback } from 'react';
import {
  postOneTicketTracking,
  saveTicketHtml,
  sendTicketSms,
  sendTicketWhatsapp
} from '../../api/ticketApi';
import { ReceiptService } from '../../services/ReceiptService';

interface UseReceiptPrintParams {
  receiptData: any;
  ticketData: any;
  onSavedUrl: (url: string) => void;
  onToast: (message: string) => void;
}

export function useReceiptPrint({
  receiptData,
  ticketData,
  onSavedUrl,
  onToast
}: UseReceiptPrintParams) {
  const handlePrint = useCallback(async () => {
    if (!receiptData) {
      console.log('[ReceiptPrint] No receiptData, print aborted');
      return;
    }

    console.log('[ReceiptPrint] Print flow started');

    try {
      const incomeId = Number(ticketData?.incomeId ?? 0);
      const companyId = Number(ticketData?.companyId ?? 0);
      const branchId = Number(ticketData?.branchId ?? ticketData?.companyId ?? 0);
      const rawClientPhone = String(
        ticketData?.client?.cellphone ??
        ticketData?.client?.phone ??
        ticketData?.clientPhone ??
        ''
      ).trim();
      const normalizedPhoneDigits = rawClientPhone.replace(/\D/g, '');
      const clientPhoneWithPlus = normalizedPhoneDigits ? `+${normalizedPhoneDigits}` : '';
      const clientPhoneDigits = normalizedPhoneDigits;
      const clientPhone = clientPhoneWithPlus;
      const safeIncomeForFile = incomeId > 0 ? incomeId : Date.now();
      const fileName = `receipt_${safeIncomeForFile}.html`;
      const containerName = 'ticketspos';

      console.log('[ReceiptPrint] Derived payload fields', {
        incomeId,
        companyId,
        branchId,
        clientPhone,
        fileName,
        containerName
      });

      if (incomeId > 0) {
        let receiptUrl = '';

        const validateResponse = await postOneTicketTracking({
          ticket: [{
            action: 'validate',
            incomeId,
            companyId,
            fileName,
            containerName,
            receiptUrl: '',
            phone: clientPhone
          }]
        });

        const existingTicket = validateResponse?.tickets?.[0];
        const existingReceiptUrl = String(existingTicket?.receiptUrl || '').trim();

        if (existingReceiptUrl) {
          receiptUrl = existingReceiptUrl;
          onSavedUrl(receiptUrl);
          onToast('Recibo ya existente, se omitió generación');
          console.log('[ReceiptPrint] Existing tracked ticket found. Reusing receiptUrl:', receiptUrl);
        } else {
          console.log('[ReceiptPrint] No existing tracked receipt. Generating receipt HTML...');
          const html = ReceiptService.generatePrintHTML(receiptData, {
            width: '46mm',
            thermal: true
          });

          const trimmedHtml = (html || '').trim();
          const isValidTicketHtml =
            trimmedHtml.length > 0 &&
            trimmedHtml.toLowerCase().startsWith('<!doctype html>');

          console.log('[ReceiptPrint] HTML validation', {
            isValidTicketHtml,
            htmlLength: trimmedHtml.length,
            htmlPreview: trimmedHtml.slice(0, 120)
          });

          if (!isValidTicketHtml) {
            console.warn('[ReceiptPrint] Generated receipt HTML is invalid. Upload skipped.');
            onToast('No se pudo generar el HTML del recibo');
          } else {
            const savePayload = {
              incomeId,
              companyId,
              branchId,
              clientPhone,
              html: trimmedHtml,
              fileName
            };

            console.log('[ReceiptPrint] Calling saveTicketHtml', savePayload);
            const saveResponse = await saveTicketHtml(savePayload);
            console.log('[ReceiptPrint] saveTicketHtml response', saveResponse);

            if (saveResponse) {
              const savedUrl = String(saveResponse.receiptUrl || saveResponse.url || '').trim();
              const saveSucceeded = saveResponse.success !== false && !!savedUrl;

              console.log('[ReceiptPrint] Save status', { saveSucceeded, receiptUrl: savedUrl });

              if (saveSucceeded) {
                receiptUrl = savedUrl;
                onSavedUrl(receiptUrl);
                onToast('Recibo HTML guardado correctamente');

                await postOneTicketTracking({
                  ticket: [{
                    action: 'save',
                    incomeId,
                    companyId,
                    fileName,
                    containerName,
                    receiptUrl,
                    phone: clientPhone
                  }]
                });

                console.log('[ReceiptPrint] Ticket tracking saved.');
              } else {
                console.warn('[ReceiptPrint] Receipt HTML response did not include success URL:', saveResponse);
                onToast('Se guardó el recibo, pero no se recibió URL');
              }
            } else {
              console.warn('[ReceiptPrint] Failed to save receipt HTML');
              onToast('No se pudo guardar el recibo HTML');
            }
          }
        }

        if (receiptUrl && clientPhone) {
          const message = `Gracias por su compra. Aquí está su recibo: ${receiptUrl}`;

          console.log('[ReceiptPrint] Sending WhatsApp...', {
            endpointTicketId: String(incomeId),
            endpointPhoneFallback: clientPhone,
            endpointPhoneFallbackDigits: clientPhoneDigits,
            phone: clientPhone,
            message,
            receiptUrl
          });

          let whatsappResponse = await sendTicketWhatsapp(String(incomeId), {
            phone: clientPhone,
            message,
            receiptUrl
          });

          if (!whatsappResponse) {
            console.warn('[ReceiptPrint] WhatsApp by incomeId failed, retrying with phone path param');
            whatsappResponse = await sendTicketWhatsapp(clientPhone, {
              phone: clientPhone,
              message,
              receiptUrl
            });
          }

          if (!whatsappResponse && clientPhoneDigits) {
            console.warn('[ReceiptPrint] WhatsApp by +phone path param failed, retrying with digits-only path param');
            whatsappResponse = await sendTicketWhatsapp(clientPhoneDigits, {
              phone: clientPhone,
              message,
              receiptUrl
            });
          }

          if (whatsappResponse) {
            onToast('WhatsApp enviado correctamente');
            await postOneTicketTracking({
              ticket: [{
                action: 'whatsapp',
                incomeId,
                companyId,
                fileName,
                containerName,
                receiptUrl,
                phone: clientPhone
              }]
            });
          } else {
            onToast('No se pudo enviar WhatsApp');
          }

          console.log('[ReceiptPrint] Sending SMS...', {
            endpointIncomeId: String(incomeId),
            phone: clientPhone,
            message,
            receiptUrl
          });

          const smsResponse = await sendTicketSms(String(incomeId), {
            phone: clientPhone,
            message,
            receiptUrl
          });

          if (smsResponse) {
            onToast('SMS enviado correctamente');
            await postOneTicketTracking({
              ticket: [{
                action: 'sms',
                incomeId,
                companyId,
                fileName,
                containerName,
                receiptUrl,
                phone: clientPhone
              }]
            });
          } else {
            onToast('No se pudo enviar SMS');
          }
        } else if (receiptUrl && !clientPhone) {
          console.warn('[ReceiptPrint] No client phone available, skipping WhatsApp/SMS send');
          onToast('Recibo guardado. Cliente sin teléfono para envío');
        } else {
          console.warn('[ReceiptPrint] No receiptUrl available; skipping WhatsApp/SMS tracking.');
        }
      } else {
        console.warn('[ReceiptPrint] Skipping save/track: invalid incomeId in ticketData');
      }
    } catch (uploadError) {
      console.error('[ReceiptPrint] Error generating/saving receipt HTML on print:', uploadError);
      onToast('Error al guardar el HTML del recibo');
    } finally {
      console.log('[ReceiptPrint] Triggering physical print');
      ReceiptService.printReceipt(receiptData, {
        width: '46mm',
        thermal: true,
        autoPrint: true
      });

      try {
        const incomeId = Number(ticketData?.incomeId ?? 0);
        const companyId = Number(ticketData?.companyId ?? 0);
        const rawClientPhone = String(
          ticketData?.client?.cellphone ??
          ticketData?.client?.phone ??
          ticketData?.clientPhone ??
          ''
        ).trim();
        const normalizedPhoneDigits = rawClientPhone.replace(/\D/g, '');
        const clientPhone = normalizedPhoneDigits ? `+${normalizedPhoneDigits}` : '';
        const safeIncomeForFile = incomeId > 0 ? incomeId : Date.now();
        const fileName = `receipt_${safeIncomeForFile}.html`;

        if (incomeId > 0) {
          await postOneTicketTracking({
            ticket: [{
              action: 'print',
              incomeId,
              companyId,
              fileName,
              containerName: 'ticketspos',
              receiptUrl: '',
              phone: clientPhone
            }]
          });
        }
      } catch (trackPrintError) {
        console.warn('[ReceiptPrint] Failed to track print action', trackPrintError);
      }

      console.log('[ReceiptPrint] Print flow finished');
    }
  }, [receiptData, ticketData, onSavedUrl, onToast]);

  return { handlePrint };
}
