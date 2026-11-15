import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Check,
  Download,
  Loader2,
  Palette,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  CustomThemeDefinition,
  Slide,
  ThemeAccentStyle,
  ThemeCornerStyle,
} from '../types/presentation';
import { triggerBlobDownload } from '../utils/exportPptx';
import {
  THEME_FONT_OPTIONS,
  computeContrastRatio,
  getContrastRating,
  normalizeCustomTheme,
  normalizeHex,
} from '../utils/themeLogic';
import { SlideRenderer } from './SlideRenderer';

interface ThemeStudioModalProps {
  open: boolean;
  initialTheme: CustomThemeDefinition;
  sampleSlide: Slide;
  deckTitle: string;
  deckTopic?: string;
  deckTone?: string;
  deckLanguage?: string;
  rtl: boolean;
  savedCustomThemes: CustomThemeDefinition[];
  onClose: () => void;
  onSaveAndApply: (theme: CustomThemeDefinition) => void;
  onDeleteCustomTheme?: (id: string) => void;
}

const AI_THEME_PRESETS = [
  'Tokyo cyber editorial dark with neon cyan accent',
  'Warm terracotta & sand architectural studio',
  'Swiss museum minimal crisp ivory and crimson',
  'Deep ocean slate with gold executive accents',
];

const ACCENT_STYLES: { id: ThemeAccentStyle; label: string }[] = [
  { id: 'top-bar', label: 'Top Bar' },
  { id: 'left-rail', label: 'Left Rail' },
  { id: 'framed', label: 'Framed Border' },
  { id: 'minimal', label: 'Minimal Line' },
];

const CORNER_STYLES: { id: ThemeCornerStyle; label: string }[] = [
  { id: 'rounded', label: 'Rounded Cards' },
  { id: 'sharp', label: 'Sharp Corners' },
];

