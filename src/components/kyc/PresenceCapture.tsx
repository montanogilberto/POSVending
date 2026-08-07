import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { warningOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import './PresenceCapture.css';

// Records a short, silent video while capturing GPS coordinates, as
// location/audit evidence — OCR can't reliably read a printed address off
// an INE (confirmed via extensive testing this session: the front's
// printed fields sit on an anti-copy watermark pattern that defeats OCR
// regardless of engine/resolution), so this substitutes raw GPS + a video
// as evidence instead of trying to extract a written address. Modeled on
// GuidedDocumentCapture.tsx's permission/stream lifecycle, but simpler —
// no frame-analysis loop, just a fixed-duration recording.
type CaptureState = 'initializing' | 'recording' | 'processing' | 'captured' | 'error';

const RECORDING_DURATION_MS = 5000;

export interface PresenceCaptureResult {
  videoBase64: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  capturedAt: string;
}

interface PresenceCaptureProps {
  onCapture: (result: PresenceCaptureResult) => void;
}

const PresenceCapture: React.FC<PresenceCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const capturedRef = useRef(false);

  const [state, setState] = useState<CaptureState>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(RECORDING_DURATION_MS / 1000));

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let countdownInterval: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        if (Capacitor.isNativePlatform()) {
          const cameraStatus = await Camera.requestPermissions({ permissions: ['camera'] });
          if (cameraStatus.camera !== 'granted' && cameraStatus.camera !== 'limited') {
            throw new DOMException('Camera permission was not granted.', 'NotAllowedError');
          }
          const locationStatus = await Geolocation.requestPermissions();
          if (locationStatus.location !== 'granted' && locationStatus.coarseLocation !== 'granted') {
            throw new DOMException('Location permission was not granted.', 'NotAllowedError');
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        // Kick off GPS in parallel with recording rather than blocking the
        // video start on it — resolved value is awaited later, right
        // before calling onCapture.
        const positionPromise = Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        }).catch((err) => {
          console.log('[PresenceCapture] getCurrentPosition FAILED', String(err));
          return null;
        });

        const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        setState('recording');
        recorder.start();

        let remaining = Math.ceil(RECORDING_DURATION_MS / 1000);
        setSecondsLeft(remaining);
        countdownInterval = setInterval(() => {
          remaining -= 1;
          setSecondsLeft(Math.max(0, remaining));
        }, 1000);

        setTimeout(async () => {
          if (cancelled || capturedRef.current) return;
          capturedRef.current = true;
          if (countdownInterval) clearInterval(countdownInterval);
          setState('processing');

          const stopped = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
          });
          recorder.stop();
          await stopped;

          stopStream();

          const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
          const videoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });

          const position = await positionPromise;
          console.log('[PresenceCapture] captured, position =', position?.coords);

          setState('captured');
          onCapture({
            videoBase64,
            latitude: position?.coords.latitude ?? null,
            longitude: position?.coords.longitude ?? null,
            accuracyMeters: position?.coords.accuracy ?? null,
            capturedAt: new Date().toISOString(),
          });
        }, RECORDING_DURATION_MS);
      } catch (err) {
        if (cancelled) return;
        console.log('[PresenceCapture] start FAILED', String(err));
        setState('error');
        setErrorMessage(
          (err as Error).name === 'NotAllowedError'
            ? 'Debes autorizar el acceso a la cámara y ubicación para continuar.'
            : 'No se pudo iniciar la captura de presencia.'
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      if (countdownInterval) clearInterval(countdownInterval);
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      stopStream();
    };
  }, [onCapture, stopStream]);

  return (
    <div className="pc-root">
      <video ref={videoRef} className="pc-video" autoPlay playsInline muted />

      {state === 'recording' && (
        <div className="pc-overlay">
          <div className="pc-recording-indicator">
            <span className="pc-recording-dot" />
            Grabando... {secondsLeft}s
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="pc-overlay">
          <div className="pc-processing">Procesando...</div>
        </div>
      )}

      {state === 'error' && (
        <div className="pc-error">
          <IonIcon icon={warningOutline} className="pc-error-icon" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default PresenceCapture;
