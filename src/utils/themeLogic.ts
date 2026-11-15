import type {
  BuiltInThemeId,
  CustomThemeDefinition,
  DeckThemeId,
  ThemeAccentStyle,
  ThemeCornerStyle,
} from '../types/presentation.ts';
import { DECK_THEMES } from './deckLogic.ts';

export interface FontOption {
  id: string;
  label: string;
  cssFamily: string;
  pptxFace: string;
}

export const THEME_FONT_OPTIONS: FontOption[] = [
  {
    id: 'Plus Jakarta Sans',
    label: 'Plus Jakarta Sans',
    cssFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    pptxFace: 'Plus Jakarta Sans',
  },
  {
    id: 'DM Sans',
    label: 'DM Sans',
    cssFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
    pptxFace: 'DM Sans',
  },
  {
    id: 'JetBrains Mono',
    label: 'JetBrains Mono',
    cssFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    pptxFace: 'JetBrains Mono',
  },
  {
    id: 'Georgia',
    label: 'Georgia (Editorial Serif)',
    cssFamily: 'Georgia, "Times New Roman", serif',
    pptxFace: 'Georgia',
  },
  {
    id: 'Arial',
    label: 'Arial (Clean Sans)',
    cssFamily: 'Arial, Helvetica, sans-serif',
    pptxFace: 'Arial',
  },
  {
    id: 'Trebuchet MS',
    label: 'Trebuchet MS (Geometric)',
    cssFamily: '"Trebuchet MS", Helvetica, sans-serif',
    pptxFace: 'Trebuchet MS',
  },
  {
    id: 'Calibri',
    label: 'Calibri (Modern Office)',
    cssFamily: 'Calibri, "Segoe UI", sans-serif',
    pptxFace: 'Calibri',
  },
];

export interface ResolvedSlideTheme {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  hexBg: string;
  hexSurface: string;
  hexInk: string;
  hexMuted: string;
  hexAccent: string;
  displayFont: string;
  bodyFont: string;
  displayCssFont: string;
  bodyCssFont: string;
  accentStyle: ThemeAccentStyle;
  cornerStyle: ThemeCornerStyle;
  borderRgba: string;
}

const VALID_ACCENT_STYLES: ReadonlySet<ThemeAccentStyle> = new Set([
  'top-bar',
  'left-rail',
  'framed',
  'minimal',
]);

const VALID_CORNER_STYLES: ReadonlySet<ThemeCornerStyle> = new Set(['rounded', 'sharp']);

export function normalizeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const cleaned = input.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHex(hex, '000000');
  const intVal = Number.parseInt(clean, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function computeContrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function getContrastRating(ratio: number): 'AAA' | 'AA' | 'Low' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Low';
}

export function resolveFontOption(fontId: string | undefined, fallbackId: string): FontOption {
  const target = (fontId || '').trim().toLowerCase();
  const found = THEME_FONT_OPTIONS.find(
    (f) => f.id.toLowerCase() === target || f.pptxFace.toLowerCase() === target
  );
  if (found) return found;
  return THEME_FONT_OPTIONS.find((f) => f.id === fallbackId) ?? THEME_FONT_OPTIONS[0];
}

