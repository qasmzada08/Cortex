import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import type { CustomThemeDefinition, DeckThemeId, Slide, SlideLayout } from '../types/presentation';
import { SlideRenderer } from './SlideRenderer';

interface SlideRailProps {
  slides: Slide[];
  activeSlideIndex: number;
  deckTitle: string;
  themeId: DeckThemeId;
  customTheme?: CustomThemeDefinition;
  customThemes?: CustomThemeDefinition[];
  rtl: boolean;
  onSelectSlide: (index: number) => void;
  onAddSlide: (layout: SlideLayout) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
}

export function SlideRail({
  slides,
  activeSlideIndex,
  deckTitle,
  themeId,
  customTheme,
  customThemes,
  rtl,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
}: SlideRailProps) {
  return (
    <aside
      aria-label="Slide navigator"
      className="no-print w-full lg:w-64 lg:h-full lg:min-h-0 bg-[#060E09] border-b lg:border-b-0 lg:border-r border-emerald-900/70 flex flex-col shrink-0"
    >
      <div className="px-4 py-3 border-b border-emerald-900/70 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-emerald-100 font-mono tabular-nums">
          Slides ({slides.length})
        </span>
        <button
          type="button"
          onClick={() => onAddSlide('bullets')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Slide</span>
        </button>
      </div>

      <div className="flex lg:flex-col gap-3 p-3 overflow-x-auto lg:overflow-y-auto lg:flex-1">
        {slides.map((slide, index) => {
          const isActive = index === activeSlideIndex;
          return (
            <div
              key={slide.id}
              className={`group shrink-0 w-44 lg:w-full rounded-lg border transition-colors ${
                isActive
                  ? 'border-emerald-400 bg-emerald-950/50'
                  : 'border-emerald-900/60 bg-[#0A160E] hover:border-emerald-700/80'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSlide(index)}
                aria-label={`Select slide ${index + 1}: ${slide.title}`}
                aria-current={isActive ? 'true' : undefined}
                className="w-full text-left p-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 rounded-t-lg"
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-emerald-300/70">
                  <span className="font-mono font-semibold tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="capitalize truncate">{slide.layout}</span>
                </div>
                <div className="rounded overflow-hidden border border-emerald-900/70">
                  <SlideRenderer
                    slide={slide}
                    deckTitle={deckTitle}
                    slideIndex={index}
                    totalSlides={slides.length}
                    themeId={themeId}
                    customTheme={customTheme}
                    customThemes={customThemes}
                    rtl={rtl}
                    compact
                  />
                </div>
              </button>

              <div className="px-2 pb-2 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onMoveSlide(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move slide ${index + 1} up`}
                  className="p-1.5 text-emerald-300/70 hover:text-emerald-50 disabled:opacity-30 rounded hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveSlide(index, index + 1)}
                  disabled={index === slides.length - 1}
                  aria-label={`Move slide ${index + 1} down`}
                  className="p-1.5 text-emerald-300/70 hover:text-emerald-50 disabled:opacity-30 rounded hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateSlide(index)}
                  aria-label={`Duplicate slide ${index + 1}`}
                  className="p-1.5 text-emerald-300/70 hover:text-emerald-50 rounded hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSlide(index)}
                  disabled={slides.length <= 1}
                  aria-label={`Delete slide ${index + 1}`}
                  className="p-1.5 text-emerald-300/70 hover:text-red-300 disabled:opacity-30 rounded hover:bg-red-950/60 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
