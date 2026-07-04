// Lightweight, dependency-free frame-quality heuristics for the guided document
// capture flow. These are pixel-level proxies (not true corner/perspective CV) —
// good enough to gate when auto-capture should fire, not a replacement for
// server-side OCR-quality validation.

export interface FrameQualityMetrics {
  blurScore: number;
  brightnessScore: number;
  glareScore: number;
  motionScore: number;
  borderScore: number;
  overallScore: number;
}

export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WEIGHTS = {
  border: 0.35,
  blur: 0.25,
  brightness: 0.2,
  glare: 0.1,
  motion: 0.1,
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

function computeBlurScore(laplacian: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < laplacian.length; i++) sum += laplacian[i];
  const mean = sum / laplacian.length;
  let variance = 0;
  for (let i = 0; i < laplacian.length; i++) {
    const d = laplacian[i] - mean;
    variance += d * d;
  }
  variance /= laplacian.length;
  // Empirically, sharp document photos land well above ~150 variance on a
  // downsampled grayscale frame; blurry ones stay under ~40.
  return clampScore((variance / 150) * 100);
}

function computeBrightnessScore(gray: Uint8ClampedArray): number {
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    if (gray[i] < 12 || gray[i] > 244) clipped++;
  }
  const mean = sum / gray.length;
  const clippedRatio = clipped / gray.length;
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

// Proxy for "the document's physical edges line up with our overlay guide":
// sums edge strength in a thin band around the overlay rectangle's perimeter.
function computeBorderScore(
  laplacian: Float32Array,
  rect: OverlayRect,
  width: number,
  height: number
): number {
  const band = 6;
  let sum = 0;
  let count = 0;

  const addRow = (y: number) => {
    if (y < 1 || y >= height - 1) return;
    for (let x = Math.max(1, rect.x); x < Math.min(width - 1, rect.x + rect.width); x++) {
      sum += Math.abs(laplacian[y * width + x]);
      count++;
    }
  };
  const addCol = (x: number) => {
    if (x < 1 || x >= width - 1) return;
    for (let y = Math.max(1, rect.y); y < Math.min(height - 1, rect.y + rect.height); y++) {
      sum += Math.abs(laplacian[y * width + x]);
      count++;
    }
  };

  for (let b = 0; b < band; b++) {
    addRow(rect.y + b);
    addRow(rect.y + rect.height - 1 - b);
    addCol(rect.x + b);
    addCol(rect.x + rect.width - 1 - b);
  }

  if (count === 0) return 0;
  const meanEdge = sum / count;
  // A visible physical border produces a much stronger mean edge response
  // than an empty/plain background behind the overlay.
  return clampScore((meanEdge / 35) * 100);
}

export function analyzeFrame(
  imageData: ImageData,
  rect: OverlayRect,
  previousGray: Uint8ClampedArray | null
): { metrics: FrameQualityMetrics; gray: Uint8ClampedArray } {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);
  const laplacian = laplacianMap(gray, width, height);

  const blurScore = computeBlurScore(laplacian);
  const brightnessScore = computeBrightnessScore(gray);
  const glareScore = computeGlareScore(data, rect, width);
  const motionScore = computeMotionScore(gray, previousGray);
  const borderScore = computeBorderScore(laplacian, rect, width, height);

  const overallScore = clampScore(
    borderScore * WEIGHTS.border +
      blurScore * WEIGHTS.blur +
      brightnessScore * WEIGHTS.brightness +
      glareScore * WEIGHTS.glare +
      motionScore * WEIGHTS.motion
  );

  return {
    metrics: { blurScore, brightnessScore, glareScore, motionScore, borderScore, overallScore },
    gray,
  };
}
