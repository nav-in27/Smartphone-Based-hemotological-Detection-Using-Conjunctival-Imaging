# Dataset Guide & Research Schema

## Directory Format
```
dataset/
    images/
        patient_001/
            image_01.jpg
            image_02.jpg
        patient_002/
            image_01.jpg
    labels.csv
```

## CSV Schema Specification (`labels.csv`)

| Column Name | Type | Description |
|---|---|---|
| `patient_id` | String | Unique anonymous subject identifier (e.g. `PT-0042`) |
| `image_id` | String | Unique image file identifier (e.g. `PT-0042-IMG-1`) |
| `age` | Integer | Patient age in years |
| `sex` | String | Biological sex (`male`, `female`) |
| `is_pregnant` | Boolean | Pregnancy status (`true`, `false`) |
| `hemoglobin` | Float | Laboratory reference standard Hb in g/dL |
| `anemia_label` | Integer | Derived clinical label (`0` = Normal, `1` = Anemia) |
| `lighting_condition`| String | Ambient lighting (`natural_daylight`, `bright_indoor`, `dim_indoor`) |
| `device_model` | String | Smartphone model (e.g. `iPhone 15 Pro`, `Pixel 8`) |
| `quality_score` | Integer | Automated IQA score (0-100) |

## Data Leakage Prevention Notice
Patients with multiple captures MUST have all associated images assigned strictly to either the training or test partition. Never split images from the same patient across folds.
