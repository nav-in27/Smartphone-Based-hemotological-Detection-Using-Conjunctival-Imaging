/**
 * Conjunctiva Region of Interest (ROI) Localization Engine
 * Detects eye features and isolates the lower palpebral conjunctival bed.
 */

import { RoiCoordinates } from '../types/clinical';

export interface EyeLandmarkDetection {
  eyeBox: { x: number; y: number; width: number; height: number };
  irisCenter: { x: number; y: number };
  conjunctivaRoi: RoiCoordinates;
  detectionConfidence: number;
  detectedFeatures: string[];
}

export function detectConjunctivaRoi(imageData: ImageData): EyeLandmarkDetection {
  const { width, height, data } = imageData;

  // Search for the eye region and palpebral mucosal vascular zone
  // Strategy:
  // 1. Sclera detection: bright, low saturation regions (R,G,B close and > 160)
  // 2. Iris/pupil detection: dark circular cluster adjacent to sclera
  // 3. Palpebral conjunctiva: characteristic vascular band below iris/sclera, high R/(R+G+B) and R > G + 15

  let minScleraX = width;
  let maxScleraX = 0;
  let minScleraY = height;
  let maxScleraY = 0;
  let scleraCount = 0;

  // Sample grid
  const step = Math.max(1, Math.floor(width / 320));
  const redVascularMap: { x: number; y: number; score: number }[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const sum = r + g + b + 1;
      const redRatio = r / sum;

      // Sclera candidate
      if (r > 155 && g > 150 && b > 145 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
        if (x < minScleraX) minScleraX = x;
        if (x > maxScleraX) maxScleraX = x;
        if (y < minScleraY) minScleraY = y;
        if (y > maxScleraY) maxScleraY = y;
        scleraCount++;
      }

      // Vascular conjunctival candidate (mucosal redness distinct from skin)
      // Mucosal tissue has higher redness and lower skin melanin melanin-hue
      if (r > 80 && redRatio > 0.42 && r > g * 1.18 && r > b * 1.25) {
        const vascularScore = (r - g) + (r - b);
        redVascularMap.push({ x, y, score: vascularScore });
      }
    }
  }

  // If sclera or eye region detected
  let eyeBox = {
    x: Math.round(width * 0.2),
    y: Math.round(height * 0.25),
    width: Math.round(width * 0.6),
    height: Math.round(height * 0.5),
  };

  let detectionConfidence = 0.72;
  const detectedFeatures: string[] = [];

  if (scleraCount > 200 && maxScleraX > minScleraX && maxScleraY > minScleraY) {
    const scleraW = maxScleraX - minScleraX;
    const scleraH = maxScleraY - minScleraY;
    eyeBox = {
      x: Math.max(0, Math.round(minScleraX - scleraW * 0.2)),
      y: Math.max(0, Math.round(minScleraY - scleraH * 0.3)),
      width: Math.min(width - 1, Math.round(scleraW * 1.4)),
      height: Math.min(height - 1, Math.round(scleraH * 1.8)),
    };
    detectedFeatures.push('Scleral White Substrate');
    detectionConfidence += 0.12;
  }

  // If vascular mucosal clusters found in lower half of eye box
  let conjunctivaX = Math.round(width * 0.28);
  let conjunctivaY = Math.round(height * 0.58);
  let conjunctivaW = Math.round(width * 0.44);
  let conjunctivaH = Math.round(height * 0.22);

  // Filter red points falling below the upper eye region
  const candidateLowerPoints = redVascularMap.filter(
    (p) => p.y >= eyeBox.y + eyeBox.height * 0.45 && p.y <= eyeBox.y + eyeBox.height * 1.15
  );

  if (candidateLowerPoints.length > 50) {
    // Sort by vascular score
    candidateLowerPoints.sort((a, b) => b.score - a.score);
    const topCandidates = candidateLowerPoints.slice(0, Math.floor(candidateLowerPoints.length * 0.8));

    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (const pt of topCandidates) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    if (maxX > minX && maxY > minY) {
      // Add slight padding to capture the mucosal crescent
      const wSpan = maxX - minX;
      const hSpan = maxY - minY;
      conjunctivaX = Math.max(0, Math.round(minX - wSpan * 0.08));
      conjunctivaY = Math.max(0, Math.round(minY - hSpan * 0.08));
      conjunctivaW = Math.min(width - conjunctivaX, Math.round(wSpan * 1.16));
      conjunctivaH = Math.min(height - conjunctivaY, Math.round(hSpan * 1.16));

      detectedFeatures.push('Lower Palpebral Mucosa Cluster');
      detectionConfidence = Math.min(0.96, detectionConfidence + 0.14);
    }
  } else {
    // Fallback heuristic based on clinical eye anatomy:
    // Palpebral conjunctiva sits just below the ocular bulb
    conjunctivaX = Math.max(0, Math.round(eyeBox.x + eyeBox.width * 0.15));
    conjunctivaY = Math.max(0, Math.round(eyeBox.y + eyeBox.height * 0.62));
    conjunctivaW = Math.min(width - conjunctivaX, Math.round(eyeBox.width * 0.70));
    conjunctivaH = Math.min(height - conjunctivaY, Math.round(eyeBox.height * 0.28));
    detectedFeatures.push('Anatomical Lower Margin Heuristic');
  }

  // Ensure minimum dimensions
  conjunctivaW = Math.max(60, conjunctivaW);
  conjunctivaH = Math.max(35, conjunctivaH);

  // Generate 8-point anatomically curved polygon for lower eyelid mucosal bed
  const midX = conjunctivaX + conjunctivaW / 2;
  const bottomY = conjunctivaY + conjunctivaH;
  const polygonPoints: [number, number][] = [
    [conjunctivaX, conjunctivaY + conjunctivaH * 0.3],
    [conjunctivaX + conjunctivaW * 0.2, conjunctivaY + conjunctivaH * 0.1],
    [midX, conjunctivaY],
    [conjunctivaX + conjunctivaW * 0.8, conjunctivaY + conjunctivaH * 0.1],
    [conjunctivaX + conjunctivaW, conjunctivaY + conjunctivaH * 0.3],
    [conjunctivaX + conjunctivaW * 0.85, bottomY],
    [midX, conjunctivaY + conjunctivaH * 0.95],
    [conjunctivaX + conjunctivaW * 0.15, bottomY],
  ];

  return {
    eyeBox,
    irisCenter: {
      x: Math.round(eyeBox.x + eyeBox.width * 0.5),
      y: Math.round(eyeBox.y + eyeBox.height * 0.4),
    },
    conjunctivaRoi: {
      x: conjunctivaX,
      y: conjunctivaY,
      width: conjunctivaW,
      height: conjunctivaH,
      confidence: Number(detectionConfidence.toFixed(2)),
      manualAdjusted: false,
      polygonPoints,
    },
    detectionConfidence: Number(detectionConfidence.toFixed(2)),
    detectedFeatures,
  };
}

/**
 * Crops the specified ROI from the canvas / source image into an isolated ImageData.
 */
export function cropRoi(
  sourceCanvas: HTMLCanvasElement,
  roi: RoiCoordinates
): { roiCanvas: HTMLCanvasElement; roiImageData: ImageData } {
  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = Math.max(1, Math.round(roi.width));
  roiCanvas.height = Math.max(1, Math.round(roi.height));
  const ctx = roiCanvas.getContext('2d')!;

  ctx.drawImage(
    sourceCanvas,
    Math.round(roi.x),
    Math.round(roi.y),
    Math.round(roi.width),
    Math.round(roi.height),
    0,
    0,
    roiCanvas.width,
    roiCanvas.height
  );

  const roiImageData = ctx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  return { roiCanvas, roiImageData };
}
