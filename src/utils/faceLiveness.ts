// Self-hosted liveness + face-match, replacing the Azure Face Liveness SDK.
// Uses @vladmandic/face-api (an actively-maintained face-api.js fork) running
// entirely client-side: no vendor approval, no per-check cost, no session API.
//
// Trade-off vs. a dedicated liveness SDK: weaker anti-spoofing guarantees (a
// static high-res photo or video replay could in theory defeat a single
// blink/turn/smile challenge). Acceptable here because the ID-photo face
// match is still enforced and the challenge is randomized per attempt.
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
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
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
  expressions: faceapi.FaceExpressions;
};

async function detectFace(
  input: faceapi.TNetInput,
  options: faceapi.TinyFaceDetectorOptions | faceapi.SsdMobilenetv1Options
): Promise<FaceDetectionResult | null> {
  const result = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();
  if (!result) return null;
  return { descriptor: result.descriptor, landmarks: result.landmarks, expressions: result.expressions };
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

export type LivenessChallenge = 'blink' | 'turn-left' | 'turn-right' | 'smile';

export const LIVENESS_CHALLENGES: LivenessChallenge[] = ['blink', 'turn-left', 'turn-right', 'smile'];

export const CHALLENGE_LABEL: Record<LivenessChallenge, string> = {
  blink: 'Parpadea dos veces',
  'turn-left': 'Gira la cabeza a tu izquierda',
  'turn-right': 'Gira la cabeza a tu derecha',
  smile: 'Sonríe',
};

export function pickRandomChallenge(): LivenessChallenge {
  const challenge = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
  console.log('[FaceLiveness] pickRandomChallenge:', challenge);
  return challenge;
}

function eyeAspectRatio(eye: faceapi.Point[]): number {
  // Standard 6-point EAR formula (Soukupová & Čech). eye[0..5] are the 6
  // landmark points face-api.js returns per eye, in the same fixed order
  // dlib's 68-point model uses.
  const dist = (p1: faceapi.Point, p2: faceapi.Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

const EAR_CLOSED_THRESHOLD = 0.21;
const SMILE_HAPPY_THRESHOLD = 0.7;
const TURN_OFFSET_RATIO = 0.18;

export interface ChallengeFrameState {
  /** true once the challenge's motion/expression was actually observed this attempt */
  triggered: boolean;
}

export function newChallengeState(): ChallengeFrameState {
  return { triggered: false };
}

// Called once per analyzed video frame. Mutates `state` and returns whether
// the challenge just completed on this frame. Each challenge type needs the
// user to move away from neutral and (for blink) back again, so a single
// borderline frame can't accidentally satisfy it.
export function evaluateChallengeFrame(
  challenge: LivenessChallenge,
  detection: FaceDetectionResult,
  state: ChallengeFrameState & { earWasClosed?: boolean }
): boolean {
  if (challenge === 'blink') {
    const ear = (eyeAspectRatio(detection.landmarks.getLeftEye()) + eyeAspectRatio(detection.landmarks.getRightEye())) / 2;
    if (ear < EAR_CLOSED_THRESHOLD) {
      if (!state.earWasClosed) console.log('[FaceLiveness] evaluateChallengeFrame[blink]: eyes closed detected, EAR =', ear.toFixed(3));
      state.earWasClosed = true;
    } else if (state.earWasClosed) {
      console.log('[FaceLiveness] evaluateChallengeFrame[blink]: eyes reopened, EAR =', ear.toFixed(3), '→ challenge COMPLETE');
      state.triggered = true;
    }
    return state.triggered;
  }

  if (challenge === 'smile') {
    if (detection.expressions.happy >= SMILE_HAPPY_THRESHOLD) {
      if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[smile]: happy =', detection.expressions.happy.toFixed(3), '→ challenge COMPLETE');
      state.triggered = true;
    }
    return state.triggered;
  }

  // Head turn: compare nose-tip x position against the midpoint between the
  // outer eye corners, normalized by face width — sign/magnitude indicates
  // which way the head is turned regardless of frame resolution.
  const nose = detection.landmarks.getNose();
  const leftEye = detection.landmarks.getLeftEye();
  const rightEye = detection.landmarks.getRightEye();
  const noseTip = nose[Math.floor(nose.length / 2)];
  const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
  const faceWidth = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
  const offsetRatio = (noseTip.x - eyeMidX) / faceWidth;

  // Note: video is mirrored (selfie view), so a user turning their head to
  // their own left moves the nose to the right of the mirrored frame.
  if (challenge === 'turn-left' && offsetRatio > TURN_OFFSET_RATIO) {
    if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[turn-left]: offsetRatio =', offsetRatio.toFixed(3), '→ challenge COMPLETE');
    state.triggered = true;
  }
  if (challenge === 'turn-right' && offsetRatio < -TURN_OFFSET_RATIO) {
    if (!state.triggered) console.log('[FaceLiveness] evaluateChallengeFrame[turn-right]: offsetRatio =', offsetRatio.toFixed(3), '→ challenge COMPLETE');
    state.triggered = true;
  }
  return state.triggered;
}
