import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import type { CustomThemeDefinition, PresentationDeck } from '../types/presentation';
import { SlideRenderer } from './SlideRenderer';

interface PresenterOverlayProps {
  deck: PresentationDeck;
  customThemes?: CustomThemeDefinition[];
  initialSlideIndex: number;
  onClose: () => void;
}

export function PresenterOverlay({
  deck,
  customThemes,
  initialSlideIndex,
  onClose,
}: PresenterOverlayProps) {
  const [index, setIndex] = useState(initialSlideIndex);
  const [showNotes, setShowNotes] = useState(false);
  const total = deck.slides.length;
  const activeSlide = deck.slides[index] ?? deck.slides[0];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setIndex((prev) => Math.min(total - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, total]);

  const progress = ((index + 1) / total) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Presentation mode"
      className="fixed inset-0 z-50 bg-[#020604] text-emerald-50 flex flex-col"
    >
      <div className="h-12 px-5 flex items-center justify-between border-b border-emerald-900/70 shrink-0">
        <div className="flex items-center gap-3 text-xs text-emerald-200/80 min-w-0">
          <span className="font-medium text-emerald-50 truncate">{deck.title}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{deck.language}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              showNotes
                ? 'bg-emerald-500/20 text-emerald-100'
                : 'text-emerald-200/80 hover:text-emerald-50 hover:bg-emerald-900/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Notes</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit presentation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:text-emerald-50 bg-[#0A160E] border border-emerald-800/70 hover:bg-[#112418] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0">
        <div className="w-full max-w-6xl rounded-xl overflow-hidden shadow-2xl border border-emerald-800/80">
          <SlideRenderer
            slide={activeSlide}
            deckTitle={deck.title}
            slideIndex={index}
            totalSlides={total}
            themeId={deck.theme}
            customTheme={deck.customTheme}
            customThemes={customThemes}
            rtl={deck.rtl}
          />
        </div>
      </div>

      {showNotes && (
        <div
          dir={deck.rtl ? 'rtl' : 'ltr'}
          className="px-6 py-3 bg-[#060E09] border-t border-emerald-900/70 text-sm text-emerald-100 max-h-32 overflow-y-auto"
        >
          {activeSlide.speakerNotes || 'No speaker notes for this slide.'}
        </div>
      )}

      <div className="h-12 px-5 border-t border-emerald-900/70 flex items-center justify-between gap-4 shrink-0">
        <span className="font-mono text-xs tabular-nums text-emerald-300/75">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>

        <div className="flex-1 max-w-md h-1 bg-emerald-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            disabled={index === 0}
            aria-label="Previous slide"
            className="p-2 text-emerald-100 hover:text-emerald-50 bg-[#0A160E] border border-emerald-800/70 hover:bg-[#112418] disabled:opacity-30 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((prev) => Math.min(total - 1, prev + 1))}
            disabled={index === total - 1}
            aria-label="Next slide"
            className="p-2 text-emerald-100 hover:text-emerald-50 bg-[#0A160E] border border-emerald-800/70 hover:bg-[#112418] disabled:opacity-30 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
