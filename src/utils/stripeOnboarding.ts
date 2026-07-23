import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { getStripeOnboardingLink } from '../api/stripeApi';

// Where Stripe should send the user after they finish (or back out of) the
// hosted onboarding form. On the web the app's own origin is a real, loadable
// page. Inside the native WebView `window.location.origin` is
// capacitor://localhost, which Stripe rejects as a return_url and the in-app
// browser can't load — so fall back to a public HTTPS base. We detect the
// user's return from the in-app browser's own dismissal event (not this URL),
// so the landing page only needs to load; it doesn't need to deep-link back.
const WEB_RETURN_BASE =
  import.meta.env.VITE_WEB_URL ??
  import.meta.env.VITE_API_URL ??
  'https://smartloansbackend.azurewebsites.net';

function returnBase(): string {
  return Capacitor.isNativePlatform() ? WEB_RETURN_BASE : window.location.origin;
}

/**
 * Opens a Stripe hosted-onboarding URL without kicking the user out to the
 * system browser.
 *
 * On native we present an in-app browser (Chrome Custom Tabs on Android /
 * SFSafariViewController on iOS) as an overlay, and re-run `onReturn` the
 * moment that browser is dismissed — that's when we re-check the connected
 * account's status. On web there's no WebView to trap us, so we open a normal
 * new tab and leave the caller to refresh on its own.
 */
export async function openStripeOnboardingUrl(url: string, onReturn: () => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return;
  }
  const finished = await Browser.addListener('browserFinished', () => {
    finished.remove();
    onReturn();
  });
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Full hosted-onboarding entry point for native: fetch a fresh Account Link
 * and open it in an in-app browser. `onReturn` fires when the user comes back
 * so callers can refresh the on-file Stripe account status.
 *
 * `returnPath`/`refreshPath` are appended to the return base; they mostly
 * matter on web (where the app can resume a specific screen). On native the
 * poll-on-return handles continuation, so the defaults are fine.
 */
export async function startHostedStripeOnboarding(
  clientId: number,
  companyId: number,
  onReturn: () => void,
  opts?: { returnPath?: string; refreshPath?: string }
): Promise<void> {
  const base = returnBase();
  const { url } = await getStripeOnboardingLink(
    clientId,
    companyId,
    `${base}${opts?.returnPath ?? '/'}`,
    `${base}${opts?.refreshPath ?? '/'}`,
  );
  await openStripeOnboardingUrl(url, onReturn);
}
