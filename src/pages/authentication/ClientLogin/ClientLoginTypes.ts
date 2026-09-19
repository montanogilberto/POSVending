export type ClientLoginStep = 'phone' | 'code' | 'returning-password' | 'password' | 'biometric';

export interface PendingClientSession {
  userId: number;
  clientId: number;
  roleCode: string;
}
