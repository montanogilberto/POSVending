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
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoadedPromise;
}

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

export type FaceDetectionResult = {
  descriptor: Float32Array;
  landmarks: faceapi.FaceLandmarks68;
  expressions: faceapi.FaceExpressions;
};

async function detectFace(input: faceapi.TNetInput): Promise<FaceDetectionResult | null> {
  const result = await faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();
  if (!result) return null;
  return { descriptor: result.descriptor, landmarks: result.landmarks, expressions: result.expressions };
}

export async function detectFaceFromVideo(video: HTMLVideoElement): Promise<FaceDetectionResult | null> {
  await loadFaceApiModels();
  return detectFace(video);
}

// Loads a base64/data-URL image (e.g. the captured ID front photo) into an
// HTMLImageElement and runs the same detection pipeline, so the ID descriptor
// and the live-selfie descriptor are computed the exact same way.
export async function getFaceDescriptorFromImage(base64OrDataUrl: string): Promise<Float32Array | null> {
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

  const result = await detectFace(img);
  return result?.descriptor ?? null;
}

export function compareFaceDescriptors(a: Float32Array, b: Float32Array): { distance: number; isMatch: boolean } {
  const distance = faceapi.euclideanDistance(a, b);
  return { distance, isMatch: distance <= MATCH_DISTANCE_THRESHOLD };
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
  return LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
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
      state.earWasClosed = true;
    } else if (state.earWasClosed) {
      state.triggered = true;
    }
    return state.triggered;
  }

  if (challenge === 'smile') {
    if (detection.expressions.happy >= SMILE_HAPPY_THRESHOLD) {
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
  if (challenge === 'turn-left' && offsetRatio > TURN_OFFSET_RATIO) state.triggered = true;
  if (challenge === 'turn-right' && offsetRatio < -TURN_OFFSET_RATIO) state.triggered = true;
  return state.triggered;
}
