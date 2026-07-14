import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { helpCircleOutline, personOutline, warningOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { analyzeFrame, computeFullResBlurVariance, OverlayRect, PositionHint } from '../utils/documentCaptureAnalysis';
import './GuidedDocumentCapture.css';

type CaptureState = 'initializing' | 'searching' | 'aligning' | 'stable' | 'captured' | 'error';

const POSITION_HINT_LABEL: Record<PositionHint, string> = {
  'move-closer': 'Acércate un poco',
  'move-back': 'Aléjate un poco',
  'hold-steady': 'Mantente quieto',
};

interface GuidedDocumentCaptureProps {
  title: string;
  instructions: string;
  onCapture: (base64: string) => void;
  onHelp?: () => void;
}

// ID-1 card aspect ratio (85.6mm x 54mm), matching a real government ID.
const CARD_ASPECT = 85.6 / 54;
const GOOD_SCORE_THRESHOLD = 82;
const ALIGNING_SCORE_THRESHOLD = 55;
// overallScore is a weighted average (blur 45%, brightness 25%, glare 15%,
// motion 15%), so a frame can clear GOOD_SCORE_THRESHOLD with mediocre blur
// if lighting/stillness are otherwise perfect — confirmed on-device: a
// visibly blurry capture (unreadable by OCR) still passed the composite
// gate. Requiring blurScore to independently clear its own floor closes
// that gap without loosening the other checks.
const MIN_BLUR_SCORE = 70;
const STABILITY_FRAMES_REQUIRED = 6;
const ANALYSIS_INTERVAL_MS = 100; // ~10 fps
const ANALYSIS_CANVAS_WIDTH = 240;

function computeOverlayRect(containerWidth: number, containerHeight: number): OverlayRect {
  const width = containerWidth * 0.85;
  const height = width / CARD_ASPECT;
  const x = (containerWidth - width) / 2;
  const y = containerHeight * 0.34;
  return { x, y, width, height };
}

// The <video> element renders with object-fit: cover, so the visible frame is
// a center-cropped region of the native video resolution. Both the analysis
// tick and the final capture need to map container/CSS coordinates into that
// same native-pixel region — shared here so they can't drift apart.
function computeVideoCoverRect(
  video: HTMLVideoElement,
  containerWidth: number,
  containerHeight: number
): { sx: number; sy: number; sw: number; sh: number } {
  const containerAspect = containerWidth / containerHeight;
  const videoAspect = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sw = video.videoWidth;
  let sh = video.videoHeight;
  if (videoAspect > containerAspect) {
    sw = video.videoHeight * containerAspect;
    sx = (video.videoWidth - sw) / 2;
  } else {
    sh = video.videoWidth / containerAspect;
    sy = (video.videoHeight - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

const GuidedDocumentCapture: React.FC<GuidedDocumentCaptureProps> = ({
  title,
  instructions,
  onCapture,
  onHelp,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const previousGrayRef = useRef<Uint8ClampedArray | null>(null);
  const consecutiveGoodRef = useRef(0);
  const capturedRef = useRef(false);

  const [state, setState] = useState<CaptureState>('initializing');
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [positionHint, setPositionHint] = useState<PositionHint>('move-closer');

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const rect = computeOverlayRect(containerWidth, containerHeight);
    const { sx, sy, sw } = computeVideoCoverRect(video, containerWidth, containerHeight);

    // Crop to the guide rectangle only — previously this drew the entire
    // video frame, so the saved photo was mostly background with the ID
    // card occupying a small corner, making it look illegible regardless of
    // how well the lens focused.
    const scale = sw / containerWidth; // video-pixels per container-pixel
    const cropX = sx + rect.x * scale;
    const cropY = sy + rect.y * scale;
    const cropW = rect.width * scale;
    const cropH = rect.height * scale;

    canvas.width = cropW;
    canvas.height = cropH;
    console.log(
      '[GuidedDocumentCapture] captureFrame: video =',
      video.videoWidth, 'x', video.videoHeight,
      'container =', containerWidth, 'x', containerHeight,
      'crop =', Math.round(cropW), 'x', Math.round(cropH)
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Logged (not gated on yet) to calibrate a real full-resolution
    // sharpness threshold — the live-gating blurScore is measured on a
    // heavily downsampled 240px analysis canvas, which smooths away blur
    // that's still present at this capture's native resolution.
    const fullResVariance = computeFullResBlurVariance(ctx.getImageData(0, 0, cropW, cropH));
    console.log('[GuidedDocumentCapture] captureFrame: fullResBlurVariance =', fullResVariance);

    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    setState('captured');
    setTimeout(() => onCapture(base64), 350);
  }, [onCapture, stopStream]);

  const tick = useCallback(
    (timestamp: number) => {
      if (capturedRef.current) return;

      if (timestamp - lastTickRef.current < ANALYSIS_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;

      const video = videoRef.current;
      const container = containerRef.current;
      const analysisCanvas = analysisCanvasRef.current;
      if (!video || !container || !analysisCanvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      if (containerWidth === 0 || containerHeight === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const rect = computeOverlayRect(containerWidth, containerHeight);
      setOverlayRect(rect);

      // Replicate the same "object-fit: cover" crop the <video> element uses,
      // so the analyzed frame lines up with what the user actually sees.
      const { sx, sy, sw, sh } = computeVideoCoverRect(video, containerWidth, containerHeight);

      const containerAspect = containerWidth / containerHeight;
      const analysisWidth = ANALYSIS_CANVAS_WIDTH;
      const analysisHeight = Math.round(analysisWidth / containerAspect);
      analysisCanvas.width = analysisWidth;
      analysisCanvas.height = analysisHeight;
      const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, analysisWidth, analysisHeight);

      const scale = analysisWidth / containerWidth;
      const analysisRect: OverlayRect = {
        x: Math.round(rect.x * scale),
        y: Math.round(rect.y * scale),
        width: Math.round(rect.width * scale),
        height: Math.round(rect.height * scale),
      };

      const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
      const { metrics, gray } = analyzeFrame(imageData, analysisRect, previousGrayRef.current);
      previousGrayRef.current = gray;
      setPositionHint(metrics.positionHint);

      if (metrics.overallScore >= GOOD_SCORE_THRESHOLD && metrics.blurScore >= MIN_BLUR_SCORE) {
        consecutiveGoodRef.current += 1;
        setState(
          consecutiveGoodRef.current >= STABILITY_FRAMES_REQUIRED ? 'stable' : 'aligning'
        );
      } else {
        consecutiveGoodRef.current = 0;
        setState(metrics.overallScore >= ALIGNING_SCORE_THRESHOLD ? 'aligning' : 'searching');
      }

      if (consecutiveGoodRef.current >= STABILITY_FRAMES_REQUIRED && !capturedRef.current) {
        capturedRef.current = true;
        console.log(
          '[GuidedDocumentCapture] triggering capture, metrics =',
          JSON.stringify(metrics)
        );
        captureFrame();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [captureFrame]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // On native Android, a WebView only auto-grants a getUserMedia prompt
        // if the OS-level CAMERA permission is already granted — it won't
        // surface the runtime dialog itself. Request it through Capacitor
        // first so that dialog actually appears.
        if (Capacitor.isNativePlatform()) {
          const status = await Camera.requestPermissions({ permissions: ['camera'] });
          if (status.camera !== 'granted' && status.camera !== 'limited') {
            throw new DOMException('Camera permission was not granted.', 'NotAllowedError');
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
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
        setState('searching');
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        setState('error');
        setErrorMessage(
          (err as Error).name === 'NotAllowedError'
            ? 'Debes autorizar el acceso a la cámara para continuar.'
            : 'No se pudo acceder a la cámara de tu dispositivo.'
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGood = state === 'stable' || state === 'captured';

  return (
    <div className="gdc-root" ref={containerRef}>
      <video ref={videoRef} className="gdc-video" autoPlay playsInline muted />
      <canvas ref={analysisCanvasRef} className="gdc-hidden-canvas" />
      <canvas ref={captureCanvasRef} className="gdc-hidden-canvas" />

      <div className="gdc-header">
        <h2 className="gdc-title">{title}</h2>
        <p className="gdc-instructions">{instructions}</p>
      </div>

      {overlayRect && state !== 'error' && (
        <div
          className={`gdc-frame ${isGood ? 'gdc-frame--good' : ''} ${
            state === 'aligning' ? 'gdc-frame--aligning' : ''
          }`}
          style={{
            left: overlayRect.x,
            top: overlayRect.y,
            width: overlayRect.width,
            height: overlayRect.height,
          }}
        >
          <div className="gdc-id-illustration">
            <IonIcon icon={personOutline} className="gdc-id-avatar" />
            <div className="gdc-id-lines">
              <span className="gdc-id-line gdc-id-line--wide" />
              <span className="gdc-id-line" />
              <span className="gdc-id-line gdc-id-line--short" />
            </div>
          </div>

          {(state === 'searching' || state === 'aligning') && (
            <div className="gdc-position-hint">{POSITION_HINT_LABEL[positionHint]}</div>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="gdc-error">
          <IonIcon icon={warningOutline} className="gdc-error-icon" />
          <p>{errorMessage}</p>
        </div>
      )}

      <button type="button" className="gdc-help-button" onClick={onHelp}>
        <IonIcon icon={helpCircleOutline} /> Ayuda
      </button>
    </div>
  );
};

export default GuidedDocumentCapture;
