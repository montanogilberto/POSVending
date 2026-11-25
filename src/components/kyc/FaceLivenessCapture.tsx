import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { warningOutline, checkmarkCircle } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import {
  loadFaceApiModels,
  detectFaceFromVideo,
  pickChallengeSequence,
  newChallengeState,
  evaluateChallengeFrame,
  newBlinkTrackerState,
  trackBlink,
  checkDescriptorConsistency,
  faceInDataUrl,
  CHALLENGE_LABEL,
  LivenessChallenge,
  ChallengeFrameState,
  BlinkTrackerState,
  FaceDetectionResult,
} from '../../utils/faceLiveness';
import { lumaThumb, duplicateOf, poseProblem, poseRetryMessage, PoseProblem } from '../../utils/poseQuality';
import './FaceLivenessCapture.css';

type CaptureState = 'loading-models' | 'starting-camera' | 'searching' | 'challenge' | 'awaiting-blink' | 'captured' | 'error';

// The five head positions captured during the session. 'front' is the neutral
// pose sampled the moment the face is first acquired; the other four are
// grabbed at the instant each directional challenge is satisfied, so each one
// is genuine evidence of that pose rather than a re-enactment afterwards.
export type FacePose = 'front' | 'up' | 'down' | 'left' | 'right';

export type PosePhotos = Partial<Record<FacePose, string>>;

export interface FaceLivenessResult {
  selfieBase64: string;
  descriptor: Float32Array;
  // Keyed by pose; a pose is absent only if its frame could not be grabbed.
  posePhotos: PosePhotos;
}

interface FaceLivenessCaptureProps {
  onComplete: (result: FaceLivenessResult) => void;
  onCancel?: () => void;
}

const ANALYSIS_INTERVAL_MS = 150;
// Passive-blink gate disabled by request — the session completes right after the
// 4 randomized head-turn challenges. Anti-spoofing still relies on those moves,
// the descriptor-consistency check and the ID-photo match. Flip back to true to
// re-enable the blink requirement (all the blink code below stays wired up).
const REQUIRE_BLINK = false;
// A blink's closed phase is ~100ms, so during the passive-blink gate we sample
// faster to actually catch it (the head is already still, so the extra CPU is fine).
const BLINK_ANALYSIS_INTERVAL_MS = 70;
// Hard ceiling on the passive-blink wait. If no blink is sampled in this window
// the session proceeds anyway — blink is a secondary anti-spoof layer behind the
// ID-photo match, the 4-direction challenge and the descriptor-consistency check,
// none of which a hang should be allowed to block. Prevents the "workflow stopped".
const BLINK_TIMEOUT_MS = 7000;
// Consecutive undetected frames tolerated before the UI falls back to
// "searching" and re-presents the instruction. At 150ms/frame this rides out
// roughly half a second of dropout — matching the 2-4 frame gaps observed on
// device during the down challenge — without masking a real loss of the face.
const FACE_LOST_GRACE_FRAMES = 4;

// Low on purpose: this flow's goal is extracting the INE data, not a strict
// biometric face-match, so a lightly-soft pose frame is fine. But a pose whose
// SHARPEST frame is still below this is not evidence: the person repeats that
// one move (device logs had 90–93 kept "as best" and the validator rejected).
const POSE_SHARPNESS_FLOOR = 130;

// Fixed compass position per direction (SVG angle: 0deg = 3 o'clock, clockwise).
const RING_TARGET_DEG: Record<LivenessChallenge, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};
const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_GAP_DEG = 8;
const RING_SEGMENT_DEG = 90 - RING_GAP_DEG;
const RING_SEGMENT_LEN = RING_CIRCUMFERENCE * (RING_SEGMENT_DEG / 360);

