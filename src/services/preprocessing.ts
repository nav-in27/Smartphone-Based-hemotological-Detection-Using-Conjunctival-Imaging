/**
 * Clinical Image Preprocessing Pipelines
 * Implements Pipeline A (Raw Standardized Grayscale) and Pipeline B (Enhanced CLAHE + Denoise).
 */

export interface PreprocessedResult {
  pipeline: 'A' | 'B';
  pipelineName: string;
  width: number;
  height: number;
  // Normalized 2D float array [0..1]
  normalizedMatrix: number[][];
  // 8-bit quantized matrix [0..255] for GLCM & texture
  grayMatrix255: number[][];
  // Histogram distribution (256 bins)
  histogram: number[];
  canvas: HTMLCanvasElement;
}

/**
 * Standard RGB to Luma Grayscale [0..255]
 */
export function rgbToGrayscaleMatrix(imageData: ImageData): number[][] {
  const { width, height, data } = imageData;
  const matrix: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // ITU-R BT.601 standard
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      row.push(gray);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Pipeline A: Raw Standardized Grayscale
 * Original ROI -> Grayscale -> Min-Max / Z-score normalization
 */
export function processPipelineA(imageData: ImageData): PreprocessedResult {
  const { width, height } = imageData;
  const rawGray = rgbToGrayscaleMatrix(imageData);

  // Calculate min & max
  let minVal = Infinity;
  let maxVal = -Infinity;
  const histogram = new Array(256).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = rawGray[y][x];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      const q = Math.max(0, Math.min(255, Math.round(v)));
      histogram[q]++;
    }
  }

  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;
  const normalizedMatrix: number[][] = [];
  const grayMatrix255: number[][] = [];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const outImgData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const normRow: number[] = [];
    const grayRow: number[] = [];
    for (let x = 0; x < width; x++) {
      const v = rawGray[y][x];
      const norm = (v - minVal) / range;
      const q = Math.round(norm * 255);

      normRow.push(norm);
      grayRow.push(q);

      const idx = (y * width + x) * 4;
      outImgData.data[idx] = q;
      outImgData.data[idx + 1] = q;
      outImgData.data[idx + 2] = q;
      outImgData.data[idx + 3] = 255;
    }
    normalizedMatrix.push(normRow);
    grayMatrix255.push(grayRow);
  }

  ctx.putImageData(outImgData, 0, 0);

  return {
    pipeline: 'A',
    pipelineName: 'Pipeline A: Standardized Grayscale (Raw)',
    width,
    height,
    normalizedMatrix,
    grayMatrix255,
    histogram,
    canvas,
  };
}

/**
 * Contrast Limited Adaptive Histogram Equalization (CLAHE)
 * Divides ROI into tiles, computes clipped CDF, and bilinearly interpolates.
 */
export function applyClahe(
  matrix: number[][],
  width: number,
  height: number,
  tileGridSize: number = 8,
  clipLimit: number = 2.5
): number[][] {
  const tilesX = Math.max(2, Math.min(tileGridSize, Math.floor(width / 8)));
  const tilesY = Math.max(2, Math.min(tileGridSize, Math.floor(height / 8)));

  const tileW = width / tilesX;
  const tileH = height / tilesY;

  // 1. Calculate tile histograms with clip limit
  const cdfs: number[][][] = []; // [tileY][tileX][256]

  for (let ty = 0; ty < tilesY; ty++) {
    cdfs[ty] = [];
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Array(256).fill(0);
      let count = 0;

      const startX = Math.floor(tx * tileW);
      const endX = Math.floor((tx + 1) * tileW);
      const startY = Math.floor(ty * tileH);
      const endY = Math.floor((ty + 1) * tileH);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const val = Math.max(0, Math.min(255, Math.round(matrix[y][x])));
          hist[val]++;
          count++;
        }
      }

      // Clip histogram
      const clipVal = Math.max(1, Math.round((clipLimit * count) / 256));
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipVal) {
          excess += hist[i] - clipVal;
          hist[i] = clipVal;
        }
      }

      // Redistribute excess
      const bonus = Math.floor(excess / 256);
      const remainder = excess % 256;
      for (let i = 0; i < 256; i++) {
        hist[i] += bonus;
        if (i < remainder) hist[i]++;
      }

      // Calculate CDF
      const cdf = new Array(256).fill(0);
      let cumulative = 0;
      for (let i = 0; i < 256; i++) {
        cumulative += hist[i];
        cdf[i] = count > 0 ? (cumulative / count) * 255 : i;
      }
      cdfs[ty][tx] = cdf;
    }
  }

  // 2. Bilinear Interpolation
  const result: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const origVal = Math.max(0, Math.min(255, Math.round(matrix[y][x])));

      // Find surrounding tile centers
      const txFloat = x / tileW - 0.5;
      const tyFloat = y / tileH - 0.5;

      const tx1 = Math.max(0, Math.min(tilesX - 1, Math.floor(txFloat)));
      const tx2 = Math.max(0, Math.min(tilesX - 1, tx1 + 1));
      const ty1 = Math.max(0, Math.min(tilesY - 1, Math.floor(tyFloat)));
      const ty2 = Math.max(0, Math.min(tilesY - 1, ty1 + 1));

      const weightX = Math.max(0, Math.min(1, txFloat - tx1));
      const weightY = Math.max(0, Math.min(1, tyFloat - ty1));

      const v11 = cdfs[ty1][tx1][origVal];
      const v21 = cdfs[ty1][tx2][origVal];
      const v12 = cdfs[ty2][tx1][origVal];
      const v22 = cdfs[ty2][tx2][origVal];

      // Interpolate along X
      const top = (1 - weightX) * v11 + weightX * v21;
      const bottom = (1 - weightX) * v12 + weightX * v22;

      // Interpolate along Y
      const finalVal = (1 - weightY) * top + weightY * bottom;
      row.push(finalVal);
    }
    result.push(row);
  }

  return result;
}

