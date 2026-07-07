import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { warningOutline, checkmarkCircle } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import {
  loadFaceApiModels,
  detectFaceFromVideo,
  pickRandomChallenge,
  newChallengeState,
  evaluateChallengeFrame,
  CHALLENGE_LABEL,
  LivenessChallenge,
  ChallengeFrameState,
  FaceDetectionResult,
} from '../utils/faceLiveness';
import './FaceLivenessCapture.css';

type CaptureState = 'loading-models' | 'starting-camera' | 'searching' | 'challenge' | 'captured' | 'error';

export interface FaceLivenessResult {
  selfieBase64: string;
  descriptor: Float32Array;
}

interface FaceLivenessCaptureProps {
  onComplete: (result: FaceLivenessResult) => void;
  onCancel?: () => void;
}

const ANALYSIS_INTERVAL_MS = 150;

const FaceLivenessCapture: React.FC<FaceLivenessCaptureProps> = ({ onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const doneRef = useRef(false);
  const challengeStateRef = useRef<ChallengeFrameState & { earWasClosed?: boolean }>(newChallengeState());
  const lastDetectionRef = useRef<FaceDetectionResult | null>(null);

  const [state, setState] = useState<CaptureState>('loading-models');
  const [challenge, setChallenge] = useState<LivenessChallenge>(() => pickRandomChallenge());
  const [errorMessage, setErrorMessage] = useState('');

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const finish = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const detection = lastDetectionRef.current;
    if (!video || !canvas || !detection) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const selfieBase64 = canvas.toDataURL('image/jpeg', 0.92);

    stopStream();
    setState('captured');
    setTimeout(() => onComplete({ selfieBase64, descriptor: detection.descriptor }), 500);
  }, [onComplete, stopStream]);

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
      setState((prev) => (prev === 'loading-models' || prev === 'starting-camera' || prev === 'searching' ? 'challenge' : prev));

      const completed = evaluateChallengeFrame(challenge, detection, challengeStateRef.current);
      if (completed && !doneRef.current) {
        doneRef.current = true;
        finish();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [challenge, finish]
  );

  const startCameraAndLoop = useCallback(
    async (skipModelLoad: boolean) => {
      try {
        if (!skipModelLoad) {
          setState('loading-models');
          await loadFaceApiModels();
        }

        setState('starting-camera');
        if (Capacitor.isNativePlatform()) {
          const status = await Camera.requestPermissions({ permissions: ['camera'] });
          if (status.camera !== 'granted' && status.camera !== 'limited') {
            throw new DOMException('Camera permission was not granted.', 'NotAllowedError');
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (doneRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setState('searching');
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
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
    startCameraAndLoop(false);

    return () => {
      doneRef.current = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    challengeStateRef.current = newChallengeState();
    lastDetectionRef.current = null;
    doneRef.current = false;
    setChallenge(pickRandomChallenge());
    setErrorMessage('');
    stopStream();
    startCameraAndLoop(true);
  };

  return (
    <div className="flc-root">
      <video ref={videoRef} className="flc-video" autoPlay playsInline muted />
      <canvas ref={captureCanvasRef} className="flc-hidden-canvas" />

      {(state === 'loading-models' || state === 'starting-camera') && (
        <div className="flc-overlay">
          <IonSpinner name="crescent" className="flc-spinner" />
          <p>{state === 'loading-models' ? 'Cargando modelos de validación...' : 'Iniciando cámara...'}</p>
        </div>
      )}

      {state === 'searching' && (
        <div className="flc-banner flc-banner--info">Coloca tu rostro dentro del encuadre</div>
      )}

      {state === 'challenge' && (
        <div className="flc-banner flc-banner--challenge">{CHALLENGE_LABEL[challenge]}</div>
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
