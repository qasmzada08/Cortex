import type { SlideImagePlacement } from '../types/presentation.ts';
import { validateDeckInput } from './deckLogic.ts';

export type GeneratorStep = 1 | 2 | 3;
export type PhotoWizardStep = 1 | 2 | 3;
export type PhotoSourceKind = 'web' | 'camera' | 'upload' | 'graphic';
export type TranslateStep = 1 | 2;

export function validateGeneratorStep(
  step: GeneratorStep,
  input: { topic: string; language: string; slideCount: number }
): { valid: boolean; error?: string } {
  if (step === 1) {
    const trimmed = input.topic.trim();
    if (trimmed.length < 3) {
      return {
        valid: false,
        error: 'Please enter a presentation topic (at least 3 characters).',
      };
    }
    return { valid: true };
  }

  if (step === 2) {
    if (!input.language.trim()) {
      return {
        valid: false,
        error: 'Please choose or type an output language.',
      };
    }
    return { valid: true };
  }

  return validateDeckInput(input);
}

export function validatePhotoStep(
  step: PhotoWizardStep,
  state: {
    source: PhotoSourceKind | null;
    imageUrl: string | null;
    placement: SlideImagePlacement;
  }
): { valid: boolean; error?: string } {
  if (step === 1) {
    if (!state.source) {
      return { valid: false, error: 'Please select a photo or visual source.' };
    }
    return { valid: true };
  }

  if (step === 2) {
    if (!state.imageUrl || !state.imageUrl.trim()) {
      return {
        valid: false,
        error: 'Please select, capture, upload, or create a visual first.',
      };
    }
    return { valid: true };
  }

  const validPlacements: SlideImagePlacement[] = ['right', 'left', 'frame', 'background'];
  if (!validPlacements.includes(state.placement)) {
    return { valid: false, error: 'Please choose a slide placement.' };
  }
  return { valid: true };
}

export function validateTranslateStep(
  step: TranslateStep,
  targetLanguage: string
): { valid: boolean; error?: string } {
  if (step === 1 || step === 2) {
    if (!targetLanguage.trim()) {
      return { valid: false, error: 'Please enter or select a target language.' };
    }
  }
  return { valid: true };
}
