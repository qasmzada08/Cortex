import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeContrastRatio,
  extractThoughtText,
  getContrastRating,
  normalizeCustomTheme,
  normalizeHex,
  resolveDeckTheme,
} from './themeLogic';
import type { CustomThemeDefinition } from '../types/presentation';

test('normalizeHex normalizes 3-digit, 6-digit, and invalid hex values cleanly', () => {
  assert.equal(normalizeHex('#0fa', '000000'), '00FFAA');
  assert.equal(normalizeHex('10b981', '000000'), '10B981');
  assert.equal(normalizeHex('bad-hex', '34D399'), '34D399');
});

test('computeContrastRatio and getContrastRating measure WCAG readability accurately', () => {
  const blackOnWhite = computeContrastRatio('000000', 'FFFFFF');
  assert.equal(blackOnWhite, 21);
  assert.equal(getContrastRating(blackOnWhite), 'AAA');

  const matrixContrast = computeContrastRatio('040A06', 'ECFDF5');
  assert.ok(matrixContrast > 15);
  assert.equal(getContrastRating(matrixContrast), 'AAA');

  const lowContrast = computeContrastRatio('333333', '444444');
  assert.equal(getContrastRating(lowContrast), 'Low');
});

test('normalizeCustomTheme and resolveDeckTheme resolve built-in and custom PPTX themes', () => {
  const custom: CustomThemeDefinition = normalizeCustomTheme({
    id: 'custom-cyber',
    name: 'Cyber Amber',
    description: 'Obsidian glass with amber accent',
    hexBg: '#0a0908',
    hexSurface: '#181512',
    hexInk: '#fff8eb',
    hexMuted: '#d6c7b2',
    hexAccent: '#f59e0b',
    displayFont: 'Georgia',
    bodyFont: 'Trebuchet MS',
    accentStyle: 'left-rail',
    cornerStyle: 'sharp',
  });

  const resolvedCustom = resolveDeckTheme('custom-cyber', [custom]);
  assert.equal(resolvedCustom.isCustom, true);
  assert.equal(resolvedCustom.hexBg, '0A0908');
  assert.equal(resolvedCustom.hexAccent, 'F59E0B');
  assert.equal(resolvedCustom.displayFont, 'Georgia');
  assert.equal(resolvedCustom.accentStyle, 'left-rail');
  assert.equal(resolvedCustom.cornerStyle, 'sharp');

  const resolvedBuiltIn = resolveDeckTheme('matrix', [custom]);
  assert.equal(resolvedBuiltIn.isCustom, false);
  assert.equal(resolvedBuiltIn.hexBg, '040A06');
});

test('extractThoughtText collects thought parts and falls back gracefully', () => {
  const extracted = extractThoughtText([
    {
      content: {
        parts: [
          { thought: true, text: 'Step 1: Audience analysis.' },
          { thought: false, text: '{"title":"Ignored JSON"}' },
          { thought: true, text: 'Step 2: Narrative pacing.' },
        ],
      },
    },
  ]);
  assert.equal(extracted, 'Step 1: Audience analysis.\n\nStep 2: Narrative pacing.');

  assert.equal(extractThoughtText(undefined, 'Structured architectural plan'), 'Structured architectural plan');
});
