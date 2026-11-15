import { useState } from 'react';
import { Brain, Camera, Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import type {
  Slide,
  SlideImagePlacement,
  SlideLayout,
  ThinkingDepth,
} from '../types/presentation';

interface SlideInspectorProps {
  slide: Slide;
  slideIndex: number;
  language: string;
  rtl: boolean;
  isRefining: boolean;
  onUpdateSlide: (updated: Slide) => void;
  onRefineSlide: (instruction: string, thinkingDepth?: ThinkingDepth) => Promise<void>;
  onOpenPhotoModal: () => void;
}

const LAYOUT_OPTIONS: { id: SlideLayout; label: string }[] = [
  { id: 'title', label: 'Title Cover' },
  { id: 'bullets', label: 'Bullet Points' },
  { id: 'two-column', label: 'Two Columns' },
  { id: 'metric', label: 'Key Metrics' },
  { id: 'quote', label: 'Editorial Quote' },
  { id: 'image-focus', label: 'Photo Showcase' },
  { id: 'closing', label: 'Closing Action' },
];

const QUICK_REFINEMENTS = [
  'Make the copy sharper and more executive-concise',
  'Expand with concrete real-world examples and numbers',
  'Convert tone into persuasive boardroom storytelling',
  'Simplify into 3 short high-impact takeaways',
];

export function SlideInspector({
  slide,
  slideIndex,
  language,
  rtl,
  isRefining,
  onUpdateSlide,
  onRefineSlide,
  onOpenPhotoModal,
}: SlideInspectorProps) {
  const [tab, setTab] = useState<'edit' | 'ai'>('edit');
  const [instruction, setInstruction] = useState('');
  const [aiThinkingDepth, setAiThinkingDepth] = useState<ThinkingDepth>('deep');
  const dir = rtl ? 'rtl' : 'ltr';

  const handleLayoutChange = (nextLayout: SlideLayout) => {
    const next: Slide = { ...slide, layout: nextLayout };
    if (nextLayout === 'bullets' || nextLayout === 'closing') {
      if (!next.bullets || next.bullets.length === 0) {
        next.bullets = ['Key point one', 'Key point two'];
      }
    }
    if (nextLayout === 'two-column') {
      if (!next.leftColumn) {
        next.leftColumn = { heading: 'Primary Focus', points: ['Supporting point'] };
      }
      if (!next.rightColumn) {
        next.rightColumn = { heading: 'Counterpart', points: ['Supporting point'] };
      }
    }
    if (nextLayout === 'metric') {
      if (!next.metrics || next.metrics.length === 0) {
        next.metrics = [
          { value: '45%', label: 'Target improvement' },
          { value: '3.2x', label: 'Efficiency gain' },
          { value: '12', label: 'Rollout markets' },
        ];
      }
    }
    if (nextLayout === 'quote' && !next.quote) {
      next.quote = slide.subtitle || slide.title;
    }
    onUpdateSlide(next);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isRefining) return;
    await onRefineSlide(instruction.trim(), aiThinkingDepth);
    setInstruction('');
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-[#030805] border border-emerald-900/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400';

  return (
    <aside
      aria-label="Slide inspector"
      className="no-print w-full lg:w-80 xl:w-96 lg:h-full lg:min-h-0 bg-[#060E09] border-t lg:border-t-0 lg:border-l border-emerald-900/70 flex flex-col shrink-0"
    >
      <div className="px-4 py-2.5 border-b border-emerald-900/70 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-emerald-200 font-mono tabular-nums">
          Slide {String(slideIndex + 1).padStart(2, '0')}
        </span>

        <div className="flex items-center gap-1 p-0.5 bg-[#030805] border border-emerald-900/60 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'edit'
                ? 'bg-emerald-500/20 text-emerald-100'
                : 'text-emerald-300/70 hover:text-emerald-50'
            }`}
          >
            Edit Content
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'ai'
                ? 'bg-emerald-500/20 text-emerald-100'
                : 'text-emerald-300/70 hover:text-emerald-50'
            }`}
          >
            AI Rewrite
          </button>
        </div>
      </div>

      {tab === 'edit' ? (
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label
              htmlFor="slide-layout-select"
              className="block text-xs font-medium text-emerald-200/85 mb-1.5"
            >
              Layout
            </label>
            <select
              id="slide-layout-select"
              value={slide.layout}
              onChange={(e) => handleLayoutChange(e.target.value as SlideLayout)}
              className={inputClass}
            >
              {LAYOUT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="slide-kicker-input"
              className="block text-xs font-medium text-emerald-200/85 mb-1.5"
            >
              Section Kicker
            </label>
            <input
              id="slide-kicker-input"
              type="text"
              dir={dir}
              value={slide.kicker ?? ''}
              onChange={(e) => onUpdateSlide({ ...slide, kicker: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="slide-title-input"
              className="block text-xs font-medium text-emerald-200/85 mb-1.5"
            >
              Slide Title
            </label>
            <textarea
              id="slide-title-input"
              rows={2}
              dir={dir}
              value={slide.title}
              onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
              className={`${inputClass} resize-y`}
            />
          </div>

          {(slide.layout === 'title' ||
            slide.layout === 'bullets' ||
            slide.layout === 'image-focus' ||
            slide.layout === 'closing') && (
            <div>
              <label
                htmlFor="slide-subtitle-input"
                className="block text-xs font-medium text-emerald-200/85 mb-1.5"
              >
                Subtitle
              </label>
              <textarea
                id="slide-subtitle-input"
                rows={2}
                dir={dir}
                value={slide.subtitle ?? ''}
                onChange={(e) => onUpdateSlide({ ...slide, subtitle: e.target.value })}
                className={`${inputClass} resize-y`}
              />
            </div>
          )}

          {/* Slide Photo & Visual Controls */}
          <div className="pt-2 border-t border-emerald-900/70 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-emerald-200/85">Slide Photo / Visual</span>
              <button
                type="button"
                onClick={onOpenPhotoModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-md transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{slide.image ? 'Change Photo' : 'Add Photo'}</span>
              </button>
            </div>

            {slide.image && (
              <div className="p-2.5 bg-[#0A160E] border border-emerald-800/70 rounded-lg space-y-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src={slide.image.url}
                    alt={slide.image.alt}
                    referrerPolicy="no-referrer"
                    className="w-16 h-10 object-cover rounded border border-emerald-800/70 bg-[#030805] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-50 truncate">
                      {slide.image.alt}
                    </p>
                    <p className="text-[11px] text-emerald-300/70 capitalize">
                      {slide.image.source || 'web'} · {slide.image.placement}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove slide photo"
                    onClick={() => onUpdateSlide({ ...slide, image: undefined })}
                    className="p-1.5 text-emerald-300/65 hover:text-red-300 rounded hover:bg-red-950/60 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="slide-photo-placement"
                    className="block text-[11px] font-medium text-emerald-300/80 mb-1"
                  >
                    Photo Placement
                  </label>
                  <select
                    id="slide-photo-placement"
                    value={slide.image.placement}
                    onChange={(e) =>
                      onUpdateSlide({
                        ...slide,
                        image: {
                          ...slide.image!,
                          placement: e.target.value as SlideImagePlacement,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-50 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="right">Right Split</option>
                    <option value="left">Left Split</option>
                    <option value="frame">Showcase Frame</option>
                    <option value="background">Full Backdrop</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="slide-photo-caption"
                    className="block text-[11px] font-medium text-emerald-300/80 mb-1"
                  >
                    Caption (Optional)
                  </label>
                  <input
                    id="slide-photo-caption"
                    type="text"
                    dir={dir}
                    value={slide.image.caption ?? ''}
                    onChange={(e) =>
                      onUpdateSlide({
                        ...slide,
                        image: {
                          ...slide.image!,
                          caption: e.target.value,
                        },
                      })
                    }
                    placeholder="Photo credit or caption..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>

          {(slide.layout === 'bullets' || slide.layout === 'closing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-200/85">Bullet Points</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSlide({
                      ...slide,
                      bullets: [...(slide.bullets ?? []), ''],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Bullet</span>
                </button>
              </div>
              <div className="space-y-2">
                {(slide.bullets ?? []).map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <input
                      type="text"
                      dir={dir}
                      aria-label={`Bullet point ${idx + 1}`}
                      value={bullet}
                      onChange={(e) => {
                        const next = [...(slide.bullets ?? [])];
                        next[idx] = e.target.value;
                        onUpdateSlide({ ...slide, bullets: next });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-[#030805] border border-emerald-900/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      aria-label={`Remove bullet ${idx + 1}`}
                      onClick={() => {
                        const next = (slide.bullets ?? []).filter((_, i) => i !== idx);
                        onUpdateSlide({ ...slide, bullets: next });
                      }}
                      className="p-2 text-emerald-300/65 hover:text-red-300 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.layout === 'two-column' && (
            <div className="space-y-4">
              {(['leftColumn', 'rightColumn'] as const).map((colKey, idx) => {
                const col = slide[colKey] ?? { heading: '', points: [] };
                return (
                  <div key={colKey} className="p-3 bg-[#0A160E] border border-emerald-900/70 rounded-lg space-y-2">
                    <label className="block text-xs font-medium text-emerald-200/85">
                      Column {idx + 1} Heading
                    </label>
                    <input
                      type="text"
                      dir={dir}
                      value={col.heading}
                      onChange={(e) =>
                        onUpdateSlide({
                          ...slide,
                          [colKey]: { ...col, heading: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-50 focus:outline-none focus:border-emerald-400"
                    />
                    <label className="block text-xs font-medium text-emerald-200/85 pt-1">
                      Points (one per line)
                    </label>
                    <textarea
                      rows={3}
                      dir={dir}
                      value={col.points.join('\n')}
                      onChange={(e) =>
                        onUpdateSlide({
                          ...slide,
                          [colKey]: {
                            ...col,
                            points: e.target.value.split('\n'),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-50 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {slide.layout === 'metric' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-200/85">Metrics</span>
                {(slide.metrics?.length ?? 0) < 4 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSlide({
                        ...slide,
                        metrics: [...(slide.metrics ?? []), { value: '0%', label: 'Metric label' }],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Metric</span>
                  </button>
                )}
              </div>
              {(slide.metrics ?? []).map((metric, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    aria-label={`Metric ${idx + 1} value`}
                    value={metric.value}
                    onChange={(e) => {
                      const next = [...(slide.metrics ?? [])];
                      next[idx] = { ...next[idx], value: e.target.value };
                      onUpdateSlide({ ...slide, metrics: next });
                    }}
                    className="col-span-1 px-2.5 py-1.5 text-sm font-mono bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="text"
                    dir={dir}
                    aria-label={`Metric ${idx + 1} label`}
                    value={metric.label}
                    onChange={(e) => {
                      const next = [...(slide.metrics ?? [])];
                      next[idx] = { ...next[idx], label: e.target.value };
                      onUpdateSlide({ ...slide, metrics: next });
                    }}
                    className="col-span-2 px-2.5 py-1.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-md text-emerald-50 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              ))}
            </div>
          )}

          {slide.layout === 'quote' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="slide-quote-input"
                  className="block text-xs font-medium text-emerald-200/85 mb-1.5"
                >
                  Quote Text
                </label>
                <textarea
                  id="slide-quote-input"
                  rows={3}
                  dir={dir}
                  value={slide.quote ?? ''}
                  onChange={(e) => onUpdateSlide({ ...slide, quote: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="slide-quote-author"
                  className="block text-xs font-medium text-emerald-200/85 mb-1.5"
                >
                  Attribution
                </label>
                <input
                  id="slide-quote-author"
                  type="text"
                  dir={dir}
                  value={slide.quoteAuthor ?? ''}
                  onChange={(e) => onUpdateSlide({ ...slide, quoteAuthor: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-900/70">
            <label
              htmlFor="slide-notes-input"
              className="block text-xs font-medium text-emerald-200/85 mb-1.5"
            >
              Speaker Notes
            </label>
            <textarea
              id="slide-notes-input"
              rows={3}
              dir={dir}
              value={slide.speakerNotes ?? ''}
              onChange={(e) => onUpdateSlide({ ...slide, speakerNotes: e.target.value })}
              placeholder="Talking points for presenting this slide..."
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-emerald-200/75 leading-relaxed">
            Rewrite this slide in <span className="font-semibold text-emerald-50">{language}</span> using an editorial instruction.
          </p>

          <form onSubmit={handleAiSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="ai-refine-instruction"
                className="block text-xs font-medium text-emerald-200/85 mb-1.5"
              >
                Instruction
              </label>
              <textarea
                id="ai-refine-instruction"
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., Tighten bullets for an executive board meeting..."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200/85">
                <Brain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Reasoning Mode</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'deep' as ThinkingDepth, label: 'Deep Think' },
                  { id: 'fast' as ThinkingDepth, label: 'Fast Edit' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAiThinkingDepth(opt.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      aiThinkingDepth === opt.id
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                        : 'bg-[#0A160E] border-emerald-900/70 text-emerald-200/80 hover:bg-[#112317]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!instruction.trim() || isRefining}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Refining Slide...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Apply AI Rewrite</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-emerald-900/70 space-y-2">
            <span className="block text-xs font-medium text-emerald-300/75">
              Quick Presets
            </span>
            <div className="space-y-1.5">
              {QUICK_REFINEMENTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isRefining}
                  onClick={() => onRefineSlide(preset, aiThinkingDepth)}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-100 bg-[#0A160E] hover:bg-[#112317] border border-emerald-900/70 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
