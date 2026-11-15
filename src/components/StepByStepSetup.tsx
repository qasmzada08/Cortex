import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  FolderOpen,
  LayoutGrid,
  Loader2,
  Palette,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type {
  CustomThemeDefinition,
  DeckThemeId,
  DeckTone,
  GenerateDeckPayload,
  Slide,
  ThinkingDepth,
} from '../types/presentation';
import { DECK_THEMES } from '../utils/deckLogic';
import { WORLD_LANGUAGES, resolveLanguageMeta } from '../utils/languages';
import { computeContrastRatio, getContrastRating, normalizeCustomTheme, resolveDeckTheme } from '../utils/themeLogic';
import { SlideRenderer } from './SlideRenderer';

type SetupStep = 1 | 2 | 3 | 4;

interface StepByStepSetupProps {
  initialTopic?: string;
  initialLanguage?: string;
  customThemes: CustomThemeDefinition[];
  isGenerating: boolean;
  serverError: string | null;
  onGenerateAndOpenStudio: (payload: GenerateDeckPayload) => Promise<void>;
  onSaveCustomTheme: (theme: CustomThemeDefinition) => void;
  onOpenThemeStudio: (seedTheme?: CustomThemeDefinition, topicContext?: string) => void;
  onSkipToStudio: () => void;
  onOpenFileClick: () => void;
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

const THINKING_DEPTH_OPTIONS: { id: ThinkingDepth; label: string; hint: string }[] = [
  { id: 'deep', label: 'Deep Think', hint: 'Structured analytical reasoning' },
  { id: 'max', label: 'Max Reasoning', hint: 'Exhaustive narrative planning' },
  { id: 'fast', label: 'Fast', hint: 'Rapid draft generation' },
];

const STEPS: { num: SetupStep; label: string }[] = [
  { num: 1, label: '1. Topic & Think' },
  { num: 2, label: '2. Language' },
  { num: 3, label: '3. Length & Tone' },
  { num: 4, label: '4. PPTX Theme' },
];

export function StepByStepSetup({
  initialTopic,
  initialLanguage,
  customThemes,
  isGenerating,
  serverError,
  onGenerateAndOpenStudio,
  onSaveCustomTheme,
  onOpenThemeStudio,
  onSkipToStudio,
  onOpenFileClick,
}: StepByStepSetupProps) {
  const [step, setStep] = useState<SetupStep>(1);
  const [topic, setTopic] = useState(initialTopic || '');
  const [thinkingDepth, setThinkingDepth] = useState<ThinkingDepth>('deep');
  const [sourceNotes, setSourceNotes] = useState('');
  const [thesis, setThesis] = useState('');
  const [audienceAngle, setAudienceAngle] = useState('');
  const [thinkTrace, setThinkTrace] = useState('');
  const [showTrace, setShowTrace] = useState(false);
  const [isThinkingTopic, setIsThinkingTopic] = useState(false);

  const [language, setLanguage] = useState(initialLanguage || 'English');
  const [slideCount, setSlideCount] = useState(6);
  const [tone, setTone] = useState<DeckTone>('Executive');

  const [theme, setTheme] = useState<DeckThemeId>('matrix');
  const [themeFeedback, setThemeFeedback] = useState('');
  const [isDesigningTheme, setIsDesigningTheme] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const langMeta = resolveLanguageMeta(language);
  const activeCustomTheme = customThemes.find((t) => t.id === theme);
  const resolvedPreviewTheme = resolveDeckTheme(theme, customThemes, activeCustomTheme);
  const contrastRatio = computeContrastRatio(resolvedPreviewTheme.hexBg, resolvedPreviewTheme.hexInk);
  const contrastRating = getContrastRating(contrastRatio);

  const previewSampleSlide: Slide = {
    id: 'setup-preview',
    layout: 'bullets',
    kicker: `${tone} Briefing`,
    title: topic.trim() || 'Your Presentation Title Preview',
    subtitle: `${language.trim() || 'English'} · ${slideCount} Slides · ${resolvedPreviewTheme.name}`,
    bullets: [
      'Core strategic insight framed clearly for decision-makers',
      'Evidence-backed milestones and measurable execution plan',
      'Co-designed PPTX typography, contrast, and slide geometry',
    ],
  };

  const handleThinkThroughTopic = async () => {
    const clean = topic.trim();
    if (clean.length < 3) {
      setLocalError('Enter a presentation topic (at least 3 characters) so Cortex can think through it.');
      return;
    }
    setIsThinkingTopic(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/presentations/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: clean, language, slideCount, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not plan presentation outline.');
      }
      setThesis(data.thesis || '');
      setAudienceAngle(data.audienceAngle || '');
      setThinkTrace(data.thinkingSummary || '');
      if (data.outline) {
        setSourceNotes((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${data.outline}` : data.outline
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Topic thinking request failed.');
    } finally {
      setIsThinkingTopic(false);
    }
  };

  const handleDesignOrRefineTheme = async (refineCurrent: boolean) => {
    const cleanTopic = topic.trim();
    const cleanPrompt = themeFeedback.trim();
    if (cleanTopic.length < 3 && cleanPrompt.length < 3) {
      setLocalError('Provide a presentation topic or theme description first.');
      return;
    }
    setIsDesigningTheme(true);
    setLocalError(null);
    try {
      const currentDraft: CustomThemeDefinition = activeCustomTheme || {
        id: 'draft-theme',
        name: resolvedPreviewTheme.name,
        description: resolvedPreviewTheme.description,
        hexBg: resolvedPreviewTheme.hexBg,
        hexSurface: resolvedPreviewTheme.hexSurface,
        hexInk: resolvedPreviewTheme.hexInk,
        hexMuted: resolvedPreviewTheme.hexMuted,
        hexAccent: resolvedPreviewTheme.hexAccent,
        displayFont: resolvedPreviewTheme.displayFont,
        bodyFont: resolvedPreviewTheme.bodyFont,
        accentStyle: resolvedPreviewTheme.accentStyle,
        cornerStyle: resolvedPreviewTheme.cornerStyle,
      };
      const res = await fetch('/api/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          topic: cleanTopic,
          tone,
          language,
          thinkingDepth,
          currentTheme: refineCurrent ? currentDraft : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.theme) {
        throw new Error(data.error || 'Could not generate a topic-matched theme.');
      }
      const created = normalizeCustomTheme(
        data.theme,
        refineCurrent && activeCustomTheme ? activeCustomTheme.id : undefined
      );
      onSaveCustomTheme(created);
      setTheme(created.id);
      if (refineCurrent) setThemeFeedback('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Theme design failed.');
    } finally {
      setIsDesigningTheme(false);
    }
  };

  const handleNext = () => {
    setLocalError(null);
    if (step === 1 && topic.trim().length < 3) {
      setLocalError('Please enter a presentation topic (at least 3 characters) to continue.');
      return;
    }
    if (step === 2 && !language.trim()) {
      setLocalError('Please choose or type a presentation language.');
      return;
    }
    setStep((prev) => (prev < 4 ? ((prev + 1) as SetupStep) : prev));
  };

  const handleBack = () => {
    setLocalError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as SetupStep) : prev));
  };

  const handleFinishAndOpenStudio = async () => {
    setLocalError(null);
    if (topic.trim().length < 3) {
      setStep(1);
      setLocalError('Please enter a presentation topic.');
      return;
    }
    const combinedNotes = [
      thesis ? `Core Thesis: ${thesis}` : '',
      audienceAngle ? `Audience & Decision: ${audienceAngle}` : '',
      sourceNotes.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    await onGenerateAndOpenStudio({
      topic: topic.trim(),
      language: language.trim() || 'English',
      slideCount,
      tone,
      theme,
      customTheme: activeCustomTheme,
      thinkingDepth,
      sourceNotes: combinedNotes || undefined,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto matrix-grid-bg px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col">
      <div className="max-w-4xl w-full mx-auto space-y-6 my-auto">
        {/* Top Welcome & Direct File / Studio Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              Guided Presentation Setup · Step {step} of 4
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50 tracking-tight">
              Configure Your Deck One Step at a Time
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/75">
              Make each selection below—co-plan with Cortex thinking, design a topic-matched PPTX theme, then open the full Studio editor window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenFileClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Open .pptx / .json</span>
            </button>

            <button
              type="button"
              onClick={onSkipToStudio}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-200 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Open Studio Window</span>
            </button>
          </div>
        </div>

        {/* Interactive 4-Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((item) => {
            const isCurrent = step === item.num;
            const isDone = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  if (item.num <= step || (item.num === 2 && topic.trim().length >= 3)) {
                    setLocalError(null);
                    setStep(item.num);
                  }
                }}
                className={`px-3 py-2.5 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                    : isDone
                      ? 'bg-[#0A160E] border-emerald-700/70 text-emerald-300'
                      : 'bg-[#060E09] border-emerald-900/60 text-emerald-300/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Focused Card for Current Step */}
        <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-5 sm:p-7 space-y-5">
            {(localError || serverError) && (
              <div
                role="alert"
                className="px-4 py-3 text-xs sm:text-sm text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
              >
                {localError || serverError}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="setup-topic-input" className="block text-sm font-semibold text-emerald-50 mb-1">
                    1. What should your presentation cover?
                  </label>
                  <p className="text-xs text-emerald-200/70 mb-2.5">
                    Write your topic in any language, or test Cortex&apos;s thinking before continuing.
                  </p>
                  <textarea
                    id="setup-topic-input"
                    rows={3}
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="e.g., Sovereign AI data centers in Europe, or 日本の再生可能エネルギー戦略..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {TOPIC_STARTERS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setTopic(example);
                        setLocalError(null);
                      }}
                      className="text-left px-3 py-1.5 text-xs text-emerald-100 bg-[#040B07] hover:bg-[#0D1C13] border border-emerald-900/70 rounded-lg transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                {/* Thinking Depth Selection */}
                <div className="pt-2 border-t border-emerald-900/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100">
                      <Brain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Cortex Thinking Depth</span>
                    </span>
                    <button
                      type="button"
                      disabled={isThinkingTopic || topic.trim().length < 3}
                      onClick={() => void handleThinkThroughTopic()}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-45 rounded-lg transition-colors cursor-pointer"
                    >
                      {isThinkingTopic ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          <span>Thinking Through Topic...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Think Through Topic & Draft Plan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {THINKING_DEPTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThinkingDepth(opt.id)}
                        className={`p-2.5 text-left rounded-lg border transition-colors cursor-pointer ${
                          thinkingDepth === opt.id
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                            : 'bg-[#040B07] border-emerald-900/70 text-emerald-200/80 hover:border-emerald-700'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{opt.label}</span>
                        <span className="block text-[11px] opacity-75 mt-0.5">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collaborative Thinking Results + Editable Help/Notes */}
                {(thesis || audienceAngle || thinkTrace || sourceNotes) && (
                  <div className="p-4 bg-[#040B07] border border-emerald-800/70 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-300">
                        Cortex Strategic Plan (Edit below to help guide the deck)
                      </span>
                      {thinkTrace && (
                        <button
                          type="button"
                          onClick={() => setShowTrace((v) => !v)}
                          className="text-[11px] font-medium text-emerald-300/80 hover:text-emerald-100 underline cursor-pointer"
                        >
                          {showTrace ? 'Hide Reasoning Trace' : 'View Reasoning Trace'}
                        </button>
                      )}
                    </div>

                    {showTrace && thinkTrace && (
                      <p className="p-2.5 text-[11px] text-emerald-200/80 bg-[#08110C] border border-emerald-900/60 rounded-lg max-h-28 overflow-y-auto whitespace-pre-wrap">
                        {thinkTrace}
                      </p>
                    )}

                    {thesis && (
                      <div>
                        <label htmlFor="setup-thesis-input" className="block text-[11px] font-medium text-emerald-300/80 mb-1">
                          Central Thesis (Editable)
                        </label>
                        <input
                          id="setup-thesis-input"
                          type="text"
                          value={thesis}
                          onChange={(e) => setThesis(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    )}

                    {audienceAngle && (
                      <div>
                        <label htmlFor="setup-audience-input" className="block text-[11px] font-medium text-emerald-300/80 mb-1">
                          Audience & Decision Focus (Editable)
                        </label>
                        <input
                          id="setup-audience-input"
                          type="text"
                          value={audienceAngle}
                          onChange={(e) => setAudienceAngle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="setup-notes-input" className="block text-xs font-medium text-emerald-200/85 mb-1.5">
                    Your Guidance, Outline, or Key Facts (Optional — help steer Cortex)
                  </label>
                  <textarea
                    id="setup-notes-input"
                    rows={3}
                    value={sourceNotes}
                    onChange={(e) => setSourceNotes(e.target.value)}
                    placeholder="Add bullet constraints, key metrics, preferred sections, or edit the Cortex outline above..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="setup-language-input" className="block text-sm font-semibold text-emerald-50 mb-1">
                    2. Choose Presentation Language
                  </label>
                  <p className="text-xs text-emerald-200/70 mb-3">
                    Pick a preset or type any world language or regional dialect.
                  </p>
                  <input
                    id="setup-language-input"
                    type="text"
                    list="setup-world-languages"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Type any language (e.g., Arabic, Japanese, Azerbaijani)"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                  />
                  <datalist id="setup-world-languages">
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

                <div className="flex flex-wrap gap-2">
                  {QUICK_LANGUAGES.map((preset) => {
                    const active = language.trim().toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLanguage(preset);
                          setLocalError(null);
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
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <span className="block text-sm font-semibold text-emerald-50 mb-2">
                    3. How many slides?
                  </span>
                  <div className="grid grid-cols-4 gap-2 mb-3">
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
                    <label htmlFor="setup-slide-count" className="text-xs text-emerald-300/75 shrink-0">
                      Custom:
                    </label>
                    <input
                      id="setup-slide-count"
                      type="range"
                      min={3}
                      max={12}
                      value={slideCount}
                      onChange={(e) => setSlideCount(Number(e.target.value))}
                      className="flex-1 accent-emerald-400"
                    />
                    <span className="text-xs font-mono tabular-nums font-semibold text-emerald-100 w-16 text-right">
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
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
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
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-emerald-50">
                      4. Choose or Co-Design a PPTX Theme for &ldquo;{topic.trim() || 'Your Topic'}&rdquo;
                    </h2>
                    <p className="text-xs text-emerald-200/70 mt-0.5">
                      Let Cortex invent a visual PowerPoint theme tailored to your topic, then refine or customize it yourself.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isDesigningTheme}
                      onClick={() => void handleDesignOrRefineTheme(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {isDesigningTheme ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Think & Design Theme for Topic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenThemeStudio(activeCustomTheme, topic.trim())}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Open Theme Studio</span>
                    </button>
                  </div>
                </div>

                {/* Theme Grid (Built-in + Saved Custom) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                          className="w-8 h-6 rounded border border-white/15 shrink-0 overflow-hidden"
                          style={{ backgroundColor: `#${t.hexBg}` }}
                          aria-hidden="true"
                        >
                          <span className="block w-full h-1" style={{ backgroundColor: `#${t.hexAccent}` }} />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-emerald-50 truncate">{t.name}</span>
                          <span className="block text-[10px] text-emerald-300/65 truncate">Built-in</span>
                        </div>
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
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-emerald-50 truncate">{t.name}</span>
                          <span className="block text-[10px] text-emerald-300/80 truncate">
                            Custom · {t.accentStyle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Theme Preview + Collaborative Refinement */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-4 bg-[#040B07] border border-emerald-900/70 rounded-xl">
                  <div className="lg:col-span-6 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-100">
                        Active Preview · {resolvedPreviewTheme.name}
                      </span>
                      <span className="font-mono text-emerald-300">
                        Contrast {contrastRatio}:1 ({contrastRating})
                      </span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-emerald-800/80">
                      <SlideRenderer
                        slide={previewSampleSlide}
                        deckTitle={topic.trim() || 'Cortex Deck'}
                        slideIndex={0}
                        totalSlides={slideCount}
                        themeId={theme}
                        customTheme={activeCustomTheme}
                        customThemes={customThemes}
                        rtl={langMeta.rtl}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-3">
                    <label htmlFor="setup-theme-help" className="block text-xs font-semibold text-emerald-100">
                      Help Adjust This Theme (Optional)
                    </label>
                    <p className="text-[11px] text-emerald-200/70 leading-relaxed">
                      Tell Cortex how to adjust colors, mood, fonts, or framing—or click &ldquo;Open Theme Studio&rdquo; to tweak any hex value directly.
                    </p>
                    <div className="flex gap-2">
                      <input
                        id="setup-theme-help"
                        type="text"
                        value={themeFeedback}
                        onChange={(e) => setThemeFeedback(e.target.value)}
                        placeholder="e.g., Make background warm cream with copper accent..."
                        className="flex-1 px-3 py-2 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        disabled={isDesigningTheme || themeFeedback.trim().length < 3}
                        onClick={() => void handleDesignOrRefineTheme(true)}
                        className="px-3 py-2 text-xs font-semibold text-emerald-100 bg-[#0A160E] border border-emerald-700/80 hover:bg-[#112317] disabled:opacity-45 rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Refine Theme
                      </button>
                    </div>
                    {activeCustomTheme?.thinkingSummary && (
                      <p className="text-[11px] text-emerald-300/75 leading-relaxed line-clamp-3">
                        <span className="font-semibold text-emerald-200">Theme Rationale: </span>
                        {activeCustomTheme.thinkingSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step Navigation Footer */}
          <div className="px-5 sm:px-7 py-4 border-t border-emerald-900/70 bg-[#060E09] flex items-center justify-between gap-3">
            {step === 1 ? (
              <span className="text-xs text-emerald-300/70">
                Complete selections 1–4 to open the Studio editor window.
              </span>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  {step === 1
                    ? 'Next: Language'
                    : step === 2
                      ? 'Next: Length & Tone'
                      : 'Next: PPTX Theme'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleFinishAndOpenStudio()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-55 rounded-lg transition-colors cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Thinking & Opening Studio...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    <span>Create Deck & Open Studio Window</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
