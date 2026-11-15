import test from 'node:test';
import assert from 'node:assert/strict';
import { isRtlLanguage, resolveLanguageMeta } from './languages';
import {
  createBlankSlide,
  deleteSlide,
  duplicateSlide,
  ensureReferencesSlide,
  normalizeGeneratedDeck,
  normalizeSlideImage,
  reorderSlides,
  sanitizeSvgMarkup,
  validateDeckInput,
} from './deckLogic';
import type { Slide } from '../types/presentation';

test('isRtlLanguage detects RTL languages by name, code, and script', () => {
  assert.equal(isRtlLanguage('Arabic'), true);
  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('العربية'), true);
  assert.equal(isRtlLanguage('Hebrew'), true);
  assert.equal(isRtlLanguage('Persian (Farsi)'), true);
  assert.equal(isRtlLanguage('Urdu'), true);
  assert.equal(isRtlLanguage('Japanese'), false);
  assert.equal(isRtlLanguage('Azerbaijani'), false);
  assert.equal(isRtlLanguage('Spanish'), false);
});

test('resolveLanguageMeta resolves known and custom languages accurately', () => {
  const ja = resolveLanguageMeta('日本語');
  assert.equal(ja.name, 'Japanese');
  assert.equal(ja.code, 'ja');
  assert.equal(ja.rtl, false);

  const ar = resolveLanguageMeta('Arabic');
  assert.equal(ar.code, 'ar');
  assert.equal(ar.rtl, true);

  const custom = resolveLanguageMeta('Catalan');
  assert.equal(custom.name, 'Catalan');
  assert.equal(custom.code, 'catalan');
  assert.equal(custom.rtl, false);
});

test('validateDeckInput rejects invalid topics, empty language, and out-of-range slide counts', () => {
  assert.equal(validateDeckInput({ topic: 'AI', language: 'French', slideCount: 6 }).valid, false);
  assert.equal(validateDeckInput({ topic: 'Solar Energy', language: '', slideCount: 6 }).valid, false);
  assert.equal(validateDeckInput({ topic: 'Solar Energy', language: 'French', slideCount: 2 }).valid, false);
  assert.equal(validateDeckInput({ topic: 'Solar Energy', language: 'French', slideCount: 16 }).valid, false);
  assert.equal(validateDeckInput({ topic: 'Solar Energy', language: 'French', slideCount: 6 }).valid, true);
});

test('reorderSlides moves slides accurately and handles out-of-bounds safely', () => {
  const slides: Slide[] = [
    { id: 's1', layout: 'title', title: 'One' },
    { id: 's2', layout: 'bullets', title: 'Two' },
    { id: 's3', layout: 'closing', title: 'Three' },
  ];
  const moved = reorderSlides(slides, 0, 2);
  assert.deepEqual(moved.map((s) => s.id), ['s2', 's3', 's1']);
  assert.deepEqual(reorderSlides(slides, -1, 1).map((s) => s.id), ['s1', 's2', 's3']);
});

test('duplicateSlide inserts cloned slide immediately after target', () => {
  const slides: Slide[] = [
    { id: 's1', layout: 'bullets', title: 'Original', bullets: ['A', 'B'] },
    { id: 's2', layout: 'closing', title: 'End' },
  ];
  const duped = duplicateSlide(slides, 0);
  assert.equal(duped.length, 3);
  assert.equal(duped[1].title, 'Original');
  assert.notEqual(duped[1].id, 's1');
  assert.deepEqual(duped[1].bullets, ['A', 'B']);
});

test('deleteSlide removes target slide while preserving at least one slide', () => {
  const slides: Slide[] = [
    { id: 's1', layout: 'title', title: 'One' },
    { id: 's2', layout: 'bullets', title: 'Two' },
  ];
  const afterDelete = deleteSlide(slides, 0);
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].id, 's2');

  const cannotDeleteLast = deleteSlide(afterDelete, 0);
  assert.equal(cannotDeleteLast.length, 1);
});

