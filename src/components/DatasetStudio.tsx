import React, { useState, useRef } from 'react';
import { PatientRecord } from '../types/clinical';
import {
  CLINICAL_REFERENCE_STANDARDS,
  ClinicalReferenceStandard,
  generateSyntheticCohort,
  parseDatasetCsv,
} from '../services/datasetManager';
import { auditPatientLeakage } from '../services/crossValidation';
import {
  Upload,
  Download,
  Check,
  ShieldCheck,
  Binary,
} from 'lucide-react';

interface DatasetStudioProps {
  records: PatientRecord[];
  onUpdateRecords: (newRecords: PatientRecord[]) => void;
  isDemoMode: boolean;
}

export const DatasetStudio: React.FC<DatasetStudioProps> = ({
  records,
  onUpdateRecords,
  isDemoMode,
}) => {
  const [selectedStandard, setSelectedStandard] = useState<ClinicalReferenceStandard>(
    CLINICAL_REFERENCE_STANDARDS[0]
  );
  const [filterSex, setFilterSex] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<{ hasLeakage: boolean; summary: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = records.filter((r) => {
    if (filterSex !== 'all' && r.sex !== filterSex) return false;
    if (filterLabel !== 'all' && String(r.anemiaLabel) !== filterLabel) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.patientId.toLowerCase().includes(term) ||
        r.imageId.toLowerCase().includes(term) ||
        r.deviceModel.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleGenerateSynthetic = (count: number) => {
    setIsGenerating(true);
    setTimeout(() => {
      const newCohort = generateSyntheticCohort(count, selectedStandard);
      onUpdateRecords(newCohort);
      setIsGenerating(false);
      setAuditResult(null);
    }, 300);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { records: parsedRecords, errors } = await parseDatasetCsv(text, selectedStandard);

    if (errors.length > 0) {
      alert(`CSV Ingestion Errors:\n${errors.join('\n')}`);
      return;
    }

    if (parsedRecords.length > 0) {
      onUpdateRecords(parsedRecords);
      setAuditResult(null);
      alert(`Loaded ${parsedRecords.length} clinical records.`);
    }
  };

  const handleRunLeakageAudit = () => {
    const patientIds = Array.from(new Set(records.map((r) => r.patientId)));
    const trainPatientCount = Math.floor(patientIds.length * 0.8);
    const trainPatientSet = new Set(patientIds.slice(0, trainPatientCount));

    const trainRecs = records.filter((r) => trainPatientSet.has(r.patientId));
    const testRecs = records.filter((r) => !trainPatientSet.has(r.patientId));

    const audit = auditPatientLeakage(trainRecs, testRecs);
    setAuditResult({
      hasLeakage: audit.hasLeakage,
      summary: audit.auditSummary,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'patient_id',
      'image_id',
      'age',
      'sex',
      'is_pregnant',
      'hemoglobin',
      'anemia_label',
      'lighting_condition',
      'device_model',
      'quality_score',
    ];

    const rows = records.map((r) => [
      r.patientId,
      r.imageId,
      r.age,
      r.sex,
      r.isPregnant ? 'true' : 'false',
      r.hemoglobinGdl,
      r.anemiaLabel,
      r.lightingCondition,
      `"${r.deviceModel}"`,
      r.qualityScore,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cohort_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span>Clinical Dataset Repository</span>
            <span>·</span>
            <span>Patient Manifest & Label Mapping</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-mono mt-0.5">
            COHORT DATASET STUDIO & LEAKAGE AUDITOR
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Ground-truth laboratory hemoglobin mapping, population reference guidelines, and strict patient-level partition audits.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Clinical Reference Standards Selection */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs font-bold text-zinc-100 uppercase block">
            Clinical Reference Standard (Hemoglobin Cutoff Thresholds)
          </span>
          <span className="text-[10px] text-zinc-400">
            Gold-standard reference guideline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
          {CLINICAL_REFERENCE_STANDARDS.map((std) => {
            const isSelected = selectedStandard.id === std.id;
            return (
              <div
                key={std.id}
                onClick={() => setSelectedStandard(std)}
                className={`p-3 bg-zinc-950 border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-rose-500 bg-zinc-900'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">{std.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 font-sans mt-1 line-clamp-2">{std.description}</p>
                <div className="mt-2 pt-2 border-t border-zinc-800/80 grid grid-cols-3 gap-1 text-[10px]">
                  <div>
                    <span className="text-zinc-500 block">Male</span>
                    <span className="text-zinc-300 font-bold">&lt;{std.maleThreshold} g/dL</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Female</span>
                    <span className="text-zinc-300 font-bold">&lt;{std.femaleThreshold} g/dL</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Pregnant</span>
                    <span className="text-zinc-300 font-bold">&lt;{std.pregnantThreshold} g/dL</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cohort Synthesis & Leakage Auditor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
        <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-zinc-100 uppercase block">
            Generate Synthetic Research Cohort
          </span>
          <p className="text-xs text-zinc-400 font-sans">
            Synthesizes realistic patient records with multi-shot captures and physiological pallor radiomics for algorithmic testing.
          </p>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <button
              onClick={() => handleGenerateSynthetic(40)}
              disabled={isGenerating}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-sm cursor-pointer"
            >
              +40 Patients
            </button>
            <button
              onClick={() => handleGenerateSynthetic(80)}
              disabled={isGenerating}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-sm cursor-pointer"
            >
              +80 Patients
            </button>
            <button
              onClick={() => handleGenerateSynthetic(150)}
              disabled={isGenerating}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-sm cursor-pointer"
            >
              +150 Patients
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-zinc-100 uppercase block">
            Patient-Level Isolation Audit Tool
          </span>
          <p className="text-xs text-zinc-400 font-sans">
            Verifies that all images from any individual subject are strictly isolated to either the training or test partition.
          </p>

          <button
            onClick={handleRunLeakageAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 transition-colors cursor-pointer rounded-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
            <span>Execute Leakage Audit</span>
          </button>

          {auditResult && (
            <div
              className={`p-2 text-xs border ${
                auditResult.hasLeakage
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              }`}
            >
              {auditResult.summary}
            </div>
          )}
        </div>
      </div>

      {/* Dataset Filter & Patient Records Table */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-2">
          <span className="text-xs font-bold text-zinc-100 uppercase">
            Subject Records Catalog ({filteredRecords.length} Entries)
          </span>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Search ID / device..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600 rounded-sm"
            />

            <select
              value={filterSex}
              onChange={(e) => setFilterSex(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none rounded-sm"
            >
              <option value="all">All Sexes</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>

            <select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none rounded-sm"
            >
              <option value="all">All Labels</option>
              <option value="1">Anemia (1)</option>
              <option value="0">Normal (0)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10px]">
              <tr>
                <th className="py-2 px-2.5">Patient ID</th>
                <th className="py-2 px-2.5">Image ID</th>
                <th className="py-2 px-2.5">Demographics</th>
                <th className="py-2 px-2.5">Lab Hb (g/dL)</th>
                <th className="py-2 px-2.5">Ground Truth</th>
                <th className="py-2 px-2.5">Device & Lighting</th>
                <th className="py-2 px-2.5 text-right">IQA Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredRecords.slice(0, 100).map((r, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/40">
                  <td className="py-1.5 px-2.5 font-bold text-zinc-100">{r.patientId}</td>
                  <td className="py-1.5 px-2.5 text-zinc-400">{r.imageId}</td>
                  <td className="py-1.5 px-2.5">
                    {r.age}y / {r.sex.toUpperCase()} {r.isPregnant ? '(Preg)' : ''}
                  </td>
                  <td className="py-1.5 px-2.5 font-bold text-zinc-100">{r.hemoglobinGdl}</td>
                  <td className="py-1.5 px-2.5">
                    {r.anemiaLabel === 1 ? (
                      <span className="text-rose-400 font-bold text-[10px]">
                        ANEMIA
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold text-[10px]">
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-zinc-400 text-[11px] font-sans">
                    {r.deviceModel} ({r.lightingCondition.replace('_', ' ')})
                  </td>
                  <td className="py-1.5 px-2.5 text-right">
                    <span
                      className={`font-bold ${
                        r.qualityScore >= 75 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {r.qualityScore}
                    </span>
                    <span className="text-zinc-600">/100</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
