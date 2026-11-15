interface StepItem {
  number: number;
  label: string;
}

interface StepProgressProps {
  steps: StepItem[];
  currentStep: number;
  onSelectStep?: (step: number) => void;
  disabled?: boolean;
}

export function StepProgress({
  steps,
  currentStep,
  onSelectStep,
  disabled = false,
}: StepProgressProps) {
  return (
    <div className="px-6 py-3 bg-[#040A07] border-b border-emerald-900/70 flex items-center justify-between gap-4 shrink-0">
      <ol className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
        {steps.map((step, index) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const canClick = Boolean(onSelectStep) && isCompleted && !disabled;

          return (
            <li key={step.number} className="flex items-center gap-2 shrink-0">
              {index > 0 && (
                <span className="w-4 h-px bg-emerald-900 hidden sm:inline-block" aria-hidden="true" />
              )}
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep?.(step.number)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap transition-colors rounded-md px-2 py-1 ${
                  isCurrent
                    ? 'text-emerald-300 bg-emerald-500/15 font-semibold'
                    : isCompleted
                      ? 'text-emerald-100 hover:bg-emerald-900/40 cursor-pointer'
                      : 'text-emerald-300/40 cursor-default'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-mono tabular-nums ${
                    isCurrent
                      ? 'bg-emerald-500 text-[#020A05] font-bold'
                      : isCompleted
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-emerald-950 text-emerald-400/60 border border-emerald-900'
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <span className="text-xs font-mono tabular-nums text-emerald-300/70 whitespace-nowrap shrink-0">
        Step {currentStep} of {steps.length}
      </span>
    </div>
  );
}
