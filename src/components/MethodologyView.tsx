import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Scale,
  Binary,
} from 'lucide-react';
import { heroOpticUrl } from '../services/demoData';

export const MethodologyView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      {/* Header Banner */}
      <div className="relative border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <img
            src={heroOpticUrl}
            alt="Palpebral Conjunctival Inspection"
            className="w-full h-full object-cover object-center opacity-30 grayscale filter contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
              Clinical Research Protocol & Technical Specification
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-mono mt-0.5">
              CONJUNCTILAB: PALPEBRAL RADIOMICS ARCHITECTURE
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl mt-1 leading-relaxed">
              Smartphone-based non-invasive optical screening for hematological microvascular pallor using computer vision, Gray-Level Co-occurrence Matrices (GLCM), and calibrated machine learning models.
            </p>
          </div>
        </div>
      </div>

      {/* Model Card Section */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-mono uppercase">
            Model Card Specification (v1.0-REV)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed text-zinc-300">
          <div className="space-y-1.5">
            <span className="font-bold text-zinc-100 block uppercase font-mono text-[11px] text-zinc-200">
              1. Intended Clinical Use
            </span>
            <p className="text-zinc-400">
              ConjunctiLab is configured as an <strong>investigational point-of-care screening aid</strong> to prioritize individuals with suspected hemoglobin deficits in settings lacking automated hematology analyzers.
            </p>
            <p className="text-zinc-400">
              The system identifies subjects requiring confirmatory venipuncture Complete Blood Count (CBC) or point-of-care photometry.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-zinc-100 block uppercase font-mono text-[11px] text-amber-400">
              2. Explicit Out-of-Scope Use
            </span>
            <p className="text-zinc-400 font-medium">
              The system is strictly NOT intended for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Definitive clinical diagnosis of anemia.</li>
              <li>Replacing diagnostic laboratory blood tests (CBC, serum ferritin, Hb electrophoresis).</li>
              <li>Directing blood transfusion thresholds or medical dosing.</li>
              <li>Acute surgical trauma or critical care emergency monitoring.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-zinc-100 block uppercase font-mono text-[11px] text-zinc-200">
              3. Machine Learning Architecture
            </span>
            <p className="text-zinc-400">
              The primary classifier is an <strong>XGBoost Gradient-Boosted Decision Tree</strong> ensemble fitted on an interpretable 32-dimensional engineered radiomics space:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>16 First-order intensity statistics (Luma mean, variance, entropy, kurtosis, percentiles).</li>
              <li>7 Directional GLCM texture descriptors (Homogeneity, contrast, correlation, ASM).</li>
              <li>6 Morphological region descriptors (Area, perimeter, compactness, edge density).</li>
              <li>3 Local 3×3 spatial subdivisions for trans-mucosal capillary gradients.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-zinc-100 block uppercase font-mono text-[11px] text-zinc-200">
              4. Probability Calibration & Uncertainty
            </span>
            <p className="text-zinc-400">
              Raw classifier margins are calibrated via <strong>Platt Sigmoid scaling</strong> to produce empirical posterior probabilities evaluated against Brier score loss.
            </p>
            <p className="text-zinc-400">
              Uncertainty is evaluated through decision boundary distance and 95% Wilson confidence intervals, flagging borderline cases for retake or clinical referral.
            </p>
          </div>
        </div>
      </div>

      {/* Biological Confounders & Known Limitations */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-mono uppercase">
            Biological Confounders & Physiological Constraints (Section 48)
          </h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          Palpebral conjunctival microvascular appearance reflects local tissue hemodynamics and can be modulated by physiological confounders:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-zinc-950 border border-zinc-800 text-xs space-y-1">
            <span className="font-mono text-zinc-200 font-bold block uppercase text-[11px]">
              Ocular Pathology
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Allergic conjunctivitis, dry eye, pterygium, and subconjunctival hemorrhage induce reactive hyperemia that can mask systemic anemia.
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 text-xs space-y-1">
            <span className="font-mono text-zinc-200 font-bold block uppercase text-[11px]">
              Systemic Vasomotion
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Severe hypothermia and dehydration trigger peripheral vasoconstriction, blanching mucosal beds in non-anemic individuals.
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 text-xs space-y-1">
            <span className="font-mono text-zinc-200 font-bold block uppercase text-[11px]">
              Camera ISP Variation
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Proprietary smartphone ISP white-balance algorithms and non-linear tone curves introduce optical variability across handset manufacturers.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy & Client-Side Execution */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
          <ShieldCheck className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-mono uppercase">
            Privacy & Offline Computation (Sections 32 & 33)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400 leading-relaxed font-sans">
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 space-y-1.5">
            <span className="font-mono font-bold text-zinc-200 block text-[11px] uppercase flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              100% Client-Side Private Inference
            </span>
            <p>
              In full compliance with patient privacy safeguards, ocular images are processed entirely in local browser memory via HTML5 Canvas.
            </p>
            <p className="text-zinc-500">
              No ocular photographs are transmitted or stored on cloud servers during routine screening.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800 space-y-1.5">
            <span className="font-mono font-bold text-zinc-200 block text-[11px] uppercase flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-zinc-400" />
              Subject-Level Partition Quarantine
            </span>
            <p>
              All cross-validation and benchmark splits enforce strict Stratified Group K-Fold isolation. Multiple captures from the same subject are never split across train and test folds.
            </p>
            <p className="text-zinc-500">
              Prevents patient-level identity leakage and ensures clinically valid generalization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
