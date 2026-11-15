import type { PresentationDeck } from '../types/presentation';
import { SlideRenderer } from './SlideRenderer';

interface TemplatesGalleryProps {
  decks: PresentationDeck[];
  onLoadDeck: (deck: PresentationDeck) => void;
  onOpenGenerator: () => void;
}

export function TemplatesGallery({
  decks,
  onLoadDeck,
  onOpenGenerator,
}: TemplatesGalleryProps) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-emerald-900/70 pb-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50 tracking-tight">
            Multilingual Starter Decks
          </h1>
          <p className="text-sm text-emerald-200/75 max-w-2xl">
            Open any ready-made presentation in Studio to inspect native script layouts, right-to-left typography, and structured slide blocks—or generate a custom deck from scratch.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGenerator}
          className="px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          New AI Deck
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {decks.map((deck) => (
          <article
            key={deck.id}
            className="bg-[#08110C] border border-emerald-900/70 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="border-b border-emerald-900/70 bg-[#030805] p-4">
              <div className="rounded-lg overflow-hidden border border-emerald-800/70 shadow-xs">
                <SlideRenderer
                  slide={deck.slides[0]}
                  deckTitle={deck.title}
                  slideIndex={0}
                  totalSlides={deck.slides.length}
                  themeId={deck.theme}
                  rtl={deck.rtl}
                />
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-emerald-300/70">
                  <span className="font-medium text-emerald-200">{deck.language}</span>
                  <span aria-hidden="true">·</span>
                  <span>{deck.rtl ? 'RTL' : 'LTR'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{deck.slides.length} slides</span>
                  <span aria-hidden="true">·</span>
                  <span>{deck.tone}</span>
                </div>
                <h2 dir={deck.rtl ? 'rtl' : 'ltr'} className="font-display text-lg font-bold text-emerald-50">
                  {deck.title}
                </h2>
                <p dir={deck.rtl ? 'rtl' : 'ltr'} className="text-sm text-emerald-200/75 line-clamp-2">
                  {deck.subtitle}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onLoadDeck(deck)}
                  className="px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#0E1E15] hover:bg-[#142A1E] border border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
                >
                  Open in Studio
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
