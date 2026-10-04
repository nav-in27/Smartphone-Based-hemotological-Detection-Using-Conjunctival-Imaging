import React from 'react';
import { ImageQualityMetrics } from '../types/clinical';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface QualityReportProps {
  metrics: ImageQualityMetrics;
  onProceedAnyway?: () => void;
  allowBypass?: boolean;
}

export const QualityReport: React.FC<QualityReportProps> = ({
  metrics,
  onProceedAnyway,
  allowBypass = false,
}) => {
  const isRejected = metrics.qualityGrade === 'reject';

  const statusText = {
    excellent: 'PASS — DIAGNOSTIC GRADE',
    good: 'PASS — SUITABLE FOR EXTRACTION',
    acceptable: 'PASS — MARGINAL QUALITY',
    reject: 'REJECT — RETAKE REQUIRED',
  }[metrics.qualityGrade];

  const statusColor = {
    excellent: 'text-emerald-400 border-l-4 border-l-emerald-500',
    good: 'text-zinc-200 border-l-4 border-l-emerald-600',
    acceptable: 'text-amber-400 border-l-4 border-l-amber-500',
    reject: 'text-rose-400 border-l-4 border-l-rose-500',
  }[metrics.qualityGrade];

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Primary Status Banner */}
      <div className={`p-4 bg-zinc-900 border border-zinc-800 ${statusColor} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div>
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Image Quality Verification · QA Engine v1.0
          </div>
          <div className="text-base font-bold text-zinc-100 font-mono mt-0.5 flex items-center gap-2">
            {isRejected ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{statusText}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            {isRejected
              ? 'Calculated photographic parameters fail quality criteria for mucosal feature extraction. Proceeding would introduce significant measurement noise.'
              : 'Photographic resolution, dynamic exposure, and Laplacian sharpness variance conform to the standardized acquisition protocol.'}
          </p>
        </div>

        <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {metrics.totalQualityScore}
            <span className="text-xs font-normal text-zinc-400">/100</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase">IQA Index</div>
        </div>
      </div>

      {/* Rejection / Warning Audit Details */}
      {isRejected && (
        <div className="p-4 bg-zinc-900/90 border border-rose-900/80 text-xs text-zinc-300 space-y-2.5">
          <div className="flex items-center gap-2 font-mono text-rose-400 font-semibold uppercase text-[11px]">
            <AlertTriangle className="w-4 h-4" />
            Criteria Failures Detected
          </div>
          <ul className="list-disc list-inside space-y-1 text-zinc-300 font-mono text-[11px]">
            {metrics.rejectionReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          <div className="pt-2 border-t border-zinc-800">
            <span className="text-[11px] font-mono text-zinc-400 block mb-1">
              Corrective Actions for Retake:
            </span>
            <ul className="list-disc list-inside space-y-1 text-zinc-300 text-xs">
              {metrics.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {allowBypass && onProceedAnyway && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onProceedAnyway}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                [Dev Override: Force Radiomics Extraction]
              </button>
            </div>
          )}
        </div>
      )}

      {/* Metrics Data Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">Resolution</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block truncate">
            {metrics.resolutionWidth} × {metrics.resolutionHeight}
          </span>
          <span className={`text-[10px] ${metrics.isResolutionSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.isResolutionSufficient ? 'PASS (≥400x300)' : 'FAIL (<400x300)'}
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">Sharpness (Laplacian)</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block">
            {metrics.sharpnessScore} / 100
          </span>
          <span className="text-[10px] text-zinc-400">
            Blur: {metrics.blurScore}%
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">Exposure Score</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block">
            {metrics.exposureScore} / 100
          </span>
          <span className="text-[10px] text-zinc-400 truncate block">
            Clip: {metrics.overexposedPercent}%
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">RMS Contrast</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block">
            {metrics.contrastScore} / 100
          </span>
          <span className="text-[10px] text-zinc-400">
            Dynamic range OK
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">Anti-Glare Index</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block">
            {metrics.glareScore} / 100
          </span>
          <span className="text-[10px] text-zinc-400">
            Specularity check
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 font-mono">
          <span className="text-[10px] text-zinc-400 uppercase block">Erythema Bed</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 block">
            {metrics.conjunctivaVisibilityScore} / 100
          </span>
          <span className="text-[10px] text-zinc-400">
            Microvascular tissue
          </span>
        </div>
      </div>
    </div>
  );
};
