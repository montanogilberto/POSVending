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

// Full-resolution sharpness, measured on the final captured crop rather than
// the live-gating pipeline's downsampled (240px-wide) analysis canvas.
//
// This replaces an earlier Laplacian-variance version of the same idea, which
// was measured against two real captures of the same INE — one the wizard
// produced (visibly blurred, and which the extraction agent misread badly:
// wrong surname, wrong street, wrong date of birth) and one sharp phone photo
// that extracted perfectly. Laplacian variance ranked them BACKWARDS: 370 for
// the blurry capture vs. 1080-equivalent for the sharp one, i.e. it would have
// accepted the bad frame and rejected the good one.
//
// The reason is that the bad captures are noise-dominated, not smooth: they're
// shot in poor light at high ISO, and sensor noise is high-frequency, so it
// inflates Laplacian variance exactly when the image is worst. Normalizing by
// image variance and an FFT high-frequency ratio were both tried and invert
// the same way, for the same reason.
//
// Tenengrad — mean squared gradient magnitude counting only pixels above a
// gradient floor — ignores the low-amplitude noise and measures real edge
// structure. It ranks the same pair correctly by ~2.9x, and the ranking holds
// across every gradient floor from 10 to 200, so it isn't an artifact of the
// constant. Returns a raw score (higher = sharper); see MIN_CAPTURE_SHARPNESS
// in GuidedDocumentCapture for the gate, which still needs field calibration.
const GRADIENT_FLOOR = 50;

export function computeCaptureSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);

  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      const magnitude = gx * gx + gy * gy;
      if (magnitude > GRADIENT_FLOOR) {
        sum += magnitude;
        count++;
      }
    }
  }
  return count === 0 ? 0 : sum / count;
}

export interface CardGeometry {
  detected: boolean;
  // Fraction of the analysed frame the card actually occupies. The blurry
  // capture that triggered all this filled only ~40% of its 1100px crop, so
  // the card resolved at ~208 DPI against the ~300 DPI the output width was
  // sized for — under-filling costs real resolution before blur even applies.
  coverage: number;
  // In-plane rotation of the card's left edge, degrees.
  //
  // ADVISORY ONLY — do not gate on this yet. Checked against the two real
  // captures available and it ranked them backwards: 2.6 deg / 0.06 keystone
  // for the blurry wizard capture vs. 9.5 deg / 0.15 for the sharp phone photo
  // that extracted perfectly. The projection-based mask picks up background
  // glare and mis-locates the edge when the guide clips the card, so a hard
  // "not frontal" gate built on these numbers would reject good captures.
  // Surfaced as guidance text and logged so real device data can calibrate a
  // threshold; coverage and sharpness are the checks that actually gate.
  tiltDegrees: number;
  keystoneRatio: number;
  // Advisory, from the uncalibrated thresholds below. Not a capture gate.
  isFrontal: boolean;
}

const ADVISORY_TILT_DEGREES = 7;
const ADVISORY_KEYSTONE_RATIO = 0.12;

// Otsu's method — splits the histogram into card vs. background without
// assuming a fixed brightness, since these are shot on everything from a
// dark desk to a lit countertop.
function otsuThreshold(gray: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = -1;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const between =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (between > maxVariance) {
      maxVariance = between;
      threshold = t;
    }
  }
  return threshold;
}

// Least-squares slope of the points, in degrees. Returns 0 for degenerate input.
function slopeDegrees(points: Array<{ x: number; y: number }>): number {
  const n = points.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  if (denominator === 0) return 0;
  return (Math.atan(numerator / denominator) * 180) / Math.PI;
}

// Locates the card as the bright region against its background and reports how
// well it's framed: filling the guide, square-on, and not rotated. This is a
// projection-based estimate, not true corner detection — enough to tell a user
// "hold it flat and fill the frame", not enough to rectify perspective.
export function detectCardGeometry(imageData: ImageData): CardGeometry {
  const { data, width, height } = imageData;
  const gray = toGrayscale(data, width, height);
  const threshold = otsuThreshold(gray);

  const notDetected: CardGeometry = {
    detected: false,
    coverage: 0,
    tiltDegrees: 0,
    keystoneRatio: 0,
    isFrontal: false,
  };

  // Per-row horizontal extent of the bright region. A row counts as part of
  // the card only if enough of it is bright, which rejects specular glints and
  // stray highlights in the background.
  const minRunForCardRow = width * 0.25;
  const rows: Array<{ y: number; left: number; right: number }> = [];
  let brightPixels = 0;

  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (gray[y * width + x] > threshold) {
        if (left === -1) left = x;
        right = x;
        count++;
      }
    }
    brightPixels += count;
    if (count >= minRunForCardRow && left !== -1) rows.push({ y, left, right });
  }

  if (rows.length < height * 0.2) return notDetected;

  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const cardHeight = bottom.y - top.y + 1;
  if (cardHeight < 2) return notDetected;

  // Average the extreme 10% of rows at each end rather than trusting a single
  // row, so one ragged edge row can't drive the keystone estimate.
  const band = Math.max(1, Math.round(rows.length * 0.1));
  const meanWidth = (slice: typeof rows) =>
    slice.reduce((acc, r) => acc + (r.right - r.left + 1), 0) / slice.length;
  const topWidth = meanWidth(rows.slice(0, band));
  const bottomWidth = meanWidth(rows.slice(-band));

  const keystoneRatio =
    Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth, 1);

  // Rotation from the left-hand edge: its x drifts with in-plane rotation,
  // and unlike the top edge it stays measurable when the card is cropped
  // top/bottom by the guide.
  const tiltDegrees = Math.abs(
    slopeDegrees(rows.map((r) => ({ x: r.y, y: r.left })))
  );

  const coverage = brightPixels / (width * height);
  const isFrontal =
    tiltDegrees <= ADVISORY_TILT_DEGREES && keystoneRatio <= ADVISORY_KEYSTONE_RATIO;

  return { detected: true, coverage, tiltDegrees, keystoneRatio, isFrontal };
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