const LivenessRing: React.FC<{ sequence: LivenessChallenge[]; completedCount: number }> = ({ sequence, completedCount }) => {
  const completed = new Set(sequence.slice(0, completedCount));
  const active = sequence[completedCount];

  return (
    <svg className="flc-ring" viewBox="0 0 100 100">
      {(Object.keys(RING_TARGET_DEG) as LivenessChallenge[]).map((direction) => {
        const status = completed.has(direction) ? 'done' : direction === active ? 'active' : 'pending';
        const rotate = RING_TARGET_DEG[direction] - RING_SEGMENT_DEG / 2;
        return (
          <circle
            key={direction}
            className={`flc-ring-segment flc-ring-segment--${status}`}
            cx="50"
            cy="50"
            r={RING_RADIUS}
            strokeDasharray={`${RING_SEGMENT_LEN} ${RING_CIRCUMFERENCE}`}
            transform={`rotate(${rotate} 50 50)`}
          />
        );
      })}
    </svg>
  );
};

const FaceLivenessCapture: React.FC<FaceLivenessCaptureProps> = ({ onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const doneRef = useRef(false);
  const challengeStateRef = useRef<ChallengeFrameState>(newChallengeState());
  const lastDetectionRef = useRef<FaceDetectionResult | null>(null);
  const missedFramesRef = useRef(0);
  const challengeIndexRef = useRef(0);
  const blinkStateRef = useRef<BlinkTrackerState>(newBlinkTrackerState());
  // Timestamp (performance.now) when the passive-blink gate began, so it can
  // fall through after BLINK_TIMEOUT_MS instead of hanging forever if the blink
  // is never sampled (blink ~100ms can fall between frames). 0 = not waiting.
  const awaitingBlinkSinceRef = useRef(0);
  const challengeDescriptorsRef = useRef<Float32Array[]>([]);
  // Roughly-frontal descriptor from the very first detected frame, before
  // any directional challenge starts — used as the consistency-check
  // reference instead of comparing challenge descriptors against each other
  // (see checkDescriptorConsistency in faceLiveness.ts for why).
  const neutralDescriptorRef = useRef<Float32Array | null>(null);

  const [state, setState] = useState<CaptureState>('loading-models');
  const [sequence, setSequence] = useState<LivenessChallenge[]>(() => pickChallengeSequence());
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  // A pose is being checked (burst + sharpness + face + duplicate). The challenge
  // does not advance while this is true, so a rejected pose is simply repeated.
  const poseCheckingRef = useRef(false);
  // The neutral (front) pose passed its checks; directional moves start after it.
  const frontReadyRef = useRef(false);
  const [frontReady, setFrontReady] = useState(false);
  // Shown above the instruction when the last pose had to be repeated.
  const [retryNotice, setRetryNotice] = useState('');
  const poseRetriesRef = useRef<Partial<Record<FacePose, number>>>({});
  // Luma thumbnails of ACCEPTED poses, for the duplicate check.
  const poseThumbsRef = useRef<Partial<Record<FacePose, Float32Array>>>({});

  const currentChallenge = sequence[challengeIndex];

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    // Detach the stopped stream so the WebView releases the camera buffers
    // (Android logged "Unable to acquire a buffer item" / "failed to call release").
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  // Grabs the current video frame as a JPEG data URL. Shared by the per-pose
  // captures and the final selfie so they cannot drift in encoding/quality.
  const grabFrame = useCallback((): string => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) return '';
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  // Captured as each pose is actually achieved — see PosePhotos.
  const posePhotosRef = useRef<PosePhotos>({});
  // Guards against launching a second sharpest-frame burst for the same pose.
  const poseBurstRef = useRef<Partial<Record<FacePose, boolean>>>({});
  // Small offscreen canvas reused for the per-frame sharpness metric.
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cheap focus metric: mean squared horizontal luminance gradient of a
  // downscaled frame. Higher = sharper. Used to reject motion-blurred poses.
  // Also returns the frame's luma thumbnail for the duplicate-pose check.
  const measureFrame = useCallback((): { sharpness: number; thumb: Float32Array | null } => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return { sharpness: 0, thumb: null };
    let canvas = analysisCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      analysisCanvasRef.current = canvas;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { sharpness: 0, thumb: null };
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width; x++) {
        const i = (y * width + x) * 4;
        const j = (y * width + (x - 1)) * 4;
        const g1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const g0 = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        const d = g1 - g0;
        sum += d * d;
        count++;
      }
    }
    return { sharpness: count ? sum / count : 0, thumb: lumaThumb(data, width, height) };
  }, []);

  // Grab a short burst of frames around the moment a pose is achieved and keep
  // the SHARPEST one. The head momentarily stops at the furthest point, so its
  // clearest frame is right here — the old single grab often landed mid-motion
  // and came out motion-blurred, which the validation agent then rejected.
  //
  // Then the pose must pass three checks or it is NOT kept (returns why):
  // sharp enough (POSE_SHARPNESS_FLOOR), a face is in the chosen frame, and the
  // frame is not a copy of another accepted pose (a stalled camera produced a
  // RIGHT identical to UP). The caller asks the person to repeat only that move.
  const capturePose = useCallback(
    async (pose: FacePose): Promise<PoseProblem | null> => {
      if (poseBurstRef.current[pose]) return null; // burst already running for this pose
      poseBurstRef.current[pose] = true;

      let bestFrame = grabFrame();
      const first = bestFrame ? measureFrame() : { sharpness: -1, thumb: null };
      let bestSharp = first.sharpness;
      let bestThumb = first.thumb;

      // Keep sampling until the sharpest frame clears POSE_SHARPNESS_FLOOR, or a
      // bounded window (~720ms at 40ms/frame) elapses — whichever first. With the
      // raised floor most poses now sample the whole window, which is the point:
      // the user holds the pose for a beat, so the still (sharpest) frame lands a
      // few hundred ms after the turn angle is first hit — the early single grab
      // missed it. A blurry candidate never beats the best, so this only ever
      // improves the result. If even the sharpest is below the floor, the pose
      // is rejected below and the person repeats that move.
      const MAX_ATTEMPTS = 18;
      for (let i = 0; i < MAX_ATTEMPTS && bestSharp < POSE_SHARPNESS_FLOOR; i++) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        if (doneRef.current) break;
        const frame = grabFrame();
        if (!frame) continue;
        const m = measureFrame();
        if (m.sharpness > bestSharp) {
          bestSharp = m.sharpness;
          bestFrame = frame;
          bestThumb = m.thumb;
        }
      }

      // Checked in this order; the face detector only runs on a sharp frame.
      const sharpEnough = bestSharp >= POSE_SHARPNESS_FLOOR;
      // A detector error counts as "no face" (repeat) — it must never leave the
      // challenge stuck with poseCheckingRef set.
      const faceFound = sharpEnough && !doneRef.current
        ? await faceInDataUrl(bestFrame).catch(() => false)
        : false;
      const others = { ...poseThumbsRef.current };
      delete others[pose];
      const dupOf = faceFound && bestThumb ? duplicateOf(bestThumb, others) : null;
      const problem = bestFrame
        ? poseProblem({ sharpness: bestSharp, floor: POSE_SHARPNESS_FLOOR, faceFound, duplicateOf: dupOf })
        : 'no-face';

      console.log(
        `[FaceLivenessCapture] capturePose(${pose}): sharpest of burst, sharpness=${bestSharp.toFixed(0)}` +
        ` floor=${POSE_SHARPNESS_FLOOR} face=${faceFound} duplicateOf=${dupOf ?? '-'}` +
        ` → ${problem ? `REJECTED (${problem}) — repeat this move` : 'accepted'}, length=${bestFrame?.length ?? 0}`,
      );

      if (problem) {
        delete posePhotosRef.current[pose];
        poseBurstRef.current[pose] = false; // allow the repeat
        return problem;
      }
      posePhotosRef.current[pose] = bestFrame;
      if (bestThumb) poseThumbsRef.current[pose] = bestThumb;
      return null;
    },
    [grabFrame, measureFrame],
  );

  const finish = useCallback(
    (descriptor: Float32Array) => {
      console.log('[FaceLivenessCapture] finish: all checks passed, capturing selfie frame');
      const selfieBase64 = grabFrame();
      if (!selfieBase64) {
        console.log('[FaceLivenessCapture] finish: ABORT — could not grab final frame');
        return;
      }
      console.log('[FaceLivenessCapture] finish: selfie captured, base64 length =', selfieBase64.length);

      // Fall back to the final frame for 'front' if the neutral capture never
      // landed, so the pose set is never missing the one Stripe/ID matching
      // and the validation agent care about most.
      if (!posePhotosRef.current.front) posePhotosRef.current.front = selfieBase64;

      const posePhotos = { ...posePhotosRef.current };
      console.log('[FaceLivenessCapture] finish: pose photos =', JSON.stringify(
        (Object.keys(posePhotos) as FacePose[]).reduce<Record<string, number>>(
          (acc, k) => { acc[k] = posePhotos[k]?.length ?? 0; return acc; }, {}
        )
      ));

      stopStream();
      setState('captured');
      setTimeout(() => {
        console.log('[FaceLivenessCapture] finish: calling onComplete()');
        onComplete({ selfieBase64, descriptor, posePhotos });
      }, 500);
    },
    [onComplete, stopStream, grabFrame]
  );

  const tick = useCallback(
    async (timestamp: number) => {
      if (doneRef.current) return;

      // Sample faster once we're on the passive-blink gate so a ~100ms blink lands.
      const interval = challengeIndexRef.current >= sequence.length
        ? BLINK_ANALYSIS_INTERVAL_MS
        : ANALYSIS_INTERVAL_MS;
      if (timestamp - lastTickRef.current < interval) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const detection = await detectFaceFromVideo(video);
      if (doneRef.current) return;

      if (!detection) {
        // Tolerate brief dropouts instead of falling back to "searching" on a
        // single missed frame. Device logs show the down challenge losing the
        // face for 2-4 consecutive frames at a time while the user is holding
        // the pose correctly — each of those reset the UI and re-presented the
        // same instruction, so the prompt visibly flickered and the challenge
        // looked broken even though the head position was fine.
        missedFramesRef.current += 1;
        if (missedFramesRef.current >= FACE_LOST_GRACE_FRAMES) {
          lastDetectionRef.current = null;
          setState((prev) => (prev === 'captured' ? prev : 'searching'));
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      missedFramesRef.current = 0;
      lastDetectionRef.current = detection;

      // A pose is being checked: keep the loop alive but don't evaluate moves,
      // so nothing advances on a pose that may still be rejected.
      if (poseCheckingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!frontReadyRef.current) {
        // Face acquired, no challenge presented yet, so the head is still square
        // to the camera. The neutral descriptor comes from this same moment and
        // is only kept once the front photo itself passes the checks.
        const neutral = detection.descriptor;
        poseCheckingRef.current = true;
        capturePose('front').then((problem) => {
          poseCheckingRef.current = false;
          if (doneRef.current) return;
          if (problem) {
            const n = (poseRetriesRef.current.front ?? 0) + 1;
            poseRetriesRef.current.front = n;
            setRetryNotice(poseRetryMessage(problem, 'Mira de frente a la cámara', n));
            return;
          }
          neutralDescriptorRef.current = neutral;
          frontReadyRef.current = true;
          setFrontReady(true);
          setRetryNotice('');
        });
        setState((prev) => (prev === 'captured' ? prev : 'challenge'));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      setState((prev) => {
        if (prev === 'loading-models' || prev === 'starting-camera' || prev === 'searching') {
          if (challengeIndexRef.current < sequence.length) {
            console.log(`[FaceLivenessCapture] tick: face acquired, presenting move ${challengeIndexRef.current + 1}/4 "${sequence[challengeIndexRef.current]}"`);
          } else {
            console.log('[FaceLivenessCapture] tick: face re-acquired after all challenges completed');
          }
          return 'challenge';
        }
        return prev;
      });

      // Tracked every frame regardless of phase — a static photo can never
      // close and reopen its eyes, so this catches the simplest spoofing
      // attempt independent of the 4 visible directional moves.
      const blinked = trackBlink(detection, blinkStateRef.current);

      if (challengeIndexRef.current >= sequence.length) {
        // All 4 directions satisfied — now waiting on the passive blink
        // check before accepting the session.
        if (REQUIRE_BLINK && !blinked) {
          if (awaitingBlinkSinceRef.current === 0) awaitingBlinkSinceRef.current = timestamp;
          // Don't hang forever if the blink is never sampled — fall through after
          // the timeout so the session still completes (see BLINK_TIMEOUT_MS).
          if (timestamp - awaitingBlinkSinceRef.current < BLINK_TIMEOUT_MS) {
            setState('awaiting-blink');
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          console.log('[FaceLivenessCapture] tick: blink not sampled within timeout — proceeding on the other liveness checks');
        }

        const { consistent } = checkDescriptorConsistency(
          neutralDescriptorRef.current ?? challengeDescriptorsRef.current[0],
          challengeDescriptorsRef.current
        );
        if (!consistent) {
          console.log('[FaceLivenessCapture] tick: descriptor consistency check FAILED — face changed mid-session');
          doneRef.current = true;
          stopStream();
          setState('error');
          setErrorMessage('No se pudo verificar que la misma persona completó la validación. Vuelve a intentarlo.');
          return;
        }

        doneRef.current = true;
        // The ID match uses the FRONTAL descriptor (head square to the camera,
        // like the INE portrait). It used to take the last directional move's
        // descriptor — a turned head — which pushed the selfie↔INE distance up
        // (device log: 0.6993 vs threshold 0.6) without the person being different.
        finish(neutralDescriptorRef.current ?? challengeDescriptorsRef.current[challengeDescriptorsRef.current.length - 1]);
        return;
      }

      const challenge = sequence[challengeIndexRef.current];
      const completed = evaluateChallengeFrame(challenge, detection, challengeStateRef.current);
      if (completed && !doneRef.current) {
        const index = challengeIndexRef.current;
        const descriptor = detection.descriptor;
        console.log(`[FaceLivenessCapture] tick: move "${challenge}" satisfied (${index + 1}/4), checking the photo`);
        // Grab the frame on the very tick the pose was satisfied — the head is
        // at its furthest point now, and waiting even a few frames catches it
        // already returning to neutral. The move only counts once the photo passes.
        poseCheckingRef.current = true;
        capturePose(challenge as FacePose).then((problem) => {
          poseCheckingRef.current = false;
          if (doneRef.current) return;
          challengeStateRef.current = newChallengeState();
          if (problem) {
            const n = (poseRetriesRef.current[challenge as FacePose] ?? 0) + 1;
            poseRetriesRef.current[challenge as FacePose] = n;
            setRetryNotice(poseRetryMessage(problem, CHALLENGE_LABEL[challenge], n));
            return; // same index: the person repeats only this move
          }
          setRetryNotice('');
          challengeDescriptorsRef.current.push(descriptor);
          challengeIndexRef.current = index + 1;
          setChallengeIndex(index + 1);
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [sequence, finish, stopStream, capturePose]
  );

  const startCameraAndLoop = useCallback(
    async (skipModelLoad: boolean) => {
      console.log('[FaceLivenessCapture] startCameraAndLoop: starting, skipModelLoad =', skipModelLoad);
      try {
        if (!skipModelLoad) {
          setState('loading-models');
          await loadFaceApiModels();
        }

        setState('starting-camera');
        if (Capacitor.isNativePlatform()) {
          console.log('[FaceLivenessCapture] startCameraAndLoop: native platform, requesting camera permission');
          const status = await Camera.requestPermissions({ permissions: ['camera'] });
          console.log('[FaceLivenessCapture] startCameraAndLoop: camera permission status =', status.camera);
          if (status.camera !== 'granted' && status.camera !== 'limited') {
            throw new DOMException('Camera permission was not granted.', 'NotAllowedError');
          }
        }

        console.log('[FaceLivenessCapture] startCameraAndLoop: calling getUserMedia (front camera)');
        // Request 720p: 640x480 (VGA) left the pose/selfie frames too low-detail
        // for the validation agent to match reliably. `ideal` lets the WebView
        // fall back to the nearest supported size if 720p isn't available, so it
        // stays safe across devices. face-api detection handles 720p comfortably.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (doneRef.current) {
          console.log('[FaceLivenessCapture] startCameraAndLoop: already done by the time stream resolved, stopping tracks');
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        console.log('[FaceLivenessCapture] startCameraAndLoop: camera stream started, entering detection loop');
        setState('searching');
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.log('[FaceLivenessCapture] startCameraAndLoop: FAILED', err);
        setState('error');
        setErrorMessage(
          (err as Error).name === 'NotAllowedError'
            ? 'Debes autorizar el acceso a la cámara para continuar.'
            : 'No se pudo iniciar la validación de vida facial.'
        );
      }
    },
    [tick]
  );

  useEffect(() => {
    console.log('[FaceLivenessCapture] mount: sequence =', sequence);
    startCameraAndLoop(false);

    return () => {
      console.log('[FaceLivenessCapture] unmount: stopping stream');
      doneRef.current = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    console.log('[FaceLivenessCapture] retry: user requested retry after error');
    const newSequence = pickChallengeSequence();
    challengeIndexRef.current = 0;
    challengeStateRef.current = newChallengeState();
    blinkStateRef.current = newBlinkTrackerState();
    awaitingBlinkSinceRef.current = 0;
    challengeDescriptorsRef.current = [];
    neutralDescriptorRef.current = null;
    lastDetectionRef.current = null;
    missedFramesRef.current = 0;
    // Discard poses from the abandoned attempt — mixing them with a new run
    // would defeat the point of capturing evidence of a single session.
    posePhotosRef.current = {};
    poseBurstRef.current = {};
    poseThumbsRef.current = {};
    poseRetriesRef.current = {};
    poseCheckingRef.current = false;
    frontReadyRef.current = false;
    setFrontReady(false);
    setRetryNotice('');
    doneRef.current = false;
    setSequence(newSequence);
    setChallengeIndex(0);
    setErrorMessage('');
    stopStream();
    startCameraAndLoop(true);
  };

  return (
    <div className="flc-root">
      <video ref={videoRef} className="flc-video" autoPlay playsInline muted />
      <canvas ref={captureCanvasRef} className="flc-hidden-canvas" />

      {(state === 'challenge' || state === 'searching' || state === 'awaiting-blink') && (
        <LivenessRing sequence={sequence} completedCount={challengeIndex} />
      )}

      {(state === 'loading-models' || state === 'starting-camera') && (
        <div className="flc-overlay">
          <IonSpinner name="crescent" className="flc-spinner" />
          <p>{state === 'loading-models' ? 'Cargando modelos de validación...' : 'Iniciando cámara...'}</p>
        </div>
      )}

      {state === 'searching' && (
        <div className="flc-banner flc-banner--info">Coloca tu rostro dentro del encuadre</div>
      )}

      {state === 'awaiting-blink' && (
        <div className="flc-banner flc-banner--challenge">Parpadea para finalizar</div>
      )}

      {state === 'challenge' && (
        <div className="flc-banner flc-banner--challenge">
          {retryNotice && <span className="flc-banner-retry" role="alert">{retryNotice}</span>}
          {frontReady
            ? <><span className="flc-banner-step">{challengeIndex + 1}/{sequence.length}</span> {CHALLENGE_LABEL[currentChallenge]}</>
            : 'Mira de frente a la cámara y no te muevas'}
        </div>
      )}

      {state === 'captured' && (
        <div className="flc-overlay">
          <IonIcon icon={checkmarkCircle} className="flc-success-icon" />
          <p>¡Listo!</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flc-overlay flc-overlay--error">
          <IonIcon icon={warningOutline} className="flc-error-icon" />
          <p>{errorMessage}</p>
          <button type="button" className="flc-retry-button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {onCancel && state !== 'captured' && (
        <button type="button" className="flc-cancel-button" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
};

export default FaceLivenessCapture;
