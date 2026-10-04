# Model Card: ConjunctiAI-XGB-v1.0

## Model Details
- **Model Name**: ConjunctiAI Calibrated XGBoost Baseline
- **Version**: 1.0-MVP
- **Type**: Gradient Boosted Decision Tree (GBDT) + Platt Sigmoid Probability Calibrator
- **Input Features**: 32-dimensional conjunctival radiomics vector
- **Target**: Anemia Risk (Binary: Normal vs. Anemia, Calibrated Probability, 3-tier Screening: Low / Moderate / High)
- **License**: Apache 2.0

## Intended Use
- **Primary Use**: Non-invasive optical screening in triage, telemedicine, and point-of-care environments to flag individuals needing confirmatory diagnostic hemoglobin testing.
- **Target Users**: Healthcare workers, community triage nurses, clinical researchers.

## Out-of-Scope Use
- Not for standalone clinical diagnosis of anemia.
- Not for transfusion decision thresholds or treatment dosing.
- Not for critical hemorrhage monitoring in acute emergency trauma.

## Factors & Confounders
- Ocular surface hyperemia (allergic conjunctivitis, dry eye, pterygium)
- Peripheral vasoconstriction (cold ambient temperature, acute dehydration)
- Jaundice / Hyperbilirubinemia
- Smartphone camera ISP tone-mapping and auto-exposure variability
