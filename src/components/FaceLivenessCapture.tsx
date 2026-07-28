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
  CHALLENGE_LABEL,
  LivenessChallenge,
  ChallengeFrameState,
  BlinkTrackerState,
  FaceDetectionResult,
} from '../utils/faceLiveness';
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
// Consecutive undetected frames tolerated before the UI falls back to
// "searching" and re-presents the instruction. At 150ms/frame this rides out
// roughly half a second of dropout — matching the 2-4 frame gaps observed on
// device during the down challenge — without masking a real loss of the face.
const FACE_LOST_GRACE_FRAMES = 4;

// A pose's sharpest burst frame must clear this to be accepted without extra
// sampling. On-device: good poses measure ~150-170; a motion-blurred one (a
// fast RIGHT turn the validation agent then rejects) ~90. 110 discriminates the
// heavily-blurred outlier without over-sampling borderline-but-fine poses.
const POSE_SHARPNESS_FLOOR = 110;

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

  const currentChallenge = sequence[challengeIndex];

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
  const measureSharpness = useCallback((): number => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return 0;
    let canvas = analysisCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      analysisCanvasRef.current = canvas;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
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
    return count ? sum / count : 0;
  }, []);

  // Grab a short burst of frames around the moment a pose is achieved and keep
  // the SHARPEST one. The head momentarily stops at the furthest point, so its
  // clearest frame is right here — the old single grab often landed mid-motion
  // and came out motion-blurred, which the validation agent then rejected.
  const capturePose = useCallback(
    async (pose: FacePose) => {
      if (poseBurstRef.current[pose]) return; // burst already ran for this pose
      poseBurstRef.current[pose] = true;

      let bestFrame = grabFrame();
      let bestSharp = bestFrame ? measureSharpness() : -1;
      if (bestFrame) posePhotosRef.current[pose] = bestFrame;

      // Keep sampling until the sharpest frame clears POSE_SHARPNESS_FLOOR, or a
      // bounded window (~480ms at 40ms/frame) elapses — whichever first. Sharp
      // poses exit on the first frame; blur-prone ones (a fast RIGHT turn) get
      // more tries to catch the low-velocity turnaround frame. A blurry
      // candidate never beats the best, so this only ever improves the result,
      // and the fallback keeps the sharpest frame so the pose can never stall.
      const MAX_ATTEMPTS = 12;
      for (let i = 0; i < MAX_ATTEMPTS && bestSharp < POSE_SHARPNESS_FLOOR; i++) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        if (doneRef.current) break;
        const frame = grabFrame();
        if (!frame) continue;
        const sharp = measureSharpness();
        if (sharp > bestSharp) {
          bestSharp = sharp;
          bestFrame = frame;
          posePhotosRef.current[pose] = frame;
        }
      }
      console.log(
        `[FaceLivenessCapture] capturePose(${pose}): sharpest of burst, sharpness=${bestSharp.toFixed(0)}` +
        `${bestSharp < POSE_SHARPNESS_FLOOR ? ' (below floor — kept best)' : ''}, length=${bestFrame?.length ?? 0}`,
      );
    },
    [grabFrame, measureSharpness],
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

      if (timestamp - lastTickRef.current < ANALYSIS_INTERVAL_MS) {
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
      if (!neutralDescriptorRef.current) {
        neutralDescriptorRef.current = detection.descriptor;
        // Same frame the neutral descriptor comes from: face acquired, no
        // challenge presented yet, so the head is still square to the camera.
        capturePose('front');
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
        if (!blinked) {
          setState('awaiting-blink');
          rafRef.current = requestAnimationFrame(tick);
          return;
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
        // Use the descriptor from the last completed directional challenge
        // (eyes open, mid-motion) rather than this frame — a blink-detection
        // frame can land with eyes still closing, a worse source for the
        // ID-match comparison.
        finish(challengeDescriptorsRef.current[challengeDescriptorsRef.current.length - 1]);
        return;
      }

      const challenge = sequence[challengeIndexRef.current];
      const completed = evaluateChallengeFrame(challenge, detection, challengeStateRef.current);
      if (completed && !doneRef.current) {
        const nextIndex = challengeIndexRef.current + 1;
        console.log(`[FaceLivenessCapture] tick: move "${challenge}" satisfied (${nextIndex}/4)`);
        // Grab the frame on the very tick the pose was satisfied — the head is
        // at its furthest point now, and waiting even a few frames catches it
        // already returning to neutral.
        capturePose(challenge as FacePose);
        challengeDescriptorsRef.current.push(detection.descriptor);
        challengeIndexRef.current = nextIndex;
        challengeStateRef.current = newChallengeState();
        setChallengeIndex(nextIndex);
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
    challengeDescriptorsRef.current = [];
    neutralDescriptorRef.current = null;
    lastDetectionRef.current = null;
    missedFramesRef.current = 0;
    // Discard poses from the abandoned attempt — mixing them with a new run
    // would defeat the point of capturing evidence of a single session.
    posePhotosRef.current = {};
    poseBurstRef.current = {};
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
          <span className="flc-banner-step">{challengeIndex + 1}/{sequence.length}</span> {CHALLENGE_LABEL[currentChallenge]}
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
