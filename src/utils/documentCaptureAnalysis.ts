// Lightweight, dependency-free frame-quality heuristics for the guided document
// capture flow. These are pixel-level proxies (not true corner/perspective CV) —
// good enough to gate when auto-capture should fire, not a replacement for
// server-side OCR-quality validation.

export type PositionHint = 'move-closer' | 'move-back' | 'hold-steady';

export interface FrameQualityMetrics {
  blurScore: number;
  brightnessScore: number;
  glareScore: number;
  motionScore: number;
  overallScore: number;
  positionHint: PositionHint;
}

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WEIGHTS = {
  blur: 0.45,
  brightness: 0.25,
  glare: 0.15,
  motion: 0.15,
};

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < data.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return gray;
}

// Laplacian (edge-response) map: high absolute value = strong local edge.
function laplacianMap(gray: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width];
      out[i] = value;
    }
  }
  return out;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// Variance of the Laplacian *inside the guide only*. A sharp, detailed
// document (text, photo, microprint) filling the guide has high variance;
// a blurry frame — or a plain background behind a too-small/misaligned
// document — has low variance. Deliberately scoped to the interior rather
// than the guide's drawn outline: requiring the physical document edge to
// land exactly on the outline is unrealistic for a handheld phone and was
// capping the score before any frame could ever qualify as "good".
function computeBlurScore(laplacian: Float32Array, rect: OverlayRect, width: number, height: number): number {
  const x0 = Math.max(1, rect.x);
  const y0 = Math.max(1, rect.y);
  const x1 = Math.min(width - 1, rect.x + rect.width);
  const y1 = Math.min(height - 1, rect.y + rect.height);

  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += laplacian[y * width + x];
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;

  let variance = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = laplacian[y * width + x] - mean;
      variance += d * d;
    }
  }
  variance /= count;

  // Empirically, sharp document photos land well above ~150 variance on a
  // downsampled grayscale frame; blurry ones, or plain backgrounds, stay
  // under ~40.
  return clampScore((variance / 150) * 100);
}

// Same Laplacian-variance measure as computeBlurScore, but run over the
// WHOLE image at its native resolution instead of the live-gating pipeline's
// heavily downsampled (240px-wide) analysis canvas. Downsampling smooths
// away real blur — confirmed on-device: computeBlurScore reported its
// maximum 100/100 on a capture that was still too blurry for OCR to read.
// This has no calibrated 0-100 scale yet (variance scales with resolution,
// so the 150/40 reference above doesn't transfer) — it returns the raw
// variance for logging until a real full-resolution threshold is derived
// from actual device data.
export function computeFullResBlurVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);
  const laplacian = laplacianMap(gray, width, height);

  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      sum += laplacian[y * width + x];
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;

  let variance = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const d = laplacian[y * width + x] - mean;
      variance += d * d;
    }
  }
  return variance / count;
}

// Scoped to the guide interior — a dark background around a well-lit
// document (or vice versa) shouldn't drag this down.
function computeBrightnessScore(gray: Uint8ClampedArray, rect: OverlayRect, width: number, height: number): number {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(width, rect.x + rect.width);
  const y1 = Math.min(height, rect.y + rect.height);

  let sum = 0;
  let clipped = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const value = gray[y * width + x];
      sum += value;
      if (value < 12 || value > 244) clipped++;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  const clippedRatio = clipped / count;
  // Ideal band ~90-190; penalize distance from the band center (140).
  const distance = Math.abs(mean - 140);
  const exposureScore = clampScore(100 - distance * 1.1);
  const clippingPenalty = clampScore(100 - clippedRatio * 400);
  return clampScore(exposureScore * 0.7 + clippingPenalty * 0.3);
}

function computeGlareScore(data: Uint8ClampedArray, rect: OverlayRect, width: number): number {
  let saturated = 0;
  let total = 0;
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const p = (y * width + x) * 4;
      if (p < 0 || p >= data.length) continue;
      total++;
      if (data[p] > 240 && data[p + 1] > 240 && data[p + 2] > 240) saturated++;
    }
  }
  if (total === 0) return 100;
  const ratio = saturated / total;
  return clampScore(100 - ratio * 500);
}

