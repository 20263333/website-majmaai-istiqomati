import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Move } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
  bgColor?: string;
  bgType?: string;
}

export default function ImageZoomModal({
  isOpen,
  imageUrl,
  title = 'Схема ва планировка',
  onClose,
  bgColor = '#ffffff',
  bgType = 'transparent',
}: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset zoom & pan when modal opens or imageUrl changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 4.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const nextScale = Math.max(prev - 0.35, 0.6);
      if (nextScale <= 1) setPosition({ x: 0, y: 0 });
      return nextScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const setPresetScale = (newScale: number) => {
    setScale(newScale);
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + zoomFactor, 0.6), 4.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Keyboard navigation & mouse up listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleMouseMove, handleMouseUp, onClose]);

  if (!isOpen || !imageUrl) return null;

  const isColorBg = bgType === 'color';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[80] flex flex-col justify-between items-center p-2 sm:p-4 select-none overflow-hidden"
        id="image-zoom-modal-overlay"
        onClick={onClose}
      >
        {/* Top Header Controls Bar */}
        <div
          className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 text-white rounded-xl px-4 py-3 flex items-center justify-between z-10 shadow-2xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Maximize2 size={18} className="text-amber-500 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Закрыть (Esc)"
              id="zoom-modal-close-btn"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center Main Zoom & Pan Interactive Viewport */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl h-[calc(100vh-140px)] my-2 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800/80 shadow-2xl"
          style={{
            backgroundColor: isColorBg ? bgColor : '#0f172a',
            backgroundImage: isColorBg ? 'none' : 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: isColorBg ? 'none' : '20px 20px',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          {/* Zoom Instruction Hint overlay */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 bg-slate-950/70 border border-slate-800/80 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-mono">
            <Move size={12} className="text-amber-400" />
            <span>Дар болои сурат кашед (Pan) / Скролл барои Масштаб (Zoom)</span>
          </div>

          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
            onMouseDown={handleMouseDown}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={title}
              draggable={false}
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[95%] object-contain select-none transition-shadow duration-300"
            />
          </div>
        </div>

        {/* Bottom Floating Control Panel (HUD) */}
        <div
          className="w-auto max-w-2xl bg-slate-900/95 border border-slate-800 text-white rounded-2xl px-4 py-2.5 flex items-center gap-2 sm:gap-3 z-10 shadow-2xl backdrop-blur-md flex-wrap justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Zoom Out Button */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
            title="Дур кардан (-)"
          >
            <ZoomOut size={15} className="text-slate-300" />
            <span className="hidden xs:inline">-</span>
          </button>

          {/* Scale Indicator & Quick Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            {[1, 1.5, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setPresetScale(s)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  Math.abs(scale - s) < 0.1
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Zoom In Button */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 4.5}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
            title="Наздик кардан (+)"
          >
            <ZoomIn size={15} />
            <span className="hidden xs:inline">+</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700 ml-1"
            title="Бозсозӣ ба 100%"
          >
            <RotateCcw size={13} />
            <span className="text-[11px] font-mono">100%</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
