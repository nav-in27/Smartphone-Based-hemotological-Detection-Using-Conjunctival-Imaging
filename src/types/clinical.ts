/**
 * ConjunctiAI - Core Clinical and Computer Vision Type Definitions
 */

export type RiskLevel = 'low' | 'moderate' | 'high';

export type UncertaintyLevel = 'low' | 'moderate' | 'high';

export interface ImageQualityMetrics {
  resolutionWidth: number;
  resolutionHeight: number;
  isResolutionSufficient: boolean;
  sharpnessScore: number; // Laplacian variance normalized (0-100)
  blurScore: number; // 0-100 (higher = more blur)
  exposureScore: number; // 0-100 (optimal around 50)
  overexposedPercent: number; // % pixels > 245
  underexposedPercent: number; // % pixels < 20
  contrastScore: number; // RMS contrast normalized (0-100)
  glareScore: number; // Specular highlights % (0-100)
  conjunctivaVisibilityScore: number; // Erythema / vascular color presence (0-100)
  totalQualityScore: number; // 0 - 100
  qualityGrade: 'excellent' | 'good' | 'acceptable' | 'reject';
  rejectionReasons: string[];
  recommendations: string[];
}

export interface RoiCoordinates {
  x: number; // normalized (0-1) or pixel
  y: number;
  width: number;
  height: number;
  confidence: number;
  manualAdjusted?: boolean;
  polygonPoints?: [number, number][]; // optional polygon for refined palpebral contour
}

export interface RadiomicsFeatures {
  // Intensity statistics (16 features)
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  skewness: number;
  kurtosis: number;
  entropy: number;
  energy: number;
  rms: number;

  // Texture GLCM features (averaged across 0, 45, 90, 135 deg)
  glcmContrast: number;
  glcmDissimilarity: number;
  glcmHomogeneity: number;
  glcmEnergy: number;
  glcmCorrelation: number;
  glcmAsm: number;
  glcmEntropy: number;

  // Morphological / Shape features
  roiArea: number;
  roiPerimeter: number;
  roiAspectRatio: number;
  roiCompactness: number;
  roiExtent: number;
  edgeDensity: number;

  // Local spatial subdivision (3x3 grid)
  localGridMeanStd: number; // variance among 9 local subgrid means
  localGridVarianceMean: number; // average of local subgrid variances
  localErythemaContrast: number; // center vs peripheral mucosal vascular gradient

  // Raw dictionary for ML models
  [key: string]: number;
}

export interface ShapContribution {
  featureName: string;
  featureDisplayName: string;
  featureValue: number;
  contribution: number; // positive = pushes toward anemia, negative = pushes toward normal
}

export interface ModelPrediction {
  riskLevel: RiskLevel;
  rawProbability: number;
  calibratedProbability: number;
  modelConfidence: number; // 0 - 100%
  uncertaintyLevel: UncertaintyLevel;
  uncertaintyMargin: number;
  confidenceInterval95: [number, number]; // [lower, upper]
  modelUsed: string;
  shapContributions: ShapContribution[];
  recommendation: string;
  disclaimer: string;
  isDemoMode: boolean;
  timestamp: string;
}

export interface PatientRecord {
  patientId: string;
  imageId: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  isPregnant?: boolean;
  hemoglobinGdl: number;
  anemiaLabel: 0 | 1; // 0 = Normal, 1 = Anemia
  imagePath?: string;
  lightingCondition: 'natural_daylight' | 'bright_indoor' | 'dim_indoor' | 'artificial_lamp';
  deviceModel: string;
  deviceManufacturer: string;
  qualityScore: number;
  extractedFeatures?: RadiomicsFeatures;
}

export interface EvaluationMetrics {
  accuracy: number;
  balancedAccuracy: number;
  sensitivity: number; // recall for anemia
  specificity: number; // true negative rate
  precision: number;
  f1Score: number;
  rocAuc: number;
  prAuc: number;
  mcc: number; // Matthews Correlation Coefficient
  brierScore: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
  prCurve: { precision: number; recall: number; threshold: number }[];
  calibrationCurve: { meanPredicted: number; observedFrequency: number; count: number }[];
}

export interface DemographicFairnessMetric {
  groupName: string;
  groupType: 'sex' | 'age' | 'device' | 'lighting';
  sampleCount: number;
  prevalence: number;
  sensitivity: number;
  specificity: number;
  rocAuc: number;
  disparityFlag: boolean;
}

export interface AblationResult {
  experimentId: string;
  name: string;
  featuresUsed: string;
  preprocessing: string;
  model: string;
  sensitivity: number;
  specificity: number;
  f1: number;
  rocAuc: number;
  prAuc: number;
  brierScore: number;
}
