"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageViewerOverlayProps {
  images: string[];
  initialIndex?: number;
  singleMode?: boolean;
  onClose: () => void;
}

export default function ImageViewerOverlay({ images, initialIndex = 0, singleMode = false, onClose }: ImageViewerOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!singleMode) {
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "ArrowRight") handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, singleMode]);

  const handlePrev = () => {
    if (singleMode) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    if (singleMode) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Swipe handlers for mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    if (singleMode) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (singleMode) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (singleMode || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-8">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {!singleMode && images.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="hidden md:flex absolute left-6 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={handleNext}
            className="hidden md:flex absolute right-6 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div 
        className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <img 
          src={images[currentIndex]} 
          alt={`View ${currentIndex + 1}`} 
          className="max-w-full max-h-[85vh] object-contain select-none drop-shadow-2xl"
          draggable={false}
        />
        
        {!singleMode && images.length > 1 && (
          <div className="absolute bottom-4 md:bottom-[-20px] left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tracking-widest bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
