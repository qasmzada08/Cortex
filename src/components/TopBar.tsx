import { Cloud, LogIn, LogOut, Play } from 'lucide-react';
import type { User } from 'firebase/auth';
import { CortexLogo } from './CortexLogo';

export type WorkspaceTab = 'setup' | 'studio' | 'cloud' | 'templates' | 'languages';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onStartPresent: () => void;
  cloudUser: User | null;
  cloudAuthLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function TopBar({
  activeTab,
  onSelectTab,
  onStartPresent,
  cloudUser,
  cloudAuthLoading,
  onSignIn,
  onSignOut,
}: TopBarProps) {
  const navItems: { id: WorkspaceTab; label: string }[] = [
    { id: 'setup', label: 'Setup' },
    { id: 'studio', label: 'Studio' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'templates', label: 'Templates' },
    { id: 'languages', label: 'Languages' },
  ];

  return (
    <header className="no-print h-14 bg-[#060E09] border-b border-emerald-900/70 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 shrink-0">
      <a
        href="#setup"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('setup');
        }}
        className="inline-flex items-center gap-2.5 font-display text-sm sm:text-lg font-bold tracking-tight text-emerald-300 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 rounded-sm"
      >
        <CortexLogo className="w-7 h-7 shrink-0" />
        <span>Cortex</span>
      </a>

      <nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-5 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`text-xs sm:text-sm font-medium py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                isActive
                  ? 'border-emerald-400 text-emerald-50'
                  : 'border-transparent text-emerald-200/70 hover:text-emerald-50 hover:border-emerald-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {cloudUser ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0A160E] border border-emerald-800/70 rounded-lg text-xs text-emerald-200">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span className="max-w-[7rem] truncate font-medium">
              {cloudUser.displayName || 'Cloud Sync'}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out of Google Cloud"
              aria-label="Sign out of Google Cloud"
              className="p-1 text-emerald-300/70 hover:text-emerald-50 rounded cursor-pointer"
            >
              <LogOut className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={cloudAuthLoading}
            onClick={onSignIn}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-100 bg-[#0A160E] border border-emerald-800/80 hover:bg-[#112317] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Cloud Sign In</span>
          </button>
        )}

        <button
          type="button"
          onClick={onStartPresent}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#020A05] bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" aria-hidden="true" />
          <span>Present</span>
        </button>
      </div>
    </header>
  );
}