function computeMotionScore(
  gray: Uint8ClampedArray,
  previousGray: Uint8ClampedArray | null
): number {
  if (!previousGray || previousGray.length !== gray.length) return 50; // neutral on first frame
  let diff = 0;
  for (let i = 0; i < gray.length; i++) {
    diff += Math.abs(gray[i] - previousGray[i]);
  }
  const meanDiff = diff / gray.length;
  return clampScore(100 - meanDiff * 4);
}

function meanAbsEdge(laplacian: Float32Array, x0: number, y0: number, x1: number, y1: number, width: number): number {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += Math.abs(laplacian[y * width + x]);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

// Distinguishes "no/too-small document" from "document cropped by the guide"
// so the UI can tell the user which way to move. Neither state requires the
// document's edges to land exactly on the drawn outline (see computeBlurScore
// above) — this only looks at *how much detail reaches near the outline*:
//   - Center of the guide has little detail  -> nothing there yet, or too
//     far away to resolve texture -> move closer.
//   - Detail extends all the way to the guide's outer edge -> the document
//     likely doesn't fit within the guide -> move back.
//   - Otherwise the document is centered with some margin -> hold steady.
function computePositionHint(
  laplacian: Float32Array,
  rect: OverlayRect,
  width: number,
  height: number
): PositionHint {
  const marginX = rect.width * 0.15;
  const marginY = rect.height * 0.15;
  const innerX0 = Math.max(1, Math.round(rect.x + marginX));
  const innerY0 = Math.max(1, Math.round(rect.y + marginY));
  const innerX1 = Math.min(width - 1, Math.round(rect.x + rect.width - marginX));
  const innerY1 = Math.min(height - 1, Math.round(rect.y + rect.height - marginY));
  const centerDensity = meanAbsEdge(laplacian, innerX0, innerY0, innerX1, innerY1, width);

  const band = 3;
  const outerX0 = Math.max(1, rect.x);
  const outerY0 = Math.max(1, rect.y);
  const outerX1 = Math.min(width - 1, rect.x + rect.width);
  const outerY1 = Math.min(height - 1, rect.y + rect.height);
  let boundarySum = 0;
  let boundaryCount = 0;
  for (let b = 0; b < band; b++) {
    for (let x = outerX0; x < outerX1; x++) {
      boundarySum += Math.abs(laplacian[(outerY0 + b) * width + x]);
      boundarySum += Math.abs(laplacian[(outerY1 - 1 - b) * width + x]);
      boundaryCount += 2;
    }
    for (let y = outerY0; y < outerY1; y++) {
      boundarySum += Math.abs(laplacian[y * width + (outerX0 + b)]);
      boundarySum += Math.abs(laplacian[y * width + (outerX1 - 1 - b)]);
      boundaryCount += 2;
    }
  }
  const boundaryDensity = boundaryCount === 0 ? 0 : boundarySum / boundaryCount;

  const CROPPED_THRESHOLD = 40;
  const NO_DOCUMENT_THRESHOLD = 6;

  if (boundaryDensity > CROPPED_THRESHOLD) return 'move-back';
  if (centerDensity < NO_DOCUMENT_THRESHOLD) return 'move-closer';
  return 'hold-steady';
}

export function analyzeFrame(
  imageData: ImageData,
  rect: OverlayRect,
  previousGray: Uint8ClampedArray | null
): { metrics: FrameQualityMetrics; gray: Uint8ClampedArray } {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);
  const laplacian = laplacianMap(gray, width, height);

  const blurScore = computeBlurScore(laplacian, rect, width, height);
  const brightnessScore = computeBrightnessScore(gray, rect, width, height);
  const glareScore = computeGlareScore(data, rect, width);
  const motionScore = computeMotionScore(gray, previousGray);
  const positionHint = computePositionHint(laplacian, rect, width, height);

  const overallScore = clampScore(
    blurScore * WEIGHTS.blur +
      brightnessScore * WEIGHTS.brightness +
      glareScore * WEIGHTS.glare +
      motionScore * WEIGHTS.motion
  );

  return {
    metrics: { blurScore, brightnessScore, glareScore, motionScore, overallScore, positionHint },
    gray,
  };
}
