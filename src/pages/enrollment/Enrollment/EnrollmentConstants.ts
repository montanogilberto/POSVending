import { ClientCapability } from '../../../api/clientCapabilitiesApi';

export type EnrollProduct = 'smartloans' | 'factory';

export interface EnrollOption {
  capability: ClientCapability;
  label: string;
  desc: string;
  /** What happens right after enrolling — shown before the client confirms. */
  next: string;
}

export const ENROLL_COPY: Record<EnrollProduct, { title: string; intro: string; options: EnrollOption[]; terms: string[] }> = {
  smartloans: {
    title: 'Activar SmartLoans',
    intro: 'Elige cómo quieres usar SmartLoans. Tu cuenta, tus compras y tus recompensas no cambian.',
    options: [
      {
        capability: 'SMARTLOANS_BORROWER',
        label: 'Acreditado',
        desc: 'Solicita préstamos a otros clientes.',
        next: 'Verificarás tu identificación y rostro, y firmarás pagaré y contrato antes de tu primer préstamo.',
      },
      {
        capability: 'SMARTLOANS_LENDER',
        label: 'Prestamista',
        desc: 'Presta tu dinero y recibe pagos con interés.',
        next: 'Verificarás tu identidad y registrarás la cuenta donde recibirás tus pagos.',
      },
      {
        capability: 'SMARTLOANS_JURIDICAL',
        label: 'Jurídico',
        desc: 'Asesoría legal para acreditados y prestamistas.',
        next: 'El equipo te asigna casos; los verás en tu panel jurídico.',
      },
    ],
    terms: [
      'Autorizo el tratamiento de mis datos personales, incluidos datos biométricos, conforme a la LFPDPPP y el Aviso de Privacidad de POS GMO.',
      'Entiendo que cada préstamo requiere firmar pagaré y contrato dentro de la plataforma.',
    ],
  },
  factory: {
    title: 'Activar Factory AI Software',
    intro: 'Pide software a la medida para tu negocio. Un asesor revisa cada solicitud contigo.',
    options: [
      {
        capability: 'FACTORY_AI',
        label: 'Factory AI Software',
        desc: 'Solicitudes de software construido con IA.',
        next: 'Desde tu panel Factory AI podrás enviar solicitudes y ver su estado.',
      },
    ],
    terms: [
      'Autorizo que un asesor de POS GMO me contacte para dar seguimiento a mis solicitudes.',
    ],
  },
};

export const isEnrollProduct = (v: string | undefined): v is EnrollProduct =>
  v === 'smartloans' || v === 'factory';
