import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Brain,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Download,
  FileDown,
  FileText,
  FolderOpen,
  Languages,
  Loader2,
  Palette,
  Plus,
  Sparkles,
} from 'lucide-react';
import { STARTER_DECKS } from './data/starterDecks';
import type {
  CustomThemeDefinition,
  DeckThemeId,
  GenerateDeckPayload,
  LanguageOption,
  PresentationDeck,
  Slide,
  SlideLayout,
  ThinkingDepth,
} from './types/presentation';
import {
  DECK_THEMES,
  createBlankSlide,
  deleteSlide,
  duplicateSlide,
  reorderSlides,
} from './utils/deckLogic';
import {
  type ExportArtifact,
  exportDeckJson,
  exportDeckToPptx,
} from './utils/exportPptx';
import { exportDeckToPdf } from './utils/exportPdf';
import { importPresentationOrThemeFile } from './utils/importFiles';
import {
  deleteCloudDeck,
  deleteCloudTheme,
  saveCloudDeck,
  saveCloudTheme,
  signInWithGoogleCloud,
  signOutCloud,
  subscribeAuthState,
  subscribeCloudDecks,
  subscribeCloudThemes,
} from './utils/cloudSync';
import { normalizeCustomTheme, resolveDeckTheme } from './utils/themeLogic';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import { StepByStepSetup } from './components/StepByStepSetup';
import { CloudLibraryPanel } from './components/CloudLibraryPanel';
import { ThemeStudioModal } from './components/ThemeStudioModal';
import { SlideRail } from './components/SlideRail';
import { SlideRenderer } from './components/SlideRenderer';
import { SlideInspector } from './components/SlideInspector';
import { GeneratorModal } from './components/GeneratorModal';
import { TranslateModal } from './components/TranslateModal';
import { TemplatesGallery } from './components/TemplatesGallery';
import { LanguagesDirectory } from './components/LanguagesDirectory';
import { PresenterOverlay } from './components/PresenterOverlay';
import { SlidePhotoModal } from './components/SlidePhotoModal';

const ACTIVE_DECK_STORAGE_KEY = 'cortex.activeDeck.v2';
const CUSTOM_THEMES_STORAGE_KEY = 'cortex.customThemes.v1';

function loadInitialDeck(): PresentationDeck {
  try {
    const raw = window.localStorage.getItem(ACTIVE_DECK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PresentationDeck;
      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall back to deterministic starter deck
  }
  return STARTER_DECKS[0];
}

function loadLocalCustomThemes(): CustomThemeDefinition[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CustomThemeDefinition>[];
      if (Array.isArray(parsed)) {
        return parsed.map((t) => normalizeCustomTheme(t, t.id));
      }
    }
  } catch {
    // Ignore invalid storage
  }
  return [];
}

