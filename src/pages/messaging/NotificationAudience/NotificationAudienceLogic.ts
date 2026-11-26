import { useCallback, useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notificationAudienceApi, NotificationAudienceCode, NotificationAudienceUpsertRequest } from '../../../api/notificationAudienceApi';
import { notifyDataChanged } from '../../../utils/refreshBus';

export const useNotificationAudience = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [loading, setLoading] = useState(false);
  const [pushNotificationId, setPushNotificationId] = useState<number | undefined>(undefined);
  const [audience, setAudience] = useState<NotificationAudienceCode | undefined>(undefined);
  const [excludeUserId, setExcludeUserId] = useState<number | undefined>(undefined);

  const [pushNotificationIdError, setPushNotificationIdError] = useState('');
  const [audienceError, setAudienceError] = useState('');

  const validateForm = useCallback(() => {
    let isValid = true;
    setPushNotificationIdError('');
    setAudienceError('');

    if (!pushNotificationId) {
      setPushNotificationIdError('ID de Notificación es requerido.');
      isValid = false;
    }
    if (!audience) {
      setAudienceError('Audiencia es requerida.');
      isValid = false;
    }
    return isValid;
  }, [pushNotificationId, audience]);

  const handleUpsert = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload: NotificationAudienceUpsertRequest = {
        companyId,
        pushNotificationId: pushNotificationId!,
        audience: audience!
      };
      if (excludeUserId !== undefined && excludeUserId !== null) {
        payload.excludeUserId = excludeUserId;
      }

      await notificationAudienceApi.upsert(payload);
      showToast('Audiencia de notificación guardada con éxito.', 'success');
      notifyDataChanged('notificationAudience-upserted');

      // Clear form after successful upsert
      setPushNotificationId(undefined);
      setAudience(undefined);
      setExcludeUserId(undefined);

    } catch (err) {
      showToast((err as Error).message ?? 'Error al guardar la audiencia de notificación.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, pushNotificationId, audience, excludeUserId, showToast, validateForm]);

  return {
    loading,
    toastProps,
    pushNotificationId,
    setPushNotificationId,
    audience,
    setAudience,
    excludeUserId,
    setExcludeUserId,
    pushNotificationIdError,
    audienceError,
    handleUpsert
  };
};

export type NotificationAudienceVM = ReturnType<typeof useNotificationAudience>;
