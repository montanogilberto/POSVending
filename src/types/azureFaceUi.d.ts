// Minimal ambient types for the gated Azure Face Liveness Detector web component.
// The package has no published TypeScript types; see:
// https://aka.ms/azure-ai-vision-face-liveness-client-sdk-web-readme
declare module '@azure/ai-vision-face-ui/FaceLivenessDetector.js' {
  const registerFaceLivenessDetector: void;
  export default registerFaceLivenessDetector;
}

interface AzureFaceLivenessDetectorElement extends HTMLElement {
  start(sessionAuthorizationToken: string): Promise<unknown>;
  mediaInfoDeviceId?: string;
}

interface HTMLElementTagNameMap {
  'azure-ai-vision-face-ui': AzureFaceLivenessDetectorElement;
}