function mergeCustomThemes(
  primary: CustomThemeDefinition[],
  secondary: CustomThemeDefinition[]
): CustomThemeDefinition[] {
  const map = new Map<string, CustomThemeDefinition>();
  for (const t of secondary) {
    map.set(t.id, t);
  }
  for (const t of primary) {
    map.set(t.id, t);
  }
  return Array.from(map.values());
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('setup');
  const [deck, setDeck] = useState<PresentationDeck>(loadInitialDeck);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [localCustomThemes, setLocalCustomThemes] = useState<CustomThemeDefinition[]>(
    loadLocalCustomThemes
  );
  const [cloudCustomThemes, setCloudCustomThemes] = useState<CustomThemeDefinition[]>([]);

  // Cloud auth & Firestore state
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudAuthLoading, setCloudAuthLoading] = useState(true);
  const [cloudDecks, setCloudDecks] = useState<PresentationDeck[]>([]);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudSaveSuccess, setCloudSaveSuccess] = useState<string | null>(null);

  // Modals & Studio UI state
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorInitialLang, setGeneratorInitialLang] = useState<string | undefined>();
  const [generatorInitialTopic, setGeneratorInitialTopic] = useState<string | undefined>();

  const [themeStudioOpen, setThemeStudioOpen] = useState(false);
  const [themeStudioSeed, setThemeStudioSeed] = useState<CustomThemeDefinition | undefined>();
  const [themeStudioTopic, setThemeStudioTopic] = useState<string | undefined>();

  const [translateOpen, setTranslateOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [showAiReasoning, setShowAiReasoning] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [lastExport, setLastExport] = useState<ExportArtifact | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const customThemes = useMemo(() => {
    const merged = mergeCustomThemes(cloudCustomThemes, localCustomThemes);
    if (deck.customTheme) {
      return mergeCustomThemes([deck.customTheme], merged);
    }
    return merged;
  }, [cloudCustomThemes, localCustomThemes, deck.customTheme]);

  // Persist active deck locally
  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_DECK_STORAGE_KEY, JSON.stringify(deck));
    } catch {
      // Ignore storage quota errors
    }
  }, [deck]);

  // Persist local custom themes
  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(localCustomThemes));
    } catch {
      // Ignore storage quota errors
    }
  }, [localCustomThemes]);

  // Clamp active slide index
  useEffect(() => {
    if (activeSlideIndex >= deck.slides.length) {
      setActiveSlideIndex(Math.max(0, deck.slides.length - 1));
    }
  }, [deck.slides.length, activeSlideIndex]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setCloudUser(user);
      setCloudAuthLoading(false);
      if (!user) {
        setCloudDecks([]);
        setCloudCustomThemes([]);
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to Firestore decks & custom themes when signed in
  useEffect(() => {
    if (!cloudUser) return;
    const unsubDecks = subscribeCloudDecks(
      cloudUser.uid,
      (decks) => {
        setCloudDecks(decks);
      },
      (err) => {
        setCloudError(err.message);
      }
    );
    const unsubThemes = subscribeCloudThemes(
      cloudUser.uid,
      (themes) => {
        setCloudCustomThemes(themes);
      },
      (err) => {
        setCloudError(err.message);
      }
    );
    return () => {
      unsubDecks();
      unsubThemes();
    };
  }, [cloudUser]);

  const activeSlide = deck.slides[activeSlideIndex] ?? deck.slides[0];

  const handleSaveCustomTheme = (rawTheme: CustomThemeDefinition) => {
    const normalized = normalizeCustomTheme(rawTheme, rawTheme.id);
    setLocalCustomThemes((prev) => mergeCustomThemes([normalized], prev));
    if (cloudUser) {
      void saveCloudTheme(cloudUser.uid, normalized).catch((err) => {
        setCloudError(err instanceof Error ? err.message : 'Failed to sync custom theme to cloud.');
      });
    }
  };

  const handleApplyCustomTheme = (rawTheme: CustomThemeDefinition) => {
    const normalized = normalizeCustomTheme(rawTheme, rawTheme.id);
    handleSaveCustomTheme(normalized);
    setDeck((prev) => ({
      ...prev,
      theme: normalized.id,
      customTheme: normalized,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    setLocalCustomThemes((prev) => prev.filter((t) => t.id !== themeId));
    if (deck.theme === themeId) {
      setDeck((prev) => ({
        ...prev,
        theme: 'neon-aurora',
        customTheme: undefined,
        updatedAt: new Date().toISOString(),
      }));
    }
    if (cloudUser) {
      void deleteCloudTheme(cloudUser.uid, themeId).catch((err) => {
        setCloudError(err instanceof Error ? err.message : 'Failed to delete cloud theme.');
      });
    }
  };

  const handleOpenThemeStudio = (seedTheme?: CustomThemeDefinition, topicContext?: string) => {
    const fallbackResolved = resolveDeckTheme(deck.theme, customThemes, deck.customTheme);
    const seed: CustomThemeDefinition = seedTheme
      ? normalizeCustomTheme(seedTheme, seedTheme.id)
      : {
          id: fallbackResolved.isCustom ? fallbackResolved.id : `custom-${Date.now().toString(36)}`,
          name: fallbackResolved.isCustom ? fallbackResolved.name : `${fallbackResolved.name} Remix`,
          description: fallbackResolved.description,
          hexBg: fallbackResolved.hexBg,
          hexSurface: fallbackResolved.hexSurface,
          hexInk: fallbackResolved.hexInk,
          hexMuted: fallbackResolved.hexMuted,
          hexAccent: fallbackResolved.hexAccent,
          displayFont: fallbackResolved.displayFont,
          bodyFont: fallbackResolved.bodyFont,
          accentStyle: fallbackResolved.accentStyle,
          cornerStyle: fallbackResolved.cornerStyle,
          thinkingSummary: deck.customTheme?.thinkingSummary,
        };
    setThemeStudioSeed(seed);
    setThemeStudioTopic(topicContext ?? deck.title);
    setThemeStudioOpen(true);
  };

  const handleSignIn = async () => {
    setCloudError(null);
    setCloudAuthLoading(true);
    try {
      await signInWithGoogleCloud();
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setCloudAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setCloudError(null);
    try {
      await signOutCloud();
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Sign-Out failed.');
    }
  };

  const handleSaveActiveDeckToCloud = async () => {
    if (!cloudUser) {
      setActiveTab('cloud');
      setCloudError('Sign in with Google to save presentations to your cloud library.');
      return;
    }
    setIsSavingCloud(true);
    setCloudError(null);
    setCloudSaveSuccess(null);
    try {
      const saved = await saveCloudDeck(cloudUser.uid, deck);
      setDeck((prev) => ({
        ...prev,
        id: saved.id,
        updatedAt: saved.updatedAt,
      }));
      if (deck.customTheme) {
        await saveCloudTheme(cloudUser.uid, deck.customTheme);
      }
      setCloudSaveSuccess(`Saved "${saved.title}" to Cloud`);
      window.setTimeout(() => setCloudSaveSuccess(null), 4000);
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Failed to save presentation to cloud.');
      setApiError(err instanceof Error ? err.message : 'Failed to save presentation to cloud.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleOpenCloudDeck = (cloudDeck: PresentationDeck) => {
    if (cloudDeck.customTheme) {
      handleSaveCustomTheme(cloudDeck.customTheme);
    }
    setDeck(cloudDeck);
    setActiveSlideIndex(0);
    setActiveTab('studio');
  };

  const handleDeleteCloudDeck = async (deckId: string) => {
    if (!cloudUser) return;
    setCloudError(null);
    try {
      await deleteCloudDeck(cloudUser.uid, deckId);
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Failed to delete presentation from cloud.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingFile(true);
    setApiError(null);
    setCloudError(null);
    try {
      const imported = await importPresentationOrThemeFile(file);
      if (imported.kind === 'deck') {
        if (imported.deck.customTheme) {
          handleSaveCustomTheme(imported.deck.customTheme);
        }
        setDeck(imported.deck);
        setActiveSlideIndex(0);
        setActiveTab('studio');
      } else {
        handleApplyCustomTheme(imported.theme);
        setActiveTab('studio');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not open file. Please check the format.';
      setApiError(message);
      setCloudError(message);
    } finally {
      setIsImportingFile(false);
    }
  };

  const handleUpdateSlide = (updated: Slide) => {
    setDeck((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      slides: prev.slides.map((s, idx) => (idx === activeSlideIndex ? updated : s)),
    }));
  };

  const handleAddSlide = (layout: SlideLayout) => {
    const newSlide = createBlankSlide(layout, deck.rtl);
    setDeck((prev) => {
      const nextSlides = [...prev.slides];
      nextSlides.splice(activeSlideIndex + 1, 0, newSlide);
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        slides: nextSlides,
      };
    });
    setActiveSlideIndex(activeSlideIndex + 1);
  };

  const handleDuplicateSlide = (index: number) => {
    setDeck((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      slides: duplicateSlide(prev.slides, index),
    }));
    setActiveSlideIndex(index + 1);
  };

  const handleDeleteSlide = (index: number) => {
    if (deck.slides.length <= 1) return;
    setDeck((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      slides: deleteSlide(prev.slides, index),
    }));
    if (activeSlideIndex >= index && activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
  };

  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    setDeck((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      slides: reorderSlides(prev.slides, fromIndex, toIndex),
    }));
    if (activeSlideIndex === fromIndex) {
      setActiveSlideIndex(toIndex);
    } else if (activeSlideIndex === toIndex) {
      setActiveSlideIndex(fromIndex);
    }
  };

  const handleGenerateDeck = async (payload: GenerateDeckPayload) => {
    setIsGenerating(true);
    setApiError(null);
    try {
      const res = await fetch('/api/presentations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate presentation.');
      }
      const generated: PresentationDeck = data.deck;
      if (generated.customTheme) {
        handleSaveCustomTheme(generated.customTheme);
      }
      setDeck(generated);
      setActiveSlideIndex(0);
      setShowAiReasoning(Boolean(generated.thinkingSummary));
      setGeneratorOpen(false);
      setActiveTab('studio');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Generation request failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTranslateDeck = async (targetLanguage: string) => {
    setIsTranslating(true);
    setApiError(null);
    try {
      const res = await fetch('/api/presentations/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck, targetLanguage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not translate presentation.');
      }
      setDeck(data.deck);
      setTranslateOpen(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Translation request failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRefineSlide = async (instruction: string, thinkingDepth?: ThinkingDepth) => {
    setIsRefining(true);
    setApiError(null);
    try {
      const res = await fetch('/api/presentations/refine-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide: activeSlide,
          deckTitle: deck.title,
          language: deck.language,
          rtl: deck.rtl,
          instruction,
          thinkingDepth,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not refine slide.');
      }
      handleUpdateSlide(data.slide);
      if (data.thinkingSummary) {
        setDeck((prev) => ({
          ...prev,
          thinkingSummary: data.thinkingSummary,
        }));
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Slide refinement failed.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleExportPptx = async (targetDeck: PresentationDeck = deck) => {
    setIsExportingPptx(true);
    setApiError(null);
    try {
      const artifact = await exportDeckToPptx(targetDeck, customThemes);
      setLastExport(artifact);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to export PPTX.');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportPdf = async (targetDeck: PresentationDeck = deck) => {
    setIsExportingPdf(true);
    setApiError(null);
    try {
      const artifact = await exportDeckToPdf(targetDeck, customThemes);
      setLastExport(artifact);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to export PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportJson = () => {
    setApiError(null);
    const artifact = exportDeckJson(deck);
    setLastExport(artifact);
  };

  const handleOpenTemplate = (templateDeck: PresentationDeck) => {
    setDeck({
      ...templateDeck,
      updatedAt: new Date().toISOString(),
    });
    setActiveSlideIndex(0);
    setActiveTab('studio');
  };

  const handleCreateInLanguage = (lang: LanguageOption) => {
    setGeneratorInitialLang(lang.name);
    setGeneratorInitialTopic(lang.sampleTopic);
    setApiError(null);
    setGeneratorOpen(true);
  };

  const openBlankGenerator = () => {
    setGeneratorInitialLang(deck.language);
    setGeneratorInitialTopic('');
    setApiError(null);
    setGeneratorOpen(true);
  };

  const handleThemeSelect = (nextThemeId: DeckThemeId) => {
    const matchedCustom = customThemes.find((t) => t.id === nextThemeId);
    setDeck((prev) => ({
      ...prev,
      theme: nextThemeId,
      customTheme: matchedCustom,
      updatedAt: new Date().toISOString(),
    }));
  };

  const triggerOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const builtInThemes = Object.values(DECK_THEMES);

  return (
    <div className="min-h-screen flex flex-col bg-[#030805] text-emerald-50">
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Open .pptx, .json presentation, or .theme.json file"
        accept=".pptx,.json,application/json,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={handleImportFile}
        className="sr-only"
      />

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStartPresent={() => setPresenting(true)}
        cloudUser={cloudUser}
        cloudAuthLoading={cloudAuthLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {activeTab === 'setup' && (
        <StepByStepSetup
          initialTopic={generatorInitialTopic}
          initialLanguage={generatorInitialLang || deck.language}
          customThemes={customThemes}
          isGenerating={isGenerating}
          serverError={apiError}
          onGenerateAndOpenStudio={handleGenerateDeck}
          onSaveCustomTheme={handleSaveCustomTheme}
          onOpenThemeStudio={handleOpenThemeStudio}
          onSkipToStudio={() => setActiveTab('studio')}
          onOpenFileClick={triggerOpenFileDialog}
        />
      )}

      {activeTab === 'studio' && (
        <div className="flex-1 lg:flex-none flex flex-col min-h-0 lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] lg:overflow-hidden">
          {/* Studio Workspace Toolbar */}
          <div className="no-print bg-[#060E09] border-b border-emerald-900/70 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
              <label htmlFor="deck-title-inline" className="sr-only">
                Presentation Title
              </label>
              <input
                id="deck-title-inline"
                type="text"
                dir={deck.rtl ? 'rtl' : 'ltr'}
                value={deck.title}
                onChange={(e) =>
                  setDeck((prev) => ({
                    ...prev,
                    title: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                className="font-display text-sm sm:text-base font-semibold text-emerald-50 bg-transparent border border-transparent hover:border-emerald-800/80 focus:border-emerald-400 focus:bg-[#030805] rounded-md px-2 py-1 w-full sm:max-w-md truncate focus:outline-none"
              />

              <div className="flex items-center gap-2 text-xs text-emerald-300/70 px-2 sm:px-0 shrink-0">
                <span className="font-medium text-emerald-100">{deck.language}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setDeck((prev) => ({
                      ...prev,
                      rtl: !prev.rtl,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  title="Toggle text direction (LTR / RTL)"
                  className="font-mono text-emerald-300 hover:text-emerald-100 underline decoration-emerald-700 underline-offset-2 cursor-pointer"
                >
                  {deck.rtl ? 'RTL' : 'LTR'}
                </button>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{deck.slides.length} slides</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label htmlFor="workspace-theme-select" className="sr-only">
                Deck Theme
              </label>
              <select
                id="workspace-theme-select"
                value={deck.theme}
                onChange={(e) => handleThemeSelect(e.target.value as DeckThemeId)}
                className="px-2.5 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg focus:outline-none focus:border-emerald-400"
              >
                <optgroup label="Built-in Themes">
                  {builtInThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                {customThemes.length > 0 && (
                  <optgroup label="Custom PPTX Themes">
                    {customThemes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                type="button"
                onClick={() => handleOpenThemeStudio()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Theme Studio</span>
              </button>

              <button
                type="button"
                disabled={isImportingFile}
                onClick={triggerOpenFileDialog}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isImportingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" aria-hidden="true" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                )}
                <span>Open File</span>
              </button>

              <button
                type="button"
                disabled={isSavingCloud}
                onClick={() => void handleSaveActiveDeckToCloud()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSavingCloud ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" aria-hidden="true" />
                ) : cloudSaveSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                )}
                <span>{cloudSaveSuccess ? 'Synced' : 'Save Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={openBlankGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>New AI Deck</span>
              </button>

              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setApiError(null);
                  setTranslateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Translate</span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportPptx(deck)}
                disabled={isExportingPptx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isExportingPptx ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Export .pptx</span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportPdf(deck)}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Export .pdf</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                aria-label="Download JSON deck"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-200 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden xl:inline">JSON</span>
              </button>
            </div>
          </div>

          {apiError && !generatorOpen && !translateOpen && (
            <div
              role="alert"
              className="mx-6 mt-3 px-4 py-2.5 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg flex items-center justify-between gap-4 shrink-0"
            >
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="font-semibold underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {lastExport && (
            <div className="mx-6 mt-3 px-4 py-2 text-xs text-emerald-100 bg-emerald-950/70 border border-emerald-700/70 rounded-lg flex items-center justify-between gap-4 shrink-0">
              <span className="truncate">
                Exported <strong className="font-mono text-emerald-300">{lastExport.filename}</strong>
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={lastExport.blobUrl}
                  download={lastExport.filename}
                  className="font-semibold text-emerald-300 hover:text-emerald-100 underline"
                >
                  Download again
                </a>
                <button
                  type="button"
                  onClick={() => setLastExport(null)}
                  className="text-emerald-300/75 hover:text-emerald-100 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Main 3-Pane Studio */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <SlideRail
              slides={deck.slides}
              activeSlideIndex={activeSlideIndex}
              deckTitle={deck.title}
              themeId={deck.theme}
              customTheme={deck.customTheme}
              customThemes={customThemes}
              rtl={deck.rtl}
              onSelectSlide={setActiveSlideIndex}
              onAddSlide={handleAddSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onDeleteSlide={handleDeleteSlide}
              onMoveSlide={handleMoveSlide}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center matrix-grid-bg overflow-y-auto min-w-0 min-h-0">
              <div className="w-full max-w-4xl space-y-4 my-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300/75">
                  <span className="whitespace-nowrap">
                    Canvas Preview · {deck.language} ({deck.rtl ? 'Right-to-Left' : 'Left-to-Right'})
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddSlide('metric')}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      <span>Metric Slide</span>
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => handleAddSlide('image-focus')}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      <span>Photo Slide</span>
                    </button>
                  </div>
                </div>

                <div
                  data-testid="active-slide-stage"
                  className="rounded-xl overflow-hidden border border-emerald-800/80 shadow-sm bg-[#040A06] relative"
                >
                  {isRefining && (
                    <div className="absolute inset-0 z-10 bg-[#030805]/80 flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#08110C] border border-emerald-800 rounded-lg shadow-sm text-xs font-medium text-emerald-100">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" aria-hidden="true" />
                        <span>Refining slide in {deck.language}...</span>
                      </div>
                    </div>
                  )}
                  <SlideRenderer
                    slide={activeSlide}
                    deckTitle={deck.title}
                    slideIndex={activeSlideIndex}
                    totalSlides={deck.slides.length}
                    themeId={deck.theme}
                    customTheme={deck.customTheme}
                    customThemes={customThemes}
                    rtl={deck.rtl}
                  />
                </div>

                {activeSlide.speakerNotes && (
                  <div className="bg-[#060E09] border border-emerald-900/70 rounded-lg px-4 py-3 space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-300/80">
                      Speaker Notes
                    </div>
                    <p
                      dir={deck.rtl ? 'rtl' : 'ltr'}
                      className="text-xs text-emerald-100/90 leading-relaxed"
                    >
                      {activeSlide.speakerNotes}
                    </p>
                  </div>
                )}

                {deck.thinkingSummary && (
                  <div className="bg-[#060E09] border border-emerald-900/70 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAiReasoning((v) => !v)}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-emerald-300/90 hover:text-emerald-100 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>AI Reasoning &amp; Editorial Strategy</span>
                      </span>
                      {showAiReasoning ? (
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    {showAiReasoning && (
                      <div className="px-4 pb-3 pt-1 border-t border-emerald-900/60 text-xs text-emerald-100/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {deck.thinkingSummary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>

            <SlideInspector
              slide={activeSlide}
              slideIndex={activeSlideIndex}
              language={deck.language}
              rtl={deck.rtl}
              isRefining={isRefining}
              onUpdateSlide={handleUpdateSlide}
              onRefineSlide={handleRefineSlide}
              onOpenPhotoModal={() => setPhotoModalOpen(true)}
            />
          </div>
        </div>
      )}

      {activeTab === 'cloud' && (
        <CloudLibraryPanel
          user={cloudUser}
          authLoading={cloudAuthLoading}
          isSavingDeck={isSavingCloud}
          cloudDecks={cloudDecks}
          cloudThemes={customThemes}
          activeDeck={deck}
          cloudError={cloudError}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
          onSaveActiveDeck={() => void handleSaveActiveDeckToCloud()}
          onOpenDeck={handleOpenCloudDeck}
          onDeleteDeck={(id) => void handleDeleteCloudDeck(id)}
          onApplyTheme={(t) => {
            handleApplyCustomTheme(t);
            setActiveTab('studio');
          }}
          onDeleteTheme={handleDeleteCustomTheme}
          onOpenThemeStudio={(t) => handleOpenThemeStudio(t)}
          onImportFileClick={triggerOpenFileDialog}
          onExportPptx={(d) => void handleExportPptx(d)}
          onExportPdf={(d) => void handleExportPdf(d)}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesGallery
          decks={STARTER_DECKS}
          onLoadDeck={handleOpenTemplate}
          onOpenGenerator={openBlankGenerator}
        />
      )}

      {activeTab === 'languages' && (
        <LanguagesDirectory onCreateInLanguage={handleCreateInLanguage} />
      )}

      <GeneratorModal
        open={generatorOpen}
        initialLanguage={generatorInitialLang}
        initialTopic={generatorInitialTopic}
        customThemes={customThemes}
        isGenerating={isGenerating}
        serverError={apiError}
        onClose={() => setGeneratorOpen(false)}
        onGenerate={handleGenerateDeck}
        onSaveCustomTheme={handleSaveCustomTheme}
        onOpenThemeStudio={(topicCtx) => handleOpenThemeStudio(undefined, topicCtx)}
      />

      {themeStudioSeed && (
        <ThemeStudioModal
          open={themeStudioOpen}
          initialTheme={themeStudioSeed}
          sampleSlide={activeSlide}
          deckTitle={deck.title}
          deckTopic={themeStudioTopic}
          deckTone={deck.tone}
          deckLanguage={deck.language}
          rtl={deck.rtl}
          savedCustomThemes={customThemes}
          onClose={() => setThemeStudioOpen(false)}
          onSaveAndApply={handleApplyCustomTheme}
          onDeleteCustomTheme={handleDeleteCustomTheme}
        />
      )}

      <TranslateModal
        open={translateOpen}
        currentLanguage={deck.language}
        slideCount={deck.slides.length}
        isTranslating={isTranslating}
        serverError={apiError}
        onClose={() => setTranslateOpen(false)}
        onTranslate={handleTranslateDeck}
      />

      <SlidePhotoModal
        open={photoModalOpen}
        slideTitle={activeSlide.title}
        language={deck.language}
        themeId={deck.theme}
        customTheme={deck.customTheme ?? customThemes.find((t) => t.id === deck.theme)}
        currentImage={activeSlide.image}
        onClose={() => setPhotoModalOpen(false)}
        onAttachImage={(image) =>
          handleUpdateSlide({
            ...activeSlide,
            image,
          })
        }
      />

      {presenting && (
        <PresenterOverlay
          deck={deck}
          customThemes={customThemes}
          initialSlideIndex={activeSlideIndex}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
}
