import React, { useState } from 'react';
import { ModelPrediction, RadiomicsFeatures, ImageQualityMetrics } from '../types/clinical';
import { FEATURE_DISPLAY_NAMES } from '../services/mlEngine';
import {
  Printer,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart2,
} from 'lucide-react';

interface PredictionResultProps {
  prediction: ModelPrediction;
  features: RadiomicsFeatures;
  qualityMetrics: ImageQualityMetrics;
  roiThumbnailUrl?: string;
  onReset: () => void;
  onOpenResearchDashboard: () => void;
}

export const PredictionResult: React.FC<PredictionResultProps> = ({
  prediction,
  features,
  qualityMetrics,
  roiThumbnailUrl,
  onReset,
  onOpenResearchDashboard,
}) => {
  const [showAllFeatures, setShowAllFeatures] = useState<boolean>(false);

  const riskVisuals = {
    low: {
      label: 'LOW ANEMIA RISK',
      color: 'text-emerald-400',
      borderLeft: 'border-l-4 border-l-emerald-500',
      badge: 'border border-emerald-700/80 text-emerald-400 font-mono',
      icon: CheckCircle2,
    },
    moderate: {
      label: 'MODERATE ANEMIA RISK',
      color: 'text-amber-400',
      borderLeft: 'border-l-4 border-l-amber-500',
      badge: 'border border-amber-700/80 text-amber-400 font-mono',
      icon: AlertTriangle,
    },
    high: {
      label: 'HIGH ANEMIA RISK',
      color: 'text-rose-400',
      borderLeft: 'border-l-4 border-l-rose-500',
      badge: 'border border-rose-700/80 text-rose-400 font-mono',
      icon: AlertCircle,
    },
  }[prediction.riskLevel];

  const RiskIcon = riskVisuals.icon;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(
        {
          screeningReport: prediction,
          radiomicsFeatureVector: features,
          imageQualityAssessment: qualityMetrics,
          metadata: {
            timestamp: prediction.timestamp,
            version: 'ConjunctiLab-v1.0',
            standard: 'WHO-Palpebral-Observational',
          },
        },
        null,
        2
      )
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hematology_screening_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16 font-sans">
      {/* Top Clinical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span>Clinical Screening Examination</span>
            <span>·</span>
            <span>ID: {new Date(prediction.timestamp).getTime().toString().slice(-8)}</span>
            <span>·</span>
            <span>{new Date(prediction.timestamp).toLocaleDateString()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-mono mt-0.5">
            CONJUNCTIVAL MICROVASCULAR TRIAGE REPORT
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Classifier: {prediction.modelUsed} · Calibration: Platt Sigmoid
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold transition-colors cursor-pointer rounded-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-950" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Main Diagnostic Findings Console */}
      <div className={`p-5 bg-zinc-900 border border-zinc-800 ${riskVisuals.borderLeft} space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <RiskIcon className={`w-6 h-6 ${riskVisuals.color} shrink-0`} />
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 block tracking-wider">
                  Screening Risk Determination
                </span>
                <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${riskVisuals.color}`}>
                  {riskVisuals.label}
                </div>
              </div>
            </div>

            {/* Recommendation block */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
              <span className="font-semibold text-zinc-100 block mb-0.5 font-mono text-[11px] uppercase">
                Clinical Recommendation:
              </span>
              {prediction.recommendation}
            </div>
          </div>

          {/* Structured Telemetry Numbers */}
          <div className="grid grid-cols-2 gap-2 min-w-[280px] font-mono text-xs shrink-0">
            <div className="p-2.5 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase block">Calibrated Risk</span>
              <span className="text-xl font-bold text-zinc-100 block mt-0.5">
                {Math.round(prediction.calibratedProbability * 100)}%
              </span>
              <span className="text-[10px] text-zinc-400">Raw logit: {Math.round(prediction.rawProbability * 100)}%</span>
            </div>

            <div className="p-2.5 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase block">Model Confidence</span>
              <span className="text-xl font-bold text-zinc-100 block mt-0.5">
                {prediction.modelConfidence}%
              </span>
              <span className="text-[10px] text-zinc-400">Decision margin</span>
            </div>

            <div className="p-2.5 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase block">Uncertainty</span>
              <span className="text-xs font-bold text-zinc-200 block uppercase mt-1">
                {prediction.uncertaintyLevel}
              </span>
              <span className="text-[10px] text-zinc-400">95% CI [{Math.round(prediction.confidenceInterval95[0] * 100)}%–{Math.round(prediction.confidenceInterval95[1] * 100)}%]</span>
            </div>

            <div className="p-2.5 bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase block">Input Quality</span>
              <span className="text-xl font-bold text-zinc-100 block mt-0.5">
                {qualityMetrics.totalQualityScore}/100
              </span>
              <span className="text-[10px] text-zinc-400 uppercase">{qualityMetrics.qualityGrade}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex flex-col sm:flex-row justify-between gap-1">
          <span>* Risk Thresholds: Low &lt;35% · Moderate 35%–65% · High ≥65% (Observational prototype parameters)</span>
          <span className="text-zinc-500">Method: XGBoost GBDT + Platt Calibrator</span>
        </div>
      </div>

      {/* Mandatory Non-Diagnosis Protocol Statement */}
      <div className="p-3.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-zinc-200 block font-mono text-[11px] uppercase">
            Investigational Notice & Clinical Safety Policy
          </span>
          <p className="leading-relaxed">
            {prediction.disclaimer}
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            Biological confounders including allergic conjunctival hyperemia, surface inflammation, ambient temperature vasoconstriction, or tear film reflections can modulate optical readings.
          </p>
        </div>
      </div>

      {/* Explainable AI: Biomarker Contribution Weights */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide">
              Biomarker Contribution Analysis (SHAP Feature Weighting)
            </h3>
            <p className="text-xs text-zinc-400">
              Relative statistical push of each radiomics feature toward normal (negative) or anemic (positive) classification.
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 italic">
            Statistical association, not clinical etiology
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {prediction.shapContributions.map((shap, idx) => {
            const isAnemic = shap.contribution > 0;
            const magnitude = Math.min(100, Math.abs(shap.contribution) * 220);

            return (
              <div
                key={idx}
                className="p-2 bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs"
              >
                <div className="sm:w-2/5">
                  <div className="font-sans font-semibold text-zinc-200 text-xs truncate">
                    {shap.featureDisplayName}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Observed: {shap.featureValue} · Feature: {shap.featureName}
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  <div className="w-full bg-zinc-900 h-2 overflow-hidden flex border border-zinc-800">
                    {isAnemic ? (
                      <div
                        style={{ width: `${magnitude}%` }}
                        className="h-full bg-rose-500 ml-auto"
                      />
                    ) : (
                      <div
                        style={{ width: `${magnitude}%` }}
                        className="h-full bg-emerald-500 mr-auto"
                      />
                    )}
                  </div>

                  <span
                    className={`font-mono text-xs w-16 text-right shrink-0 font-bold ${
                      isAnemic ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {shap.contribution > 0 ? `+${shap.contribution}` : shap.contribution}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Matrix Inspection */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 font-mono uppercase">
            Extracted Feature Vector (32 Biomarkers)
          </span>
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <span>{showAllFeatures ? '[COLLAPSE]' : '[EXPAND 32 FEATURES]'}</span>
            {showAllFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showAllFeatures && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-zinc-800">
            {Object.entries(features).map(([k, v]) => (
              <div key={k} className="p-2 bg-zinc-950 border border-zinc-800/80 font-mono">
                <span className="text-[10px] text-zinc-500 block truncate">
                  {FEATURE_DISPLAY_NAMES[k] || k}
                </span>
                <span className="text-xs font-bold text-zinc-300 mt-0.5 block">
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom link to Validation Telemetry */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
        <span>Cross-validation ROC curves, fairness audits, and ablation matrix available in validation console.</span>
        <button
          onClick={onOpenResearchDashboard}
          className="text-zinc-200 hover:text-white underline underline-offset-4 cursor-pointer"
        >
          View Validation Console &rarr;
        </button>
      </div>
    </div>
  );
};