export function normalizeCustomTheme(
  raw: Partial<CustomThemeDefinition>,
  fallbackId?: string
): CustomThemeDefinition {
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : fallbackId || `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const hexBg = normalizeHex(raw.hexBg, '050B08');
  const hexSurface = normalizeHex(raw.hexSurface, '0D1D14');
  const hexInk = normalizeHex(raw.hexInk, 'ECFDF5');
  const hexMuted = normalizeHex(raw.hexMuted, 'A7F3D0');
  const hexAccent = normalizeHex(raw.hexAccent, '10B981');

  const accentStyle: ThemeAccentStyle =
    raw.accentStyle && VALID_ACCENT_STYLES.has(raw.accentStyle) ? raw.accentStyle : 'top-bar';
  const cornerStyle: ThemeCornerStyle =
    raw.cornerStyle && VALID_CORNER_STYLES.has(raw.cornerStyle) ? raw.cornerStyle : 'rounded';

  const displayOpt = resolveFontOption(raw.displayFont, 'Plus Jakarta Sans');
  const bodyOpt = resolveFontOption(raw.bodyFont, 'DM Sans');

  return {
    id,
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim().slice(0, 48)
        : 'Custom PPTX Theme',
    description:
      typeof raw.description === 'string' && raw.description.trim()
        ? raw.description.trim().slice(0, 140)
        : 'Custom designed PowerPoint & slide palette',
    hexBg,
    hexSurface,
    hexInk,
    hexMuted,
    hexAccent,
    displayFont: displayOpt.id,
    bodyFont: bodyOpt.id,
    accentStyle,
    cornerStyle,
    thinkingSummary:
      typeof raw.thinkingSummary === 'string' && raw.thinkingSummary.trim()
        ? raw.thinkingSummary.trim()
        : undefined,
  };
}

export function resolveDeckTheme(
  themeId: DeckThemeId,
  customThemes: CustomThemeDefinition[] = [],
  embeddedCustomTheme?: CustomThemeDefinition
): ResolvedSlideTheme {
  const customMatch =
    customThemes.find((t) => t.id === themeId) ||
    (embeddedCustomTheme && embeddedCustomTheme.id === themeId ? embeddedCustomTheme : undefined);

  if (customMatch) {
    const normalized = normalizeCustomTheme(customMatch, customMatch.id);
    const displayOpt = resolveFontOption(normalized.displayFont, 'Plus Jakarta Sans');
    const bodyOpt = resolveFontOption(normalized.bodyFont, 'DM Sans');
    const { r, g, b } = hexToRgb(normalized.hexInk);
    return {
      id: normalized.id,
      name: normalized.name,
      description: normalized.description,
      isCustom: true,
      hexBg: normalized.hexBg,
      hexSurface: normalized.hexSurface,
      hexInk: normalized.hexInk,
      hexMuted: normalized.hexMuted,
      hexAccent: normalized.hexAccent,
      displayFont: displayOpt.pptxFace,
      bodyFont: bodyOpt.pptxFace,
      displayCssFont: displayOpt.cssFamily,
      bodyCssFont: bodyOpt.cssFamily,
      accentStyle: normalized.accentStyle,
      cornerStyle: normalized.cornerStyle,
      borderRgba: `rgba(${r}, ${g}, ${b}, 0.18)`,
    };
  }

  const builtInKey: BuiltInThemeId =
    themeId in DECK_THEMES ? (themeId as BuiltInThemeId) : 'matrix';
  const token = DECK_THEMES[builtInKey];
  const displayOpt = resolveFontOption('Plus Jakarta Sans', 'Plus Jakarta Sans');
  const bodyOpt = resolveFontOption('DM Sans', 'DM Sans');
  const { r, g, b } = hexToRgb(token.hexInk);

  return {
    id: token.id,
    name: token.name,
    description: token.description,
    isCustom: false,
    hexBg: token.hexBg,
    hexSurface: token.hexSurface,
    hexInk: token.hexInk,
    hexMuted: token.hexMuted,
    hexAccent: token.hexAccent,
    displayFont: displayOpt.pptxFace,
    bodyFont: bodyOpt.pptxFace,
    displayCssFont: displayOpt.cssFamily,
    bodyCssFont: bodyOpt.cssFamily,
    accentStyle: 'top-bar',
    cornerStyle: 'rounded',
    borderRgba: `rgba(${r}, ${g}, ${b}, 0.18)`,
  };
}

export function extractThoughtText(
  candidates:
    | Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>;
        };
      }>
    | undefined,
  fallbackNote?: string
): string | undefined {
  const parts = candidates?.[0]?.content?.parts;
  const thoughts = Array.isArray(parts)
    ? parts
        .filter((p) => p.thought === true && typeof p.text === 'string' && p.text.trim().length > 0)
        .map((p) => p.text!.trim())
    : [];

  const combined = thoughts.join('\n\n').trim() || (fallbackNote || '').trim();
  return combined ? combined.slice(0, 3500) : undefined;
}
