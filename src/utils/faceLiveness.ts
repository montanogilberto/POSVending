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

// ── Anti-spoofing checks ─────────────────────────────────────────────────────
// The 4-direction challenge above only checks 2D landmark geometry, which
// can't distinguish a real head turning from a photo/video on another screen
// being physically tilted the same way. These two checks close the cheapest,
// most common attacks (a static printed/displayed photo, or swapping what's
// in front of the camera partway through) without needing a depth sensor or
// a paid liveness SDK. A video replay of the real person performing the
// moves is a residual risk this can't fully close — that's the accepted
// trade-off of a free, self-hosted liveness check (see module header).

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

export interface BlinkTrackerState {
  earWasClosed: boolean;
  blinkDetected: boolean;
}

export function newBlinkTrackerState(): BlinkTrackerState {
  return { earWasClosed: false, blinkDetected: false };
}

// Called every frame regardless of which directional challenge is active.
// A static photo can never close and reopen its eyes, so requiring one
// blink at some point during the session — independent of the 4 visible
// moves — kills the simplest, most common spoofing attempt.
export function trackBlink(detection: FaceDetectionResult, state: BlinkTrackerState): boolean {
  const ear = (eyeAspectRatio(detection.landmarks.getLeftEye()) + eyeAspectRatio(detection.landmarks.getRightEye())) / 2;
  if (ear < EAR_CLOSED_THRESHOLD) {
    state.earWasClosed = true;
  } else if (state.earWasClosed && !state.blinkDetected) {
    console.log('[FaceLiveness] trackBlink: blink detected, EAR =', ear.toFixed(3));
    state.blinkDetected = true;
  }
  return state.blinkDetected;
}

// Tuned empirically against real device logs across two rounds. Round 1
// (all-pairs, no reference) landed legitimate same-person sessions at
// 0.70-0.82 against a 0.5 cutoff — always failed. Round 2 (frontal reference
// instead of all-pairs, this file's current comparison strategy) only
// brought that down to 0.67-0.75 against a 0.6 cutoff — comparing a single
// reference frame against a hard-turned pose still shows this much drift
// with TinyFaceDetector + no face alignment, so the reference-vs-all-pairs
// choice matters less than expected. Set well above the observed ~0.82
// worst case seen so far, accepting this becomes a coarse "wildly different
// face" backstop rather than a fine-grained spoof check — the ID-photo
// match (MATCH_DISTANCE_THRESHOLD above), the blink check, and the
// randomized 4-direction sequence remain the primary anti-spoofing layers.
const CONSISTENCY_DISTANCE_THRESHOLD = 0.95;

// Compares the face descriptor captured at each of the 4 challenge
// completions against a single roughly-frontal "reference" descriptor taken
// the moment a face was first acquired, before any directional move —
// rather than against each other. If someone swaps what's in front of the
// camera mid-session (e.g. switches to a held-up photo partway through),
// the swapped descriptor still diverges from the frontal reference well
// past this cutoff; but two legitimate opposing-extreme poses of the same
// person no longer get compared directly against each other, which is what
// previously made this check structurally unpassable (see threshold comment
// above).
export function checkDescriptorConsistency(
  reference: Float32Array,
  descriptors: Float32Array[]
): { consistent: boolean; maxDistance: number } {
  let maxDistance = 0;
  for (const descriptor of descriptors) {
    const distance = faceapi.euclideanDistance(reference, descriptor);
    if (distance > maxDistance) maxDistance = distance;
  }
  const consistent = maxDistance <= CONSISTENCY_DISTANCE_THRESHOLD;
  console.log('[FaceLiveness] checkDescriptorConsistency: maxDistance =', maxDistance.toFixed(4), '| threshold =', CONSISTENCY_DISTANCE_THRESHOLD, '| consistent =', consistent);
  return { consistent, maxDistance };
}
