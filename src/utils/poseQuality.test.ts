import { describe, expect, it } from 'vitest';
import { lumaThumb, thumbDifference, duplicateOf, poseProblem, poseRetryMessage, POSE_THUMB_W, POSE_THUMB_H } from './poseQuality';

const frame = (w: number, h: number, px: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = px(x, y); const i = (y * w + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
};

describe('poseQuality', () => {
  const left = lumaThumb(frame(160, 120, (x) => (x < 80 ? 220 : 30)), 160, 120);
  const right = lumaThumb(frame(160, 120, (x) => (x < 80 ? 30 : 220)), 160, 120);

  it('thumb has the fixed size', () => {
    expect(left.length).toBe(POSE_THUMB_W * POSE_THUMB_H);
  });
  it('identical frames are duplicates, a moved face is not', () => {
    expect(thumbDifference(left, left)).toBe(0);
    expect(duplicateOf(left, { up: left })).toBe('up');
    expect(duplicateOf(right, { up: left })).toBeNull();
  });
  it('blur first, then face, then duplicate', () => {
    expect(poseProblem({ sharpness: 93, floor: 130, faceFound: true, duplicateOf: null })).toBe('blurry');
    expect(poseProblem({ sharpness: 200, floor: 130, faceFound: false, duplicateOf: null })).toBe('no-face');
    expect(poseProblem({ sharpness: 200, floor: 130, faceFound: true, duplicateOf: 'up' })).toBe('duplicate');
    expect(poseProblem({ sharpness: 200, floor: 130, faceFound: true, duplicateOf: null })).toBeNull();
  });
  it('asks for more light after the second blurry try', () => {
    expect(poseRetryMessage('blurry', 'Gira a la derecha', 1)).not.toMatch(/luz/);
    expect(poseRetryMessage('blurry', 'Gira a la derecha', 2)).toMatch(/más luz/);
  });
});