/**
 * 3x3 Edge-Preserving Bilateral / Guided Filter
 */
export function applyEdgePreservingFilter(
  matrix: number[][],
  width: number,
  height: number,
  sigmaSpatial: number = 1.5,
  sigmaRange: number = 25.0
): number[][] {
  const result: number[][] = [];
  const radius = 1; // 3x3 kernel for fast execution

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const centerVal = matrix[y][x];
      let weightSum = 0;
      let valSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const neighborVal = matrix[ny][nx];
          const distSq = dx * dx + dy * dy;
          const rangeDiff = centerVal - neighborVal;

          const spatialWeight = Math.exp(-distSq / (2 * sigmaSpatial * sigmaSpatial));
          const rangeWeight = Math.exp(-(rangeDiff * rangeDiff) / (2 * sigmaRange * sigmaRange));
          const weight = spatialWeight * rangeWeight;

          weightSum += weight;
          valSum += neighborVal * weight;
        }
      }

      row.push(weightSum > 0 ? valSum / weightSum : centerVal);
    }
    result.push(row);
  }

  return result;
}

/**
 * Pipeline B: Enhanced Pipeline
 * Original ROI -> Grayscale -> CLAHE -> Denoising -> Standardized Normalization
 */
export function processPipelineB(imageData: ImageData): PreprocessedResult {
  const { width, height } = imageData;
  const rawGray = rgbToGrayscaleMatrix(imageData);

  // 1. CLAHE
  const claheMatrix = applyClahe(rawGray, width, height, 6, 2.8);

  // 2. Edge-preserving Denoising
  const denoisedMatrix = applyEdgePreservingFilter(claheMatrix, width, height, 1.2, 20.0);

  // 3. Min-Max Standardization
  let minVal = Infinity;
  let maxVal = -Infinity;
  const histogram = new Array(256).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = denoisedMatrix[y][x];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  }

  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;
  const normalizedMatrix: number[][] = [];
  const grayMatrix255: number[][] = [];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const outImgData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const normRow: number[] = [];
    const grayRow: number[] = [];
    for (let x = 0; x < width; x++) {
      const v = denoisedMatrix[y][x];
      const norm = (v - minVal) / range;
      const q = Math.max(0, Math.min(255, Math.round(norm * 255)));

      normRow.push(norm);
      grayRow.push(q);
      histogram[q]++;

      const idx = (y * width + x) * 4;
      outImgData.data[idx] = q;
      outImgData.data[idx + 1] = q;
      outImgData.data[idx + 2] = q;
      outImgData.data[idx + 3] = 255;
    }
    normalizedMatrix.push(normRow);
    grayMatrix255.push(grayRow);
  }

  ctx.putImageData(outImgData, 0, 0);

  return {
    pipeline: 'B',
    pipelineName: 'Pipeline B: Enhanced (CLAHE + Bilateral Denoising)',
    width,
    height,
    normalizedMatrix,
    grayMatrix255,
    histogram,
    canvas,
  };
}
