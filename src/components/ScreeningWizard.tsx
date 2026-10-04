import React, { useState, useRef, useEffect } from 'react';
import {
  ImageQualityMetrics,
  ModelPrediction,
  RadiomicsFeatures,
  RoiCoordinates,
} from '../types/clinical';
import { analyzeImageQuality } from '../services/iqa';
import { cropRoi, detectConjunctivaRoi } from '../services/roiDetector';
import {
  processPipelineA,
  processPipelineB,
  PreprocessedResult,
} from '../services/preprocessing';
import { extractRadiomicsFeatures } from '../services/radiomics';
import { getBaselineXGBoostModel, predictAnemiaRisk } from '../services/mlEngine';
import { SAMPLE_CASES, SampleCase } from '../services/demoData';
import { RoiCanvas } from './RoiCanvas';
import { QualityReport } from './QualityReport';
import {
  Camera,
  Upload,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  FileText,
  Activity,
} from 'lucide-react';

interface ScreeningWizardProps {
  onPredictionComplete: (
    prediction: ModelPrediction,
    features: RadiomicsFeatures,
    qualityMetrics: ImageQualityMetrics,
    roiThumbUrl?: string
  ) => void;
  isDemoMode: boolean;
}

export const ScreeningWizard: React.FC<ScreeningWizardProps> = ({
  onPredictionComplete,
  isDemoMode,
}) => {
  const [step, setStep] = useState<'input' | 'iqa_roi' | 'preprocessing' | 'ready'>('input');

  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [qualityMetrics, setQualityMetrics] = useState<ImageQualityMetrics | null>(null);
  const [roiCoordinates, setRoiCoordinates] = useState<RoiCoordinates | null>(null);
  const [detectedEyeBox, setDetectedEyeBox] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [roiCanvas, setRoiCanvas] = useState<HTMLCanvasElement | null>(null);

  const [pipelineAResult, setPipelineAResult] = useState<PreprocessedResult | null>(null);
  const [pipelineBResult, setPipelineBResult] = useState<PreprocessedResult | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<'A' | 'B'>('B');

  const [extractedFeatures, setExtractedFeatures] = useState<RadiomicsFeatures | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const loadImage = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setSelectedImageElement(img);
      setSourceImageUrl(url);
      processImageInput(img);
    };
    img.src = url;
  };

  const handleStartCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setCameraStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      alert(`Camera Device Access Error: ${err.message || 'Optical sensor unavailable.'}`);
      setIsCameraActive(false);
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    loadImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      loadImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImageInput = (img: HTMLImageElement) => {
    setIsProcessing(true);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const iqa = analyzeImageQuality(imgData);
    setQualityMetrics(iqa);

    const detection = detectConjunctivaRoi(imgData);
    setRoiCoordinates(detection.conjunctivaRoi);
    setDetectedEyeBox(detection.eyeBox);

    updateRoiAndPreprocess(canvas, detection.conjunctivaRoi);

    setStep('iqa_roi');
    setIsProcessing(false);
  };

  const updateRoiAndPreprocess = (sourceCanvas: HTMLCanvasElement, roi: RoiCoordinates) => {
    const { roiCanvas: croppedCanvas, roiImageData } = cropRoi(sourceCanvas, roi);
    setRoiCanvas(croppedCanvas);

    const resA = processPipelineA(roiImageData);
    setPipelineAResult(resA);

    const resB = processPipelineB(roiImageData);
    setPipelineBResult(resB);

    const activeRes = selectedPipeline === 'A' ? resA : resB;
    const features = extractRadiomicsFeatures(activeRes, roi, roiImageData);
    setExtractedFeatures(features);
  };

  const handleRoiChange = (newRoi: RoiCoordinates) => {
    setRoiCoordinates(newRoi);
    if (!selectedImageElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = selectedImageElement.width;
    canvas.height = selectedImageElement.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(selectedImageElement, 0, 0);

    updateRoiAndPreprocess(canvas, newRoi);
  };

  const handleRunInference = () => {
    if (!extractedFeatures || !qualityMetrics) return;

    const activeRes = selectedPipeline === 'A' ? pipelineAResult : pipelineBResult;
    if (!activeRes || !roiCoordinates) return;

    const features = extractRadiomicsFeatures(activeRes, roiCoordinates);
    const model = getBaselineXGBoostModel();
    const prediction = predictAnemiaRisk(features, model, isDemoMode);

    const roiThumbUrl = roiCanvas ? roiCanvas.toDataURL('image/png') : undefined;

    onPredictionComplete(prediction, features, qualityMetrics, roiThumbUrl);
  };

  const handleReset = () => {
    setSelectedImageElement(null);
    setSourceImageUrl(null);
    setQualityMetrics(null);
    setRoiCoordinates(null);
    setPipelineAResult(null);
    setPipelineBResult(null);
    setExtractedFeatures(null);
    setStep('input');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16 font-sans">
      {/* Top Clinical Protocol Card */}
      <div className="p-3.5 bg-zinc-900 border border-zinc-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
          <div className="text-zinc-300">
            <span className="font-semibold text-zinc-100 font-mono text-[11px] uppercase mr-2">
              Acquisition Checklist:
            </span>
            <span className="text-zinc-400">
              Subject gaze forward · Evert lower eyelid · Distance 10–20 cm · Diffuse lighting · Avoid corneal flash reflection.
            </span>
          </div>
        </div>

        {sourceImageUrl && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>[RESET_IMAGE]</span>
          </button>
        )}
      </div>

      {/* STEP 1: Image Input / Capture / Samples */}
      {step === 'input' && (
        <div className="space-y-5">
          {/* Main capture options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Live Camera Option */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-300">
                <Camera className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  Direct Camera Capture
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xs">
                  Initiate live optical feed via connected smartphone or webcam sensor.
                </p>
              </div>

              {!isCameraActive ? (
                <button
                  onClick={handleStartCamera}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-mono font-semibold transition-colors cursor-pointer rounded-sm"
                >
                  Start Optical Feed
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="relative border border-zinc-700 bg-black aspect-video max-h-60 mx-auto">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border border-dashed border-zinc-500 m-4 pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-zinc-200 bg-black/80 px-2 py-0.5 font-mono">
                        Center Palpebral Conjunctiva
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCaptureFrame}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer rounded-sm"
                  >
                    Capture Optical Frame
                  </button>
                </div>
              )}
            </div>

            {/* File Upload Option */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="w-10 h-10 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-300">
                <Upload className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  Import Stored Photograph
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xs">
                  Upload raw image files from device filesystem (JPEG, PNG, WebP).
                </p>
              </div>
              <span className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-mono font-medium border border-zinc-700 rounded-sm">
                Browse Local Files
              </span>
            </div>
          </div>

          {/* Reference Test Specimens */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  Standardized Test Specimens (Benchmarking Library)
                </h3>
                <p className="text-xs text-zinc-400">
                  Curated photographic test cases for pipeline verification and image quality gatekeeper testing.
                </p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Observational Cohort
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {SAMPLE_CASES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => loadImage(sample.imageUrl)}
                  className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="relative aspect-video overflow-hidden bg-black border border-zinc-800">
                      <img
                        src={sample.imageUrl}
                        alt={sample.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 text-[9px] font-mono uppercase px-1 py-0.2 bg-black/80 text-zinc-300 border border-zinc-700">
                        {sample.expectedClass.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 font-mono">
                        {sample.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {sample.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span className="text-zinc-300 hover:text-white">&rarr; Load Specimen</span>
                    {sample.groundTruthHb && (
                      <span className="text-zinc-500">Hb Ref: {sample.groundTruthHb} g/dL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 & 3: IQA + ROI Localization Canvas */}
      {step === 'iqa_roi' && qualityMetrics && roiCoordinates && selectedImageElement && (
        <div className="space-y-5">
          <QualityReport
            metrics={qualityMetrics}
            allowBypass={isDemoMode}
            onProceedAnyway={() => setStep('preprocessing')}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  Conjunctival Palpebral ROI Verification
                </h3>
                <p className="text-xs text-zinc-400">
                  Verify the bounding boundary isolates the lower palpebral mucosal bed without incorporating eyelid skin or eyelashes.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Confidence: {Math.round(roiCoordinates.confidence * 100)}%
              </span>
            </div>

            <RoiCanvas
              imageElement={selectedImageElement}
              roi={roiCoordinates}
              detectedEyeBox={detectedEyeBox}
              onChangeRoi={handleRoiChange}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700 transition-colors cursor-pointer rounded-sm"
            >
              Back
            </button>

            <button
              disabled={qualityMetrics.qualityGrade === 'reject' && !isDemoMode}
              onClick={() => setStep('preprocessing')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-mono font-semibold transition-colors cursor-pointer rounded-sm ${
                qualityMetrics.qualityGrade === 'reject' && !isDemoMode
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950'
              }`}
            >
              <span>Next: Preprocessing & Radiomics</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preprocessing Pipeline A vs Pipeline B Comparison */}
      {step === 'preprocessing' && pipelineAResult && pipelineBResult && roiCanvas && (
        <div className="space-y-5">
          <div className="border-b border-zinc-800 pb-2">
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide">
              Preprocessing Pipeline Comparison (Section 7)
            </h3>
            <p className="text-xs text-zinc-400">
              Compare Pipeline A (Standardized Grayscale) with Pipeline B (CLAHE + Bilateral Filtering) to verify vascular capillary contrast preservation.
            </p>
          </div>

          {/* Side-by-side Pipeline Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Pipeline A */}
            <div
              onClick={() => setSelectedPipeline('A')}
              className={`p-4 bg-zinc-900 border cursor-pointer transition-colors ${
                selectedPipeline === 'A'
                  ? 'border-rose-500 bg-zinc-900'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  Pipeline A: Raw Standardized Grayscale
                </span>
                {selectedPipeline === 'A' && (
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-rose-950 border border-rose-700 text-rose-300">
                    SELECTED
                  </span>
                )}
              </div>

              <div className="aspect-video bg-black flex items-center justify-center border border-zinc-800 p-2">
                <img
                  src={pipelineAResult.canvas.toDataURL()}
                  alt="Pipeline A Raw Grayscale"
                  className="max-h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                ITU-R BT.601 luminance mapping without non-linear equalization.
              </p>
            </div>

            {/* Pipeline B */}
            <div
              onClick={() => setSelectedPipeline('B')}
              className={`p-4 bg-zinc-900 border cursor-pointer transition-colors ${
                selectedPipeline === 'B'
                  ? 'border-rose-500 bg-zinc-900'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  Pipeline B: Enhanced (CLAHE + Bilateral Denoise)
                </span>
                {selectedPipeline === 'B' && (
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-rose-950 border border-rose-700 text-rose-300">
                    PRIMARY · SELECTED
                  </span>
                )}
              </div>

              <div className="aspect-video bg-black flex items-center justify-center border border-zinc-800 p-2">
                <img
                  src={pipelineBResult.canvas.toDataURL()}
                  alt="Pipeline B Enhanced CLAHE"
                  className="max-h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                Tile-based adaptive histogram equalization with noise attenuation.
              </p>
            </div>
          </div>

          {/* Quick Radiomics Snapshot */}
          {extractedFeatures && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-300 font-mono block">
                Instant Radiomics Telemetry (Pipeline {selectedPipeline}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Luma Mean</span>
                  <span className="text-zinc-100 font-bold">{extractedFeatures.mean}</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">GLCM Homogeneity</span>
                  <span className="text-rose-400 font-bold">{extractedFeatures.glcmHomogeneity}</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Edge Density</span>
                  <span className="text-zinc-100 font-bold">{extractedFeatures.edgeDensity}</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">GLCM Contrast</span>
                  <span className="text-zinc-100 font-bold">{extractedFeatures.glcmContrast}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              onClick={() => setStep('iqa_roi')}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700 transition-colors cursor-pointer rounded-sm"
            >
              Back to ROI
            </button>

            <button
              onClick={handleRunInference}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer rounded-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Execute Classifier & Evaluate Risk</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
