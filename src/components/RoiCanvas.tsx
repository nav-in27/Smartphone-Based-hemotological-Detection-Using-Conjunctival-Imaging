import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RoiCoordinates } from '../types/clinical';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, CheckCircle2 } from 'lucide-react';

interface RoiCanvasProps {
  imageElement: HTMLImageElement | HTMLCanvasElement;
  roi: RoiCoordinates;
  onChangeRoi: (newRoi: RoiCoordinates) => void;
  detectedEyeBox?: { x: number; y: number; width: number; height: number };
}

export const RoiCanvas: React.FC<RoiCanvasProps> = ({
  imageElement,
  roi,
  onChangeRoi,
  detectedEyeBox,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'pan' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialRoi, setInitialRoi] = useState<RoiCoordinates>(roi);

  // Redraw canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = imageElement.width;
    const imgH = imageElement.height;

    canvas.width = imgW;
    canvas.height = imgH;

    // Clear
    ctx.clearRect(0, 0, imgW, imgH);

    // Draw base image
    ctx.drawImage(imageElement, 0, 0, imgW, imgH);

    // Darken background slightly outside ROI to highlight region
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, imgW, imgH);

    // Cutout ROI to reveal original image
    ctx.save();
    ctx.beginPath();
    ctx.rect(roi.x, roi.y, roi.width, roi.height);
    ctx.clip();
    ctx.drawImage(imageElement, 0, 0, imgW, imgH);
    ctx.restore();

    // 1. Draw detected eye bounding box if available (subtle dashed cyan)
    if (detectedEyeBox) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(
        detectedEyeBox.x,
        detectedEyeBox.y,
        detectedEyeBox.width,
        detectedEyeBox.height
      );
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('Detected Ocular Aperture', detectedEyeBox.x + 8, detectedEyeBox.y + 18);
    }

    // 2. Draw Conjunctiva ROI Box (bold rose color)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);

    // Draw palpebral contour line inside ROI
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(roi.x, roi.y + roi.height * 0.4);
    ctx.quadraticCurveTo(
      roi.x + roi.width / 2,
      roi.y + roi.height * 0.9,
      roi.x + roi.width,
      roi.y + roi.height * 0.4
    );
    ctx.stroke();

    // Label on ROI
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(roi.x, Math.max(0, roi.y - 24), 160, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Lower Palpebral ROI', roi.x + 8, Math.max(0, roi.y - 8));

    // 3. Draw Corner Resize Handles
    const handleSize = 10;
    const corners = [
      { x: roi.x, y: roi.y, cursor: 'nw-resize' },
      { x: roi.x + roi.width, y: roi.y, cursor: 'ne-resize' },
      { x: roi.x + roi.width, y: roi.y + roi.height, cursor: 'se-resize' },
      { x: roi.x, y: roi.y + roi.height, cursor: 'sw-resize' },
    ];

    for (const c of corners) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    }

    // Center crosshair
    const centerX = roi.x + roi.width / 2;
    const centerY = roi.y + roi.height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();
  }, [imageElement, roi, detectedEyeBox]);

  useEffect(() => {
    render();
  }, [render]);

  // Coordinate mapping from mouse event to image pixels
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const handleThreshold = 18;

    // Check corners
    const isNear = (cx: number, cy: number) =>
      Math.abs(coords.x - cx) < handleThreshold && Math.abs(coords.y - cy) < handleThreshold;

    if (isNear(roi.x, roi.y)) {
      setDragMode('nw');
    } else if (isNear(roi.x + roi.width, roi.y)) {
      setDragMode('ne');
    } else if (isNear(roi.x + roi.width, roi.y + roi.height)) {
      setDragMode('se');
    } else if (isNear(roi.x, roi.y + roi.height)) {
      setDragMode('sw');
    } else if (
      coords.x >= roi.x &&
      coords.x <= roi.x + roi.width &&
      coords.y >= roi.y &&
      coords.y <= roi.y + roi.height
    ) {
      setDragMode('move');
    } else {
      setDragMode('pan');
    }

    setIsDragging(true);
    setDragStart({ x: coords.x, y: coords.y });
    setInitialRoi({ ...roi });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragMode) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    const imgW = imageElement.width;
    const imgH = imageElement.height;

    let newRoi = { ...roi, manualAdjusted: true };

    if (dragMode === 'move') {
      newRoi.x = Math.max(0, Math.min(imgW - initialRoi.width, initialRoi.x + dx));
      newRoi.y = Math.max(0, Math.min(imgH - initialRoi.height, initialRoi.y + dy));
      newRoi.width = initialRoi.width;
      newRoi.height = initialRoi.height;
    } else if (dragMode === 'se') {
      newRoi.width = Math.max(40, Math.min(imgW - initialRoi.x, initialRoi.width + dx));
      newRoi.height = Math.max(25, Math.min(imgH - initialRoi.y, initialRoi.height + dy));
    } else if (dragMode === 'nw') {
      const targetX = Math.max(0, initialRoi.x + dx);
      const targetY = Math.max(0, initialRoi.y + dy);
      const targetW = initialRoi.width - (targetX - initialRoi.x);
      const targetH = initialRoi.height - (targetY - initialRoi.y);
      if (targetW >= 40 && targetH >= 25) {
        newRoi.x = targetX;
        newRoi.y = targetY;
        newRoi.width = targetW;
        newRoi.height = targetH;
      }
    } else if (dragMode === 'ne') {
      const targetY = Math.max(0, initialRoi.y + dy);
      const targetW = Math.max(40, Math.min(imgW - initialRoi.x, initialRoi.width + dx));
      const targetH = initialRoi.height - (targetY - initialRoi.y);
      if (targetH >= 25) {
        newRoi.y = targetY;
        newRoi.width = targetW;
        newRoi.height = targetH;
      }
    } else if (dragMode === 'sw') {
      const targetX = Math.max(0, initialRoi.x + dx);
      const targetW = initialRoi.width - (targetX - initialRoi.x);
      const targetH = Math.max(25, Math.min(imgH - initialRoi.y, initialRoi.height + dy));
      if (targetW >= 40) {
        newRoi.x = targetX;
        newRoi.width = targetW;
        newRoi.height = targetH;
      }
    }

    onChangeRoi(newRoi);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  return (
    <div className="relative w-full flex flex-col items-center bg-zinc-950 border border-zinc-800 overflow-hidden">
      {/* Top tool controls */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-300 font-mono">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-zinc-200">Palpebral ROI Bounding Frame</span>
          {roi.manualAdjusted ? (
            <span className="text-[11px] text-amber-400 font-mono">[MANUAL_CALIBRATED]</span>
          ) : (
            <span className="text-[11px] text-zinc-400 font-mono">[AUTO_LOCATED]</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono w-12 text-center text-zinc-300">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative w-full max-h-[460px] overflow-hidden flex items-center justify-center bg-black cursor-crosshair select-none"
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative inline-block"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="max-w-full max-h-[440px] block object-contain"
          />
        </div>
      </div>

      {/* Footer hint & coordinates */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span>Drag center: Pan ROI | Drag corner: Resize</span>
        <span>
          COORD: ({Math.round(roi.x)}, {Math.round(roi.y)}) | DIM: {Math.round(roi.width)}×{Math.round(roi.height)} px
        </span>
      </div>
    </div>
  );
};
