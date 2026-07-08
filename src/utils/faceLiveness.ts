// Self-hosted liveness + face-match, replacing the Azure Face Liveness SDK.
// Uses @vladmandic/face-api (an actively-maintained face-api.js fork) running
// entirely client-side: no vendor approval, no per-check cost, no session API.
//
// Trade-off vs. a dedicated liveness SDK: weaker anti-spoofing guarantees (a
// static high-res photo or video replay could in theory defeat the 4-move
// head-turn challenge). Acceptable here because the ID-photo face match is
// still enforced and the challenge order is randomized per attempt.
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models/face-api';
const MATCH_DISTANCE_THRESHOLD = 0.6; // face-api.js's own recommended cutoff

let modelsLoadedPromise: Promise<void> | null = null;

export function loadFaceApiModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    console.log('[FaceLiveness] loadFaceApiModels: starting model download from', MODEL_URL);
    const startedAt = Date.now();
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => {
        console.log(`[FaceLiveness] loadFaceApiModels: all models loaded in ${Date.now() - startedAt}ms`);
      })
      .catch((err) => {
        console.log('[FaceLiveness] loadFaceApiModels: FAILED', err);
        modelsLoadedPromise = null; // allow a retry instead of caching a rejected promise forever
        throw err;
      });
  } else {
    console.log('[FaceLiveness] loadFaceApiModels: already loaded/loading, reusing cached promise');
  }
  return modelsLoadedPromise;
}

// Tuned for the live selfie challenge: a face filling most of the frame,
// needs to run every ~150ms, so speed matters more than sensitivity.
const VIDEO_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

// Tuned for a captured ID card photo: the face is a small photo within a much
// larger document image, so TinyFaceDetector (built for a face filling the
// frame) misses it entirely. SsdMobilenetv1 is slower but far more accurate
// for small/varied face sizes — acceptable here since this only runs once on
// a static image, not in a real-time loop.
const ID_IMAGE_DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

export type FaceDetectionResult = {
  descriptor: Float32Array;
  landmarks: faceapi.FaceLandmarks68;
};

async function detectFace(
  input: faceapi.TNetInput,
  options: faceapi.TinyFaceDetectorOptions | faceapi.SsdMobilenetv1Options
): Promise<FaceDetectionResult | null> {
  const result = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return { descriptor: result.descriptor, landmarks: result.landmarks };
}

export async function detectFaceFromVideo(video: HTMLVideoElement): Promise<FaceDetectionResult | null> {
  await loadFaceApiModels();
  const result = await detectFace(video, VIDEO_DETECTOR_OPTIONS);
  console.log('[FaceLiveness] detectFaceFromVideo: face', result ? 'DETECTED' : 'not detected this frame');
  return result;
}

// Loads a base64/data-URL image (e.g. the captured ID front photo) into an
// HTMLImageElement and runs the same detection pipeline, so the ID descriptor
// and the live-selfie descriptor are computed the exact same way.
export async function getFaceDescriptorFromImage(base64OrDataUrl: string): Promise<Float32Array | null> {
  console.log('[FaceLiveness] getFaceDescriptorFromImage: starting, input length =', base64OrDataUrl.length);
  await loadFaceApiModels();
  const dataUrl = base64OrDataUrl.startsWith('data:')
    ? base64OrDataUrl
    : `data:image/jpeg;base64,${base64OrDataUrl}`;

  const img = new Image();
  const loaded = new Promise<void>((resolvePromise, reject) => {
    img.onload = () => resolvePromise();
    img.onerror = () => reject(new Error('No se pudo procesar la imagen de la identificación.'));
  });
  img.src = dataUrl;
  await loaded;
  console.log('[FaceLiveness] getFaceDescriptorFromImage: image decoded', img.naturalWidth, 'x', img.naturalHeight);

  const result = await detectFace(img, ID_IMAGE_DETECTOR_OPTIONS);
  console.log('[FaceLiveness] getFaceDescriptorFromImage: result =', result ? 'face found, descriptor computed' : 'NO FACE FOUND in ID image');
  return result?.descriptor ?? null;
}

export function compareFaceDescriptors(a: Float32Array, b: Float32Array): { distance: number; isMatch: boolean } {
  const distance = faceapi.euclideanDistance(a, b);
  const isMatch = distance <= MATCH_DISTANCE_THRESHOLD;
  console.log('[FaceLiveness] compareFaceDescriptors: distance =', distance.toFixed(4), '| threshold =', MATCH_DISTANCE_THRESHOLD, '| isMatch =', isMatch);
  return { distance, isMatch };
}