export function ThemeStudioModal({
  open,
  initialTheme,
  sampleSlide,
  deckTitle,
  deckTopic,
  deckTone,
  deckLanguage,
  rtl,
  savedCustomThemes,
  onClose,
  onSaveAndApply,
  onDeleteCustomTheme,
}: ThemeStudioModalProps) {
  const [draft, setDraft] = useState<CustomThemeDefinition>(initialTheme);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isDesigning, setIsDesigning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showThoughts, setShowThoughts] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialTheme);
      setAiPrompt(deckTopic ? `Match theme to topic: ${deckTopic}` : '');
      setAiError(null);
      setShowThoughts(true);
    }
  }, [open, initialTheme, deckTopic]);

  if (!open) return null;

  const isExistingSaved = savedCustomThemes.some((t) => t.id === draft.id);
  const contrastRatio = computeContrastRatio(draft.hexBg, draft.hexInk);
  const contrastRating = getContrastRating(contrastRatio);

  const updateColor = (
    key: 'hexBg' | 'hexSurface' | 'hexInk' | 'hexMuted' | 'hexAccent',
    value: string
  ) => {
    const clean = value.replace(/^#/, '').toUpperCase();
    setDraft((prev) => ({
      ...prev,
      [key]: clean.slice(0, 6),
    }));
  };

  const commitColor = (
    key: 'hexBg' | 'hexSurface' | 'hexInk' | 'hexMuted' | 'hexAccent',
    fallback: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: normalizeHex(prev[key], fallback),
    }));
  };

  const handleAiDesign = async (customPrompt?: string, refineCurrent = false) => {
    const promptText = (customPrompt ?? aiPrompt).trim();
    if (promptText.length < 3 && (!deckTopic || deckTopic.trim().length < 3)) {
      setAiError('Describe the PPTX theme style or provide a presentation topic.');
      return;
    }
    setIsDesigning(true);
    setAiError(null);
    try {
      const res = await fetch('/api/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          topic: deckTopic,
          tone: deckTone,
          language: deckLanguage,
          currentTheme: refineCurrent ? draft : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.theme) {
        throw new Error(data.error || 'Could not design custom PPTX theme.');
      }
      const nextTheme = normalizeCustomTheme(data.theme, isExistingSaved ? draft.id : undefined);
      setDraft(nextTheme);
      setShowThoughts(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Theme design failed.');
    } finally {
      setIsDesigning(false);
    }
  };

  const handleExportThemeJson = () => {
    const clean = normalizeCustomTheme(draft, draft.id);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const slug =
      clean.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'cortex-theme';
    triggerBlobDownload(blob, `${slug}.theme.json`);
  };

  const handleImportThemeJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<CustomThemeDefinition>;
        const normalized = normalizeCustomTheme(parsed);
        setDraft(normalized);
        setAiError(null);
      } catch {
        setAiError('Invalid theme JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const colorFields: {
    key: 'hexBg' | 'hexSurface' | 'hexInk' | 'hexMuted' | 'hexAccent';
    label: string;
    fallback: string;
  }[] = [
    { key: 'hexBg', label: 'Slide Background', fallback: '040A06' },
    { key: 'hexSurface', label: 'Card Surface', fallback: '0B1911' },
    { key: 'hexInk', label: 'Primary Text', fallback: 'ECFDF5' },
    { key: 'hexMuted', label: 'Muted Text', fallback: 'A7F3D0' },
    { key: 'hexAccent', label: 'Accent & Bars', fallback: '34D399' },
  ];

  const normalizedDraftForPreview = normalizeCustomTheme(draft, draft.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-studio-title"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-emerald-50">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-emerald-900/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
              <Palette className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="theme-studio-title" className="font-display text-base sm:text-lg font-bold text-emerald-50 truncate">
                PPTX Theme Studio
              </h2>
              <p className="text-xs text-emerald-200/70 truncate">
                Co-design, fine-tune, import/export custom PowerPoint themes synced to slides & .pptx/.pdf exports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportThemeJson}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Import JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportThemeJson}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PPTX Theme Studio"
              className="p-2 text-emerald-300/70 hover:text-emerald-50 rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Left Column: AI Co-Designer + Live Preview */}
          <div className="lg:col-span-6 space-y-4">
            {/* AI Theme Architect */}
            <div className="p-4 bg-[#040B07] border border-emerald-900/70 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>AI Theme Architect</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-300/70">
                  Deep Thinking
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label="Describe PPTX theme style or refinement"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe palette, mood, or tell AI how to refine this draft..."
                  className="flex-1 px-3 py-2 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isDesigning}
                    onClick={() => void handleAiDesign(undefined, false)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isDesigning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>New AI Theme</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDesigning}
                    onClick={() => void handleAiDesign(undefined, true)}
                    title="Refine current palette & fonts using your feedback above"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-700/80 hover:bg-[#112317] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Refine Draft</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {AI_THEME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isDesigning}
                    onClick={() => {
                      setAiPrompt(preset);
                      void handleAiDesign(preset, false);
                    }}
                    className="px-2.5 py-1 text-[11px] text-emerald-200/85 bg-[#0A160E] hover:bg-[#112317] border border-emerald-900/70 rounded-md transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {aiError && (
                <div
                  role="alert"
                  className="px-3 py-2 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
                >
                  {aiError}
                </div>
              )}

              {draft.thinkingSummary && (
                <div className="pt-1 border-t border-emerald-900/60">
                  <button
                    type="button"
                    onClick={() => setShowThoughts((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90 hover:text-emerald-200 cursor-pointer"
                  >
                    <Brain className="w-3 h-3" aria-hidden="true" />
                    <span>{showThoughts ? 'Hide AI Design Reasoning' : 'Show AI Design Reasoning'}</span>
                  </button>
                  {showThoughts && (
                    <p className="mt-1.5 text-[11px] text-emerald-200/75 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {draft.thinkingSummary}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Live 16:9 Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-emerald-100">Live 16:9 PPTX Slide Preview</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] border ${
                    contrastRating === 'AAA'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : contrastRating === 'AA'
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}
                >
                  Contrast {contrastRatio}:1 ({contrastRating})
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-emerald-800/80 shadow-lg">
                <SlideRenderer
                  slide={sampleSlide}
                  deckTitle={deckTitle}
                  slideIndex={0}
                  totalSlides={1}
                  themeId={normalizedDraftForPreview.id}
                  customTheme={normalizedDraftForPreview}
                  rtl={rtl}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Manual Fine-Tuning Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="theme-name-input" className="block text-xs font-medium text-emerald-200/85 mb-1">
                  Theme Name
                </label>
                <input
                  id="theme-name-input"
                  type="text"
                  maxLength={48}
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label htmlFor="theme-desc-input" className="block text-xs font-medium text-emerald-200/85 mb-1">
                  Style Summary
                </label>
                <input
                  id="theme-desc-input"
                  type="text"
                  maxLength={140}
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* 5-Token Color Palette */}
            <div className="p-4 bg-[#040B07] border border-emerald-900/70 rounded-xl space-y-3">
              <span className="block text-xs font-semibold text-emerald-100">
                Color Palette Tokens (Synced with PPTX & PDF)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {colorFields.map((field) => {
                  const safePickerHex = `#${normalizeHex(draft[field.key], field.fallback)}`;
                  return (
                    <div
                      key={field.key}
                      className="flex items-center gap-2.5 p-2 bg-[#0A160E] border border-emerald-900/70 rounded-lg"
                    >
                      <input
                        type="color"
                        aria-label={`${field.label} color picker`}
                        value={safePickerHex}
                        onChange={(e) => updateColor(field.key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`hex-${field.key}`}
                          className="block text-[11px] font-medium text-emerald-200/80 truncate"
                        >
                          {field.label}
                        </label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-mono text-emerald-400/70">#</span>
                          <input
                            id={`hex-${field.key}`}
                            type="text"
                            maxLength={6}
                            value={draft[field.key]}
                            onChange={(e) => updateColor(field.key, e.target.value)}
                            onBlur={() => commitColor(field.key, field.fallback)}
                            className="w-full text-xs font-mono uppercase bg-transparent text-emerald-50 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Typography */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="theme-display-font" className="block text-xs font-medium text-emerald-200/85 mb-1">
                  Display / Heading Font
                </label>
                <select
                  id="theme-display-font"
                  value={draft.displayFont}
                  onChange={(e) => setDraft((prev) => ({ ...prev, displayFont: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                >
                  {THEME_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="theme-body-font" className="block text-xs font-medium text-emerald-200/85 mb-1">
                  Body Copy Font
                </label>
                <select
                  id="theme-body-font"
                  value={draft.bodyFont}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bodyFont: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 focus:outline-none focus:border-emerald-400"
                >
                  {THEME_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PPTX Accent Geometry & Card Corner Radius */}
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-medium text-emerald-200/85 mb-1.5">
                  PPTX Architectural Accent Geometry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACCENT_STYLES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, accentStyle: opt.id }))}
                      className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        draft.accentStyle === opt.id
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                          : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-emerald-200/85 mb-1.5">
                  Card & Frame Corner Style
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {CORNER_STYLES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, cornerStyle: opt.id }))}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        draft.cornerStyle === opt.id
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                          : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved Custom Themes Switcher */}
            {savedCustomThemes.length > 0 && (
              <div className="pt-2 border-t border-emerald-900/70 space-y-2">
                <span className="block text-xs font-medium text-emerald-300/80">
                  Saved Custom Themes ({savedCustomThemes.length})
                </span>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {savedCustomThemes.map((saved) => (
                    <button
                      key={saved.id}
                      type="button"
                      onClick={() => setDraft(saved)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                        draft.id === saved.id
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100 font-semibold'
                          : 'border-emerald-900/70 bg-[#0A160E] text-emerald-200/85 hover:border-emerald-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                        style={{ backgroundColor: `#${saved.hexBg}`, boxShadow: `inset 0 2px 0 #${saved.hexAccent}` }}
                      />
                      <span className="truncate max-w-[10rem]">{saved.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-emerald-900/70 bg-[#060E09] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {isExistingSaved && onDeleteCustomTheme && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomTheme(draft.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-200 bg-red-950/60 border border-red-800/70 rounded-lg hover:bg-red-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Theme</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const finalTheme = normalizeCustomTheme(draft, draft.id);
              onSaveAndApply(finalTheme);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save & Apply PPTX Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
}
