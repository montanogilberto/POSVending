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

export interface FaceLivenessResult {
  selfieBase64: string;
  descriptor: Float32Array;
}

interface FaceLivenessCaptureProps {
  onComplete: (result: FaceLivenessResult) => void;
  onCancel?: () => void;
}

const ANALYSIS_INTERVAL_MS = 150;

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
  const challengeIndexRef = useRef(0);
  const blinkStateRef = useRef<BlinkTrackerState>(newBlinkTrackerState());
  const challengeDescriptorsRef = useRef<Float32Array[]>([]);

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

  const finish = useCallback(
    (descriptor: Float32Array) => {
      console.log('[FaceLivenessCapture] finish: all checks passed, capturing selfie frame');
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;
      if (!video || !canvas) {
        console.log('[FaceLivenessCapture] finish: ABORT — missing video/canvas', { hasVideo: !!video, hasCanvas: !!canvas });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const selfieBase64 = canvas.toDataURL('image/jpeg', 0.92);
      console.log('[FaceLivenessCapture] finish: selfie captured, base64 length =', selfieBase64.length);

      stopStream();
      setState('captured');
      setTimeout(() => {
        console.log('[FaceLivenessCapture] finish: calling onComplete()');
        onComplete({ selfieBase64, descriptor });
      }, 500);
    },
    [onComplete, stopStream]
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
        lastDetectionRef.current = null;
        setState((prev) => (prev === 'captured' ? prev : 'searching'));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      lastDetectionRef.current = detection;
      setState((prev) => {
        if (prev === 'loading-models' || prev === 'starting-camera' || prev === 'searching') {
          console.log(`[FaceLivenessCapture] tick: face acquired, presenting move ${challengeIndexRef.current + 1}/4 "${sequence[challengeIndexRef.current]}"`);
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

        const { consistent } = checkDescriptorConsistency(challengeDescriptorsRef.current);
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
        challengeDescriptorsRef.current.push(detection.descriptor);
        challengeIndexRef.current = nextIndex;
        challengeStateRef.current = newChallengeState();
        setChallengeIndex(nextIndex);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [sequence, finish, stopStream]
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
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
    lastDetectionRef.current = null;
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
