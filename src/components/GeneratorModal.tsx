import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Brain, Loader2, Palette, Wand2, X } from 'lucide-react';
import type {
  CustomThemeDefinition,
  DeckThemeId,
  DeckTone,
  GenerateDeckPayload,
  ThinkingDepth,
} from '../types/presentation';
import { DECK_THEMES } from '../utils/deckLogic';
import { WORLD_LANGUAGES, resolveLanguageMeta } from '../utils/languages';
import { normalizeCustomTheme } from '../utils/themeLogic';
import { type GeneratorStep, validateGeneratorStep } from '../utils/wizardLogic';
import { StepProgress } from './StepProgress';

interface GeneratorModalProps {
  open: boolean;
  initialLanguage?: string;
  initialTopic?: string;
  customThemes?: CustomThemeDefinition[];
  isGenerating: boolean;
  serverError: string | null;
  onClose: () => void;
  onGenerate: (payload: GenerateDeckPayload) => Promise<void>;
  onSaveCustomTheme?: (theme: CustomThemeDefinition) => void;
  onOpenThemeStudio?: (topicContext?: string) => void;
}

const TONES: DeckTone[] = [
  'Executive',
  'Academic',
  'Storytelling',
  'Technical',
  'Persuasive',
];

const TOPIC_STARTERS = [
  'Clean energy transition & grid storage roadmap',
  'Quarterly product launch & customer growth plan',
  'Practical AI literacy workshop for cross-functional teams',
];

const QUICK_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Japanese',
  'Chinese (Simplified)',
  'Portuguese',
  'Hindi',
  'Azerbaijani',
];

const SLIDE_COUNT_PRESETS = [4, 6, 8, 10];

const GENERATOR_STEPS = [
  { number: 1, label: 'Topic' },
  { number: 2, label: 'Language' },
  { number: 3, label: 'Style' },
];

const THINKING_DEPTHS: { id: ThinkingDepth; label: string }[] = [
  { id: 'deep', label: 'Deep Think' },
  { id: 'max', label: 'Max Reasoning' },
  { id: 'fast', label: 'Fast' },
];

