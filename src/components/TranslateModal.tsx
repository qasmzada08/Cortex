import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { WORLD_LANGUAGES, resolveLanguageMeta } from '../utils/languages';
import { type TranslateStep, validateTranslateStep } from '../utils/wizardLogic';
import { StepProgress } from './StepProgress';

interface TranslateModalProps {
  open: boolean;
  currentLanguage: string;
  slideCount: number;
  isTranslating: boolean;
  serverError: string | null;
  onClose: () => void;
  onTranslate: (targetLanguage: string) => Promise<void>;
}

const TRANSLATE_STEPS = [
  { number: 1, label: 'Choose Language' },
  { number: 2, label: 'Confirm' },
];

export function TranslateModal({
  open,
  currentLanguage,
  slideCount,
  isTranslating,
  serverError,
  onClose,
  onTranslate,
}: TranslateModalProps) {
  const [step, setStep] = useState<TranslateStep>(1);
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setValidationError(null);
    }
  }, [open]);

  if (!open) return null;

  const targetMeta = resolveLanguageMeta(targetLanguage);

  const handleNext = () => {
    const check = validateTranslateStep(1, targetLanguage);
    if (!check.valid) {
      setValidationError(check.error ?? 'Please select a language.');
      return;
    }
    setValidationError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNext();
      return;
    }
    const check = validateTranslateStep(2, targetLanguage);
    if (!check.valid) {
      setValidationError(check.error ?? 'Please enter or select a target language.');
      return;
    }
    setValidationError(null);
    await onTranslate(targetLanguage.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="translate-modal-title"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
    >
      <div className="bg-[#08110C] border border-emerald-800/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-emerald-50">
        <div className="px-6 py-4 border-b border-emerald-900/70 flex items-center justify-between gap-4">
          <div>
            <h2 id="translate-modal-title" className="font-display text-lg font-bold text-emerald-50">
              Translate Presentation
            </h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Convert all {slideCount} slides from {currentLanguage} in two quick steps.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isTranslating}
            aria-label="Close translate dialog"
            className="p-2 text-emerald-300/70 hover:text-emerald-50 rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <StepProgress
          steps={TRANSLATE_STEPS}
          currentStep={step}
          disabled={isTranslating}
          onSelectStep={(n) => {
            setValidationError(null);
            setStep(n as TranslateStep);
          }}
        />

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {(validationError || serverError) && (
            <div
              role="alert"
              className="px-4 py-3 text-sm text-red-200 bg-red-950/70 border border-red-700/70 rounded-lg"
            >
              {validationError || serverError}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="translate-target-input" className="block text-sm font-semibold text-emerald-50 mb-1.5">
                  Which language would you like?
                </label>
                <input
                  id="translate-target-input"
                  type="text"
                  list="translate-languages-datalist"
                  value={targetLanguage}
                  onChange={(e) => {
                    setTargetLanguage(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g., Arabic, Japanese, French, Korean, Hindi..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#030805] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
                />
                <datalist id="translate-languages-datalist">
                  {WORLD_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.name}>
                      {lang.nativeName}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs text-emerald-300/70 mt-2">
                  Layout direction:{' '}
                  <span className="font-semibold text-emerald-100">
                    {targetMeta.rtl ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-emerald-300/80">Popular targets</span>
                <div className="flex flex-wrap gap-2">
                  {['Arabic', 'Japanese', 'Spanish', 'French', 'German', 'Azerbaijani', 'Korean'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTargetLanguage(preset);
                          setValidationError(null);
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                          targetLanguage.trim().toLowerCase() === preset.toLowerCase()
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                            : 'bg-[#040B07] border-emerald-900/70 text-emerald-100 hover:bg-[#0D1C13]'
                        }`}
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#040B07] border border-emerald-900/70 rounded-lg">
                  <span className="block text-[11px] font-medium text-emerald-300/75">From</span>
                  <span className="block text-sm font-semibold text-emerald-50 mt-0.5">
                    {currentLanguage}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
                  <span className="block text-[11px] font-medium text-emerald-300">To</span>
                  <span className="block text-sm font-semibold text-emerald-50 mt-0.5">
                    {targetLanguage.trim()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[#040B07] border border-emerald-900/70 rounded-lg text-xs text-emerald-200/80 space-y-1">
                <p>
                  <span className="font-semibold text-emerald-50">{slideCount} slides</span>, metrics,
                  column headings, and speaker notes will be translated while keeping existing photos.
                </p>
                <p>
                  Text alignment will switch to{' '}
                  <span className="font-semibold text-emerald-50">
                    {targetMeta.rtl ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-between gap-3 border-t border-emerald-900/70">
            {step === 1 ? (
              <button
                type="button"
                onClick={onClose}
                disabled={isTranslating}
                className="px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setStep(1);
                }}
                disabled={isTranslating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 rounded-lg hover:bg-[#112317] transition-colors cursor-pointer disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {step === 1 ? (
              <button
                key="translate-next-btn"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <span>Next: Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="translate-submit-btn"
                type="button"
                onClick={() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                disabled={isTranslating}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Translating Deck...</span>
                  </>
                ) : (
                  <span>Translate All Slides</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
