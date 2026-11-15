import {
  Cloud,
  CloudUpload,
  FileDown,
  FileText,
  FolderOpen,
  LogIn,
  LogOut,
  Palette,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CustomThemeDefinition, PresentationDeck } from '../types/presentation';
import { resolveDeckTheme } from '../utils/themeLogic';

interface CloudLibraryPanelProps {
  user: User | null;
  authLoading: boolean;
  isSavingDeck: boolean;
  cloudDecks: PresentationDeck[];
  cloudThemes: CustomThemeDefinition[];
  activeDeck: PresentationDeck;
  cloudError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSaveActiveDeck: () => void;
  onOpenDeck: (deck: PresentationDeck) => void;
  onDeleteDeck: (deckId: string) => void;
  onApplyTheme: (theme: CustomThemeDefinition) => void;
  onDeleteTheme: (themeId: string) => void;
  onOpenThemeStudio: (theme?: CustomThemeDefinition) => void;
  onImportFileClick: () => void;
  onExportPptx: (deck: PresentationDeck) => void;
  onExportPdf: (deck: PresentationDeck) => void;
}

export function CloudLibraryPanel({
  user,
  authLoading,
  isSavingDeck,
  cloudDecks,
  cloudThemes,
  activeDeck,
  cloudError,
  onSignIn,
  onSignOut,
  onSaveActiveDeck,
  onOpenDeck,
  onDeleteDeck,
  onApplyTheme,
  onDeleteTheme,
  onOpenThemeStudio,
  onImportFileClick,
  onExportPptx,
  onExportPdf,
}: CloudLibraryPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 matrix-grid-bg">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cloud Workspace Header */}
        <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Cloud className="w-4 h-4" aria-hidden="true" />
              <span>Cortex Cloud Workspace</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-emerald-50">
              {user ? `Synced Library · ${user.displayName || 'Creator'}` : 'Save & Sync Presentations in the Cloud'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/75 max-w-2xl">
              {user
                ? 'Your presentations and custom PPTX themes are backed up securely to Firestore across devices and sessions.'
                : 'Sign in with Google to save unlimited presentations, custom PowerPoint themes, and AI reasoning notes across sessions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onImportFileClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Open .pptx / .json</span>
            </button>

            {user ? (
              <>
                <button
                  type="button"
                  disabled={isSavingDeck}
                  onClick={onSaveActiveDeck}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isSavingDeck ? 'Saving...' : 'Save Active Deck to Cloud'}</span>
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-200 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={authLoading}
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{authLoading ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {cloudError && (
          <div
            role="alert"
            className="px-4 py-3 text-xs text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
          >
            {cloudError}
          </div>
        )}

        {!user ? (
          <div className="bg-[#08110C] border border-emerald-900/70 rounded-xl p-8 text-center space-y-3">
            <Cloud className="w-9 h-9 text-emerald-400/70 mx-auto" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-emerald-50">
              Sign in to access your Cloud Decks & Custom PPTX Themes
            </h2>
            <p className="text-xs text-emerald-200/75 max-w-md mx-auto leading-relaxed">
              Your current draft remains saved locally in this browser. Signing in with Google lets you persist decks and themes in the cloud and open them anywhere.
            </p>
            <div className="pt-2">
              <button
                type="button"
                disabled={authLoading}
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Saved Cloud Presentations */}
            <section className="lg:col-span-7 bg-[#08110C] border border-emerald-900/70 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-emerald-50">
                  Cloud Presentations ({cloudDecks.length})
                </h2>
                <span className="text-[11px] font-mono text-emerald-300/70">
                  Active: {activeDeck.title}
                </span>
              </div>

              {cloudDecks.length === 0 ? (
                <div className="p-6 border border-dashed border-emerald-900/70 rounded-lg text-center space-y-2 bg-[#040B07]">
                  <p className="text-xs text-emerald-200/75">
                    No presentations saved in your cloud library yet. Click &ldquo;Save Active Deck to Cloud&rdquo; above to back up your current deck.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cloudDecks.map((d) => {
                    const resolvedTheme = resolveDeckTheme(d.theme, cloudThemes, d.customTheme);
                    const isCurrent = d.id === activeDeck.id;
                    return (
                      <div
                        key={d.id}
                        className={`p-3.5 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-emerald-950/40 border-emerald-500/60'
                            : 'bg-[#040B07] border-emerald-900/70 hover:border-emerald-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-8 h-6 rounded border border-white/15 shrink-0 relative overflow-hidden"
                            style={{ backgroundColor: `#${resolvedTheme.hexBg}` }}
                            aria-hidden="true"
                          >
                            <span
                              className="block w-full h-1"
                              style={{ backgroundColor: `#${resolvedTheme.hexAccent}` }}
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-50 truncate">{d.title}</p>
                            <p className="text-[11px] text-emerald-300/75 truncate">
                              {d.language} · {d.slides.length} slides · {resolvedTheme.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenDeck(d)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#020A05] bg-emerald-500 hover:bg-emerald-400 rounded-md transition-colors cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => onExportPptx(d)}
                            title="Export .pptx"
                            aria-label={`Export ${d.title} as PowerPoint`}
                            className="p-1.5 text-emerald-200 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-md cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onExportPdf(d)}
                            title="Export .pdf"
                            aria-label={`Export ${d.title} as PDF`}
                            className="p-1.5 text-emerald-200 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-md cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDeck(d.id)}
                            aria-label={`Delete ${d.title} from cloud`}
                            className="p-1.5 text-emerald-300/70 hover:text-red-300 bg-[#0A160E] border border-emerald-900/70 hover:bg-red-950/50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Saved Cloud PPTX Themes */}
            <section className="lg:col-span-5 bg-[#08110C] border border-emerald-900/70 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-emerald-50">
                  Cloud PPTX Themes ({cloudThemes.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenThemeStudio()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New Theme</span>
                </button>
              </div>

              {cloudThemes.length === 0 ? (
                <div className="p-6 border border-dashed border-emerald-900/70 rounded-lg text-center space-y-2 bg-[#040B07]">
                  <p className="text-xs text-emerald-200/75">
                    Custom PPTX themes you design or import will automatically sync here when signed in.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cloudThemes.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-emerald-900/70 bg-[#040B07] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-5 rounded border border-white/15 shrink-0 overflow-hidden"
                          style={{ backgroundColor: `#${t.hexBg}` }}
                          aria-hidden="true"
                        >
                          <span className="block w-full h-1" style={{ backgroundColor: `#${t.hexAccent}` }} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-50 truncate">{t.name}</p>
                          <p className="text-[11px] text-emerald-300/70 truncate">
                            {t.displayFont} · {t.accentStyle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApplyTheme(t)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded cursor-pointer"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenThemeStudio(t)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTheme(t.id)}
                          aria-label={`Delete ${t.name}`}
                          className="p-1.5 text-emerald-300/65 hover:text-red-300 rounded hover:bg-red-950/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