export function GeneratorModal({
  open,
  initialLanguage,
  initialTopic,
  customThemes = [],
  isGenerating,
  serverError,
  onClose,
  onGenerate,
  onSaveCustomTheme,
  onOpenThemeStudio,
}: GeneratorModalProps) {
  const [step, setStep] = useState<GeneratorStep>(1);
  const [topic, setTopic] = useState(initialTopic ?? '');
  const [language, setLanguage] = useState(initialLanguage ?? 'English');
  const [slideCount, setSlideCount] = useState(6);
  const [tone, setTone] = useState<DeckTone>('Executive');
  const [theme, setTheme] = useState<DeckThemeId>('matrix');
  const [thinkingDepth, setThinkingDepth] = useState<ThinkingDepth>('deep');
  const [sourceNotes, setSourceNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const [isThinkingTopic, setIsThinkingTopic] = useState(false);
  const [thinkThesis, setThinkThesis] = useState('');
  const [thinkAudience, setThinkAudience] = useState('');
  const [thinkError, setThinkError] = useState<string | null>(null);
  const [isDesigningTheme, setIsDesigningTheme] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTheme('matrix');
      setThinkingDepth('deep');
      if (initialLanguage) setLanguage(initialLanguage);
      if (initialTopic !== undefined) setTopic(initialTopic);
      setValidationError(null);
      setThinkError(null);
      setThinkThesis('');
      setThinkAudience('');
      setShowNotes(false);
    }
  }, [open, initialLanguage, initialTopic]);

  if (!open) return null;

  const langMeta = resolveLanguageMeta(language);
  const selectedCustomTheme = customThemes.find((t) => t.id === theme);

  const handleThinkOutline = async () => {
    const clean = topic.trim();
    if (clean.length < 3) {
      setValidationError('Enter a presentation topic (at least 3 characters) to think through.');
      return;
    }
    setIsThinkingTopic(true);
    setThinkError(null);
    setValidationError(null);
    try {
      const res = await fetch('/api/presentations/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: clean, language, slideCount, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not analyze presentation outline.');
      }
      setThinkThesis(data.thesis || '');
      setThinkAudience(data.audienceAngle || '');
      if (data.outline) {
        setSourceNotes((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${data.outline}` : data.outline
        );
      }
      setShowNotes(true);
    } catch (err) {
      setThinkError(err instanceof Error ? err.message : 'Thinking request failed.');
    } finally {
      setIsThinkingTopic(false);
    }
  };

  const handleMatchTopicTheme = async () => {
    const clean = topic.trim();
    if (clean.length < 3) {
      setValidationError('Enter a topic first so Cortex can design a matching theme.');
      return;
    }
    setIsDesigningTheme(true);
    setThinkError(null);
    try {
      const res = await fetch('/api/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: clean,
          tone,
          language,
          thinkingDepth,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.theme) {
        throw new Error(data.error || 'Could not design topic theme.');
      }
      const created = normalizeCustomTheme(data.theme);
      onSaveCustomTheme?.(created);
      setTheme(created.id);
    } catch (err) {
      setThinkError(err instanceof Error ? err.message : 'Topic theme design failed.');
    } finally {
      setIsDesigningTheme(false);
    }
  };

  const handleNext = () => {
    const check = validateGeneratorStep(step, { topic, language, slideCount });
    if (!check.valid) {
      setValidationError(check.error ?? 'Please complete this step.');
      return;
    }
    setValidationError(null);
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = () => {
    setValidationError(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }
    const check = validateGeneratorStep(3, { topic, language, slideCount });
    if (!check.valid) {
      setValidationError(check.error ?? 'Invalid input.');
      return;
    }
    setValidationError(null);
    const notesParts = [
      thinkThesis ? `Thesis: ${thinkThesis}` : '',
      thinkAudience ? `Audience: ${thinkAudience}` : '',
      sourceNotes.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    await onGenerate({
      topic: topic.trim(),
      language: language.trim(),
      slideCount,
      tone,
      theme,
      customTheme: selectedCustomTheme,
      thinkingDepth,
      sourceNotes: notesParts || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generator-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-emerald-50">
        <div className="px-6 py-4 border-b border-emerald-900/70 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="generator-modal-title" className="font-display text-lg font-bold text-emerald-50">
              Create New Presentation
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Plan with Cortex thinking, pick any language, and match a PPTX theme.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Close generator dialog"
            className="p-2 text-emerald-300/70 hover:text-emerald-50 rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <StepProgress
          steps={GENERATOR_STEPS}
          currentStep={step}
          disabled={isGenerating}
          onSelectStep={(n) => {
            setValidationError(null);
            setStep(n as GeneratorStep);
          }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {(validationError || thinkError || serverError) && (
              <div
                role="alert"
                className="px-4 py-3 text-sm text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
              >
                {validationError || thinkError || serverError}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="deck-topic-input" className="block text-sm font-semibold text-emerald-50 mb-1.5">
                    What is your presentation about?
                  </label>
                  <p className="text-xs text-emerald-200/70 mb-3">
                    Write a topic or prompt in any language.
                  </p>
                  <textarea
                    id="deck-topic-input"
                    rows={3}
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g., Circular economy supply chains for European manufacturing, or 日本の再生可能エネルギー戦略..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-emerald-300/80">
                    Or start with an example topic
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {TOPIC_STARTERS.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setTopic(example);
                          setValidationError(null);
                        }}
                        className="text-left px-3 py-2 text-xs text-emerald-100 bg-[#040B07] hover:bg-[#0D1C13] border border-emerald-900/70 rounded-lg transition-colors cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thinking Depth + Collaborative Pre-Plan */}
                <div className="pt-2 border-t border-emerald-900/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                      <Brain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Thinking Depth</span>
                    </span>
                    <button
                      type="button"
                      disabled={isThinkingTopic || topic.trim().length < 3}
                      onClick={() => void handleThinkOutline()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-200 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-45 rounded-md transition-colors cursor-pointer"
                    >
                      {isThinkingTopic ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Brain className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{isThinkingTopic ? 'Thinking...' : 'Think Through Outline'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {THINKING_DEPTHS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThinkingDepth(opt.id)}
                        className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          thinkingDepth === opt.id
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                            : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {(thinkThesis || thinkAudience) && (
                    <div className="p-3 bg-[#040B07] border border-emerald-800/70 rounded-lg space-y-1.5 text-xs">
                      {thinkThesis && (
                        <p className="text-emerald-100">
                          <span className="font-semibold text-emerald-300">Thesis: </span>
                          {thinkThesis}
                        </p>
                      )}
                      {thinkAudience && (
                        <p className="text-emerald-200/80">
                          <span className="font-semibold text-emerald-300">Audience Angle: </span>
                          {thinkAudience}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  {!showNotes ? (
                    <button
                      type="button"
                      onClick={() => setShowNotes(true)}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      + Add optional outline or guidance notes
                    </button>
                  ) : (
                    <div>
                      <label htmlFor="deck-notes-input" className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                        Source Outline or Guidance Notes (Editable)
                      </label>
                      <textarea
                        id="deck-notes-input"
                        rows={3}
                        value={sourceNotes}
                        onChange={(e) => setSourceNotes(e.target.value)}
                        placeholder="Paste key stats, bullet points, or constraints..."
                        className="w-full px-3.5 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="deck-language-input" className="block text-sm font-semibold text-emerald-50 mb-1.5">
                    Choose your presentation language
                  </label>
                  <p className="text-xs text-emerald-200/70 mb-3">
                    Pick a common language below or type any language or dialect.
                  </p>
                  <input
                    id="deck-language-input"
                    type="text"
                    list="world-languages-datalist"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Type any language (e.g., Arabic, Japanese, Catalan)"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                  <datalist id="world-languages-datalist">
                    {WORLD_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.name}>
                        {lang.nativeName}
                      </option>
                    ))}
                  </datalist>
                  <p className="text-xs text-emerald-300/70 mt-2">
                    Script direction:{' '}
                    <span className="font-semibold text-emerald-100">
                      {langMeta.rtl ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-emerald-300/80">
                    Quick select
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_LANGUAGES.map((preset) => {
                      const active = language.trim().toLowerCase() === preset.toLowerCase();
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setLanguage(preset);
                            setValidationError(null);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                              : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <span className="block text-sm font-semibold text-emerald-50 mb-2">
                    How many slides?
                  </span>
                  <div className="grid grid-cols-4 gap-2 mb-2.5">
                    {SLIDE_COUNT_PRESETS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSlideCount(count)}
                        className={`py-2 text-xs font-mono tabular-nums font-semibold rounded-lg border transition-colors cursor-pointer ${
                          slideCount === count
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                            : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                        }`}
                      >
                        {count} slides
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="deck-slide-count" className="text-xs text-emerald-300/75 shrink-0">
                      Custom:
                    </label>
                    <input
                      id="deck-slide-count"
                      type="range"
                      min={3}
                      max={12}
                      value={slideCount}
                      onChange={(e) => setSlideCount(Number(e.target.value))}
                      className="flex-1 accent-emerald-400"
                    />
                    <span className="text-xs font-mono tabular-nums font-semibold text-emerald-100 w-14 text-right">
                      {slideCount} slides
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-emerald-50 mb-2">
                    Editorial Tone
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                          tone === t
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                            : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-emerald-50">
                      Visual & PPTX Theme
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDesigningTheme}
                        onClick={() => void handleMatchTopicTheme()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                      >
                        {isDesigningTheme ? (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Wand2 className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>{isDesigningTheme ? 'Designing...' : 'Think & Match Topic Theme'}</span>
                      </button>
                      {onOpenThemeStudio && (
                        <button
                          type="button"
                          onClick={() => onOpenThemeStudio(topic.trim())}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200/80 hover:text-emerald-50 underline cursor-pointer"
                        >
                          <Palette className="w-3 h-3" aria-hidden="true" />
                          <span>Theme Studio</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.values(DECK_THEMES).map((t) => {
                      const active = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex items-center gap-3 p-2.5 text-left rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-emerald-900/70 bg-[#040B07] hover:border-emerald-700'
                          }`}
                        >
                          <span
                            className={`w-8 h-6 rounded border border-emerald-700/70 shrink-0 relative overflow-hidden ${t.canvasBg}`}
                            aria-hidden="true"
                          >
                            <span className={`block w-full h-1 ${t.accentBg}`} />
                          </span>
                          <span className="text-xs font-semibold text-emerald-50 truncate">
                            {t.name}
                          </span>
                        </button>
                      );
                    })}

                    {customThemes.map((t) => {
                      const active = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex items-center gap-3 p-2.5 text-left rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-emerald-900/70 bg-[#040B07] hover:border-emerald-700'
                          }`}
                        >
                          <span
                            className="w-8 h-6 rounded border border-white/15 shrink-0 overflow-hidden"
                            style={{ backgroundColor: `#${t.hexBg}` }}
                            aria-hidden="true"
                          >
                            <span className="block w-full h-1" style={{ backgroundColor: `#${t.hexAccent}` }} />
                          </span>
                          <span className="text-xs font-semibold text-emerald-50 truncate">
                            {t.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-[#040B07] border border-emerald-900/70 rounded-lg text-xs text-emerald-200/80 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-emerald-50 truncate max-w-[14rem]">{topic.trim()}</span>
                  <span aria-hidden="true">·</span>
                  <span>{language.trim()}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{slideCount} slides</span>
                  <span aria-hidden="true">·</span>
                  <span>{tone}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{thinkingDepth} think</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 flex items-center justify-between gap-3 border-t border-emerald-900/70 bg-[#060E09] shrink-0">
            {step === 1 ? (
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {step < 3 ? (
              <button
                key="generator-next-btn"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <span>{step === 1 ? 'Next: Language' : 'Next: Style'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="generator-submit-btn"
                type="button"
                onClick={() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Generating Deck...</span>
                  </>
                ) : (
                  <span>Generate Presentation</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
