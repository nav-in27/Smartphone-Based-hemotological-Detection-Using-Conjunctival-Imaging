import React, { useState } from 'react';
import {
  EvaluationMetrics,
  PatientRecord,
  DemographicFairnessMetric,
} from '../types/clinical';
import {
  BarChart2,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface ResearchDashboardProps {
  records: PatientRecord[];
  evaluation: EvaluationMetrics;
  fairnessMetrics: DemographicFairnessMetric[];
  isDemoMode: boolean;
  onNavigateToModels: () => void;
  onNavigateToDataset: () => void;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({
  records,
  evaluation,
  fairnessMetrics,
  isDemoMode,
  onNavigateToModels,
  onNavigateToDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'curves' | 'fairness' | 'errors'>('overview');

  const totalRecords = records.length;
  const uniquePatients = new Set(records.map((r) => r.patientId)).size;
  const anemiaCount = records.filter((r) => r.anemiaLabel === 1).length;
  const prevalence = totalRecords > 0 ? (anemiaCount / totalRecords) * 100 : 0;
  const avgQuality = totalRecords > 0
    ? Math.round(records.reduce((a, b) => a + b.qualityScore, 0) / totalRecords)
    : 0;

  const validImages = records.filter((r) => r.qualityScore >= 60).length;
  const rejectedImages = totalRecords - validImages;

  // Render ROC Curve SVG
  const renderRocSvg = () => {
    const width = 360;
    const height = 260;
    const padding = 36;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const points = evaluation.rocCurve.map((pt) => {
      const x = padding + pt.fpr * innerW;
      const y = padding + (1 - pt.tpr) * innerH;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[380px] bg-zinc-950 border border-zinc-800">
        <rect x={padding} y={padding} width={innerW} height={innerH} fill="#09090b" stroke="#27272a" strokeWidth="1" />
        
        {/* Diagonal random chance line */}
        <line
          x1={padding}
          y1={padding + innerH}
          x2={padding + innerW}
          y2={padding}
          stroke="#3f3f46"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        {/* ROC curve */}
        <polyline
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          points={points}
        />

        <text x={width / 2} y={height - 8} fill="#a1a1aa" fontSize="10" textAnchor="middle" fontFamily="monospace">
          False Positive Rate (1 - Spec)
        </text>
        <text
          x={12}
          y={height / 2}
          fill="#a1a1aa"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          fontFamily="monospace"
        >
          True Positive Rate (Sens)
        </text>

        <text x={padding + 8} y={padding + 18} fill="#f43f5e" fontSize="11" fontWeight="bold" fontFamily="monospace">
          ROC-AUC = {evaluation.rocAuc.toFixed(3)}
        </text>
      </svg>
    );
  };

  // Render PR Curve SVG
  const renderPrSvg = () => {
    const width = 360;
    const height = 260;
    const padding = 36;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const points = evaluation.prCurve.map((pt) => {
      const x = padding + pt.recall * innerW;
      const y = padding + (1 - pt.precision) * innerH;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[380px] bg-zinc-950 border border-zinc-800">
        <rect x={padding} y={padding} width={innerW} height={innerH} fill="#09090b" stroke="#27272a" strokeWidth="1" />
        
        <line
          x1={padding}
          y1={padding + (1 - prevalence / 100) * innerH}
          x2={padding + innerW}
          y2={padding + (1 - prevalence / 100) * innerH}
          stroke="#3f3f46"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        <polyline
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          points={points}
        />

        <text x={width / 2} y={height - 8} fill="#a1a1aa" fontSize="10" textAnchor="middle" fontFamily="monospace">
          Recall (Sensitivity)
        </text>
        <text
          x={12}
          y={height / 2}
          fill="#a1a1aa"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          fontFamily="monospace"
        >
          Precision (PPV)
        </text>

        <text x={padding + 8} y={padding + 18} fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
          PR-AUC = {evaluation.prAuc.toFixed(3)}
        </text>
      </svg>
    );
  };

  // Render Calibration Diagram
  const renderCalibrationSvg = () => {
    const width = 360;
    const height = 260;
    const padding = 36;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[380px] bg-zinc-950 border border-zinc-800">
        <rect x={padding} y={padding} width={innerW} height={innerH} fill="#09090b" stroke="#27272a" strokeWidth="1" />
        
        <line
          x1={padding}
          y1={padding + innerH}
          x2={padding + innerW}
          y2={padding}
          stroke="#10b981"
          strokeDasharray="3 3"
          strokeWidth="1"
        />

        {evaluation.calibrationCurve.map((bin, idx) => {
          if (bin.count === 0) return null;
          const cx = padding + bin.meanPredicted * innerW;
          const cy = padding + (1 - bin.observedFrequency) * innerH;

          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            </g>
          );
        })}

        <text x={width / 2} y={height - 8} fill="#a1a1aa" fontSize="10" textAnchor="middle" fontFamily="monospace">
          Mean Predicted Risk
        </text>
        <text
          x={12}
          y={height / 2}
          fill="#a1a1aa"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          fontFamily="monospace"
        >
          Observed Anemia Proportion
        </text>

        <text x={padding + 8} y={padding + 18} fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="monospace">
          Brier Loss = {evaluation.brierScore.toFixed(3)}
        </text>
      </svg>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span>Clinical Validation Console</span>
            <span>·</span>
            <span>5-Fold Stratified Group CV</span>
            <span>·</span>
            <span className="text-zinc-500">Zero Patient Leakage</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-mono mt-0.5">
            DIAGNOSTIC DISCRIMINATION & VALIDATION METRICS
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Subject-isolated out-of-fold evaluations against laboratory reference hemoglobin.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={onNavigateToModels}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ablation Suite</span>
          </button>
          <button
            onClick={onNavigateToDataset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dataset Cohort</span>
          </button>
        </div>
      </div>

      {/* High-level telemetry row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">Total Scans</span>
          <span className="text-lg font-bold text-zinc-100 mt-0.5 block">{totalRecords}</span>
          <span className="text-[10px] text-zinc-400">{uniquePatients} unique subjects</span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">Valid / Rejected</span>
          <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{validImages}</span>
          <span className="text-[10px] text-rose-400">{rejectedImages} flagged by QA</span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">Anemia Prevalence</span>
          <span className="text-lg font-bold text-zinc-100 mt-0.5 block">{prevalence.toFixed(1)}%</span>
          <span className="text-[10px] text-zinc-400">{anemiaCount} positive</span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">Mean Quality Index</span>
          <span className="text-lg font-bold text-zinc-100 mt-0.5 block">{avgQuality}/100</span>
          <span className="text-[10px] text-zinc-400">Laplacian & exposure</span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">CV Sensitivity</span>
          <span className="text-lg font-bold text-rose-400 mt-0.5 block">
            {(evaluation.sensitivity * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-400">Recall for anemia</span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase block">CV Specificity</span>
          <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
            {(evaluation.specificity * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-400">True negative rate</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Primary Metrics & Confusion Matrix' },
          { id: 'curves', label: 'ROC, PR & Calibration Diagrams' },
          { id: 'fairness', label: 'Demographic Fairness Audit' },
          { id: 'errors', label: 'Error Analysis (FP / FN)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-mono transition-colors cursor-pointer border-b-2 ${
              activeTab === tab.id
                ? 'border-rose-500 text-zinc-100 font-semibold bg-zinc-900/60'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Confusion Matrix */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-4 bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-100 font-mono uppercase">
                Cross-Validated Diagnostic Metrics (Group K-Fold)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Operating Threshold: 0.50
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">ROC-AUC</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">{evaluation.rocAuc.toFixed(3)}</span>
                <span className="text-[10px] text-zinc-400">Discrimination</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">PR-AUC</span>
                <span className="text-base font-bold text-sky-400 mt-0.5 block">{evaluation.prAuc.toFixed(3)}</span>
                <span className="text-[10px] text-zinc-400">Precision-Recall</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">F1-Score</span>
                <span className="text-base font-bold text-zinc-100 mt-0.5 block">{evaluation.f1Score.toFixed(3)}</span>
                <span className="text-[10px] text-zinc-400">Harmonic mean</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Brier Score</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">{evaluation.brierScore.toFixed(3)}</span>
                <span className="text-[10px] text-zinc-400">Calibration loss</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Sensitivity</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">{(evaluation.sensitivity * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-400">True Positive</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Specificity</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">{(evaluation.specificity * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-400">True Negative</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Precision (PPV)</span>
                <span className="text-base font-bold text-zinc-100 mt-0.5 block">{(evaluation.precision * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-400">Positive predictive</span>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">Matthews (MCC)</span>
                <span className="text-base font-bold text-zinc-100 mt-0.5 block">{evaluation.mcc.toFixed(3)}</span>
                <span className="text-[10px] text-zinc-400">Correlation coeff</span>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 font-mono leading-relaxed">
              <strong>Clinical Rationale:</strong> Population screening tools prioritize sensitivity to ensure patients with active hemoglobin deficits are not overlooked. False positives can be clarified with routine confirmatory venipuncture CBC.
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
            <span className="text-xs font-bold text-zinc-100 uppercase block border-b border-zinc-800 pb-2">
              Confusion Matrix (Out-of-Fold)
            </span>

            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-3 bg-zinc-950 border border-emerald-900/60">
                <span className="text-[10px] text-emerald-400 uppercase block">True Positives (TP)</span>
                <span className="text-xl font-bold text-zinc-100 mt-1 block">
                  {evaluation.confusionMatrix.truePositive}
                </span>
                <span className="text-[10px] text-zinc-400">Correct Anemia Screen</span>
              </div>

              <div className="p-3 bg-zinc-950 border border-amber-900/60">
                <span className="text-[10px] text-amber-400 uppercase block">False Positives (FP)</span>
                <span className="text-xl font-bold text-zinc-100 mt-1 block">
                  {evaluation.confusionMatrix.falsePositive}
                </span>
                <span className="text-[10px] text-zinc-400">Normal screened Anemic</span>
              </div>

              <div className="p-3 bg-zinc-950 border border-rose-900/60">
                <span className="text-[10px] text-rose-400 uppercase block">False Negatives (FN)</span>
                <span className="text-xl font-bold text-zinc-100 mt-1 block">
                  {evaluation.confusionMatrix.falseNegative}
                </span>
                <span className="text-[10px] text-zinc-400">Missed Anemia</span>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase block">True Negatives (TN)</span>
                <span className="text-xl font-bold text-zinc-100 mt-1 block">
                  {evaluation.confusionMatrix.trueNegative}
                </span>
                <span className="text-[10px] text-zinc-400">Correct Normal Screen</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 text-center">
              Sample Cohort Size: {totalRecords} Records
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ROC, PR & Calibration Diagrams */}
      {activeTab === 'curves' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2 flex flex-col items-center">
            <div className="w-full text-left font-mono">
              <span className="text-xs font-bold text-zinc-200 uppercase block">Receiver Operating Characteristic</span>
              <span className="text-[10px] text-zinc-400">TPR vs FPR across decision thresholds</span>
            </div>
            {renderRocSvg()}
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2 flex flex-col items-center">
            <div className="w-full text-left font-mono">
              <span className="text-xs font-bold text-zinc-200 uppercase block">Precision-Recall Curve</span>
              <span className="text-[10px] text-zinc-400">Precision vs clinical sensitivity</span>
            </div>
            {renderPrSvg()}
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2 flex flex-col items-center">
            <div className="w-full text-left font-mono">
              <span className="text-xs font-bold text-zinc-200 uppercase block">Calibration Reliability</span>
              <span className="text-[10px] text-zinc-400">Mean predicted vs empirical frequency</span>
            </div>
            {renderCalibrationSvg()}
          </div>
        </div>
      )}

      {/* Tab 3: Demographic Fairness & Subgroups */}
      {activeTab === 'fairness' && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-zinc-100 uppercase block">
              Subgroup Performance Disparity Audit
            </span>
            <span className="text-xs text-zinc-400">
              Evaluates sensitivity and specificity across demographics, camera manufacturers, and ambient illumination.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[10px]">
                  <th className="pb-2">Subgroup</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Samples</th>
                  <th className="pb-2">Prevalence</th>
                  <th className="pb-2">Sensitivity</th>
                  <th className="pb-2">Specificity</th>
                  <th className="pb-2">ROC-AUC</th>
                  <th className="pb-2 text-right">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {fairnessMetrics.map((fm, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40">
                    <td className="py-2 text-zinc-100">{fm.groupName}</td>
                    <td className="py-2 text-zinc-400 text-[10px]">{fm.groupType.toUpperCase()}</td>
                    <td className="py-2">{fm.sampleCount}</td>
                    <td className="py-2">{(fm.prevalence * 100).toFixed(0)}%</td>
                    <td className="py-2 text-rose-400">{(fm.sensitivity * 100).toFixed(1)}%</td>
                    <td className="py-2 text-emerald-400">{(fm.specificity * 100).toFixed(1)}%</td>
                    <td className="py-2 font-bold">{fm.rocAuc.toFixed(3)}</td>
                    <td className="py-2 text-right">
                      {fm.disparityFlag ? (
                        <span className="text-[10px] text-amber-400 border border-amber-800 px-1 py-0.2">
                          DISPARITY_FLAG
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 border border-emerald-800 px-1 py-0.2">
                          BALANCED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Error Analysis */}
      {activeTab === 'errors' && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-zinc-100 uppercase block">
              Error Analysis & Outlier Classification
            </span>
            <span className="text-xs text-zinc-400 font-sans">
              Investigational review of cases where optical predictions diverged from laboratory hemoglobin assays.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
            <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="font-mono text-xs font-bold text-rose-400 block uppercase">
                False Negative Contributing Factors
              </span>
              <ul className="list-disc list-inside text-zinc-400 space-y-1 text-xs">
                <li>Reactive hyperemia (allergic / dry eye irritation) causing local microvascular erythema.</li>
                <li>Incomplete eversion of lower eyelid leading to capture of peripheral vascularized skin margins.</li>
                <li>Corneal specular reflections artificially inflating local contrast.</li>
              </ul>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="font-mono text-xs font-bold text-amber-400 block uppercase">
                False Positive Contributing Factors
              </span>
              <ul className="list-disc list-inside text-zinc-400 space-y-1 text-xs">
                <li>Overexposed capture washing out microvascular bed luma.</li>
                <li>Peripheral vasoconstriction in cold environment simulating pallor in healthy subjects.</li>
                <li>Shadows cast by ocular brow ridge across the palpebral sulcus.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
