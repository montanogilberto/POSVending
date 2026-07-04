import { describe, expect, it } from 'vitest';
import { analyzeFrame, OverlayRect } from './documentCaptureAnalysis';

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const p = (y * width + x) * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

const WIDTH = 120;
const HEIGHT = 160;
const RECT: OverlayRect = { x: 10, y: 20, width: 100, height: 120 };

describe('analyzeFrame', () => {
  it('scores a flat mid-gray frame as blurry (no document detail)', () => {
    const frame = makeImageData(WIDTH, HEIGHT, () => [140, 140, 140]);
    const { metrics } = analyzeFrame(frame, RECT, null);
    expect(metrics.blurScore).toBeLessThan(10);
    // Below GuidedDocumentCapture's "aligning" threshold (55) — good lighting
    // alone must not be enough to pass without actual document detail.
    expect(metrics.overallScore).toBeLessThan(55);
  });

  it('scores a detailed document filling the guide interior as sharp, even without touching the guide outline', () => {
    // Checkerboard texture drawn well inside the rect (margin on every side),
    // simulating a real photo where the card doesn't reach the drawn guide's
    // exact edges — this used to keep the score capped indefinitely.
    const margin = 15;
    const frame = makeImageData(WIDTH, HEIGHT, (x, y) => {
      const inside =
        x >= RECT.x + margin && x < RECT.x + RECT.width - margin &&
        y >= RECT.y + margin && y < RECT.y + RECT.height - margin;
      if (inside) return (x + y) % 2 === 0 ? [230, 230, 230] : [30, 30, 30];
      return [140, 140, 140];
    });
    const { metrics } = analyzeFrame(frame, RECT, null);
    expect(metrics.blurScore).toBeGreaterThan(50);
  });

  it('penalizes near-white glare inside the overlay', () => {
    const clean = makeImageData(WIDTH, HEIGHT, () => [140, 140, 140]);
    const glare = makeImageData(WIDTH, HEIGHT, (x, y) => {
      const inside = x >= RECT.x && x < RECT.x + RECT.width && y >= RECT.y && y < RECT.y + RECT.height;
      return inside ? [250, 250, 250] : [140, 140, 140];
    });
    const cleanResult = analyzeFrame(clean, RECT, null);
    const glareResult = analyzeFrame(glare, RECT, null);
    expect(glareResult.metrics.glareScore).toBeLessThan(cleanResult.metrics.glareScore);
  });

  it('penalizes motion between two very different consecutive frames', () => {
    const frameA = makeImageData(WIDTH, HEIGHT, () => [50, 50, 50]);
    const frameB = makeImageData(WIDTH, HEIGHT, () => [220, 220, 220]);
    const first = analyzeFrame(frameA, RECT, null);
    const second = analyzeFrame(frameB, RECT, first.gray);
    expect(second.metrics.motionScore).toBeLessThan(30);
  });

  it('rewards a still frame identical to the previous one', () => {
    const frame = makeImageData(WIDTH, HEIGHT, (x, y) => ((x + y) % 2 === 0 ? [200, 200, 200] : [60, 60, 60]));
    const first = analyzeFrame(frame, RECT, null);
    const second = analyzeFrame(frame, RECT, first.gray);
    expect(second.metrics.motionScore).toBeGreaterThan(90);
  });

  it('keeps all scores within 0-100 bounds', () => {
    const frame = makeImageData(WIDTH, HEIGHT, (x, y) => [(x * 7) % 256, (y * 13) % 256, (x + y) % 256]);
    const { metrics } = analyzeFrame(frame, RECT, null);
    for (const value of Object.values(metrics)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
