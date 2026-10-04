import React from 'react';
import { AlertCircle, FileCheck2 } from 'lucide-react';

interface DisclaimerBannerProps {
  isDemoMode: boolean;
  onToggleDemoMode?: () => void;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  isDemoMode,
  onToggleDemoMode,
}) => {
  return (
    <aside aria-label="Clinical Protocol Status" className="bg-zinc-950 border-b border-zinc-800/90 text-xs text-zinc-300 py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-zinc-300">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-zinc-200">Investigational Protocol:</span>
          <span className="text-zinc-400">
            Screening prototype for observational research. Non-diagnostic. Confirm abnormal results via venous blood draw (CBC / Hemoglobin).
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
          <span className="text-zinc-500">Mode:</span>
          {isDemoMode ? (
            <span className="text-amber-400 font-semibold tracking-wide">
              SYNTHETIC_EVAL_BENCHMARK
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold tracking-wide flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5" />
              CLINICAL_COHORT_ACTIVE
            </span>
          )}

          <span className="text-zinc-700">|</span>

          {onToggleDemoMode && (
            <button
              onClick={onToggleDemoMode}
              className="text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Toggle {isDemoMode ? 'Cohort Mode' : 'Synthetic Mode'}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
