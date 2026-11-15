import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSafeExportFilename,
  computeContainBox,
  computeCoverCrop,
  wrapParagraphLines,
} from './pdfLayout.ts';

test('buildSafeExportFilename preserves Unicode words and strips unsafe punctuation', () => {
  assert.equal(
    buildSafeExportFilename('Grid-Scale Battery: Q4?', 'en', 'pdf'),
    'Grid-Scale-Battery-Q4-en.pdf'
  );
  assert.equal(
    buildSafeExportFilename('   ', 'ar', 'pdf'),
    'presentation-ar.pdf'
  );
  assert.equal(
    buildSafeExportFilename('日本の再生可能エネルギー', 'ja', 'pdf'),
    '日本の再生可能エネルギー-ja.pdf'
  );
});

test('wrapParagraphLines wraps Latin and space-free CJK text within maxWidth', () => {
  const fixedWidthMeasure = (s: string) => s.length * 10;

  const latin = wrapParagraphLines('Alpha beta gamma delta epsilon', 120, fixedWidthMeasure);
  assert.deepEqual(latin, ['Alpha beta', 'gamma delta', 'epsilon']);

  const cjk = wrapParagraphLines('再生可能エネルギー戦略', 50, fixedWidthMeasure);
  assert.deepEqual(cjk, ['再生可能エ', 'ネルギー戦', '略']);
});

test('computeCoverCrop and computeContainBox preserve aspect ratio geometry', () => {
  // Wide image into square box -> crops horizontally
  const crop = computeCoverCrop(1600, 800, 500, 500);
  assert.equal(crop.sw, 800);
  assert.equal(crop.sh, 800);
  assert.equal(crop.sx, 400);
  assert.equal(crop.sy, 0);

  // Portrait image contained inside landscape box -> centered horizontally
  const contain = computeContainBox(400, 800, 100, 50, 800, 400);
  assert.equal(contain.dw, 200);
  assert.equal(contain.dh, 400);
  assert.equal(contain.dx, 400);
  assert.equal(contain.dy, 50);
});
