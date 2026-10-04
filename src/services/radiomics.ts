/**
 * Radiomics Feature Extraction Engine
 * Extracts mathematical biomarker descriptors from conjunctival tissue:
 * - 16 First-Order Intensity Statistics
 * - Gray-Level Co-occurrence Matrix (GLCM) Texture across multiple angles (0°, 45°, 90°, 135°)
 * - Morphological / Shape Descriptors
 * - 3x3 Spatial Grid Micro-Heterogeneity Features
 */

import { RadiomicsFeatures, RoiCoordinates } from '../types/clinical';
import { PreprocessedResult } from './preprocessing';

export function extractRadiomicsFeatures(
  preprocessed: PreprocessedResult,
  roiCoordinates: RoiCoordinates,
  originalRgbImageData?: ImageData
): RadiomicsFeatures {
  const { width, height, normalizedMatrix, grayMatrix255 } = preprocessed;
  const flatVals: number[] = [];
  const flatNorm: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      flatVals.push(grayMatrix255[y][x]);
      flatNorm.push(normalizedMatrix[y][x]);
    }
  }

  const n = flatVals.length;
  if (n === 0) {
    throw new Error('ROI matrix is empty. Cannot extract radiomics features.');
  }

  // ----------------------------------------------------
  // 1. First-Order Intensity Features
  // ----------------------------------------------------
  flatVals.sort((a, b) => a - b);
  const min = flatVals[0];
  const max = flatVals[n - 1];
  const range = max - min;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    sum += flatVals[i];
    sumSq += flatVals[i] * flatVals[i];
  }
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const stdDev = Math.sqrt(variance);
  const rms = Math.sqrt(sumSq / n);

  const median = n % 2 === 0 ? (flatVals[n / 2 - 1] + flatVals[n / 2]) / 2 : flatVals[Math.floor(n / 2)];
  const p10 = flatVals[Math.floor(n * 0.10)];
  const p25 = flatVals[Math.floor(n * 0.25)];
  const p75 = flatVals[Math.floor(n * 0.75)];
  const p90 = flatVals[Math.floor(n * 0.90)];

  // Higher-order statistical moments: Skewness & Kurtosis
  let m3 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const diff = flatVals[i] - mean;
    const diff2 = diff * diff;
    m3 += diff2 * diff;
    m4 += diff2 * diff2;
  }
  m3 /= n;
  m4 /= n;

  const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;
  const kurtosis = stdDev > 0 ? m4 / Math.pow(stdDev, 4) - 3 : 0; // Excess kurtosis

  // Shannon Entropy and Uniformity/Energy
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) {
    hist[flatVals[i]]++;
  }

  let entropy = 0;
  let energy = 0;
  for (let i = 0; i < 256; i++) {
    if (hist[i] > 0) {
      const p = hist[i] / n;
      entropy -= p * Math.log2(p);
      energy += p * p;
    }
  }

  // ----------------------------------------------------
  // 2. GLCM Texture Features (Gray-Level Co-occurrence Matrix)
  // Quantize to 32 levels for robust statistical density
  // Compute across 4 directional angles: (0°, 45°, 90°, 135°) with distance d=1
  // ----------------------------------------------------
  const numLevels = 32;
  const quantMatrix: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(Math.min(numLevels - 1, Math.floor((grayMatrix255[y][x] / 256) * numLevels)));
    }
    quantMatrix.push(row);
  }

  // Offsets for 4 directions: [dx, dy]
  const directions = [
    [1, 0],   // 0 deg
    [1, 1],   // 45 deg
    [0, 1],   // 90 deg
    [-1, 1],  // 135 deg
  ];

  let totalContrast = 0;
  let totalDissimilarity = 0;
  let totalHomogeneity = 0;
  let totalEnergy = 0;
  let totalCorrelation = 0;
  let totalAsm = 0;
  let totalGlcmEntropy = 0;

  for (const [dx, dy] of directions) {
    // Build normalized symmetric co-occurrence matrix P[i][j]
    const P: number[][] = Array.from({ length: numLevels }, () => new Array(numLevels).fill(0));
    let pairCount = 0;

    for (let y = 0; y < height; y++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;

      for (let x = 0; x < width; x++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;

        const i = quantMatrix[y][x];
        const j = quantMatrix[ny][nx];

        // Symmetric accumulation
        P[i][j] += 1;
        P[j][i] += 1;
        pairCount += 2;
      }
    }

    if (pairCount === 0) continue;

    // Normalize matrix to probabilities
    for (let i = 0; i < numLevels; i++) {
      for (let j = 0; j < numLevels; j++) {
        P[i][j] /= pairCount;
      }
    }

    // Marginal probabilities px, py
    const px = new Array(numLevels).fill(0);
    const py = new Array(numLevels).fill(0);
    for (let i = 0; i < numLevels; i++) {
      for (let j = 0; j < numLevels; j++) {
        px[i] += P[i][j];
        py[j] += P[i][j];
      }
    }

    let meanX = 0, meanY = 0;
    for (let i = 0; i < numLevels; i++) {
      meanX += i * px[i];
      meanY += i * py[i];
    }

    let varX = 0, varY = 0;
    for (let i = 0; i < numLevels; i++) {
      varX += (i - meanX) * (i - meanX) * px[i];
      varY += (i - meanY) * (i - meanY) * py[i];
    }
    const stdX = Math.sqrt(varX);
    const stdY = Math.sqrt(varY);

    // Compute Haralick metrics
    let contrast = 0;
    let dissimilarity = 0;
    let homogeneity = 0;
    let asm = 0;
    let glcmEnt = 0;
    let cov = 0;

    for (let i = 0; i < numLevels; i++) {
      for (let j = 0; j < numLevels; j++) {
        const pVal = P[i][j];
        if (pVal <= 0) continue;

        const diff = Math.abs(i - j);
        contrast += diff * diff * pVal;
        dissimilarity += diff * pVal;
        homogeneity += pVal / (1 + diff);
        asm += pVal * pVal;
        glcmEnt -= pVal * Math.log2(pVal);
        cov += (i - meanX) * (j - meanY) * pVal;
      }
    }

    const correlation = stdX > 0 && stdY > 0 ? cov / (stdX * stdY) : 0;

    totalContrast += contrast;
    totalDissimilarity += dissimilarity;
    totalHomogeneity += homogeneity;
    totalAsm += asm;
    totalEnergy += Math.sqrt(asm);
    totalCorrelation += correlation;
    totalGlcmEntropy += glcmEnt;
  }

  const numDir = directions.length;
  const glcmContrast = totalContrast / numDir;
  const glcmDissimilarity = totalDissimilarity / numDir;
  const glcmHomogeneity = totalHomogeneity / numDir;
  const glcmEnergy = totalEnergy / numDir;
  const glcmCorrelation = totalCorrelation / numDir;
  const glcmAsm = totalAsm / numDir;
  const glcmEntropy = totalGlcmEntropy / numDir;

  // ----------------------------------------------------
  // 3. Morphological & Shape Features
  // ----------------------------------------------------
  const roiArea = width * height;
  const roiPerimeter = 2 * (width + height);
  const roiAspectRatio = width / Math.max(1, height);
  // Compactness: 4 * pi * Area / Perimeter^2
  const roiCompactness = (4 * Math.PI * roiArea) / (roiPerimeter * roiPerimeter);
  const roiExtent = roiArea / (width * height);

  // Edge density using Sobel gradient operator
  let edgeSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -1 * grayMatrix255[y - 1][x - 1] + 1 * grayMatrix255[y - 1][x + 1] +
        -2 * grayMatrix255[y][x - 1]     + 2 * grayMatrix255[y][x + 1] +
        -1 * grayMatrix255[y + 1][x - 1] + 1 * grayMatrix255[y + 1][x + 1];

      const gy =
        -1 * grayMatrix255[y - 1][x - 1] - 2 * grayMatrix255[y - 1][x] - 1 * grayMatrix255[y - 1][x + 1] +
         1 * grayMatrix255[y + 1][x - 1] + 2 * grayMatrix255[y + 1][x] + 1 * grayMatrix255[y + 1][x + 1];

      const grad = Math.sqrt(gx * gx + gy * gy);
      if (grad > 35) edgeSum++;
    }
  }
  const edgeDensity = edgeSum / Math.max(1, (width - 2) * (height - 2));

  // ----------------------------------------------------
  // 4. Local 3x3 Spatial Grid Subdivisions
  // Evaluates microvascular variation across 9 subregions
  // ----------------------------------------------------
  const subMeans: number[] = [];
  const subVars: number[] = [];

  const subW = Math.floor(width / 3);
  const subH = Math.floor(height / 3);

  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      const startX = gx * subW;
      const endX = gx === 2 ? width : (gx + 1) * subW;
      const startY = gy * subH;
      const endY = gy === 2 ? height : (gy + 1) * subH;

      let subSum = 0;
      let subSqSum = 0;
      let count = 0;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const v = grayMatrix255[y][x];
          subSum += v;
          subSqSum += v * v;
          count++;
        }
      }

      const sMean = count > 0 ? subSum / count : mean;
      const sVar = count > 0 ? Math.max(0, subSqSum / count - sMean * sMean) : 0;
      subMeans.push(sMean);
      subVars.push(sVar);
    }
  }

  // Variance among the 9 subgrid means
  let sumGridMean = 0;
  for (const m of subMeans) sumGridMean += m;
  const avgGridMean = sumGridMean / 9;
  let varGridMean = 0;
  for (const m of subMeans) varGridMean += (m - avgGridMean) * (m - avgGridMean);
  const localGridMeanStd = Math.sqrt(varGridMean / 9);

  let sumSubVar = 0;
  for (const v of subVars) sumSubVar += v;
  const localGridVarianceMean = sumSubVar / 9;

  // Center vs peripheral mucosal gradient (center tile index 4 vs border tiles)
  const centerMean = subMeans[4];
  const borderMeans = [subMeans[0], subMeans[1], subMeans[2], subMeans[3], subMeans[5], subMeans[6], subMeans[7], subMeans[8]];
  const avgBorder = borderMeans.reduce((a, b) => a + b, 0) / 8;
  const localErythemaContrast = Math.abs(centerMean - avgBorder);

  // Return clean structured radiomics
  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    range: Number(range.toFixed(2)),
    p10: Number(p10.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    p90: Number(p90.toFixed(2)),
    skewness: Number(skewness.toFixed(3)),
    kurtosis: Number(kurtosis.toFixed(3)),
    entropy: Number(entropy.toFixed(3)),
    energy: Number(energy.toFixed(4)),
    rms: Number(rms.toFixed(2)),

    glcmContrast: Number(glcmContrast.toFixed(3)),
    glcmDissimilarity: Number(glcmDissimilarity.toFixed(3)),
    glcmHomogeneity: Number(glcmHomogeneity.toFixed(3)),
    glcmEnergy: Number(glcmEnergy.toFixed(4)),
    glcmCorrelation: Number(glcmCorrelation.toFixed(3)),
    glcmAsm: Number(glcmAsm.toFixed(4)),
    glcmEntropy: Number(glcmEntropy.toFixed(3)),

    roiArea: Math.round(roiArea),
    roiPerimeter: Math.round(roiPerimeter),
    roiAspectRatio: Number(roiAspectRatio.toFixed(2)),
    roiCompactness: Number(roiCompactness.toFixed(3)),
    roiExtent: Number(roiExtent.toFixed(3)),
    edgeDensity: Number(edgeDensity.toFixed(4)),

    localGridMeanStd: Number(localGridMeanStd.toFixed(2)),
    localGridVarianceMean: Number(localGridVarianceMean.toFixed(2)),
    localErythemaContrast: Number(localErythemaContrast.toFixed(2)),
  };
}
