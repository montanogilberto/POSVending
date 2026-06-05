import { useCallback } from 'react';
import {
  postOneTicketTracking,
  saveTicketHtml,
  sendTicketSms,
  sendTicketWhatsapp
} from '../../api/ticketApi';
import { ReceiptService } from '../../services/ReceiptService';

export interface ReceiptActionStatus {
  ok: boolean;
  message: string;
  error?: string;
}

export interface ReceiptPrintSummary {
  azureHtml: ReceiptActionStatus;
  whatsapp: ReceiptActionStatus;
  sms: ReceiptActionStatus;
  print: ReceiptActionStatus;
  receiptUrl: string;
  phone: string;
}

interface UseReceiptPrintParams {
  receiptData: any;
  ticketData: any;
  onSavedUrl: (url: string) => void;
  onToast: (message: string) => void;
  onSummary?: (summary: ReceiptPrintSummary) => void;
}

const normalizeReceiptUrl = (url: string): string => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    return parsed.toString();
  } catch {
    return trimmed.replace(/([^:]\/)\/+/g, '$1');
  }
};

export function useReceiptPrint({
  receiptData,
  ticketData,
  onSavedUrl,
  onToast,
  onSummary
}: UseReceiptPrintParams) {
  const handlePrint = useCallback(async () => {
    const summary: ReceiptPrintSummary = {
      azureHtml: { ok: false, message: 'No ejecutado' },
      whatsapp: { ok: false, message: 'No ejecutado' },
      sms: { ok: false, message: 'No ejecutado' },
      print: { ok: false, message: 'No ejecutado' },
      receiptUrl: '',
      phone: ''
    };

    if (!receiptData) {
      console.log('[ReceiptPrint] No receiptData, print aborted');
      summary.azureHtml = { ok: false, message: 'Sin datos de recibo', error: 'No receiptData' };
      summary.whatsapp = { ok: false, message: 'No ejecutado por falta de recibo' };
      summary.sms = { ok: false, message: 'No ejecutado por falta de recibo' };
      summary.print = { ok: false, message: 'No ejecutado por falta de recibo' };
      onSummary?.(summary);
      return;
    }

    console.log('[ReceiptPrint] Print flow started');
    console.log('[ReceiptPrint][TRACK] Goal checklist', {
        uploadHtmlToAzure: true,
        generateHtmlLink: true,
        sendWhatsapp: true,
        sendSms: true,
        updateDatabaseTables: true,
        physicalPrint: true
      });

    try {
      const directIncomeId = Number(ticketData?.incomeId ?? 0);
      const fallbackIncomeId = Number(ticketData?.id ?? ticketData?.income?.incomeId ?? 0);
      const incomeId = directIncomeId > 0 ? directIncomeId : fallbackIncomeId;
      const incomeIdSource = directIncomeId > 0 ? 'ticketData.incomeId' : (fallbackIncomeId > 0 ? 'fallback(ticketData.id|ticketData.income.incomeId)' : 'unresolved');
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
      summary.phone = clientPhone;
      const safeIncomeForFile = incomeId > 0 ? incomeId : Date.now();
      const fileName = `receipt_${safeIncomeForFile}.html`;
      const containerName = 'ticketspos';

      console.log('[ReceiptPrint] Derived payload fields', {
        incomeId,
        incomeIdSource,
        companyId,
        branchId,
        clientPhone,
        fileName,
        containerName
      });

      if (incomeId > 0) {
        let receiptUrl = '';

        const validatePayload = {
          ticket: [{
            action: 'validate' as const,
            incomeId,
            companyId,
            fileName,
            containerName,
            receiptUrl: '',
            phone: clientPhone
          }]
        };
        console.log('[ReceiptPrint][DB_TRACKING] Sending validate payload', validatePayload);
        const validateResponse = await postOneTicketTracking(validatePayload);
        console.log('[ReceiptPrint][DB_TRACKING] Validate response', validateResponse);

        const existingTicket = validateResponse?.tickets?.[0];
        const existingReceiptUrl = normalizeReceiptUrl(String(existingTicket?.receiptUrl || '').trim());

        if (existingReceiptUrl) {
          receiptUrl = existingReceiptUrl;
          summary.receiptUrl = receiptUrl;
          summary.azureHtml = { ok: true, message: 'Recibo ya existía (URL reutilizada)' };
          onSavedUrl(receiptUrl);
          onToast('Recibo ya existente, se omitió generación');
          console.log('[ReceiptPrint] Existing tracked ticket found. Reusing receiptUrl:', receiptUrl);
        } else {
          console.log('[ReceiptPrint] No existing tracked receipt. Generating receipt HTML...');
          const html = ReceiptService.generateMobileReceiptHTML(receiptData);

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
            summary.azureHtml = {
              ok: false,
              message: 'No se pudo generar el HTML del recibo',
              error: 'Generated HTML is invalid'
            };
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

            console.log('[ReceiptPrint][SAVE] Saving receipt HTML to Azure...', savePayload);
            const saveResponse = await saveTicketHtml(savePayload);
            console.log('[ReceiptPrint][SAVE] Receipt HTML persisted response:', saveResponse);

            if (saveResponse) {
              const savedUrl = normalizeReceiptUrl(String(saveResponse.receiptUrl || saveResponse.url || '').trim());
              const saveSucceeded = saveResponse.success !== false && !!savedUrl;

              console.log('[ReceiptPrint] Save status', { saveSucceeded, receiptUrl: savedUrl });

              if (saveSucceeded) {
                receiptUrl = savedUrl;
                summary.receiptUrl = receiptUrl;
                summary.azureHtml = { ok: true, message: 'Recibo HTML guardado en Azure' };
                onSavedUrl(receiptUrl);
                onToast('Recibo HTML guardado correctamente');

                console.log('[ReceiptPrint][TRACKING] Saving tracking record (action=save)');
                const saveTrackingPayload = {
                  ticket: [{
                    action: 'save' as const,
                    incomeId,
                    companyId,
                    fileName,
                    containerName,
                    receiptUrl,
                    phone: clientPhone
                  }]
                };
                console.log('[ReceiptPrint][TRACKING] Calling /one_ticket_tracking with payload:', saveTrackingPayload);
                const saveTrackingResponse = await postOneTicketTracking(saveTrackingPayload);
                console.log('[ReceiptPrint][TRACKING] Response from sp_ticket_tracking (save):', saveTrackingResponse);

                console.log('[ReceiptPrint] Ticket tracking saved.');
              } else {
                console.warn('[ReceiptPrint][SAVE] Receipt HTML did not persist with URL:', saveResponse);
                summary.azureHtml = {
                  ok: false,
                  message: 'Respuesta sin URL de recibo',
                  error: JSON.stringify(saveResponse)
                };
                onToast('Se guardó el recibo, pero no se recibió URL');
              }
            } else {
              console.warn('[ReceiptPrint][SAVE] Failed to persist receipt HTML');
              summary.azureHtml = {
                ok: false,
                message: 'No se pudo guardar el recibo HTML',
                error: 'saveTicketHtml returned null'
              };
              onToast('No se pudo guardar el recibo HTML');
            }
          }
        }

        if (receiptUrl && clientPhone) {
          const message = 'Aquí está su recibo:';

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
            summary.whatsapp = { ok: true, message: 'WhatsApp enviado correctamente' };
            onToast('WhatsApp enviado correctamente');
            const whatsappTrackingPayload = {
              ticket: [{
                action: 'whatsapp' as const,
                incomeId,
                companyId,
                fileName,
                containerName,
                receiptUrl,
                phone: clientPhone,
                channelResponse: whatsappResponse
              }]
            };
            console.log('[ReceiptPrint][DB_TRACKING] Sending whatsapp payload', whatsappTrackingPayload);
            const whatsappTrackingResponse = await postOneTicketTracking(whatsappTrackingPayload);
            console.log('[ReceiptPrint][DB_TRACKING] WhatsApp tracking response', whatsappTrackingResponse);
          } else {
            summary.whatsapp = {
              ok: false,
              message: 'No se pudo enviar WhatsApp',
              error: 'All endpoint variants failed'
            };
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
            summary.sms = { ok: true, message: 'SMS enviado correctamente' };
            onToast('SMS enviado correctamente');
            const smsTrackingPayload = {
              ticket: [{
                action: 'sms' as const,
                incomeId,
                companyId,
                fileName,
                containerName,
                receiptUrl,
                phone: clientPhone,
                channelResponse: smsResponse
              }]
            };
            console.log('[ReceiptPrint][DB_TRACKING] Sending sms payload', smsTrackingPayload);
            const smsTrackingResponse = await postOneTicketTracking(smsTrackingPayload);
            console.log('[ReceiptPrint][DB_TRACKING] SMS tracking response', smsTrackingResponse);
          } else {
            summary.sms = {
              ok: false,
              message: 'No se pudo enviar SMS',
              error: 'sendTicketSms returned null'
            };
            onToast('No se pudo enviar SMS');
          }
        } else if (receiptUrl && !clientPhone) {
          console.warn('[ReceiptPrint] No client phone available, skipping WhatsApp/SMS send');
          summary.whatsapp = { ok: false, message: 'No enviado: cliente sin teléfono' };
          summary.sms = { ok: false, message: 'No enviado: cliente sin teléfono' };
          onToast('Recibo guardado. Cliente sin teléfono para envío');
        } else {
          console.warn('[ReceiptPrint] No receiptUrl available; skipping WhatsApp/SMS tracking.');
          if (!summary.azureHtml.message || summary.azureHtml.message === 'No ejecutado') {
            summary.azureHtml = { ok: false, message: 'No se obtuvo URL del recibo' };
          }
          summary.whatsapp = { ok: false, message: 'No enviado: sin URL de recibo' };
          summary.sms = { ok: false, message: 'No enviado: sin URL de recibo' };
        }
      } else {
        console.warn('[ReceiptPrint] Skipping save/track: invalid incomeId in ticketData', {
          incomeId,
          incomeIdSource,
          ticketDataSnapshot: {
            incomeId: ticketData?.incomeId,
            id: ticketData?.id,
            nestedIncomeId: ticketData?.income?.incomeId
          }
        });
        summary.azureHtml = { ok: false, message: 'incomeId inválido para guardar ticket' };
        summary.whatsapp = { ok: false, message: 'No enviado por incomeId inválido' };
        summary.sms = { ok: false, message: 'No enviado por incomeId inválido' };
      }
    } catch (uploadError: any) {
      console.error('[ReceiptPrint] Error generating/saving receipt HTML on print:', uploadError);
      summary.azureHtml = {
        ok: false,
        message: 'Error al guardar el HTML del recibo',
        error: uploadError?.message || String(uploadError)
      };
      onToast('Error al guardar el HTML del recibo');
    } finally {
      console.log('[ReceiptPrint][PHYSICAL_PRINT] Triggering physical print');
      try {
        ReceiptService.printReceipt(receiptData, {
          width: '46mm',
          thermal: true,
          autoPrint: true
        });
        summary.print = { ok: true, message: 'Impresión física ejecutada' };
      } catch (printError: any) {
        summary.print = {
          ok: false,
          message: 'Falló la impresión física',
          error: printError?.message || String(printError)
        };
      }

      try {
        const directIncomeId = Number(ticketData?.incomeId ?? 0);
        const fallbackIncomeId = Number(ticketData?.id ?? ticketData?.income?.incomeId ?? 0);
        const incomeId = directIncomeId > 0 ? directIncomeId : fallbackIncomeId;
        const incomeIdSource = directIncomeId > 0 ? 'ticketData.incomeId' : (fallbackIncomeId > 0 ? 'fallback(ticketData.id|ticketData.income.incomeId)' : 'unresolved');
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
          const printTrackingPayload = {
            ticket: [{
              action: 'print' as const,
              incomeId,
              companyId,
              fileName,
              containerName: 'ticketspos',
              receiptUrl: '',
              phone: clientPhone
            }]
          };
          console.log('[ReceiptPrint][DB_TRACKING] Sending print payload', {
            incomeIdSource,
            payload: printTrackingPayload
          });
          const printTrackingResponse = await postOneTicketTracking(printTrackingPayload);
          console.log('[ReceiptPrint][DB_TRACKING] Print tracking response', printTrackingResponse);
        }
      } catch (trackPrintError) {
        console.warn('[ReceiptPrint] Failed to track print action', trackPrintError);
      }

      onSummary?.(summary);
      console.log('[ReceiptPrint] Print flow finished', summary);
    }
  }, [receiptData, ticketData, onSavedUrl, onToast, onSummary]);

  return { handlePrint };
}