test('normalizeGeneratedDeck sanitizes malformed AI JSON and resolves RTL', () => {
  const deck = normalizeGeneratedDeck(
    {
      title: 'خطة التحول الرقمي',
      language: 'Arabic',
      slides: [
        {
          id: '1',
          layout: 'title',
          title: 'مقدمة',
          subtitle: 'نظرة عامة',
        },
        {
          id: '2',
          // @ts-expect-error testing invalid layout fallback
          layout: 'unknown-layout',
          title: 'الأهداف',
          bullets: ['هدف أول', '', 'هدف ثان'],
        },
      ],
    },
    'editorial-ivory',
    'Arabic'
  );

  assert.equal(deck.rtl, true);
  assert.equal(deck.languageCode, 'ar');
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[1].layout, 'bullets');
  assert.deepEqual(deck.slides[1].bullets, ['هدف أول', 'هدف ثان']);
});

test('createBlankSlide produces localized placeholder text for RTL and LTR including image-focus', () => {
  const rtlSlide = createBlankSlide('metric', true);
  assert.equal(rtlSlide.layout, 'metric');
  assert.equal(rtlSlide.metrics?.length, 3);

  const ltrSlide = createBlankSlide('two-column', false);
  assert.equal(ltrSlide.layout, 'two-column');
  assert.ok(ltrSlide.leftColumn && ltrSlide.rightColumn);

  const imageSlide = createBlankSlide('image-focus', false);
  assert.equal(imageSlide.layout, 'image-focus');
});

test('normalizeSlideImage validates urls and placements safely', () => {
  assert.equal(normalizeSlideImage(undefined), undefined);
  assert.equal(normalizeSlideImage({ url: '   ', alt: 'x', placement: 'right' }), undefined);
  const img = normalizeSlideImage({
    url: 'https://example.com/photo.jpg',
    alt: 'Solar field',
    source: 'camera',
    // @ts-expect-error invalid placement fallback
    placement: 'floating',
  });
  assert.deepEqual(img, {
    url: 'https://example.com/photo.jpg',
    alt: 'Solar field',
    caption: undefined,
    source: 'camera',
    placement: 'right',
  });
});

test('sanitizeSvgMarkup strips unsafe scripts and event handlers while preserving valid SVG', () => {
  const dirty = '<div><svg viewBox="0 0 100 100" onclick="alert(1)"><script>evil()</script><rect width="10" height="10"/></svg></div>';
  const clean = sanitizeSvgMarkup(dirty);
  assert.ok(clean);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('xmlns="http://www.w3.org/2000/svg"'), true);
});

test('ensureReferencesSlide appends localized references when missing and stays idempotent when present', () => {
  const baseDeck = normalizeGeneratedDeck(
    {
      title: 'Solar Storage Brief',
      language: 'English',
      slides: [
        { id: '1', layout: 'title', title: 'Solar Storage Brief' },
        { id: '2', layout: 'closing', title: 'Next Steps', bullets: ['Approve Q1'] },
      ],
    },
    'matrix',
    'English'
  );

  const withRefs = ensureReferencesSlide(baseDeck, 'Solar Storage');
  assert.equal(withRefs.slides.length, 3);
  assert.equal(withRefs.slides[2].title, 'References');
  assert.ok((withRefs.slides[2].bullets?.length ?? 0) >= 3);

  const twice = ensureReferencesSlide(withRefs, 'Solar Storage');
  assert.equal(twice.slides.length, 3);

  const arDeck = normalizeGeneratedDeck(
    {
      title: 'المدن الذكية',
      language: 'Arabic',
      slides: [{ id: '1', layout: 'title', title: 'المدن الذكية' }],
    },
    'matrix',
    'Arabic'
  );
  const arWithRefs = ensureReferencesSlide(arDeck);
  assert.equal(arWithRefs.slides[1].title, 'المراجع والمصادر');
});
