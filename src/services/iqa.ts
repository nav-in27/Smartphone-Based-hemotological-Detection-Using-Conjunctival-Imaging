/**
 * Image Quality Assessment (IQA) Engine
 * Evaluates photographic suitability for conjunctival microvascular radiomics.
 */

import { ImageQualityMetrics } from '../types/clinical';

export function analyzeImageQuality(imageData: ImageData): ImageQualityMetrics {
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  // 1. Resolution Check
  const minDim = Math.min(width, height);
  const isResolutionSufficient = width >= 400 && height >= 300 && totalPixels >= 150000;

  // 2. Grayscale & Luminance extraction
  let sumLuma = 0;
  let sumSqLuma = 0;
  let overexposedCount = 0;
  let underexposedCount = 0;
  let saturatedGlareCount = 0;
  let redProminenceSum = 0;

  // We can sample or analyze all pixels depending on image size
  // For performance on large images, step size adapts
  const step = totalPixels > 1000000 ? 2 : 1;
  let sampledCount = 0;

  const grayMatrix: number[][] = [];
  const sampleW = Math.floor(width / step);
  const sampleH = Math.floor(height / step);

  for (let y = 0; y < sampleH; y++) {
    const row: number[] = [];
    for (let x = 0; x < sampleW; x++) {
      const srcX = x * step;
      const srcY = y * step;
      const idx = (srcY * width + srcX) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // ITU-R BT.601 standard luma
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      row.push(luma);

      sumLuma += luma;
      sumSqLuma += luma * luma;

      if (luma > 245) overexposedCount++;
      if (luma < 20) underexposedCount++;

      // Glare check: very high brightness with near white saturation
      if (r > 240 && g > 240 && b > 240) {
        saturatedGlareCount++;
      }

      // Conjunctival vascular prominence indicator (Erythema / Redness ratio: R - G)
      if (r > 60 && r > g * 1.15 && r > b * 1.15) {
        redProminenceSum += (r - g) / 255;
      }

      sampledCount++;
    }
    grayMatrix.push(row);
  }

  const meanLuma = sumLuma / sampledCount;
  const varianceLuma = Math.max(0, sumSqLuma / sampledCount - meanLuma * meanLuma);
  const rmsContrast = Math.sqrt(varianceLuma);

  // 3. Sharpness / Blur via Discrete Laplacian Operator Variance
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let validLaplacianPoints = 0;

  // Compute 3x3 Laplacian: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const center = grayMatrix[y][x];
      const up = grayMatrix[y - 1][x];
      const down = grayMatrix[y + 1][x];
      const left = grayMatrix[y][x - 1];
      const right = grayMatrix[y][x + 1];

      const lap = Math.abs(up + down + left + right - 4 * center);
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      validLaplacianPoints++;
    }
  }

  const laplacianMean = validLaplacianPoints > 0 ? laplacianSum / validLaplacianPoints : 0;
  const laplacianVar = validLaplacianPoints > 0 
    ? Math.max(0, (laplacianSqSum / validLaplacianPoints) - (laplacianMean * laplacianMean))
    : 0;

  // Normalized sharpness score (0 - 100)
  // Typically laplacian variance for sharp eye images with eyelids is 80 - 600+
  const sharpnessScore = Math.min(100, Math.max(0, Math.round((laplacianVar / 180) * 100)));
  const blurScore = Math.max(0, 100 - sharpnessScore);

  // 4. Over/Underexposure percentages
  const overexposedPercent = (overexposedCount / sampledCount) * 100;
  const underexposedPercent = (underexposedCount / sampledCount) * 100;
  const glarePercent = (saturatedGlareCount / sampledCount) * 100;

  // Exposure balance score (optimal meanLuma: 80 - 165)
  let exposureScore = 100;
  if (meanLuma < 50) {
    exposureScore = Math.max(10, Math.round((meanLuma / 50) * 80));
  } else if (meanLuma > 200) {
    exposureScore = Math.max(10, Math.round(((255 - meanLuma) / 55) * 80));
  } else {
    exposureScore = Math.min(100, Math.round(90 + 10 * (1 - Math.abs(meanLuma - 128) / 72)));
  }

  // 5. RMS Contrast Score (Optimal: 40 - 75)
  const contrastScore = Math.min(100, Math.max(15, Math.round((rmsContrast / 60) * 100)));

  // 6. Glare score (lower glare % -> higher score)
  const glareScore = Math.max(0, Math.min(100, Math.round(100 - glarePercent * 15)));

  // 7. Conjunctiva/Vascular visibility (presence of distinctive mucosal red/pink vascular pixels)
  const vascularPixelFraction = redProminenceSum / sampledCount;
  const conjunctivaVisibilityScore = Math.min(100, Math.max(20, Math.round(vascularPixelFraction * 800)));

  // 8. Composite Overall Image Quality Score (0 - 100)
  const rejectionReasons: string[] = [];
  const recommendations: string[] = [];

  if (!isResolutionSufficient) {
    rejectionReasons.push(`Resolution insufficient (${width}x${height}). Minimum required is 400x300.`);
    recommendations.push("Move closer to the eye or use standard photographic resolution.");
  }

  if (sharpnessScore < 30) {
    rejectionReasons.push("Excessive optical blur or camera motion detected.");
    recommendations.push("Keep the smartphone steady, tap to focus on the inner lower eyelid, or rest elbows on a stable surface.");
  }

  if (overexposedPercent > 18) {
    rejectionReasons.push("Severe overexposure / highlight clipping detected.");
    recommendations.push("Turn off direct flash or move away from harsh spotlighting.");
  }

  if (underexposedPercent > 35) {
    rejectionReasons.push("Severe underexposure / image too dark.");
    recommendations.push("Capture under even, bright room lighting or natural diffuse daylight.");
  }

  if (glarePercent > 8) {
    rejectionReasons.push("Excessive specular glare / reflection on conjunctival tissue.");
    recommendations.push("Reposition camera angle slightly to eliminate reflective flare.");
  }

  if (conjunctivaVisibilityScore < 25) {
    recommendations.push("Ensure the lower palpebral eyelid is gently pulled down to clearly expose the inner reddish mucosal surface.");
  }

  // Weighted composite
  let compositeScore = 
    sharpnessScore * 0.35 +
    exposureScore * 0.20 +
    contrastScore * 0.15 +
    glareScore * 0.15 +
    conjunctivaVisibilityScore * 0.15;

  if (!isResolutionSufficient) {
    compositeScore = Math.min(compositeScore, 48);
  }

  // Penalty if excessive highlights or darkness
  if (overexposedPercent > 20 || underexposedPercent > 40) {
    compositeScore -= 20;
  }

  const totalQualityScore = Math.min(100, Math.max(0, Math.round(compositeScore)));

  let qualityGrade: 'excellent' | 'good' | 'acceptable' | 'reject';
  if (totalQualityScore >= 88 && rejectionReasons.length === 0) {
    qualityGrade = 'excellent';
  } else if (totalQualityScore >= 75 && rejectionReasons.length === 0) {
    qualityGrade = 'good';
  } else if (totalQualityScore >= 58 && rejectionReasons.length === 0) {
    qualityGrade = 'acceptable';
  } else {
    qualityGrade = 'reject';
    if (rejectionReasons.length === 0) {
      rejectionReasons.push("Aggregate image quality score below acceptable diagnostic threshold (60/100).");
      recommendations.push("Retake image following the standardized clinical acquisition checklist.");
    }
  }

  return {
    resolutionWidth: width,
    resolutionHeight: height,
    isResolutionSufficient,
    sharpnessScore,
    blurScore,
    exposureScore,
    overexposedPercent: Number(overexposedPercent.toFixed(1)),
    underexposedPercent: Number(underexposedPercent.toFixed(1)),
    contrastScore,
    glareScore,
    conjunctivaVisibilityScore,
    totalQualityScore,
    qualityGrade,
    rejectionReasons,
    recommendations,
  };
}