// Converts a face-match distance (0 = identical, ~1.5 = very different) into
// a 0-1 "confidence" figure so it fits the existing confidenceScore field
// that used to hold Azure's matchConfidence.
export function distanceToConfidence(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance / MATCH_DISTANCE_THRESHOLD * 0.5));
}

// ── Liveness challenges ──────────────────────────────────────────────────────
// Sequential 4-direction head-movement challenge (left/right/up/down), shown
// one at a time with a 4-segment progress ring in FaceLivenessCapture. All
// four must complete before a selfie frame + descriptor are captured.

export type LivenessChallenge = 'left' | 'right' | 'up' | 'down';

export const CHALLENGE_LABEL: Record<LivenessChallenge, string> = {
  left: 'Gira la cabeza a tu izquierda',
  right: 'Gira la cabeza a tu derecha',
  up: 'Levanta la mirada hacia arriba',
  down: 'Baja la mirada hacia abajo',
};

// Randomized order each attempt so a static video/photo replay can't be
// pre-recorded to match a fixed sequence.
export function pickChallengeSequence(): LivenessChallenge[] {
  const sequence: LivenessChallenge[] = ['left', 'right', 'up', 'down'];
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  console.log('[FaceLiveness] pickChallengeSequence:', sequence);
  return sequence;
}

const YAW_OFFSET_RATIO = 0.18; // left/right — confirmed against real device logs (0.34 / -0.187 observed)
const PITCH_OFFSET_RATIO = 0.15; // up/down — heuristic, may need on-device threshold tuning

export interface ChallengeFrameState {
  /** true once the challenge's motion was actually observed this attempt */
  triggered: boolean;
}

export function newChallengeState(): ChallengeFrameState {
  return { triggered: false };
}

// Called once per analyzed video frame. Mutates `state` and returns whether
// the given challenge just completed on this frame.
export function evaluateChallengeFrame(
  challenge: LivenessChallenge,
  detection: FaceDetectionResult,
  state: ChallengeFrameState
): boolean {
  const nose = detection.landmarks.getNose();
  const leftEye = detection.landmarks.getLeftEye();
  const rightEye = detection.landmarks.getRightEye();
  const noseTip = nose[Math.floor(nose.length / 2)];

  if (challenge === 'left' || challenge === 'right') {
    // Compare nose-tip x position against the midpoint between the outer
    // eye corners, normalized by face width — sign/magnitude indicates
    // which way the head is turned regardless of frame resolution.
    const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
    const faceWidth = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
    const offsetRatio = (noseTip.x - eyeMidX) / faceWidth;

    // Note: video is mirrored (selfie view), so a user turning their head to
    // their own left moves the nose to the right of the mirrored frame.
    if (challenge === 'left' && offsetRatio > YAW_OFFSET_RATIO) {
      if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[left]: offsetRatio =', offsetRatio.toFixed(3), '→ challenge COMPLETE');
      state.triggered = true;
    }
    if (challenge === 'right' && offsetRatio < -YAW_OFFSET_RATIO) {
      if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[right]: offsetRatio =', offsetRatio.toFixed(3), '→ challenge COMPLETE');
      state.triggered = true;
    }
    return state.triggered;
  }

  // Head pitch: compare nose-tip y position against the vertical midpoint
  // between the eye line and the chin, normalized by face height.
  const jaw = detection.landmarks.getJawOutline();
  const chin = jaw[Math.floor(jaw.length / 2)];
  const eyeMidY = (leftEye[0].y + rightEye[3].y) / 2;
  const faceHeight = Math.abs(chin.y - eyeMidY) || 1;
  const offsetYRatio = (noseTip.y - (eyeMidY + chin.y) / 2) / faceHeight;

  if (challenge === 'down' && offsetYRatio > PITCH_OFFSET_RATIO) {
    if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[down]: offsetYRatio =', offsetYRatio.toFixed(3), '→ challenge COMPLETE');
    state.triggered = true;
  }
  if (challenge === 'up' && offsetYRatio < -PITCH_OFFSET_RATIO) {
    if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[up]: offsetYRatio =', offsetYRatio.toFixed(3), '→ challenge COMPLETE');
    state.triggered = true;
  }
  return state.triggered;
}
