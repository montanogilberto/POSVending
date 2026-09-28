import { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { isStaffRole, hasCapability } from '../../../config/rolePermissions';
import { ClientCapability, grantClientCapability } from '../../../api/clientCapabilitiesApi';
import { ProductContext, productLandingRoute } from '../../../utils/productContext';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { useToast } from '../../../hooks/useToast';
import { ENROLL_COPY, isEnrollProduct } from './EnrollmentConstants';

/** Product context a capability opens, used to land the client right after enrolling. */
const PRODUCT_FOR: Partial<Record<ClientCapability, ProductContext>> = {
  SMARTLOANS_BORROWER:  'borrower',
  SMARTLOANS_LENDER:    'lender',
  SMARTLOANS_JURIDICAL: 'juridical',
  FACTORY_AI:           'factory',
};

/**
 * Self-service enrollment into a product the client does not hold yet.
 * Grants the chosen capabilities for the CURRENT company (clientCapabilities
 * is company-scoped) and lands the client on that product's dashboard, which
 * runs the product's own onboarding (KYC, pagaré, contrato, payout account).
 * Never replaces an existing membership — grants only add rows.
 */
export function useEnrollment() {
  const history = useHistory();
  const { product: productParam } = useParams<{ product: string }>();
  const {
    companyId, clientId, roleCode, clientCapabilities, refreshCapabilities, setActiveProduct,
  } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const product = isEnrollProduct(productParam) ? productParam : null;
  const copy = product ? ENROLL_COPY[product] : null;

  const held = useMemo(
    () => (copy?.options ?? []).filter(o => hasCapability(clientCapabilities, o.capability)).map(o => o.capability),
    [copy, clientCapabilities],
  );
  const [selected, setSelected] = useState<ClientCapability[]>(
    () => (copy && copy.options.length === 1 ? [copy.options[0].capability] : []),
  );
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Staff operate on behalf of a company; enrolling is a self-service action
  // for the logged-in client's own record.
  const blockedReason =
    !copy ? 'Producto no disponible.'
      : isStaffRole(roleCode) ? 'Las cuentas de personal no se inscriben a productos desde aquí.'
      : !clientId || !companyId ? 'Tu cuenta no tiene un registro de cliente todavía.'
      : null;

  const toggle = (capability: ClientCapability, on: boolean) =>
    setSelected(prev => (on ? [...new Set([...prev, capability])] : prev.filter(c => c !== capability)));

  const toGrant = selected.filter(c => !held.includes(c));
  const canSubmit = !blockedReason && accepted && toGrant.length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      for (const capability of toGrant) {
        console.log('[Enrollment] granting', capability, 'companyId=', companyId, 'clientId=', clientId);
        await grantClientCapability(companyId, clientId, capability);
      }
      await refreshCapabilities();
      notifyDataChanged('enrollment');
      const landing = PRODUCT_FOR[toGrant[0]];
      if (landing) {
        setActiveProduct(landing);
        history.replace(productLandingRoute(landing, clientId));
      } else {
        history.goBack();
      }
    } catch (err) {
      console.error('[Enrollment] grant failed:', err);
      showToast('No se pudo activar. Intenta de nuevo o contacta a soporte.');
    } finally {
      setSaving(false);
    }
  };

  const goToHeld = (capability: ClientCapability) => {
    const target = PRODUCT_FOR[capability];
    if (!target) return;
    setActiveProduct(target);
    history.replace(productLandingRoute(target, clientId));
  };

  return {
    history, product, copy, held, selected, toggle, accepted, setAccepted,
    saving, canSubmit, submit, blockedReason, goToHeld, toastProps,
  };
}

export type EnrollmentVM = ReturnType<typeof useEnrollment>;
