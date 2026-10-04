# ConjunctiAI — Smartphone-Based Anemia Screening Using Conjunctival Imaging

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status: Research MVP](https://img.shields.io/badge/Status-Research%20MVP-rose.svg)](#)
[![Validation: Zero Patient Leakage](https://img.shields.io/badge/Integrity-Zero%20Patient%20Leakage-emerald.svg)](#)

> **Important Clinical Research Notice**: ConjunctiAI is an investigational AI-assisted screening prototype and is **NOT a medical diagnosis**. It does not replace laboratory testing. Confirm abnormal results using a clinically validated hemoglobin test or Complete Blood Count (CBC).

---

## 1. Executive Summary

**ConjunctiAI** is an open-source, research-grade computer vision system designed to estimate anemia risk by analyzing the microvascular erythema of the **lower palpebral conjunctiva** (inner lower eyelid) captured using a standard smartphone camera.

Unlike black-box deep learning architectures, ConjunctiAI combines an interpretable **32-dimensional radiomics extraction engine** (intensity statistics, directional GLCM texture matrices, morphology, and 3x3 local grid gradients) with **calibrated machine learning classifiers** (XGBoost, Random Forest, SVM, Logistic Regression), **Platt Sigmoid probability calibration**, and **uncertainty quantification**.

---

## 2. End-to-End Clinical Pipeline

```
Smartphone Camera / Image Upload
               ↓
    Image Quality Assessment (IQA)
    [Sharpness, Blur, Exposure, Glare, Erythema Bed]
               ↓
    Conjunctiva Detection & ROI Localization
    [Automated Heuristic + Interactive Manual Refinement]
               ↓
    Preprocessing Pipelines (Comparison)
    ├─ Pipeline A: Raw Standardized Grayscale
    └─ Pipeline B: Enhanced (CLAHE + Bilateral Denoising)
               ↓
    Radiomics Biomarker Extraction (32 Features)
    ├─ 16 First-Order Intensity Statistics (Mean, Entropy, Skewness, Kurtosis)
    ├─ 7 Directional GLCM Texture Features (Homogeneity, Contrast, Energy)
    ├─ 6 Morphological & Geometry Features (Compactness, Edge Density)
    └─ 3 Local 3x3 Grid Micro-Heterogeneity Features
               ↓
    Feature Standardization & Outlier Clipping (IQR)
               ↓
    Machine Learning Classifier (Primary: Calibrated XGBoost)
               ↓
    Probability Calibration (Platt Sigmoid / Isotonic)
               ↓
    Uncertainty Estimation (Margin, 95% Confidence Interval)
               ↓
    Calibrated Risk Category: LOW / MODERATE / HIGH
               ↓
    Actionable Clinical Screening Recommendation & SHAP Attribution
```

---

## 3. Key Capabilities

- **Zero-Install, 100% Offline Client Inference**: Processes ocular images entirely in browser memory using HTML5 Canvas shaders. No facial photographs are ever transmitted to cloud servers, upholding patient privacy.
- **Automated Image Quality Assessment (IQA)**: Evaluates resolution, Laplacian blur variance, highlight clipping (>245), underexposure (<20), and specular glare. Rejects low-quality images with actionable retake instructions.
- **Interactive Palpebral ROI Refinement**: Draggable and resizable bounding boxes with pan/zoom to ensure skin and eyelash pixels do not confound mucosal analysis.
- **Strict Patient-Level Partitioning**: Stratified Group K-Fold cross-validation ensures all images from a patient remain isolated in either training or test folds, completely preventing patient leakage.
- **Explainable AI (XAI)**: SHAP-style local feature attributions demonstrate which radiomics markers influenced each screening decision.
- **Demographic Fairness Analysis**: Subgroup sensitivity and specificity breakdowns across biological sex, age brackets, smartphone models, and lighting environments.

---

## 4. Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to launch the clinical workstation.

---

## 5. Repository Documentation Structure

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Complete mathematical and architectural specification.
- [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md): Formal model card documenting intended use, evaluation, and limitations.
- [`docs/DATASET_GUIDE.md`](docs/DATASET_GUIDE.md): Schema specification for CSV labels, demographics, and image archives.
- [`docs/RESEARCH_PROTOCOL.md`](docs/RESEARCH_PROTOCOL.md): Clinical acquisition guidelines and cross-validation protocol.
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): Biological, environmental, and hardware confounders.
