/**
 * Where an authenticated user should land, based on role.
 * Shared by Login.tsx (after signing in) and CreateAccount.tsx (guard
 * against an already-authenticated user seeing the signup form).
 */
export function getPostLoginRoute(roleCode: string | undefined, clientId: number | undefined): string {
  if (roleCode === 'lender') {
    return clientId ? `/lender-dashboard/${clientId}` : '/dashboard';
  }
  if (roleCode === 'borrower') {
    return clientId ? `/client-dashboard/${clientId}` : '/dashboard';
  }
  if (roleCode === 'business' || roleCode === 'employee') {
    return '/dashboard';
  }
  return '/dashboard';
}
