import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGeneratorStep,
  validatePhotoStep,
  validateTranslateStep,
} from './wizardLogic.ts';

test('validateGeneratorStep checks topic on step 1 and language on step 2', () => {
  assert.equal(
    validateGeneratorStep(1, { topic: 'AI', language: 'English', slideCount: 6 }).valid,
    false
  );
  assert.equal(
    validateGeneratorStep(1, { topic: 'Solar Microgrids', language: '', slideCount: 6 }).valid,
    true
  );
  assert.equal(
    validateGeneratorStep(2, { topic: 'Solar Microgrids', language: '  ', slideCount: 6 }).valid,
    false
  );
  assert.equal(
    validateGeneratorStep(2, { topic: 'Solar Microgrids', language: 'Japanese', slideCount: 6 }).valid,
    true
  );
  assert.equal(
    validateGeneratorStep(3, { topic: 'Solar Microgrids', language: 'Japanese', slideCount: 2 }).valid,
    false
  );
  assert.equal(
    validateGeneratorStep(3, { topic: 'Solar Microgrids', language: 'Japanese', slideCount: 6 }).valid,
    true
  );
});

test('validatePhotoStep enforces source selection, image selection, and valid placement', () => {
  assert.equal(
    validatePhotoStep(1, { source: null, imageUrl: null, placement: 'right' }).valid,
    false
  );
  assert.equal(
    validatePhotoStep(1, { source: 'web', imageUrl: null, placement: 'right' }).valid,
    true
  );
  assert.equal(
    validatePhotoStep(2, { source: 'camera', imageUrl: '', placement: 'right' }).valid,
    false
  );
  assert.equal(
    validatePhotoStep(2, {
      source: 'camera',
      imageUrl: 'data:image/jpeg;base64,abc',
      placement: 'right',
    }).valid,
    true
  );
  assert.equal(
    validatePhotoStep(3, {
      source: 'upload',
      imageUrl: 'data:image/png;base64,xyz',
      placement: 'background',
    }).valid,
    true
  );
});

test('validateTranslateStep rejects empty target language', () => {
  assert.equal(validateTranslateStep(1, '   ').valid, false);
  assert.equal(validateTranslateStep(1, 'Arabic').valid, true);
  assert.equal(validateTranslateStep(2, 'Spanish').valid, true);
});
