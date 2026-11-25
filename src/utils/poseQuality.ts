// Liveness pose checks (pure, unit-tested). A pose photo is only accepted when
// it is sharp enough, shows a face, and is not a copy of another pose: device
// logs showed RIGHT coming out pixel-identical to UP (a stalled camera frame),
// and three poses kept below the sharpness floor — both were sent anyway and
// the validator rejected the whole session.

export type PoseProblem = 'blurry' | 'no-face' | 'duplicate';

/** Thumbnail side used for the duplicate check (luma, row-major). */
export const POSE_THUMB_W = 40;
export const POSE_THUMB_H = 30;

/**
 * Mean absolute luma difference (0–255) at or below which two pose thumbnails
 * count as the same frame. A stalled camera gives ~0; sensor noise on a still
 * head ~1–3; a real head turn moves the whole face and is far above this.
 */
export const POSE_DUPLICATE_MAX_DIFF = 4;

/** Downsamples RGBA pixels to a POSE_THUMB_W x POSE_THUMB_H luma thumbnail. */
export function lumaThumb(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(POSE_THUMB_W * POSE_THUMB_H);
  const counts = new Uint32Array(out.length);
  for (let y = 0; y < height; y++) {
    const ty = Math.min(POSE_THUMB_H - 1, Math.floor((y * POSE_THUMB_H) / height));
    for (let x = 0; x < width; x++) {
      const tx = Math.min(POSE_THUMB_W - 1, Math.floor((x * POSE_THUMB_W) / width));
      const i = (y * width + x) * 4;
      const t = ty * POSE_THUMB_W + tx;
      out[t] += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      counts[t]++;
    }
  }
  for (let t = 0; t < out.length; t++) out[t] = counts[t] ? out[t] / counts[t] : 0;
  return out;
}

export function thumbDifference(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || !a.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** The first other pose this thumbnail duplicates, or null. */
export function duplicateOf<P extends string>(
  thumb: Float32Array,
  others: Partial<Record<P, Float32Array>>,
): P | null {
  for (const [pose, other] of Object.entries(others) as [P, Float32Array | undefined][]) {
    if (other && thumbDifference(thumb, other) <= POSE_DUPLICATE_MAX_DIFF) return pose;
  }
  return null;
}

/** Why a captured pose must be repeated, or null when it is usable. */
export function poseProblem(input: {
  sharpness: number;
  floor: number;
  faceFound: boolean;
  duplicateOf: string | null;
}): PoseProblem | null {
  if (input.sharpness < input.floor) return 'blurry';
  if (!input.faceFound) return 'no-face';
  if (input.duplicateOf) return 'duplicate';
  return null;
}

/** What the person sees when a pose must be repeated (es-MX). */
export function poseRetryMessage(problem: PoseProblem, instruction: string, attempt: number): string {
  const base = problem === 'blurry'
    ? `La foto salió borrosa. ${instruction} y quédate quieto un momento.`
    : problem === 'no-face'
      ? `No vimos tu rostro completo. ${instruction} sin salir del recuadro.`
      : `La cámara repitió la foto anterior. ${instruction} otra vez.`;
  return attempt >= 2 && problem !== 'duplicate' ? `${base} Busca un lugar con más luz.` : base;
}
