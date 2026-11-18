import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Eye, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { ProjectDocument } from '../types';

interface DocumentModalProps {
  document: ProjectDocument | null;
  onClose: () => void;
}

export default function DocumentModal({ document, onClose }: DocumentModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const docImages: string[] = document
    ? (document.images && document.images.length > 0 
        ? document.images 
        : (document.imageUrl ? [document.imageUrl] : []))
    : [];

  const hasMultiple = docImages.length > 1;

  // Reset current index when document changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFullScreen(false);
  }, [document?.id]);

  // Keyboard navigation support
  useEffect(() => {
    if (!document) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasMultiple) {
        if (docImages.length > 0) {
          setCurrentIndex(prev => (prev === 0 ? docImages.length - 1 : prev - 1));
        }
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        if (docImages.length > 0) {
          setCurrentIndex(prev => (prev === docImages.length - 1 ? 0 : prev + 1));
        }
      } else if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, hasMultiple, isFullScreen, docImages.length, onClose]);

  if (!document) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? docImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(prev => (prev === docImages.length - 1 ? 0 : prev + 1));
  };

  const activeImage = docImages[currentIndex] || document.imageUrl;

  return (
    <>
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0F172A]/75 backdrop-blur-xs" 
          id="doc-modal-overlay" 
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            id="doc-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#D97706] font-mono font-bold">
                    Официальный документ проекта
                  </span>
                  {hasMultiple && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Layers size={11} className="text-amber-700" />
                      <span>{docImages.length} сурат</span>
                    </span>
                  )}
                </div>
                <h3 className="text-md md:text-lg font-bold text-[#0F172A] tracking-tight truncate" id="doc-modal-title">
                  {document.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                aria-label="Закрыть окно"
                id="doc-modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Content (Image Carousel View) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center justify-center bg-slate-100/50 relative">
              {activeImage ? (
                <div className="flex flex-col items-center w-full max-w-full space-y-3">
                  
                  {/* Image Display Wrapper */}
                  <div className="relative group max-w-full flex items-center justify-center bg-white border border-slate-200 shadow-sm p-1.5 rounded-md overflow-hidden min-h-[250px] sm:min-h-[350px]">
                    
                    {/* Main Image */}
                    <img
                      src={activeImage}
                      alt={`${document.title} - ${currentIndex + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[50vh] sm:max-h-[55vh] object-contain mx-auto select-none rounded cursor-zoom-in transition-transform duration-200 hover:scale-[1.005]"
                      id="doc-modal-img"
                      onClick={() => setIsFullScreen(true)}
                    />

                    {/* Magnify Overlay Button */}
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="absolute bottom-3 right-3 bg-black/75 hover:bg-black/90 text-white rounded-full px-2.5 py-1.5 opacity-80 group-hover:opacity-100 transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-[10px] font-sans font-bold"
                    >
                      <Eye size={13} />
                      <span>Калон кардан</span>
                    </button>

                    {/* Image Counter Badge (top-right) */}
                    {hasMultiple && (
                      <div className="absolute top-3 right-3 bg-black/75 text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-xs shadow-md">
                        {currentIndex + 1} / {docImages.length}
                      </div>
                    )}

                    {/* Next / Prev Navigation Overlay Buttons */}
                    {hasMultiple && (
                      <>
                        <button
                          onClick={handlePrev}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all shadow-lg hover:scale-110 cursor-pointer border border-white/20"
                          aria-label="Сурати қаблӣ"
                          title="Сурати қаблӣ"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={handleNext}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all shadow-lg hover:scale-110 cursor-pointer border border-white/20"
                          aria-label="Сурати баъдӣ"
                          title="Сурати баъдӣ"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation Strip for Multi-Image Docs */}
                  {hasMultiple && (
                    <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 max-w-full no-scrollbar">
                      {docImages.map((imgUrl, idx) => {
                        const isActive = idx === currentIndex;
                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded border-2 transition-all cursor-pointer overflow-hidden bg-white ${
                              isActive 
                                ? 'border-[#D97706] ring-2 ring-[#D97706]/40 scale-105 shadow-md' 
                                : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                            }`}
                          >
                            <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-black/80 text-white font-mono text-[8px] font-bold px-1 rounded-tl">
                              #{idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Eye size={40} className="stroke-[1.5] mb-2 text-slate-300" />
                  <p className="text-xs font-mono">Изображение документа отсутствует</p>
                </div>
              )}
            </div>

            {/* Footer controls */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                <Calendar size={13} className="text-[#D97706]/85" />
                <span>ЗАГРУЖЕН: {document.createdAt ? new Date(document.createdAt).toLocaleDateString('ru') : 'Новый'}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {hasMultiple && (
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline-block pr-2">
                    Сурати {currentIndex + 1} аз {docImages.length}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-sm transition-colors cursor-pointer text-center uppercase tracking-wider"
                  id="doc-close-footer-btn"
                >
                  <span>Назад</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Full Screen Image Overlay */}
      <AnimatePresence>
        {isFullScreen && activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4"
            onClick={() => setIsFullScreen(false)}
          >
            {/* Top controls header */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-[70] pointer-events-none">
              <div className="bg-black/60 border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-mono font-bold backdrop-blur-sm pointer-events-auto">
                {document.title} {hasMultiple ? `(${currentIndex + 1}/${docImages.length})` : ''}
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 pointer-events-auto"
                aria-label="Пӯшидан"
              >
                <X size={20} />
              </button>
            </div>

            {/* Next / Prev Navigation Buttons in Fullscreen Mode */}
            {hasMultiple && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all shadow-2xl hover:scale-110 cursor-pointer border border-white/20 z-[70]"
                  aria-label="Сурати қаблӣ"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all shadow-2xl hover:scale-110 cursor-pointer border border-white/20 z-[70]"
                  aria-label="Сурати баъдӣ"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            {/* Main maximized image */}
            <motion.img
              key={currentIndex}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              src={activeImage}
              alt={document.title}
              referrerPolicy="no-referrer"
              className="max-w-[95vw] max-h-[85vh] object-contain select-none shadow-2xl rounded"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullScreen(false);
              }}
            />

            {/* Bottom thumbnail selector in full screen */}
            {hasMultiple && (
              <div 
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-white/15 p-2 rounded-full backdrop-blur-md z-[70] max-w-[90vw] overflow-x-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {docImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all overflow-hidden ${
                      idx === currentIndex 
                        ? 'border-amber-500 scale-110 ring-2 ring-amber-500/50' 
                        : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Sleek bottom guide notification */}
            {!hasMultiple && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 border border-white/10 rounded-full text-[10px] font-semibold tracking-wider text-gray-300 pointer-events-none uppercase font-sans">
                Барои баргаштан пахш кунед
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
