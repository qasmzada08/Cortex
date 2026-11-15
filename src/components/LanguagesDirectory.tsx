import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { WORLD_LANGUAGES } from '../utils/languages';
import type { LanguageOption } from '../types/presentation';

interface LanguagesDirectoryProps {
  onCreateInLanguage: (lang: LanguageOption) => void;
}

export function LanguagesDirectory({ onCreateInLanguage }: LanguagesDirectoryProps) {
  const [query, setQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'ltr' | 'rtl'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WORLD_LANGUAGES.filter((lang) => {
      if (directionFilter === 'ltr' && lang.rtl) return false;
      if (directionFilter === 'rtl' && !lang.rtl) return false;
      if (!q) return true;
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.script.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
      );
    });
  }, [query, directionFilter]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6 w-full">
      <div className="space-y-1.5 border-b border-emerald-900/70 pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50 tracking-tight">
          Global Languages & Scripts
        </h1>
        <p className="text-sm text-emerald-200/75 max-w-2xl">
          Generate or translate slide decks across any human language. Right-to-left scripts automatically adjust slide layout, alignment, and PowerPoint export direction.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Filter languages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search language or script..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#08110C] border border-emerald-800/80 rounded-lg text-emerald-50 placeholder:text-emerald-300/35 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#08110C] border border-emerald-900/70 rounded-lg self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All Scripts' },
              { id: 'ltr', label: 'Left-to-Right' },
              { id: 'rtl', label: 'Right-to-Left' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDirectionFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                directionFilter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-100'
                  : 'text-emerald-300/70 hover:text-emerald-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#08110C] border border-emerald-900/70 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-emerald-50">
            No preset matched "{query}"
          </p>
          <p className="text-xs text-emerald-200/70">
            You can still type any language or regional dialect directly in the New AI Deck generator.
          </p>
        </div>
      ) : (
        <div className="bg-[#08110C] border border-emerald-900/70 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-900/70 bg-[#040B07] text-xs font-semibold text-emerald-300/80">
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">Native Name</th>
                <th className="py-3 px-4 hidden md:table-cell">Script</th>
                <th className="py-3 px-4 hidden sm:table-cell">Direction</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/60 text-sm">
              {filtered.map((lang) => (
                <tr key={lang.code} className="hover:bg-[#0D1C13] transition-colors">
                  <td className="py-3 px-4 font-medium text-emerald-50">{lang.name}</td>
                  <td className="py-3 px-4 text-emerald-100/90" dir={lang.rtl ? 'rtl' : 'ltr'}>
                    {lang.nativeName}
                  </td>
                  <td className="py-3 px-4 text-emerald-200/75 hidden md:table-cell">{lang.script}</td>
                  <td className="py-3 px-4 font-mono text-xs text-emerald-300/75 hidden sm:table-cell">
                    {lang.rtl ? 'RTL' : 'LTR'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onCreateInLanguage(lang)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Create Deck
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
